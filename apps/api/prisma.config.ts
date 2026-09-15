import "dotenv/config";

import { defineConfig } from "prisma/config";

const DATABASE_URL_FALLBACK =
  "postgresql://postgres:postgres@127.0.0.1:5433/plugin_project_manager";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? DATABASE_URL_FALLBACK,
  },
});
