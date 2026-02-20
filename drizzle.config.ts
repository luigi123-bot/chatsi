import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./lib/db/schema.ts",
    out: "./start/drizzle",
    dialect: "sqlite",
    dbCredentials: {
        url: "sqlite.db",
    },
    verbose: true,
    strict: true,
});
