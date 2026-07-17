/**
 * setup-fresh-db.ts – applies SQL migration to a fresh PGlite DB and seeds initial data.
 * Run with: npx tsx src/scripts/setup-fresh-db.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SQL_FILE = path.resolve(__dirname, "../../drizzle/0000_freezing_randall_flagg.sql");
const DB_PATH = path.resolve(__dirname, "../../dente-db");

console.log("[SETUP] SQL:", SQL_FILE);
console.log("[SETUP] DB path:", DB_PATH);

if (!fs.existsSync(SQL_FILE)) {
	console.error("[SETUP] Migration SQL not found:", SQL_FILE);
	process.exit(1);
}

const db = new PGlite(DB_PATH, {
	extensions: { electric: electricSync() },
});

await (db as any).waitReady;
console.log("[SETUP] PGlite ready.");

const rawSql = fs.readFileSync(SQL_FILE, "utf8");

// Split on the drizzle breakpoint marker
const statements = rawSql
	.split(/-->\s*statement-breakpoint/gi)
	.map((s) => s.trim())
	.filter(Boolean);

console.log(`[SETUP] Applying ${statements.length} SQL statements...`);
let ok = 0;
let skipped = 0;
let errors = 0;
for (const stmt of statements) {
	try {
		await (db as any).exec(stmt);
		ok++;
	} catch (err: any) {
		if (
			err.message?.includes("already exists") ||
			err.message?.includes("duplicate")
		) {
			skipped++;
		} else {
			errors++;
			console.error("[SETUP] FAILED:", err.message?.slice(0, 120));
			console.error("[STMT]:", stmt.slice(0, 200));
		}
	}
}
console.log(`[SETUP] Migration: OK=${ok} Skipped=${skipped} Errors=${errors}`);

// Check if org already exists
const existing = await (db as any).query("SELECT id FROM organizations LIMIT 1");
if (existing.rows.length > 0) {
	console.log("[SETUP] Organization already exists – skipping seed.");
	await (db as any).close();
	process.exit(0);
}

// Simple hash matching what cryptoHelper.ts uses (bcrypt-compat or sha256 depending on version)
// The auth route uses verifyCredential - let's check what it does
// Looking at the code, it uses hashCredential which is PBKDF2/bcrypt.
// We'll use the same pattern from cryptoHelper.ts by importing it
import { hashCredential } from "../utils/cryptoHelper.js";
const orgId = crypto.randomUUID();
const userId = crypto.randomUUID();

const clinicName = "DENTE Стоматология";
const loginId = "clinic@example.com";
const ownerEmail = "owner@clinic.com";
const password = "dente2026";
const ownerName = "Администратор клиники";
const ownerPin = "1234";

const passwordHash = hashCredential(password);
const pinHash = hashCredential(ownerPin);
const ownerPasswordHash = hashCredential(password);

await (db as any).query(
	`INSERT INTO organizations (id, name, login_id, password_hash, clinic_mode, onboarding_completed)
   VALUES ($1, $2, $3, $4, 'single', false)`,
	[orgId, clinicName, loginId, passwordHash],
);
console.log("[SETUP] Organization created:", clinicName);

// Owner user: has email + password (for UserLogin) AND pin (for StaffPinPad)
await (db as any).query(
	`INSERT INTO users (id, organization_id, full_name, role, is_active, email, password_hash, pin_code_hash, can_sign_medical_records, can_manage_money, can_manage_imports)
   VALUES ($1, $2, $3, 'owner', true, $4, $5, $6, true, true, true)`,
	[userId, orgId, ownerName, ownerEmail, ownerPasswordHash, pinHash],
);
console.log("[SETUP] Owner user created:", ownerName, "| email:", ownerEmail);

await (db as any).close();
console.log("[SETUP] Done!");
console.log("  Clinic login: clinic@example.com / dente2026");
console.log("  Staff login:  owner@clinic.com / dente2026");
console.log("  PIN pad:      1234");
