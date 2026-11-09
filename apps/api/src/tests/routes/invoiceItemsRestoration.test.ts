/**
 * apps/api/src/tests/routes/invoiceItemsRestoration.test.ts
 *
 * Verification of Invoice Line Items Restoration & Persistence in PostgreSQL 18.
 * Proves:
 * 1. POST /api/invoices stores line items in treatment_items and returns them in invoice.items.
 * 2. GET /api/invoices/:id returns all line items attached to the invoice.
 * 3. GET /api/invoices includes line items on each invoice in the list.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { randomBytes } from "node:crypto";
import { organizations, patients } from "../../db/schema.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { handleCreateInvoice } from "../../routes/invoiceRoutes/handlers/createInvoiceHandler.js";
import { handleGetInvoiceById } from "../../routes/invoiceRoutes/handlers/getInvoiceByIdHandler.js";
import { handleListInvoices } from "../../routes/invoiceRoutes/handlers/listInvoicesHandler.js";
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

describe("Invoice Line Items Restoration & Persistence SSOT", () => {
	it("creates invoice with line items, restores them on GET by ID, and lists them in invoices list", async () => {
		const orgId = fixtureUuid("invRestore", 1);
		const patientId = fixtureUuid("invRestore", 2);
		const staffUserId = fixtureUuid("invRestore", 3);

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
					name: "Клиника Счетов и Позиций Тест",
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Соколов Дмитрий Игоревич",
					phone: "+79110002233",
				});
			});

			const mockReq = {
				organizationId: orgId,
				params: {},
				body: {
					patientId,
					items: [
						{
							title: "Лечение кариеса эмали 1.6",
							priceRub: 3500,
							quantity: 1,
							toothCode: "16",
						},
						{
							title: "Анестезия инфильтрационная Артикаин",
							priceRub: 800,
							quantity: 1,
						},
					],
				},
				headers,
				log: {
					warn: () => {},
					info: () => {},
					error: () => {},
				},
			} as any;

			const mockReply = createMockReply();
			await handleCreateInvoice(mockReq, mockReply);

			assert.equal(mockReply.statusCode, 201, "Must create invoice with 201 Created");
			assert.equal(mockReply.sentBody.success, true);
			assert.equal(mockReply.sentBody.itemsCount, 2, "Must report 2 items created");
			assert.ok(Array.isArray(mockReply.sentBody.invoice.items), "invoice.items must be an array");
			assert.equal(mockReply.sentBody.invoice.items.length, 2, "Must return 2 items inside invoice");
			assert.equal(mockReply.sentBody.invoice.items[0].title, "Лечение кариеса эмали 1.6");
			assert.equal(mockReply.sentBody.invoice.totalAmountRub, 4300, "Must calculate total sum 4300 ₽");

			const invoiceId = mockReply.sentBody.invoice.id;

			// GET /api/invoices/:id
			const getReq = {
				organizationId: orgId,
				params: { id: invoiceId },
				headers,
				log: { warn: () => {}, info: () => {}, error: () => {} },
			} as any;
			const getReply = createMockReply();
			await handleGetInvoiceById(getReq, getReply);

			assert.equal(getReply.statusCode, 200, "Must retrieve invoice with 200 OK");
			assert.ok(Array.isArray(getReply.sentBody.items), "GET invoice must include items array");
			assert.equal(getReply.sentBody.items.length, 2, "Must retrieve all 2 line items from treatment_items");
			assert.equal(getReply.sentBody.items[0].title, "Лечение кариеса эмали 1.6");

			// GET /api/invoices (list)
			const listReq = {
				organizationId: orgId,
				query: { patientId },
				headers,
				log: { warn: () => {}, info: () => {}, error: () => {} },
			} as any;
			const listReply = createMockReply();
			await handleListInvoices(listReq, listReply);

			assert.equal(listReply.statusCode, 200);
			const foundInvoice = listReply.sentBody.invoices.find((inv: any) => inv.id === invoiceId);
			assert.ok(foundInvoice, "Must find invoice in list");
			assert.ok(Array.isArray(foundInvoice.items), "Invoice in list must have items array");
			assert.equal(foundInvoice.items.length, 2, "Invoice in list must have 2 items attached");
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
