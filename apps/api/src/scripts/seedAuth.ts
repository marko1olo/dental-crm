/**
 * DENTE CRM — DB Auth Seed Script
 *
 * Seeds the organizations table with clinic credentials and
 * the users table with staff PIN codes for the existing demo/production data.
 *
 * Run: npx tsx src/scripts/seedAuth.ts
 *
 * Environment variables:
 *   DATABASE_URL        — Postgres connection string
 *   CLINIC_LOGIN        — Login ID for clinic (default: clinic@example.com)
 *   CLINIC_PASSWORD     — Master password for clinic workspace (default: dente2026)
 *   ADMIN_PIN           — PIN for owner/admin users (default: 0000)
 *   STAFF_PIN           — PIN for doctors/assistants (default: 1234)
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import { hashCredential } from "../utils/cryptoHelper.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://dental:dental@127.0.0.1:5432/dental_crm"
});

const db = drizzle(pool, { schema });

// ── Demo organization data (matches sampleData.ts) ──────────────────────────
const DEMO_ORG_ID = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const DEMO_CLINIC_NAME = "Стоматология, 1 кабинет";

const DEMO_STAFF = [
  {
    id: "e44d32ca-7777-4c00-a001-c88f01b92e21",
    fullName: "Петров Иван Иванович",
    role: "owner",
    phone: "+7 927 555-55-55",
    email: "owner@example.com",
    isAdmin: true
  },
  {
    id: "8356141b-7cfa-4221-95f7-70f47e7344b1",
    fullName: "Иванова Марина Сергеевна",
    role: "doctor",
    phone: "+7 927 111-22-33",
    email: "doctor@example.com",
    isAdmin: false
  },
  {
    id: "93bca14f-a11d-4088-9b48-cb7a0fd4c9ef",
    fullName: "Кузнецова Анна",
    role: "administrator",
    phone: "+7 927 222-10-10",
    email: "admin@example.com",
    isAdmin: true
  },
  {
    id: "f365da0c-7094-4f80-b52d-59b7b1254791",
    fullName: "Садыкова Эльмира",
    role: "assistant",
    phone: "+7 927 900-77-10",
    email: null,
    isAdmin: false
  }
];

async function seedAuth() {
  console.log("🔐 DENTE Auth Seed — starting...\n");

  const clinicLogin = process.env.CLINIC_LOGIN ?? "clinic@example.com";
  const clinicPassword = process.env.CLINIC_PASSWORD ?? "dente2026";
  const adminPin = process.env.ADMIN_PIN ?? "0000";
  const staffPin = process.env.STAFF_PIN ?? "1234";

  console.log(`  Clinic login:     ${clinicLogin}`);
  console.log(`  Clinic password:  ${clinicPassword.replace(/./g, "*")}`);
  console.log(`  Admin PIN:        ${adminPin}`);
  console.log(`  Staff PIN:        ${staffPin}\n`);

  // ── 1. Upsert organization ───────────────────────────────────────────────
  const passwordHash = hashCredential(clinicPassword);

  const [existingOrg] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, DEMO_ORG_ID))
    .limit(1);

  if (existingOrg) {
    await db
      .update(schema.organizations)
      .set({ loginId: clinicLogin, passwordHash })
      .where(eq(schema.organizations.id, DEMO_ORG_ID));
    console.log(`  ✅ Organization updated: ${DEMO_CLINIC_NAME} [${DEMO_ORG_ID}]`);
  } else {
    await db.insert(schema.organizations).values({
      id: DEMO_ORG_ID,
      name: DEMO_CLINIC_NAME,
      loginId: clinicLogin,
      passwordHash,
      inn: "631234567890",
      ogrn: "318631300000000",
      email: clinicLogin
    });
    console.log(`  ✅ Organization created: ${DEMO_CLINIC_NAME} [${DEMO_ORG_ID}]`);
  }

  // ── 2. Upsert users with PIN codes ───────────────────────────────────────
  for (const staff of DEMO_STAFF) {
    const pin = staff.isAdmin ? adminPin : staffPin;
    const pinCodeHash = hashCredential(pin);

    const [existingUser] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, staff.id))
      .limit(1);

    if (existingUser) {
      await db
        .update(schema.users)
        .set({ pinCodeHash })
        .where(eq(schema.users.id, staff.id));
      console.log(`  ✅ User PIN updated: ${staff.fullName} (${staff.role}) [PIN: ${pin}]`);
    } else {
      await db.insert(schema.users).values({
        id: staff.id,
        organizationId: DEMO_ORG_ID,
        fullName: staff.fullName,
        role: staff.role,
        phone: staff.phone,
        email: staff.email,
        pinCodeHash,
        isActive: true
      });
      console.log(`  ✅ User created: ${staff.fullName} (${staff.role}) [PIN: ${pin}]`);
    }
  }

  console.log("\n✔  Auth seed complete.\n");
  console.log("  Login at /api/auth/clinic/login with:");
  console.log(`    email:    ${clinicLogin}`);
  console.log(`    password: ${clinicPassword}`);
  console.log("\n  Staff PINs:");
  for (const s of DEMO_STAFF) {
    console.log(`    ${s.fullName.padEnd(32)} PIN: ${s.isAdmin ? adminPin : staffPin}`);
  }
}

seedAuth()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
