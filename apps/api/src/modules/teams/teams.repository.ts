import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Phase, SubTeam, Team } from "../../generated/prisma/client";
import { createInviteToken, hashInviteToken } from "../auth/auth.repository";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateInviteDto } from "./dto/create-invite.dto";
import type { CreateSubTeamDto } from "./dto/create-sub-team.dto";
import type { CreateTeamDto } from "./dto/create-team.dto";
import type { PhaseItemDto } from "./dto/replace-phases.dto";
import type { UpdateTeamDto } from "./dto/update-team.dto";

export type TeamDetail = Team & {
  subTeams: Array<
    SubTeam & {
      memberships: Array<{
        id: string;
        user: { id: string; email: string; fullName: string };
      }>;
    }
  >;
  phases: Phase[];
  memberships: Array<{
    id: string;
    role: "lead" | "member";
    user: { id: string; email: string; fullName: string };
  }>;
};

@Injectable()
export class TeamsRepository {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async listTeams(): Promise<Team[]> {
    return this.prisma.team.findMany({ orderBy: { name: "asc" } });
  }

  public async findTeamById(id: string): Promise<TeamDetail | null> {
    return this.prisma.team.findUnique({
      where: { id },
      include: {
        subTeams: {
          orderBy: { name: "asc" },
          include: {
            memberships: {
              orderBy: { user: { fullName: "asc" } },
              include: {
                user: { select: { id: true, email: true, fullName: true } },
              },
            },
          },
        },
        phases: { orderBy: [{ step: "asc" }, { name: "asc" }] },
        memberships: {
          include: {
            user: { select: { id: true, email: true, fullName: true } },
          },
        },
      },
    });
  }

  public async createTeam(body: CreateTeamDto, slug: string): Promise<Team> {
    return this.prisma.team.create({
      data: {
        name: body.name.trim(),
        slug,
      },
    });
  }

  public async updateTeam(id: string, body: UpdateTeamDto): Promise<Team> {
    return this.prisma.team.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      },
    });
  }

  public async createSubTeam(
    teamId: string,
    body: CreateSubTeamDto,
    slug: string,
  ): Promise<SubTeam> {
    return this.prisma.subTeam.create({
      data: {
        teamId,
        name: body.name.trim(),
        slug,
      },
    });
  }

  public async findSubTeamById(id: string): Promise<SubTeam | null> {
    return this.prisma.subTeam.findUnique({ where: { id } });
  }

  public async replacePhases(
    teamId: string,
    phases: PhaseItemDto[],
  ): Promise<Phase[]> {
    const subTeams = await this.prisma.subTeam.findMany({ where: { teamId } });
    const subTeamIds = new Set(subTeams.map((item) => item.id));
    for (const phase of phases) {
      if (!subTeamIds.has(phase.subTeamId)) {
        throw new BadRequestException(
          "Every phase must belong to a sub-team on this team.",
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.phase.deleteMany({ where: { teamId } });
      await tx.phase.createMany({
        data: phases.map((phase) => ({
          teamId,
          subTeamId: phase.subTeamId,
          name: phase.name.trim(),
          slug: (phase.slug ?? phase.name).trim().toLowerCase(),
          step: phase.step,
        })),
      });
      return tx.phase.findMany({
        where: { teamId },
        orderBy: [{ step: "asc" }, { name: "asc" }],
      });
    });
  }

  public async createInvite(params: {
    body: CreateInviteDto;
    invitedById: string;
    teamRole: "lead" | "member";
  }): Promise<{
    inviteUrlToken: string;
    expiresAt: Date;
    teamName: string;
    subTeamName: string | null;
  }> {
    const team = await this.prisma.team.findUnique({
      where: { id: params.body.teamId },
    });
    if (team === null) {
      throw new NotFoundException("Team was not found.");
    }

    let subTeamName: string | null = null;
    if (params.body.subTeamId !== undefined) {
      const subTeam = await this.prisma.subTeam.findFirst({
        where: { id: params.body.subTeamId, teamId: params.body.teamId },
      });
      if (subTeam === null) {
        throw new BadRequestException("That sub-team is not on this team.");
      }
      subTeamName = subTeam.name;
    }

    const token = createInviteToken();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await this.prisma.invite.create({
      data: {
        email: params.body.email.trim().toLowerCase(),
        teamId: params.body.teamId,
        subTeamId: params.body.subTeamId,
        teamRole: params.teamRole,
        tokenHash: hashInviteToken(token),
        invitedById: params.invitedById,
        expiresAt,
      },
    });

    return {
      inviteUrlToken: token,
      expiresAt,
      teamName: team.name,
      subTeamName,
    };
  }

  public async listInvites(teamId: string) {
    return this.prisma.invite.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      include: {
        subTeam: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, fullName: true } },
      },
    });
  }
}
