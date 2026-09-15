import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  assertTeamLead,
  belongsToSubTeam,
  belongsToTeam,
  isAdmin,
  isTeamLead,
} from "../../common/access";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { NotificationsService } from "../notifications/notifications.service";
import { StorageService } from "../storage/storage.service";
import type { CreateProjectDto } from "./dto/create-project.dto";
import type { SendBackDto } from "./dto/send-back.dto";
import { ProjectsRepository } from "./projects.repository";

type ProjectNoticeShape = {
  id: string;
  publicId: string;
  name: string;
  teamId: string;
  status: "active" | "completed";
  phases: Array<{
    status: "pending" | "active" | "completed" | "returned";
    step: number;
    subTeamId: string;
    subTeam: { name: string };
  }>;
};

@Injectable()
export class ProjectsService {
  public constructor(
    @Inject(ProjectsRepository)
    private readonly projectsRepository: ProjectsRepository,
    @Inject(StorageService)
    private readonly storageService: StorageService,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  public async createProject(
    currentUser: AuthenticatedUser,
    body: CreateProjectDto,
  ) {
    assertTeamLead(currentUser, body.teamId);
    const project = await this.projectsRepository.createProject({
      body,
      createdById: currentUser.id,
    });
    await this.notifyActivePhases({
      actorId: currentUser.id,
      project,
      kind: "waiting",
    });
    return project;
  }

  public async getProject(currentUser: AuthenticatedUser, projectId: string) {
    const project = await this.projectsRepository.findProjectById(projectId);
    if (project === null) {
      throw new NotFoundException("Project was not found.");
    }
    if (!belongsToTeam(currentUser, project.teamId)) {
      throw new ForbiddenException("You are not on this team.");
    }
    return project;
  }

  public async listWork(currentUser: AuthenticatedUser) {
    if (isAdmin(currentUser)) {
      return this.projectsRepository.listWork({
        teamIds: [],
        subTeamIds: [],
        isAdmin: true,
      });
    }

    const leadTeamIds = currentUser.teamRoles
      .filter((item) => item.role === "lead")
      .map((item) => item.teamId);
    if (leadTeamIds.length > 0) {
      const leadProjects = await Promise.all(
        leadTeamIds.map((teamId) =>
          this.projectsRepository.listTeamProjects(teamId),
        ),
      );
      return leadProjects
        .flat()
        .filter((project) => project.status === "active");
    }

    const teamIds = currentUser.teamRoles.map((item) => item.teamId);
    const subTeamIds = currentUser.teamRoles.flatMap((item) => item.subTeamIds);
    return this.projectsRepository.listWork({
      teamIds,
      subTeamIds,
      isAdmin: false,
    });
  }

  public async listTeamProjects(
    currentUser: AuthenticatedUser,
    teamId: string,
  ) {
    if (!belongsToTeam(currentUser, teamId)) {
      throw new ForbiddenException("You are not on this team.");
    }
    return this.projectsRepository.listTeamProjects(teamId);
  }

  public async getDashboard(currentUser: AuthenticatedUser) {
    const leadTeamIds = currentUser.teamRoles
      .filter((item) => item.role === "lead")
      .map((item) => item.teamId);
    return this.projectsRepository.getDashboard({
      isAdmin: isAdmin(currentUser),
      isLead: leadTeamIds.length > 0,
      teamIds: isAdmin(currentUser)
        ? []
        : currentUser.teamRoles.map((item) => item.teamId),
      subTeamIds: currentUser.teamRoles.flatMap((item) => item.subTeamIds),
    });
  }

  public async listHistory(currentUser: AuthenticatedUser) {
    const subTeamIds = currentUser.teamRoles.flatMap((item) => item.subTeamIds);
    return this.projectsRepository.listHistory({
      subTeamIds,
      isAdmin:
        isAdmin(currentUser) ||
        currentUser.teamRoles.some((item) => item.role === "lead"),
    });
  }

  public async uploadDocuments(
    currentUser: AuthenticatedUser,
    projectPhaseId: string,
    files: Express.Multer.File[],
  ) {
    const phase =
      await this.projectsRepository.findProjectPhaseById(projectPhaseId);
    if (phase === null) {
      throw new NotFoundException("Phase was not found.");
    }
    if (phase.status !== "active") {
      throw new BadRequestException(
        "Files can only be added to an active phase.",
      );
    }
    this.assertCanWorkPhase(currentUser, phase.project.teamId, phase.subTeamId);
    if (files.length === 0) {
      throw new BadRequestException("Choose at least one file.");
    }

    const stored = [];
    for (const file of files) {
      const key = `projects/${phase.projectId}/${phase.id}/${randomUUID()}-${file.originalname}`;
      await this.storageService.putObject({
        key,
        body: file.buffer,
        contentType: file.mimetype,
      });
      stored.push({
        fileKey: key,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });
    }

    await this.projectsRepository.addDocuments({
      projectPhaseId,
      uploadedById: currentUser.id,
      files: stored,
    });
    return this.projectsRepository.findProjectById(phase.projectId);
  }

  public async completePhase(
    currentUser: AuthenticatedUser,
    projectPhaseId: string,
  ) {
    const phase =
      await this.projectsRepository.findProjectPhaseById(projectPhaseId);
    if (phase === null) {
      throw new NotFoundException("Phase was not found.");
    }
    this.assertCanWorkPhase(currentUser, phase.project.teamId, phase.subTeamId);
    const project = await this.projectsRepository.completePhase(projectPhaseId);
    if (project.status === "completed") {
      await this.notificationsService.notifyProjectClosed({
        actorId: currentUser.id,
        project: {
          id: project.id,
          publicId: project.publicId,
          name: project.name,
          teamId: project.teamId,
        },
      });
    } else {
      const movedOn = project.phases.some(
        (item) => item.status === "active" && item.step !== phase.step,
      );
      if (movedOn) {
        await this.notifyActivePhases({
          actorId: currentUser.id,
          project,
          kind: "waiting",
        });
      }
    }
    return project;
  }

  public async sendBack(
    currentUser: AuthenticatedUser,
    projectId: string,
    body: SendBackDto,
  ) {
    const project = await this.projectsRepository.findProjectById(projectId);
    if (project === null) {
      throw new NotFoundException("Project was not found.");
    }
    if (!isTeamLead(currentUser, project.teamId)) {
      const active = project.phases.find((item) => item.status === "active");
      if (
        active === undefined ||
        !belongsToSubTeam(currentUser, project.teamId, active.subTeamId)
      ) {
        throw new ForbiddenException(
          "Only the working sub-team or a team lead can send this back.",
        );
      }
    }

    const target =
      await this.projectsRepository.findProjectPhaseById(body.targetPhaseId);
    if (target === null || target.projectId !== projectId) {
      throw new NotFoundException("Phase was not found.");
    }
    const previousStep = project.currentStep - 1;
    if (previousStep < 1 || target.step !== previousStep) {
      throw new BadRequestException(
        "You can only send work back to the previous phase.",
      );
    }

    const updated = await this.projectsRepository.sendBack({
      targetPhaseId: body.targetPhaseId,
      reason: body.reason?.trim() ?? "",
    });
    await this.notifyActivePhases({
      actorId: currentUser.id,
      project: updated,
      kind: "sent_back",
    });
    return updated;
  }

  public async getDocumentFile(
    currentUser: AuthenticatedUser,
    documentId: string,
  ) {
    const document = await this.projectsRepository.findDocumentById(documentId);
    if (document === null) {
      throw new NotFoundException("File was not found.");
    }
    if (!belongsToTeam(currentUser, document.projectPhase.project.teamId)) {
      throw new ForbiddenException("You are not on this team.");
    }
    const stored = await this.storageService.getObject(document.fileKey);
    return {
      ...stored,
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }

  private assertCanWorkPhase(
    currentUser: AuthenticatedUser,
    teamId: string,
    subTeamId: string,
  ): void {
    if (
      isTeamLead(currentUser, teamId) ||
      belongsToSubTeam(currentUser, teamId, subTeamId)
    ) {
      return;
    }
    throw new ForbiddenException(
      "You are not on the sub-team handling this phase.",
    );
  }

  private async notifyActivePhases(params: {
    actorId: string;
    project: ProjectNoticeShape;
    kind: "waiting" | "sent_back";
  }) {
    const phases = params.project.phases
      .filter((item) => item.status === "active")
      .map((item) => ({
        subTeamId: item.subTeamId,
        subTeamName: item.subTeam.name,
      }));
    if (phases.length === 0) {
      return;
    }
    await this.notificationsService.notifyWorkWaiting({
      actorId: params.actorId,
      kind: params.kind,
      project: {
        id: params.project.id,
        publicId: params.project.publicId,
        name: params.project.name,
        teamId: params.project.teamId,
      },
      phases,
    });
  }
}
