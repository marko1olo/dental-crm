import assert from "node:assert";
import { describe, test } from "node:test";
import { getPaymentsByPatientIdInDb } from "./billingQuery.js";
import { db } from "./client.js";

describe("getPaymentsByPatientIdInDb", () => {
	test("returns empty array when no payments are found", async (t) => {
		t.mock.method(db, "select", () => ({
			from: () => ({
				where: async () => [],
			}),
		}));

		const result = await getPaymentsByPatientIdInDb("org-1", "patient-1");
		assert.deepStrictEqual(result, []);
	});

	// Маппер отдаёт createdAt и paidAt; поля updatedAt в контракте Payment нет.
	// Фикстура задавала updatedAt, поэтому p.paidAt оказывался undefined и
	// маппер падал на .toISOString(). В базе paid_at объявлен NOT NULL (как и в
	// schema.ts), так что для рабочего кода обращение без проверки безопасно —
	// ошибочной была именно фикстура.
	test("maps createdAt and paidAt dates to ISO strings correctly", async (t) => {
		t.mock.method(db, "select", () => ({
			from: () => ({
				where: async () => [
					{
						id: "1",
						organizationId: "org-1",
						patientId: "patient-1",
						amountRub: 1000,
						status: "paid",
						createdAt: new Date("2023-10-01T12:00:00Z"),
						paidAt: new Date("2023-10-02T12:00:00Z"),
					},
					{
						id: "2",
						organizationId: "org-1",
						patientId: "patient-1",
						amountRub: 500,
						status: "pending",
						createdAt: new Date("2023-10-03T12:00:00Z"),
						paidAt: new Date("2023-10-04T12:00:00Z"),
					},
				],
			}),
		}));

		const result = await getPaymentsByPatientIdInDb("org-1", "patient-1");

		assert.strictEqual(result.length, 2);
		// Локальные переменные под noUncheckedIndexedAccess: assert.ok — настоящая
		// проверка, тест падает внятно, а не TypeError-ом на обращении к полю.
		const firstPayment = result[0];
		const secondPayment = result[1];
		assert.ok(firstPayment);
		assert.ok(secondPayment);
		assert.strictEqual(firstPayment.id, "1");
		assert.strictEqual(firstPayment.createdAt, "2023-10-01T12:00:00.000Z");
		assert.strictEqual(firstPayment.paidAt, "2023-10-02T12:00:00.000Z");
		assert.strictEqual(secondPayment.id, "2");
		assert.strictEqual(secondPayment.createdAt, "2023-10-03T12:00:00.000Z");
		assert.strictEqual(secondPayment.paidAt, "2023-10-04T12:00:00.000Z");
	});
});
