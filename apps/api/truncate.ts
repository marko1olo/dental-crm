import { PGlite } from "@electric-sql/pglite";

async function run() {
	const db = new PGlite("./dente-db");
	await db.query("TRUNCATE TABLE payments CASCADE;");
	process.exit(0);
}
run();
