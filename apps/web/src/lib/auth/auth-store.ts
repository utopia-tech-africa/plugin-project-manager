"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  orgRole: "admin" | "member";
  sessionId: string;
  teamRoles: Array<{
    teamId: string;
    role: "lead" | "member";
    subTeamIds: string[];
  }>;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (params: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  }) => void;
  setTokens: (params: { accessToken: string; refreshToken: string }) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: "plugin-auth" },
  ),
);
