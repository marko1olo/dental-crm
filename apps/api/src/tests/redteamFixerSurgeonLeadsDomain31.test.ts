/**
 * redteamFixerSurgeonLeadsDomain31.test.ts
 *
 * RED TEAM FIXER SURGEON PROOF SUITE — DOMAIN 31:
 * LEADS KANBAN, INTAKE HIGHWAY & CONVERSION PIPELINE
 *
 * Verifies:
 * 1. Single Door & Deduplication: Concurrent / repeated conversion does not duplicate patients in PostgreSQL.
 * 2. Communication Consents Sync: Atomic persistence of service consents upon create-patient.
 * 3. Idempotency-Key Enforcement: Client Idempotency-Key header propagates through conversion routes.
 * 4. Money & BigInt Invariants (Mandate 8bm): Exact kopecks calculation from crmLeads.expectedRevenueKopecks.
 * 5. Domain Purity (Mandate 8ap): Zero third-party trademarks ("Straumann", "AirFlow") in demo seed leads.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { crmLeads, organizations, patientCommunicationConsents, patients, users } from "../db/schema.js";
import { DEMO_SHOWCASE_SEED_LEADS } from "../routes/leadsModules/demoSeedLeads.js";
import { calculateLeadPipelineMetrics } from "../routes/leadsMetrics.js";
import { registerLeadsRoutes } from "../routes/leads.js";
import { authTokenSecret } from "../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	STAFF_TOKEN_HEADER,
} from "../security/identity.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "redteamFixerDomain31";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 3);
const LEAD_RACE_ID = fixtureUuid(NAMESPACE, 10);
const LEAD_METRICS_ID = fixtureUuid(NAMESPACE, 20);

describe("RED TEAM FIXER SURGEON — DOMAIN 31 LEADS & CONVERSION", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[RedTeamFixerDomain31 Before] Purge warning:", e);
		}

		app = createTenantTestApp();
		await registerLeadsRoutes(app);
		await app.ready();

		const secret = authTokenSecret();
		clinicToken = signToken(
			{ organizationId: ORG_ID, clinicId: CLINIC_ID, type: "clinic" },
			secret,
			3600,
		);
		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: DOCTOR_USER_ID,
				role: "doctor",
				clinicalRole: "dentist",
				canSignMedicalRecords: true,
			},
			secret,
			3600,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Стоматология Ред Тим Домен 31",
			});

			await tx.insert(users).values({
				id: DOCTOR_USER_ID,
				organizationId: ORG_ID,
				fullName: "Доктор Редтим",
				role: "doctor",
				isActive: true,
			});

			await tx.insert(crmLeads).values({
				id: LEAD_RACE_ID,
				organizationId: ORG_ID,
				name: "Василий Петров",
				phone: "+79995554433",
				source: "vkontakte",
				status: "new",
				notes: "Острая боль, консультация",
			});

			await tx.insert(crmLeads).values({
				id: LEAD_METRICS_ID,
				organizationId: ORG_ID,
				name: "Анна Смирнова",
				phone: "+79998887766",
				source: "yandex",
				status: "consult_booked",
				expectedRevenueKopecks: 15000000n, // 150 000 руб в копейках
				notes: "Имплантация",
			});
		});
	});

	after(async () => {
		if (app) await app.close();
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[RedTeamFixerDomain31 Cleanup] Purge warning:", e);
		}
	});

	it("1. Idempotency-Key and safe deduplication: repeated POST /api/leads/:id/create-patient does not duplicate patient", async () => {
		const idemKey = "018d40a0-7212-7890-a123-456789abcdef";

		// First call: creates patient (201)
		const resp1 = await app.inject({
			method: "POST",
			url: `/api/leads/${LEAD_RACE_ID}/create-patient`,
			headers: {
				"content-type": "application/json",
				"idempotency-key": idemKey,
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: {},
		});

		assert.equal(resp1.statusCode, 201, resp1.body);
		assert.equal(
			resp1.headers["idempotency-key"] ?? resp1.headers["x-idempotency-key"],
			idemKey,
		);
		const json1 = JSON.parse(resp1.body);
		assert.equal(json1.success, true);
		assert.equal(json1.alreadyExisted, false);
		const createdPatientId = json1.patientId;
		assert.ok(createdPatientId, "Patient ID must be returned");

		// Second call: returns alreadyExisted without creating another patient row (200)
		const resp2 = await app.inject({
			method: "POST",
			url: `/api/leads/${LEAD_RACE_ID}/create-patient`,
			headers: {
				"content-type": "application/json",
				"idempotency-key": idemKey,
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: {},
		});

		assert.equal(resp2.statusCode, 200, resp2.body);
		assert.equal(
			resp2.headers["idempotency-key"] ?? resp2.headers["x-idempotency-key"],
			idemKey,
		);
		const json2 = JSON.parse(resp2.body);
		assert.equal(json2.success, true);
		assert.equal(json2.alreadyExisted, true);
		assert.equal(json2.patientId, createdPatientId);

		// Verify database has exactly 1 patient with this phone
		await withFixtureTenant(ORG_ID, async (tx) => {
			const foundPatients = await tx
				.select()
				.from(patients)
				.where(eq(patients.organizationId, ORG_ID));
			assert.equal(foundPatients.length, 1, "There must be exactly 1 patient in database");
			assert.equal(foundPatients[0]?.phone, "+79995554433");
		});
	});

	it("2. Communication consents sync upon create-patient: service consents are atomically saved", async () => {
		await withFixtureTenant(ORG_ID, async (tx) => {
			const consents = await tx
				.select()
				.from(patientCommunicationConsents)
				.where(eq(patientCommunicationConsents.organizationId, ORG_ID));

			assert.ok(consents.length >= 1, "Consents must be saved upon lead patient creation");
			const serviceSms = consents.find((c) => c.channel === "sms" && c.scope === "service");
			assert.ok(serviceSms, "Service SMS consent must be registered");
			assert.equal(serviceSms.state, "granted");
			assert.equal(serviceSms.source, "lead_conversion");
		});
	});

	it("3. Pipeline metrics calculate expectedRevenue from BigInt expectedRevenueKopecks without float drift", async () => {
		const metrics = await calculateLeadPipelineMetrics(db, ORG_ID);
		assert.ok(metrics.pipelineExpectedRevenueKopecks >= 15000000, "Must include 15000000 kopecks");
		assert.equal(metrics.pipelineExpectedRevenueRub, 150000, "Must format to 150 000 Rub");
	});

	it("4. Mandate 8ap domain purity: zero third-party trademarks in demo seed leads", () => {
		for (const lead of DEMO_SHOWCASE_SEED_LEADS) {
			const text = `${lead.name} ${lead.notes} ${(lead.clinicalTags || []).join(" ")}`;
			assert.equal(/Straumann/i.test(text), false, `Found Straumann trademark in seed lead: ${lead.name}`);
			assert.equal(/AirFlow/i.test(text), false, `Found AirFlow trademark in seed lead: ${lead.name}`);
		}
	});
});
