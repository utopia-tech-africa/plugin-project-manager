import { getApiBaseUrl } from "@/lib/api/api-base-url";
import { useAuthStore } from "@/lib/auth/auth-store";

export const refreshAccessToken = async (): Promise<boolean> => {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (refreshToken === null) {
    return false;
  }

  const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    useAuthStore.getState().clear();
    return false;
  }

  const payload = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  useAuthStore.getState().setTokens(payload);
  return true;
};
