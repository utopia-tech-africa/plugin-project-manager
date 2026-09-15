import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateInviteDto } from "./dto/create-invite.dto";
import { CreateSubTeamDto } from "./dto/create-sub-team.dto";
import { CreateTeamDto } from "./dto/create-team.dto";
import { ReplacePhasesDto } from "./dto/replace-phases.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { TeamsService } from "./teams.service";

@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
@ApiTags("Teams")
export class TeamsController {
  public constructor(
    @Inject(TeamsService) private readonly teamsService: TeamsService,
  ) {}

  @Get("teams")
  @ApiOperation({
    summary: "List teams",
    description:
      "Admins see every team. Everyone else sees only the teams they belong to.",
  })
  @ApiOkResponse({ description: "Teams." })
  public getTeams(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.teamsService.listTeams(currentUser);
  }

  @Post("teams")
  @ApiBody({ type: CreateTeamDto })
  @ApiOperation({
    summary: "Create a team",
    description: "Admins create parent teams for the organisation.",
  })
  @ApiCreatedResponse({ description: "Team created." })
  public postTeams(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateTeamDto,
  ) {
    return this.teamsService.createTeam(currentUser, body);
  }

  @Get("teams/:id")
  @ApiParam({ name: "id", description: "Team id" })
  @ApiOperation({
    summary: "Get a team",
    description: "Returns a team with its sub-teams, phases, and members.",
  })
  @ApiOkResponse({ description: "Team detail." })
  public getTeamsById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.teamsService.getTeam(currentUser, id);
  }

  @Patch("teams/:id")
  @ApiParam({ name: "id", description: "Team id" })
  @ApiBody({ type: UpdateTeamDto })
  @ApiOperation({
    summary: "Update a team",
    description: "Admins and the team's lead can rename the team.",
  })
  @ApiOkResponse({ description: "Team updated." })
  public patchTeams(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateTeamDto,
  ) {
    return this.teamsService.updateTeam(currentUser, id, body);
  }

  @Post("teams/:id/sub-teams")
  @ApiParam({ name: "id", description: "Team id" })
  @ApiBody({ type: CreateSubTeamDto })
  @ApiOperation({
    summary: "Create a sub-team",
    description:
      "Admins and team leads can add a sub-team under a parent team.",
  })
  @ApiCreatedResponse({ description: "Sub-team created." })
  public postTeamsSubTeams(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: CreateSubTeamDto,
  ) {
    return this.teamsService.createSubTeam(currentUser, id, body);
  }

  @Put("teams/:id/phases")
  @ApiParam({ name: "id", description: "Team id" })
  @ApiBody({ type: ReplacePhasesDto })
  @ApiOperation({
    summary: "Replace a team's phases",
    description:
      "Sets the ordered pipeline for new projects. Phases that share a step run in parallel. Existing projects keep the pipeline they started with.",
  })
  @ApiOkResponse({ description: "Phases saved." })
  public putTeamsPhases(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: ReplacePhasesDto,
  ) {
    return this.teamsService.replacePhases(currentUser, id, body);
  }

  @Get("teams/:id/invites")
  @ApiParam({ name: "id", description: "Team id" })
  @ApiOperation({
    summary: "List invites for a team",
    description:
      "Admins and team leads can see outstanding and accepted invites.",
  })
  @ApiOkResponse({ description: "Invites." })
  public getTeamsInvites(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.teamsService.listInvites(currentUser, id);
  }

  @Post("invites")
  @ApiTags("Invites")
  @ApiBody({ type: CreateInviteDto })
  @ApiOperation({
    summary: "Invite a user to a team",
    description:
      "Admins can invite anyone to any team and sub-team, including as a lead. Team leads can invite members to their own team and assign a sub-team. Plugin emails the invite when Resend is configured, and always returns a copyable invite URL.",
  })
  @ApiCreatedResponse({ description: "Invite created." })
  public postInvites(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateInviteDto,
  ) {
    return this.teamsService.createInvite(currentUser, body);
  }
}
