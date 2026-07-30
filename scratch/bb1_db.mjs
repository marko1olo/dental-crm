// Read-only. Raw pg client, NOT the app's db module - deliberately a different
// instrument from the one the builder used for the same claim.
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
if (!url) throw new Error("DATABASE_URL not found");

const client = new pg.Client({ connectionString: url });
await client.connect();
const orgs = await client.query("select id, name from organizations order by id");
const cnt = await client.query("select count(*)::int as n from organizations");
await client.end();

writeFileSync(new URL("./bb1_db_out.json", import.meta.url), JSON.stringify({ count: cnt.rows[0].n, rows: orgs.rows }, null, 1), "utf8");
console.log("ORG_COUNT", cnt.rows[0].n);
