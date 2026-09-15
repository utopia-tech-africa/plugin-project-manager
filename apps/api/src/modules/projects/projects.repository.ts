import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { formatPhasePublicId, formatProjectPublicId } from "../../common/ids";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateProjectDto } from "./dto/create-project.dto";

const projectInclude = {
  team: { select: { id: true, name: true, slug: true } },
  createdBy: { select: { id: true, fullName: true } },
  phases: {
    orderBy: [
      { step: "asc" as const },
      { attempt: "asc" as const },
      { name: "asc" as const },
    ],
    include: {
      subTeam: { select: { id: true, name: true, slug: true } },
      documents: {
        orderBy: { createdAt: "desc" as const },
        include: { uploadedBy: { select: { id: true, fullName: true } } },
      },
    },
  },
};

@Injectable()
export class ProjectsRepository {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async createProject(params: {
    body: CreateProjectDto;
    createdById: string;
  }) {
    const phases = await this.prisma.phase.findMany({
      where: { teamId: params.body.teamId },
      orderBy: [{ step: "asc" }, { name: "asc" }],
    });
    if (phases.length === 0) {
      throw new BadRequestException(
        "Add at least one phase before creating a project.",
      );
    }

    const firstStep = phases[0]?.step;
    if (firstStep === undefined) {
      throw new BadRequestException(
        "Add at least one phase before creating a project.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const counter = await tx.projectCounter.upsert({
        where: { teamId: params.body.teamId },
        update: { value: { increment: 1 } },
        create: { teamId: params.body.teamId, value: 1 },
      });
      const publicId = formatProjectPublicId(counter.value);
      const project = await tx.project.create({
        data: {
          teamId: params.body.teamId,
          createdById: params.createdById,
          publicId,
          name: params.body.name.trim(),
          description: params.body.description?.trim() ?? "",
          currentStep: firstStep,
          sequence: counter.value,
        },
      });

      const slugAttempts = new Map<string, number>();
      for (const phase of phases) {
        const attempt = (slugAttempts.get(phase.slug) ?? 0) + 1;
        slugAttempts.set(phase.slug, attempt);
        const isActive = phase.step === firstStep;
        await tx.projectPhase.create({
          data: {
            projectId: project.id,
            phaseId: phase.id,
            subTeamId: phase.subTeamId,
            publicId: formatPhasePublicId(publicId, phase.slug, attempt),
            name: phase.name,
            slug: phase.slug,
            step: phase.step,
            attempt,
            status: isActive ? "active" : "pending",
            startedAt: isActive ? new Date() : null,
          },
        });
      }

      return tx.project.findUniqueOrThrow({
        where: { id: project.id },
        include: projectInclude,
      });
    });
  }

  public async findProjectById(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: projectInclude,
    });
  }

  public async findDocumentById(id: string) {
    return this.prisma.document.findUnique({
      where: { id },
      include: {
        projectPhase: {
          include: { project: true },
        },
      },
    });
  }

  public async findProjectPhaseById(id: string) {
    return this.prisma.projectPhase.findUnique({
      where: { id },
      include: {
        project: true,
        subTeam: true,
        documents: true,
      },
    });
  }

  public async listWork(params: {
    teamIds: string[];
    subTeamIds: string[];
    isAdmin: boolean;
  }) {
    return this.prisma.project.findMany({
      where: params.isAdmin
        ? { status: "active" }
        : {
            status: "active",
            teamId: { in: params.teamIds },
            phases: {
              some: {
                status: "active",
                subTeamId: {
                  in:
                    params.subTeamIds.length > 0
                      ? params.subTeamIds
                      : ["__none__"],
                },
              },
            },
          },
      orderBy: { updatedAt: "desc" },
      include: projectInclude,
    });
  }

  public async listTeamProjects(teamId: string) {
    return this.prisma.project.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      include: projectInclude,
    });
  }

  public async listHistory(params: { subTeamIds: string[]; isAdmin: boolean }) {
    return this.prisma.projectPhase.findMany({
      where: params.isAdmin
        ? {}
        : {
            subTeamId: {
              in:
                params.subTeamIds.length > 0 ? params.subTeamIds : ["__none__"],
            },
            status: { in: ["completed", "returned", "active"] },
          },
      orderBy: { updatedAt: "desc" },
      include: {
        project: {
          select: { id: true, publicId: true, name: true, status: true },
        },
        subTeam: { select: { id: true, name: true } },
        documents: {
          orderBy: { createdAt: "desc" },
          include: { uploadedBy: { select: { id: true, fullName: true } } },
        },
      },
    });
  }

  public async addDocuments(params: {
    projectPhaseId: string;
    uploadedById: string;
    files: Array<{
      fileKey: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    }>;
  }) {
    await this.prisma.document.createMany({
      data: params.files.map((file) => ({
        projectPhaseId: params.projectPhaseId,
        uploadedById: params.uploadedById,
        ...file,
      })),
    });
    return this.findProjectPhaseById(params.projectPhaseId);
  }

  public async completePhase(projectPhaseId: string) {
    const phase = await this.findProjectPhaseById(projectPhaseId);
    if (phase === null) {
      throw new NotFoundException("Phase was not found.");
    }
    if (phase.status !== "active") {
      throw new BadRequestException("Only an active phase can be handed off.");
    }
    if (phase.documents.length === 0) {
      throw new BadRequestException(
        "Upload at least one file before handing this off.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.projectPhase.update({
        where: { id: phase.id },
        data: { status: "completed", completedAt: new Date() },
      });

      const siblings = await tx.projectPhase.findMany({
        where: { projectId: phase.projectId, step: phase.step },
      });
      const latestAttempt = Math.max(...siblings.map((item) => item.attempt));
      const currentGeneration = siblings.filter(
        (item) => item.attempt === latestAttempt,
      );
      const allDone = currentGeneration.every(
        (item) => item.id === phase.id || item.status === "completed",
      );

      if (allDone) {
        const allPhases = await tx.projectPhase.findMany({
          where: { projectId: phase.projectId },
        });
        const steps = [...new Set(allPhases.map((item) => item.step))].sort(
          (left, right) => left - right,
        );
        const nextStep = steps.find((step) => step > phase.step);
        const project = await tx.project.findUniqueOrThrow({
          where: { id: phase.projectId },
        });

        if (nextStep === undefined) {
          await tx.project.update({
            where: { id: phase.projectId },
            data: { status: "completed" },
          });
        } else {
          const atNext = allPhases.filter((item) => item.step === nextStep);
          const pending = atNext.filter((item) => item.status === "pending");
          if (pending.length > 0) {
            await tx.projectPhase.updateMany({
              where: { id: { in: pending.map((item) => item.id) } },
              data: { status: "active", startedAt: new Date() },
            });
          } else {
            const latestBySlug = new Map<string, (typeof atNext)[number]>();
            for (const item of atNext) {
              const existing = latestBySlug.get(item.slug);
              if (existing === undefined || item.attempt > existing.attempt) {
                latestBySlug.set(item.slug, item);
              }
            }
            for (const item of latestBySlug.values()) {
              await tx.projectPhase.create({
                data: {
                  projectId: item.projectId,
                  phaseId: item.phaseId,
                  subTeamId: item.subTeamId,
                  publicId: formatPhasePublicId(
                    project.publicId,
                    item.slug,
                    item.attempt + 1,
                  ),
                  name: item.name,
                  slug: item.slug,
                  step: item.step,
                  attempt: item.attempt + 1,
                  status: "active",
                  startedAt: new Date(),
                },
              });
            }
          }
          await tx.project.update({
            where: { id: phase.projectId },
            data: { currentStep: nextStep, status: "active" },
          });
        }
      }

      return tx.project.findUniqueOrThrow({
        where: { id: phase.projectId },
        include: projectInclude,
      });
    });
  }

  public async sendBack(params: { targetPhaseId: string; reason: string }) {
    const target = await this.findProjectPhaseById(params.targetPhaseId);
    if (target === null) {
      throw new NotFoundException("Phase was not found.");
    }

    return this.prisma.$transaction(async (tx) => {
      const active = await tx.projectPhase.findMany({
        where: { projectId: target.projectId, status: "active" },
      });
      for (const item of active) {
        await tx.projectPhase.update({
          where: { id: item.id },
          data: {
            status: "returned",
            returnedAt: new Date(),
            returnReason: params.reason,
          },
        });
      }

      const phasesAtStep = await tx.projectPhase.findMany({
        where: {
          projectId: target.projectId,
          step: target.step,
        },
      });
      const latestBySlug = new Map<string, (typeof phasesAtStep)[number]>();
      for (const item of phasesAtStep) {
        const existing = latestBySlug.get(item.slug);
        if (existing === undefined || item.attempt > existing.attempt) {
          latestBySlug.set(item.slug, item);
        }
      }

      const project = await tx.project.findUniqueOrThrow({
        where: { id: target.projectId },
      });

      for (const item of latestBySlug.values()) {
        await tx.projectPhase.create({
          data: {
            projectId: item.projectId,
            phaseId: item.phaseId,
            subTeamId: item.subTeamId,
            publicId: formatPhasePublicId(
              project.publicId,
              item.slug,
              item.attempt + 1,
            ),
            name: item.name,
            slug: item.slug,
            step: item.step,
            attempt: item.attempt + 1,
            status: "active",
            startedAt: new Date(),
          },
        });
      }

      await tx.project.update({
        where: { id: target.projectId },
        data: { status: "active", currentStep: target.step },
      });

      return tx.project.findUniqueOrThrow({
        where: { id: target.projectId },
        include: projectInclude,
      });
    });
  }

  public async getDashboard(params: {
    isAdmin: boolean;
    isLead: boolean;
    teamIds: string[];
    subTeamIds: string[];
  }) {
    const empty = {
      activeProjects: 0,
      completedProjects: 0,
      completedThisWeek: 0,
      waitingOnYou: 0,
      returnedPhases: 0,
      filesUploaded: 0,
      oldestJob: null,
      waiting: [],
      bySubTeam: [],
      pipeline: [],
      recentHandoffs: [],
      phaseMix: [],
      handoffsByDay: [],
    };

    if (!params.isAdmin && params.teamIds.length === 0) {
      return empty;
    }

    const projects = await this.prisma.project.findMany({
      where: params.isAdmin ? {} : { teamId: { in: params.teamIds } },
      include: {
        team: { select: { id: true, name: true } },
        phases: {
          include: {
            subTeam: { select: { id: true, name: true } },
            documents: { select: { id: true } },
          },
        },
      },
    });

    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const activeProjects = projects.filter(
      (project) => project.status === "active",
    );
    const completedProjects = projects.filter(
      (project) => project.status === "completed",
    );
    const completedThisWeek = completedProjects.filter((project) => {
      const latest = project.phases.reduce<Date | null>((latestAt, phase) => {
        if (phase.completedAt === null) {
          return latestAt;
        }
        if (latestAt === null || phase.completedAt > latestAt) {
          return phase.completedAt;
        }
        return latestAt;
      }, null);
      return latest !== null && latest >= weekAgo;
    }).length;

    const waitingRows = activeProjects.flatMap((project) =>
      project.phases
        .filter((phase) => phase.status === "active")
        .filter((phase) =>
          params.isAdmin || params.isLead
            ? true
            : params.subTeamIds.includes(phase.subTeamId),
        )
        .map((phase) => {
          const start = phase.startedAt ?? project.createdAt;
          return {
            projectId: project.id,
            projectPublicId: project.publicId,
            projectName: project.name,
            phasePublicId: phase.publicId,
            phaseName: phase.name,
            subTeamName: phase.subTeam.name,
            teamName: project.team.name,
            daysWaiting: daysOnFloor(start),
          };
        }),
    );
    waitingRows.sort((left, right) => right.daysWaiting - left.daysWaiting);

    const oldest = waitingRows[0];
    const load = new Map<
      string,
      { name: string; teamName: string; activeCount: number }
    >();
    for (const project of activeProjects) {
      for (const phase of project.phases) {
        if (phase.status !== "active") {
          continue;
        }
        if (
          !params.isAdmin &&
          !params.isLead &&
          !params.subTeamIds.includes(phase.subTeamId)
        ) {
          continue;
        }
        const existing = load.get(phase.subTeamId);
        if (existing === undefined) {
          load.set(phase.subTeamId, {
            name: phase.subTeam.name,
            teamName: project.team.name,
            activeCount: 1,
          });
        } else {
          existing.activeCount += 1;
        }
      }
    }

    const pipelineMap = new Map<
      number,
      { names: Set<string>; projectIds: Set<string> }
    >();
    for (const project of activeProjects) {
      const atStep = project.phases.filter(
        (phase) =>
          phase.step === project.currentStep &&
          (phase.status === "active" || phase.status === "pending"),
      );
      const entry = pipelineMap.get(project.currentStep) ?? {
        names: new Set<string>(),
        projectIds: new Set<string>(),
      };
      for (const phase of atStep) {
        entry.names.add(phase.name);
      }
      entry.projectIds.add(project.id);
      pipelineMap.set(project.currentStep, entry);
    }

    const recentHandoffs = projects
      .flatMap((project) =>
        project.phases
          .filter(
            (phase) =>
              phase.status === "completed" && phase.completedAt !== null,
          )
          .map((phase) => ({ project, phase })),
      )
      .sort(
        (left, right) =>
          (right.phase.completedAt?.getTime() ?? 0) -
          (left.phase.completedAt?.getTime() ?? 0),
      )
      .slice(0, 8)
      .map(({ project, phase }) => ({
        projectId: project.id,
        projectPublicId: project.publicId,
        projectName: project.name,
        phasePublicId: phase.publicId,
        phaseName: phase.name,
        subTeamName: phase.subTeam.name,
        completedAt: phase.completedAt?.toISOString() ?? "",
      }));

    return {
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      completedThisWeek,
      waitingOnYou: waitingRows.length,
      returnedPhases: projects.reduce(
        (count, project) =>
          count +
          project.phases.filter((phase) => phase.status === "returned").length,
        0,
      ),
      filesUploaded: projects.reduce(
        (count, project) =>
          count +
          project.phases.reduce(
            (files, phase) => files + phase.documents.length,
            0,
          ),
        0,
      ),
      oldestJob:
        oldest === undefined
          ? null
          : {
              projectId: oldest.projectId,
              publicId: oldest.projectPublicId,
              name: oldest.projectName,
              phaseName: oldest.phaseName,
              subTeamName: oldest.subTeamName,
              daysWaiting: oldest.daysWaiting,
            },
      waiting: waitingRows.slice(0, 12),
      bySubTeam: [...load.entries()]
        .map(([subTeamId, item]) => ({ subTeamId, ...item }))
        .sort((left, right) => right.activeCount - left.activeCount),
      pipeline: [...pipelineMap.entries()]
        .sort(([left], [right]) => left - right)
        .map(([step, item]) => ({
          step,
          label:
            item.names.size > 0
              ? [...item.names].join(" · ")
              : `Step ${String(step)}`,
          projectCount: item.projectIds.size,
        })),
      recentHandoffs,
      phaseMix: mixLatestPhases(projects),
      handoffsByDay: countHandoffsByDay(projects),
    };
  }
}

const daysOnFloor = (start: Date): number =>
  Math.max(0, Math.floor((Date.now() - start.getTime()) / 86_400_000));

type DashboardProject = {
  phases: Array<{
    step: number;
    slug: string;
    attempt: number;
    status: "pending" | "active" | "completed" | "returned";
    completedAt: Date | null;
  }>;
};

const mixLatestPhases = (projects: DashboardProject[]) => {
  const mixCounts = {
    active: 0,
    pending: 0,
    completed: 0,
    returned: 0,
  };
  for (const project of projects) {
    const latest = new Map<string, DashboardProject["phases"][number]>();
    for (const phase of project.phases) {
      const key = `${String(phase.step)}-${phase.slug}`;
      const existing = latest.get(key);
      if (existing === undefined || phase.attempt > existing.attempt) {
        latest.set(key, phase);
      }
    }
    for (const phase of latest.values()) {
      mixCounts[phase.status] += 1;
    }
  }
  return (["active", "pending", "returned", "completed"] as const).map(
    (status) => ({ status, count: mixCounts[status] }),
  );
};

const countHandoffsByDay = (projects: DashboardProject[]) => {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const count = projects.reduce(
      (total, project) =>
        total +
        project.phases.filter(
          (phase) =>
            phase.completedAt !== null &&
            phase.completedAt >= day &&
            phase.completedAt < nextDay,
        ).length,
      0,
    );
    return {
      day: `${String(day.getFullYear())}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
      label: day.toLocaleDateString("en-GB", { weekday: "short" }),
      count,
    };
  });
};
