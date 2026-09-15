import {
  type DynamicModule,
  type ForwardReference,
  Module,
  type Type,
} from "@nestjs/common";
import type { ConfigModuleOptions } from "@nestjs/config";
import { ConfigModule } from "@nestjs/config";

import { validateEnvironment } from "./config/environment";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { MailModule } from "./modules/mail/mail.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { StorageModule } from "./modules/storage/storage.module";
import { TeamsModule } from "./modules/teams/teams.module";

type NestModuleImport =
  | Type
  | DynamicModule
  | Promise<DynamicModule>
  | ForwardReference;

const validateProcessEnv: NonNullable<ConfigModuleOptions["validate"]> = (
  config,
): ReturnType<typeof validateEnvironment> => validateEnvironment(config);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      validate: validateProcessEnv,
    }),
    PrismaModule,
    StorageModule,
    MailModule,
    AuthModule,
    HealthModule,
    TeamsModule,
    NotificationsModule,
    ProjectsModule,
  ] satisfies NestModuleImport[],
})
export class AppModule {}
