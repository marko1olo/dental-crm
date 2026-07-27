import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { createPaymentInDb } from '../billingQuery.js';
import { db } from '../client.js';

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
const mockDate = new Date('2024-01-01T00:00:00Z');

const mockPaymentData = {
	id: 'pay-123',
	organizationId: 'org-123',
	patientId: 'pat-123',
	visitId: 'vis-123',
	documentId: 'doc-123',
	amountRub: 1000,
	method: 'card',
	clientMutationId: 'mut-123',
	fiscalReceiptNumber: 'rec-123',
	fiscalReceiptIssuedAt: '2024-01-01',
	fiscalReceiptUrl: 'https://receipt',
	fiscalReceipt: { data: 'receipt' },
	payerFullName: 'John Doe',
	payerInn: '1234567890',
	payerBirthDate: '1990-01-01',
	payerIdentityDocument: 'passport',
	payerRelationship: 'self',
	taxDeductionCode: '1',
	note: 'test payment',
	createdAt: mockDate,
	paidAt: mockDate,
	status: 'paid',
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
							limit: async () => options.lockedPatients ?? [{ id: 'pat-123' }],
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
	mock.method(db, 'transaction', async (callback: (tx: unknown) => unknown) => callback(tx));
	return calls;
}

describe('createPaymentInDb', () => {
	afterEach(() => {
		mock.restoreAll();
	});

	test('successfully creates a payment', async () => {
		const calls = stubTransaction({ insertedRows: [mockPaymentData] });

		const result = await createPaymentInDb('org-123', {
			patientId: 'pat-123',
			amountRub: 1000,
			method: 'card',
		});

		assert.strictEqual(result.id, 'pay-123');
		assert.strictEqual(result.amountRub, 1000);
		assert.strictEqual(calls.insert, 1);
		// Блокировка обязана быть взята до вставки.
		assert.strictEqual(calls.select, 1);
	});

	test('throws error when returning is empty', async () => {
		stubTransaction({ insertedRows: [] });

		await assert.rejects(
			() =>
				createPaymentInDb('org-123', {
					patientId: 'pat-123',
					amountRub: 1000,
					method: 'card',
				}),
			{ message: 'Failed to create payment' },
		);
	});

	test('не вставляет платёж, если пациент не найден или заблокирован', async () => {
		// Ветка пессимистичной блокировки: без неё платёж мог быть записан
		// пациенту чужой организации или уйти в гонку по балансу.
		const calls = stubTransaction({ lockedPatients: [], insertedRows: [mockPaymentData] });

		await assert.rejects(
			() =>
				createPaymentInDb('org-123', {
					patientId: 'pat-123',
					amountRub: 1000,
					method: 'card',
				}),
			/not found or locked by another transaction/,
		);
		assert.strictEqual(calls.insert, 0);
	});
});
