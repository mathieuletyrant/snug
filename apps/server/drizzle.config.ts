import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/modules/*/infrastructure/schema.ts",
  out: "./drizzle",
});
