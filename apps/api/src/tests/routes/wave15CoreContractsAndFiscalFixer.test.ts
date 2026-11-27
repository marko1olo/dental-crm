import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import {
	clinicalPricelistCategoryItemSchema,
	CryptoProNativeError,
	expenseRecordSchema,
	fetchCryptoProNativeStatus,
	generateQrCodeSvg,
	generateQrMatrix,
	invoiceItemSchema,
	invoiceSchema,
	normalizeInvoiceItem,
	patientAdministrativeProfileBaseSchema,
	patientSchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	familyGroups,
	fiscalReceiptQueue,
	organizations,
	patientInvoices,
	patients,
	payments,
	sberbankTransactions,
	users,
} from "../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../db/seeds/seed_cash_and_reasons.js";
import { getClinicFiscalSettingsFromDb } from "../../db/settings/clinicFiscalQueries.js";
import { registerClinicalProtocolRoutes } from "../../routes/clinicalRoutes/clinicalProtocolHandlers.js";
import { registerDemoRoutes } from "../../routes/demo/index.js";
import { registerFiscalReceiptRoutes } from "../../routes/fiscal/fiscalReceiptRoutes.js";
import { fiscalCorrectionPayloadSchema } from "../../routes/fiscal/receiptRoutes/correction/receiptCorrectionValidation.js";
import { registerPatientRelationshipsRoutes } from "../../routes/patientRelationships.js";
import { registerPricelistRoutes } from "../../routes/pricelist.js";
import { registerSbpRoutes } from "../../routes/sbp/index.js";
import { handleSbpWebhookRefund } from "../../routes/sbp/sbpWebhookRefund.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { processFamilyRefund } from "../../services/familyWallet/modules/familyRefundOperation.js";
import { FiscalRetryPolicy } from "../../services/fiscalResilience/fiscalRetryPolicy.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createIdempotentTenantTestApp } from "../support/tenantTestApp.js";

const TEST_NS = `wave15CoreContractsAndFiscalFixer:${crypto.randomUUID()}`;
const ORG_A_ID = fixtureUuid(TEST_NS, 1);
const ORG_B_ID = fixtureUuid(TEST_NS, 2);
const DOCTOR_A_ID = fixtureUuid(TEST_NS, 3);
const PATIENT_A1_ID = fixtureUuid(TEST_NS, 4);
const PATIENT_A2_ID = fixtureUuid(TEST_NS, 5);
const PATIENT_B1_ID = fixtureUuid(TEST_NS, 6);
const INVOICE_A1_ID = fixtureUuid(TEST_NS, 7);
const INVOICE_B1_ID = fixtureUuid(TEST_NS, 8);
const FAMILY_A_ID = fixtureUuid(TEST_NS, 9);

function isDbUnavailable(err: unknown): boolean {
	if (!err) return false;
	const msg = err instanceof Error ? err.message : String(err);
	const causeMsg =
		typeof err === "object" && err !== null && "cause" in err && err.cause instanceof Error
			? err.cause.message
			: "";
	return /ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|getaddrinfo|Connection terminated|password authentication failed|database "[^"]*" does not exist|role "[^"]*" does not exist/i.test(
		`${msg} ${causeMsg}`,
	);
}

describe("Wave 15 Core Contracts, Security Guards & Fiscal Integrity Regression Suite", () => {
	describe("1. Shared Core Contracts, QR SVG Escaping, Kopecks & Strict Schemas", () => {
		it("escapes XML/XSS in QR SVG title and sanitizes color/size attributes", () => {
			const svg = generateQrCodeSvg("https://qr.nspk.ru/AD100001", {
				title: `<script>alert("xss")</script> & Тест`,
				colorDark: `red" onload="alert(1)`,
				colorLight: "#ffffff",
				size: 200,
				margin: 4,
			});
			assert.equal(svg.includes("<script>"), false);
			assert.equal(svg.includes(`onload="alert`), false);
			assert.equal(svg.includes("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; Тест"), true);
			assert.equal(svg.includes(`fill="#000000"`), true);
		});

		it("generateQrMatrix generates valid square modules with optimal mask selection", () => {
			const qr = generateQrMatrix("ST00012|Name=Клиника|Sum=150000", "M");
			assert.equal(qr.matrix.length, qr.size);
			assert.ok(qr.size >= 21);
			assert.ok(qr.version >= 1);
		});

		it("invoiceContract rejects unknown keys via .strict() and eliminates float drift in normalizeInvoiceItem", () => {
			const extraItem = invoiceItemSchema.safeParse({
				id: "item-1",
				name: "Консультация",
				quantity: 1,
				unitPriceRub: 1000,
				totalRub: 1000,
				injectedField: true,
			});
			assert.equal(extraItem.success, false);

			const extraInvoice = invoiceSchema.safeParse({
				id: "inv-1",
				organizationId: ORG_A_ID,
				patientId: PATIENT_A1_ID,
				visitId: null,
				status: "issued",
				totalAmountRub: 1000,
				paidAmountRub: 0,
				items: [],
				createdAt: new Date().toISOString(),
				unexpectedFlag: "x",
			});
			assert.equal(extraInvoice.success, false);

			// Classic float trap: 19.99 * 3 - 0.01 === 59.96000000000001 in raw JS float
			const normalized = normalizeInvoiceItem({
				name: "Анестезия",
				quantity: 3,
				priceRub: 19.99,
				discountRub: 0.01,
			});
			assert.equal(normalized.totalRub, 59.96);
			assert.equal(normalized.totalAmountRub, 59.96);
		});

		it("strict schemas across patient, expense, pricelist category, and fiscal correction reject unknown fields", () => {
			assert.equal(
				patientAdministrativeProfileBaseSchema.safeParse({ extra: 1 }).success,
				false,
			);
			assert.equal(
				patientSchema.safeParse({
					id: PATIENT_A1_ID,
					organizationId: ORG_A_ID,
					status: "active",
					fullName: "Тест",
					birthDate: null,
					phone: null,
					email: null,
					notes: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					extraKey: "nope",
				}).success,
				false,
			);
			assert.equal(
				expenseRecordSchema.safeParse({
					organizationId: ORG_A_ID,
					category: "rent",
					amountKopecks: 10000,
					expenseDate: "2026-11-26",
					unknownField: 123,
				}).success,
				false,
			);
			assert.equal(
				clinicalPricelistCategoryItemSchema.safeParse({
					id: 1,
					nameRu: "Терапия",
					slug: "therapy",
					badKey: true,
				}).success,
				false,
			);

			const validCorrection = fiscalCorrectionPayloadSchema.safeParse({
				patientId: PATIENT_A1_ID,
				operationType: "income",
				taxationSystem: "usn_income",
				totalKopecks: 150000,
				electronicCardKopecks: 150000,
				isCorrection: true,
				correctionType: "self_initiated",
				correctionDocDate: "2026-11-26",
				correctionDocNumber: "CORR-1",
				correctionDescription: "Автономный чек после отключения сети",
				items: [
					{
						name: "Профессиональная гигиена",
						priceKopecks: 150000,
						quantity: 1,
						amountKopecks: 150000,
					},
				],
			});
			assert.equal(validCorrection.success, true);

			const invalidExtraCorrection = fiscalCorrectionPayloadSchema.safeParse({
				patientId: PATIENT_A1_ID,
				operationType: "income",
				taxationSystem: "usn_income",
				totalKopecks: 150000,
				electronicCardKopecks: 150000,
				isCorrection: true,
				correctionType: "self_initiated",
				correctionDocDate: "2026-11-26",
				correctionDocNumber: "CORR-1",
				injectedUnknownKey: "blocked",
				items: [
					{
						name: "Профессиональная гигиена",
						priceKopecks: 150000,
						quantity: 1,
						amountKopecks: 150000,
					},
				],
			});
			assert.equal(invalidExtraCorrection.success, false);
		});

		it("CryptoProNativeClient surfaces explicit invalid JSON errors and typed CryptoProNativeError", async () => {
			const errInstance = new CryptoProNativeError("Ошибка", "TEST_CODE", { step: 1 });
			assert.equal(errInstance.code, "TEST_CODE");
			assert.deepEqual(errInstance.details, { step: 1 });

			const prevFetch = globalThis.fetch;
			try {
				globalThis.fetch = async () =>
					({
						ok: true,
						status: 200,
						text: async () => "{broken json",
					}) as unknown as Response;
				const status = await fetchCryptoProNativeStatus("http://localhost");
				assert.equal(status.success, false);
				assert.equal(status.code, "INVALID_RESPONSE_JSON");
			} finally {
				globalThis.fetch = prevFetch;
			}
		});

		it("FiscalRetryPolicy.calculateRetryDelayMs safely clamps indices without non-null assertions", () => {
			assert.equal(FiscalRetryPolicy.calculateRetryDelayMs(-5), 1000);
			assert.equal(FiscalRetryPolicy.calculateRetryDelayMs(0), 1000);
			assert.equal(FiscalRetryPolicy.calculateRetryDelayMs(99), 300000);
		});
	});

	describe("2. Live Routes, Tenant Isolation, 54-FZ Fiscal & SBP Integrity", () => {
		let app: FastifyInstance;
		let dbAvailable = true;
		let tokenA = "";
		let doctorTokenA = "";
		let tokenB = "";

		before(async () => {
			process.env.AUTH_TOKEN_SECRET =
				process.env.AUTH_TOKEN_SECRET || "wave15-test-secret-32-bytes-minimum!!";
			const secret = authTokenSecret();
			tokenA = signToken({ userId: DOCTOR_A_ID, organizationId: ORG_A_ID, role: "admin" }, secret, 3600);
			doctorTokenA = signToken({ userId: DOCTOR_A_ID, organizationId: ORG_A_ID, role: "doctor" }, secret, 3600);
			tokenB = signToken({ organizationId: ORG_B_ID, role: "admin" }, secret, 3600);

			app = await createIdempotentTenantTestApp();
			await registerFiscalReceiptRoutes(app);
			await registerSbpRoutes(app);
			await registerDemoRoutes(app);
			await registerClinicalProtocolRoutes(app);
			await registerPricelistRoutes(app);
			await registerPatientRelationshipsRoutes(app);
			await app.ready();

			try {
				await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
				await db.insert(organizations).values([
					{ id: ORG_A_ID, name: "Wave 15 Clinic A", inn: "7701000015" },
					{ id: ORG_B_ID, name: "Wave 15 Clinic B", inn: "7702000015" },
				]);

				await withFixtureTenant(ORG_A_ID, async (tx) => {
					await ensureOrganizationCashBoxes(tx, ORG_A_ID);
					await tx.insert(users).values({
						id: DOCTOR_A_ID,
						organizationId: ORG_A_ID,
						passwordHash: "hash",
						fullName: "Врач Волна 15",
						role: "doctor",
					});
					await tx.insert(patients).values([
						{
							id: PATIENT_A1_ID,
							organizationId: ORG_A_ID,
							fullName: "Пациент Без Телефона",
							phone: null,
							email: null,
							status: "active",
						},
						{
							id: PATIENT_A2_ID,
							organizationId: ORG_A_ID,
							fullName: "Пациент С Контактом",
							phone: "+79161112233",
							email: null,
							status: "active",
						},
					]);
					await tx.insert(patientInvoices).values({
						id: INVOICE_A1_ID,
						organizationId: ORG_A_ID,
						patientId: PATIENT_A1_ID,
						status: "issued",
						totalAmountRub: 2500,
						totalRub: "2500",
						totalPriceKopecks: 250000n,
					});
					await tx.insert(familyGroups).values({
						id: FAMILY_A_ID,
						organizationId: ORG_A_ID,
						name: "Семья Тестовых",
						headPatientId: PATIENT_A2_ID,
						balance: "5000.00",
						balanceKopecks: 500000,
					});
					const [mainBox] = await tx
						.select()
						.from(cashBoxes)
						.where(and(eq(cashBoxes.organizationId, ORG_A_ID), eq(cashBoxes.type, "main")))
						.limit(1);
					if (mainBox) {
						await tx
							.update(cashBoxes)
							.set({ balanceRub: 10000, balanceKopecks: 1000000 })
							.where(eq(cashBoxes.id, mainBox.id));
						await tx.insert(cashBoxShifts).values({
							organizationId: ORG_A_ID,
							cashBoxId: mainBox.id,
							openedByUserId: DOCTOR_A_ID,
							status: "open",
							startBalanceRub: 10000,
							startBalanceKopecks: 1000000,
							incomeTotalRub: 0,
							incomeTotalKopecks: 0,
							expenseTotalRub: 0,
							expenseTotalKopecks: 0,
						});
					}
				});

				await withFixtureTenant(ORG_B_ID, async (tx) => {
					await ensureOrganizationCashBoxes(tx, ORG_B_ID);
					await tx.insert(patients).values({
						id: PATIENT_B1_ID,
						organizationId: ORG_B_ID,
						fullName: "Пациент Клиники Б",
						status: "active",
					});
					await tx.insert(patientInvoices).values({
						id: INVOICE_B1_ID,
						organizationId: ORG_B_ID,
						patientId: PATIENT_B1_ID,
						status: "issued",
						totalAmountRub: 3000,
						totalRub: "3000",
						totalPriceKopecks: 300000n,
					});
				});
			} catch (err) {
				if (isDbUnavailable(err)) {
					dbAvailable = false;
				} else {
					throw err;
				}
			}
		});

		after(async () => {
			if (dbAvailable) {
				await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]).catch(() => undefined);
			}
			await app.close();
		});

		it("getClinicFiscalSettingsFromDb returns null KKM fields when unconfigured (no АТОЛ-55Ф / 00108204958112 fabrications)", async (t) => {
			if (!dbAvailable) return t.skip("PostgreSQL unavailable");
			await withFixtureTenant(ORG_A_ID, async (tx) => {
				await tx
					.update(cashBoxes)
					.set({ kkmModel: null, kkmSerialNumber: null, branchId: null })
					.where(and(eq(cashBoxes.organizationId, ORG_A_ID), eq(cashBoxes.type, "main")));
			});
			const settings = await getClinicFiscalSettingsFromDb(ORG_A_ID);
			assert.equal(settings.kkmModel, null);
			assert.equal(settings.kkmSerialNumber, null);
			assert.equal(settings.branchId, null);
		});

		it("POST /api/billing/sbp/generate-qr returns 404 for foreign or non-existent invoiceId", async (t) => {
			if (!dbAvailable) return t.skip("PostgreSQL unavailable");

			const resMissing = await app.inject({
				method: "POST",
				url: "/api/billing/sbp/generate-qr",
				headers: {
					"x-dente-clinic-token": tokenA,
					"idempotency-key": crypto.randomUUID(),
				},
				payload: {
					operationId: `OP-MISS-${Date.now()}`,
					amountKopecks: 150000,
					invoiceId: INVOICE_B1_ID, // belongs to ORG_B
				},
			});
			assert.equal(resMissing.statusCode, 404);
			assert.equal(JSON.parse(resMissing.body).error, "InvoiceNotFound");
		});

		it("POST /api/fiscal/sbp-status confirm_manual settles cashbox, reconciles invoice, sets status=success, and never fabricates Tag 1008 phone", async (t) => {
			if (!dbAvailable) return t.skip("PostgreSQL unavailable");

			const orderId = `SBP-MAN-${Date.now()}`;
			await withFixtureTenant(ORG_A_ID, async (tx) => {
				await tx.insert(sberbankTransactions).values({
					organizationId: ORG_A_ID,
					patientId: PATIENT_A1_ID,
					invoiceId: INVOICE_A1_ID,
					documentId: INVOICE_A1_ID,
					orderId,
					amountKopecks: 250000n,
					status: "pending",
				});
			});

			const res = await app.inject({
				method: "POST",
				url: "/api/fiscal/sbp-status",
				headers: {
					"x-dente-clinic-token": tokenA,
					"idempotency-key": crypto.randomUUID(),
				},
				payload: {
					orderId,
					action: "confirm_manual",
				},
			});
			assert.equal(res.statusCode, 200, res.body);
			const body = JSON.parse(res.body);
			assert.equal(body.paid, true);
			assert.ok(body.paymentId);

			await withFixtureTenant(ORG_A_ID, async (tx) => {
				const [sbRow] = await tx
					.select()
					.from(sberbankTransactions)
					.where(and(eq(sberbankTransactions.organizationId, ORG_A_ID), eq(sberbankTransactions.orderId, orderId)))
					.limit(1);
				assert.equal(sbRow?.status, "success");

				const [invRow] = await tx
					.select()
					.from(patientInvoices)
					.where(and(eq(patientInvoices.organizationId, ORG_A_ID), eq(patientInvoices.id, INVOICE_A1_ID)))
					.limit(1);
				assert.equal(invRow?.status, "paid");

				const [cashlessBox] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.organizationId, ORG_A_ID), eq(cashBoxes.isCashless, true)))
					.limit(1);
				assert.ok(cashlessBox);
				assert.equal(Number(cashlessBox.balanceKopecks), 250000);

				const [qRow] = await tx
					.select()
					.from(fiscalReceiptQueue)
					.where(and(eq(fiscalReceiptQueue.organizationId, ORG_A_ID), eq(fiscalReceiptQueue.paymentId, body.paymentId)))
					.limit(1);
				assert.ok(qRow);
				const payload = qRow.payloadJson as Record<string, unknown>;
				assert.equal(payload.tag1008_customerContact, "");
			});
		});

		it("processFamilyRefund updates cashBoxShifts.expenseTotalKopecks and records real patient contact instead of patient@clinic.ru", async (t) => {
			if (!dbAvailable) return t.skip("PostgreSQL unavailable");

			const mutId = crypto.randomUUID();
			const refundRes = await processFamilyRefund({
				organizationId: ORG_A_ID,
				familyGroupId: FAMILY_A_ID,
				patientId: PATIENT_A2_ID,
				amountRub: 1500,
				amountKopecks: 150000,
				method: "cash",
				clientMutationId: mutId,
				reasonText: "Возврат аванса",
			});
			assert.equal(refundRes.success, true);
			assert.equal(refundRes.newBalanceKopecks, 350000);

			await withFixtureTenant(ORG_A_ID, async (tx) => {
				const [mainBox] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.organizationId, ORG_A_ID), eq(cashBoxes.type, "main")))
					.limit(1);
				assert.ok(mainBox);
				const [shift] = await tx
					.select()
					.from(cashBoxShifts)
					.where(and(eq(cashBoxShifts.organizationId, ORG_A_ID), eq(cashBoxShifts.cashBoxId, mainBox.id)))
					.limit(1);
				assert.equal(shift?.expenseTotalKopecks, 150000);

				const [op] = await tx
					.select()
					.from(cashOperations)
					.where(and(eq(cashOperations.organizationId, ORG_A_ID), eq(cashOperations.cashBoxId, mainBox.id), eq(cashOperations.operationType, "expense")))
					.limit(1);
				assert.equal(op?.shiftId, shift?.id);
				assert.equal(op?.balanceBeforeKopecks, 1000000n);
				assert.equal(op?.balanceAfterKopecks, 850000n);

				const [qRow] = await tx
					.select()
					.from(fiscalReceiptQueue)
					.where(and(eq(fiscalReceiptQueue.organizationId, ORG_A_ID), eq(fiscalReceiptQueue.paymentId, refundRes.payment.id)))
					.limit(1);
				const payload = qRow?.payloadJson as Record<string, unknown>;
				assert.equal(payload.tag1008_customerContact, "+79161112233");
			});
		});

		it("handleSbpWebhookRefund uses real patient contact (or empty string if missing) instead of sbp@clinic.ru", async (t) => {
			if (!dbAvailable) return t.skip("PostgreSQL unavailable");

			const payId = crypto.randomUUID();
			await withFixtureTenant(ORG_A_ID, async (tx) => {
				const [inserted] = await tx
					.insert(payments)
					.values({
						id: payId,
						organizationId: ORG_A_ID,
						patientId: PATIENT_A1_ID,
						amountRub: 1000,
						amountKopecks: 100000n,
						method: "online",
						status: "paid",
						clientMutationId: crypto.randomUUID(),
					})
					.returning();
				assert.ok(inserted);

				await handleSbpWebhookRefund({
					tx,
					orgId: ORG_A_ID,
					lockedPayment: inserted,
				});

				const [qRow] = await tx
					.select()
					.from(fiscalReceiptQueue)
					.where(and(eq(fiscalReceiptQueue.organizationId, ORG_A_ID), eq(fiscalReceiptQueue.paymentId, payId)))
					.limit(1);
				const payload = qRow?.payloadJson as Record<string, unknown>;
				assert.notEqual(payload.tag1008_customerContact, "sbp@clinic.ru");
			});
		});

		it("GET /api/emr/templates enforces auth & strict query validation; GET /api/pricelist/:serviceId allows clinical doctor read", async (t) => {
			if (!dbAvailable) return t.skip("PostgreSQL unavailable");

			const unauthEmr = await app.inject({ method: "GET", url: "/api/emr/templates" });
			assert.equal(unauthEmr.statusCode, 401);

			const badQueryEmr = await app.inject({
				method: "GET",
				url: "/api/emr/templates?extraParam=1",
				headers: { "x-dente-clinic-token": doctorTokenA },
			});
			assert.equal(badQueryEmr.statusCode, 400);

			const okEmr = await app.inject({
				method: "GET",
				url: "/api/emr/templates",
				headers: { "x-dente-clinic-token": doctorTokenA },
			});
			assert.equal(okEmr.statusCode, 200);

			const doctorReadService = await app.inject({
				method: "GET",
				url: `/api/pricelist/${crypto.randomUUID()}`,
				headers: { "x-dente-clinic-token": doctorTokenA },
			});
			// Should pass clinical read guard and hit ServiceNotFound (404), NOT 403/503 SettingsAdminSecretMissing
			assert.equal(doctorReadService.statusCode, 404);
		});

		it("POST /api/demo/seed rejects invalid body with 400 and GET /api/demo/state fails closed when blocked", async () => {
			const prevEnv = process.env.NODE_ENV;
			const prevBypass = process.env.DENTE_ALLOW_DEMO_LOGIN;
			const prevEnabled = process.env.DENTE_DEMO_SHOWCASE_ENABLED;
			try {
				process.env.NODE_ENV = "production";
				delete process.env.DENTE_ALLOW_DEMO_LOGIN;
				delete process.env.DENTE_DEMO_SHOWCASE_ENABLED;

				const blockedState = await app.inject({
					method: "GET",
					url: "/api/demo/state",
				});
				assert.equal(blockedState.statusCode, 403);
			} finally {
				process.env.NODE_ENV = prevEnv;
				if (prevBypass !== undefined) process.env.DENTE_ALLOW_DEMO_LOGIN = prevBypass;
				if (prevEnabled !== undefined) process.env.DENTE_DEMO_SHOWCASE_ENABLED = prevEnabled;
			}

			const badSeed = await app.inject({
				method: "POST",
				url: "/api/demo/seed",
				headers: { "content-type": "application/json" },
				payload: { forceReset: "not-a-boolean" },
			});
			assert.equal(badSeed.statusCode, 400);
		});
	});
});
