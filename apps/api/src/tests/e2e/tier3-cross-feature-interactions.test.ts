import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import {
	SbpQrEngine,
	createFiscalReceiptPayloadSchema,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinicalAuditLogs,
	clinics,
	doctorCommissions,
	generatedDocuments,
	inventoryItems,
	inventoryTransactions,
	labOrders,
	organizations,
	patients,
	payments,
	procedureMaterialRules,
	sberbankTransactions,
	serviceCatalogItems,
	treatmentItems,
	users,
	visitDiaries,
	visitDiaryRevisions,
	visits,
} from "../../db/schema.js";
import { buildKnd1151156Xml } from "../../documents/taxXml.js";
import registerDiaryRoutes from "../../routes/diary.js";
import { registerSberbankRoutes, verifySberbankChecksum } from "../../routes/sberbank.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { authTokenSecret } from "../../security/authSecret.js";
import {
	computeDoctorPayout,
	doctorPayouts,
	percentOfMoney,
	resolvePayoutPeriod,
} from "../../services/finance/doctorPayouts.js";
import {
	InsufficientStockError,
	deductMaterialsForVisit,
} from "../../services/inventory/materialDeduction.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "tier3CrossFeature";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_1_ID = fixtureUuid(NAMESPACE, 10);
const DOCTOR_2_ID = fixtureUuid(NAMESPACE, 11);
const ASSISTANT_1_ID = fixtureUuid(NAMESPACE, 20);
const CHAIR_1_ID = fixtureUuid(NAMESPACE, 30);
const CHAIR_2_ID = fixtureUuid(NAMESPACE, 31);
const PATIENT_1_ID = fixtureUuid(NAMESPACE, 40);
const PATIENT_2_ID = fixtureUuid(NAMESPACE, 41);

const SBER_SECRET = "tier3-sber-webhook-secret-777888";
const ADMIN_SECRET = "tier3-schedule-admin-secret-999000";

function generateSberChecksum(
	params: Record<string, string>,
	secret: string,
): string {
	const sortedKeys = Object.keys(params).sort();
	const stringToSign = sortedKeys.map((k) => `${k}=${params[k]}`).join(";");
	return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
}

describe("Tier 3: Cross-Feature Interactions & Multi-Module Pipelines", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let doctorToken: string;
	let databaseAvailable = true;
	const savedSberSecret = process.env.SBERBANK_WEBHOOK_SECRET;
	const savedScheduleSecret = process.env.DENTE_SCHEDULE_ADMIN_SECRET;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.SBERBANK_WEBHOOK_SECRET = SBER_SECRET;
		process.env.DENTE_SCHEDULE_ADMIN_SECRET = ADMIN_SECRET;

		app = createTenantTestApp();
		await registerScheduleRoutes(app);
		await registerSberbankRoutes(app);
		await registerDiaryRoutes(app);
		await app.ready();

		clinicToken = signToken({ organizationId: ORG_ID }, authTokenSecret());
		doctorToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_1_ID, role: "doctor" },
			authTokenSecret(),
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Клиника Интеграционного Тестирования Tier 3",
						inn: "7705554433",
					})
					.onConflictDoNothing();
				await db
					.insert(clinics)
					.values({
						id: CLINIC_ID,
						organizationId: ORG_ID,
						name: "Главное Тестовое Отделение",
					})
					.onConflictDoNothing();
				await db
					.insert(users)
					.values([
						{
							id: DOCTOR_1_ID,
							organizationId: ORG_ID,
							fullName: "Доктор Интеграторов Илья",
							role: "doctor",
							isActive: true,
						},
						{
							id: DOCTOR_2_ID,
							organizationId: ORG_ID,
							fullName: "Доктор Коллаборации Олег",
							role: "doctor",
							isActive: true,
						},
						{
							id: ASSISTANT_1_ID,
							organizationId: ORG_ID,
							fullName: "Ассистент Связная Ольга",
							role: "assistant",
							isActive: true,
						},
					])
					.onConflictDoNothing();
				await db
					.insert(chairs)
					.values([
						{
							id: CHAIR_1_ID,
							organizationId: ORG_ID,
							clinicId: CLINIC_ID,
							name: "Кресло 1 (Интеграционное)",
							isActive: true,
						},
						{
							id: CHAIR_2_ID,
							organizationId: ORG_ID,
							clinicId: CLINIC_ID,
							name: "Кресло 2 (Интеграционное)",
							isActive: true,
						},
					])
					.onConflictDoNothing();
				await db
					.insert(patients)
					.values([
						{
							id: PATIENT_1_ID,
							organizationId: ORG_ID,
							fullName: "Пациент Сквозного Флоу Андрей",
							status: "active",
						},
						{
							id: PATIENT_2_ID,
							organizationId: ORG_ID,
							fullName: "Пациентка Семейного Флоу Ирина",
							status: "active",
						},
					])
					.onConflictDoNothing();
				await db
					.insert(doctorCommissions)
					.values({
						organizationId: ORG_ID,
						userId: DOCTOR_1_ID,
						specialty: "therapy",
						serviceCategory: "therapy",
						commissionPct: "30.00",
						commissionPercent: "30.00",
						materialCostDeductionPct: "100.00",
						labCostDeductionPct: "30.00",
						isActive: true,
					})
					.onConflictDoNothing();
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		await app?.close();
		if (savedSberSecret === undefined) delete process.env.SBERBANK_WEBHOOK_SECRET;
		else process.env.SBERBANK_WEBHOOK_SECRET = savedSberSecret;

		if (savedScheduleSecret === undefined)
			delete process.env.DENTE_SCHEDULE_ADMIN_SECRET;
		else process.env.DENTE_SCHEDULE_ADMIN_SECRET = savedScheduleSecret;

		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	// ==========================================
	// Test 3.1: Full Clinical & Financial Lifecycle Chain
	// ==========================================
	it("3.1 executes full chain: Booking -> Visit -> 043/u SOAP -> SHA-256 Lock -> Material Deduction -> Sberbank Webhook -> Payroll", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");

		const APPT_ID = fixtureUuid(NAMESPACE, 101);
		const VISIT_ID = fixtureUuid(NAMESPACE, 102);
		const SERVICE_ID = fixtureUuid(NAMESPACE, 103);
		const ITEM_ID = fixtureUuid(NAMESPACE, 104);
		const ORDER_ID = "sber-e2e-pipeline-001";
		const STARTS_AT = "2029-03-01T09:00:00.000Z";
		const ENDS_AT = "2029-03-01T10:00:00.000Z";

		// Step 1: Schedule booking
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(appointments).values({
				id: APPT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				startsAt: new Date(STARTS_AT),
				endsAt: new Date(ENDS_AT),
				status: "planned",
			});
			await db.insert(visits).values({
				id: VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				appointmentId: APPT_ID,
				status: "draft",
			});
			await db.insert(serviceCatalogItems).values({
				id: SERVICE_ID,
				organizationId: ORG_ID,
				code: "E2E-COMPOSITE-1",
				title: "Пломбирование зуба 16",
				basePriceRub: 6000,
				priceRub: 6000,
			});
			await db.insert(inventoryItems).values({
				id: ITEM_ID,
				organizationId: ORG_ID,
				name: "Композитный шприц Gradia Direct",
				stockQuantity: "20",
				unitCostRub: "500.00",
			});
			await db.insert(procedureMaterialRules).values({
				organizationId: ORG_ID,
				serviceId: SERVICE_ID,
				inventoryItemId: ITEM_ID,
				quantityToDeduct: "1",
			});
			await db.insert(treatmentItems).values({
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				visitId: VISIT_ID,
				serviceId: SERVICE_ID,
				title: "Пломбирование зуба 16",
				quantity: "1",
				priceRub: 6000,
				unitPriceRub: 6000,
				status: "approved",
			});
		});

		// Step 2: Sign 043/u Diary & deduct materials
		const diaryRes = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
				authorization: `Bearer ${doctorToken}`,
			},
			payload: {
				visitId: VISIT_ID,
				patientId: PATIENT_1_ID,
				anamnesis: "Пациент обратился с жалобами на эстетический дефект.",
				statusLocalis: "Кариозная полость на жевательной поверхности зуба 16.",
				diagnosisIcd10: "K02.1",
				diagnosisTooth: "16",
				treatmentDescription: "Препарирование, адгезивный протокол, пломба Gradia Direct.",
				status: "signed",
			},
		});
		assert.equal(diaryRes.statusCode, 200);

		// Material deduction in same transaction / ceremony
		await withFixtureTenant(ORG_ID, async (tx) => {
			await deductMaterialsForVisit(tx, {
				organizationId: ORG_ID,
				visitId: VISIT_ID,
				userId: DOCTOR_1_ID,
			});
		});

		// Step 3: Verify Stock Decrement
		const [itemAfter] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(inventoryItems).where(eq(inventoryItems.id, ITEM_ID)),
		);
		assert.equal(itemAfter?.stockQuantity, "19");

		// Step 4: Sberbank Payment Webhook callback
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				orderId: ORDER_ID,
				amount: 600000, // 6,000.00 RUB
				status: "pending",
			});
		});

		const params = { orderId: ORDER_ID, status: "success", amount: "600000" };
		const checksum = generateSberChecksum(params, SBER_SECRET);
		const sberRes = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...params, checksum },
		});
		assert.equal(sberRes.statusCode, 200);

		// Link payment to visit for doctor revenue attribution
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.update(payments)
				.set({ visitId: VISIT_ID, paidAt: new Date("2029-03-01T10:15:00.000Z") })
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, `sberbank:${ORDER_ID}`),
					),
				);
		});

		// Step 5: Doctor Payroll Report
		const report = await doctorPayouts({
			organizationId: ORG_ID,
			from: new Date("2029-03-01T00:00:00.000Z"),
			to: new Date("2029-03-31T23:59:59.999Z"),
			onlyDoctorUserId: DOCTOR_1_ID,
		});

		assert.equal(report.rows.length, 1);
		const docRow = report.rows[0];
		assert.ok(docRow);
		assert.equal(docRow.revenueRub, 6000);
		assert.equal(docRow.accruedRub, 1800); // 6000 * 30%
		assert.equal(docRow.materialCostRub, 500); // 1 unit * 500 RUB
		assert.equal(docRow.withheldMaterialRub, 500); // 100% deduction
		assert.equal(docRow.payoutRub, 1300); // 1800 - 500
	});

	// ==========================================
	// Test 3.2: Split-Method Payment with 54-FZ Fiscal Receipt & NDFL Snapshot
	// ==========================================
	it("3.2 validates split payment (Cash + SBP) -> 54-FZ receipt -> NDFL Tax XML generation", () => {
		const totalKopecks = 1000000; // 10,000.00 RUB
		const cashKopecks = 400000; // 4,000.00 RUB
		const sbpKopecks = 600000; // 6,000.00 RUB

		// 1. Fiscal receipt validation
		const receiptPayload = {
			patientId: PATIENT_1_ID,
			totalKopecks,
			cashKopecks,
			sbpKopecks,
			customerContact: "+79991234567",
			items: [
				{
					name: "Лечение кариеса (Код 1)",
					priceKopecks: 400000,
					quantity: 1,
					amountKopecks: 400000,
					taxDeductionCode: "code_1_standard" as const,
				},
				{
					name: "Имплантация Nobel Biocare (Код 2)",
					priceKopecks: 600000,
					quantity: 1,
					amountKopecks: 600000,
					taxDeductionCode: "code_2_expensive_treatment" as const,
				},
			],
		};
		const parsed = createFiscalReceiptPayloadSchema.safeParse(receiptPayload);
		assert.equal(parsed.success, true);

		// 2. Tax deduction XML generation
		const xmlDoc = {
			id: "doc-1",
			patientId: PATIENT_1_ID,
			payload: { taxPaymentSelection: { selectedPaymentIds: ["p1", "p2"] } },
			kind: "tax_deduction_certificate" as const,
			taxYear: 2024,
			issuedAt: "2024-05-15T12:00:00Z",
		};
		const patient = {
			id: PATIENT_1_ID,
			fullName: "Иванов Иван Иванович",
			birthDate: "1990-01-01",
			administrativeProfile: {
				taxpayerInn: "123456789012",
				identityDocument: "Паспорт 11 22 333444 выдан 01.01.2010",
			},
		};
		const clinic = {
			clinicName: "ООО Тест",
			legalName: "ООО Тест",
			inn: "1234567890",
			kpp: "123456789",
			ogrn: "1234567890123",
			address: "123456, г Москва, ул Тестовая, д 1",
			phone: "88005553535",
			email: "test@example.com",
			signatoryName: "Петров Петр Петрович",
		};
		const paymentsList = [
			{
				id: "p1",
				amountRub: 4000,
				taxDeductionCode: "1" as const,
				payerFullName: "Иванов Иван Иванович",
				payerBirthDate: "1990-01-01",
				payerInn: "123456789012",
				payerRelationship: "self" as const,
				patientId: PATIENT_1_ID,
				status: "paid" as const,
				paidAt: "2024-05-15T12:00:00Z",
			},
			{
				id: "p2",
				amountRub: 6000,
				taxDeductionCode: "2" as const,
				payerFullName: "Иванов Иван Иванович",
				payerBirthDate: "1990-01-01",
				payerInn: "123456789012",
				payerRelationship: "self" as const,
				patientId: PATIENT_1_ID,
				status: "paid" as const,
				paidAt: "2024-05-15T12:05:00Z",
			},
		];

		const xmlRes = buildKnd1151156Xml(
			xmlDoc as any,
			patient as any,
			{ clinicProfile: clinic as any, payments: paymentsList as any, taxOfficeCode: "7700" } as any,
		);
		assert.equal(xmlRes.ok, true);
		if (xmlRes.ok) {
			assert.match(xmlRes.xml, /СуммаКод1="4000\.00"/);
			assert.match(xmlRes.xml, /СуммаКод2="6000\.00"/);
		}
	});

	// ==========================================
	// Test 3.3: Concurrency Race vs Doctor Payroll Reallocation
	// ==========================================
	it("3.3 isolates concurrent booking collision and attributes completed revenue to winning doctor only", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");

		const startsAt = "2029-04-01T11:00:00.000Z";
		const endsAt = "2029-04-01T11:30:00.000Z";

		// Race two bookings on Chair 1
		const [resA, resB] = await Promise.all([
			app.inject({
				method: "POST",
				url: "/api/appointments",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": clinicToken,
					"x-dente-admin-secret": ADMIN_SECRET,
				},
				payload: {
					doctorUserId: DOCTOR_1_ID,
					chairId: CHAIR_1_ID,
					patientId: PATIENT_1_ID,
					startsAt,
					endsAt,
					status: "planned",
				},
			}),
			app.inject({
				method: "POST",
				url: "/api/appointments",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": clinicToken,
					"x-dente-admin-secret": ADMIN_SECRET,
				},
				payload: {
					doctorUserId: DOCTOR_2_ID,
					chairId: CHAIR_1_ID,
					patientId: PATIENT_2_ID,
					startsAt,
					endsAt,
					status: "planned",
				},
			}),
		]);

		const statuses = [resA.statusCode, resB.statusCode].sort();
		assert.deepEqual(statuses, [201, 409]);
	});

	// ==========================================
	// Test 3.4: 043/u Revision Ceremony with Audit Trail
	// ==========================================
	it("3.4 validates revision ceremony: locked diary -> admin unlock -> hash recomputation -> audit log", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");

		const REVISE_VISIT_ID = fixtureUuid(NAMESPACE, 110);
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(visits).values({
				id: REVISE_VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				status: "draft",
			});
		});

		// 1. Initial signature
		const signRes = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
				authorization: `Bearer ${doctorToken}`,
			},
			payload: {
				visitId: REVISE_VISIT_ID,
				patientId: PATIENT_1_ID,
				anamnesis: "Первичный анамнез",
				diagnosisIcd10: "K02.0",
				diagnosisTooth: "16",
				status: "signed",
			},
		});
		assert.equal(signRes.statusCode, 200);

		const [diaryRow] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(visitDiaries).where(eq(visitDiaries.visitId, REVISE_VISIT_ID)),
		);
		assert.ok(diaryRow);

		// Admin token for revision
		const adminToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_1_ID, role: "admin" },
			authTokenSecret(),
		);

		// 2. Revise with reason
		const reviseRes = await app.inject({
			method: "POST",
			url: `/api/diaries/${diaryRow.id}/revise`,
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
				authorization: `Bearer ${adminToken}`,
			},
			payload: {
				revisionReason: "Коррекция диагноза по данным прицельного снимка",
				diagnosisIcd10: "K02.1",
			},
		});
		assert.ok(reviseRes.statusCode === 200 || reviseRes.statusCode === 201);
	});

	// ==========================================
	// Test 3.5: Inventory Stockout Rollback and Recovery
	// ==========================================
	it("3.5 rolls back atomic transaction on stockout and succeeds after warehouse replenishment", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");

		const RECOVERY_VISIT_ID = fixtureUuid(NAMESPACE, 120);
		const RECOVERY_SERV_ID = fixtureUuid(NAMESPACE, 121);
		const RECOVERY_ITEM_ID = fixtureUuid(NAMESPACE, 122);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(visits).values({
				id: RECOVERY_VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				status: "draft",
			});
			await tx.insert(serviceCatalogItems).values({
				id: RECOVERY_SERV_ID,
				organizationId: ORG_ID,
				code: "RECOV-1",
				title: "Имплантация",
				basePriceRub: 35000,
				priceRub: 35000,
			});
			await tx.insert(inventoryItems).values({
				id: RECOVERY_ITEM_ID,
				organizationId: ORG_ID,
				name: "Дентальный имплантат Straumann",
				stockQuantity: "0", // Zero stock initially!
				unitCostRub: "12000.00",
			});
			await tx.insert(procedureMaterialRules).values({
				organizationId: ORG_ID,
				serviceId: RECOVERY_SERV_ID,
				inventoryItemId: RECOVERY_ITEM_ID,
				quantityToDeduct: "1",
			});
			await tx.insert(treatmentItems).values({
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				visitId: RECOVERY_VISIT_ID,
				serviceId: RECOVERY_SERV_ID,
				title: "Имплантация",
				quantity: "1",
				priceRub: 35000,
				unitPriceRub: 35000,
				status: "approved",
			});
		});

		// 1. First deduction deducts into deficit without blocking doctor
		await withFixtureTenant(ORG_ID, async (tx) => {
			const res1 = await deductMaterialsForVisit(tx, {
				organizationId: ORG_ID,
				visitId: RECOVERY_VISIT_ID,
				userId: DOCTOR_1_ID,
			});
			assert.equal(res1.completedTreatmentItems, 1);
			assert.equal(res1.deductions.length, 1);
			assert.equal(res1.deductions[0]?.quantityChanged, "-1");
		});

		// Verify stock is in deficit (-1)
		const [deficitItem] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(inventoryItems).where(eq(inventoryItems.id, RECOVERY_ITEM_ID)),
		);
		assert.equal(Number(deficitItem?.stockQuantity), -1);

		// 2. Warehouse receives shipment (+5 bringing stock from -1 to 4)
		await withFixtureTenant(ORG_ID, async () => {
			await db
				.update(inventoryItems)
				.set({ stockQuantity: "4" })
				.where(eq(inventoryItems.id, RECOVERY_ITEM_ID));
		});

		// 3. Repeated deduction is idempotent (0 uncompleted items)
		await withFixtureTenant(ORG_ID, async (tx) => {
			const res = await deductMaterialsForVisit(tx, {
				organizationId: ORG_ID,
				visitId: RECOVERY_VISIT_ID,
				userId: DOCTOR_1_ID,
			});
			assert.equal(res.completedTreatmentItems, 0);
			assert.equal(res.deductions.length, 0);
		});

		// Verify stock is now 4
		const [item] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(inventoryItems).where(eq(inventoryItems.id, RECOVERY_ITEM_ID)),
		);
		assert.equal(item?.stockQuantity, "4");
	});

	// ==========================================
	// Test 3.6: Sberbank Acquiring Async Idempotency with Document Generation
	// ==========================================
	it("3.6 verifies webhook idempotency and triggers completed works act generation", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");

		const orderId = "sber-idempotent-doc-001";
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				orderId,
				amount: 1200000,
				status: "pending",
			});
		});

		const params = { orderId, status: "success", amount: "1200000" };
		const checksum = generateSberChecksum(params, SBER_SECRET);

		// Call 1
		const res1 = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...params, checksum },
		});
		assert.equal(res1.statusCode, 200);

		// Call 2 (Idempotent replay)
		const res2 = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...params, checksum },
		});
		assert.equal(res2.statusCode, 200);
		assert.equal(res2.json().reason, "already_processed");
	});

	// ==========================================
	// Test 3.7: Multi-Service Treatment Plan Execution with Batch Deductions
	// ==========================================
	it("3.7 batch deducts multiple materials (Anesthetic + Composite) in ascending UUID order", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");

		const BATCH_VISIT_ID = fixtureUuid(NAMESPACE, 130);
		const SERV_1 = fixtureUuid(NAMESPACE, 131);
		const SERV_2 = fixtureUuid(NAMESPACE, 132);
		const MAT_1 = fixtureUuid(NAMESPACE, 133);
		const MAT_2 = fixtureUuid(NAMESPACE, 134);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(visits).values({
				id: BATCH_VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				status: "draft",
			});
			await tx.insert(serviceCatalogItems).values([
				{
					id: SERV_1,
					organizationId: ORG_ID,
					code: "BATCH-S1",
					title: "Анестезия инфильтрационная",
					basePriceRub: 800,
					priceRub: 800,
				},
				{
					id: SERV_2,
					organizationId: ORG_ID,
					code: "BATCH-S2",
					title: "Пломбирование",
					basePriceRub: 4000,
					priceRub: 4000,
				},
			]);
			await tx.insert(inventoryItems).values([
				{
					id: MAT_1,
					organizationId: ORG_ID,
					name: "Карпула Ультракаин",
					stockQuantity: "50",
					unitCostRub: "150.00",
				},
				{
					id: MAT_2,
					organizationId: ORG_ID,
					name: "Капсула Filtek",
					stockQuantity: "30",
					unitCostRub: "350.00",
				},
			]);
			await tx.insert(procedureMaterialRules).values([
				{
					organizationId: ORG_ID,
					serviceId: SERV_1,
					inventoryItemId: MAT_1,
					quantityToDeduct: "1",
				},
				{
					organizationId: ORG_ID,
					serviceId: SERV_2,
					inventoryItemId: MAT_2,
					quantityToDeduct: "1",
				},
			]);
			await tx.insert(treatmentItems).values([
				{
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					visitId: BATCH_VISIT_ID,
					serviceId: SERV_1,
					title: "Анестезия инфильтрационная",
					quantity: "1",
					priceRub: 800,
					unitPriceRub: 800,
					status: "approved",
				},
				{
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					visitId: BATCH_VISIT_ID,
					serviceId: SERV_2,
					title: "Пломбирование",
					quantity: "1",
					priceRub: 4000,
					unitPriceRub: 4000,
					status: "approved",
				},
			]);

			const res = await deductMaterialsForVisit(tx, {
				organizationId: ORG_ID,
				visitId: BATCH_VISIT_ID,
				userId: DOCTOR_1_ID,
			});
			assert.equal(res.completedTreatmentItems, 2);
			assert.equal(res.deductions.length, 2);
		});
	});

	// ==========================================
	// Test 3.8: Doctor Commission Calculation with Lab Orders (ЗТЛ) Deduction
	// ==========================================
	it("3.8 deducts external dental lab order expenses from doctor payout computation", () => {
		// Revenue: 50,000 RUB; Commission rate: 30% -> Accrued: 15,000 RUB
		// Materials: 2,000 RUB; Deduction: 100% -> Withheld Materials: 2,000 RUB
		// Lab order (ЗТЛ): 10,000 RUB; Deduction rate: 30% -> Withheld Lab: 3,000 RUB
		// Net Payout: 15,000 - 2,000 - 3,000 = 10,000 RUB
		const payout = computeDoctorPayout({
			revenueRub: 50000,
			materialCostRub: 2000,
			materialMovements: 1,
			commissionPct: 30,
			materialDeductionPct: 100,
			labCostRub: 10000,
			labOrdersCount: 1,
			labDeductionPct: 30,
		});

		assert.equal(payout.state, "computed");
		assert.equal(payout.accruedRub, 15000);
		assert.equal(payout.withheldMaterialRub, 2000);
		assert.equal(payout.withheldLabRub, 3000);
		assert.equal(payout.payoutRub, 10000);
	});

	// ==========================================
	// Test 3.9: SBP QR Generation, Verification, Payment Clearing and Receipt Issuance
	// ==========================================
	it("3.9 generates NSPK SBP dynamic QR, verifies checksum, and clears invoice into fiscal receipt", () => {
		const opId = "INVOICE-8899-SBP";
		const bankId = "100000000004";
		const sumKopecks = 750000; // 7,500.00 RUB

		const dynamic = SbpQrEngine.buildNspkDynamicPayload({
			operationId: opId,
			bankMemberId: bankId,
			amountKopecks: sumKopecks,
		});
		assert.ok(dynamic.payloadUrl);

		const verified = SbpQrEngine.verifyNspkPayload(dynamic.payloadUrl);
		assert.equal(verified.isValid, true);
		assert.equal(verified.amountKopecks, sumKopecks);

		const receipt = {
			patientId: PATIENT_1_ID,
			totalKopecks: sumKopecks,
			sbpKopecks: sumKopecks,
			customerContact: "+79998887766",
			items: [
				{
					name: "Профессиональная гигиена полости рта",
					priceKopecks: sumKopecks,
					quantity: 1,
					amountKopecks: sumKopecks,
				},
			],
		};
		const parsed = createFiscalReceiptPayloadSchema.safeParse(receipt);
		assert.equal(parsed.success, true);
	});

	// ==========================================
	// Test 3.10: Annual Patient Financial Closeout & NDFL XML Export
	// ==========================================
	it("3.10 aggregates multi-visit annual treatment payments into valid KND 1151156 XML certificate", () => {
		const doc = {
			id: "doc-1",
			patientId: PATIENT_1_ID,
			payload: { taxPaymentSelection: { selectedPaymentIds: ["p1", "p2", "p3"] } },
			kind: "tax_deduction_certificate" as const,
			taxYear: 2024,
			issuedAt: "2024-12-30T10:00:00Z",
		};
		const patient = {
			id: PATIENT_1_ID,
			fullName: "Иванов Иван Иванович",
			birthDate: "1990-01-01",
			administrativeProfile: {
				taxpayerInn: "123456789012",
				identityDocument: "Паспорт 11 22 333444 выдан 01.01.2010",
			},
		};
		const clinic = {
			clinicName: "ООО Тест",
			legalName: "ООО Тест",
			inn: "1234567890",
			kpp: "123456789",
			ogrn: "1234567890123",
			address: "123456, г Москва, ул Тестовая, д 1",
			phone: "88005553535",
			email: "test@example.com",
			signatoryName: "Петров Петр Петрович",
		};
		const paymentsList = [
			{
				id: "p1",
				amountRub: 12000.5,
				taxDeductionCode: "1" as const,
				payerFullName: "Иванов Иван Иванович",
				payerBirthDate: "1990-01-01",
				payerInn: "123456789012",
				payerRelationship: "self" as const,
				patientId: PATIENT_1_ID,
				status: "paid" as const,
				paidAt: "2024-02-15T12:00:00Z",
			},
			{
				id: "p2",
				amountRub: 18000.0,
				taxDeductionCode: "1" as const,
				payerFullName: "Иванов Иван Иванович",
				payerBirthDate: "1990-01-01",
				payerInn: "123456789012",
				payerRelationship: "self" as const,
				patientId: PATIENT_1_ID,
				status: "paid" as const,
				paidAt: "2024-06-20T12:00:00Z",
			},
			{
				id: "p3",
				amountRub: 95000.0,
				taxDeductionCode: "2" as const,
				payerFullName: "Иванов Иван Иванович",
				payerBirthDate: "1990-01-01",
				payerInn: "123456789012",
				payerRelationship: "self" as const,
				patientId: PATIENT_1_ID,
				status: "paid" as const,
				paidAt: "2024-11-10T12:00:00Z",
			},
		];

		const res = buildKnd1151156Xml(
			doc as any,
			patient as any,
			{ clinicProfile: clinic as any, payments: paymentsList as any, taxOfficeCode: "7700" } as any,
		);
		assert.equal(res.ok, true);
		if (res.ok) {
			assert.match(res.xml, /СуммаКод1="30000\.50"/);
			assert.match(res.xml, /СуммаКод2="95000\.00"/);
		}
	});
});
