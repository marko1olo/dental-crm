/**
 * Local dev Postgres for hosts without Docker or a native PostgreSQL install.
 *
 * WHY: apps/api/src/db/client.ts connects with node-postgres to DATABASE_URL
 * (127.0.0.1:5432). This host has neither Docker nor pg binaries, so every
 * DB-backed smoke check fails for environmental reasons and real regressions
 * stay invisible. PGlite is a WASM PostgreSQL; pglite-socket exposes it on a
 * real TCP port so the existing node-postgres client connects unchanged.
 *
 * Scratch-only harness: its deps are installed with --no-save on purpose.
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.env.PGLITE_PORT ?? 5432);
const host = process.env.PGLITE_HOST ?? "127.0.0.1";
const dataDir = process.env.PGLITE_DATA_DIR ?? "./scratch/pglite-data";

const db = await PGlite.create({ dataDir });
await db.waitReady;

const version = await db.query("select version()");
console.log(`[pglite] ready: ${version.rows[0].version}`);

const server = new PGLiteSocketServer({ db, port, host });

server.addEventListener("error", (event) => {
	console.error("[pglite] socket error:", event.detail ?? event);
});

await server.start();
console.log(`[pglite] listening on ${host}:${port} (dataDir=${dataDir})`);

for (const signal of ["SIGINT", "SIGTERM"]) {
	process.on(signal, async () => {
		console.log(`[pglite] ${signal} — shutting down`);
		await server.stop();
		await db.close();
		process.exit(0);
	});
}
