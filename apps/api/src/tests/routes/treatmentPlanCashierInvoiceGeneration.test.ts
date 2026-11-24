import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	communicationOutbox,
	invoiceItems,
	organizations,
	patientInvoices,
	patients,
	serviceCatalogItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import { registerInvoiceRoutes } from "../../routes/invoiceRoutes/index.js";
import { treatmentPlanRoutes } from "../../routes/treatmentPlanRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, purgeFixtureOrganizations } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "cashierGen";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const ADMIN_ID = fixtureUuid(FIXTURE, 2);
const PATIENT_ID = fixtureUuid(FIXTURE, 3);
const SERVICE_ID = fixtureUuid(FIXTURE, 4);

describe("Treatment Plans: Cashier Autonomy & PEP Invoice Generation", () => {
	let app: FastifyInstance;
	let adminHeaders: Record<string, string>;
	let databaseReady = false;

	before(async () => {
		try {
			await db.execute("SELECT 1;");
			databaseReady = true;
		} catch {
			return;
		}

		await db.transaction(async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника ДЕНТЕ Касса-ПЭП Интеграция",
			}).onConflictDoNothing();

			await tx.insert(users).values({
				id: ADMIN_ID,
				organizationId: ORG_ID,
				fullName: "Администратор Кассы",
				role: "administrator",
				isActive: true,
			}).onConflictDoNothing();

			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Семенов Петр Николаевич",
				phone: "+79998887766",
			}).onConflictDoNothing();

			await tx.insert(serviceCatalogItems).values({
				id: SERVICE_ID,
				organizationId: ORG_ID,
				code: "A16.07.051",
				title: "Комплексная профессиональная гигиена полости рта",
				priceRub: 5000,
				basePriceRub: 5000,
				order804nCode: "A16.07.051",
				category: "hygiene",
			}).onConflictDoNothing();
		});

		app = createTenantTestApp();
		await app.register(treatmentPlanRoutes);
		await app.register(registerInvoiceRoutes);
		await app.ready();

		const signed = signToken(
			{
				userId: ADMIN_ID,
				organizationId: ORG_ID,
				role: "administrator",
			},
			authTokenSecret(),
		);

		adminHeaders = {
			authorization: `Bearer ${signed}`,
			"x-dente-staff-token": signed,
			"x-dente-organization-id": ORG_ID,
		};
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	test("1. POST /api/treatment-plans/:id/sign-pep creates parent invoice in patient_invoices and items in invoice_items", async () => {
		if (!databaseReady) return;

		// 1. Создаем план с позицией
		const createRes = await app.inject({
			method: "POST",
			url: "/api/treatment-plans",
			headers: adminHeaders,
			payload: {
				patientId: PATIENT_ID,
				name: "План гигиены под ключ",
				totalPriceRub: 5000,
				stages: [
					{
						stageOrder: 1,
						stageName: "Этап гигиены",
						items: [
							{
								priceId: SERVICE_ID,
								name: "Комплексная профессиональная гигиена",
								quantity: 1,
								price: 5000,
								discount: 0,
							},
						],
					},
				],
			},
		});

		assert.equal(createRes.statusCode, 201);
		const planId = JSON.parse(createRes.body).treatmentPlan.id;

		// 2. Запрашиваем OTP-код
		const reqCodeRes = await app.inject({
			method: "POST",
			url: `/api/treatment-plans/${planId}/sign-pep`,
			headers: adminHeaders,
			payload: {
				action: "request_code",
				method: "sms",
				phone: "+79998887766",
			},
		});
		assert.equal(reqCodeRes.statusCode, 200);

		const [outboxSms] = await withTenantCtx(ORG_ID, async (tx) =>
			tx
				.select({ body: communicationOutbox.body })
				.from(communicationOutbox)
				.where(
					and(
						eq(communicationOutbox.organizationId, ORG_ID),
						eq(communicationOutbox.patientId, PATIENT_ID),
					),
				)
				.orderBy(desc(communicationOutbox.createdAt))
				.limit(1),
		);
		const otpMatch = outboxSms?.body.match(/DENTE:\s*(\d{6})/);
		assert.ok(otpMatch?.[1], "Generated OTP code must be queued in communication_outbox");

		// 3. Подтверждаем подписание через ПЭП
		const confirmRes = await app.inject({
			method: "POST",
			url: `/api/treatment-plans/${planId}/sign-pep`,
			headers: adminHeaders,
			payload: {
				action: "confirm",
				method: "sms",
				code: otpMatch[1],
				signerName: "Семенов Петр Николаевич",
			},
		});

		assert.equal(confirmRes.statusCode, 200, `Sign PEP failed: ${confirmRes.body}`);
		const confirmBody = JSON.parse(confirmRes.body);
		assert.equal(confirmBody.success, true);
		assert.equal(confirmBody.signed, true);
		assert.equal(confirmBody.treatmentPlan.status, "Approved");

		// Проверяем наличие созданного инвойса в ответе
		assert.ok(confirmBody.invoice || confirmBody.createdInvoice, "Invoice must be returned in response");
		const inv = confirmBody.invoice || confirmBody.createdInvoice;
		assert.equal(inv.treatmentPlanId, planId);
		assert.equal(inv.patientId, PATIENT_ID);
		assert.equal(inv.totalAmountRub, 5000);

		// Проверяем наличие в БД таблицы patient_invoices
		const [dbInvoice] = await db
			.select()
			.from(patientInvoices)
			.where(eq(patientInvoices.id, inv.id));
		assert.ok(dbInvoice, "Invoice record must exist in patient_invoices");
		assert.equal(dbInvoice.treatmentPlanId, planId);
		assert.equal(dbInvoice.status, "draft");

		// Проверяем наличие позиций в invoice_items
		const items = await db
			.select()
			.from(invoiceItems)
			.where(eq(invoiceItems.invoiceId, inv.id));
		assert.ok(items.length >= 1, "Invoice items must be persisted");
		assert.equal(items[0]?.name, "Комплексная профессиональная гигиена");
	});

	test("2. POST /api/invoices/generate-from-plan: Administrator/Cashier successfully generates invoice for approved plan without 400 BlockedArchivedServiceError", async () => {
		if (!databaseReady) return;

		// 1. Создаем утвержденный план лечения
		const createRes = await app.inject({
			method: "POST",
			url: "/api/treatment-plans",
			headers: adminHeaders,
			payload: {
				patientId: PATIENT_ID,
				name: "Утвержденный план для кассира",
				totalPriceRub: 5000,
			},
		});
		assert.equal(createRes.statusCode, 201);
		const planId = JSON.parse(createRes.body).treatmentPlan.id;

		// 2. Утверждаем план
		const approveRes = await app.inject({
			method: "POST",
			url: `/api/treatment-plans/${planId}/approve`,
			headers: adminHeaders,
			payload: { selectedTier: "optimum" },
		});
		assert.equal(approveRes.statusCode, 200);

		// 3. Администратор на кассе генерирует наряд/счет по утвержденному плану
		const genRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: adminHeaders,
			payload: {
				planId,
				patientId: PATIENT_ID,
				documentType: "invoice",
				items: [
					{
						itemId: "item-gen-01",
						code804n: "A16.07.051",
						nameRu: "Комплексная гигиена",
						planUnitPriceRub: 5000,
						quantity: 1,
						serviceId: SERVICE_ID,
					},
				],
			},
		});

		assert.equal(genRes.statusCode, 201, `Expected 201, got ${genRes.statusCode}: ${genRes.body}`);
		const genBody = JSON.parse(genRes.body);
		assert.equal(genBody.success, true);
		assert.ok(genBody.invoiceId);
		assert.ok(genBody.invoiceNumber);
	});

	test("3. PATCH /api/treatment-plans/:id persists curator fields in treatment_plans table", async () => {
		if (!databaseReady) return;

		const createRes = await app.inject({
			method: "POST",
			url: "/api/treatment-plans",
			headers: adminHeaders,
			payload: {
				patientId: PATIENT_ID,
				name: "План с куратором",
			},
		});
		assert.equal(createRes.statusCode, 201);
		const planId = JSON.parse(createRes.body).treatmentPlan.id;

		const patchRes = await app.inject({
			method: "PATCH",
			url: `/api/treatment-plans/${planId}`,
			headers: adminHeaders,
			payload: {
				curatorName: "Координатор Елена",
				curatorFunnelStage: "tier_selected",
				curatorNextContactDate: "2026-11-28",
				curatorNotes: "Пациент выбрал тариф Оптимум, ждет подтверждения графика",
			},
		});

		assert.equal(patchRes.statusCode, 200);
		const patchBody = JSON.parse(patchRes.body);
		assert.equal(patchBody.success, true);
		assert.equal(patchBody.plan.curatorName, "Координатор Елена");
		assert.equal(patchBody.plan.curatorFunnelStage, "tier_selected");
		assert.equal(patchBody.plan.curatorNextContactDate, "2026-11-28");
		assert.equal(patchBody.plan.curatorNotes, "Пациент выбрал тариф Оптимум, ждет подтверждения графика");

		// Проверяем прямое чтение из БД
		const [dbPlan] = await db
			.select()
			.from(treatmentPlans)
			.where(eq(treatmentPlans.id, planId));
		assert.ok(dbPlan);
		assert.equal(dbPlan.curatorName, "Координатор Елена");
		assert.equal(dbPlan.curatorFunnelStage, "tier_selected");
	});
});
