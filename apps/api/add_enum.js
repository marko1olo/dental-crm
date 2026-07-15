import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "dente-db");

async function run() {
	const client = new PGlite(dbPath);
	try {
		console.log("Adding family_wallet to ledger_payment_method enum...");
		await client.query(
			`ALTER TYPE ledger_payment_method ADD VALUE IF NOT EXISTS 'family_wallet'`,
		);
		console.log("Success!");
	} catch (e) {
		console.error("Error:", e.message);
	}
}

run();
