/**
 * Clinic Operating Expenses & P&L API Integration Tests.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { registerExpensesRoutes } from "./expenses.js";

async function buildTestApp() {
	const app = Fastify();
	await app.register(registerExpensesRoutes);
	await app.ready();
	return app;
}

describe("Expenses & P&L API Routes", () => {
	it("creates a new operating expense via POST /api/v1/expenses", async () => {
		const app = await buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/v1/expenses",
			payload: {
				organizationId: "11111111-1111-1111-1111-111111111111",
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
		assert.ok(json.data.id);
	});

	it("lists operating expenses via GET /api/v1/expenses with category filter", async () => {
		const app = await buildTestApp();

		// Add supplies expense
		await app.inject({
			method: "POST",
			url: "/api/v1/expenses",
			payload: {
				organizationId: "11111111-1111-1111-1111-111111111111",
				category: "supplies",
				amountKopecks: 5000000, // 50,000 RUB
				expenseDate: "2026-08-05",
				vendorName: "Дентал Маркет",
			},
		});

		const res = await app.inject({
			method: "GET",
			url: "/api/v1/expenses?category=supplies",
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.ok(Array.isArray(json.data));
		assert.ok(json.data.length >= 1);
		assert.equal(json.data[0].category, "supplies");
	});

	it("computes monthly P&L summary via GET /api/v1/expenses/summary", async () => {
		const app = await buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/v1/expenses/summary?month=2026-08&revenueRub=500000",
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.ok(json.data.summary);
		assert.ok(json.data.profit);
		assert.equal(json.data.profit.revenueRub, 500000);
		assert.equal(typeof json.data.profit.netProfitRub, "number");
		assert.equal(typeof json.data.profit.profitMarginPercent, "number");
	});

	it("deletes an expense via DELETE /api/v1/expenses/:id", async () => {
		const app = await buildTestApp();

		// Create
		const createRes = await app.inject({
			method: "POST",
			url: "/api/v1/expenses",
			payload: {
				organizationId: "11111111-1111-1111-1111-111111111111",
				category: "marketing",
				amountKopecks: 3000000,
				expenseDate: "2026-08-10",
			},
		});
		const expenseId = createRes.json().data.id;

		// Delete
		const delRes = await app.inject({
			method: "DELETE",
			url: `/api/v1/expenses/${expenseId}`,
		});
		assert.equal(delRes.statusCode, 200);
		assert.equal(delRes.json().success, true);

		// Delete again -> 404
		const delAgainRes = await app.inject({
			method: "DELETE",
			url: `/api/v1/expenses/${expenseId}`,
		});
		assert.equal(delAgainRes.statusCode, 404);
	});
});
