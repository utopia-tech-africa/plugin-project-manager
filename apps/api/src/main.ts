import "dotenv/config";
import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module";
import { ProblemDetailsExceptionFilter } from "./common/filters/problem-details-exception.filter";
import type { EnvironmentVariables } from "./config/environment";
import { JSON_BODY_LIMIT } from "./config/http-body";
import { setupSwagger } from "./config/swagger";

const bootstrap = async (): Promise<void> => {
  const prefix = "/api/v1";
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser("json", { limit: JSON_BODY_LIMIT });
  app.useBodyParser("urlencoded", { limit: JSON_BODY_LIMIT, extended: true });
  const configService =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const host = configService.get("HOST", { infer: true });
  const port = configService.get("PORT", { infer: true });
  const corsOrigins = configService
    .get("CORS_ORIGINS", { infer: true })
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new ProblemDetailsExceptionFilter());

  app.setGlobalPrefix(prefix);
  setupSwagger(app, prefix);
  await app.listen(port, host);

  Logger.log(`API running on http://${host}:${port}`, "Bootstrap");
  Logger.log(
    `Swagger UI available at http://${host}:${port}${prefix}/docs`,
    "Swagger",
  );
};

void bootstrap();
