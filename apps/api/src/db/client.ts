import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema.js";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB path at apps/api/dente-db
const dbPath = path.resolve(__dirname, "../../dente-db");
export const client = new PGlite(dbPath, {
	extensions: {
		electric: electricSync(),
	},
});
export const db = drizzle(client, { schema });
