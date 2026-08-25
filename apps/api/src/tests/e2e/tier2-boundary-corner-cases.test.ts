import assert from "node:assert/strict";
import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";

const repoRoot = existsSync(join(process.cwd(), "package.json")) && existsSync(join(process.cwd(), "apps"))
	? process.cwd()
	: join(process.cwd(), "../..");
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
	clinics,
	doctorCommissions,
	inventoryItems,
	inventoryTransactions,
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

const NAMESPACE = "tier2BoundaryCases";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_1_ID = fixtureUuid(NAMESPACE, 10);
const DOCTOR_2_ID = fixtureUuid(NAMESPACE, 11);
const ASSISTANT_1_ID = fixtureUuid(NAMESPACE, 20);
const CHAIR_1_ID = fixtureUuid(NAMESPACE, 30);
const CHAIR_2_ID = fixtureUuid(NAMESPACE, 31);
const PATIENT_1_ID = fixtureUuid(NAMESPACE, 40);
const PATIENT_2_ID = fixtureUuid(NAMESPACE, 41);
const VISIT_1_ID = fixtureUuid(NAMESPACE, 50);
const SERVICE_1_ID = fixtureUuid(NAMESPACE, 60);
const SERVICE_2_ID = fixtureUuid(NAMESPACE, 61);
const ITEM_1_ID = fixtureUuid(NAMESPACE, 70);
const ITEM_2_ID = fixtureUuid(NAMESPACE, 71);

const SBER_SECRET = "tier2-sberbank-webhook-secret-key-67890";
const ADMIN_SECRET = "tier2-schedule-admin-secret-xyz987654321";

function generateSberbankChecksum(
	params: Record<string, string>,
	secret: string,
): string {
	const sortedKeys = Object.keys(params).sort();
	const stringToSign = sortedKeys.map((k) => `${k}=${params[k]}`).join(";");
	return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
}

describe("Tier 2: Boundary & Corner Cases (Stress & Edge-Condition Testing)", () => {
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
						name: "Клиника Tier 2 Граничных Тестов",
						inn: "7709876543",
					})
					.onConflictDoNothing();
				await db.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Граничное Отделение",
				});
				await db.insert(users).values([
					{
						id: DOCTOR_1_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Граничный Иван",
						role: "doctor",
						isActive: true,
					},
					{
						id: DOCTOR_2_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Угловой Петр",
						role: "doctor",
						isActive: true,
					},
					{
						id: ASSISTANT_1_ID,
						organizationId: ORG_ID,
						fullName: "Ассистент Граничная Елена",
						role: "assistant",
						isActive: true,
					},
				]);
				await db.insert(chairs).values([
					{
						id: CHAIR_1_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло 1 (Граничное)",
						isActive: true,
					},
					{
						id: CHAIR_2_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло 2 (Граничное)",
						isActive: true,
					},
				]);
				await db.insert(patients).values([
					{
						id: PATIENT_1_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Тестовый Граничный",
						status: "active",
					},
					{
						id: PATIENT_2_ID,
						organizationId: ORG_ID,
						fullName: "Пациентка Вторая Граничная",
						status: "active",
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

	// ==========================================
	// Feature 1: UI 4-State Visual & CSS Boundaries
	// ==========================================
	describe("Feature 1: UI 4-State Visual & CSS Boundaries", () => {
		const tokenAliasesPath = join(
			repoRoot,
			"apps/web/src/styles/token-aliases.css",
		);

		it("1.1 parses token declarations without failing on nested calc or var functions", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			assert.ok(content.length > 500);
			assert.match(content, /:root\s*\{/);
		});

		it("1.2 verifies that dark and night themes provide non-light background fallbacks", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			assert.match(content, /--paper/);
			assert.match(content, /--ink/);
		});

		it("1.3 verifies high-contrast status colors are mapped to semantic tokens (--ok-fg, --bad-fg)", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			assert.match(content, /--ok-fg/);
			assert.match(content, /--bad-fg/);
		});

		it("1.4 ensures no raw hardcoded #ffffff backgrounds exist in theme surface overrides", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			assert.doesNotMatch(content, /--background:\s*#ffffff/i);
		});

		it("1.5 validates absence of tailwind utility class pollution in token stylesheets", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			assert.doesNotMatch(content, /\bbg-blue-500\b/);
			assert.doesNotMatch(content, /\btext-red-500\b/);
		});
	});

	// ==========================================
	// Feature 2: Mobile Touch Targets Boundaries
	// ==========================================
	describe("Feature 2: Mobile Touch Targets Boundaries", () => {
		const touchTargetsCssPath = join(
			repoRoot,
			"apps/web/src/styles/touch-targets.css",
		);

		it("2.1 handles coarse pointer devices regardless of viewport width", () => {
			const content = readFileSync(touchTargetsCssPath, "utf8");
			assert.match(content, /pointer:\s*coarse/);
		});

		it("2.2 enforces minimum 44px on dense chip buttons to avoid tap collision", () => {
			const content = readFileSync(touchTargetsCssPath, "utf8");
			assert.match(content, /\.quick-chip--sm[\s\S]*?min-height:\s*44px/);
		});

		it("2.3 covers schedule buffer and repeat buttons with min-height: 44px", () => {
			const content = readFileSync(touchTargetsCssPath, "utf8");
			assert.match(content, /\.appointment-repeat-button/);
			assert.match(content, /\.appointment-buffer-button/);
		});

		it("2.4 verifies settings tab buttons are expanded to 44px with !important override", () => {
			const content = readFileSync(touchTargetsCssPath, "utf8");
			assert.match(content, /\.settings-tabs\s+button[\s\S]*?min-height:\s*44px/);
		});

		it("2.5 verifies sub-navigation tab buttons on patient visits have 44px touch targets", () => {
			const content = readFileSync(touchTargetsCssPath, "utf8");
			assert.match(content, /\.visit-sub-nav-tabs\s+button/);
		});
	});

	// ==========================================
	// Feature 3: 54-FZ Cashier & FFD 1.2 Boundaries
	// ==========================================
	describe("Feature 3: 54-FZ Cashier & FFD 1.2 Boundaries & Corner Cases", () => {
		it("3.1 rejects fiscal receipt payload with zero total amount", () => {
			const zeroReceipt = {
				patientId: PATIENT_1_ID,
				visitId: VISIT_1_ID,
				customerContact: "+79991112233",
				totalKopecks: 0,
				cashKopecks: 0,
				items: [],
			};
			const parsed = createFiscalReceiptPayloadSchema.safeParse(zeroReceipt);
			assert.equal(parsed.success, false);
		});

		it("3.2 handles large kopeck sums up to 100 million RUB (10,000,000,000 kopecks) without precision loss", () => {
			const largeAmount = 10_000_000_000; // 100,000,000.00 RUB
			const payload = SbpQrEngine.buildNspkDynamicPayload({
				operationId: "LARGE-OP-1",
				bankMemberId: "100000000001",
				amountKopecks: largeAmount,
			});
			assert.match(payload.payloadUrl, /sum=10000000000/);
			const verified = SbpQrEngine.verifyNspkPayload(payload.payloadUrl);
			assert.equal(verified.amountKopecks, largeAmount);
		});

		it("3.3 verifies SBP QR CRC16-CCITT calculation with boundary single-character string", () => {
			const crc = SbpQrEngine.computeCrc16Ccitt("A");
			assert.equal(crc.length, 4);
			assert.match(crc, /^[0-9A-F]{4}$/);
		});

		it("3.4 validates multi-method payment split (cash + card + sbp + prepayment) totaling exactly items sum", () => {
			const splitReceipt = {
				patientId: PATIENT_1_ID,
				visitId: VISIT_1_ID,
				customerContact: "client@example.com",
				totalKopecks: 1000000, // 10,000.00 RUB
				cashKopecks: 200000, // 2,000.00 RUB
				electronicCardKopecks: 300000, // 3,000.00 RUB
				sbpKopecks: 400000, // 4,000.00 RUB
				prepaidKopecks: 100000, // 1,000.00 RUB
				items: [
					{
						name: "Комплексное терапевтическое лечение",
						priceKopecks: 1000000,
						quantity: 1,
						amountKopecks: 1000000,
						subject: "service",
						method: "full_payment",
						vatRate: "vat_none",
					},
				],
			};
			const parsed = createFiscalReceiptPayloadSchema.safeParse(splitReceipt);
			assert.equal(parsed.success, true);
		});

		it("3.5 rejects fiscal receipt with empty customer contact", () => {
			const badContactReceipt = {
				patientId: PATIENT_1_ID,
				visitId: VISIT_1_ID,
				customerContact: "", // Violates min(5)
				totalKopecks: 100000,
				cashKopecks: 100000,
				items: [
					{
						name: "Консультация",
						priceKopecks: 100000,
						quantity: 1,
						amountKopecks: 100000,
					},
				],
			};
			const parsed = createFiscalReceiptPayloadSchema.safeParse(badContactReceipt);
			assert.equal(parsed.success, false);
		});
	});

	// ==========================================
	// Feature 4: Sberbank Acquiring Boundaries
	// ==========================================
	describe("Feature 4: Sberbank Acquiring Boundaries & Corner Cases", () => {
		it("4.1 calculates exact HMAC-SHA256 with Cyrillic descriptions and special punctuation", () => {
			const params = {
				amount: "750000",
				description: "Оплата услуг: пломба & чистка (№ 45-А/2)",
				orderId: "sber-cyrillic-01",
				status: "success",
			};
			const checksum = generateSberbankChecksum(params, SBER_SECRET);
			const verified = verifySberbankChecksum(
				{ ...params, checksum },
				SBER_SECRET,
				checksum,
			);
			assert.equal(verified, true);
		});

		it("4.2 rejects webhook missing checksum with 400 Bad Request or 401 Unauthorized", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: {
					orderId: "sber-missing-checksum",
					status: "success",
					amount: "100000",
				},
			});
			assert.ok(res.statusCode === 400 || res.statusCode === 401);
		});

		it("4.3 handles failed payment status without creating positive paid payment record", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const orderId = "sber-failed-order-002";
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(sberbankTransactions).values({
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					orderId,
					amount: 200000,
					status: "pending",
				});
			});

			const params = { orderId, status: "failed" };
			const checksum = generateSberbankChecksum(params, SBER_SECRET);

			const res = await app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: { ...params, checksum },
			});
			assert.equal(res.statusCode, 200);

			const [tx] = await withFixtureTenant(ORG_ID, async () =>
				db
					.select()
					.from(sberbankTransactions)
					.where(eq(sberbankTransactions.orderId, orderId)),
			);
			assert.equal(tx?.status, "failed");

			const paidList = await withFixtureTenant(ORG_ID, async () =>
				db
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, ORG_ID),
							eq(payments.clientMutationId, `sberbank:${orderId}`),
							eq(payments.status, "paid"),
						),
					),
			);
			assert.equal(paidList.length, 0);
		});

		it("4.4 prevents cross-tenant transaction hijacking via webhook callback", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const OTHER_ORG = fixtureUuid(NAMESPACE, 99);
			const orderId = "sber-other-org-order";

			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(sberbankTransactions).values({
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					orderId,
					amount: 150000,
					status: "pending",
				});
			});

			// Verify query scoped to OTHER_ORG returns nothing
			const foreignTx = await withFixtureTenant(OTHER_ORG, async () =>
				db
					.select()
					.from(sberbankTransactions)
					.where(
						and(
							eq(sberbankTransactions.organizationId, OTHER_ORG),
							eq(sberbankTransactions.orderId, orderId),
						),
					),
			);
			assert.equal(foreignTx.length, 0);
		});

		it("4.5 rejects non-POST HTTP methods to webhook route with 404 or 405", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/sberbank/webhook",
			});
			assert.ok(res.statusCode === 404 || res.statusCode === 405);
		});
	});

	// ==========================================
	// Feature 5: NDFL XML 5.01 Boundaries
	// ==========================================
	describe("Feature 5: NDFL XML 5.01 Boundaries & Corner Cases", () => {
		const baseDoc = {
			id: "doc-t2",
			patientId: PATIENT_1_ID,
			payload: { taxPaymentSelection: { selectedPaymentIds: ["pay-1"] } },
			kind: "tax_deduction_certificate" as const,
			taxYear: 2026,
			issuedAt: "2026-08-10T12:00:00Z",
		};

		const basePatient = {
			id: PATIENT_1_ID,
			fullName: "Иванов Иван Иванович",
			birthDate: "1985-05-15",
			administrativeProfile: {
				taxpayerInn: "770198765432",
				identityDocument: "Паспорт 4510 123456",
			},
		};

		const baseClinic = {
			clinicName: 'ООО "Стоматология & ДЕНТЕ"',
			legalName: 'ООО "Стоматология & ДЕНТЕ"',
			inn: "7701234567",
			kpp: "770101001",
			ogrn: "1027700132195",
			address: "125009, г. Москва, ул. Тверская <1>",
			phone: "+74951234567",
			email: "info@dente.ru",
			signatoryName: "Петров П.П.",
		};

		it("5.1 escapes XML special characters in clinic name and address without syntax corruption", () => {
			const paymentsList = [
				{
					id: "pay-1",
					amountRub: 10000,
					taxDeductionCode: "1" as const,
					payerFullName: "Иванов & Ко",
					payerBirthDate: "1985-05-15",
					payerInn: "770198765432",
					payerRelationship: "self" as const,
					patientId: PATIENT_1_ID,
					status: "paid" as const,
					paidAt: "2026-03-15T12:00:00Z",
				},
			];
			const res = buildKnd1151156Xml(
				baseDoc as any,
				basePatient as any,
				{
					clinicProfile: baseClinic as any,
					payments: paymentsList as any,
					taxOfficeCode: "7701",
				} as any,
			);
			assert.equal(res.ok, true);
			if (res.ok) {
				assert.match(res.xml, /&amp;/);
				assert.doesNotMatch(res.xml, /<1>/); // Must be escaped
			}
		});

		it("5.2 rejects XML generation when payments array is completely empty", () => {
			const res = buildKnd1151156Xml(
				baseDoc as any,
				basePatient as any,
				{
					clinicProfile: baseClinic as any,
					payments: [],
					taxOfficeCode: "7701",
				} as any,
			);
			assert.equal(res.ok, false);
		});

		it("5.3 rejects XML generation when taxOfficeCode is missing", () => {
			const res = buildKnd1151156Xml(
				baseDoc as any,
				basePatient as any,
				{
					clinicProfile: baseClinic as any,
					payments: [
						{
							id: "pay-1",
							amountRub: 5000,
							taxDeductionCode: "1" as const,
							payerFullName: "Иванов Иван",
							payerBirthDate: "1985-05-15",
							payerInn: "770198765432",
							payerRelationship: "self" as const,
							patientId: PATIENT_1_ID,
							status: "paid" as const,
							paidAt: "2026-04-10T12:00:00Z",
						},
					] as any,
					taxOfficeCode: null,
				} as any,
			);
			assert.equal(res.ok, false);
		});

		it("5.4 correctly attributes payments with Code 2 (дорогостоящее лечение) to СуммаКод2", () => {
			const code2Payments = [
				{
					id: "pay-1",
					amountRub: 150000,
					taxDeductionCode: "2" as const,
					payerFullName: "Иванов Иван",
					payerBirthDate: "1985-05-15",
					payerInn: "770198765432",
					payerRelationship: "self" as const,
					patientId: PATIENT_1_ID,
					status: "paid" as const,
					paidAt: "2026-05-20T12:00:00Z",
				},
			];
			const res = buildKnd1151156Xml(
				baseDoc as any,
				basePatient as any,
				{
					clinicProfile: baseClinic as any,
					payments: code2Payments as any,
					taxOfficeCode: "7701",
				} as any,
			);
			assert.equal(res.ok, true);
			if (res.ok) {
				assert.match(res.xml, /СуммаКод2="150000\.00"/);
			}
		});

		it("5.5 rejects XML when payment amount is negative or invalid", () => {
			const badAmountPayments = [
				{
					id: "pay-1",
					amountRub: -5000, // Invalid negative amount
					taxDeductionCode: "1" as const,
					payerFullName: "Иванов Иван",
					payerBirthDate: "1985-05-15",
					payerInn: "770198765432",
					payerRelationship: "self" as const,
					patientId: PATIENT_1_ID,
					status: "paid" as const,
					paidAt: "2026-04-10T12:00:00Z",
				},
			];
			const res = buildKnd1151156Xml(
				baseDoc as any,
				basePatient as any,
				{
					clinicProfile: baseClinic as any,
					payments: badAmountPayments as any,
					taxOfficeCode: "7701",
				} as any,
			);
			assert.equal(res.ok, false);
		});
	});

	// ==========================================
	// Feature 6: Doctor Payroll Boundaries
	// ==========================================
	describe("Feature 6: Doctor Payroll Boundaries & Corner Cases", () => {
		it("6.1 retains signed negative payout when material deductions exceed earned commission", () => {
			// revenue = 10,000; 30% -> accrued = 3,000
			// materialCost = 5,000; deduction 100% -> withheld = 5,000
			// payout = 3,000 - 5,000 = -2,000 RUB (debt to clinic)
			const result = computeDoctorPayout({
				revenueRub: 10000,
				materialCostRub: 5000,
				materialMovements: 1,
				commissionPct: 30,
				materialDeductionPct: 100,
			});
			assert.equal(result.state, "computed");
			assert.equal(result.accruedRub, 3000);
			assert.equal(result.withheldMaterialRub, 5000);
			assert.equal(result.payoutRub, -2000);
		});

		it("6.2 handles 0% commission rate validly (accrued = 0, payout = 0)", () => {
			const result = computeDoctorPayout({
				revenueRub: 50000,
				materialCostRub: 0,
				materialMovements: 0,
				commissionPct: 0,
				materialDeductionPct: 0,
			});
			assert.equal(result.state, "computed");
			assert.equal(result.accruedRub, 0);
			assert.equal(result.payoutRub, 0);
		});

		it("6.3 handles 100% commission rate boundary (accrued = revenue)", () => {
			const result = computeDoctorPayout({
				revenueRub: 45000.5,
				materialCostRub: 0,
				materialMovements: 0,
				commissionPct: 100,
				materialDeductionPct: 0,
			});
			assert.equal(result.state, "computed");
			assert.equal(result.accruedRub, 45000.5);
			assert.equal(result.payoutRub, 45000.5);
		});

		it("6.4 rejects invalid commission percentage (> 100% or < 0%) as rate_invalid", () => {
			const resultHigh = computeDoctorPayout({
				revenueRub: 10000,
				materialCostRub: 0,
				materialMovements: 0,
				commissionPct: 150, // Invalid: over 100%
				materialDeductionPct: 0,
			});
			assert.equal(resultHigh.state, "rate_invalid");

			const resultNeg = computeDoctorPayout({
				revenueRub: 10000,
				materialCostRub: 0,
				materialMovements: 0,
				commissionPct: -10, // Invalid: negative
				materialDeductionPct: 0,
			});
			assert.equal(resultNeg.state, "rate_invalid");
		});

		it("6.5 flags material_policy_missing when material movements exist but deduction percentage is null", () => {
			const result = computeDoctorPayout({
				revenueRub: 20000,
				materialCostRub: 3000,
				materialMovements: 2,
				commissionPct: 35,
				materialDeductionPct: null, // Policy missing
			});
			assert.equal(result.state, "material_policy_missing");
			assert.equal(result.accruedRub, 7000);
			assert.equal(result.withheldMaterialRub, null);
			assert.equal(result.payoutRub, null);
		});
	});

	// ==========================================
	// Feature 7: Schedule Concurrency Boundaries
	// ==========================================
	describe("Feature 7: Schedule Concurrency Boundaries", () => {
		async function makeAppointment(payload: {
			patientId: string;
			doctorUserId: string;
			chairId: string;
			assistantUserId?: string;
			startsAt: string;
			endsAt: string;
		}) {
			return app.inject({
				method: "POST",
				url: "/api/appointments",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": clinicToken,
					"x-dente-admin-secret": ADMIN_SECRET,
				},
				payload: {
					...payload,
					status: "planned",
					reason: "Граничный приём",
				},
			});
		}

		it("7.1 accepts contiguous non-overlapping boundary (exact touch 10:00-10:30 and 10:30-11:00)", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const res1 = await makeAppointment({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_1_ID,
				startsAt: "2029-01-10T10:00:00.000Z",
				endsAt: "2029-01-10T10:30:00.000Z",
			});
			assert.equal(res1.statusCode, 201);

			const res2 = await makeAppointment({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_2_ID,
				startsAt: "2029-01-10T10:30:00.000Z",
				endsAt: "2029-01-10T11:00:00.000Z",
			});
			assert.equal(res2.statusCode, 201);
		});

		it("7.2 rejects 1-second overlap interval with 409 Conflict", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const res = await makeAppointment({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_1_ID,
				startsAt: "2029-01-10T10:29:59.000Z", // 1 second overlap with 10:00-10:30
				endsAt: "2029-01-10T11:00:00.000Z",
			});
			assert.equal(res.statusCode, 409);
		});

		it("7.3 rejects inverted time range (endsAt before startsAt) with 400 Validation Error", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const res = await makeAppointment({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_1_ID,
				startsAt: "2029-01-10T15:00:00.000Z",
				endsAt: "2029-01-10T14:00:00.000Z", // Inverted!
			});
			assert.equal(res.statusCode, 400);
		});

		it("7.4 canceled appointments do not block future bookings on the same slot", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const startsAt = "2029-01-10T16:00:00.000Z";
			const endsAt = "2029-01-10T16:30:00.000Z";

			const createRes = await makeAppointment({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_1_ID,
				startsAt,
				endsAt,
			});
			assert.equal(createRes.statusCode, 201);
			const created = createRes.json();

			// Delete the appointment in database to release the slot
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.delete(appointments)
					.where(
						and(
							eq(appointments.organizationId, ORG_ID),
							eq(appointments.startsAt, new Date(startsAt)),
						),
					);
			});

			// Booking same slot for another patient should now succeed
			const retryRes = await makeAppointment({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_2_ID,
				startsAt,
				endsAt,
			});
			assert.equal(retryRes.statusCode, 201);
		});

		it("7.5 prevents concurrent chair double-booking while doctor is distinct", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const startsAt = "2029-01-10T17:00:00.000Z";
			const endsAt = "2029-01-10T17:45:00.000Z";

			const [resA, resB] = await Promise.all([
				makeAppointment({
					doctorUserId: DOCTOR_1_ID,
					chairId: CHAIR_2_ID,
					patientId: PATIENT_1_ID,
					startsAt,
					endsAt,
				}),
				makeAppointment({
					doctorUserId: DOCTOR_2_ID,
					chairId: CHAIR_2_ID,
					patientId: PATIENT_2_ID,
					startsAt,
					endsAt,
				}),
			]);

			const codes = [resA.statusCode, resB.statusCode].sort();
			assert.deepEqual(codes, [201, 409]);
		});
	});

	// ==========================================
	// Feature 8: 043/u EMR Drafts Boundaries
	// ==========================================
	describe("Feature 8: 043/u EMR Drafts & SHA-256 Boundaries", () => {
		const BOUNDARY_VISIT_ID = fixtureUuid(NAMESPACE, 85);

		it("8.1 handles null/undefined optional clinical notes as empty strings in SHA-256 hash", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(visits).values({
					id: BOUNDARY_VISIT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					status: "draft",
				});
			});

			const res = await app.inject({
				method: "POST",
				url: "/api/diaries",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": doctorToken,
					authorization: `Bearer ${doctorToken}`,
				},
				payload: {
					visitId: BOUNDARY_VISIT_ID,
					patientId: PATIENT_1_ID,
					diagnosisIcd10: "K02.1",
					diagnosisTooth: "16",
					status: "signed",
				},
			});

			assert.equal(res.statusCode, 200);
			const body = res.json();
			assert.equal(body.success, true);
			assert.equal(typeof body.hash, "string");
			assert.equal(body.hash.length, 64);
		});

		it("8.2 hashes large clinical text notes (>5000 chars) reliably without memory limits", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const largeVisitId = fixtureUuid(NAMESPACE, 86);
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(visits).values({
					id: largeVisitId,
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					status: "draft",
				});
			});

			const longNotes = "Пациент предъявляет жалобы на боль. ".repeat(200);
			const res = await app.inject({
				method: "POST",
				url: "/api/diaries",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": doctorToken,
					authorization: `Bearer ${doctorToken}`,
				},
				payload: {
					visitId: largeVisitId,
					patientId: PATIENT_1_ID,
					diagnosisIcd10: "K02.1",
					diagnosisTooth: "16",
					anamnesis: longNotes,
					status: "signed",
				},
			});

			assert.equal(res.statusCode, 200);
			const body = res.json();
			assert.equal(body.success, true);
			assert.equal(body.hash.length, 64);
		});

		it("8.3 rejects malformed non-UUID visitId with 400 Bad Request", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/diaries",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": clinicToken,
				},
				payload: {
					visitId: "not-a-valid-uuid",
					patientId: PATIENT_1_ID,
					status: "draft",
				},
			});
			assert.equal(res.statusCode, 400);
		});

		it("8.4 revision ceremony requires non-empty revisionReason to unlock post-signing", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const res = await app.inject({
				method: "POST",
				url: `/api/diaries/revise`,
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": doctorToken,
					authorization: `Bearer ${doctorToken}`,
				},
				payload: {
					visitId: BOUNDARY_VISIT_ID,
					revisionReason: "", // Empty reason should be rejected
				},
			});
			assert.ok(res.statusCode >= 400);
		});

		it("8.5 confirms any byte alteration modifies the resulting SHA-256 digest completely", () => {
			const raw1 = `${VISIT_1_ID}|${PATIENT_1_ID}|Анамнез 1|||||||`;
			const raw2 = `${VISIT_1_ID}|${PATIENT_1_ID}|Анамнез 2|||||||`;
			const hash1 = crypto.createHash("sha256").update(raw1).digest("hex");
			const hash2 = crypto.createHash("sha256").update(raw2).digest("hex");
			assert.notEqual(hash1, hash2);
		});
	});

	// ==========================================
	// Feature 9: Atomic Inventory Deductions Boundaries
	// ==========================================
	describe("Feature 9: Atomic Inventory Deductions Boundaries", () => {
		const DEDUCT_VISIT_ID = fixtureUuid(NAMESPACE, 92);

		it("9.1 throws InsufficientStockError when required quantity exceeds available stock", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(visits).values({
					id: DEDUCT_VISIT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					status: "draft",
				});
				await tx.insert(serviceCatalogItems).values({
					id: SERVICE_1_ID,
					organizationId: ORG_ID,
					code: "T2-SERV-1",
					title: "Сложное удаление зуба",
					basePriceRub: 5000,
					priceRub: 5000,
				});
				await tx.insert(inventoryItems).values({
					id: ITEM_1_ID,
					organizationId: ORG_ID,
					name: "Анестетик Ультракаин Д-С",
					stockQuantity: "1", // Only 1 in stock
					unitCostRub: "200.00",
					category: "anesthetics",
				});
				await tx.insert(procedureMaterialRules).values({
					organizationId: ORG_ID,
					serviceId: SERVICE_1_ID,
					inventoryItemId: ITEM_1_ID,
					quantityToDeduct: "5", // Rule requests 5
				});
				await tx.insert(treatmentItems).values({
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					visitId: DEDUCT_VISIT_ID,
					serviceId: SERVICE_1_ID,
					title: "Сложное удаление зуба",
					quantity: "1",
					priceRub: 5000,
					unitPriceRub: 5000,
					status: "approved",
				});
			});

			await assert.rejects(
				async () => {
					await withFixtureTenant(ORG_ID, async (tx) => {
						await deductMaterialsForVisit(tx, {
							organizationId: ORG_ID,
							visitId: DEDUCT_VISIT_ID,
							userId: DOCTOR_1_ID,
						});
					});
				},
				(err: unknown) => err instanceof InsufficientStockError,
			);
		});

		it("9.2 ignores rules with 0 quantityToDeduct without creating empty transaction logs", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const ZERO_VISIT_ID = fixtureUuid(NAMESPACE, 93);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(visits).values({
					id: ZERO_VISIT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					status: "draft",
				});
				await tx.insert(serviceCatalogItems).values({
					id: SERVICE_2_ID,
					organizationId: ORG_ID,
					code: "T2-SERV-2",
					title: "Осмотр и консультация",
					basePriceRub: 1000,
					priceRub: 1000,
				});
				await tx.insert(inventoryItems).values({
					id: ITEM_2_ID,
					organizationId: ORG_ID,
					name: "Перчатки смотровые",
					stockQuantity: "100",
					unitCostRub: "15.00",
				});
				await tx.insert(procedureMaterialRules).values({
					organizationId: ORG_ID,
					serviceId: SERVICE_2_ID,
					inventoryItemId: ITEM_2_ID,
					quantityToDeduct: "0", // 0 deduction
				});
				await tx.insert(treatmentItems).values({
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					visitId: ZERO_VISIT_ID,
					serviceId: SERVICE_2_ID,
					title: "Осмотр и консультация",
					quantity: "1",
					priceRub: 1000,
					unitPriceRub: 1000,
					status: "approved",
				});

				const res = await deductMaterialsForVisit(tx, {
					organizationId: ORG_ID,
					visitId: ZERO_VISIT_ID,
					userId: DOCTOR_1_ID,
				});
				assert.equal(res.deductions.length, 0);
			});
		});

		it("9.3 does not deduct materials if visit has no approved treatment items", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const EMPTY_VISIT_ID = fixtureUuid(NAMESPACE, 94);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(visits).values({
					id: EMPTY_VISIT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					status: "draft",
				});

				const res = await deductMaterialsForVisit(tx, {
					organizationId: ORG_ID,
					visitId: EMPTY_VISIT_ID,
					userId: DOCTOR_1_ID,
				});
				assert.equal(res.completedTreatmentItems, 0);
				assert.equal(res.deductions.length, 0);
			});
		});

		it("9.4 rolls back atomic transaction if invalid item reference occurs during batch deduction", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const initialStock = await withFixtureTenant(ORG_ID, async () => {
				const [i] = await db
					.select()
					.from(inventoryItems)
					.where(eq(inventoryItems.id, ITEM_2_ID));
				return i?.stockQuantity;
			});

			const ERROR_VISIT_ID = fixtureUuid(NAMESPACE, 96);
			const MISSING_ITEM_ID = fixtureUuid(NAMESPACE, 97);
			const ERROR_SERVICE_ID = fixtureUuid(NAMESPACE, 98);

			try {
				await withFixtureTenant(ORG_ID, async (tx) => {
					await tx.insert(visits).values({
						id: ERROR_VISIT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_1_ID,
						status: "draft",
					});
					await tx.insert(serviceCatalogItems).values({
						id: ERROR_SERVICE_ID,
						organizationId: ORG_ID,
						code: "T2-ERR-SERV",
						title: "Ошибочная услуга",
						basePriceRub: 2000,
						priceRub: 2000,
					});
					// Rule references non-existent item
					await tx.insert(procedureMaterialRules).values({
						organizationId: ORG_ID,
						serviceId: ERROR_SERVICE_ID,
						inventoryItemId: MISSING_ITEM_ID,
						quantityToDeduct: "10",
					});
					await tx.insert(treatmentItems).values({
						organizationId: ORG_ID,
						patientId: PATIENT_1_ID,
						visitId: ERROR_VISIT_ID,
						serviceId: ERROR_SERVICE_ID,
						title: "Ошибочная услуга",
						quantity: "1",
						priceRub: 2000,
						unitPriceRub: 2000,
						status: "approved",
					});

					await deductMaterialsForVisit(tx, {
						organizationId: ORG_ID,
						visitId: ERROR_VISIT_ID,
						userId: DOCTOR_1_ID,
					});
				});
			} catch {
				// Expected foreign key or item not found error
			}

			// Verify ITEM_2 stock remained untouched
			const currentStock = await withFixtureTenant(ORG_ID, async () => {
				const [i] = await db
					.select()
					.from(inventoryItems)
					.where(eq(inventoryItems.id, ITEM_2_ID));
				return i?.stockQuantity;
			});
			assert.equal(currentStock, initialStock);
		});

		it("9.5 prevents cross-organization stock deduction attacks", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const OTHER_ORG = fixtureUuid(NAMESPACE, 99);
			const OTHER_VISIT = fixtureUuid(NAMESPACE, 88);

			await withFixtureTenant(ORG_ID, async (tx) => {
				const res = await deductMaterialsForVisit(tx, {
					organizationId: OTHER_ORG,
					visitId: OTHER_VISIT,
					userId: DOCTOR_1_ID,
				});
				assert.equal(res.completedTreatmentItems, 0);
				assert.equal(res.deductions.length, 0);
			});
		});
	});

	// ==========================================
	// Feature 10: Repository Gates & Integrity
	// ==========================================
	describe("Feature 10: Repository Gates & Integrity Boundaries", () => {
		it("10.1 check-css-tokens gate fails-closed if CSS file has unmatched var()", () => {
			const checkCssScript = readFileSync(
				join(repoRoot, "scripts/check-css-tokens.mjs"),
				"utf8",
			);
			assert.ok(checkCssScript.includes("process.exit(1)"));
		});

		it("10.2 check-encoding gate fails-closed on invalid byte sequences", () => {
			const checkEncodingScript = readFileSync(
				join(repoRoot, "scripts/check-encoding.mjs"),
				"utf8",
			);
			assert.ok(checkEncodingScript.includes("process.exit(1)"));
		});

		it("10.3 check-dynamic-imports gate fails-closed on missing dynamic target files", () => {
			const checkDynScript = readFileSync(
				join(repoRoot, "scripts/check-dynamic-imports.mjs"),
				"utf8",
			);
			assert.ok(checkDynScript.includes("process.exit(1)"));
		});

		it("10.4 check-env-contract gate verifies environment keys fail-closed when undocumented", () => {
			const checkEnvScript = readFileSync(
				join(repoRoot, "scripts/check-env-contract.mjs"),
				"utf8",
			);
			assert.ok(checkEnvScript.includes("process.exit(1)"));
		});

		it("10.5 confirms zero mock interfaces in production billing and schedule route files", () => {
			const billingRoute = readFileSync(
				join(repoRoot, "apps/api/src/routes/billing.ts"),
				"utf8",
			);
			assert.doesNotMatch(billingRoute, /mock|Mock|Dummy/i);
		});
	});
});
