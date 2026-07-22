/**
 * PGlite-compatible seed script for local development.
 * Seeds organizations + users for DENTE dev environment.
 * Run: npx tsx src/scripts/seedPglite.ts
 */

import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { hashCredential } from "../utils/cryptoHelper.js";

const DEMO_ORG_ID = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const DEMO_CLINIC_NAME = "Стоматология, 1 кабинет";

const DEMO_STAFF = [
	{
		id: "e44d32ca-7777-4c00-a001-c88f01b92e21",
		fullName: "Петров Иван Иванович",
		role: "owner" as const,
		phone: "+7 927 555-55-55",
		email: "owner@example.com",
		isAdmin: true,
	},
	{
		id: "8356141b-7cfa-4221-95f7-70f47e7344b1",
		fullName: "Иванова Марина Сергеевна",
		role: "doctor" as const,
		phone: "+7 927 111-22-33",
		email: "doctor@example.com",
		isAdmin: false,
	},
	{
		id: "93bca14f-a11d-4088-9b48-cb7a0fd4c9ef",
		fullName: "Кузнецова Анна",
		role: "administrator" as const,
		phone: "+7 927 222-10-10",
		email: "admin@example.com",
		isAdmin: true,
	},
	{
		id: "f365da0c-7094-4f80-b52d-59b7b1254791",
		fullName: "Садыкова Эльмира",
		role: "assistant" as const,
		phone: "+7 927 900-77-10",
		email: null,
		isAdmin: false,
	},
];

async function seedPglite() {
	const clinicLogin = process.env.CLINIC_LOGIN ?? "clinic@example.com";
	const clinicPassword = process.env.CLINIC_PASSWORD ?? "dente2026";
	const adminPin = process.env.ADMIN_PIN ?? "0000";
	const staffPin = process.env.STAFF_PIN ?? "1234";

	console.log("🔐 DENTE PGlite Seed — starting...\n");
	console.log(`  Clinic login:    ${clinicLogin}`);
	console.log(`  Clinic password: ${"*".repeat(clinicPassword.length)}`);
	console.log(`  Admin PIN:       ${adminPin}`);
	console.log(`  Staff PIN:       ${staffPin}\n`);

	const passwordHash = await hashCredential(clinicPassword);

	// 1. Upsert organization
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
		console.log(`  ✅ Organization updated: ${DEMO_CLINIC_NAME}`);
	} else {
		await db.insert(schema.organizations).values({
			id: DEMO_ORG_ID,
			name: DEMO_CLINIC_NAME,
			loginId: clinicLogin,
			passwordHash,
			inn: "631234567890",
			ogrn: "318631300000000",
			email: clinicLogin,
		});
		console.log(`  ✅ Organization created: ${DEMO_CLINIC_NAME}`);
	}

	// 2. Upsert users
	for (const staff of DEMO_STAFF) {
		const pin = staff.isAdmin ? adminPin : staffPin;
		const pinCodeHash = await hashCredential(pin);
		const isOwner = staff.email === "owner@example.com";
		const userPasswordHash = isOwner ? passwordHash : null;

		const [existingUser] = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.id, staff.id))
			.limit(1);

		if (existingUser) {
			await db
				.update(schema.users)
				.set({ pinCodeHash, passwordHash: userPasswordHash, isActive: true })
				.where(
					and(
						eq(schema.users.id, staff.id),
						eq(schema.users.organizationId, DEMO_ORG_ID),
					),
				);
			console.log(`  ✅ User updated: ${staff.fullName} (${staff.role})`);
		} else {
			await db.insert(schema.users).values({
				id: staff.id,
				organizationId: DEMO_ORG_ID,
				fullName: staff.fullName,
				role: staff.role,
				phone: staff.phone,
				email: staff.email,
				pinCodeHash,
				passwordHash: userPasswordHash,
				isActive: true,
			});
			console.log(
				`  ✅ User created: ${staff.fullName} (${staff.role}) [PIN: ${pin}]`,
			);
		}
	}

	console.log("\n✔  PGlite seed complete.");
	console.log(`\n  Login: ${clinicLogin} / ${clinicPassword}`);
	console.log(`  Admin PIN: ${adminPin}  |  Staff PIN: ${staffPin}`);
}

seedPglite()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("❌ Seed failed:", err);
		process.exit(1);
	});
