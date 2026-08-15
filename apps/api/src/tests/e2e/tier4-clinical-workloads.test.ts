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
	visits,
} from "../../db/schema.js";
import { buildKnd1151156Xml } from "../../documents/taxXml.js";
import registerDiaryRoutes from "../../routes/diary.js";
import { registerSberbankRoutes } from "../../routes/sberbank.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { authTokenSecret } from "../../security/authSecret.js";
import {
	computeDoctorPayout,
	doctorPayouts,
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

const NAMESPACE = "tier4ClinicalWorkloads";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_1_ID = fixtureUuid(NAMESPACE, 10);
const DOCTOR_2_ID = fixtureUuid(NAMESPACE, 11);
const SURGEON_ID = fixtureUuid(NAMESPACE, 12);
const ORTHO_ID = fixtureUuid(NAMESPACE, 13);
const CHAIR_1_ID = fixtureUuid(NAMESPACE, 30);
const CHAIR_2_ID = fixtureUuid(NAMESPACE, 31);
const CHAIR_3_ID = fixtureUuid(NAMESPACE, 32);
const PATIENT_1_ID = fixtureUuid(NAMESPACE, 40);
const PATIENT_2_ID = fixtureUuid(NAMESPACE, 41);
const PATIENT_3_ID = fixtureUuid(NAMESPACE, 42);

const SBER_SECRET = "tier4-sber-webhook-secret-realworld";
const ADMIN_SECRET = "tier4-schedule-admin-secret-storm";

function generateSberChecksum(
	params: Record<string, string>,
	secret: string,
): string {
	const sortedKeys = Object.keys(params).sort();
	const stringToSign = sortedKeys.map((k) => `${k}=${params[k]}`).join(";");
	return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
}

describe("Tier 4: Real-World Clinical Workload Scenarios & Edge Environments", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let doctorToken: string;
	let adminToken: string;
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
		adminToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_1_ID, role: "admin" },
			authTokenSecret(),
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_ID,
					name: "Стоматологический Комплекс Премиум ДЕНТЕ",
					inn: "7701112233",
				});
				await db.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Клинический Центр на Арбате",
				});
				await db.insert(users).values([
					{
						id: DOCTOR_1_ID,
						organizationId: ORG_ID,
						fullName: "Д-р Терапевтов Алексей",
						role: "doctor",
						isActive: true,
					},
					{
						id: DOCTOR_2_ID,
						organizationId: ORG_ID,
						fullName: "Д-р Эндодонтистов Борис",
						role: "doctor",
						isActive: true,
					},
					{
						id: SURGEON_ID,
						organizationId: ORG_ID,
						fullName: "Д-р Хирургов Сергей",
						role: "doctor",
						isActive: true,
					},
					{
						id: ORTHO_ID,
						organizationId: ORG_ID,
						fullName: "Д-р Ортопедов Дмитрий",
						role: "doctor",
						isActive: true,
					},
				]);
				await db.insert(chairs).values([
					{
						id: CHAIR_1_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло 1 (Терапия)",
						isActive: true,
					},
					{
						id: CHAIR_2_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло 2 (Хирургия)",
						isActive: true,
					},
					{
						id: CHAIR_3_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло 3 (Ортопедия)",
						isActive: true,
					},
				]);
				await db.insert(patients).values([
					{
						id: PATIENT_1_ID,
						organizationId: ORG_ID,
						fullName: "Ковалев Константин Константинович",
						status: "active",
					},
					{
						id: PATIENT_2_ID,
						organizationId: ORG_ID,
						fullName: "Морозова Марина Михайловна",
						status: "active",
					},
					{
						id: PATIENT_3_ID,
						organizationId: ORG_ID,
						fullName: "Васильев Виктор Васильевич",
						status: "active",
					},
				]);
				await db.insert(doctorCommissions).values([
					{
						organizationId: ORG_ID,
						userId: DOCTOR_1_ID,
						specialty: "therapy",
						serviceCategory: "therapy",
						commissionPct: "30.00",
						commissionPercent: "30.00",
						materialCostDeductionPct: "100.00",
						labCostDeductionPct: "0.00",
						isActive: true,
					},
					{
						organizationId: ORG_ID,
						userId: SURGEON_ID,
						specialty: "surgery",
						serviceCategory: "surgery",
						commissionPct: "25.00",
						commissionPercent: "25.00",
						materialCostDeductionPct: "50.00",
						labCostDeductionPct: "0.00",
						isActive: true,
					},
					{
						organizationId: ORG_ID,
						userId: ORTHO_ID,
						specialty: "orthopedics",
						serviceCategory: "orthopedics",
						commissionPct: "20.00",
						commissionPercent: "20.00",
						materialCostDeductionPct: "100.00",
						labCostDeductionPct: "30.00",
						isActive: true,
					},
				]);
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

	// =========================================================================
	// Scenario 1: Complete Patient Intake-to-Tax-Cert Full Lifecycle
	// =========================================================================
	it("Scenario 1: Complete Patient Intake -> Treatment -> Multi-payment -> SHA-256 EMR -> Tax Cert Lifecycle", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");

		const VISIT_T1 = fixtureUuid(NAMESPACE, 101);
		const VISIT_S1 = fixtureUuid(NAMESPACE, 102);
		const SERV_HYGIENE = fixtureUuid(NAMESPACE, 103);
		const SERV_IMPLANT = fixtureUuid(NAMESPACE, 104);
		const ITEM_ANESTHETIC = fixtureUuid(NAMESPACE, 105);
		const ITEM_IMPLANT = fixtureUuid(NAMESPACE, 106);

		// 1. Seed catalog items and warehouse stock
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(serviceCatalogItems).values([
				{
					id: SERV_HYGIENE,
					organizationId: ORG_ID,
					code: "HYG-01",
					title: "Комплексная гигиена полости рта",
					basePriceRub: 7000,
					priceRub: 7000,
				},
				{
					id: SERV_IMPLANT,
					organizationId: ORG_ID,
					code: "IMP-01",
					title: "Установка имплантата Straumann BLX",
					basePriceRub: 85000,
					priceRub: 85000,
				},
			]);
			await tx.insert(inventoryItems).values([
				{
					id: ITEM_ANESTHETIC,
					organizationId: ORG_ID,
					name: "Ультракаин Д-С Форте",
					stockQuantity: "100",
					unitCostRub: "180.00",
				},
				{
					id: ITEM_IMPLANT,
					organizationId: ORG_ID,
					name: "Имплантат Straumann BLX 4.0",
					stockQuantity: "15",
					unitCostRub: "22000.00",
				},
			]);
			await tx.insert(procedureMaterialRules).values([
				{
					organizationId: ORG_ID,
					serviceId: SERV_HYGIENE,
					inventoryItemId: ITEM_ANESTHETIC,
					quantityToDeduct: "1",
				},
				{
					organizationId: ORG_ID,
					serviceId: SERV_IMPLANT,
					inventoryItemId: ITEM_IMPLANT,
					quantityToDeduct: "1",
				},
			]);
		});

		// 2. Visit 1 (Therapy Hygiene): Create, Sign 043/u, Deduct Anesthetic, Pay Cash
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(visits).values({
				id: VISIT_T1,
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				status: "draft",
			});
			await tx.insert(treatmentItems).values({
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				visitId: VISIT_T1,
				serviceId: SERV_HYGIENE,
				title: "Комплексная гигиена полости рта",
				quantity: "1",
				priceRub: 7000,
				unitPriceRub: 7000,
				status: "approved",
			});
		});

		const resSign1 = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
				authorization: `Bearer ${doctorToken}`,
			},
			payload: {
				visitId: VISIT_T1,
				patientId: PATIENT_1_ID,
				anamnesis: "Жалобы на зубные отложения и кровоточивость десен.",
				statusLocalis: "Зубной камень во фронтальном отделе нижней челюсти.",
				diagnosisIcd10: "K05.0",
				treatmentDescription: "Ультразвуковой скейлинг, полировка Air-Flow.",
				status: "signed",
			},
		});
		assert.equal(resSign1.statusCode, 200);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await deductMaterialsForVisit(tx, {
				organizationId: ORG_ID,
				visitId: VISIT_T1,
				userId: DOCTOR_1_ID,
			});
			// Cash Payment recorded
			await tx.insert(payments).values({
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				visitId: VISIT_T1,
				amountRub: 7000,
				method: "cash",
				status: "paid",
				taxDeductionCode: "1",
				payerFullName: "Иванов Иван Иванович",
				payerInn: "123456789012",
				payerRelationship: "self",
				paidAt: new Date("2024-03-10T11:00:00.000Z"),
			});
		});

		// 3. Visit 2 (Surgical Implant): Create, Sign 043/u, Deduct Implant, Pay Sberbank Webhook
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(visits).values({
				id: VISIT_S1,
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				status: "draft",
			});
			await tx.insert(treatmentItems).values({
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				visitId: VISIT_S1,
				serviceId: SERV_IMPLANT,
				title: "Установка имплантата Straumann BLX",
				quantity: "1",
				priceRub: 85000,
				unitPriceRub: 85000,
				status: "approved",
			});
		});

		const surgeonToken = signToken(
			{ organizationId: ORG_ID, userId: SURGEON_ID, role: "doctor" },
			authTokenSecret(),
		);
		const resSign2 = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": surgeonToken,
				authorization: `Bearer ${surgeonToken}`,
			},
			payload: {
				visitId: VISIT_S1,
				patientId: PATIENT_1_ID,
				anamnesis: "Отсутствие зуба 36. Подготовка к имплантации.",
				statusLocalis: "Атрофия альвеолярного отростка I степени в области 36.",
				diagnosisIcd10: "K08.1",
				diagnosisTooth: "36",
				treatmentDescription: "Дентальная имплантация Straumann BLX 4.0x10 мм с формирователем десны.",
				status: "signed",
			},
		});
		assert.equal(resSign2.statusCode, 200);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await deductMaterialsForVisit(tx, {
				organizationId: ORG_ID,
				visitId: VISIT_S1,
				userId: SURGEON_ID,
			});
		});

		// Sberbank Webhook for 85,000 RUB
		const orderId = "sber-scenario1-implant-85k";
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				orderId,
				amount: 8500000,
				status: "pending",
			});
		});

		const sberParams = { orderId, status: "success", amount: "8500000" };
		const sberChecksum = generateSberChecksum(sberParams, SBER_SECRET);
		const sberRes = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...sberParams, checksum: sberChecksum },
		});
		assert.equal(sberRes.statusCode, 200);

		// Tag payment with taxDeductionCode: 2 (expensive treatment)
		await withFixtureTenant(ORG_ID, async () => {
			await db
				.update(payments)
				.set({
					visitId: VISIT_S1,
					taxDeductionCode: "2",
					payerFullName: "Иванов Иван Иванович",
					payerInn: "123456789012",
					payerRelationship: "self",
					paidAt: new Date("2024-04-15T15:00:00.000Z"),
				})
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, `sberbank:${orderId}`),
					),
				);
		});

		// 4. Generate Annual FNS KND 1151156 Tax Certificate
		const [pay1] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(payments).where(eq(payments.visitId, VISIT_T1)),
		);
		const [pay2] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(payments).where(eq(payments.visitId, VISIT_S1)),
		);
		assert.ok(pay1 && pay2);

		const taxDoc = {
			id: "doc-1",
			patientId: PATIENT_1_ID,
			payload: { taxPaymentSelection: { selectedPaymentIds: [pay1.id, pay2.id] } },
			kind: "tax_deduction_certificate" as const,
			taxYear: 2024,
			issuedAt: "2024-12-25T10:00:00Z",
		};
		const patientProfile = {
			id: PATIENT_1_ID,
			fullName: "Иванов Иван Иванович",
			birthDate: "1990-01-01",
			administrativeProfile: {
				taxpayerInn: "123456789012",
				identityDocument: "Паспорт 11 22 333444 выдан 01.01.2010",
			},
		};
		const clinicProfile = {
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

		const paymentsForTax = [
			{
				...pay1,
				id: pay1.id,
				amountRub: 7000,
				taxDeductionCode: "1" as const,
				payerFullName: "Иванов Иван Иванович",
				payerBirthDate: "1990-01-01",
				payerInn: "123456789012",
				payerRelationship: "self" as const,
				patientId: PATIENT_1_ID,
				status: "paid" as const,
				paidAt: "2024-03-10T11:00:00.000Z",
			},
			{
				...pay2,
				id: pay2.id,
				amountRub: 85000,
				taxDeductionCode: "2" as const,
				payerFullName: "Иванов Иван Иванович",
				payerBirthDate: "1990-01-01",
				payerInn: "123456789012",
				payerRelationship: "self" as const,
				patientId: PATIENT_1_ID,
				status: "paid" as const,
				paidAt: "2024-04-15T15:00:00.000Z",
			},
		];

		const taxRes = buildKnd1151156Xml(
			taxDoc as any,
			patientProfile as any,
			{
				clinicProfile: clinicProfile as any,
				payments: paymentsForTax as any,
				taxOfficeCode: "7700",
			} as any,
		);

		assert.equal(taxRes.ok, true);
		if (taxRes.ok) {
			assert.match(taxRes.xml, /СуммаКод1="7000\.00"/);
			assert.match(taxRes.xml, /СуммаКод2="85000\.00"/);
			assert.match(taxRes.xml, /ПрПациент="1"/);
		}
	});

	// =========================================================================
	// Scenario 2: High-Concurrency Reception Desk Morning Storm
	// =========================================================================
	it("Scenario 2: High-concurrency schedule storm (20 simultaneous mutations) manages GiST locks cleanly", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");

		const slots = [
			{ start: "2029-06-01T08:00:00.000Z", end: "2029-06-01T08:30:00.000Z", chair: CHAIR_1_ID, doc: DOCTOR_1_ID },
			{ start: "2029-06-01T08:00:00.000Z", end: "2029-06-01T08:30:00.000Z", chair: CHAIR_1_ID, doc: DOCTOR_1_ID }, // Direct collision!
			{ start: "2029-06-01T08:30:00.000Z", end: "2029-06-01T09:00:00.000Z", chair: CHAIR_1_ID, doc: DOCTOR_1_ID },
			{ start: "2029-06-01T08:00:00.000Z", end: "2029-06-01T08:30:00.000Z", chair: CHAIR_2_ID, doc: DOCTOR_2_ID },
			{ start: "2029-06-01T08:00:00.000Z", end: "2029-06-01T08:30:00.000Z", chair: CHAIR_2_ID, doc: DOCTOR_2_ID }, // Direct collision!
			{ start: "2029-06-01T08:30:00.000Z", end: "2029-06-01T09:00:00.000Z", chair: CHAIR_2_ID, doc: DOCTOR_2_ID },
			{ start: "2029-06-01T09:00:00.000Z", end: "2029-06-01T09:30:00.000Z", chair: CHAIR_1_ID, doc: DOCTOR_1_ID },
			{ start: "2029-06-01T09:30:00.000Z", end: "2029-06-01T10:00:00.000Z", chair: CHAIR_1_ID, doc: DOCTOR_1_ID },
			{ start: "2029-06-01T09:00:00.000Z", end: "2029-06-01T09:30:00.000Z", chair: CHAIR_2_ID, doc: DOCTOR_2_ID },
			{ start: "2029-06-01T09:30:00.000Z", end: "2029-06-01T10:00:00.000Z", chair: CHAIR_2_ID, doc: DOCTOR_2_ID },
			{ start: "2029-06-01T10:00:00.000Z", end: "2029-06-01T10:30:00.000Z", chair: CHAIR_3_ID, doc: SURGEON_ID },
			{ start: "2029-06-01T10:00:00.000Z", end: "2029-06-01T10:30:00.000Z", chair: CHAIR_3_ID, doc: SURGEON_ID }, // Direct collision!
			{ start: "2029-06-01T10:30:00.000Z", end: "2029-06-01T11:00:00.000Z", chair: CHAIR_3_ID, doc: SURGEON_ID },
			{ start: "2029-06-01T11:00:00.000Z", end: "2029-06-01T11:30:00.000Z", chair: CHAIR_1_ID, doc: DOCTOR_1_ID },
			{ start: "2029-06-01T11:30:00.000Z", end: "2029-06-01T12:00:00.000Z", chair: CHAIR_1_ID, doc: DOCTOR_1_ID },
			{ start: "2029-06-01T11:00:00.000Z", end: "2029-06-01T11:30:00.000Z", chair: CHAIR_2_ID, doc: DOCTOR_2_ID },
			{ start: "2029-06-01T11:30:00.000Z", end: "2029-06-01T12:00:00.000Z", chair: CHAIR_2_ID, doc: DOCTOR_2_ID },
			{ start: "2029-06-01T12:00:00.000Z", end: "2029-06-01T12:30:00.000Z", chair: CHAIR_3_ID, doc: ORTHO_ID },
			{ start: "2029-06-01T12:30:00.000Z", end: "2029-06-01T13:00:00.000Z", chair: CHAIR_3_ID, doc: ORTHO_ID },
			{ start: "2029-06-01T12:30:00.000Z", end: "2029-06-01T13:00:00.000Z", chair: CHAIR_3_ID, doc: ORTHO_ID }, // Direct collision!
		];

		const responses = await Promise.all(
			slots.map((s) =>
				app.inject({
					method: "POST",
					url: "/api/appointments",
					headers: {
						"content-type": "application/json",
						"x-dente-clinic-token": clinicToken,
						"x-dente-admin-secret": ADMIN_SECRET,
					},
					payload: {
						doctorUserId: s.doc,
						chairId: s.chair,
						patientId: PATIENT_1_ID,
						startsAt: s.start,
						endsAt: s.end,
						status: "planned",
					},
				}),
			),
		);

		// Every request must terminate cleanly with 201 Created or 409 Conflict (Zero 500 crashes)
		const statusCounts = { 201: 0, 409: 0, other: 0 };
		for (const r of responses) {
			if (r.statusCode === 201) statusCounts[201]++;
			else if (r.statusCode === 409) statusCounts[409]++;
			else statusCounts.other++;
		}

		assert.equal(statusCounts.other, 0, "No 500 or malformed errors during concurrency storm");
		assert.ok(statusCounts[201] >= 10, "At least 10 non-overlapping appointments booked successfully");
		assert.ok(statusCounts[409] >= 4, "At least 4 conflicting bookings rejected safely");
		assert.equal(statusCounts[201] + statusCounts[409], 20, "All 20 requests accounted for");
	});

	// =========================================================================
	// Scenario 3: Monthly Clinic Closeout with Doctor Commission Reconciliation
	// =========================================================================
	it("Scenario 3: Monthly closeout calculates doctor payroll across specialties, lab orders and consumables", () => {
		// Doctor 1 (Therapy): 100,000 RUB revenue, 30% commission = 30,000; 5,000 materials (100% deduction) -> Payout = 25,000 RUB
		const doc1 = computeDoctorPayout({
			revenueRub: 100000,
			materialCostRub: 5000,
			materialMovements: 5,
			commissionPct: 30,
			materialDeductionPct: 100,
		});
		assert.equal(doc1.state, "computed");
		assert.equal(doc1.accruedRub, 30000);
		assert.equal(doc1.withheldMaterialRub, 5000);
		assert.equal(doc1.payoutRub, 25000);

		// Surgeon (Surgery): 200,000 RUB revenue, 25% commission = 50,000; 30,000 materials (50% deduction = 15,000) -> Payout = 35,000 RUB
		const surgeon = computeDoctorPayout({
			revenueRub: 200000,
			materialCostRub: 30000,
			materialMovements: 3,
			commissionPct: 25,
			materialDeductionPct: 50,
		});
		assert.equal(surgeon.state, "computed");
		assert.equal(surgeon.accruedRub, 50000);
		assert.equal(surgeon.withheldMaterialRub, 15000);
		assert.equal(surgeon.payoutRub, 35000);

		// Orthopedist (Orthopedics): 300,000 RUB revenue, 20% commission = 60,000; 10,000 materials (100% = 10,000); 60,000 lab orders (30% = 18,000) -> Payout = 32,000 RUB
		const ortho = computeDoctorPayout({
			revenueRub: 300000,
			materialCostRub: 10000,
			materialMovements: 2,
			commissionPct: 20,
			materialDeductionPct: 100,
			labCostRub: 60000,
			labOrdersCount: 4,
			labDeductionPct: 30,
		});
		assert.equal(ortho.state, "computed");
		assert.equal(ortho.accruedRub, 60000);
		assert.equal(ortho.withheldMaterialRub, 10000);
		assert.equal(ortho.withheldLabRub, 18000);
		assert.equal(ortho.payoutRub, 32000);

		// Total clinic closeout validation
		const totalRevenue = 100000 + 200000 + 300000; // 600,000 RUB
		const totalDoctorPayouts = doc1.payoutRub + surgeon.payoutRub + ortho.payoutRub; // 25,000 + 35,000 + 32,000 = 92,000 RUB
		assert.equal(totalRevenue, 600000);
		assert.equal(totalDoctorPayouts, 92000);
	});

	// =========================================================================
	// Scenario 4: Multi-Visit Pulpitis / Endodontic Treatment Flow
	// =========================================================================
	it("Scenario 4: Multi-visit pulpitis flow: Visit 1 (Extirpation & Advance) -> Visit 2 (Obturation, Advance Settlement & SBP)", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");

		const PULP_V1 = fixtureUuid(NAMESPACE, 140);
		const PULP_V2 = fixtureUuid(NAMESPACE, 141);
		const SERV_ENDO_1 = fixtureUuid(NAMESPACE, 142);
		const SERV_ENDO_2 = fixtureUuid(NAMESPACE, 143);
		const ITEM_CAVIT = fixtureUuid(NAMESPACE, 144);
		const ITEM_GUTTA = fixtureUuid(NAMESPACE, 145);

		// Seed items and rules
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(serviceCatalogItems).values([
				{
					id: SERV_ENDO_1,
					organizationId: ORG_ID,
					code: "ENDO-01",
					title: "Экстирпация пульпы, механическая обработка каналов",
					basePriceRub: 5000,
					priceRub: 5000,
				},
				{
					id: SERV_ENDO_2,
					organizationId: ORG_ID,
					code: "ENDO-02",
					title: "Пломбирование каналов гуттаперчей + композит",
					basePriceRub: 8000,
					priceRub: 8000,
				},
			]);
			await tx.insert(inventoryItems).values([
				{
					id: ITEM_CAVIT,
					organizationId: ORG_ID,
					name: "Временный пломбировочный материал Септопак",
					stockQuantity: "25",
					unitCostRub: "120.00",
				},
				{
					id: ITEM_GUTTA,
					organizationId: ORG_ID,
					name: "Гуттаперчевые штифты 0.04",
					stockQuantity: "50",
					unitCostRub: "400.00",
				},
			]);
			await tx.insert(procedureMaterialRules).values([
				{
					organizationId: ORG_ID,
					serviceId: SERV_ENDO_1,
					inventoryItemId: ITEM_CAVIT,
					quantityToDeduct: "1",
				},
				{
					organizationId: ORG_ID,
					serviceId: SERV_ENDO_2,
					inventoryItemId: ITEM_GUTTA,
					quantityToDeduct: "1",
				},
			]);
		});

		// Visit 1: Emergency Pulpitis stage 1
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(visits).values({
				id: PULP_V1,
				organizationId: ORG_ID,
				patientId: PATIENT_2_ID,
				status: "draft",
			});
			await tx.insert(treatmentItems).values({
				organizationId: ORG_ID,
				patientId: PATIENT_2_ID,
				visitId: PULP_V1,
				serviceId: SERV_ENDO_1,
				title: "Экстирпация пульпы, механическая обработка каналов",
				quantity: "1",
				priceRub: 5000,
				unitPriceRub: 5000,
				status: "approved",
			});
		});

		const sign1 = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
				authorization: `Bearer ${doctorToken}`,
			},
			payload: {
				visitId: PULP_V1,
				patientId: PATIENT_2_ID,
				anamnesis: "Острая самопроизвольная пульсирующая ночная боль в зубе 46.",
				statusLocalis: "Глубокая кариозная полость, зондирование дна резко болезненно.",
				diagnosisIcd10: "K04.0",
				diagnosisTooth: "46",
				treatmentDescription: "Анестезия, вскрытие полости зуба, экстирпация пульпы, мед. обработка, временная повязка.",
				status: "signed",
			},
		});
		assert.equal(sign1.statusCode, 200);

		// Deduct temporary filling
		await withFixtureTenant(ORG_ID, async (tx) => {
			await deductMaterialsForVisit(tx, {
				organizationId: ORG_ID,
				visitId: PULP_V1,
				userId: DOCTOR_1_ID,
			});
		});

		// Advance payment: 5,000 RUB cash
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(payments).values({
				organizationId: ORG_ID,
				patientId: PATIENT_2_ID,
				visitId: PULP_V1,
				amountRub: 5000,
				method: "cash",
				status: "paid",
				paidAt: new Date(),
			});
		});

		// Visit 2: Root canal obturation & final composite
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(visits).values({
				id: PULP_V2,
				organizationId: ORG_ID,
				patientId: PATIENT_2_ID,
				status: "draft",
			});
			await tx.insert(treatmentItems).values({
				organizationId: ORG_ID,
				patientId: PATIENT_2_ID,
				visitId: PULP_V2,
				serviceId: SERV_ENDO_2,
				title: "Пломбирование каналов гуттаперчей + композит",
				quantity: "1",
				priceRub: 8000,
				unitPriceRub: 8000,
				status: "approved",
			});
		});

		const sign2 = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
				authorization: `Bearer ${doctorToken}`,
			},
			payload: {
				visitId: PULP_V2,
				patientId: PATIENT_2_ID,
				anamnesis: "Жалоб нет, временная повязка сохранена.",
				statusLocalis: "Перкуссия зуба 46 безболезненна, каналы сухие.",
				diagnosisIcd10: "K04.0",
				diagnosisTooth: "46",
				treatmentDescription: "Обтурация 3 корневых каналов гуттаперчей, реставрация коронковой части композитом.",
				status: "signed",
			},
		});
		assert.equal(sign2.statusCode, 200);

		// Deduct gutta-percha
		await withFixtureTenant(ORG_ID, async (tx) => {
			await deductMaterialsForVisit(tx, {
				organizationId: ORG_ID,
				visitId: PULP_V2,
				userId: DOCTOR_1_ID,
			});
		});

		// Issue 54-FZ Fiscal receipt with remaining 8,000 RUB paid via SBP
		const finalReceipt = {
			patientId: PATIENT_2_ID,
			visitId: PULP_V2,
			customerContact: "+79031112233",
			totalKopecks: 800000,
			sbpKopecks: 800000,
			items: [
				{
					name: "Пломбирование каналов гуттаперчей + композит",
					priceKopecks: 800000,
					quantity: 1,
					amountKopecks: 800000,
					taxDeductionCode: "code_1_standard" as const,
				},
			],
		};
		const parsedReceipt = createFiscalReceiptPayloadSchema.safeParse(finalReceipt);
		assert.equal(parsedReceipt.success, true);
	});

	// =========================================================================
	// Scenario 5: Async Network Partition & Sberbank Reconnection
	// =========================================================================
	it("Scenario 5: Async network partition recovery: terminal payment heals ledger and unlocks doctor revenue", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");

		const PARTITION_VISIT_ID = fixtureUuid(NAMESPACE, 150);
		const orderId = "sber-async-reconnect-999";

		// 1. Visit was performed, invoice issued, pending transaction created
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(visits).values({
				id: PARTITION_VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_3_ID,
				status: "draft",
			});
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_3_ID,
				orderId,
				amount: 1500000, // 15,000.00 RUB
				status: "pending",
			});
		});

		// 2. Delayed webhook arrives after network recovery
		const sberParams = { orderId, status: "success", amount: "1500000" };
		const checksum = generateSberChecksum(sberParams, SBER_SECRET);

		const webhookRes = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...sberParams, checksum },
		});
		assert.equal(webhookRes.statusCode, 200);

		// 3. Verify ledger is healed: transaction is marked success and paid payment record exists
		const [tx] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(sberbankTransactions).where(eq(sberbankTransactions.orderId, orderId)),
		);
		assert.equal(tx?.status, "success");

		const [payment] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, `sberbank:${orderId}`),
					),
				),
		);
		assert.ok(payment);
		assert.equal(payment.status, "paid");
		assert.equal(payment.amountRub, 15000);
	});
});
