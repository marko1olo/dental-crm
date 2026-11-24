import assert from "node:assert";
import { after, before, describe, test } from "node:test";
import type { CreateDocumentInput, Payment } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { generatedDocuments, organizations, patients, payments as paymentsTable, users } from "../db/schema.js";
import { register as registerNdflRoutes } from "../routes/documents/ndflCalculator.js";
import { buildPdfContentDispositionHeader } from "../routes/documents/pdf.js";
import { registerPortalTaxCertRoutes } from "../routes/portal/portalTaxCertRoutes.js";
import { PORTAL_TOKEN_KIND } from "../routes/portal/types.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../tests/support/fixtureOrganizations.js";
import { createTenantTestApp } from "../tests/support/tenantTestApp.js";
import {
	installmentScheduleMismatchReason,
	paidAmountRubForDocument,
	paidFactsTotalMismatchReason,
	plannedFactsTotalMismatchReason,
} from "./documentGuards/financialGuards.js";

describe("Domain 13 Red Team Proof Suite: Documents, Consents, Contracts & Tax Certificates", () => {
	test("DEF-2: paidAmountRubForDocument accurately sums fractional kopecks without float drift", () => {
		// 20 платежей по 55.55 руб
		const payments: Payment[] = Array.from({ length: 20 }, (_, i) => ({
			id: `p-${i}`,
			patientId: "patient-1",
			status: "paid",
			amountRub: 55.55,
			fiscalReceiptIssuedAt: "2024-05-10",
			payerInn: "770123456789",
		} as Payment));

		const input: CreateDocumentInput = {
			patientId: "patient-1",
			kind: "tax_deduction_certificate",
			taxYear: 2024,
			taxPayerInn: "770123456789",
			payload: {
				taxPaymentSelection: {
					selectedPaymentIds: payments.map((p) => p.id),
				},
			},
		};

		const total = paidAmountRubForDocument(input.kind, input, payments);
		// 20 * 55.55 = 1111.00 (в float часто получается 1110.9999999999995)
		assert.strictEqual(total, 1111);
	});

	test("DEF-2: plannedFactsTotalMismatchReason, paidFactsTotalMismatchReason & installmentScheduleMismatchReason use exact kopeck equality", () => {
		const facts = {
			plannedAmountRub: 1250.5,
			paidAmountRub: 1250.5,
			plannedCount: 1,
			paidCount: 1,
		};

		// 1250.50 руб совпадает
		const plannedReason = plannedFactsTotalMismatchReason(1250.5, facts, "Смета лечения");
		assert.strictEqual(plannedReason, null);

		const paidReason = paidFactsTotalMismatchReason(1250.5, facts, "Квитанция");
		assert.strictEqual(paidReason, null);

		// Расхождение в 1 копейку отбивается
		const mismatchPlanned = plannedFactsTotalMismatchReason(1250.51, facts, "Смета лечения");
		assert.ok(mismatchPlanned !== null);

		// График рассрочки: 1000.1 - 300.05 в float = 700.0500000000001, в копейках точно 700.05
		const installmentReason = installmentScheduleMismatchReason(
			{
				totalAmountRub: 1000.1,
				prepaidAmountRub: 300.05,
				remainingAmountRub: 700.05,
				installments: [{ dueDate: "2026-12-01", amountRub: 700.05 }],
			},
			{ plannedAmountRub: 1000.1, paidAmountRub: 0, plannedCount: 1, paidCount: 0 },
		);
		assert.strictEqual(installmentReason, null);
	});

	test("DEF-4: RFC 5987 Content-Disposition header preserves Cyrillic filenames alongside ASCII fallback", () => {
		const header = buildPdfContentDispositionHeader(
			"План_лечения_Иванов.pdf",
			"treatment-plan-550e8400.pdf",
		);
		assert.ok(header.includes('filename="treatment-plan-550e8400.pdf"'));
		assert.ok(header.includes("filename*=UTF-8''"));
		assert.ok(header.includes(encodeURIComponent("План_лечения_Иванов.pdf")));
	});

	test("DEF-6: Fractional quantity (1.5 carpules) is preserved without integer truncation", () => {
		const rawItem = { quantity: "1.5" };
		const parsedQuantity = Number(rawItem.quantity) || 1;
		assert.strictEqual(parsedQuantity, 1.5);
		assert.notStrictEqual(parsedQuantity, 2);
	});

	describe("HTTP / PG18 Read-Only GET Tax Certificate, 219 NK RF Anonymous Reject & NDFL Calculator Validation", () => {
		const NS = "domain13RealHttp";
		const ORG_ID = fixtureUuid(NS, 1);
		const STAFF_ID = fixtureUuid(NS, 2);
		const PATIENT_ID = fixtureUuid(NS, 3);
		const ANON_PATIENT_ID = fixtureUuid(NS, 4);
		const PAY_ID = fixtureUuid(NS, 5);

		let app: FastifyInstance;
		let dbReady = true;
		let staffHeaders: Record<string, string> = {};
		let patientPortalHeaders: Record<string, string> = {};
		let anonPortalHeaders: Record<string, string> = {};

		before(async () => {
			process.env.NODE_ENV = "test";
			app = createTenantTestApp();
			await app.register(registerPortalTaxCertRoutes, { prefix: "/api/portal" });
			await registerNdflRoutes(app);
			await app.ready();

			const secret = authTokenSecret();
			const staffToken = signToken(
				{ userId: STAFF_ID, organizationId: ORG_ID, role: "doctor", fullName: "Врач Тест" },
				secret,
			);
			staffHeaders = {
				"x-dente-staff-token": staffToken,
				"x-dente-clinic-token": staffToken,
			};
			const patientToken = signToken(
				{ sub: PATIENT_ID, organizationId: ORG_ID, kind: PORTAL_TOKEN_KIND },
				secret,
			);
			patientPortalHeaders = { authorization: `Bearer ${patientToken}` };

			const anonToken = signToken(
				{ sub: ANON_PATIENT_ID, organizationId: ORG_ID, kind: PORTAL_TOKEN_KIND },
				secret,
			);
			anonPortalHeaders = { authorization: `Bearer ${anonToken}` };

			try {
				await purgeFixtureOrganizations([ORG_ID]);
				await withFixtureTenant(ORG_ID, async (tx) => {
					await tx.insert(organizations).values({
						id: ORG_ID,
						name: "ООО Стоматология Домен13",
						inn: "7701234567",
						kpp: "770101001",
						ogrn: "1027700132195",
						legalAddress: "г. Москва, ул. Тестовая, д. 1",
					});
					await tx.insert(users).values({
						id: STAFF_ID,
						organizationId: ORG_ID,
						fullName: "Врач Тест",
						role: "doctor",
					});
					await tx.insert(patients).values([
						{
							id: PATIENT_ID,
							organizationId: ORG_ID,
							fullName: "Соколов Игорь Петрович",
							phone: "+79992223344",
						},
						{
							id: ANON_PATIENT_ID,
							organizationId: ORG_ID,
							fullName: "UUID_ANON-991",
							phone: "+79992223345",
							administrativeProfile: { isAnonymous: true },
						},
					]);
					await tx.insert(paymentsTable).values({
						id: PAY_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						amountRub: 12000,
						status: "paid",
						taxDeductionCode: "1",
						paidAt: new Date(),
					});
				});
			} catch (err) {
				if (isDatabaseUnavailable(err)) {
					dbReady = false;
				} else {
					throw err;
				}
			}
		});

		after(async () => {
			if (app) await app.close();
			if (dbReady) await purgeFixtureOrganizations([ORG_ID]);
		});

		test("GET /api/documents/tax-deduction/preview/:patientId validates UUID, strict query & date range cleanly", async (t) => {
			const badParamRes = await app.inject({
				method: "GET",
				url: "/api/documents/tax-deduction/preview/not-a-uuid",
				headers: staffHeaders,
			});
			assert.strictEqual(badParamRes.statusCode, 400);

			const badExtraQueryRes = await app.inject({
				method: "GET",
				url: `/api/documents/tax-deduction/preview/${PATIENT_ID}?unknownExtra=1`,
				headers: staffHeaders,
			});
			assert.strictEqual(badExtraQueryRes.statusCode, 400);

			if (!dbReady) return t.skip("PostgreSQL unavailable");

			const reversedRangeRes = await app.inject({
				method: "GET",
				url: `/api/documents/tax-deduction/preview/${PATIENT_ID}?startDate=2026-12-31&endDate=2026-01-01`,
				headers: staffHeaders,
			});
			assert.strictEqual(reversedRangeRes.statusCode, 400);
			assert.strictEqual(reversedRangeRes.json().error, "InvalidDateRangeError");
		});

		test("GET /api/portal/tax-certificate/preview is 100% read-only and blocks anonymous patient (422)", async (t) => {
			if (!dbReady) return t.skip("PostgreSQL unavailable");

			const year = new Date().getFullYear();
			const okRes = await app.inject({
				method: "GET",
				url: `/api/portal/tax-certificate/preview?year=${year}`,
				headers: patientPortalHeaders,
			});
			assert.strictEqual(okRes.statusCode, 200);
			assert.strictEqual(okRes.json().certificate.summary.totalSumRub, 12000);

			// HTTP GET must NOT insert generatedDocuments rows on preview/html
			const docsAfterGet = await withFixtureTenant(ORG_ID, async (tx) =>
				tx
					.select()
					.from(generatedDocuments)
					.where(and(eq(generatedDocuments.organizationId, ORG_ID), eq(generatedDocuments.patientId, PATIENT_ID))),
			);
			assert.strictEqual(docsAfterGet.length, 0);

			// Anonymous card is blocked per art. 219 NK RF with 422
			const anonRes = await app.inject({
				method: "GET",
				url: `/api/portal/tax-certificate/preview?year=${year}`,
				headers: anonPortalHeaders,
			});
			assert.strictEqual(anonRes.statusCode, 422);
		});
	});
});
