import type { OrgRole, TeamRole } from "../../generated/prisma/client";

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  orgRole: OrgRole;
  sessionId: string;
  teamRoles: Array<{
    teamId: string;
    role: TeamRole;
    subTeamIds: string[];
  }>;
};
