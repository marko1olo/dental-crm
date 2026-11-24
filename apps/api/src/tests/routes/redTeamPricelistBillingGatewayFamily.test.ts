import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import { generateUuidV7, rublesToKopecks } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { seedBaseline804nServicesInDb } from "../../db/pricelistQuery.js";
import {
	familyGroups,
	fiscalReceiptQueue,
	organizations,
	patientInvoices,
	patientRelationships,
	patients,
	payments,
	sberbankTransactions,
	users,
	visits,
} from "../../db/schema.js";
import {
	clearInMemoryIdempotencyCache,
	idempotencyPlugin,
} from "../../plugins/idempotencyPlugin.js";
import { registerBillingRoutes } from "../../routes/billingRoutes/billingRouteHandlers.js";
import { registerFamilyFinanceRoutes } from "../../routes/finance_family.js";
import { registerInvoiceRoutes } from "../../routes/invoiceRoutes/index.js";
import { registerLoyaltyFamilyRoutes } from "../../routes/loyaltyModules/loyaltyFamilyRoutes.js";
import { registerSberPosWebhookRoutes } from "../../routes/payments/sberWebhook/index.js";
import { reconcileInvoiceBalanceInDb } from "../../routes/payments/sberWebhook/paymentStateTransition.js";
import { registerPricelistRoutes } from "../../routes/pricelist/routeHandlers.js";
import { registerSberbankRoutes } from "../../routes/sberbankRoutes/index.js";
import { registerSbpRoutes, verifySbpWebhookSignature } from "../../routes/sbp/index.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { FamilyWalletError } from "../../services/familyWallet/FamilyWalletService.js";
import { generateFnsTaxCertificatesForFamilyLogic } from "../../services/familyWallet/familyFnsTaxService.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const TEST_NS = "redTeamFixer3Suite";
const ORG_ID = fixtureUuid(TEST_NS, 1);
const STAFF_ID = fixtureUuid(TEST_NS, 2);
const PATIENT_A_ID = fixtureUuid(TEST_NS, 3);
const PATIENT_B_ID = fixtureUuid(TEST_NS, 4);
const WARD_PATIENT_ID = fixtureUuid(TEST_NS, 5);
const UNRELATED_PATIENT_ID = fixtureUuid(TEST_NS, 6);
const ANON_PATIENT_ID = fixtureUuid(TEST_NS, 7);
const VISIT_OTHER_ID = fixtureUuid(TEST_NS, 8);
const FAMILY_ALPHA_ID = fixtureUuid(TEST_NS, 9);
const FAMILY_BETA_ID = fixtureUuid(TEST_NS, 10);
const FAMILY_TAX_ID = fixtureUuid(TEST_NS, 11);

// gitleaks:allow
const TEST_WEBHOOK_SECRET = "fixture_redteam_fixer3_gateway_secret";

function signGatewayParams(
	params: Record<string, string>,
	secret: string,
): string {
	const sortedKeys = Object.keys(params).sort();
	const stringToSign = sortedKeys.map((k) => `${k}=${params[k]}`).join(";");
	return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
}

function isDbErr(err: unknown): boolean {
	if (!err) return false;
	const msg = err instanceof Error ? err.message : String(err);
	const causeMsg =
		typeof err === "object" && err !== null && "cause" in err && err.cause instanceof Error
			? err.cause.message
			: "";
	const combined = `${msg} ${causeMsg}`;
	return /ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|getaddrinfo|Connection terminated|password authentication failed|database "[^"]*" does not exist|role "[^"]*" does not exist/i.test(
		combined,
	);
}

describe("Red Team Fixer 3 Integration Suite: Idempotency, Gateways, Pricelist, Invoices, Billing & Family FNS", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	let staffToken = "";
	let clinicToken = "";
	const originalSberSecret = process.env.SBERBANK_WEBHOOK_SECRET;
	const originalSbpSecret = process.env.SBP_WEBHOOK_SECRET;

	function authHeaders(extra?: Record<string, string>): Record<string, string> {
		return {
			"x-dente-clinic-token": clinicToken,
			"x-dente-staff-token": staffToken,
			...(extra ?? {}),
		};
	}

	before(async () => {
		process.env.SBERBANK_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
		process.env.SBP_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
		clearInMemoryIdempotencyCache();

		app = createTenantTestApp();
		await app.register(idempotencyPlugin);
		await registerSbpRoutes(app);
		await registerSberPosWebhookRoutes(app);
		await registerSberbankRoutes(app);
		await registerPricelistRoutes(app);
		await registerInvoiceRoutes(app);
		await registerBillingRoutes(app);
		await registerFamilyFinanceRoutes(app);
		await registerLoyaltyFamilyRoutes(app);
		await app.ready();

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORG_ID }, secret, 3600);
		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: STAFF_ID,
				role: "administrator",
				fullName: "Администратор РедТим",
			},
			secret,
			3600,
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Red Team Fixer 3 Dental LLC",
						inn: "7701234567",
						kpp: "770101001",
						ogrn: "1234567890123",
						legalAddress: "г. Москва, ул. Тестовая, д. 3",
						signatoryName: "Дорохов С.В.",
					})
					.onConflictDoNothing();

				await tx
					.insert(users)
					.values({
						id: STAFF_ID,
						organizationId: ORG_ID,
						fullName: "Администратор РедТим",
						email: `redteam3_${Date.now()}@dente.local`,
						role: "administrator",
					})
					.onConflictDoNothing();

				await tx.insert(familyGroups).values([
					{
						id: FAMILY_ALPHA_ID,
						organizationId: ORG_ID,
						name: "Семья Альфа",
						headPatientId: PATIENT_A_ID,
						primaryPatientId: PATIENT_A_ID,
					},
					{
						id: FAMILY_BETA_ID,
						organizationId: ORG_ID,
						name: "Семья Бета",
						headPatientId: PATIENT_B_ID,
						primaryPatientId: PATIENT_B_ID,
					},
					{
						id: FAMILY_TAX_ID,
						organizationId: ORG_ID,
						name: "Семья Налоговая",
						headPatientId: PATIENT_A_ID,
						primaryPatientId: PATIENT_A_ID,
					},
				]);

				await tx.insert(patients).values([
					{
						id: PATIENT_A_ID,
						organizationId: ORG_ID,
						fullName: "Петров Алексей Сергеевич",
						birthDate: "1982-03-11",
						phone: "+79991000001",
						familyGroupId: FAMILY_ALPHA_ID,
					},
					{
						id: PATIENT_B_ID,
						organizationId: ORG_ID,
						fullName: "Волков Дмитрий Николаевич",
						birthDate: "1985-07-19",
						phone: "+79991000002",
						familyGroupId: FAMILY_BETA_ID,
					},
					{
						id: WARD_PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Петрова Анна Алексеевна",
						birthDate: "2012-09-01",
						phone: "+79991000003",
						familyGroupId: FAMILY_TAX_ID,
					},
					{
						id: UNRELATED_PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Сидоров Игорь Олегович",
						birthDate: "1990-02-14",
						phone: "+79991000004",
						familyGroupId: FAMILY_TAX_ID,
					},
					{
						id: ANON_PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Аноним",
						phone: "+79991000005",
						administrativeProfile: { isAnonymous: true },
					},
				]);

				await tx.insert(patientRelationships).values({
					organizationId: ORG_ID,
					patientId: PATIENT_A_ID,
					relatedPatientId: WARD_PATIENT_ID,
					relationshipType: "ward",
					isLegalRepresentative: true,
				});

				await tx.insert(visits).values({
					id: VISIT_OTHER_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_B_ID,
					status: "signed",
				});
			});
		} catch (err) {
			if (!isDbErr(err)) throw err;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (originalSberSecret !== undefined) {
			process.env.SBERBANK_WEBHOOK_SECRET = originalSberSecret;
		} else {
			delete process.env.SBERBANK_WEBHOOK_SECRET;
		}
		if (originalSbpSecret !== undefined) {
			process.env.SBP_WEBHOOK_SECRET = originalSbpSecret;
		} else {
			delete process.env.SBP_WEBHOOK_SECRET;
		}

		if (databaseAvailable) {
			try {
				await purgeFixtureOrganizations([ORG_ID]);
			} catch (err) {
				if (!isDbErr(err)) throw err;
			}
		}
		clearInMemoryIdempotencyCache();
		await app.close();
	});

	test("Block A1: idempotencyPlugin exempts all bank/SBP/SberPOS webhook endpoints without Idempotency-Key", async () => {
		const webhookPaths = [
			"/api/sbp/webhook",
			"/api/billing/sbp/webhook",
			"/api/payments/sberbank/pos/webhook",
			"/api/payments/sberbank/qr/webhook",
			"/api/payments/sberpos/webhook",
			"/api/sberbank/webhook",
		];

		for (const url of webhookPaths) {
			const res = await app.inject({
				method: "POST",
				url,
				payload: { orderId: "probe-exempt-01" },
			});
			assert.notEqual(
				res.json().error,
				"IdempotencyKeyRequired",
				`${url} must be exempt from Idempotency-Key requirement`,
			);
		}
	});

	test("Block A2: idempotencyPlugin does not poison cached 401/403 across unauthenticated and authenticated requests", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const sharedKey = generateUuidV7();
		const payload = {
			patientId: PATIENT_A_ID,
			items: [{ title: "Осмотр", priceRub: 1200, quantity: 1 }],
		};

		const unauthRes = await app.inject({
			method: "POST",
			url: "/api/invoices",
			headers: { "idempotency-key": sharedKey },
			payload,
		});
		assert.equal(unauthRes.statusCode, 401);

		const authRes = await app.inject({
			method: "POST",
			url: "/api/invoices",
			headers: authHeaders({ "idempotency-key": sharedKey }),
			payload,
		});
		assert.equal(authRes.statusCode, 201);
	});

	test("Block B1: SBP signature rejects raw secret & SberPOS void/reconcile-rrn reject missing orderId", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		assert.equal(
			verifySbpWebhookSignature(
				{ operationId: "op-raw-1", amount: "10000" },
				TEST_WEBHOOK_SECRET,
				TEST_WEBHOOK_SECRET,
			),
			false,
		);

		const voidRes = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/void",
			headers: authHeaders({ "idempotency-key": generateUuidV7() }),
			payload: { rrn: "123456789012" },
		});
		assert.equal(voidRes.statusCode, 400);
		assert.equal(voidRes.json().error, "MissingOrderId");

		const reconcileRes = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/reconcile-rrn",
			headers: authHeaders({ "idempotency-key": generateUuidV7() }),
			payload: { rrn: "123456789012" },
		});
		assert.equal(reconcileRes.statusCode, 400);
		assert.equal(reconcileRes.json().error, "MissingRrnOrOrderId");
	});

	test("Block B2: reconcileInvoiceBalanceInDb ignores unrelated visit payments when invoice.visitId is null & Sberbank refund enqueues income_return", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const isolatedInvoiceId = fixtureUuid(TEST_NS, 40);
		const unrelatedOtherVisitId = fixtureUuid(TEST_NS, 41);
		const unrelatedOtherDocId = fixtureUuid(TEST_NS, 42);
		const linkedInvoiceId = fixtureUuid(TEST_NS, 43);
		const orderId = `sber-ref-${crypto.randomBytes(4).toString("hex")}`;
		const amountKop = 250000;

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(visits).values({
				id: unrelatedOtherVisitId,
				organizationId: ORG_ID,
				patientId: PATIENT_A_ID,
				status: "signed",
			});

			await tx.insert(payments).values({
				organizationId: ORG_ID,
				patientId: PATIENT_A_ID,
				visitId: unrelatedOtherVisitId,
				documentId: unrelatedOtherDocId,
				method: "card",
				status: "paid",
				amountRub: 5000,
				amountKopecks: 500000n,
				paidAt: new Date(),
				clientMutationId: generateUuidV7(),
			});

			await tx.insert(patientInvoices).values([
				{
					id: isolatedInvoiceId,
					organizationId: ORG_ID,
					patientId: PATIENT_A_ID,
					visitId: null,
					totalRub: "2500.00",
					totalAmountRub: 2500,
					totalPriceKopecks: BigInt(amountKop),
					status: "draft",
				},
				{
					id: linkedInvoiceId,
					organizationId: ORG_ID,
					patientId: PATIENT_A_ID,
					visitId: null,
					totalRub: "2500.00",
					totalAmountRub: 2500,
					totalPriceKopecks: BigInt(amountKop),
					status: "draft",
				},
			]);

			const isolatedResult = await reconcileInvoiceBalanceInDb(
				tx,
				ORG_ID,
				isolatedInvoiceId,
			);
			assert.equal(isolatedResult.paidKopecks, 0);
			assert.equal(isolatedResult.remainingKopecks, amountKop);
			assert.equal(isolatedResult.isFullyPaid, false);

			await tx.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_A_ID,
				invoiceId: linkedInvoiceId,
				orderId,
				amountKopecks: BigInt(amountKop),
				status: "pending",
			});
		});

		const settleParams = {
			orderId,
			operation: "deposited",
			status: "success",
			amount: String(amountKop),
		};
		const settleRes = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: {
				...settleParams,
				checksum: signGatewayParams(settleParams, TEST_WEBHOOK_SECRET),
			},
		});
		assert.equal(settleRes.statusCode, 200);

		const refundParams = {
			orderId,
			operation: "refunded",
			status: "refunded",
			amount: String(amountKop),
		};
		const refundRes = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: {
				...refundParams,
				checksum: signGatewayParams(refundParams, TEST_WEBHOOK_SECRET),
			},
		});
		assert.equal(refundRes.statusCode, 200);
		assert.equal(refundRes.json().status, "refunded");

		await withFixtureTenant(ORG_ID, async (tx) => {
			const [invAfter] = await tx
				.select()
				.from(patientInvoices)
				.where(and(eq(patientInvoices.organizationId, ORG_ID), eq(patientInvoices.id, linkedInvoiceId)))
				.limit(1);
			assert.equal(invAfter?.status, "draft");
			assert.equal(invAfter?.paidAt, null);

			const [payAfter] = await tx
				.select()
				.from(payments)
				.where(and(eq(payments.organizationId, ORG_ID), eq(payments.clientMutationId, `sberbank:${orderId}`)))
				.limit(1);
			assert.equal(payAfter?.status, "refunded");

			const receipts = await tx
				.select()
				.from(fiscalReceiptQueue)
				.where(and(eq(fiscalReceiptQueue.organizationId, ORG_ID), eq(fiscalReceiptQueue.paymentId, payAfter?.id ?? "")));
			const returnReceipts = receipts.filter((r) => r.receiptType === "income_return");
			assert.equal(returnReceipts.length, 1);
		});
	});

	test("Block C1: seedBaseline804nServicesInDb recovers gracefully on re-seed via savepoint", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const firstSeed = await seedBaseline804nServicesInDb(ORG_ID);
		assert.equal(firstSeed.success, true);
		assert.ok(firstSeed.createdCount > 0);

		const secondSeed = await seedBaseline804nServicesInDb(ORG_ID);
		assert.equal(secondSeed.success, true);
		assert.equal(secondSeed.createdCount, 0);
	});

	test("Block C2: partial & remaining invoice pay via amountKopecks + preflight walk-in visit mismatch check", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const createInvRes = await app.inject({
			method: "POST",
			url: "/api/invoices",
			headers: authHeaders({ "idempotency-key": generateUuidV7() }),
			payload: {
				patientId: PATIENT_A_ID,
				items: [{ title: "Лечение кариеса", priceRub: 3000, quantity: 1 }],
			},
		});
		assert.equal(createInvRes.statusCode, 201);
		const invoiceId = String(createInvRes.json().invoice?.id ?? "");
		assert.ok(invoiceId);

		// Partial pay: 1000 RUB via integer amountKopecks
		const payPartRes = await app.inject({
			method: "POST",
			url: `/api/invoices/${invoiceId}/pay`,
			headers: authHeaders({ "idempotency-key": generateUuidV7() }),
			payload: {
				patientId: PATIENT_A_ID,
				amountKopecks: rublesToKopecks(1000),
				method: "card",
			},
		});
		assert.equal(payPartRes.statusCode, 201, payPartRes.body);
		assert.equal(payPartRes.json().amountRub, 1000);

		const getPartialRes = await app.inject({
			method: "GET",
			url: `/api/invoices/${invoiceId}`,
			headers: authHeaders(),
		});
		assert.equal(getPartialRes.statusCode, 200, getPartialRes.body);
		const partialInv = getPartialRes.json();
		assert.equal(partialInv.status, "partially_paid");
		assert.equal(partialInv.paidAmountKopecks, 100000);
		assert.equal(partialInv.remainingAmountKopecks, 200000);

		// Pay remaining balance without explicit amountRub/amountKopecks -> pays 2000 RUB
		const payRestRes = await app.inject({
			method: "POST",
			url: `/api/invoices/${invoiceId}/pay`,
			headers: authHeaders({ "idempotency-key": generateUuidV7() }),
			payload: {
				patientId: PATIENT_A_ID,
				method: "card",
			},
		});
		assert.equal(payRestRes.statusCode, 201, payRestRes.body);
		assert.equal(payRestRes.json().amountRub, 2000);

		const getPaidRes = await app.inject({
			method: "GET",
			url: `/api/invoices/${invoiceId}`,
			headers: authHeaders(),
		});
		assert.equal(getPaidRes.statusCode, 200, getPaidRes.body);
		assert.equal(getPaidRes.json().status, "paid");
		assert.equal(getPaidRes.json().remainingAmountKopecks, 0);

		// Walk-in fallback against another patient's visit must fail preflight with 409
		const mismatchRes = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: authHeaders({ "idempotency-key": generateUuidV7() }),
			payload: {
				patientId: "pat-walkin",
				visitId: VISIT_OTHER_ID,
				amountRub: 500,
				method: "card",
			},
		});
		assert.equal(mismatchRes.statusCode, 409);
	});

	test("Block D1: loyalty family link UUIDv7 + .strict(), family update 409 member conflict & .strict()", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		// Invalid unknown field rejected by .strict()
		const strictLinkRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/family/link",
			headers: authHeaders({ "idempotency-key": generateUuidV7() }),
			payload: {
				primaryPatientId: PATIENT_A_ID,
				relativePatientId: WARD_PATIENT_ID,
				relationRole: "Ребёнок",
				unexpectedProbeField: true,
			},
		});
		assert.equal(strictLinkRes.statusCode, 400);

		// Valid UUIDv7 search string against PATIENT_A works (even if relativePatientId is UUIDv7 formatted)
		const v7Dummy = generateUuidV7();
		const v7LookupRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/family/link",
			headers: authHeaders({ "idempotency-key": generateUuidV7() }),
			payload: {
				primaryPatientId: PATIENT_A_ID,
				relativePatientId: v7Dummy,
				relationRole: "Член семьи",
			},
		});
		assert.equal(v7LookupRes.statusCode, 404);

		// Moving PATIENT_B (already in FAMILY_BETA_ID) into FAMILY_ALPHA_ID fails with 409
		const conflictRes = await app.inject({
			method: "PUT",
			url: `/api/finance/family/${FAMILY_ALPHA_ID}`,
			headers: authHeaders({ "idempotency-key": generateUuidV7() }),
			payload: {
				memberPatientIds: [PATIENT_A_ID, PATIENT_B_ID],
			},
		});
		assert.equal(conflictRes.statusCode, 409);
		assert.equal(conflictRes.json().error, "PatientAlreadyInFamily");

		// Strict validation on PUT /api/finance/family/:id
		const strictPutRes = await app.inject({
			method: "PUT",
			url: `/api/finance/family/${FAMILY_ALPHA_ID}`,
			headers: authHeaders({ "idempotency-key": generateUuidV7() }),
			payload: {
				name: "Семья Альфа Обновлённая",
				injectedFlag: 1,
			},
		});
		assert.equal(strictPutRes.statusCode, 400);
	});

	test("Block D2: familyFnsTaxService rejects invalid taxYear/anonymous payer, maps ward->5, skips unconfirmed, honors amountRub when amountKopecks=0n", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const currentYear = String(new Date().getFullYear());
		const clinicInfo = {
			name: "Red Team Fixer 3 Dental LLC",
			inn: "7701234567",
			kpp: "770101001",
			ogrn: "1234567890123",
		};
		const signatoryInfo = {
			fullName: { family: "Дорохов", given: "Сергей", patronymic: "Владимирович" },
		};

		await assert.rejects(
			async () =>
				generateFnsTaxCertificatesForFamilyLogic({
					organizationId: ORG_ID,
					familyGroupId: FAMILY_TAX_ID,
					taxYear: "1899",
					clinic: clinicInfo,
					signatory: signatoryInfo,
				}),
			(err: unknown) => err instanceof FamilyWalletError && err.code === "INVALID_TAX_YEAR" && err.statusCode === 400,
		);

		await assert.rejects(
			async () =>
				generateFnsTaxCertificatesForFamilyLogic({
					organizationId: ORG_ID,
					familyGroupId: FAMILY_TAX_ID,
					taxYear: currentYear,
					clinic: clinicInfo,
					signatory: signatoryInfo,
					customPayerPatientId: ANON_PATIENT_ID,
				}),
			(err: unknown) => err instanceof FamilyWalletError && err.code === "ANONYMOUS_PATIENT_FORBIDDEN" && err.statusCode === 422,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(payments).values([
				{
					organizationId: ORG_ID,
					patientId: WARD_PATIENT_ID,
					amountRub: 12000,
					// PG BIGINT DEFAULT 0 (0n) while amountRub = 12000
					amountKopecks: 0n,
					status: "paid",
					taxDeductionCode: "2",
					paidAt: new Date(),
					clientMutationId: generateUuidV7(),
				},
				{
					organizationId: ORG_ID,
					patientId: UNRELATED_PATIENT_ID,
					amountRub: 5000,
					amountKopecks: 500000n,
					status: "paid",
					taxDeductionCode: "1",
					paidAt: new Date(),
					clientMutationId: generateUuidV7(),
				},
			]);
		});

		const certs = await generateFnsTaxCertificatesForFamilyLogic({
			organizationId: ORG_ID,
			familyGroupId: FAMILY_TAX_ID,
			taxYear: currentYear,
			clinic: clinicInfo,
			signatory: signatoryInfo,
		});

		const wardCert = certs.find((c) => c.patientId === WARD_PATIENT_ID);
		assert.ok(wardCert, "Ward patient certificate should be generated");
		assert.equal(wardCert.kinshipCode, "5");
		assert.equal(wardCert.code02AmountRub, 12000);
		assert.equal(wardCert.grandTotalRub, 12000);

		const unrelatedCert = certs.find((c) => c.patientId === UNRELATED_PATIENT_ID);
		assert.equal(
			unrelatedCert,
			undefined,
			"Unconfirmed family member without relationship row must not receive tax certificate",
		);
	});
});
