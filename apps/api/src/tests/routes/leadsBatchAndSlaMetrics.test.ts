/**
 * leadsBatchAndSlaMetrics.test.ts
 *
 * Comprehensive integration tests for:
 * 1. POST /api/leads/batch-stage: Transactional batch lead stage update and audit history recording
 * 2. PATCH /api/leads/:id/stage: Single lead stage update with stageEnteredAt and audit trail
 * 3. GET /api/leads/pipeline-metrics: Real conversion rates, average stage durations, SLA breach counter, urgent counter
 * 4. GET /api/leads/:id/stage-history: Full audit history retrieval per lead
 * 5. Telephony recording and transcription binding to crmLeads on incoming call and call ended
 * 6. Tenant isolation for batch operations and pipeline metrics
 */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	clinics,
	crmLeads,
	crmLeadStageHistory,
	organizations,
	users,
} from "../../db/schema.js";
import { registerLeadsRoutes } from "../../routes/leads.js";
import { telephonyRoutes } from "../../routes/telephony.js";
import { authTokenSecret } from "../../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	STAFF_TOKEN_HEADER,
} from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "leadsBatchAndSlaMetrics";

const ORG_1_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_1_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_1_ID = fixtureUuid(NAMESPACE, 3);

const ORG_2_ID = fixtureUuid(NAMESPACE, 4);
const CLINIC_2_ID = fixtureUuid(NAMESPACE, 5);
const DOCTOR_2_ID = fixtureUuid(NAMESPACE, 6);

const LEAD_1_ID = fixtureUuid(NAMESPACE, 10);
const LEAD_2_ID = fixtureUuid(NAMESPACE, 11);
const LEAD_3_ID = fixtureUuid(NAMESPACE, 12);
const LEAD_SLA_BREACH_ID = fixtureUuid(NAMESPACE, 13);
const LEAD_CONSULT_ID = fixtureUuid(NAMESPACE, 14);

test("LEADS BATCH STAGE, SLA METRICS & TELEPHONY AUDITING SUITE (ZERO MOCKS)", async (suite) => {
	let app: FastifyInstance;
	let clinicToken1: string;
	let staffToken1: string;

	let clinicToken2: string;
	let staffToken2: string;

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

		try {
			await purgeFixtureOrganizations([ORG_1_ID, ORG_2_ID]);
		} catch (e) {
			console.warn("[LeadsMetrics Before] Purge warning:", e);
		}

		app = createTenantTestApp();
		await registerLeadsRoutes(app);
		await app.register(telephonyRoutes);
		await app.ready();

		const secret = authTokenSecret();

		clinicToken1 = signToken(
			{
				organizationId: ORG_1_ID,
				clinicId: CLINIC_1_ID,
				type: "clinic",
			},
			secret,
			3600,
		);

		staffToken1 = signToken(
			{
				organizationId: ORG_1_ID,
				userId: DOCTOR_1_ID,
				role: "doctor",
				clinicalRole: "dentist",
				canSignMedicalRecords: true,
			},
			secret,
			3600,
		);

		clinicToken2 = signToken(
			{
				organizationId: ORG_2_ID,
				clinicId: CLINIC_2_ID,
				type: "clinic",
			},
			secret,
			3600,
		);

		staffToken2 = signToken(
			{
				organizationId: ORG_2_ID,
				userId: DOCTOR_2_ID,
				role: "doctor",
				clinicalRole: "dentist",
				canSignMedicalRecords: true,
			},
			secret,
			3600,
		);

		const now = new Date();
		const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

		await withFixtureTenant(ORG_1_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_1_ID,
				name: "Клиника ДЕНТЕ Батч & SLA",
			});

			await tx.insert(clinics).values({
				id: CLINIC_1_ID,
				organizationId: ORG_1_ID,
				name: "Главный корпус ДЕНТЕ",
				phone: "+74951112233",
			});

			await tx.insert(users).values({
				id: DOCTOR_1_ID,
				organizationId: ORG_1_ID,
				fullName: "Др. Барабаш С.В.",
				role: "doctor",
				isActive: true,
			});

			// Lead 1: New fresh
			await tx.insert(crmLeads).values({
				id: LEAD_1_ID,
				organizationId: ORG_1_ID,
				name: "Пациент Тест 1",
				phone: "+79990001111",
				source: "yandex_direct",
				status: "new",
				priority: "normal",
				expectedRevenue: "25000.00",
				stageEnteredAt: now,
			});

			// Lead 2: New fresh
			await tx.insert(crmLeads).values({
				id: LEAD_2_ID,
				organizationId: ORG_1_ID,
				name: "Пациент Тест 2",
				phone: "+79990002222",
				source: "gis_2",
				status: "new",
				priority: "normal",
				expectedRevenue: "40000.00",
				stageEnteredAt: now,
			});

			// Lead 3: New fresh
			await tx.insert(crmLeads).values({
				id: LEAD_3_ID,
				organizationId: ORG_1_ID,
				name: "Пациент Тест 3",
				phone: "+79990003333",
				source: "prodoctorov",
				status: "new",
				priority: "normal",
				expectedRevenue: "15000.00",
				stageEnteredAt: now,
			});

			// Lead SLA Breach: Created 2 hours ago in 'new' stage
			await tx.insert(crmLeads).values({
				id: LEAD_SLA_BREACH_ID,
				organizationId: ORG_1_ID,
				name: "Пациент Острая Боль (SLA Просрочен)",
				phone: "+79990004444",
				source: "site_seo",
				status: "new",
				priority: "urgent",
				clinicalTags: ["acute_pain", "implants"],
				expectedRevenue: "120000.00",
				stageEnteredAt: twoHoursAgo,
				createdAt: twoHoursAgo,
			});

			// Lead Consult Booked: already advanced
			await tx.insert(crmLeads).values({
				id: LEAD_CONSULT_ID,
				organizationId: ORG_1_ID,
				name: "Пациент Консультация",
				phone: "+79990005555",
				source: "yandex_direct",
				status: "consult_booked",
				priority: "high",
				expectedRevenue: "50000.00",
				stageEnteredAt: now,
			});
		});

		// Org 2 for tenant isolation verification
		await withFixtureTenant(ORG_2_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_2_ID,
				name: "Клиника Другой Тенант",
			});

			await tx.insert(clinics).values({
				id: CLINIC_2_ID,
				organizationId: ORG_2_ID,
				name: "Филиал Изоляция",
				phone: "+74959998877",
			});

			await tx.insert(users).values({
				id: DOCTOR_2_ID,
				organizationId: ORG_2_ID,
				fullName: "Др. Изолятов И.И.",
				role: "doctor",
				isActive: true,
			});
		});
	});

	after(async () => {
		if (app) await app.close();
		try {
			await purgeFixtureOrganizations([ORG_1_ID, ORG_2_ID]);
		} catch (e) {
			console.warn("[LeadsMetrics Cleanup] Purge warning:", e);
		}
	});

	await suite.test(
		"1. POST /api/leads/batch-stage: Transactional batch update transitions leads and writes audit history",
		async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/leads/batch-stage",
				headers: {
					"content-type": "application/json",
					[CLINIC_TOKEN_HEADER]: clinicToken1,
					[STAFF_TOKEN_HEADER]: staffToken1,
				},
				payload: {
					leadIds: [LEAD_1_ID, LEAD_2_ID],
					toStage: "contacted",
					reason: "Первичный обзвон оператором",
					assignedDoctorId: DOCTOR_1_ID,
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.success, true);
			assert.strictEqual(body.updatedCount, 2);
			assert.strictEqual(body.leads.length, 2);

			// Verify in DB
			await withFixtureTenant(ORG_1_ID, async (tx) => {
				const leads = await tx
					.select()
					.from(crmLeads)
					.where(eq(crmLeads.organizationId, ORG_1_ID));

				const lead1 = leads.find((l) => l.id === LEAD_1_ID);
				const lead2 = leads.find((l) => l.id === LEAD_2_ID);

				assert.ok(lead1);
				assert.strictEqual(lead1.status, "contacted");
				assert.strictEqual(lead1.assignedDoctorId, DOCTOR_1_ID);
				assert.ok(lead1.notes?.includes("Первичный обзвон оператором"));

				assert.ok(lead2);
				assert.strictEqual(lead2.status, "contacted");
				assert.strictEqual(lead2.assignedDoctorId, DOCTOR_1_ID);

				// Verify audit history in crmLeadStageHistory
				const history = await tx
					.select()
					.from(crmLeadStageHistory)
					.where(eq(crmLeadStageHistory.organizationId, ORG_1_ID));

				const history1 = history.filter((h) => h.leadId === LEAD_1_ID);
				const history2 = history.filter((h) => h.leadId === LEAD_2_ID);

				assert.ok(history1.length >= 1);
				assert.strictEqual(history1[0]?.fromStage, "new");
				assert.strictEqual(history1[0]?.toStage, "contacted");
				assert.strictEqual(history1[0]?.changedByUserId, DOCTOR_1_ID);

				assert.ok(history2.length >= 1);
				assert.strictEqual(history2[0]?.fromStage, "new");
				assert.strictEqual(history2[0]?.toStage, "contacted");
			});
		},
	);

	await suite.test(
		"2. PATCH /api/leads/:id/stage: Single stage transition resets stageEnteredAt, sets tags and records audit",
		async () => {
			const res = await app.inject({
				method: "PATCH",
				url: `/api/leads/${LEAD_3_ID}/stage`,
				headers: {
					"content-type": "application/json",
					[CLINIC_TOKEN_HEADER]: clinicToken1,
					[STAFF_TOKEN_HEADER]: staffToken1,
				},
				payload: {
					toStage: "consult_booked",
					priority: "urgent",
					clinicalTags: ["acute_pain", "all_on_4"],
					notes: "Записан на очный осмотр с КТ",
					assignedDoctorId: DOCTOR_1_ID,
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const updated = JSON.parse(res.body);
			assert.strictEqual(updated.status, "consult_booked");
			assert.strictEqual(updated.priority, "urgent");
			assert.deepStrictEqual(updated.clinicalTags, ["acute_pain", "all_on_4"]);
			assert.strictEqual(updated.assignedDoctorId, DOCTOR_1_ID);
			assert.ok(updated.stageEnteredAt);

			// Test GET /api/leads/:id/stage-history
			const historyRes = await app.inject({
				method: "GET",
				url: `/api/leads/${LEAD_3_ID}/stage-history`,
				headers: {
					[CLINIC_TOKEN_HEADER]: clinicToken1,
					[STAFF_TOKEN_HEADER]: staffToken1,
				},
			});

			assert.strictEqual(historyRes.statusCode, 200);
			const historyList = JSON.parse(historyRes.body);
			assert.ok(Array.isArray(historyList));
			assert.ok(historyList.length >= 1);
			assert.strictEqual(historyList[0].fromStage, "new");
			assert.strictEqual(historyList[0].toStage, "consult_booked");
			assert.strictEqual(historyList[0].changedByUserId, DOCTOR_1_ID);
		},
	);

	await suite.test(
		"3. GET /api/leads/pipeline-metrics: Computes accurate conversion rates, SLA breach counter, and revenue",
		async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/leads/pipeline-metrics",
				headers: {
					[CLINIC_TOKEN_HEADER]: clinicToken1,
					[STAFF_TOKEN_HEADER]: staffToken1,
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const metrics = JSON.parse(res.body);

			assert.strictEqual(metrics.totalLeads, 5);
			assert.ok(typeof metrics.stageCounts === "object");
			// LEAD_1 and LEAD_2 are 'contacted', LEAD_3 is 'consult_booked', LEAD_SLA_BREACH is 'new', LEAD_CONSULT is 'consult_booked'
			assert.strictEqual(metrics.stageCounts.contacted, 2);
			assert.strictEqual(metrics.stageCounts.new, 1);
			assert.strictEqual(metrics.stageCounts.consult_booked, 2);

			// SLA breached count: LEAD_SLA_BREACH was entered 2h ago (>60m)
			assert.ok(metrics.slaBreachedCount >= 1);

			// Urgent count: LEAD_SLA_BREACH and LEAD_3 are urgent
			assert.ok(metrics.urgentCount >= 2);

			// Revenue: 25000 + 40000 + 15000 + 120000 + 50000 = 250000
			assert.strictEqual(metrics.pipelineExpectedRevenueRub, 250000);

			// Stage conversions
			assert.ok(metrics.stageConversionRates);
			assert.ok(metrics.stageConversionRates.new_to_contacted > 0);
			assert.ok(typeof metrics.averageDurationSecondsByStage === "object");
		},
	);

	await suite.test(
		"4. Telephony Webhook Binding: Incoming PBX call attaches audioRecordUrl and transcription to CRM lead",
		async () => {
			const callerPhone = "+79998887766";
			const recordingUrl = "https://storage.yandexcloud.net/dente-records/call_urgent_01.mp3";
			const transcription = "Здравствуйте, у меня выпала пломба и сильно ноет зуб при накусывании";

			const webhookRes = await app.inject({
				method: "POST",
				url: `/${ORG_1_ID}/webhook`,
				headers: {
					"content-type": "application/json",
					"x-dente-webhook-secret":
						process.env.TELEPHONY_WEBHOOK_SECRET?.trim() ||
						process.env.DENTE_WEBHOOK_SECRET?.trim() ||
						"dev-local-webhook-secret-change-me",
				},
				payload: {
					event: "ringing",
					from: callerPhone,
					to: "+74951112233",
					call_id: "mango_call_9901",
					recording_url: recordingUrl,
					transcription_snippet: transcription,
				},
			});

			assert.strictEqual(webhookRes.statusCode, 200);

			// Verify created lead has audio and transcription attached
			await withFixtureTenant(ORG_1_ID, async (tx) => {
				const leads = await tx
					.select()
					.from(crmLeads)
					.where(
						eq(crmLeads.organizationId, ORG_1_ID),
					);

				const callLead = leads.find((l) => l.phone === callerPhone);
				assert.ok(callLead, "Lead must be created from incoming telephony call");
				assert.strictEqual(callLead.audioRecordUrl, recordingUrl);
				assert.strictEqual(callLead.transcriptionSnippet, transcription);
				assert.strictEqual(callLead.status, "new");
				assert.ok(callLead.stageEnteredAt);
			});
		},
	);

	await suite.test(
		"5. Tenant Isolation: Another organization cannot batch update or access leads from Org 1",
		async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/leads/batch-stage",
				headers: {
					"content-type": "application/json",
					[CLINIC_TOKEN_HEADER]: clinicToken2,
					[STAFF_TOKEN_HEADER]: staffToken2,
				},
				payload: {
					leadIds: [LEAD_1_ID],
					toStage: "trash",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.updatedCount, 0, "Org 2 cannot update leads belonging to Org 1");

			// Confirm Lead 1 remains 'contacted' in Org 1
			await withFixtureTenant(ORG_1_ID, async (tx) => {
				const [lead1] = await tx
					.select()
					.from(crmLeads)
					.where(eq(crmLeads.id, LEAD_1_ID));
				assert.strictEqual(lead1?.status, "contacted");
			});
		},
	);
});
