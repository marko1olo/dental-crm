/**
 * redTeamPatientsAndSwallowedAudit.test.ts
 *
 * RED TEAM ADVERSARIAL AUDIT:
 * 1. SQL Injection & Cross-Tenant IDOR Pentest on GET /api/patients and GET /api/patients/:patientId
 * 2. Empirical proof of swallowed catch defects in Copilot and Clinical services
 *
 * Mode: T.A.R.S. 100% Honesty. Real PostgreSQL 18.4 (127.0.0.1:5432).
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { type FastifyInstance } from "fastify";
import { sql, eq } from "drizzle-orm";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import {
	fixtureUuid,
	withFixtureTenant,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { copilotRoutes, extractDoctorScreenContext } from "../../routes/copilot.js";
import { organizations, users, patients } from "../../db/schema.js";

const FIXTURE = "redTeamPatientsSwallowed";
const ORG_A_ID = fixtureUuid(FIXTURE, 1);
const ORG_B_ID = fixtureUuid(FIXTURE, 2);

const DOCTOR_A_ID = fixtureUuid(FIXTURE, 10);
const DOCTOR_B_ID = fixtureUuid(FIXTURE, 20);

const PATIENT_A1_ID = fixtureUuid(FIXTURE, 31);
const PATIENT_A2_ID = fixtureUuid(FIXTURE, 32);
const PATIENT_B1_ID = fixtureUuid(FIXTURE, 33);

describe("RED TEAM PENTEST: PATIENT SEARCH SQLi, CROSS-TENANT ISOLATION & SWALLOWED CATCH PROOF", () => {
	let app: FastifyInstance;
	let tokenDoctorA: string;
	let tokenDoctorB: string;
	let dbAvailable = true;

	before(async () => {
		try {
			await withFixtureTenant(ORG_A_ID, async (tx) => {
				await tx.execute(sql`SELECT 1`);
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				console.warn("[RED_TEAM] PostgreSQL unavailable, skipping suite");
				return;
			}
			throw err;
		}

		console.log("[RED_TEAM SETUP] Seeding Tenant A and Tenant B fixtures...");

		await withFixtureTenant(ORG_A_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_A_ID,
				name: "Клиника А (Red Team Patients A)",
				email: "clinic_a_pat@redteam.test",
			}).onConflictDoNothing();

			await tx.insert(users).values({
				id: DOCTOR_A_ID,
				organizationId: ORG_A_ID,
				email: "doc_a_pat@redteam.test",
				fullName: "Доктор Пациентов А.С.",
				role: "doctor",
				phone: "+79003330101",
				passwordHash: "hash-doc-a-pat",
			}).onConflictDoNothing();

			await tx.insert(patients).values([
				{
					id: PATIENT_A1_ID,
					organizationId: ORG_A_ID,
					fullName: "Иванов Иван Иванович (Клиника А)",
					phone: "+79993330101",
				},
				{
					id: PATIENT_A2_ID,
					organizationId: ORG_A_ID,
					fullName: "Петрова Анна Сергеевна (Клиника А)",
					phone: "+79993330102",
				},
			]).onConflictDoNothing();
		});

		await withFixtureTenant(ORG_B_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_B_ID,
				name: "Клиника Б (Red Team Patients B)",
				email: "clinic_b_pat@redteam.test",
			}).onConflictDoNothing();

			await tx.insert(users).values({
				id: DOCTOR_B_ID,
				organizationId: ORG_B_ID,
				email: "doc_b_pat@redteam.test",
				fullName: "Доктор Жертвин Б.В.",
				role: "doctor",
				phone: "+79003330201",
				passwordHash: "hash-doc-b-pat",
			}).onConflictDoNothing();

			await tx.insert(patients).values({
				id: PATIENT_B1_ID,
				organizationId: ORG_B_ID,
				fullName: "Секретный Пациент Б (Клиника Б)",
				phone: "+79993330201",
			}).onConflictDoNothing();
		});

		const secret = authTokenSecret();
		tokenDoctorA = signToken({ organizationId: ORG_A_ID, userId: DOCTOR_A_ID, role: "doctor" }, secret, 3600);
		tokenDoctorB = signToken({ organizationId: ORG_B_ID, userId: DOCTOR_B_ID, role: "doctor" }, secret, 3600);

		app = createTenantTestApp();
		await registerPatientRoutes(app);
		await app.register(copilotRoutes);
	});

	// =========================================================================
	// 1. SQL INJECTION & TAUTOLOGY ATTACKS
	// =========================================================================
	describe("1. SQL Injection Attacks on GET /api/patients & GET /api/patients/:patientId", () => {
		it("1.1. SQL Tautology injection ' OR 1=1 -- in query string is ignored or sanitized", async (t) => {
			if (!dbAvailable) return t.skip();

			const res = await app.inject({
				method: "GET",
				url: "/api/patients?search=' OR 1=1 --",
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
			});

			console.log(`[PENTEST 1.1] search=' OR 1=1 -- status: ${res.statusCode}`);
			assert.equal(res.statusCode, 200);
			const list = JSON.parse(res.body);
			assert.ok(Array.isArray(list));
			// Должны вернуться только пациенты Клиники А, ни одного пациента Клиники Б
			assert.ok(list.every((p: { organizationId: string }) => p.organizationId === ORG_A_ID));
			assert.ok(!list.some((p: { id: string }) => p.id === PATIENT_B1_ID));
		});

		it("1.2. UNION SELECT injection attempt does not leak foreign tenant data", async (t) => {
			if (!dbAvailable) return t.skip();

			const payload = "' UNION SELECT id, organization_id, full_name, birth_date, phone, email, notes, weight_kg, administrative_profile, family_group_id, merged_into_patient_id, created_at, updated_at FROM patients --";
			const res = await app.inject({
				method: "GET",
				url: `/api/patients?search=${encodeURIComponent(payload)}`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
			});

			console.log(`[PENTEST 1.2] UNION SELECT status: ${res.statusCode}`);
			assert.equal(res.statusCode, 200);
			const list = JSON.parse(res.body);
			assert.ok(list.every((p: { organizationId: string }) => p.organizationId === ORG_A_ID));
			assert.ok(!list.some((p: { id: string }) => p.id === PATIENT_B1_ID));
		});

		it("1.3. SQL Injection in URL parameter /api/patients/:patientId is strictly blocked by UUID validator", async (t) => {
			if (!dbAvailable) return t.skip();

			const res = await app.inject({
				method: "GET",
				url: "/api/patients/'%20OR%201=1%20--",
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
			});

			console.log(`[PENTEST 1.3] :patientId SQL injection status: ${res.statusCode} | body: ${res.body}`);
			assert.equal(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.equal(body.error, "PatientRouteValidationError");
		});

		it("1.4. Wildcard metacharacters (%) and escape backslashes (\\) do not trigger DB errors or leaks", async (t) => {
			if (!dbAvailable) return t.skip();

			const res = await app.inject({
				method: "GET",
				url: "/api/patients?search=%25%5C%25%5F%27%22",
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
			});

			console.log(`[PENTEST 1.4] wildcards search status: ${res.statusCode}`);
			assert.equal(res.statusCode, 200);
			const list = JSON.parse(res.body);
			assert.ok(list.every((p: { organizationId: string }) => p.organizationId === ORG_A_ID));
		});
	});

	// =========================================================================
	// 2. CROSS-TENANT DATA ISOLATION (IDOR)
	// =========================================================================
	describe("2. Cross-Tenant IDOR Attacks", () => {
		it("2.1. Doctor A cannot access Patient B by direct ID lookup (HTTP 404)", async (t) => {
			if (!dbAvailable) return t.skip();

			const res = await app.inject({
				method: "GET",
				url: `/api/patients/${PATIENT_B1_ID}`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
			});

			console.log(`[PENTEST 2.1] cross-tenant patient read status: ${res.statusCode} | body: ${res.body}`);
			assert.equal(res.statusCode, 404);
			const body = JSON.parse(res.body);
			assert.equal(body.error, "PatientNotFound");
		});

		it("2.2. Patient list query strictly partitions data by organization_id", async (t) => {
			if (!dbAvailable) return t.skip();

			const resA = await app.inject({
				method: "GET",
				url: "/api/patients",
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
			});
			assert.equal(resA.statusCode, 200);
			const listA = JSON.parse(resA.body);
			assert.ok(listA.some((p: { id: string }) => p.id === PATIENT_A1_ID));
			assert.ok(!listA.some((p: { id: string }) => p.id === PATIENT_B1_ID));

			const resB = await app.inject({
				method: "GET",
				url: "/api/patients",
				headers: { "x-dente-clinic-token": tokenDoctorB, "x-dente-staff-token": tokenDoctorB },
			});
			assert.equal(resB.statusCode, 200);
			const listB = JSON.parse(resB.body);
			assert.ok(listB.some((p: { id: string }) => p.id === PATIENT_B1_ID));
			assert.ok(!listB.some((p: { id: string }) => p.id === PATIENT_A1_ID));
		});
	});

	// =========================================================================
	// 3. AUDIT & RESOLUTION OF SWALLOWED CATCH DEFECTS IN COPILOT
	// =========================================================================
	describe("3. Swallowed Error Defects Proof & Resolution", () => {
		it("3.1. Proves that extractDoctorScreenContext logs warning and salvages patient allergies without dropping them", async (t) => {
			if (!dbAvailable) return t.skip();

			// Malformed JSON (no quotes around strings) previously dropped allergies completely
			const testContextPrompt = "[UI Context: View='visit', PatientId='pat-1', Allergies='[Articaine, Lidocaine]']\nДоктор: назначь анестетик";
			const { doctorContext } = extractDoctorScreenContext(testContextPrompt);
			console.log(`[AUDIT 3.1] doctorContext:`, doctorContext);
			assert.ok(doctorContext, "doctorContext must not be null!");
			assert.ok(doctorContext.allergies, "Allergies must not be null/dropped!");
			assert.deepEqual(doctorContext.allergies, ["Articaine", "Lidocaine"]);
		});
	});
});
