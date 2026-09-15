import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import {
  FILE_SIZE_LIMIT_BYTES,
  MAX_UPLOAD_FILES,
} from "../../config/http-body";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateProjectDto } from "./dto/create-project.dto";
import {
  DashboardDayCountDto,
  DashboardHandoffDto,
  DashboardOldestJobDto,
  DashboardPhaseMixDto,
  DashboardPipelineStepDto,
  DashboardStatsDto,
  DashboardSubTeamLoadDto,
  DashboardWaitingItemDto,
} from "./dto/dashboard-stats.dto";
import { SendBackDto } from "./dto/send-back.dto";
import { ProjectsService } from "./projects.service";

@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
@ApiTags("Projects")
@ApiExtraModels(
  DashboardStatsDto,
  DashboardWaitingItemDto,
  DashboardSubTeamLoadDto,
  DashboardPipelineStepDto,
  DashboardHandoffDto,
  DashboardOldestJobDto,
  DashboardPhaseMixDto,
  DashboardDayCountDto,
)
export class ProjectsController {
  public constructor(
    @Inject(ProjectsService) private readonly projectsService: ProjectsService,
  ) {}

  @Get("stats")
  @ApiTags("Stats")
  @ApiOperation({
    summary: "Get floor stats",
    description:
      "Returns live counts, phase mix, weekly handoffs, sub-team load, pipeline steps, and recent files for the signed-in person's teams.",
  })
  @ApiOkResponse({
    description: "Dashboard stats.",
    type: DashboardStatsDto,
  })
  public getStats(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.projectsService.getDashboard(currentUser);
  }

  @Get("projects")
  @ApiQuery({ name: "teamId", required: false })
  @ApiOperation({
    summary: "List work",
    description:
      "Admins and team leads see active projects on their teams. Members see projects currently in their sub-team.",
  })
  @ApiOkResponse({ description: "Projects in progress." })
  public getProjects(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("teamId") teamId?: string,
  ) {
    if (teamId !== undefined && teamId.length > 0) {
      return this.projectsService.listTeamProjects(currentUser, teamId);
    }
    return this.projectsService.listWork(currentUser);
  }

  @Post("projects")
  @ApiBody({ type: CreateProjectDto })
  @ApiOperation({
    summary: "Create a project",
    description:
      "Team leads create a project. Plugin issues a project ID and opens the first phase for its sub-team.",
  })
  @ApiCreatedResponse({ description: "Project created." })
  public postProjects(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateProjectDto,
  ) {
    return this.projectsService.createProject(currentUser, body);
  }

  @Get("projects/:id")
  @ApiParam({ name: "id", description: "Project id" })
  @ApiOperation({
    summary: "Get a project",
    description: "Returns the project, every phase ID, and uploaded files.",
  })
  @ApiOkResponse({ description: "Project detail." })
  public getProjectsById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.projectsService.getProject(currentUser, id);
  }

  @Post("project-phases/:id/documents")
  @ApiParam({ name: "id", description: "Project phase id" })
  @UseInterceptors(
    FilesInterceptor("files", MAX_UPLOAD_FILES, {
      limits: { fileSize: FILE_SIZE_LIMIT_BYTES },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
      },
    },
  })
  @ApiOperation({
    summary: "Upload files to a phase",
    description:
      "Adds one or more files to the active sub-team phase. Files are stored in R2 (or local disk in development).",
  })
  @ApiOkResponse({ description: "Files saved." })
  public postProjectPhaseDocuments(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.projectsService.uploadDocuments(currentUser, id, files ?? []);
  }

  @Post("project-phases/:id/complete")
  @ApiParam({ name: "id", description: "Project phase id" })
  @ApiOperation({
    summary: "Hand off a phase",
    description:
      "Marks the sub-team's work complete. If every parallel phase on this step is done, the next step starts.",
  })
  @ApiOkResponse({ description: "Phase handed off." })
  public postProjectPhaseComplete(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.projectsService.completePhase(currentUser, id);
  }

  @Post("projects/:id/send-back")
  @ApiParam({ name: "id", description: "Project id" })
  @ApiBody({ type: SendBackDto })
  @ApiOperation({
    summary: "Send work backwards",
    description:
      "Reopens an earlier step with a new phase ID and keeps previous files as history.",
  })
  @ApiOkResponse({ description: "Work sent back." })
  public postProjectsSendBack(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: SendBackDto,
  ) {
    return this.projectsService.sendBack(currentUser, id, body);
  }

  @Get("history")
  @ApiTags("History")
  @ApiOperation({
    summary: "List sub-team history",
    description:
      "Returns phases a sub-team has worked on, with their IDs and files.",
  })
  @ApiOkResponse({ description: "History." })
  public getHistory(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.projectsService.listHistory(currentUser);
  }

  @Get("documents/:id/file")
  @ApiParam({ name: "id", description: "Document id" })
  @Header("Cache-Control", "private, max-age=60")
  @ApiOperation({
    summary: "Download a file",
    description: "Streams a previously uploaded handoff document.",
  })
  public async getDocumentsFile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<StreamableFile> {
    const file = await this.projectsService.getDocumentFile(currentUser, id);
    return new StreamableFile(file.body, {
      type: file.mimeType,
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }
}
