export type TeamRole = "lead" | "member";
export type OrgRole = "admin" | "member";
export type ProjectStatus = "active" | "completed";
export type PhaseStatus = "pending" | "active" | "completed" | "returned";

export type AuthResponse = {
  user: {
    id: string;
    email: string;
    fullName: string;
    orgRole: OrgRole;
    sessionId: string;
    teamRoles: Array<{ teamId: string; role: TeamRole; subTeamIds: string[] }>;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type TeamSummary = {
  id: string;
  name: string;
  slug: string;
};

export type SubTeam = {
  id: string;
  teamId: string;
  name: string;
  slug: string;
  memberships: Array<{
    id: string;
    user: { id: string; email: string; fullName: string };
  }>;
};

export type Phase = {
  id: string;
  teamId: string;
  subTeamId: string;
  name: string;
  slug: string;
  step: number;
};

export type TeamMember = {
  id: string;
  role: TeamRole;
  user: { id: string; email: string; fullName: string };
};

export type TeamDetail = TeamSummary & {
  subTeams: SubTeam[];
  phases: Phase[];
  memberships: TeamMember[];
};

export type DocumentRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: { id: string; fullName: string };
};

export type ProjectPhase = {
  id: string;
  publicId: string;
  name: string;
  slug: string;
  step: number;
  attempt: number;
  status: PhaseStatus;
  returnReason: string;
  subTeam: { id: string; name: string; slug: string };
  documents: DocumentRecord[];
};

export type Project = {
  id: string;
  publicId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  currentStep: number;
  team: { id: string; name: string; slug: string };
  createdBy: { id: string; fullName: string };
  phases: ProjectPhase[];
};

export type HistoryItem = {
  id: string;
  publicId: string;
  name: string;
  slug: string;
  step: number;
  attempt: number;
  status: PhaseStatus;
  returnReason: string;
  documentCount: number;
  subTeam: { id: string; name: string; slug: string };
  project: {
    id: string;
    publicId: string;
    name: string;
    status: ProjectStatus;
    team?: { id: string; name: string };
  };
};

export type InviteCreated = {
  email: string;
  teamId: string;
  subTeamId: string | null;
  expiresAt: string;
  inviteUrl: string;
  emailSent: boolean;
};

export type DashboardWaitingItem = {
  projectId: string;
  projectPublicId: string;
  projectName: string;
  phasePublicId: string;
  phaseName: string;
  subTeamName: string;
  teamName: string;
  daysWaiting: number;
};

export type DashboardStats = {
  activeProjects: number;
  completedProjects: number;
  completedThisWeek: number;
  waitingOnYou: number;
  returnedPhases: number;
  filesUploaded: number;
  oldestJob: {
    projectId: string;
    publicId: string;
    name: string;
    phaseName: string;
    subTeamName: string;
    daysWaiting: number;
  } | null;
  waiting: DashboardWaitingItem[];
  bySubTeam: Array<{
    subTeamId: string;
    name: string;
    teamName: string;
    activeCount: number;
  }>;
  pipeline: Array<{
    step: number;
    label: string;
    projectCount: number;
  }>;
  recentHandoffs: Array<{
    projectId: string;
    projectPublicId: string;
    projectName: string;
    phasePublicId: string;
    phaseName: string;
    subTeamName: string;
    completedAt: string;
  }>;
  phaseMix: Array<{ status: string; count: number }>;
  handoffsByDay: Array<{ day: string; label: string; count: number }>;
};

export type NoticeKind = "waiting" | "sent_back" | "closed";

export type Notice = {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  projectId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NoticeList = {
  unreadCount: number;
  items: Notice[];
};
