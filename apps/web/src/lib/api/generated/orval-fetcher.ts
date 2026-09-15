import { apiRequest } from "../http-client";

type OrvalRequest = {
  url: string;
  method: string;
  headers?: Record<string, string>;
  data?: unknown;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
};

const getTokenFromPersistedAuth = (): string | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const rawValue = localStorage.getItem("plugin-auth");
  if (!rawValue) {
    return undefined;
  }

  const parsed = JSON.parse(rawValue) as {
    state?: {
      accessToken?: string | null;
    };
  };

  return parsed.state?.accessToken ?? undefined;
};

const toPath = (url: string, params?: Record<string, unknown>): string => {
  const stripped = url.replace(/^https?:\/\/[^/]+\/api\/v1/, "").replace(/^\/api\/v1/, "");
  const path = stripped.startsWith("/") ? stripped : `/${stripped}`;
  if (params === undefined) {
    return path;
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query.length > 0 ? `${path}?${query}` : path;
};

export const orvalFetcher = async <T>(
  config: OrvalRequest,
  _options?: unknown,
): Promise<T> => {
  const authorizationHeader = config.headers?.Authorization;
  const token =
    authorizationHeader !== undefined && authorizationHeader.length > 0
      ? authorizationHeader.replace(/^Bearer\s+/i, "")
      : getTokenFromPersistedAuth();

  const passthroughHeaders: Record<string, string> = {};
  if (config.headers !== undefined) {
    for (const [key, value] of Object.entries(config.headers)) {
      if (key.toLowerCase() === "content-type" && config.data instanceof FormData) {
        continue;
      }
      passthroughHeaders[key] = value;
    }
  }

  return apiRequest<T>(toPath(config.url, config.params), {
    method: (config.method as "GET" | "POST" | "PATCH" | "PUT" | "DELETE") ?? "GET",
    body: config.data,
    token,
    ...(config.signal !== undefined ? { signal: config.signal } : {}),
    ...(Object.keys(passthroughHeaders).length > 0 ? { headers: passthroughHeaders } : {}),
  });
};
