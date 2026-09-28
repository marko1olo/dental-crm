/**
 * migrate.ts — CLI entry point for DENTE CRM database migrations.
 * Wraps src/db/migrate.ts runMigrations with process lifecycle and CLI flags.
 */

import { runMigrations } from "../db/migrate.js";

const flags = new Set(process.argv.slice(2));
const dryRun = flags.has("--dry-run");
const baseline = flags.has("--baseline");
const strict = flags.has("--strict");
const incremental = flags.has("--incremental");

const mode = incremental ? "incremental" : "auto";

runMigrations({ dryRun, baseline, strict, mode })
	.then((result) => {
		if (strict && result.changed > 0) {
			process.exit(1);
		}
	})
	.catch((err) => {
		console.error("[migrate] FATAL:", (err as Error).message);
		process.exit(1);
	});
