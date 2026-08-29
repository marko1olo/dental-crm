/**
 * Clinic Operating Expenses & P&L API Integration Tests.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerExpensesRoutes } from "./expenses.js";

const ORG_ID_1 = "11111111-1111-1111-1111-111111111111";
const ORG_ID_2 = "22222222-2222-2222-2222-222222222222";

async function buildTestApp() {
	process.env.NODE_ENV = "test";
	const app = Fastify();
	await app.register(registerExpensesRoutes);
	await app.ready();
	return app;
}

function createStaffHeaders(organizationId: string, userId = "usr-admin-1", role = "admin") {
	const token = signToken(
		{ organizationId, userId, role },
		authTokenSecret(),
	);
	return {
		"x-dente-staff-token": token,
	};
}

describe("Expenses & P&L API Routes", () => {
	it("creates a new operating expense via POST /api/v1/expenses", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(ORG_ID_1);

		const res = await app.inject({
			method: "POST",
			url: "/api/v1/expenses",
			headers,
			payload: {
				organizationId: ORG_ID_1,
				category: "rent",
				amountKopecks: 20000000, // 200,000 RUB
				expenseDate: "2026-08-01",
				vendorName: "ООО Аренда Плюс",
				periodicity: "monthly",
				paymentMethod: "cashless_invoice",
			},
		});

		if (res.statusCode !== 201) {
			console.error("POST /api/v1/expenses failed with:", res.body);
		}
		assert.equal(res.statusCode, 201);
		const json = res.json();
		assert.equal(json.success, true);
		assert.equal(json.data.category, "rent");
		assert.equal(json.data.amountKopecks, 20000000);
		assert.equal(json.data.organizationId, ORG_ID_1);
		assert.ok(json.data.id);
	});

	it("lists operating expenses via GET /api/v1/expenses with category filter and strict tenant isolation", async () => {
		const app = await buildTestApp();
		const headersOrg1 = createStaffHeaders(ORG_ID_1);
		const headersOrg2 = createStaffHeaders(ORG_ID_2);

		// Add supplies expense for org1
		await app.inject({
			method: "POST",
			url: "/api/v1/expenses",
			headers: headersOrg1,
			payload: {
				category: "supplies",
				amountKopecks: 5000000, // 50,000 RUB
				expenseDate: "2026-08-05",
				vendorName: "Дентал Маркет",
			},
		});

		// Add supplies expense for org2
		await app.inject({
			method: "POST",
			url: "/api/v1/expenses",
			headers: headersOrg2,
			payload: {
				category: "supplies",
				amountKopecks: 8000000,
				expenseDate: "2026-08-06",
				vendorName: "Орг 2 Поставщик",
			},
		});

		// Org 1 lists expenses
		const res1 = await app.inject({
			method: "GET",
			url: "/api/v1/expenses?category=supplies",
			headers: headersOrg1,
		});

		assert.equal(res1.statusCode, 200);
		const json1 = res1.json();
		assert.ok(Array.isArray(json1.data));
		assert.ok(json1.data.length >= 1);
		assert.ok(json1.data.every((e: any) => e.organizationId === ORG_ID_1));

		// Org 2 lists expenses
		const res2 = await app.inject({
			method: "GET",
			url: "/api/v1/expenses?category=supplies",
			headers: headersOrg2,
		});
		assert.equal(res2.statusCode, 200);
		const json2 = res2.json();
		assert.ok(json2.data.every((e: any) => e.organizationId === ORG_ID_2));
	});

	it("computes monthly P&L summary via GET /api/v1/expenses/summary", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(ORG_ID_1);

		const res = await app.inject({
			method: "GET",
			url: "/api/v1/expenses/summary?month=2026-08&revenueRub=500000",
			headers,
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.ok(json.data.summary);
		assert.ok(json.data.profit);
		assert.equal(json.data.profit.revenueRub, 500000);
		assert.equal(typeof json.data.profit.netProfitRub, "number");
		assert.equal(typeof json.data.profit.profitMarginPercent, "number");
	});

	it("deletes an expense via DELETE /api/v1/expenses/:id and prevents BOLA/IDOR cross-tenant deletion", async () => {
		const app = await buildTestApp();
		const headersOrg1 = createStaffHeaders(ORG_ID_1);
		const headersOrg2 = createStaffHeaders(ORG_ID_2);

		// Create in Org 1
		const createRes = await app.inject({
			method: "POST",
			url: "/api/v1/expenses",
			headers: headersOrg1,
			payload: {
				category: "marketing",
				amountKopecks: 3000000,
				expenseDate: "2026-08-10",
			},
		});
		const expenseId = createRes.json().data.id;

		// Attempt deletion from Org 2 -> should return 404 (IDOR prevented)
		const idorDelRes = await app.inject({
			method: "DELETE",
			url: `/api/v1/expenses/${expenseId}`,
			headers: headersOrg2,
		});
		assert.equal(idorDelRes.statusCode, 404);

		// Delete from Org 1 -> 200
		const delRes = await app.inject({
			method: "DELETE",
			url: `/api/v1/expenses/${expenseId}`,
			headers: headersOrg1,
		});
		assert.equal(delRes.statusCode, 200);
		assert.equal(delRes.json().success, true);

		// Delete again -> 404
		const delAgainRes = await app.inject({
			method: "DELETE",
			url: `/api/v1/expenses/${expenseId}`,
			headers: headersOrg1,
		});
		assert.equal(delAgainRes.statusCode, 404);
	});
});
