import { createHash, randomBytes } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import type {
  Invite,
  OrgRole,
  Session,
  TeamRole,
  User,
} from "../../generated/prisma/client";

import { PrismaService } from "../prisma/prisma.service";

export type UserWithMemberships = User & {
  teamMemberships: Array<{
    teamId: string;
    role: TeamRole;
    team: {
      subTeams: Array<{
        id: string;
        memberships: Array<{ userId: string }>;
      }>;
    };
  }>;
};

@Injectable()
export class AuthRepository {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async findUserByEmail(
    email: string,
  ): Promise<UserWithMemberships | null> {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        teamMemberships: {
          include: {
            team: {
              include: {
                subTeams: {
                  include: {
                    memberships: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  public async findUserById(id: string): Promise<UserWithMemberships | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        teamMemberships: {
          include: {
            team: {
              include: {
                subTeams: {
                  include: {
                    memberships: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  public async createSession(params: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<Session> {
    return this.prisma.session.create({ data: params });
  }

  public async findSessionById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  public async revokeSession(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  public async findInviteByTokenHash(tokenHash: string): Promise<
    | (Invite & {
        team: { id: string; name: string };
        subTeam: { id: string; name: string } | null;
        invitedBy: { id: string; email: string; fullName: string };
      })
    | null
  > {
    return this.prisma.invite.findUnique({
      where: { tokenHash },
      include: {
        team: { select: { id: true, name: true } },
        subTeam: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  public async acceptInvite(params: {
    inviteId: string;
    email: string;
    fullName: string;
    passwordHash: string;
    orgRole: OrgRole;
    teamId: string;
    teamRole: TeamRole;
    subTeamId: string | null;
  }): Promise<UserWithMemberships> {
    const user = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email: params.email },
      });
      const saved =
        existing ??
        (await tx.user.create({
          data: {
            email: params.email,
            fullName: params.fullName,
            passwordHash: params.passwordHash,
            orgRole: params.orgRole,
          },
        }));

      await tx.teamMembership.upsert({
        where: {
          userId_teamId: {
            userId: saved.id,
            teamId: params.teamId,
          },
        },
        update: { role: params.teamRole },
        create: {
          userId: saved.id,
          teamId: params.teamId,
          role: params.teamRole,
        },
      });

      if (params.subTeamId !== null) {
        await tx.subTeamMembership.upsert({
          where: {
            userId_subTeamId: {
              userId: saved.id,
              subTeamId: params.subTeamId,
            },
          },
          update: {},
          create: {
            userId: saved.id,
            subTeamId: params.subTeamId,
          },
        });
      }

      await tx.invite.update({
        where: { id: params.inviteId },
        data: { acceptedAt: new Date() },
      });

      return saved;
    });

    const hydrated = await this.findUserById(user.id);
    if (hydrated === null) {
      throw new Error("User was not found after invite acceptance.");
    }
    return hydrated;
  }
}

export const hashInviteToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const createInviteToken = (): string => randomBytes(32).toString("hex");
