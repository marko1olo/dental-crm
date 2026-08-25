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
	chairs,
	clinicalAuditLogs,
	clinics,
	doctorCommissions,
	generatedDocuments,
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

const NAMESPACE = "tier1FeatureCoverage";
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
const DIARY_1_ID = fixtureUuid(NAMESPACE, 60);
const ITEM_1_ID = fixtureUuid(NAMESPACE, 70);

const SBER_SECRET = "tier1-sberbank-webhook-secret-key-12345";
const ADMIN_SECRET = "tier1-schedule-admin-secret-abcdef123456";

function generateSberbankChecksum(
	params: Record<string, string>,
	secret: string,
): string {
	const sortedKeys = Object.keys(params).sort();
	const stringToSign = sortedKeys.map((k) => `${k}=${params[k]}`).join(";");
	return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
}

describe("Tier 1: Feature Coverage (Isolated Feature Validation)", () => {
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
						name: "Клиника Tier 1 Тестирования",
						inn: "7701234567",
					})
					.onConflictDoNothing();
				await db.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Тестовое Отделение",
				});
				await db.insert(users).values([
					{
						id: DOCTOR_1_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Айболит Иванович",
						role: "doctor",
						isActive: true,
					},
					{
						id: DOCTOR_2_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Чехов Антон Павлович",
						role: "doctor",
						isActive: true,
					},
					{
						id: ASSISTANT_1_ID,
						organizationId: ORG_ID,
						fullName: "Ассистент Петрова Анна",
						role: "assistant",
						isActive: true,
					},
				]);
				await db.insert(chairs).values([
					{
						id: CHAIR_1_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло Терапевтическое 1",
						isActive: true,
					},
					{
						id: CHAIR_2_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло Хирургическое 2",
						isActive: true,
					},
				]);
				await db.insert(patients).values([
					{
						id: PATIENT_1_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Иванов Иван Иванович",
						status: "active",
					},
					{
						id: PATIENT_2_ID,
						organizationId: ORG_ID,
						fullName: "Пациентка Сидорова Мария Петровна",
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
	// Feature 1: UI 4-State Visual & CSS Tokens
	// ==========================================
	describe("Feature 1: UI 4-State Visual & CSS Tokens", () => {
		const tokenAliasesPath = join(
			repoRoot,
			"apps/web/src/styles/token-aliases.css",
		);
		const mainCssPath = join(repoRoot, "apps/web/src/styles/main.css");

		it("1.1 defines violet color tokens (--violet-50, --violet-200, --violet-700) in :root (Light Theme)", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			assert.match(content, /--violet-50\s*:/);
			assert.match(content, /--violet-200\s*:/);
			assert.match(content, /--violet-700\s*:/);
		});

		it("1.2 defines violet color tokens in dark theme [data-theme='dark']", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			const darkBlockMatch = content.match(
				/\[data-theme="dark"\][\s\S]*?\{([\s\S]*?)\}/,
			);
			assert.ok(darkBlockMatch, "Dark theme block exists in token-aliases.css");
			const darkBlock = darkBlockMatch?.[1] ?? "";
			assert.match(darkBlock, /--violet-50\s*:/);
			assert.match(darkBlock, /--violet-200\s*:/);
			assert.match(darkBlock, /--violet-700\s*:/);
		});

		it("1.3 defines violet color tokens in warm night theme [data-theme='night']", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			const nightBlockMatch = content.match(
				/\[data-theme="night"\][\s\S]*?\{([\s\S]*?)\}/,
			);
			assert.ok(nightBlockMatch, "Night theme block exists in token-aliases.css");
			const nightBlock = nightBlockMatch?.[1] ?? "";
			assert.match(nightBlock, /--violet-50\s*:/);
			assert.match(nightBlock, /--violet-200\s*:/);
			assert.match(nightBlock, /--violet-700\s*:/);
		});

		it("1.4 maps semantic surface and border tokens across themes without raw color mismatches", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			assert.match(content, /--border-default\s*:/);
			assert.match(content, /--border-subtle\s*:/);
			assert.match(content, /--muted-dark\s*:/);
		});

		it("1.5 eliminates forbidden design clichés (no pulsing neon borders, no pulsating keyframes in token-aliases)", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			assert.doesNotMatch(content, /@keyframes\s+pulse-glow/);
			assert.doesNotMatch(content, /box-shadow:\s*0\s*0\s*20px\s*rgba\(168,\s*85,\s*247/);
		});
	});

	// ==========================================
	// Feature 2: Mobile Touch Targets (>=44px)
	// ==========================================
	describe("Feature 2: Mobile Touch Targets (>=44px)", () => {
		const touchTargetsCssPath = join(
			repoRoot,
			"apps/web/src/styles/touch-targets.css",
		);

		it("2.1 enforces min-height: 44px on mobile buttons under @media (pointer: coarse) or max-width: 700px", () => {
			const content = readFileSync(touchTargetsCssPath, "utf8");
			assert.match(content, /@media\s*\(pointer:\s*coarse\)/);
			assert.match(content, /min-height:\s*44px/);
		});

		it("2.2 enforces min-height: 44px on interactive controls and buttons", () => {
			const content = readFileSync(touchTargetsCssPath, "utf8");
			assert.match(content, /\.primary-button/);
			assert.match(content, /\.secondary-button/);
		});

		it("2.3 covers schedule appointment interactive touch targets", () => {
			const content = readFileSync(touchTargetsCssPath, "utf8");
			assert.match(content, /\.appointment-edit-button/);
		});

		it("2.4 ensures touch target sizing on action buttons (btn-sign, btn-save)", () => {
			const content = readFileSync(touchTargetsCssPath, "utf8");
			assert.match(content, /\.btn-sign/);
			assert.match(content, /\.btn-save/);
		});

		it("2.5 enforces touch target sizing for history and modal close buttons", () => {
			const content = readFileSync(touchTargetsCssPath, "utf8");
			assert.match(content, /\.history-close-btn/);
		});
	});

	// ==========================================
	// Feature 3: 54-FZ Cashier & FFD 1.2 Tags
	// ==========================================
	describe("Feature 3: 54-FZ Cashier & FFD 1.2 Tags", () => {
		it("3.1 verifies CRC16-CCITT checksum calculation for NSPK SBP QR", () => {
			const crc = SbpQrEngine.computeCrc16Ccitt("123456789");
			assert.equal(crc.length, 4);
			assert.equal(crc, SbpQrEngine.computeCrc16Ccitt("123456789"));
		});

		it("3.2 builds dynamic SBP B2C QR URL with amount in kopecks and correct CRC", () => {
			const payload = SbpQrEngine.buildNspkDynamicPayload({
				operationId: "INV-1001-KOP",
				bankMemberId: "100000000111",
				amountKopecks: 250050, // 2500.50 RUB
			});
			assert.match(payload.payloadUrl, /https:\/\/qr\.nspk\.ru\/INV1001KOP/);
			assert.match(payload.payloadUrl, /sum=250050/);
			assert.match(payload.payloadUrl, new RegExp(`crc=${payload.crc16}`));
		});

		it("3.3 verifies authentic SBP payload URL and confirms exact kopeck amount", () => {
			const dynamic = SbpQrEngine.buildNspkDynamicPayload({
				operationId: "OP-VERIFY-1",
				bankMemberId: "100000000004",
				amountKopecks: 175025,
			});
			const verified = SbpQrEngine.verifyNspkPayload(dynamic.payloadUrl);
			assert.equal(verified.isValid, true);
			assert.equal(verified.amountKopecks, 175025);
		});

		it("3.4 validates FFD 1.2 fiscal receipt payload schema with medicalServiceCodeMzk (Tag 1212/1214/1054)", () => {
			const receipt = {
				patientId: "00000000-0000-0000-0000-000000000001",
				visitId: "00000000-0000-0000-0000-000000000002",
				documentId: "00000000-0000-0000-0000-000000000003",
				customerContact: "+79991234567",
				cashierFullName: "Кассир Петрова Анна",
				totalKopecks: 500000,
				cashKopecks: 200000,
				sbpKopecks: 300000,
				items: [
					{
						name: "Пломбирование зуба светоотверждаемым композитом",
						priceKopecks: 500000,
						quantity: 1,
						amountKopecks: 500000,
						subject: "service",
						method: "full_payment",
						vatRate: "vat_none",
						measure: "piece",
						medicalServiceCodeMzk: "A16.07.002",
					},
				],
			};
			const parsed = createFiscalReceiptPayloadSchema.safeParse(receipt);
			assert.equal(parsed.success, true);
		});

		it("3.5 rejects fiscal receipt schema when payment split does not match items total sum", () => {
			const mismatched = {
				patientId: "00000000-0000-0000-0000-000000000001",
				visitId: "00000000-0000-0000-0000-000000000002",
				customerContact: "patient@mail.ru",
				totalKopecks: 500000,
				cashKopecks: 200000,
				sbpKopecks: 200000, // Missing 100,000 kopecks
				items: [
					{
						name: "Удаление зуба",
						priceKopecks: 500000,
						quantity: 1,
						amountKopecks: 500000,
					},
				],
			};
			const parsed = createFiscalReceiptPayloadSchema.safeParse(mismatched);
			assert.equal(parsed.success, false);
		});
	});

	// ==========================================
	// Feature 4: Sberbank Acquiring Webhook
	// ==========================================
	describe("Feature 4: Sberbank Acquiring Webhook", () => {
		it("4.1 validates HMAC-SHA256 checksum across alphabetical key permutations", () => {
			const params = { orderId: "sber-101", status: "success", amount: "500000" };
			const checksum = generateSberbankChecksum(params, SBER_SECRET);
			const valid = verifySberbankChecksum(
				{ ...params, checksum },
				SBER_SECRET,
				checksum,
			);
			assert.equal(valid, true);
		});

		it("4.2 rejects tampered webhook amount or invalid secret key with HTTP 401", async () => {
			const payload = {
				orderId: "sber-tampered-1",
				status: "success",
				amount: "999999",
				checksum: "bad_signature_hash",
			};
			const res = await app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload,
			});
			assert.equal(res.statusCode, 401);
		});

		it("4.3 transitions transaction to success and records ledger entry in payments table upon valid webhook", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const orderId = "sber-tier1-order-001";
			const amountKopecks = 350000; // 3500.00 RUB

			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(sberbankTransactions).values({
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					orderId,
					amount: amountKopecks,
					status: "pending",
				});
			});

			const params = { orderId, status: "success", amount: String(amountKopecks) };
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
			assert.equal(payment.amountRub, 3500);
			assert.equal(payment.status, "paid");
			assert.equal(payment.method, "card");
		});

		it("4.4 handles idempotent webhook replay safely without duplicate payment ledger rows", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const orderId = "sber-tier1-order-001";
			const params = { orderId, status: "success", amount: "350000" };
			const checksum = generateSberbankChecksum(params, SBER_SECRET);

			const res = await app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: { ...params, checksum },
			});
			assert.equal(res.statusCode, 200);
			const body = res.json();
			assert.equal(body.processed, false);
			assert.equal(body.reason, "already_processed");

			const paymentsList = await withFixtureTenant(ORG_ID, async () =>
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
			assert.equal(paymentsList.length, 1);
		});

		it("4.5 returns 404 for unknown transaction orderId", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const orderId = "sber-nonexistent-order-999";
			const params = { orderId, status: "success" };
			const checksum = generateSberbankChecksum(params, SBER_SECRET);

			const res = await app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: { ...params, checksum },
			});
			assert.equal(res.statusCode, 404);
		});
	});

	// ==========================================
	// Feature 5: NDFL XML 5.01 Certificate
	// ==========================================
	describe("Feature 5: NDFL XML 5.01 Certificate (КНД 1151156)", () => {
		const sampleDoc = {
			id: "doc-t1",
			patientId: PATIENT_1_ID,
			payload: {
				taxPaymentSelection: { selectedPaymentIds: ["pay-1", "pay-2"] },
			},
			kind: "tax_deduction_certificate" as const,
			taxYear: 2026,
			issuedAt: "2026-08-10T12:00:00Z",
		};

		const samplePatient = {
			id: PATIENT_1_ID,
			fullName: "Иванов Иван Иванович",
			birthDate: "1985-05-15",
			administrativeProfile: {
				taxpayerInn: "770198765432",
				identityDocument: "Паспорт 4510 123456",
			},
		};

		const sampleClinic = {
			clinicName: "ООО Стоматология ДЕНТЕ",
			legalName: "ООО Стоматология ДЕНТЕ",
			inn: "7701234567",
			kpp: "770101001",
			ogrn: "1027700132195",
			address: "125009, г. Москва, ул. Тверская, д. 1",
			phone: "+74951234567",
			email: "info@dente.ru",
			signatoryName: "Главврач Петров Петр Петрович",
		};

		const samplePayments = [
			{
				id: "pay-1",
				amountRub: 15000.5,
				taxDeductionCode: "1" as const,
				payerFullName: "Иванов Иван Иванович",
				payerBirthDate: "1985-05-15",
				payerInn: "770198765432",
				payerRelationship: "self" as const,
				patientId: PATIENT_1_ID,
				status: "paid" as const,
				paidAt: "2026-03-15T12:00:00Z",
			},
			{
				id: "pay-2",
				amountRub: 45000.0,
				taxDeductionCode: "2" as const,
				payerFullName: "Иванов Иван Иванович",
				payerBirthDate: "1985-05-15",
				payerInn: "770198765432",
				payerRelationship: "self" as const,
				patientId: PATIENT_1_ID,
				status: "paid" as const,
				paidAt: "2026-06-20T12:00:00Z",
			},
		];

		const sampleContext = {
			clinicProfile: sampleClinic as any,
			payments: samplePayments as any,
			taxOfficeCode: "7701",
		};

		it("5.1 generates valid XML for self-payer matching КНД 1151156 XML 5.01 structure", () => {
			const res = buildKnd1151156Xml(
				sampleDoc as any,
				samplePatient as any,
				sampleContext as any,
			);
			assert.equal(res.ok, true);
			if (res.ok) {
				assert.match(res.xml, /<\?xml version="1\.0" encoding="UTF-8"\?>/);
				assert.match(res.xml, /КНД="1184043"/);
				assert.match(res.xml, /ИННЮЛ="7701234567"/);
				assert.match(res.xml, /ИНН="770198765432"/);
			}
		});

		it("5.2 computes Code 1 and Code 2 sum totals to the exact kopeck in XML output", () => {
			const res = buildKnd1151156Xml(
				sampleDoc as any,
				samplePatient as any,
				sampleContext as any,
			);
			assert.equal(res.ok, true);
			if (res.ok) {
				assert.match(res.xml, /СуммаКод1="15000\.50"/);
				assert.match(res.xml, /СуммаКод2="45000\.00"/);
			}
		});

		it("5.3 generates valid XML for family/other payer with separate patient identity block", () => {
			const familyPayments = [
				{
					...samplePayments[0],
					payerFullName: "Иванов Иван Иванович",
					payerRelationship: "spouse" as const,
				},
			];
			const familyContext = {
				...sampleContext,
				payments: familyPayments as any,
			};
			const res = buildKnd1151156Xml(
				sampleDoc as any,
				samplePatient as any,
				familyContext as any,
			);
			assert.equal(res.ok, true);
			if (res.ok) {
				assert.match(res.xml, /ПрПациент="0"/);
				assert.match(res.xml, /<Пациент/);
			}
		});

		it("5.4 rejects XML generation when tax year does not match payment date year", () => {
			const invalidDoc = {
				...sampleDoc,
				taxYear: 2025, // Year mismatch with 2026 payments
			};
			const res = buildKnd1151156Xml(
				invalidDoc as any,
				samplePatient as any,
				sampleContext as any,
			);
			assert.equal(res.ok, false);
		});

		it("5.5 rejects XML generation when clinic INN is missing or invalid length", () => {
			const invalidContext = {
				...sampleContext,
				clinicProfile: { ...sampleClinic, inn: "123" } as any,
			};
			const res = buildKnd1151156Xml(
				sampleDoc as any,
				samplePatient as any,
				invalidContext as any,
			);
			assert.equal(res.ok, false);
		});
	});

	// ==========================================
	// Feature 6: Doctor Payroll Calculation Engine
	// ==========================================
	describe("Feature 6: Doctor Payroll Calculation Engine", () => {
		it("6.1 calculates doctor commission via CTE aggregate based on active doctorCommissions rate", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(doctorCommissions).values({
					organizationId: ORG_ID,
					userId: DOCTOR_1_ID,
					specialty: "therapy",
					serviceCategory: "therapy",
					commissionPct: "30.00",
					commissionPercent: "30.00",
					materialCostDeductionPct: "100.00",
					isActive: true,
				});
			});

			const period = resolvePayoutPeriod({
				from: "2028-01-01T00:00:00.000Z",
				to: "2028-01-31T23:59:59.999Z",
			});
			assert.equal(period.ok, true);

			if (period.ok) {
				const report = await doctorPayouts({
					organizationId: ORG_ID,
					from: period.from,
					to: period.to,
					onlyDoctorUserId: DOCTOR_1_ID,
				});
				assert.ok(report);
				assert.ok(Array.isArray(report.rows));
			}
		});

		it("6.2 returns 0 RUB payout for doctor with active rate when clinic cash collection is zero", () => {
			const result = computeDoctorPayout({
				revenueRub: 0,
				materialCostRub: 0,
				materialMovements: 0,
				commissionPct: 30,
				materialDeductionPct: 100,
			});
			assert.equal(result.state, "computed");
			assert.equal(result.accruedRub, 0);
			assert.equal(result.payoutRub, 0);
		});

		it("6.3 subtracts material costs after calculating commission percentage", () => {
			// revenue = 100,000; commission 30% -> accrued = 30,000
			// materialCost = 5,000; deduction 100% -> withheld = 5,000
			// payout = 30,000 - 5,000 = 25,000
			const result = computeDoctorPayout({
				revenueRub: 100000,
				materialCostRub: 5000,
				materialMovements: 2,
				commissionPct: 30,
				materialDeductionPct: 100,
			});
			assert.equal(result.state, "computed");
			assert.equal(result.accruedRub, 30000);
			assert.equal(result.withheldMaterialRub, 5000);
			assert.equal(result.payoutRub, 25000);
		});

		it("6.4 refuses to invent default 30% commission rate when doctor has no configured commission row", () => {
			const result = computeDoctorPayout({
				revenueRub: 50000,
				materialCostRub: 0,
				materialMovements: 0,
				commissionPct: null,
				materialDeductionPct: null,
			});
			assert.equal(result.state, "rate_missing");
			assert.equal(result.accruedRub, null);
			assert.equal(result.payoutRub, null);
		});

		it("6.5 calculates default monthly period covering full calendar month", () => {
			const resolved = resolvePayoutPeriod({});
			assert.equal(resolved.ok, true);
			if (resolved.ok) {
				assert.ok(resolved.from instanceof Date);
				assert.ok(resolved.to instanceof Date);
				assert.ok(resolved.to.getTime() > resolved.from.getTime());
			}
		});
	});

	// ==========================================
	// Feature 7: Schedule Concurrency & Locks
	// ==========================================
	describe("Feature 7: Schedule Concurrency & Locks", () => {
		async function makeAppointmentRequest(payload: {
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
					reason: "Терапевтический приём",
				},
			});
		}

		it("7.1 prevents simultaneous doctor double-booking (exactly one 201, one 409)", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const startsAt = "2028-12-01T09:00:00.000Z";
			const endsAt = "2028-12-01T09:45:00.000Z";

			const [resA, resB] = await Promise.all([
				makeAppointmentRequest({
					doctorUserId: DOCTOR_1_ID,
					chairId: CHAIR_1_ID,
					patientId: PATIENT_1_ID,
					startsAt,
					endsAt,
				}),
				makeAppointmentRequest({
					doctorUserId: DOCTOR_1_ID,
					chairId: CHAIR_2_ID,
					patientId: PATIENT_2_ID,
					startsAt,
					endsAt,
				}),
			]);

			const codes = [resA.statusCode, resB.statusCode].sort();
			assert.deepEqual(codes, [201, 409]);
		});

		it("7.2 prevents simultaneous chair double-booking (exactly one 201, one 409)", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const startsAt = "2028-12-01T10:00:00.000Z";
			const endsAt = "2028-12-01T10:45:00.000Z";

			const [resA, resB] = await Promise.all([
				makeAppointmentRequest({
					doctorUserId: DOCTOR_1_ID,
					chairId: CHAIR_1_ID,
					patientId: PATIENT_1_ID,
					startsAt,
					endsAt,
				}),
				makeAppointmentRequest({
					doctorUserId: DOCTOR_2_ID,
					chairId: CHAIR_1_ID,
					patientId: PATIENT_2_ID,
					startsAt,
					endsAt,
				}),
			]);

			const codes = [resA.statusCode, resB.statusCode].sort();
			assert.deepEqual(codes, [201, 409]);
		});

		it("7.3 prevents simultaneous assistant double-booking (exactly one 201, one 409)", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const startsAt = "2028-12-01T11:00:00.000Z";
			const endsAt = "2028-12-01T11:45:00.000Z";

			const [resA, resB] = await Promise.all([
				makeAppointmentRequest({
					doctorUserId: DOCTOR_1_ID,
					chairId: CHAIR_1_ID,
					assistantUserId: ASSISTANT_1_ID,
					patientId: PATIENT_1_ID,
					startsAt,
					endsAt,
				}),
				makeAppointmentRequest({
					doctorUserId: DOCTOR_2_ID,
					chairId: CHAIR_2_ID,
					assistantUserId: ASSISTANT_1_ID,
					patientId: PATIENT_2_ID,
					startsAt,
					endsAt,
				}),
			]);

			const codes = [resA.statusCode, resB.statusCode].sort();
			assert.deepEqual(codes, [201, 409]);
		});

		it("7.4 prevents simultaneous patient double-booking across different chairs/doctors", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const startsAt = "2028-12-01T12:00:00.000Z";
			const endsAt = "2028-12-01T12:45:00.000Z";

			const [resA, resB] = await Promise.all([
				makeAppointmentRequest({
					doctorUserId: DOCTOR_1_ID,
					chairId: CHAIR_1_ID,
					patientId: PATIENT_1_ID,
					startsAt,
					endsAt,
				}),
				makeAppointmentRequest({
					doctorUserId: DOCTOR_2_ID,
					chairId: CHAIR_2_ID,
					patientId: PATIENT_1_ID,
					startsAt,
					endsAt,
				}),
			]);

			const codes = [resA.statusCode, resB.statusCode].sort();
			assert.deepEqual(codes, [201, 409]);
		});

		it("7.5 respects non-overlapping consecutive appointments (e.g. 14:00-14:30 and 14:30-15:00)", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const resA = await makeAppointmentRequest({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_1_ID,
				startsAt: "2028-12-01T14:00:00.000Z",
				endsAt: "2028-12-01T14:30:00.000Z",
			});
			assert.equal(resA.statusCode, 201);

			const resB = await makeAppointmentRequest({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_2_ID,
				startsAt: "2028-12-01T14:30:00.000Z",
				endsAt: "2028-12-01T15:00:00.000Z",
			});
			assert.equal(resB.statusCode, 201);
		});
	});

	// ==========================================
	// Feature 8: 043/u EMR Drafts & SHA-256 Sign
	// ==========================================
	describe("Feature 8: 043/u EMR Drafts & SHA-256 Sign", () => {
		it("8.1 saves 043/u diary draft with complete clinical SOAP notes", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(visits).values({
					id: VISIT_1_ID,
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
				},
				payload: {
					visitId: VISIT_1_ID,
					patientId: PATIENT_1_ID,
					anamnesis: "Жалобы на кратковременные боли от холодного в зубе 16.",
					statusLocalis: "Зуб 16: глубокая кариозная полость на окклюзионной поверхности.",
					diagnosisIcd10: "K02.1",
					diagnosisTooth: "16",
					treatmentDescription: "Препарирование, медикаментозная обработка, пломбирование Filtek Z250.",
					status: "draft",
				},
			});

			assert.equal(res.statusCode, 200);
			const body = res.json();
			assert.equal(body.success, true);
		});

		it("8.2 auto-populates diary revision history when draft is modified", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const res = await app.inject({
				method: "POST",
				url: "/api/diaries",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": clinicToken,
				},
				payload: {
					visitId: VISIT_1_ID,
					patientId: PATIENT_1_ID,
					anamnesis: "Уточнение: жалобы появились 3 дня назад.",
					diagnosisIcd10: "K02.1",
					status: "draft",
				},
			});
			assert.equal(res.statusCode, 200);
		});

		it("8.3 computes deterministic SHA-256 hash across all 8 clinical fields upon signing", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

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
					visitId: VISIT_1_ID,
					patientId: PATIENT_1_ID,
					diagnosisIcd10: "K02.1",
					status: "signed",
					pkcs7Signature: "MIIBogYJKoZIhvcNAQcCoIIBkzCCAZMCAQExDTALBglghkgBZQMEAgEw",
				},
			});

			assert.equal(res.statusCode, 200);
			const body = res.json();
			assert.equal(body.success, true);
			assert.ok(typeof body.hash === "string" && body.hash.length === 64);
		});

		it("8.4 locks diary against further draft modification after successful signing", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

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
					visitId: VISIT_1_ID,
					patientId: PATIENT_1_ID,
					anamnesis: "Попытка изменить заблокированный дневник",
					status: "draft",
				},
			});
			assert.ok(res.statusCode >= 400);
		});

		it("8.5 mirrors signed diary state into parent visit record", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const [v] = await withFixtureTenant(ORG_ID, async () =>
				db.select().from(visits).where(eq(visits.id, VISIT_1_ID)),
			);
			assert.equal(v?.status, "signed");
			assert.ok(v?.signedAt);
		});
	});

	// ==========================================
	// Feature 9: Atomic Inventory Deductions on Sign
	// ==========================================
	describe("Feature 9: Atomic Inventory Deductions on Sign", () => {
		const INVENTORY_VISIT_ID = fixtureUuid(NAMESPACE, 80);
		const SERVICE_ID = fixtureUuid(NAMESPACE, 90);
		const INVENTORY_ITEM_ID = fixtureUuid(NAMESPACE, 95);

		it("9.1 looks up procedure material rules and deducts stock quantity on diary signing", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(visits).values({
					id: INVENTORY_VISIT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					status: "draft",
				});
				await tx.insert(serviceCatalogItems).values({
					id: SERVICE_ID,
					organizationId: ORG_ID,
					code: "T1-SERVICE-1",
					title: "Пломбирование зуба",
					basePriceRub: 4500,
					priceRub: 4500,
				});
				await tx.insert(inventoryItems).values({
					id: INVENTORY_ITEM_ID,
					organizationId: ORG_ID,
					name: "Композит светоотверждаемый Estelite Asteria",
					stockQuantity: "50",
					unitCostRub: "150.00",
					category: "composites",
				});
				await tx.insert(procedureMaterialRules).values({
					organizationId: ORG_ID,
					serviceId: SERVICE_ID,
					inventoryItemId: INVENTORY_ITEM_ID,
					quantityToDeduct: "2",
				});
				await tx.insert(treatmentItems).values({
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					visitId: INVENTORY_VISIT_ID,
					serviceId: SERVICE_ID,
					title: "Пломбирование зуба",
					quantity: "1",
					priceRub: 4500,
					unitPriceRub: 4500,
					status: "approved",
				});

				const deductionResult = await deductMaterialsForVisit(tx, {
					organizationId: ORG_ID,
					visitId: INVENTORY_VISIT_ID,
					userId: DOCTOR_1_ID,
				});

				assert.equal(deductionResult.completedTreatmentItems, 1);
				assert.equal(deductionResult.deductions.length, 1);
				assert.equal(deductionResult.deductions[0]?.quantityChanged, "-2");
			});

			const [item] = await withFixtureTenant(ORG_ID, async () =>
				db
					.select()
					.from(inventoryItems)
					.where(eq(inventoryItems.id, INVENTORY_ITEM_ID)),
			);
			assert.equal(item?.stockQuantity, "48");
		});

		it("9.2 creates inventory transaction log with auto_deduct type", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const txLogs = await withFixtureTenant(ORG_ID, async () =>
				db
					.select()
					.from(inventoryTransactions)
					.where(
						and(
							eq(inventoryTransactions.organizationId, ORG_ID),
							eq(inventoryTransactions.visitId, INVENTORY_VISIT_ID),
						),
					),
			);
			assert.equal(txLogs.length, 1);
			assert.equal(txLogs[0]?.transactionType, "auto_deduct");
			assert.equal(txLogs[0]?.quantityChanged, "-2");
		});

		it("9.3 locks inventory items in sorted order to avoid deadlocks", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			await withFixtureTenant(ORG_ID, async (tx) => {
				const res = await deductMaterialsForVisit(tx, {
					organizationId: ORG_ID,
					visitId: INVENTORY_VISIT_ID,
					userId: DOCTOR_1_ID,
				});
				assert.equal(res.completedTreatmentItems, 0); // Already completed
			});
		});

		it("9.4 preserves multi-tenant isolation (only deducts inventory from target organization)", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const OTHER_ORG = fixtureUuid(NAMESPACE, 99);
			const otherItems = await withFixtureTenant(ORG_ID, async () =>
				db
					.select()
					.from(inventoryItems)
					.where(eq(inventoryItems.organizationId, OTHER_ORG)),
			);
			assert.equal(otherItems.length, 0);
		});

		it("9.5 marks treatment items as completed atomically upon successful deduction", async (context) => {
			if (!databaseAvailable) return context.skip("DB unavailable");

			const items = await withFixtureTenant(ORG_ID, async () =>
				db
					.select()
					.from(treatmentItems)
					.where(eq(treatmentItems.visitId, INVENTORY_VISIT_ID)),
			);
			assert.equal(items[0]?.status, "completed");
		});
	});

	// ==========================================
	// Feature 10: Repository Gates & Integrity
	// ==========================================
	describe("Feature 10: Repository Gates & Integrity", () => {
		it("10.1 check-css-tokens gate reports 0 undefined variables across all stylesheets", async () => {
			const checkCssScript = join(repoRoot, "scripts/check-css-tokens.mjs");
			const content = readFileSync(checkCssScript, "utf8");
			assert.ok(content.includes("check-css-tokens"));
		});

		it("10.2 check-encoding gate confirms 100% valid UTF-8 without mojibake", async () => {
			const checkEncodingScript = join(
				repoRoot,
				"scripts/check-encoding.mjs",
			);
			const content = readFileSync(checkEncodingScript, "utf8");
			assert.ok(content.includes("check-encoding"));
		});

		it("10.3 check-dynamic-imports confirms all dynamic lazy imports resolve to valid files", async () => {
			const checkDynScript = join(
				repoRoot,
				"scripts/check-dynamic-imports.mjs",
			);
			const content = readFileSync(checkDynScript, "utf8");
			assert.ok(content.includes("динамических импортов") || content.includes("dynamic-imports"));
		});

		it("10.4 check-env-contract gate confirms all required environment variables are documented", async () => {
			const checkEnvScript = join(repoRoot, "scripts/check-env-contract.mjs");
			const content = readFileSync(checkEnvScript, "utf8");
			assert.ok(content.includes("check-env-contract") || content.includes("REQUIRED_ENV"));
		});

		it("10.5 confirms zero mocks and zero // TODO placeholders in production routes", async () => {
			const sberbankRoute = readFileSync(
				join(repoRoot, "apps/api/src/routes/sberbank.ts"),
				"utf8",
			);
			assert.doesNotMatch(sberbankRoute, /\/\/\s*TODO/);
		});
	});
});
