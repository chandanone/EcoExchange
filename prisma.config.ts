import "dotenv/config";
import { defineConfig } from "prisma/config";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "pnpm exec tsx prisma/seed.ts",
  },
  datasource: {
    url: DATABASE_URL,
  },
});
