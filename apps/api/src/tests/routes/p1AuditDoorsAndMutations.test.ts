import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	createImplantInstallationSchema,
	generateSbpDynamicQrSchema,
} from "@dental/shared";
import {
	communicationTemplates,
	implantIsqMeasurements,
	organizations,
	patientImplantInstallations,
	patientInvoices,
	patients,
	payments,
	portalBudgetTokens,
	protocolTemplates,
	toothStateHistory,
	toothStates,
	treatmentItems,
	treatmentPlans,
	users,
	visits,
	warrantyCertificates,
} from "../../db/schema.js";
import { reconcileInvoiceBalanceInDb } from "../../routes/billingRoutes/invoiceBalanceReconciler.js";
import { registerClinicalAiRoutes } from "../../routes/ai/clinicalAiRoutes.js";
import { registerLogsDeleteRoute } from "../../routes/anesthesia/logsDeleteRoute.js";
import { registerClinicalImplantRoutes } from "../../routes/clinicalImplants/index.js";
import { registerTemplateAndSettingsRoutes } from "../../routes/outbox/templateAndSettingsRoutes.js";
import { publicBudgetRoutes } from "../../routes/publicBudgetRoutes.js";
import registerTemplateRoutes from "../../routes/templates.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { PortalBudgetService } from "../../services/portalBudgetService.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "p1AuditDoorsAndMutationsTest";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const DOCTOR_ID = fixtureUuid(FIXTURE, 10);
const MARKETER_ID = fixtureUuid(FIXTURE, 11);
const PATIENT_ID = fixtureUuid(FIXTURE, 20);
const VISIT_ID = fixtureUuid(FIXTURE, 30);
const PLAN_ID = fixtureUuid(FIXTURE, 40);
const INVOICE_ID = fixtureUuid(FIXTURE, 50);
const ITEM_1_ID = fixtureUuid(FIXTURE, 51);
const PAYMENT_ID = fixtureUuid(FIXTURE, 60);
const REFUND_PARTIAL_ID = fixtureUuid(FIXTURE, 61);
const REFUND_FULL_ID = fixtureUuid(FIXTURE, 62);

describe("P1 AuditDoors, Session Revocation, ACID & Contract Regression", () => {
	let app: FastifyInstance;
	let dbAvailable = true;
	const activeSessionId = randomUUID();
	const staleSessionId = randomUUID();
	let doctorValidSessionToken = "";
	let doctorStaleSessionToken = "";
	let doctorNullSessionToken = "";
	let marketerValidSessionToken = "";
	let budgetToken = "";

	async function cleanupFixtures() {
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.delete(portalBudgetTokens).where(eq(portalBudgetTokens.organizationId, ORG_ID));
			await tx.delete(implantIsqMeasurements).where(eq(implantIsqMeasurements.organizationId, ORG_ID));
			await tx.delete(warrantyCertificates).where(eq(warrantyCertificates.organizationId, ORG_ID));
			await tx.delete(toothStateHistory).where(eq(toothStateHistory.organizationId, ORG_ID));
			await tx.delete(toothStates).where(eq(toothStates.organizationId, ORG_ID));
			await tx.delete(patientImplantInstallations).where(eq(patientImplantInstallations.organizationId, ORG_ID));
			await tx.delete(payments).where(eq(payments.organizationId, ORG_ID));
			await tx.delete(treatmentItems).where(eq(treatmentItems.organizationId, ORG_ID));
			await tx.delete(patientInvoices).where(eq(patientInvoices.organizationId, ORG_ID));
			await tx.delete(treatmentPlans).where(eq(treatmentPlans.organizationId, ORG_ID));
			await tx.delete(visits).where(eq(visits.organizationId, ORG_ID));
			await tx.delete(protocolTemplates).where(eq(protocolTemplates.organizationId, ORG_ID));
			await tx.delete(communicationTemplates).where(eq(communicationTemplates.organizationId, ORG_ID));
			await tx.delete(patients).where(eq(patients.organizationId, ORG_ID));
			await tx.delete(users).where(eq(users.organizationId, ORG_ID));
		});
	}

	before(async () => {
		try {
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.execute(sql`SELECT 1`);
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				return;
			}
			throw err;
		}

		await cleanupFixtures();

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "P1 Red Team Test Clinic",
					email: "p1-redteam@test.local",
				})
				.onConflictDoNothing();

			await tx.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					email: `doctor-p1-${Date.now()}@test.local`,
					passwordHash: "hash",
					fullName: "Врач Тестовый П1",
					role: "doctor",
					isActive: true,
					currentSessionId: activeSessionId,
				},
				{
					id: MARKETER_ID,
					organizationId: ORG_ID,
					email: `marketer-p1-${Date.now()}@test.local`,
					passwordHash: "hash",
					fullName: "Маркетолог Тестовый П1",
					role: "marketer",
					isActive: true,
					currentSessionId: activeSessionId,
				},
			]);

			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Пациент Возвратов Имплантов",
				phone: "+7 (999) 111-22-33",
			});

			await tx.insert(visits).values({
				id: VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				status: "draft",
			});

			await tx.insert(treatmentPlans).values({
				id: PLAN_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				name: "План П1",
				title: "План П1",
				status: "Draft",
				totalPriceRub: "10000",
				totalPriceKopecks: 1000000n,
			});

			await tx.insert(patientInvoices).values({
				id: INVOICE_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				status: "paid",
				totalAmountRub: 1000,
				totalRub: "1000.00",
				totalPriceKopecks: 100000n,
			});

			await tx.insert(treatmentItems).values({
				id: ITEM_1_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				invoiceId: INVOICE_ID,
				title: "Пломбирование",
				quantity: "1",
				priceRub: 1000,
				unitPriceRub: 1000,
				priceKopecks: 100000n,
				unitPriceKopecks: 100000n,
				status: "completed",
			});

			await tx.insert(payments).values({
				id: PAYMENT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				amountRub: 1000,
				amountKopecks: 100000n,
				method: "cash",
				status: "paid",
			});
		});

		const gen = await PortalBudgetService.generateBudgetPortalToken({
			planId: PLAN_ID,
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			patientPhone: "+7 (999) 111-22-33",
			patientFirstName: "Пациент",
			clinicName: "P1 Red Team Test Clinic",
			items: [],
			totalPriceKopecks: 1000000,
		});
		budgetToken = gen.token;

		const secret = authTokenSecret();
		doctorValidSessionToken = signToken(
			{
				userId: DOCTOR_ID,
				organizationId: ORG_ID,
				role: "doctor",
				sessionId: activeSessionId,
				exp: Date.now() + 3600_000,
			},
			secret,
		);
		doctorStaleSessionToken = signToken(
			{
				userId: DOCTOR_ID,
				organizationId: ORG_ID,
				role: "doctor",
				sessionId: staleSessionId,
				exp: Date.now() + 3600_000,
			},
			secret,
		);
		doctorNullSessionToken = signToken(
			{
				userId: DOCTOR_ID,
				organizationId: ORG_ID,
				role: "doctor",
				exp: Date.now() + 3600_000,
			},
			secret,
		);
		marketerValidSessionToken = signToken(
			{
				userId: MARKETER_ID,
				organizationId: ORG_ID,
				role: "marketer",
				sessionId: activeSessionId,
				exp: Date.now() + 3600_000,
			},
			secret,
		);

		app = createTenantTestApp();
		await app.register(registerTemplateRoutes);
		await app.register(registerTemplateAndSettingsRoutes);
		await app.register(registerClinicalAiRoutes);
		await app.register(registerLogsDeleteRoute);
		await app.register(registerClinicalImplantRoutes);
		await app.register(publicBudgetRoutes);
		await app.ready();
	});

	after(async () => {
		if (dbAvailable) {
			await cleanupFixtures();
		}
		if (app) {
			await app.close();
		}
	});

	test("1. verifyActiveStaffSession rejects revoked/mismatched & null-session tokens when active session exists", async (t) => {
		if (!dbAvailable) return t.skip("DB unavailable");

		const prevReads = process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		const prevMutations = process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "0";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "0";

		try {
			const resValid = await app.inject({
				method: "GET",
				url: "/api/templates",
				headers: { "x-dente-staff-token": doctorValidSessionToken },
			});
			assert.equal(resValid.statusCode, 200, resValid.body);

			const resStale = await app.inject({
				method: "GET",
				url: "/api/templates",
				headers: { "x-dente-staff-token": doctorStaleSessionToken },
			});
			assert.equal(resStale.statusCode, 401, resStale.body);
			assert.equal(JSON.parse(resStale.body).error, "invalid_session");

			const resNullSession = await app.inject({
				method: "GET",
				url: "/api/templates",
				headers: { "x-dente-staff-token": doctorNullSessionToken },
			});
			assert.equal(resNullSession.statusCode, 401, resNullSession.body);
			assert.equal(JSON.parse(resNullSession.body).error, "invalid_session");
		} finally {
			if (prevReads === undefined) delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
			else process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = prevReads;
			if (prevMutations === undefined) delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
			else process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = prevMutations;
		}
	});

	test("2. GET /api/templates and GET /api/communications/templates are 100% read-only (0 DB inserts)", async (t) => {
		if (!dbAvailable) return t.skip("DB unavailable");

		const tplRes = await app.inject({
			method: "GET",
			url: "/api/templates",
			headers: { "x-dente-staff-token": doctorValidSessionToken },
		});
		assert.equal(tplRes.statusCode, 200, tplRes.body);
		const tplBody = JSON.parse(tplRes.body) as { templates: Array<{ isBuiltIn: boolean }> };
		assert.ok(tplBody.templates.length > 0);
		assert.equal(tplBody.templates[0]?.isBuiltIn, true);

		const commRes = await app.inject({
			method: "GET",
			url: "/api/communications/templates",
			headers: { "x-dente-staff-token": doctorValidSessionToken },
		});
		assert.equal(commRes.statusCode, 200, commRes.body);
		assert.deepEqual(JSON.parse(commRes.body).templates, []);

		const counts = await withFixtureTenant(ORG_ID, async (tx) => {
			const pRows = await tx
				.select({ id: protocolTemplates.id })
				.from(protocolTemplates)
				.where(eq(protocolTemplates.organizationId, ORG_ID));
			const cRows = await tx
				.select({ id: communicationTemplates.id })
				.from(communicationTemplates)
				.where(eq(communicationTemplates.organizationId, ORG_ID));
			return { pCount: pRows.length, cCount: cRows.length };
		});
		assert.equal(counts.pCount, 0);
		assert.equal(counts.cCount, 0);
	});

	test("3. publicBudgetRoutes GET is read-only; POST /view persists viewed status & viewedAt", async (t) => {
		if (!dbAvailable) return t.skip("DB unavailable");

		const getRes = await app.inject({
			method: "GET",
			url: `/api/v1/public/budgets/${budgetToken}`,
		});
		assert.equal(getRes.statusCode, 200, getRes.body);

		const [afterGet] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select({ status: portalBudgetTokens.status, viewedAt: portalBudgetTokens.viewedAt })
				.from(portalBudgetTokens)
				.where(eq(portalBudgetTokens.token, budgetToken)),
		);
		assert.equal(afterGet?.status, "sent");
		assert.equal(afterGet?.viewedAt, null);

		const viewRes = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/view`,
		});
		assert.equal(viewRes.statusCode, 200, viewRes.body);
		const viewJson = JSON.parse(viewRes.body) as { status: string; viewedAt: string | null };
		assert.equal(viewJson.status, "viewed");
		assert.ok(viewJson.viewedAt);

		const [afterView] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select({ status: portalBudgetTokens.status, viewedAt: portalBudgetTokens.viewedAt })
				.from(portalBudgetTokens)
				.where(eq(portalBudgetTokens.token, budgetToken)),
		);
		assert.equal(afterView?.status, "viewed");
		assert.ok(afterView?.viewedAt);
	});

	test("4. clinicalAiRoutes enforces orgId and clinical mutation/read guards", async () => {
		const resDictationUnauth = await app.inject({
			method: "POST",
			url: "/api/ai/parse-dictation",
			payload: { text: "Жалобы на боль в зубе 36", type: "visit" },
		});
		assert.ok([401, 403].includes(resDictationUnauth.statusCode), resDictationUnauth.body);

		const resDictationDoctor = await app.inject({
			method: "POST",
			url: "/api/ai/parse-dictation",
			headers: { "x-dente-staff-token": doctorValidSessionToken },
			payload: { text: "Жалобы на боль в зубе 36", type: "visit" },
		});
		assert.equal(resDictationDoctor.statusCode, 200, resDictationDoctor.body);

		const resPersonalizeUnauth = await app.inject({
			method: "POST",
			url: "/api/ai/treatment-plan-personalize",
			payload: { patientId: PATIENT_ID },
		});
		assert.ok([401, 403].includes(resPersonalizeUnauth.statusCode), resPersonalizeUnauth.body);
	});

	test("5. anesthesia/logs/:logId rejects invalid non-UUID logId via Zod schema", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: "/api/anesthesia/logs/not-a-uuid",
			headers: { "x-dente-staff-token": doctorValidSessionToken },
		});
		assert.equal(res.statusCode, 400, res.body);
		assert.equal(JSON.parse(res.body).error, "ValidationError");
	});

	test("6. refund reconciler leaves treatmentItems completed on partial refund and reverts to approved on 100% refund", async (t) => {
		if (!dbAvailable) return t.skip("DB unavailable");

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(payments).values({
				id: REFUND_PARTIAL_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				amountRub: -500,
				amountKopecks: -50000n,
				method: "cash",
				status: "refunded",
			});
			await reconcileInvoiceBalanceInDb(tx, ORG_ID, INVOICE_ID);

			const [itemAfterPartial] = await tx
				.select({ status: treatmentItems.status })
				.from(treatmentItems)
				.where(eq(treatmentItems.id, ITEM_1_ID));
			assert.equal(itemAfterPartial?.status, "completed");

			await tx.insert(payments).values({
				id: REFUND_FULL_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				amountRub: -500,
				amountKopecks: -50000n,
				method: "cash",
				status: "refunded",
			});
			await reconcileInvoiceBalanceInDb(tx, ORG_ID, INVOICE_ID);

			const [itemAfterFull] = await tx
				.select({ status: treatmentItems.status })
				.from(treatmentItems)
				.where(eq(treatmentItems.id, ITEM_1_ID));
			assert.equal(itemAfterFull?.status, "approved");
		});
	});

	test("7. implant installation route persists distinct per-tooth serial/lot/ISQ without synthetic -T suffixes", async (t) => {
		if (!dbAvailable) return t.skip("DB unavailable");

		const payload = {
			patientId: PATIENT_ID,
			visitId: VISIT_ID,
			implantBrand: "straumann",
			installations: [
				{
					toothNumberFdi: 36,
					implantDiameterMm: 4.1,
					implantLengthMm: 10.0,
					finalInsertionTorqueNcm: 35,
					lotNumber: "LOT-36A",
					serialNumber: "SN-0036-UNIQUE",
					baselineIsqMesiodistal: 72,
					boneDensityClass: "D2",
				},
				{
					toothNumberFdi: 46,
					implantDiameterMm: 4.8,
					implantLengthMm: 10.0,
					finalInsertionTorqueNcm: 32,
					lotNumber: "LOT-46B",
					serialNumber: "SN-0046-UNIQUE",
					baselineIsqMesiodistal: 68,
					boneDensityClass: "D3",
				},
			],
		};
		const schemaParsed = createImplantInstallationSchema.safeParse(payload);
		assert.equal(schemaParsed.success, true);

		const res = await app.inject({
			method: "POST",
			url: "/api/clinical/implants/installations/batch",
			headers: {
				"x-dente-clinic-token": doctorValidSessionToken,
				"x-dente-staff-token": doctorValidSessionToken,
			},
			payload,
		});
		assert.equal(res.statusCode, 201, res.body);

		const rows = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(patientImplantInstallations)
				.where(
					and(
						eq(patientImplantInstallations.organizationId, ORG_ID),
						eq(patientImplantInstallations.patientId, PATIENT_ID),
					),
				),
		);
		assert.equal(rows.length, 2);
		const t36 = rows.find((r) => r.toothNumberFdi === 36);
		const t46 = rows.find((r) => r.toothNumberFdi === 46);
		assert.equal(t36?.serialNumber, "SN-0036-UNIQUE");
		assert.equal(t36?.lotNumber, "LOT-36A");
		assert.equal(t36?.baselineIsq, 72);
		assert.equal(t46?.serialNumber, "SN-0046-UNIQUE");
		assert.equal(t46?.lotNumber, "LOT-46B");
		assert.equal(t46?.baselineIsq, 68);
	});

	test("8. generateSbpDynamicQrSchema accepts optional patientId while staying .strict()", () => {
		const valid = generateSbpDynamicQrSchema.safeParse({
			operationId: "OP-TEST-1",
			amountKopecks: 250000,
			patientId: PATIENT_ID,
		});
		assert.equal(valid.success, true);
		if (valid.success) {
			assert.equal(valid.data.patientId, PATIENT_ID);
		}

		const rejectedExtra = generateSbpDynamicQrSchema.safeParse({
			operationId: "OP-TEST-1",
			amountKopecks: 250000,
			patientId: PATIENT_ID,
			sneakyExtra: "hack",
		});
		assert.equal(rejectedExtra.success, false);
	});
});
