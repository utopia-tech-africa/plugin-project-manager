import type { INestApplication } from "@nestjs/common";
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from "@nestjs/swagger";

const API_VERSION = "1.0.0";

export const createOpenApiDocument = (
  app: INestApplication,
  prefix: string,
): OpenAPIObject => {
  const config = new DocumentBuilder()
    .setTitle("Plugin Project Manager API")
    .setDescription(
      "API for Plugin teams to create projects, move work through configurable phases, and hand off documents.",
    )
    .setVersion(API_VERSION)
    .addServer(prefix)
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      "bearer",
    )
    .build();

  return SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey: string, methodKey: string) =>
      methodKey,
    ignoreGlobalPrefix: false,
  });
};

export const setupSwagger = (app: INestApplication, prefix: string): void => {
  const document = createOpenApiDocument(app, prefix);

  SwaggerModule.setup(`${prefix}/docs`, app, document, {
    jsonDocumentUrl: `${prefix}/docs-json`,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  });
};
