import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { denteTelegramChatLinkPublicSchema } from "@dental/shared";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { communicationCampaigns } from "../../db/communicationsSchema.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	clinics,
	communicationOutbox,
	communicationTemplates,
	organizations,
	patients,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import { clinicalBundlesRoutes } from "../../routes/clinicalBundlesRoutes.js";
import { registerEndoRoutes } from "../../routes/odontogram/endoRoutes.js";
import { patientParamsSchema } from "../../routes/orthodontics/types.js";
import registerTemplateRoutes from "../../routes/templates.js";
import { authTokenSecret } from "../../security/authSecret.js";
import {
	cancelCampaign,
	launchCampaign,
	previewCampaign,
} from "../../services/communications/campaigns.js";
import { resolveContextVariables } from "../../services/communications/templateEngine/templateContextResolver.js";
import { toDenteTelegramChatLinkPublic } from "../../telegram/chatLinks.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "wave15ClinicalFixer";
const ORG_A = fixtureUuid(FIXTURE, 1);
const ORG_B = fixtureUuid(FIXTURE, 2);
const CLINIC_A = fixtureUuid(FIXTURE, 3);
const DOCTOR_A = fixtureUuid(FIXTURE, 4);
const PATIENT_A1 = fixtureUuid(FIXTURE, 5);
const PATIENT_A2 = fixtureUuid(FIXTURE, 6);
const PLAN_A1 = fixtureUuid(FIXTURE, 7);
const TEMPLATE_B = fixtureUuid(FIXTURE, 8);
const TEMPLATE_A = fixtureUuid(FIXTURE, 9);
const CAMPAIGN_CROSS = fixtureUuid(FIXTURE, 10);
const CAMPAIGN_CANCEL = fixtureUuid(FIXTURE, 11);
const BOT_CONFIG_ID = fixtureUuid(FIXTURE, 12);
const CHAT_LINK_ID = fixtureUuid(FIXTURE, 13);

describe("Wave 15 Clinical Visits / Communications / Documents / Hygiene Fixer", () => {
	let app: FastifyInstance;
	let databaseReady = true;
	let doctorHeaders: Record<string, string>;

	before(async () => {
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		try {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORG_A, async () => {
			await db
				.insert(organizations)
				.values({ id: ORG_A, name: "Wave 15 Клиника А" })
				.onConflictDoNothing();
			await db
				.insert(clinics)
				.values({
					id: CLINIC_A,
					organizationId: ORG_A,
					name: "Стоматология Wave 15",
					phone: "+74951112233",
					address: "ул. Тестовая, д. 1",
				})
				.onConflictDoNothing();
			await db
				.insert(users)
				.values({
					id: DOCTOR_A,
					organizationId: ORG_A,
					email: "w15_doctor@example.com",
					passwordHash: "hash_w15",
					fullName: "Врач Волна Пятнадцать",
					role: "doctor",
				})
				.onConflictDoNothing();
			await db
				.insert(patients)
				.values([
					{
						id: PATIENT_A1,
						organizationId: ORG_A,
						fullName: "Иванов Пётр Сергеевич",
						phone: "+79990001122",
					},
					{
						id: PATIENT_A2,
						organizationId: ORG_A,
						fullName: "Петрова Анна Ивановна",
						phone: "+79990003344",
					},
				])
				.onConflictDoNothing();
			await db
				.insert(treatmentPlans)
				.values({
					id: PLAN_A1,
					organizationId: ORG_A,
					patientId: PATIENT_A1,
					doctorId: DOCTOR_A,
					name: "План пациента A1",
					totalPriceRub: "0",
				})
				.onConflictDoNothing();
			await db
				.insert(communicationTemplates)
				.values({
					id: TEMPLATE_A,
					organizationId: ORG_A,
					channel: "sms",
					intent: "general",
					audienceRole: "patient",
					title: "Напоминание A",
					body: "Здравствуйте, {patient}!",
					variablesJson: JSON.stringify(["patient"]),
					isActive: true,
				})
				.onConflictDoNothing();
		});

		await withFixtureTenant(ORG_B, async () => {
			await db
				.insert(organizations)
				.values({ id: ORG_B, name: "Wave 15 Клиника Б" })
				.onConflictDoNothing();
			await db
				.insert(communicationTemplates)
				.values({
					id: TEMPLATE_B,
					organizationId: ORG_B,
					channel: "sms",
					intent: "general",
					audienceRole: "patient",
					title: "Чужой шаблон Б",
					body: "Секрет Б {patient}",
					variablesJson: JSON.stringify(["patient"]),
					isActive: true,
				})
				.onConflictDoNothing();
		});

		await withFixtureTenant(ORG_A, async () => {
			await db
				.insert(communicationCampaigns)
				.values([
					{
						id: CAMPAIGN_CROSS,
						organizationId: ORG_A,
						title: "Кросс-шаблонная проверка",
						templateId: TEMPLATE_B,
						channel: "sms",
						scope: "marketing",
						status: "draft",
						audienceJson: JSON.stringify({ patientIds: [PATIENT_A1] }),
					},
					{
						id: CAMPAIGN_CANCEL,
						organizationId: ORG_A,
						title: "Атомарная отмена",
						templateId: TEMPLATE_A,
						channel: "sms",
						scope: "marketing",
						status: "running",
						audienceJson: JSON.stringify({ patientIds: [PATIENT_A1] }),
					},
				])
				.onConflictDoNothing();

			const now = new Date();
			await db
				.insert(communicationOutbox)
				.values([
					{
						organizationId: ORG_A,
						campaignId: CAMPAIGN_CANCEL,
						patientId: PATIENT_A1,
						channel: "sms",
						intent: "general",
						scope: "marketing",
						recipientAddress: "+79990001122",
						body: "Ожидает отправки",
						status: "queued",
						scheduledAt: now,
						nextAttemptAt: now,
						maxAttempts: 3,
						dedupeKey: `w15-queued-${CAMPAIGN_CANCEL}`,
					},
					{
						organizationId: ORG_A,
						campaignId: CAMPAIGN_CANCEL,
						patientId: PATIENT_A2,
						channel: "sms",
						intent: "general",
						scope: "marketing",
						recipientAddress: "+79990003344",
						body: "Уже отправлено",
						status: "sent",
						scheduledAt: now,
						nextAttemptAt: now,
						sentAt: now,
						maxAttempts: 3,
						dedupeKey: `w15-sent-${CAMPAIGN_CANCEL}`,
					},
				])
				.onConflictDoNothing();
		});

		app = createTenantTestApp();
		registerEndoRoutes(app);
		await app.register(clinicalBundlesRoutes);
		await app.register(registerTemplateRoutes);
		await app.ready();

		const token = signToken(
			{
				userId: DOCTOR_A,
				role: "doctor",
				organizationId: ORG_A,
			},
			authTokenSecret(),
			3600,
		);
		doctorHeaders = {
			authorization: `Bearer ${token}`,
			"x-tenant-id": ORG_A,
		};
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);
		}
	});

	test("[W15-CLIN-01] toDenteTelegramChatLinkPublic убирает chatTransportRef для strict public-схемы", () => {
		const nowIso = new Date().toISOString();
		const pub = toDenteTelegramChatLinkPublic({
			id: CHAT_LINK_ID,
			organizationId: ORG_A,
			clinicId: CLINIC_A,
			botConfigId: BOT_CONFIG_ID,
			subjectType: "staff",
			subjectId: DOCTOR_A,
			chatFingerprint: "sha256-fingerprint-test-01",
			chatTransportRef: "secret-transport-ref",
			chatIdLast4: "9876",
			status: "active",
			linkedAt: nowIso,
			revokedAt: null,
			lastUpdateAt: nowIso,
		});
		const parsed = denteTelegramChatLinkPublicSchema.parse(pub);
		assert.equal("chatTransportRef" in parsed, false);
		assert.equal(parsed.id, CHAT_LINK_ID);
		assert.equal(parsed.chatIdLast4, "9876");
	});

	test("[W15-CLIN-HYG-01] .strict() схемы templates и orthodontics отвергают лишние ключи", async (t) => {
		const orthoBad = patientParamsSchema.safeParse({
			patientId: PATIENT_A1,
			unexpectedKey: "leak",
		});
		assert.equal(orthoBad.success, false);

		if (!databaseReady) return t.skip("Database is not ready");

		const res = await app.inject({
			method: "POST",
			url: "/api/templates",
			headers: doctorHeaders,
			payload: {
				title: "Шаблон с лишним полем",
				unknownInjectionField: "bad",
			},
		});
		assert.equal(res.statusCode, 400);
	});

	test("[W15-CLIN-04] resolveContextVariables заполняет patient_phone при заданном clinic_phone и без фейковых URL", async (t) => {
		if (!databaseReady) return t.skip("Database is not ready");

		const vars = await resolveContextVariables(ORG_A, PATIENT_A1);
		assert.equal(vars.clinic_phone, "+74951112233");
		assert.equal(vars.patient_phone, "+79990001122");
		assert.equal(vars.portal_link, undefined);
		assert.equal(vars.sbp_payment_link, undefined);
	});

	test("[W15-CLIN-05] campaigns изолируют шаблоны по organizationId и атомарно отменяют рассылку", async (t) => {
		if (!databaseReady) return t.skip("Database is not ready");

		const preview = await previewCampaign(ORG_A, CAMPAIGN_CROSS);
		assert.ok(preview);
		assert.ok(preview.problems.some((p) => p.includes("Шаблон рассылки удалён")));

		const launched = await launchCampaign({
			organizationId: ORG_A,
			campaignId: CAMPAIGN_CROSS,
		});
		assert.equal(launched.ok, false);

		const cancelled = await cancelCampaign(ORG_A, CAMPAIGN_CANCEL);
		assert.equal(cancelled.ok, true);
		assert.equal(cancelled.cancelledMessages, 1);

		await withTenantCtx(ORG_A, async (tx) => {
			const [camp] = await tx
				.select({ status: communicationCampaigns.status })
				.from(communicationCampaigns)
				.where(eq(communicationCampaigns.id, CAMPAIGN_CANCEL));
			assert.equal(camp?.status, "cancelled");

			const outbox = await tx
				.select({
					dedupeKey: communicationOutbox.dedupeKey,
					status: communicationOutbox.status,
				})
				.from(communicationOutbox)
				.where(eq(communicationOutbox.campaignId, CAMPAIGN_CANCEL));
			const byKey = new Map(outbox.map((row) => [row.dedupeKey, row.status]));
			assert.equal(byKey.get(`w15-queued-${CAMPAIGN_CANCEL}`), "cancelled");
			assert.equal(byKey.get(`w15-sent-${CAMPAIGN_CANCEL}`), "sent");
		});
	});

	test("[W15-CLIN-06] endoRoutes отклоняют не-UUID patientId с HTTP 400 (GET/POST) и не падают 500", async (t) => {
		if (!databaseReady) return t.skip("Database is not ready");

		const getRes = await app.inject({
			method: "GET",
			url: "/api/patients/not-a-uuid/tooth-states/16/endo",
			headers: doctorHeaders,
		});
		assert.equal(getRes.statusCode, 400);

		const postRes = await app.inject({
			method: "POST",
			url: "/api/patients/not-a-uuid/tooth-states/16/endo",
			headers: doctorHeaders,
			payload: { status: "obturated", canals: [] },
		});
		assert.equal(postRes.statusCode, 400);
	});

	test("[W15-CLIN-HYG-03] clinicalBundlesRoutes отклоняет 409 план лечения чужого пациента", async (t) => {
		if (!databaseReady) return t.skip("Database is not ready");

		const res = await app.inject({
			method: "POST",
			url: "/api/clinical-bundles/apply",
			headers: doctorHeaders,
			payload: {
				bundleId: "hygiene_turnkey",
				patientId: PATIENT_A2,
				planId: PLAN_A1,
			},
		});
		assert.equal(res.statusCode, 409);
		assert.equal(res.json().error, "PatientPlanMismatch");
	});
});
