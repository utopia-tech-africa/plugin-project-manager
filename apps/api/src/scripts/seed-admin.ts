import "dotenv/config";
import "reflect-metadata";

import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";
import { Pool } from "pg";

import { PrismaClient } from "../generated/prisma/client";

const run = async (): Promise<void> => {
  const connectionString =
    process.env["DATABASE_URL"] ??
    "postgresql://postgres:postgres@127.0.0.1:5433/plugin_project_manager";
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const email = (process.env["ADMIN_EMAIL"] ?? "admin@plugin.local")
    .trim()
    .toLowerCase();
  const password = process.env["ADMIN_PASSWORD"] ?? "plugin-admin-change-me";
  const fullName = process.env["ADMIN_NAME"] ?? "Plugin Admin";
  const passwordHash = await argon2.hash(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      passwordHash,
      orgRole: "admin",
      isActive: true,
    },
    create: {
      email,
      fullName,
      passwordHash,
      orgRole: "admin",
      isActive: true,
    },
  });

  await prisma.$disconnect();
  await pool.end();
  console.log(`Admin ready: ${email}`);
};

void run();
