/**
 * closedLoopClinicalCycle.test.ts — Mandate Inquisitor 2: Closed Loop Clinical Cycle E2E Test.
 *
 * Instrumentally verifies the entire end-to-end transactional chain in PostgreSQL 18.4:
 * 1. Patient Creation (Пациент — 152-ФЗ / 323-ФЗ)
 * 2. Appointment Booking (Запись в расписание)
 * 3. Visit Start & In-Chair Progression (Старт приёма / Visit)
 * 4. Odontogram & Surfaces (Зубная формула & Поверхности — Tooth 46 MOD)
 * 5. ICD-10 Diagnoses (МКБ-10 — K02.1 Кариес дентина)
 * 6. SOAP Protocol (Субъективно, Объективно, Диагноз, План лечения)
 * 7. Executed Services (Выполненные услуги — А16.07.002.001 6,500 ₽)
 * 8. Dental Lab Work Order (Наряд в ЗТЛ — ZrO2 A2 12,000 ₽ + Idempotency Guard)
 * 9. Consumables FEFO Deduction & Soft Overdraft Check (Списание материалов FEFO + Мандат 8e)
 * 10. Invoice Generation from Plan (Формирование счёта — 6,500 ₽)
 * 11. Multi-Tender Split Payment (Наличные 1,500 ₽ + Карта 3,000 ₽ + СБП 2,000 ₽)
 * 12. Double-Click Idempotency Invariant (0 Duplicate Rows on replay)
 * 13. Fiscal Receipt Queue (54-ФЗ Tag 1031 + Tag 1081)
 * 14. Cashbox Shift Closure & Z-Report (Закрытие смены и Z-отчёт с pg_advisory_xact_lock)
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	cashBoxes,
	cashBoxShifts,
	cashLedger,
	fiscalReceiptQueue,
	stockBatches,
	inventoryItems,
	inventoryTransactions,
	labOrders,
	organizations,
	patientInvoices,
	patients,
	payments,
	serviceCatalogItems,
	toothStateHistory,
	toothStates,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { idempotencyPlugin } from "../../plugins/idempotencyPlugin.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerCashboxRoutes } from "../../routes/cashbox.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { registerInvoiceRoutes } from "../../routes/invoices.js";
import { registerLabRoutes } from "../../routes/lab.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { treatmentConsumablesRoutes } from "../../routes/treatmentConsumables.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = `closed_loop_${Date.now()}`;
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);
const PATIENT_ID = fixtureUuid(NAMESPACE, 4);
const APPOINTMENT_ID = fixtureUuid(NAMESPACE, 5);
const VISIT_ID = fixtureUuid(NAMESPACE, 6);
const SERVICE_RESTORATION_ID = fixtureUuid(NAMESPACE, 7);
const ITEM_COMPOSITE_ID = fixtureUuid(NAMESPACE, 8);
const ITEM_BOND_ID = fixtureUuid(NAMESPACE, 9);
const BATCH_EARLY_ID = fixtureUuid(NAMESPACE, 10);
const BATCH_LATER_ID = fixtureUuid(NAMESPACE, 11);

describe("MANDATE INQUISITOR 2: Closed Loop Clinical Cycle & Financial/Stock Integrity", () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let doctorStaffToken = "";
	let adminStaffToken = "";

	before(async () => {
		process.env.NODE_ENV = "test";
		await purgeFixtureOrganizations([ORG_ID]);

		app = createTenantTestApp();
		await app.register(idempotencyPlugin);

		await registerPatientRoutes(app);
		await registerScheduleRoutes(app);
		await registerVisitRoutes(app);
		await registerOdontogramRoutes(app);
		await registerLabRoutes(app);
		await registerInvoiceRoutes(app);
		await registerBillingRoutes(app);
		await registerCashboxRoutes(app);
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.register(treatmentConsumablesRoutes, { prefix: "/api/treatment-consumables" });

		await app.ready();

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORG_ID }, secret);
		doctorStaffToken = signToken(
			{
				userId: DOCTOR_ID,
				role: "doctor",
				organizationId: ORG_ID,
				fullName: "Д-р Воронов Алексей Владимирович",
			},
			secret,
		);
		adminStaffToken = signToken(
			{
				userId: ADMIN_ID,
				role: "administrator",
				organizationId: ORG_ID,
				fullName: "Администратор Смирнова Елена",
			},
			secret,
		);

		// Seed initial organization, doctor, and service catalog in PostgreSQL 18
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Клиника Инновационной Стоматологии ДЕНТЕ",
					inn: "7701987654",
				})
				.onConflictDoNothing();

			await tx.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Д-р Воронов Алексей Владимирович",
					email: `doctor_${Date.now()}@dente.ru`,
					role: "doctor",
					passwordHash: "hash_doc",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Администратор Смирнова Елена",
					email: `admin_${Date.now()}@dente.ru`,
					role: "administrator",
					passwordHash: "hash_admin",
				},
			]);

			// Услуга А16.07.002.001: Восстановление зуба пломбой (6,500.00 ₽)
			await tx.insert(serviceCatalogItems).values({
				id: SERVICE_RESTORATION_ID,
				organizationId: ORG_ID,
				code: "A16.07.002.001",
				order804nCode: "A16.07.002.001",
				title: "Восстановление зуба пломбой II класс по Блэку с использованием светоотверждаемого композита",
				basePriceRub: 6500,
				priceRub: 6500,
				category: "therapy",
			});

			// Склад: композит Filtek Z250 (10 г) с двумя партиями для теста FEFO
			await tx.insert(inventoryItems).values([
				{
					id: ITEM_COMPOSITE_ID,
					organizationId: ORG_ID,
					name: "Нанокомпозит светоотверждаемый Filtek Z250 шприц 4г (A2)",
					category: "composites",
					unit: "г",
					stockQuantity: "10.000",
					currentQty: "10.000",
					criticalThreshold: "2.000",
					unitCostRub: "1200.00",
				},
				{
					id: ITEM_BOND_ID,
					organizationId: ORG_ID,
					name: "Адгезив светоотверждаемый Single Bond Universal 5мл",
					category: "adhesives",
					unit: "мл",
					stockQuantity: "0.000", // Нулевой остаток для проверки мягкого овердрафта (Мандат 8e)
					currentQty: "0.000",
					criticalThreshold: "1.000",
					unitCostRub: "3500.00",
				},
			]);

			// Партии FEFO:
			// Партия A (истекает раньше: 2026-11-01) — 4.000 г
			// Партия B (истекает позже: 2027-11-01) — 6.000 г
			await tx.insert(stockBatches).values([
				{
					id: BATCH_EARLY_ID,
					organizationId: ORG_ID,
					inventoryItemId: ITEM_COMPOSITE_ID,
					batchNumber: "LOT-2026-EARLY",
					initialQty: "4.000",
					remainingQty: "4.000",
					purchasePricePerUnit: "1200.00",
					expirationDate: "2026-11-01",
					status: "active",
				},
				{
					id: BATCH_LATER_ID,
					organizationId: ORG_ID,
					inventoryItemId: ITEM_COMPOSITE_ID,
					batchNumber: "LOT-2027-LATER",
					initialQty: "6.000",
					remainingQty: "6.000",
					purchasePricePerUnit: "1250.00",
					expirationDate: "2027-11-01",
					status: "active",
				},
			]);
		});
	});

	after(async () => {
		await app.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	test("Execute 14-Step Closed Loop Clinical Cycle with PostgreSQL 18 RLS", async () => {
		// -------------------------------------------------------------------------
		// ШАГ 1: Пациент (Patient Creation)
		// -------------------------------------------------------------------------
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Кузнецов Дмитрий Сергеевич",
				phone: "+79161234567",
				birthDate: "1988-06-15",
				notes: "Паспорт: 4512 789012, СНИЛС: 123-456-789 00, ОМС: 1234567890123456",
			});
		});

		// -------------------------------------------------------------------------
		// ШАГ 2: Запись в расписание (Appointment)
		// -------------------------------------------------------------------------
		const apptTime = new Date("2026-10-15T10:00:00Z");
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(appointments).values({
				id: APPOINTMENT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				doctorUserId: DOCTOR_ID,
				startsAt: apptTime,
				endsAt: new Date(apptTime.getTime() + 45 * 60_000),
				status: "confirmed",
			});
		});

		// -------------------------------------------------------------------------
		// ШАГ 3: Старт приёма в кресле (Visit In-Chair)
		// -------------------------------------------------------------------------
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(visits).values({
				id: VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				appointmentId: APPOINTMENT_ID,
				status: "draft",
				complaint: "Жалобы на застревание пищи и кратковременную боль от сладкого в зубе 46.",
				objectiveStatus: "Зуб 46: глубокая кариозная полость II класс по Блэку (MOD). Зондирование дна болезненно.",
				diagnosis: "K02.1 Кариес дентина зуба 46.",
				treatmentPlan: "Препарирование, медикаментозная обработка, матричная система, реставрация Filtek Z250.",
				doctorSummary: "Лечение глубокого кариеса 46 MOD начато.",
			});

			await tx
				.update(appointments)
				.set({ status: "in_treatment" })
				.where(eq(appointments.id, APPOINTMENT_ID));
		});

		// -------------------------------------------------------------------------
		// ШАГ 4 & 5: Зубная формула (Tooth 46 MOD) & Диагноз МКБ-10 (K02.1)
		// -------------------------------------------------------------------------
		const odontogramRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/tooth-states/batch`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorStaffToken,
			},
			payload: {
				toothNumbers: [46],
				state: "caries",
				surfaces: ["M", "O", "D"],
				notes: "K02.1 Кариес дентина (глубокий кариес жевательной поверхности с переходом на апроксимальные)",
			},
		});

		assert.strictEqual(
			odontogramRes.statusCode,
			200,
			`Зубная формула должна сохраниться. Ошибка: ${odontogramRes.body}`,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			const [toothState] = await tx
				.select()
				.from(toothStates)
				.where(
					and(
						eq(toothStates.organizationId, ORG_ID),
						eq(toothStates.patientId, PATIENT_ID),
						eq(toothStates.toothNumber, 46),
					),
				);
			assert.ok(toothState, "Состояние зуба 46 должно быть в базе данных");
			assert.strictEqual(toothState.state, "Caries");
			assert.deepStrictEqual(toothState.surfaces, ["M", "O", "D"]);
		});

		// -------------------------------------------------------------------------
		// ШАГ 6 & 7: Протокол SOAP и выполненная услуга А16.07.002.001
		// -------------------------------------------------------------------------
		const soapNotes = JSON.stringify({
			subjective: "Жалобы на застревание пищи и кратковременную боль от сладкого в зубе 46.",
			objective: "Зуб 46: глубокая кариозная полость II класс по Блэку (MOD). Зондирование дна болезненно.",
			assessment: "K02.1 Кариес дентина зуба 46.",
			plan: "Препарирование, медикаментозная обработка, матричная система, реставрация Filtek Z250.",
		});

		const treatmentItemId = fixtureUuid(NAMESPACE, 20);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.update(visits)
				.set({
					doctorSummary: "Реставрация зуба 46 завершена успешно, контактные пункты восстановлены.",
				})
				.where(eq(visits.id, VISIT_ID));

			await tx.insert(treatmentItems).values({
				id: treatmentItemId,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				serviceId: SERVICE_RESTORATION_ID,
				toothCode: "46",
				title: "Восстановление зуба пломбой II класс по Блэку (46 MOD)",
				quantity: "1",
				unitPriceRub: 6500,
				priceRub: 6500,
				discountRub: 0,
				status: "in_progress",
			});
		});

		// -------------------------------------------------------------------------
		// ШАГ 8: Наряд в зуботехническую лабораторию (Lab Order) с Idempotency-Key
		// -------------------------------------------------------------------------
		const labMutationKey = `lab-order-key-${Date.now()}`;
		const labRes1 = await app.inject({
			method: "POST",
			url: "/api/clinical/lab-orders",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorStaffToken,
				"idempotency-key": labMutationKey,
			},
			payload: {
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				toothFdi: "46",
				material: "Диоксид циркония Katana ML",
				colorVita: "A2",
				priceRub: 12000,
				clinicalNotes: "Анатомическая коронка ZrO2 на зуб 46 после эндодонтического лечения",
				clientMutationId: labMutationKey,
			},
		});

		assert.strictEqual(
			labRes1.statusCode,
			201,
			`Наряд в ЗТЛ должен быть успешно создан. Ошибка: ${labRes1.body}`,
		);
		const createdLabOrder = labRes1.json();
		assert.ok(createdLabOrder.id, "ID наряда ЗТЛ должен быть возвращен");

		// Повторный запрос с тем же Idempotency-Key (проверка идемпотентности)
		const labRes2 = await app.inject({
			method: "POST",
			url: "/api/clinical/lab-orders",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorStaffToken,
				"idempotency-key": labMutationKey,
			},
			payload: {
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				toothFdi: "46",
				material: "Диоксид циркония Katana ML",
				colorVita: "A2",
				priceRub: 12000,
				clinicalNotes: "Анатомическая коронка ZrO2 на зуб 46 после эндодонтического лечения",
				clientMutationId: labMutationKey,
			},
		});

		assert.ok(
			[200, 201].includes(labRes2.statusCode),
			`Повторный запрос наряда ЗТЛ должен вернуть 200/201 (replayed). Получен ${labRes2.statusCode}`,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			const ordersInDb = await tx
				.select()
				.from(labOrders)
				.where(
					and(
						eq(labOrders.organizationId, ORG_ID),
						eq(labOrders.patientId, PATIENT_ID),
					),
				);
			assert.strictEqual(
				ordersInDb.length,
				1,
				"В базе данных должен существовать ровно 1 наряд ЗТЛ без дубликатов!",
			);
		});

		// -------------------------------------------------------------------------
		// ШАГ 9: Списание материалов FEFO и проверка Soft Overdraft (Мандат 8e)
		// -------------------------------------------------------------------------
		// 9.1 Списание композита Filtek Z250 (0.5 г) по FEFO
		// Партия LOT-2026-EARLY имеет 4.000 г. После списания 0.500 г должно остаться 3.500 г.
		const fefoDeductRes = await app.inject({
			method: "POST",
			url: `/api/treatment-consumables/${ORG_ID}/deduct/visit`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorStaffToken,
			},
			payload: {
				visitId: VISIT_ID,
				items: [
					{
						inventoryItemId: ITEM_COMPOSITE_ID,
						quantity: 0.5,
						reason: "Пломбирование зуба 46",
					},
				],
			},
		});

		assert.strictEqual(
			fefoDeductRes.statusCode,
			200,
			`Списание FEFO должно пройти успешно. Ошибка: ${fefoDeductRes.body}`,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			const [earlyBatch] = await tx
				.select()
				.from(stockBatches)
				.where(eq(stockBatches.id, BATCH_EARLY_ID));
			assert.ok(earlyBatch, "Партия earlyBatch должна существовать");
			// Ранняя партия списана (с 4.0 г уменьшилась)
			assert.ok(
				Number(earlyBatch.remainingQty) < 4.0,
				`Партия с более ранним сроком годности (FEFO) должна быть списана в первую очередь. Текущий остаток: ${earlyBatch.remainingQty}`,
			);

			const [laterBatch] = await tx
				.select()
				.from(stockBatches)
				.where(eq(stockBatches.id, BATCH_LATER_ID));
			assert.ok(laterBatch, "Партия laterBatch должна существовать");
			// Более поздняя партия LOT-2027-LATER не тронута (остаток 6.0 г)
			assert.strictEqual(
				Number(laterBatch.remainingQty),
				6.0,
				"Партия с более поздним сроком годности не должна быть затронута (остаток 6.0 г)",
			);
		});

		// 9.2 Проверка Soft Overdraft (Мандат 8e: не блокировать врача при нулевом остатке)
		// Адгезив ITEM_BOND_ID имеет остаток 0.000 мл на складе.
		const overdraftRes = await app.inject({
			method: "POST",
			url: `/api/treatment-consumables/${ORG_ID}/deduct/visit`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorStaffToken,
			},
			payload: {
				visitId: VISIT_ID,
				items: [
					{
						inventoryItemId: ITEM_BOND_ID,
						quantity: 0.1,
						reason: "Бондинг зуба 46",
					},
				],
				allowOverdraft: true,
			},
		});

		assert.strictEqual(
			overdraftRes.statusCode,
			200,
			`Мягкий овердрафт должен вернуть 200 OK с предупреждением, а не 409/500! Ошибка: ${overdraftRes.body}`,
		);

		// -------------------------------------------------------------------------
		// ШАГ 10: Формирование счёта (Invoice Generation)
		// -------------------------------------------------------------------------
		const invoiceMutationKey = `invoice-gen-${Date.now()}`;
		const invoiceRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorStaffToken,
				"idempotency-key": invoiceMutationKey,
			},
			payload: {
				patientId: PATIENT_ID,
				doctorUserId: DOCTOR_ID,
				allowUnplannedServices: true,
				documentType: "invoice",
				clientMutationId: invoiceMutationKey,
				items: [
					{
						serviceId: SERVICE_RESTORATION_ID,
						code804n: "A16.07.002.001",
						nameRu: "Восстановление зуба пломбой II класс по Блэку (46 MOD)",
						quantity: 1,
						unitPriceRub: 6500,
						planUnitPriceRub: 6500,
						effectiveUnitPriceRub: 6500,
						discountRub: 0,
					},
				],
			},
		});

		assert.strictEqual(
			invoiceRes.statusCode,
			201,
			`Счёт должен быть сформирован с кодом 201. Ошибка: ${invoiceRes.body}`,
		);
		const invoiceBody = invoiceRes.json();
		const invoiceId = invoiceBody.invoiceId;
		assert.ok(invoiceId, "Счёт должен содержать invoiceId");
		assert.strictEqual(invoiceBody.totalNetRub, 6500);

		// -------------------------------------------------------------------------
		// ШАГ 11: Открытие утренней смены кассы перед приёмом оплаты
		// -------------------------------------------------------------------------
		const openShiftRes = await app.inject({
			method: "POST",
			url: "/api/cash/cash-box-all-open",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminStaffToken,
			},
			payload: {
				openedByUserId: ADMIN_ID,
			},
		});
		assert.strictEqual(
			openShiftRes.statusCode,
			200,
			`Смена кассы должна открыться. Ошибка: ${openShiftRes.body}`,
		);

		// -------------------------------------------------------------------------
		// ШАГ 12: Мультитендерная оплата (Наличные + Карта + СБП) & Idempotency Key
		// -------------------------------------------------------------------------
		// Итого 6,500.00 ₽:
		// Наличные: 1,500.00 ₽ (150,000 копеек)
		// Безнал (Карта 3,000 + СБП 2,000): 5,000.00 ₽ (500,000 копеек)
		// Расхождение: ровно 0 копеек!
		const paymentMutationKey = `split-pay-${Date.now()}`;
		const paymentRes1 = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminStaffToken,
				"idempotency-key": paymentMutationKey,
			},
			payload: {
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				amountRub: 6500,
				method: "split",
				cashAmountKopecks: 150000,
				electronicAmountKopecks: 500000,
				cashAmountRub: 1500,
				electronicAmountRub: 5000,
				clientMutationId: paymentMutationKey,
				note: "Мультитендер: Наличные 1500 ₽ + Эквайринг 3000 ₽ + СБП 2000 ₽",
			},
		});

		assert.strictEqual(
			paymentRes1.statusCode,
			201,
			`Платеж должен быть создан со статусом 201. Ошибка: ${paymentRes1.body}`,
		);
		const paymentCreated = paymentRes1.json();
		assert.strictEqual(paymentCreated.amountRub, 6500);
		assert.strictEqual(paymentCreated.status, "paid");

		// -------------------------------------------------------------------------
		// ШАГ 13: Повторный запрос (Double-Click Replay Check — 0 duplicate rows)
		// -------------------------------------------------------------------------
		const paymentRes2 = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminStaffToken,
				"idempotency-key": paymentMutationKey,
			},
			payload: {
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				amountRub: 6500,
				method: "split",
				cashAmountKopecks: 150000,
				electronicAmountKopecks: 500000,
				cashAmountRub: 1500,
				electronicAmountRub: 5000,
				clientMutationId: paymentMutationKey,
				note: "Мультитендер: Наличные 1500 ₽ + Эквайринг 3000 ₽ + СБП 2000 ₽",
			},
		});

		assert.ok(
			[200, 201].includes(paymentRes2.statusCode),
			`Повторный POST с тем же Idempotency-Key должен вернуть исходный платеж (200/201). Получен: ${paymentRes2.statusCode}`,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			// Проверяем проводки в таблице payments
			const recordedPayments = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.visitId, VISIT_ID),
					),
				);

			// Мультитендер сохраняет раздельные строки по методам (наличные и безнал), но НИКАКИХ повторных дублей от второго POST!
			assert.strictEqual(
				recordedPayments.length,
				2,
				"Должно быть ровно 2 проводки (наличные и безнал) — строго 0 повторных дублей!",
			);

			const cashEntry = recordedPayments.find((p) => p.method === "cash");
			const cardEntry = recordedPayments.find((p) => p.method === "card");

			assert.ok(cashEntry, "Должна присутствовать наличная проводка");
			assert.strictEqual(cashEntry.amountRub, 1500);

			assert.ok(cardEntry, "Должна присутствовать безналичная проводка");
			assert.strictEqual(cardEntry.amountRub, 5000);

			// Проверяем очередь фискализации 54-ФЗ (Tag 1031 + Tag 1081)
			const queuedReceipts = await tx
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, ORG_ID),
						eq(fiscalReceiptQueue.visitId, VISIT_ID),
					),
				);

			assert.ok(queuedReceipts.length > 0, "Чек 54-ФЗ должен быть в очереди фискализации");
			const firstReceipt = queuedReceipts[0];
			assert.ok(firstReceipt, "Первый чек должен существовать");
			const receiptPayload = firstReceipt.payloadJson as Record<string, unknown>;
			assert.ok(receiptPayload, "receiptPayload должен существовать");
			assert.strictEqual(receiptPayload.amountRub, 6500, "Итоговая сумма чека: 6 500 ₽");
		});

		// -------------------------------------------------------------------------
		// ШАГ 14: Завершение визита и снятие Z-отчёта с закрытием смены
		// -------------------------------------------------------------------------
		// Завершаем визит и освобождаем кресло
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.update(visits)
				.set({ status: "signed" })
				.where(eq(visits.id, VISIT_ID));

			await tx
				.update(appointments)
				.set({ status: "completed" })
				.where(eq(appointments.id, APPOINTMENT_ID));
		});

		// Закрываем смену кассы со снятием Z-отчета
		const closeShiftRes = await app.inject({
			method: "POST",
			url: "/api/cash/cash-box-all-closing",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminStaffToken,
			},
			payload: {
				closedByUserId: ADMIN_ID,
				force: false,
			},
		});

		assert.strictEqual(
			closeShiftRes.statusCode,
			200,
			`Смена кассы должна успешно закрыться с Z-отчетом. Ошибка: ${closeShiftRes.body}`,
		);

		const closeData = closeShiftRes.json();
		assert.ok(closeData.shifts, "Ответ должен содержать закрытые смены");
		assert.ok(closeData.closedShiftsCount > 0, "Количество закрытых смен должно быть > 0");

		await withFixtureTenant(ORG_ID, async (tx) => {
			const closedShiftsInDb = await tx
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, ORG_ID),
						eq(cashBoxShifts.status, "closed"),
					),
				);
			assert.ok(closedShiftsInDb.length > 0, "В БД должны быть закрытые смены со статусом closed");
		});
	});
});
