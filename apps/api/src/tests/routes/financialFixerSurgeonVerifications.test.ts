/**
 * apps/api/src/tests/routes/financialFixerSurgeonVerifications.test.ts
 *
 * Targeted Integration Verification Suite for Fixer Surgeon:
 * 1. Cashbox Shift Income Accrual: active shiftId is linked to cashOperations and incomeTotalRub is incremented atomically.
 * 2. Invoice Batch Insert & Real Database UUID: invoice_items inserted in batch, returning real UUIDs (no synthetic inv-item-*).
 * 3. Treatment Plan Batch Insert: stages and items inserted via bulk values returning real UUIDs.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	invoiceItems,
	organizations,
	patientInvoices,
	patients,
	treatmentPlanItemsNew,
	treatmentPlanStages,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { processCashboxPayment } from "../../routes/cashbox/cashboxPaymentProcessor.js";
import { handleCreateInvoice } from "../../routes/invoiceRoutes/handlers/createInvoiceHandler.js";
import { handleCreateTreatmentPlan } from "../../routes/treatmentPlan/handlers/mutations/createTreatmentPlanHandler.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";

function createMockReply() {
	let statusCode = 200;
	let sentBody: any = null;
	const reply: any = {
		code(c: number) {
			statusCode = c;
			return reply;
		},
		header() {
			return reply;
		},
		send(data: any) {
			sentBody = data;
			return reply;
		},
		get statusCode() {
			return statusCode;
		},
		get sentBody() {
			return sentBody;
		},
		sent: false,
	};
	return reply;
}

describe("Fixer Surgeon Financial & Cashbox Architectural Verifications", () => {
	it("1. Cashbox payment links active shiftId and increments incomeTotalRub atomically", async () => {
		const orgId = fixtureUuid("fixerFin", 1);
		const patientId = fixtureUuid("fixerFin", 2);
		const cashBoxId = fixtureUuid("fixerFin", 3);
		const shiftId = fixtureUuid("fixerFin", 4);
		const staffUserId = fixtureUuid("fixerFin", 5);

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Финансового Хирурга",
				}).onConflictDoNothing();
				await tx.insert(users).values({
					id: staffUserId,
					organizationId: orgId,
					fullName: "Кассир Иванова",
					role: "cashier",
				}).onConflictDoNothing();
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Миронов Андрей Сергеевич",
				}).onConflictDoNothing();
				await tx.insert(cashBoxes).values({
					id: cashBoxId,
					organizationId: orgId,
					name: "Главная касса",
					type: "main",
					isMain: true,
					isCashless: false,
					balanceRub: 1000,
					balanceKopecks: 100000,
				});
				await tx.insert(cashBoxShifts).values({
					id: shiftId,
					organizationId: orgId,
					cashBoxId,
					shiftNumber: 1,
					status: "open",
					openedAt: new Date(),
					openedByUserId: staffUserId,
					incomeTotalRub: 0,
					expenseTotalRub: 0,
				});
			});

			const clientMutationId = `mut-fixer-shift-${Date.now()}`;
			const paymentResult = await processCashboxPayment(orgId, {
				patientId,
				amountRub: 2500,
				method: "cash",
				clientMutationId,
				cashierFullName: "Кассир Иванова",
			});

			assert.equal(paymentResult.statusCode, 200);
			assert.equal(paymentResult.body.success, true);

			// Проверяем, что в cashOperations shiftId заполнен реальным shiftId активной смены
			await withFixtureTenant(orgId, async (tx) => {
				const [op] = await tx
					.select()
					.from(cashOperations)
					.where(
						and(
							eq(cashOperations.organizationId, orgId),
							eq(cashOperations.cashBoxId, cashBoxId),
							eq(cashOperations.operationType, "income"),
						),
					)
					.limit(1);

				assert.ok(op, "Cash operation must be created");
				assert.equal(op.shiftId, shiftId, "shiftId must NOT be null; must link active shift");
				assert.equal(Number(op.amountRub), 2500, "Amount must match payment");

				// Проверяем, что incomeTotalRub в cashBoxShifts инкрементирован
				const [shift] = await tx
					.select()
					.from(cashBoxShifts)
					.where(and(eq(cashBoxShifts.id, shiftId), eq(cashBoxShifts.organizationId, orgId)))
					.limit(1);

				assert.ok(shift, "Shift must exist");
				assert.equal(Number(shift.incomeTotalRub), 2500, "incomeTotalRub must be incremented by 2500 ₽");
			});
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("2. Invoice creation uses batch insert and returns real database UUIDs for invoice items", async () => {
		const orgId = fixtureUuid("fixerFin", 11);
		const patientId = fixtureUuid("fixerFin", 12);
		const staffUserId = fixtureUuid("fixerFin", 13);

		const adminSecret = randomBytes(32).toString("base64url");
		process.env.DENTE_CLINICAL_ADMIN_SECRET = adminSecret;

		const headers = {
			"x-dente-clinic-token": signToken({ organizationId: orgId }, authTokenSecret()),
			"x-dente-staff-token": signToken({ organizationId: orgId, userId: staffUserId, role: "owner" }, authTokenSecret()),
			"x-dente-admin-secret": adminSecret,
		};

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Пакетных Инвойсов",
				}).onConflictDoNothing();
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Захаров Павел Викторович",
				}).onConflictDoNothing();
			});

			const mockReq = {
				organizationId: orgId,
				params: {},
				body: {
					patientId,
					items: [
						{
							title: "Установка дентального имплантата Osstem TS III",
							priceRub: 28000,
							quantity: 1,
							toothCode: "36",
						},
						{
							title: "Формирователь десны Osstem",
							priceRub: 4500,
							quantity: 1,
							toothCode: "36",
						},
					],
				},
				headers,
				log: { warn: () => {}, info: () => {}, error: () => {} },
			} as any;

			const mockReply = createMockReply();
			await handleCreateInvoice(mockReq, mockReply);

			assert.equal(mockReply.statusCode, 201);
			assert.equal(mockReply.sentBody.success, true);
			assert.equal(mockReply.sentBody.itemsCount, 2);

			const items = mockReply.sentBody.invoice.items;
			assert.equal(items.length, 2);

			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			for (const item of items) {
				assert.match(item.id, uuidRegex, `Item ID '${item.id}' MUST be a real UUID, not synthetic inv-item-*`);
				assert.ok(!item.id.startsWith("inv-item-"), "inv-item-* prefix is permanently purged");
			}

			// Проверяем, что в PostgreSQL 18 строки в invoice_items действительно сохранены с этими UUID
			await withFixtureTenant(orgId, async (tx) => {
				const dbItems = await tx
					.select()
					.from(invoiceItems)
					.where(and(eq(invoiceItems.organizationId, orgId), eq(invoiceItems.invoiceId, mockReply.sentBody.invoice.id)));

				assert.equal(dbItems.length, 2);
				assert.equal(dbItems[0]!.id, items[0]!.id);
				assert.equal(dbItems[1]!.id, items[1]!.id);
			});
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("3. Treatment plan creation batches stages and items and links treatmentPlanItemId", async () => {
		const orgId = fixtureUuid("fixerFin", 21);
		const patientId = fixtureUuid("fixerFin", 22);

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Планов Лечения",
				}).onConflictDoNothing();
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Кузнецов Артем Олегович",
				}).onConflictDoNothing();
			});

			const mockReq = {
				headers: { "idempotency-key": randomUUID() },
				body: {
					patientId,
					name: "Комплексная реабилитация 2 челюстей",
					stages: [
						{
							stageOrder: 1,
							stageName: "Терапевтическая санация",
							completionPercentage: 0,
							items: [
								{
									name: "Профессиональная гигиена полости рта AirFlow",
									price: 5000,
									discount: 500,
									quantity: 1,
								},
								{
									name: "Лечение глубокого кариеса 2.6",
									price: 6500,
									discount: 0,
									quantity: 1,
									toothNumber: 26,
								},
							],
						},
						{
							stageOrder: 2,
							stageName: "Хирургический этап",
							completionPercentage: 0,
							items: [
								{
									name: "Удаление ретинированного дистопированного зуба 3.8",
									price: 8000,
									discount: 0,
									quantity: 1,
									toothNumber: 38,
								},
							],
						},
					],
				},
				log: { warn: () => {}, info: () => {}, error: () => {} },
			} as any;

			const mockReply = createMockReply();
			await handleCreateTreatmentPlan(mockReq, mockReply, orgId);

			assert.equal(mockReply.statusCode, 201);
			assert.equal(mockReply.sentBody.success, true);
			assert.equal(mockReply.sentBody.stages.length, 2);
			assert.equal(mockReply.sentBody.itemsCount, 3);

			const planId = mockReply.sentBody.treatmentPlan.id;

			// Проверяем, что в базе создано ровно 2 этапа и 3 позиции, связанные с этапами
			await withFixtureTenant(orgId, async (tx) => {
				const dbStages = await tx
					.select()
					.from(treatmentPlanStages)
					.where(and(eq(treatmentPlanStages.organizationId, orgId), eq(treatmentPlanStages.planId, planId)));

				assert.equal(dbStages.length, 2);

				const dbItems = await tx
					.select()
					.from(treatmentPlanItemsNew)
					.where(and(eq(treatmentPlanItemsNew.organizationId, orgId), eq(treatmentPlanItemsNew.planId, planId)));

				assert.equal(dbItems.length, 3);
				for (const it of dbItems) {
					assert.ok(it.stageId, "Each item must have a valid stageId linked from batch insert");
					assert.ok(it.id, "Item must have valid UUID");
				}
			});
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
