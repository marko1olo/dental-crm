/**
 * patch-owner-credentials.ts
 * Adds email + passwordHash to the owner user in PGlite DB so UserLogin works.
 * Run: npx tsx src/scripts/patch-owner-credentials.ts
 */
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { hashCredential } from "../utils/cryptoHelper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../dente-db");

console.log("[PATCH] Connecting to DB:", DB_PATH);
const db = new PGlite(DB_PATH, {
  extensions: { electric: electricSync() },
});
await (db as any).waitReady;
console.log("[PATCH] PGlite ready.");

const ownerEmail = "owner@clinic.com";
const ownerPassword = "dente2026";
const ownerPin = "1234";
const passwordHash = await hashCredential(ownerPassword);
const pinHash = await hashCredential(ownerPin);

// Find owner user
const ownerResult = await (db as any).query(
  `SELECT id, full_name, email, password_hash FROM users WHERE role = 'owner' LIMIT 1`
);

if (ownerResult.rows.length === 0) {
  console.error("[PATCH] No owner user found! Run setup-fresh-db.ts first.");
  await (db as any).close();
  process.exit(1);
}

const owner = ownerResult.rows[0] as any;
console.log("[PATCH] Found owner:", owner.full_name, "| current email:", owner.email || "(none)");

// Update owner with email + password + pin
await (db as any).query(
  `UPDATE users 
   SET email = $1, 
       password_hash = $2, 
       pin_code_hash = $3,
       can_sign_medical_records = true,
       can_manage_money = true,
       can_manage_imports = true
   WHERE id = $4`,
  [ownerEmail, passwordHash, pinHash, owner.id]
);
console.log("[PATCH] Owner user updated successfully!");

// Also ensure onboarding_completed = true so we skip the wizard for demo
await (db as any).query(
  `UPDATE organizations SET onboarding_completed = true WHERE id = (
    SELECT organization_id FROM users WHERE id = $1
  )`,
  [owner.id]
);
console.log("[PATCH] Organization onboarding marked complete.");

// Verify
const check = await (db as any).query(
  `SELECT u.id, u.full_name, u.email, u.role,
          o.name AS clinic_name, o.login_id, o.onboarding_completed
   FROM users u
   JOIN organizations o ON u.organization_id = o.id
   WHERE u.role = 'owner' LIMIT 1`
);
const row = check.rows[0] as any;
console.log("\n[PATCH] Verification:");
console.log("  Clinic:", row.clinic_name, "(login:", row.login_id + ")");
console.log("  Owner:", row.full_name, "(email:", row.email + ")");
console.log("  Onboarding complete:", row.onboarding_completed);
console.log("\n[PATCH] Login options:");
console.log("  Clinic PC mode: clinic@example.com / dente2026");
console.log("  User mode:      owner@clinic.com / dente2026");
console.log("  PIN pad:        1234");

await (db as any).close();
