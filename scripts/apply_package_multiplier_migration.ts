import { db } from "../apps/api/src/db/client.js";
import { sql } from "drizzle-orm";

async function main() {
	try {
		await db.execute(sql.raw("ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS package_multiplier numeric(10, 3) DEFAULT '1.000';"));
		console.log("Migration SUCCESS: package_multiplier column added to inventory_items table.");
	} catch (err: any) {
		console.error("Migration ERROR:", err.message);
	}
	process.exit(0);
}

main();
