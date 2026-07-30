/**
 * Local dev PostgreSQL for hosts without Docker or a native install.
 *
 * WHY: apps/api/src/db/client.ts connects with node-postgres (a pool) to
 * DATABASE_URL. This host has neither Docker nor pg binaries, so every
 * DB-backed smoke check failed for environmental reasons and real regressions
 * stayed invisible behind them. PGlite was tried first but serves only one
 * connection at a time, which a pool immediately thrashes. embedded-postgres
 * runs a genuine PostgreSQL server binary, so pooling works normally.
 *
 * Scratch-only harness: deps installed with --no-save on purpose.
 */
import { readFileSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

function parseDatabaseUrl() {
	const raw =
		process.env.DATABASE_URL ??
		readFileSync(".env", "utf8")
			.split(/\r?\n/)
			.find((l) => l.startsWith("DATABASE_URL="))
			?.slice("DATABASE_URL=".length)
			.trim();
	if (!raw) throw new Error("DATABASE_URL not configured");
	const url = new URL(raw);
	return {
		user: decodeURIComponent(url.username),
		password: decodeURIComponent(url.password),
		port: Number(url.port || 5432),
		database: url.pathname.replace(/^\//, ""),
	};
}

const cfg = parseDatabaseUrl();
const databaseDir = process.env.PG_DATA_DIR ?? "./scratch/pgdata";

const pg = new EmbeddedPostgres({
	databaseDir,
	user: cfg.user,
	password: cfg.password,
	port: cfg.port,
	persistent: true,
	// initdb/postgres are chatty; keep the log readable.
	onLog: (msg) => process.stdout.write(`[pg] ${msg}`),
});

let initialised = true;
try {
	await pg.initialise();
	console.log("[pg] cluster initialised");
} catch (error) {
	initialised = false;
	console.log(`[pg] initialise skipped (likely existing cluster): ${error.message}`);
}

await pg.start();
console.log(`[pg] started on 127.0.0.1:${cfg.port} user=${cfg.user}`);

if (initialised) {
	try {
		await pg.createDatabase(cfg.database);
		console.log(`[pg] database created: ${cfg.database}`);
	} catch (error) {
		console.log(`[pg] createDatabase: ${error.message}`);
	}
}

const client = pg.getPgClient();
await client.connect();
const r = await client.query("select version()");
console.log(`[pg] ${String(r.rows[0].version).slice(0, 60)}`);
await client.end();

console.log("[pg] READY");

for (const signal of ["SIGINT", "SIGTERM"]) {
	process.on(signal, async () => {
		console.log(`[pg] ${signal} — stopping`);
		await pg.stop();
		process.exit(0);
	});
}

// Keep the process alive as a long-running server.
setInterval(() => {}, 1 << 30);
