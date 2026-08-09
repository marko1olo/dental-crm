import { defineConfig } from "drizzle-kit"; export default defineConfig({ schema: "./src/db/schema.ts", out: "./drizzle2", dialect: "postgresql" });
