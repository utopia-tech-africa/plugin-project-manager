import { ForbiddenException } from "@nestjs/common";

import type { AuthenticatedUser } from "./types/authenticated-user.type";

export const isAdmin = (user: AuthenticatedUser): boolean =>
  user.orgRole === "admin";

export const teamMembership = (user: AuthenticatedUser, teamId: string) =>
  user.teamRoles.find((membership) => membership.teamId === teamId);

export const isTeamLead = (user: AuthenticatedUser, teamId: string): boolean =>
  isAdmin(user) || teamMembership(user, teamId)?.role === "lead";

export const canConfigureTeam = (
  user: AuthenticatedUser,
  teamId: string,
): boolean => isTeamLead(user, teamId);

export const canCreateProject = (
  user: AuthenticatedUser,
  teamId: string,
): boolean => isTeamLead(user, teamId);

export const belongsToTeam = (
  user: AuthenticatedUser,
  teamId: string,
): boolean => isAdmin(user) || teamMembership(user, teamId) !== undefined;

export const belongsToSubTeam = (
  user: AuthenticatedUser,
  teamId: string,
  subTeamId: string,
): boolean =>
  isAdmin(user) ||
  (teamMembership(user, teamId)?.subTeamIds.includes(subTeamId) ?? false);

export const assertAdmin = (user: AuthenticatedUser): void => {
  if (!isAdmin(user)) {
    throw new ForbiddenException("Only an admin can do this.");
  }
};

export const assertTeamLead = (
  user: AuthenticatedUser,
  teamId: string,
): void => {
  if (!isTeamLead(user, teamId)) {
    throw new ForbiddenException("Only a team lead or admin can do this.");
  }
};

export const assertTeamMember = (
  user: AuthenticatedUser,
  teamId: string,
): void => {
  if (!belongsToTeam(user, teamId)) {
    throw new ForbiddenException("You are not on this team.");
  }
};
