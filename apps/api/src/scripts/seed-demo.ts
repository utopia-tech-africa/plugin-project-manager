import "dotenv/config";
import "reflect-metadata";

import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";
import { Pool } from "pg";

import { formatPhasePublicId, formatProjectPublicId } from "../common/ids";
import type { PhaseStatus, ProjectStatus } from "../generated/prisma/client";
import { PrismaClient } from "../generated/prisma/client";

const DEMO_PASSWORD = "plugin-demo";

const daysAgo = (days: number): Date =>
  new Date(Date.now() - days * 86_400_000);

type Person = {
  email: string;
  fullName: string;
  orgRole?: "admin" | "member";
};

type PhaseSpec = {
  name: string;
  slug: string;
  step: number;
  subTeamSlug: string;
};

type ProjectPhaseSpec = {
  slug: string;
  status: PhaseStatus;
  startedAt?: Date;
  completedAt?: Date;
  returnedAt?: Date;
  returnReason?: string;
};

type ProjectSpec = {
  name: string;
  description: string;
  status: ProjectStatus;
  currentStep: number;
  createdAt: Date;
  phases: ProjectPhaseSpec[];
};

type TeamSpec = {
  name: string;
  slug: string;
  subTeams: Array<{ name: string; slug: string }>;
  phases: PhaseSpec[];
  leadEmail: string;
  members: Array<{ email: string; subTeamSlugs: string[] }>;
  projects: ProjectSpec[];
};

const people: Person[] = [
  { email: "nia.okonkwo@plugin.local", fullName: "Nia Okonkwo" },
  { email: "amara.bello@plugin.local", fullName: "Amara Bello" },
  { email: "julian.reyes@plugin.local", fullName: "Julian Reyes" },
  { email: "kelechi.okafor@plugin.local", fullName: "Kelechi Okafor" },
  { email: "sofia.martins@plugin.local", fullName: "Sofia Martins" },
  { email: "malik.chen@plugin.local", fullName: "Malik Chen" },
  { email: "priya.shah@plugin.local", fullName: "Priya Shah" },
  { email: "jonah.adeyemi@plugin.local", fullName: "Jonah Adeyemi" },
  { email: "rita.solano@plugin.local", fullName: "Rita Solano" },
  { email: "elena.voss@plugin.local", fullName: "Elena Voss" },
  { email: "theo.nkrumah@plugin.local", fullName: "Theo Nkrumah" },
  { email: "lila.haddad@plugin.local", fullName: "Lila Haddad" },
  { email: "omar.diallo@plugin.local", fullName: "Omar Diallo" },
];

const teams: TeamSpec[] = [
  {
    name: "Production",
    slug: "production",
    subTeams: [
      { name: "Design", slug: "design" },
      { name: "Print", slug: "print" },
    ],
    phases: [
      { name: "Design", slug: "design", step: 1, subTeamSlug: "design" },
      { name: "Print", slug: "print", step: 2, subTeamSlug: "print" },
    ],
    leadEmail: "nia.okonkwo@plugin.local",
    members: [
      { email: "amara.bello@plugin.local", subTeamSlugs: ["design"] },
      { email: "julian.reyes@plugin.local", subTeamSlugs: ["design"] },
      { email: "kelechi.okafor@plugin.local", subTeamSlugs: ["print"] },
      { email: "sofia.martins@plugin.local", subTeamSlugs: ["print"] },
    ],
    projects: [
      {
        name: "Aurelia Conrad",
        description: "Portrait series for the autumn lookbook.",
        status: "active",
        currentStep: 1,
        createdAt: daysAgo(5),
        phases: [
          {
            slug: "design",
            status: "active",
            startedAt: daysAgo(5),
          },
          { slug: "print", status: "pending" },
        ],
      },
      {
        name: "Q4 activation",
        description: "In-store kit for the November campaign.",
        status: "active",
        currentStep: 2,
        createdAt: daysAgo(8),
        phases: [
          {
            slug: "design",
            status: "completed",
            startedAt: daysAgo(8),
            completedAt: daysAgo(3),
          },
          {
            slug: "print",
            status: "active",
            startedAt: daysAgo(3),
          },
        ],
      },
      {
        name: "Retail window wrap",
        description: "Window vinyl for the Lagos flagship.",
        status: "active",
        currentStep: 1,
        createdAt: daysAgo(1),
        phases: [
          {
            slug: "design",
            status: "active",
            startedAt: daysAgo(1),
          },
          { slug: "print", status: "pending" },
        ],
      },
      {
        name: "Holiday lookbook",
        description: "Print sent the design back for crop marks.",
        status: "active",
        currentStep: 1,
        createdAt: daysAgo(6),
        phases: [
          {
            slug: "design",
            status: "returned",
            startedAt: daysAgo(6),
            completedAt: daysAgo(2),
            returnedAt: daysAgo(1),
            returnReason: "Need 3mm crop marks on every spread.",
          },
          { slug: "print", status: "pending" },
        ],
      },
      {
        name: "Night market kit",
        description: "Posters and flyers for the Friday market.",
        status: "completed",
        currentStep: 2,
        createdAt: daysAgo(12),
        phases: [
          {
            slug: "design",
            status: "completed",
            startedAt: daysAgo(12),
            completedAt: daysAgo(6),
          },
          {
            slug: "print",
            status: "completed",
            startedAt: daysAgo(6),
            completedAt: daysAgo(1),
          },
        ],
      },
    ],
  },
  {
    name: "Team Apex",
    slug: "team-apex",
    subTeams: [
      { name: "Copy", slug: "copy" },
      { name: "Design Team", slug: "design-team" },
      { name: "Media", slug: "media" },
    ],
    phases: [
      { name: "Copy", slug: "copy", step: 1, subTeamSlug: "copy" },
      {
        name: "Design",
        slug: "design",
        step: 2,
        subTeamSlug: "design-team",
      },
      { name: "Media", slug: "media", step: 3, subTeamSlug: "media" },
    ],
    leadEmail: "malik.chen@plugin.local",
    members: [
      { email: "jonah.adeyemi@plugin.local", subTeamSlugs: ["copy"] },
      { email: "priya.shah@plugin.local", subTeamSlugs: ["design-team"] },
      { email: "rita.solano@plugin.local", subTeamSlugs: ["media"] },
    ],
    projects: [
      {
        name: "Pilot deck",
        description: "First client narrative for Apex.",
        status: "active",
        currentStep: 1,
        createdAt: daysAgo(2),
        phases: [
          {
            slug: "copy",
            status: "active",
            startedAt: daysAgo(2),
          },
          { slug: "design", status: "pending" },
          { slug: "media", status: "pending" },
        ],
      },
    ],
  },
  {
    name: "Campaigns",
    slug: "campaigns",
    subTeams: [
      { name: "Copy", slug: "copy" },
      { name: "Studio", slug: "studio" },
      { name: "Finish", slug: "finish" },
    ],
    phases: [
      { name: "Copy", slug: "copy", step: 1, subTeamSlug: "copy" },
      { name: "Studio", slug: "studio", step: 2, subTeamSlug: "studio" },
      { name: "Finish", slug: "finish", step: 3, subTeamSlug: "finish" },
    ],
    leadEmail: "elena.voss@plugin.local",
    members: [
      { email: "theo.nkrumah@plugin.local", subTeamSlugs: ["copy"] },
      { email: "lila.haddad@plugin.local", subTeamSlugs: ["studio"] },
      { email: "omar.diallo@plugin.local", subTeamSlugs: ["finish"] },
    ],
    projects: [
      {
        name: "Spring drop",
        description: "Line sheet and captions for the March drop.",
        status: "active",
        currentStep: 1,
        createdAt: daysAgo(4),
        phases: [
          {
            slug: "copy",
            status: "active",
            startedAt: daysAgo(4),
          },
          { slug: "studio", status: "pending" },
          { slug: "finish", status: "pending" },
        ],
      },
      {
        name: "Member launch",
        description: "Email and landing stills for the membership push.",
        status: "active",
        currentStep: 2,
        createdAt: daysAgo(9),
        phases: [
          {
            slug: "copy",
            status: "completed",
            startedAt: daysAgo(9),
            completedAt: daysAgo(4),
          },
          {
            slug: "studio",
            status: "active",
            startedAt: daysAgo(4),
          },
          { slug: "finish", status: "pending" },
        ],
      },
      {
        name: "Trade standee",
        description: "Booth graphics for the trade show.",
        status: "completed",
        currentStep: 3,
        createdAt: daysAgo(14),
        phases: [
          {
            slug: "copy",
            status: "completed",
            startedAt: daysAgo(14),
            completedAt: daysAgo(10),
          },
          {
            slug: "studio",
            status: "completed",
            startedAt: daysAgo(10),
            completedAt: daysAgo(5),
          },
          {
            slug: "finish",
            status: "completed",
            startedAt: daysAgo(5),
            completedAt: daysAgo(2),
          },
        ],
      },
    ],
  },
];

const upsertUser = async (
  prisma: PrismaClient,
  person: Person,
  passwordHash: string,
) => {
  return prisma.user.upsert({
    where: { email: person.email },
    update: {
      fullName: person.fullName,
      passwordHash,
      orgRole: person.orgRole ?? "member",
      isActive: true,
    },
    create: {
      email: person.email,
      fullName: person.fullName,
      passwordHash,
      orgRole: person.orgRole ?? "member",
      isActive: true,
    },
  });
};

const nextPublicSequence = async (prisma: PrismaClient): Promise<number> => {
  const projects = await prisma.project.findMany({
    select: { publicId: true },
  });
  const max = projects.reduce((current, project) => {
    const value = Number.parseInt(project.publicId.replace(/^PRJ-/, ""), 10);
    return Number.isFinite(value) && value > current ? value : current;
  }, 0);
  return max + 1;
};

const seedNotices = async (prisma: PrismaClient): Promise<void> => {
  await prisma.notification.deleteMany();

  const activePhases = await prisma.projectPhase.findMany({
    where: { status: "active" },
    include: {
      project: true,
      subTeam: {
        include: { memberships: { select: { userId: true } } },
      },
    },
  });

  for (const phase of activePhases) {
    const uniqueUserIds = [
      ...new Set(phase.subTeam.memberships.map((item) => item.userId)),
    ];
    if (uniqueUserIds.length === 0) {
      continue;
    }
    await prisma.notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        projectId: phase.projectId,
        kind: "waiting" as const,
        title: `${phase.project.publicId} is waiting`,
        body: `${phase.project.name} is on ${phase.subTeam.name}.`,
        createdAt: phase.startedAt ?? phase.project.createdAt,
      })),
    });
  }

  const returnedPhases = await prisma.projectPhase.findMany({
    where: { status: "returned", returnedAt: { not: null } },
    include: {
      project: true,
      subTeam: {
        include: { memberships: { select: { userId: true } } },
      },
    },
  });

  for (const phase of returnedPhases) {
    const uniqueUserIds = [
      ...new Set(phase.subTeam.memberships.map((item) => item.userId)),
    ];
    if (uniqueUserIds.length === 0) {
      continue;
    }
    await prisma.notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        projectId: phase.projectId,
        kind: "sent_back" as const,
        title: `${phase.project.publicId} was sent back`,
        body: `${phase.project.name} needs ${phase.subTeam.name} again.`,
        createdAt: phase.returnedAt ?? phase.updatedAt,
        readAt: daysAgo(1),
      })),
    });
  }

  const closedProjects = await prisma.project.findMany({
    where: { status: "completed" },
    include: {
      team: {
        include: {
          memberships: {
            where: { role: "lead" },
            select: { userId: true },
          },
        },
      },
    },
  });

  for (const project of closedProjects) {
    const uniqueUserIds = [
      ...new Set(project.team.memberships.map((item) => item.userId)),
    ];
    if (uniqueUserIds.length === 0) {
      continue;
    }
    await prisma.notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        projectId: project.id,
        kind: "closed" as const,
        title: `${project.publicId} closed`,
        body: `${project.name} is off the floor.`,
        createdAt: project.updatedAt,
        readAt: daysAgo(1),
      })),
    });
  }
};

const syncProject = async (
  prisma: PrismaClient,
  params: {
    teamId: string;
    createdById: string;
    spec: ProjectSpec;
    templates: Array<{
      id: string;
      slug: string;
      name: string;
      step: number;
      subTeamId: string;
    }>;
  },
) => {
  let project = await prisma.project.findFirst({
    where: { teamId: params.teamId, name: params.spec.name },
  });

  if (project === null) {
    const [publicSequence, teamMax] = await Promise.all([
      nextPublicSequence(prisma),
      prisma.project.aggregate({
        where: { teamId: params.teamId },
        _max: { sequence: true },
      }),
    ]);
    const sequence = (teamMax._max.sequence ?? 0) + 1;
    await prisma.projectCounter.upsert({
      where: { teamId: params.teamId },
      update: { value: Math.max(publicSequence, sequence) },
      create: {
        teamId: params.teamId,
        value: Math.max(publicSequence, sequence),
      },
    });
    project = await prisma.project.create({
      data: {
        teamId: params.teamId,
        createdById: params.createdById,
        publicId: formatProjectPublicId(publicSequence),
        name: params.spec.name,
        description: params.spec.description,
        status: params.spec.status,
        currentStep: params.spec.currentStep,
        sequence,
        createdAt: params.spec.createdAt,
      },
    });
  } else {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        description: params.spec.description,
        status: params.spec.status,
        currentStep: params.spec.currentStep,
        createdAt: params.spec.createdAt,
      },
    });
  }

  for (const template of params.templates) {
    const state = params.spec.phases.find(
      (item) => item.slug === template.slug,
    );
    const status = state?.status ?? "pending";
    await prisma.projectPhase.upsert({
      where: {
        projectId_slug_attempt: {
          projectId: project.id,
          slug: template.slug,
          attempt: 1,
        },
      },
      update: {
        status,
        startedAt: state?.startedAt ?? null,
        completedAt: state?.completedAt ?? null,
        returnedAt: state?.returnedAt ?? null,
        returnReason: state?.returnReason ?? "",
      },
      create: {
        projectId: project.id,
        phaseId: template.id,
        subTeamId: template.subTeamId,
        publicId: formatPhasePublicId(project.publicId, template.slug, 1),
        name: template.name,
        slug: template.slug,
        step: template.step,
        attempt: 1,
        status,
        startedAt: state?.startedAt ?? null,
        completedAt: state?.completedAt ?? null,
        returnedAt: state?.returnedAt ?? null,
        returnReason: state?.returnReason ?? "",
      },
    });

    if (status === "returned") {
      await prisma.projectPhase.upsert({
        where: {
          projectId_slug_attempt: {
            projectId: project.id,
            slug: template.slug,
            attempt: 2,
          },
        },
        update: {
          status: "active",
          startedAt: state?.returnedAt ?? new Date(),
          completedAt: null,
          returnedAt: null,
          returnReason: "",
        },
        create: {
          projectId: project.id,
          phaseId: template.id,
          subTeamId: template.subTeamId,
          publicId: formatPhasePublicId(project.publicId, template.slug, 2),
          name: template.name,
          slug: template.slug,
          step: template.step,
          attempt: 2,
          status: "active",
          startedAt: state?.returnedAt ?? new Date(),
        },
      });
    }
  }

  return project;
};

const run = async (): Promise<void> => {
  const connectionString =
    process.env["DATABASE_URL"] ??
    "postgresql://postgres:postgres@127.0.0.1:5433/plugin_project_manager";
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const adminEmail = (process.env["ADMIN_EMAIL"] ?? "admin@plugin.local")
    .trim()
    .toLowerCase();
  const adminPassword =
    process.env["ADMIN_PASSWORD"] ?? "plugin-admin-change-me";
  const adminName = process.env["ADMIN_NAME"] ?? "Plugin Admin";
  const [adminHash, demoHash] = await Promise.all([
    argon2.hash(adminPassword),
    argon2.hash(DEMO_PASSWORD),
  ]);

  await upsertUser(
    prisma,
    { email: adminEmail, fullName: adminName, orgRole: "admin" },
    adminHash,
  );

  const users = new Map<
    string,
    { id: string; email: string; fullName: string }
  >();
  for (const person of people) {
    const user = await upsertUser(prisma, person, demoHash);
    users.set(user.email, user);
  }

  for (const spec of teams) {
    const team = await prisma.team.upsert({
      where: { slug: spec.slug },
      update: { name: spec.name },
      create: { name: spec.name, slug: spec.slug },
    });

    const subTeams = new Map<string, { id: string; slug: string }>();
    for (const subTeam of spec.subTeams) {
      const row = await prisma.subTeam.upsert({
        where: {
          teamId_slug: { teamId: team.id, slug: subTeam.slug },
        },
        update: { name: subTeam.name },
        create: {
          teamId: team.id,
          name: subTeam.name,
          slug: subTeam.slug,
        },
      });
      subTeams.set(row.slug, row);
    }

    for (const phase of spec.phases) {
      const subTeam = subTeams.get(phase.subTeamSlug);
      if (subTeam === undefined) {
        throw new Error(
          `Missing sub-team ${phase.subTeamSlug} on ${spec.name}`,
        );
      }
      await prisma.phase.upsert({
        where: { teamId_slug: { teamId: team.id, slug: phase.slug } },
        update: {
          name: phase.name,
          step: phase.step,
          subTeamId: subTeam.id,
        },
        create: {
          teamId: team.id,
          subTeamId: subTeam.id,
          name: phase.name,
          slug: phase.slug,
          step: phase.step,
        },
      });
    }

    const lead = users.get(spec.leadEmail);
    if (lead === undefined) {
      throw new Error(`Missing lead ${spec.leadEmail}`);
    }
    await prisma.teamMembership.upsert({
      where: { userId_teamId: { userId: lead.id, teamId: team.id } },
      update: { role: "lead" },
      create: { userId: lead.id, teamId: team.id, role: "lead" },
    });

    for (const member of spec.members) {
      const user = users.get(member.email);
      if (user === undefined) {
        throw new Error(`Missing member ${member.email}`);
      }
      await prisma.teamMembership.upsert({
        where: { userId_teamId: { userId: user.id, teamId: team.id } },
        update: { role: "member" },
        create: { userId: user.id, teamId: team.id, role: "member" },
      });
      for (const subTeamSlug of member.subTeamSlugs) {
        const subTeam = subTeams.get(subTeamSlug);
        if (subTeam === undefined) {
          throw new Error(`Missing sub-team ${subTeamSlug}`);
        }
        await prisma.subTeamMembership.upsert({
          where: {
            userId_subTeamId: { userId: user.id, subTeamId: subTeam.id },
          },
          update: {},
          create: { userId: user.id, subTeamId: subTeam.id },
        });
      }
    }

    const templates = await prisma.phase.findMany({
      where: { teamId: team.id },
      orderBy: [{ step: "asc" }, { name: "asc" }],
    });
    for (const project of spec.projects) {
      await syncProject(prisma, {
        teamId: team.id,
        createdById: lead.id,
        spec: project,
        templates,
      });
    }
  }

  const nextValue = (await nextPublicSequence(prisma)) - 1;
  const seededTeams = await prisma.team.findMany({ select: { id: true } });
  for (const team of seededTeams) {
    await prisma.projectCounter.upsert({
      where: { teamId: team.id },
      update: { value: nextValue },
      create: { teamId: team.id, value: nextValue },
    });
  }

  await seedNotices(prisma);

  await prisma.$disconnect();
  await pool.end();

  const pad = (value: string, width: number) => value.padEnd(width);
  console.log("Demo data ready.\n");
  console.log(`${pad("Who", 22)}${pad("Email", 36)}Password`);
  console.log(`${pad("Admin", 22)}${pad(adminEmail, 36)}${adminPassword}`);
  console.log(
    `${pad("Production lead", 22)}${pad("nia.okonkwo@plugin.local", 36)}${DEMO_PASSWORD}`,
  );
  console.log(
    `${pad("Design (Production)", 22)}${pad("amara.bello@plugin.local", 36)}${DEMO_PASSWORD}`,
  );
  console.log(
    `${pad("Print (Production)", 22)}${pad("kelechi.okafor@plugin.local", 36)}${DEMO_PASSWORD}`,
  );
  console.log(
    `${pad("Apex lead", 22)}${pad("malik.chen@plugin.local", 36)}${DEMO_PASSWORD}`,
  );
  console.log(
    `${pad("Campaigns lead", 22)}${pad("elena.voss@plugin.local", 36)}${DEMO_PASSWORD}`,
  );
  console.log(
    `\nOther demo people also use ${DEMO_PASSWORD}. Sign in at http://localhost:3000`,
  );
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
