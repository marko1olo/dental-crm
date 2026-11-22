/**
 * apps/api/src/tests/routes/invoicePaymentsAggregation.test.ts
 *
 * Verification of Mandate 8bm: exact payment aggregation and kopecks calculations
 * in GET /api/invoices (handleListInvoices).
 * Proves:
 * 1. An unpaid invoice returns totalAmountKopecks, paidAmountKopecks = 0, remainingAmountKopecks = total.
 * 2. A partially paid invoice accurately aggregates payments.amount_kopecks, returning
 *    exact paidAmountKopecks and remainingAmountKopecks (no naive status === 'paid' ternary).
 * 3. Multiple partial payments sum up accurately.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { randomBytes } from "node:crypto";
import { organizations, patientInvoices, patients, payments } from "../../db/schema.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { handleListInvoices } from "../../routes/invoiceRoutes/handlers/listInvoicesHandler.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";

function createMockReply() {
	let statusCode = 200;
	let sentBody: unknown = null;
	const reply = {
		code(c: number) {
			statusCode = c;
			return reply;
		},
		send(data: unknown) {
			sentBody = data;
			return reply;
		},
		get statusCode() {
			return statusCode;
		},
		get sentBody() {
			return sentBody as { success?: boolean; invoices: Array<{
				id: string;
				totalAmountRub: number;
				totalAmountKopecks: number;
				paidAmountRub: number;
				paidAmountKopecks: number;
				remainingAmountRub: number;
				remainingAmountKopecks: number;
				status: string;
			}> };
		},
		sent: false,
	};
	return reply;
}

describe("Invoice Payments Aggregation SSOT (Mandate 8bm)", () => {
	it("accurately aggregates partial and full payments for invoices in list", async () => {
		const orgId = fixtureUuid("invAgg", 1);
		const patientId = fixtureUuid("invAgg", 2);
		const invoiceId = fixtureUuid("invAgg", 3);
		const payment1Id = fixtureUuid("invAgg", 4);
		const payment2Id = fixtureUuid("invAgg", 5);
		const staffUserId = fixtureUuid("invAgg", 6);

		const adminSecret = randomBytes(32).toString("base64url");
		process.env.DENTE_CLINICAL_ADMIN_SECRET = adminSecret;

		const headers = {
			"x-dente-clinic-token": signToken(
				{ organizationId: orgId },
				authTokenSecret(),
			),
			"x-dente-staff-token": signToken(
				{ organizationId: orgId, userId: staffUserId, role: "owner" },
				authTokenSecret(),
			),
			"x-dente-admin-secret": adminSecret,
		};

		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Финансовых Агрегаций Тест",
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Кузнецов Артем Валерьевич",
					phone: "+79219998877",
				});
				await tx.insert(patientInvoices).values({
					id: invoiceId,
					organizationId: orgId,
					patientId,
					status: "issued",
					totalAmountRub: "5000.00",
					totalRub: "5000.00",
				});
			});

			const listReq = {
				organizationId: orgId,
				query: { patientId },
				headers,
				log: { warn: () => {}, info: () => {}, error: () => {} },
			};

			// Phase 1: Unpaid invoice
			const reply1 = createMockReply();
			await handleListInvoices(listReq as never, reply1 as never);

			assert.equal(reply1.statusCode, 200);
			const inv1 = reply1.sentBody.invoices.find((i) => i.id === invoiceId);
			assert.ok(inv1, "Invoice must be found in list");
			assert.equal(inv1.totalAmountRub, 5000);
			assert.equal(inv1.totalAmountKopecks, 500000);
			assert.equal(inv1.paidAmountRub, 0);
			assert.equal(inv1.paidAmountKopecks, 0);
			assert.equal(inv1.remainingAmountRub, 5000);
			assert.equal(inv1.remainingAmountKopecks, 500000);

			// Phase 2: Insert partial payment 2000.00 Rub (200,000 kopecks)
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(payments).values({
					id: payment1Id,
					organizationId: orgId,
					patientId,
					documentId: invoiceId,
					amountKopecks: 200000n,
					amountRub: "2000.00",
					status: "paid",
					paymentMethod: "cash",
				});
			});

			const reply2 = createMockReply();
			await handleListInvoices(listReq as never, reply2 as never);

			const inv2 = reply2.sentBody.invoices.find((i) => i.id === invoiceId);
			assert.ok(inv2, "Invoice must be found in list after partial payment");
			assert.equal(inv2.totalAmountRub, 5000);
			assert.equal(inv2.totalAmountKopecks, 500000);
			assert.equal(inv2.paidAmountRub, 2000, "Must reflect partial paid amount in Rub");
			assert.equal(inv2.paidAmountKopecks, 200000, "Must reflect partial paid amount in kopecks");
			assert.equal(inv2.remainingAmountRub, 3000, "Must calculate remaining amount in Rub");
			assert.equal(inv2.remainingAmountKopecks, 300000, "Must calculate remaining amount in kopecks");

			// Phase 3: Insert second payment 3000.00 Rub (300,000 kopecks)
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(payments).values({
					id: payment2Id,
					organizationId: orgId,
					patientId,
					documentId: invoiceId,
					amountKopecks: 300000n,
					amountRub: "3000.00",
					status: "paid",
					paymentMethod: "card",
				});
			});

			const reply3 = createMockReply();
			await handleListInvoices(listReq as never, reply3 as never);

			const inv3 = reply3.sentBody.invoices.find((i) => i.id === invoiceId);
			assert.ok(inv3, "Invoice must be found in list after full payment");
			assert.equal(inv3.totalAmountRub, 5000);
			assert.equal(inv3.totalAmountKopecks, 500000);
			assert.equal(inv3.paidAmountRub, 5000, "Must reflect full paid amount in Rub");
			assert.equal(inv3.paidAmountKopecks, 500000, "Must reflect full paid amount in kopecks");
			assert.equal(inv3.remainingAmountRub, 0, "Remaining must be 0 after full payment");
			assert.equal(inv3.remainingAmountKopecks, 0, "Remaining kopecks must be 0");
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
