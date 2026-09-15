import { plainToInstance, Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from "class-validator";

class EnvironmentVariablesDto {
  @IsString()
  public HOST = "127.0.0.1";

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  public PORT = 3001;

  @IsString()
  @MinLength(1)
  public DATABASE_URL =
    "postgresql://postgres:postgres@127.0.0.1:5433/plugin_project_manager";

  @IsString()
  @MinLength(16)
  public JWT_ACCESS_SECRET = "dev-access-secret-change-me";

  @IsString()
  @MinLength(16)
  public JWT_REFRESH_SECRET = "dev-refresh-secret-change-me";

  @Type(() => Number)
  @IsInt()
  @Min(60)
  public JWT_ACCESS_TTL_SECONDS = 900;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public JWT_REFRESH_TTL_DAYS = 30;

  @IsString()
  @MinLength(1)
  public CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000";

  @IsString()
  @MinLength(1)
  public APP_PUBLIC_URL = "http://localhost:3000";

  @IsString()
  public ADMIN_EMAIL = "admin@plugin.local";

  @IsString()
  public ADMIN_PASSWORD = "plugin-admin-change-me";

  @IsString()
  public ADMIN_NAME = "Plugin Admin";

  @IsIn(["local", "r2"])
  public STORAGE_DRIVER: "local" | "r2" = "local";

  @IsString()
  public R2_ACCOUNT_ID = "";

  @IsString()
  public R2_ACCESS_KEY_ID = "";

  @IsString()
  public R2_SECRET_ACCESS_KEY = "";

  @IsString()
  public R2_BUCKET = "plugin-project-manager";

  @IsString()
  public R2_ENDPOINT = "";

  @IsString()
  public RESEND_API_KEY = "";

  @IsString()
  @MinLength(3)
  public MAIL_FROM = "Plugin <onboarding@resend.dev>";
}

export type EnvironmentVariables = {
  HOST: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  JWT_REFRESH_TTL_DAYS: number;
  CORS_ORIGINS: string;
  APP_PUBLIC_URL: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  ADMIN_NAME: string;
  STORAGE_DRIVER: "local" | "r2";
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET: string;
  R2_ENDPOINT: string;
  RESEND_API_KEY: string;
  MAIL_FROM: string;
};

const asString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;

export const validateEnvironment = (
  config: Record<string, unknown>,
): EnvironmentVariables => {
  const nodeEnv = asString(config["NODE_ENV"], "development");
  const configuredHost = asString(config["HOST"], "");
  const defaultHost = nodeEnv === "production" ? "0.0.0.0" : "127.0.0.1";
  const host =
    nodeEnv === "production" &&
    (configuredHost.length === 0 || configuredHost === "127.0.0.1")
      ? "0.0.0.0"
      : configuredHost.length > 0
        ? configuredHost
        : defaultHost;

  const rawEnvironment: Record<string, unknown> = {
    HOST: host,
    PORT: config["PORT"] ?? 3001,
    DATABASE_URL: asString(
      config["DATABASE_URL"],
      "postgresql://postgres:postgres@127.0.0.1:5433/plugin_project_manager",
    ),
    JWT_ACCESS_SECRET: asString(
      config["JWT_ACCESS_SECRET"],
      "dev-access-secret-change-me",
    ),
    JWT_REFRESH_SECRET: asString(
      config["JWT_REFRESH_SECRET"],
      "dev-refresh-secret-change-me",
    ),
    JWT_ACCESS_TTL_SECONDS: config["JWT_ACCESS_TTL_SECONDS"] ?? 900,
    JWT_REFRESH_TTL_DAYS: config["JWT_REFRESH_TTL_DAYS"] ?? 30,
    CORS_ORIGINS: asString(
      config["CORS_ORIGINS"],
      "http://localhost:3000,http://127.0.0.1:3000",
    ),
    APP_PUBLIC_URL: asString(config["APP_PUBLIC_URL"], "http://localhost:3000"),
    ADMIN_EMAIL: asString(config["ADMIN_EMAIL"], "admin@plugin.local"),
    ADMIN_PASSWORD: asString(
      config["ADMIN_PASSWORD"],
      "plugin-admin-change-me",
    ),
    ADMIN_NAME: asString(config["ADMIN_NAME"], "Plugin Admin"),
    STORAGE_DRIVER: asString(config["STORAGE_DRIVER"], "local"),
    R2_ACCOUNT_ID: asString(config["R2_ACCOUNT_ID"], ""),
    R2_ACCESS_KEY_ID: asString(config["R2_ACCESS_KEY_ID"], ""),
    R2_SECRET_ACCESS_KEY: asString(config["R2_SECRET_ACCESS_KEY"], ""),
    R2_BUCKET: asString(config["R2_BUCKET"], "plugin-project-manager"),
    R2_ENDPOINT: asString(config["R2_ENDPOINT"], ""),
    RESEND_API_KEY: asString(config["RESEND_API_KEY"], ""),
    MAIL_FROM: asString(
      config["MAIL_FROM"],
      "Plugin <onboarding@resend.dev>",
    ),
  };

  const validated = plainToInstance(EnvironmentVariablesDto, rawEnvironment, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration: ${JSON.stringify(errors)}`,
    );
  }

  return {
    HOST: validated.HOST,
    PORT: validated.PORT,
    DATABASE_URL: validated.DATABASE_URL,
    JWT_ACCESS_SECRET: validated.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: validated.JWT_REFRESH_SECRET,
    JWT_ACCESS_TTL_SECONDS: validated.JWT_ACCESS_TTL_SECONDS,
    JWT_REFRESH_TTL_DAYS: validated.JWT_REFRESH_TTL_DAYS,
    CORS_ORIGINS: validated.CORS_ORIGINS,
    APP_PUBLIC_URL: validated.APP_PUBLIC_URL,
    ADMIN_EMAIL: validated.ADMIN_EMAIL,
    ADMIN_PASSWORD: validated.ADMIN_PASSWORD,
    ADMIN_NAME: validated.ADMIN_NAME,
    STORAGE_DRIVER: validated.STORAGE_DRIVER,
    R2_ACCOUNT_ID: validated.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: validated.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: validated.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: validated.R2_BUCKET,
    R2_ENDPOINT: validated.R2_ENDPOINT,
    RESEND_API_KEY: validated.RESEND_API_KEY,
    MAIL_FROM: validated.MAIL_FROM,
  };
};
