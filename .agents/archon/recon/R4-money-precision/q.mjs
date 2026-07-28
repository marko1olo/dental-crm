// R4 recon: READ-ONLY SQL runner. Never prints DATABASE_URL.
// Usage: node q.mjs "<SELECT ...>"   (rejects anything that is not a read)
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

// Minimal dotenv parse (dotenv itself only lives in apps/api/node_modules).
function parseDotEnv(text) {
	const out = {};
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const eq = line.indexOf("=");
		if (eq <= 0) continue;
		const key = line.slice(0, eq).replace(/^export\s+/, "").trim();
		let val = line.slice(eq + 1).trim();
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		)
			val = val.slice(1, -1);
		out[key] = val;
	}
	return out;
}

const ROOT = "C:/Clinic_MVP/dental-crm";
for (const f of [path.join(ROOT, ".env.local"), path.join(ROOT, ".env")]) {
	if (!existsSync(f)) continue;
	const parsed = parseDotEnv(readFileSync(f, "utf8"));
	for (const [k, v] of Object.entries(parsed))
		if (process.env[k] === undefined) process.env[k] = v;
}
const url = process.env.DATABASE_URL;
if (!url) {
	console.error("NO_DATABASE_URL");
	process.exit(2);
}

const sql = process.argv.slice(2).join(" ");
const head = sql.trim().replace(/^\(+/, "").slice(0, 6).toLowerCase();
if (!(head.startsWith("select") || head.startsWith("with") || head.startsWith("explai"))) {
	console.error("REFUSED: read-only runner accepts SELECT/WITH/EXPLAIN only");
	process.exit(3);
}
if (/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|refresh)\b/i.test(sql)) {
	console.error("REFUSED: write keyword present");
	process.exit(3);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
	const client = await pool.connect();
	await client.query("SET default_transaction_read_only = on");
	await client.query("SET statement_timeout = 30000");
	const res = await client.query(sql);
	console.log(JSON.stringify(res.rows, null, 1));
	console.log("ROWS:" + res.rowCount);
	client.release();
} catch (e) {
	console.error("ERR:" + e.message);
	process.exitCode = 1;
} finally {
	await pool.end();
}
