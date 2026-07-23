import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";
import "dotenv/config";
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? "postgres://dental:dental@127.0.0.1:5432/dental_crm"
});
export const db = drizzle(pool, { schema });
