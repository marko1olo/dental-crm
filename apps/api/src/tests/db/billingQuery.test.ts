import assert from "node:assert";
import { afterEach, describe, mock, test } from "node:test";
import { createPaymentInDb, getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";
import { db } from "../../db/client.js";

describe("getPaymentsByPatientIdInDb", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	test("returns empty array when no payments are found", async (t) => {
		t.mock.method(db, "select", () => ({
			from: () => ({
				where: async () => [],
			}),
		}));

		const result = await getPaymentsByPatientIdInDb("org-1", "patient-1");
		assert.deepStrictEqual(result, []);
	});

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

/**
 * createPaymentInDb выполняется целиком внутри db.transaction и работает через
 * объект транзакции: сначала tx.select(...).for("update") — пессимистичная
 * блокировка пациента против гонки по балансу, затем tx.insert.
 *
 * Тесты подменяли db.insert, который в этом пути не вызывается вовсе. Подмена
 * не срабатывала, транзакция открывалась к живой базе, и оба теста падали на
 * настоящем запросе `select "id" from "patients" ... for update`. Второй тест
 * при этом «проверял» текст ошибки, которого не получал: вместо
 * «Failed to create payment» приходила ошибка драйвера.
 *
 * Подменяется db.transaction, а колбэку передаётся поддельный tx.
 */
const mockDate = new Date("2024-01-01T00:00:00Z");

const mockPaymentData = {
	id: "pay-123",
	organizationId: "org-123",
	patientId: "pat-123",
	visitId: "vis-123",
	documentId: "doc-123",
	amountRub: 1000,
	method: "card",
	clientMutationId: "mut-123",
	fiscalReceiptNumber: "rec-123",
	fiscalReceiptIssuedAt: "2024-01-01",
	fiscalReceiptUrl: "https://receipt",
	fiscalReceipt: { data: "receipt" },
	payerFullName: "John Doe",
	payerInn: "1234567890",
	payerBirthDate: "1990-01-01",
	payerIdentityDocument: "passport",
	payerRelationship: "self",
	taxDeductionCode: "1",
	note: "test payment",
	createdAt: mockDate,
	paidAt: mockDate,
	status: "paid",
};

/** Счётчик вызовов идёт по tx, а не по db: подменяется именно транзакция. */
function stubTransaction(options: {
	lockedPatients?: Array<{ id: string }>;
	insertedRows?: unknown[];
}) {
	const calls = { select: 0, insert: 0 };
	const tx = {
		select: () => {
			calls.select += 1;
			return {
				from: () => ({
					where: () => ({
						for: () => ({
							limit: async () => options.lockedPatients ?? [{ id: "pat-123" }],
						}),
					}),
				}),
			};
		},
		insert: () => {
			calls.insert += 1;
			return {
				values: () => ({ returning: async () => options.insertedRows ?? [] }),
			};
		},
	};
	mock.method(db, "transaction", async (callback: (tx: unknown) => unknown) =>
		callback(tx),
	);
	return calls;
}

describe("createPaymentInDb", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	test("successfully creates a payment", async () => {
		const calls = stubTransaction({ insertedRows: [mockPaymentData] });

		const result = await createPaymentInDb("org-123", {
			patientId: "pat-123",
			amountRub: 1000,
			method: "card",
		});

		assert.strictEqual(result.id, "pay-123");
		assert.strictEqual(result.amountRub, 1000);
		assert.strictEqual(calls.insert, 1);
		// Блокировка обязана быть взята до вставки.
		assert.ok(calls.select >= 1);
	});

	test("throws error when returning is empty", async () => {
		stubTransaction({ insertedRows: [] });

		await assert.rejects(
			() =>
				createPaymentInDb("org-123", {
					patientId: "pat-123",
					amountRub: 1000,
					method: "card",
				}),
			{ message: "Не удалось создать запись платежа в базе данных." },
		);
	});

	test("не вставляет платёж, если пациент не найден или заблокирован", async () => {
		// Ветка пессимистичной блокировки: без неё платёж мог быть записан
		// пациенту чужой организации или уйти в гонку по балансу.
		const calls = stubTransaction({
			lockedPatients: [],
			insertedRows: [mockPaymentData],
		});

		await assert.rejects(
			() =>
				createPaymentInDb("org-123", {
					patientId: "pat-123",
					amountRub: 1000,
					method: "card",
				}),
			/не найден или заблокирован/,
		);
		assert.strictEqual(calls.insert, 0);
	});
});
