import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  assertAdmin,
  assertTeamLead,
  belongsToTeam,
  isAdmin,
} from "../../common/access";
import { slugify, uniqueSlug } from "../../common/ids";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import type { EnvironmentVariables } from "../../config/environment";
import { MailService } from "../mail/mail.service";
import type { CreateInviteDto } from "./dto/create-invite.dto";
import type { CreateSubTeamDto } from "./dto/create-sub-team.dto";
import type { CreateTeamDto } from "./dto/create-team.dto";
import type { ReplacePhasesDto } from "./dto/replace-phases.dto";
import type { UpdateTeamDto } from "./dto/update-team.dto";
import { TeamsRepository } from "./teams.repository";

@Injectable()
export class TeamsService {
  public constructor(
    @Inject(TeamsRepository)
    private readonly teamsRepository: TeamsRepository,
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    @Inject(MailService)
    private readonly mailService: MailService,
  ) {}

  public async listTeams(currentUser: AuthenticatedUser) {
    const teams = await this.teamsRepository.listTeams();
    if (isAdmin(currentUser)) {
      return teams;
    }
    const allowed = new Set(currentUser.teamRoles.map((item) => item.teamId));
    return teams.filter((team) => allowed.has(team.id));
  }

  public async getTeam(currentUser: AuthenticatedUser, teamId: string) {
    const team = await this.teamsRepository.findTeamById(teamId);
    if (team === null) {
      throw new NotFoundException("Team was not found.");
    }
    if (!belongsToTeam(currentUser, teamId)) {
      throw new ForbiddenException("You are not on this team.");
    }
    return team;
  }

  public async createTeam(currentUser: AuthenticatedUser, body: CreateTeamDto) {
    assertAdmin(currentUser);
    const slug = slugify(body.slug ?? body.name);
    return this.teamsRepository.createTeam(body, slug);
  }

  public async updateTeam(
    currentUser: AuthenticatedUser,
    teamId: string,
    body: UpdateTeamDto,
  ) {
    assertTeamLead(currentUser, teamId);
    return this.teamsRepository.updateTeam(teamId, body);
  }

  public async createSubTeam(
    currentUser: AuthenticatedUser,
    teamId: string,
    body: CreateSubTeamDto,
  ) {
    assertTeamLead(currentUser, teamId);
    const slug = slugify(body.slug ?? body.name);
    return this.teamsRepository.createSubTeam(teamId, body, slug);
  }

  public async replacePhases(
    currentUser: AuthenticatedUser,
    teamId: string,
    body: ReplacePhasesDto,
  ) {
    assertTeamLead(currentUser, teamId);
    const used = new Set<string>();
    const phases = body.phases.map((phase) => ({
      ...phase,
      slug: uniqueSlug(phase.name, used),
    }));
    return this.teamsRepository.replacePhases(teamId, phases);
  }

  public async createInvite(
    currentUser: AuthenticatedUser,
    body: CreateInviteDto,
  ) {
    assertTeamLead(currentUser, body.teamId);

    if (body.teamRole === "lead" && !isAdmin(currentUser)) {
      throw new ForbiddenException(
        "Only an admin can invite another team lead.",
      );
    }

    const teamRole = isAdmin(currentUser)
      ? (body.teamRole ?? "member")
      : "member";
    const result = await this.teamsRepository.createInvite({
      body,
      invitedById: currentUser.id,
      teamRole,
    });

    const appUrl = this.configService
      .get("APP_PUBLIC_URL", { infer: true })
      .replace(/\/$/, "");
    const inviteUrl = `${appUrl}/invite/${result.inviteUrlToken}`;
    const email = body.email.trim().toLowerCase();
    const mail = await this.mailService.sendInvite(email, {
      inviteUrl,
      teamName: result.teamName,
      inviterName: currentUser.fullName,
      roleLabel: teamRole === "lead" ? "team lead" : "member",
      ...(result.subTeamName !== null
        ? { subTeamName: result.subTeamName }
        : {}),
      expiresAt: result.expiresAt,
    });

    return {
      email,
      teamId: body.teamId,
      subTeamId: body.subTeamId ?? null,
      expiresAt: result.expiresAt,
      inviteUrl,
      emailSent: mail.sent,
    };
  }

  public async listInvites(currentUser: AuthenticatedUser, teamId: string) {
    assertTeamLead(currentUser, teamId);
    return this.teamsRepository.listInvites(teamId);
  }
}
