import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { afterEach, describe, mock, test } from "node:test";
import { createPaymentInDb, getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";
import { dbRaw } from "../../db/client.js";
import {
	appointments,
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	fiscalReceiptQueue,
	patients,
	payments,
	visits,
} from "../../db/schema.js";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001";
const TEST_PAT_ID = "00000000-0000-0000-0000-000000000002";
const TEST_VIS_ID = "00000000-0000-0000-0000-000000000003";
const TEST_DOC_ID = "00000000-0000-0000-0000-000000000004";
const TEST_PAY_ID = "00000000-0000-0000-0000-000000000005";
const TEST_CASHBOX_ID = "00000000-0000-0000-0000-000000000006";
const TEST_CASHLESS_BOX_ID = "00000000-0000-0000-0000-000000000007";
const TEST_SHIFT_ID = "00000000-0000-0000-0000-000000000008";
const TEST_APPT_ID = "00000000-0000-0000-0000-000000000009";

function stubReadTransaction(rows: unknown[]) {
	const tx = {
		execute: async () => [],
		select: () => ({
			from: () => ({
				where: async () => rows,
			}),
		}),
	};
	mock.method(dbRaw, "transaction", async (callback: (t: unknown) => unknown) => callback(tx));
}

describe("getPaymentsByPatientIdInDb", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	test("returns empty array when no payments are found", async () => {
		stubReadTransaction([]);

		const result = await getPaymentsByPatientIdInDb(TEST_ORG_ID, TEST_PAT_ID);
		assert.deepStrictEqual(result, []);
	});

	test("maps createdAt and paidAt dates to ISO strings correctly", async () => {
		stubReadTransaction([
			{
				id: "1",
				organizationId: TEST_ORG_ID,
				patientId: TEST_PAT_ID,
				visitId: null,
				documentId: null,
				amountRub: 1000,
				amountKopecks: 100000n,
				method: "card",
				clientMutationId: null,
				fiscalReceiptNumber: null,
				fiscalReceiptIssuedAt: null,
				fiscalReceiptUrl: null,
				fiscalReceipt: null,
				payerFullName: null,
				payerInn: null,
				payerBirthDate: null,
				payerIdentityDocument: null,
				payerRelationship: null,
				taxDeductionCode: null,
				note: null,
				status: "paid",
				createdAt: new Date("2023-10-01T12:00:00Z"),
				paidAt: new Date("2023-10-02T12:00:00Z"),
			},
			{
				id: "2",
				organizationId: TEST_ORG_ID,
				patientId: TEST_PAT_ID,
				visitId: null,
				documentId: null,
				amountRub: 500,
				amountKopecks: 50000n,
				method: "cash",
				clientMutationId: null,
				fiscalReceiptNumber: null,
				fiscalReceiptIssuedAt: null,
				fiscalReceiptUrl: null,
				fiscalReceipt: null,
				payerFullName: null,
				payerInn: null,
				payerBirthDate: null,
				payerIdentityDocument: null,
				payerRelationship: null,
				taxDeductionCode: null,
				note: null,
				status: "pending",
				createdAt: new Date("2023-10-03T12:00:00Z"),
				paidAt: new Date("2023-10-04T12:00:00Z"),
			},
		]);

		const result = await getPaymentsByPatientIdInDb(TEST_ORG_ID, TEST_PAT_ID);

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

const mockDate = new Date("2024-01-01T00:00:00Z");

const mockPaymentData = {
	id: TEST_PAY_ID,
	organizationId: TEST_ORG_ID,
	patientId: TEST_PAT_ID,
	visitId: TEST_VIS_ID,
	documentId: TEST_DOC_ID,
	amountRub: 1000,
	amountKopecks: 100000n,
	method: "card",
	clientMutationId: "mut-123",
	fiscalReceiptNumber: "rec-123",
	fiscalReceiptIssuedAt: "2024-01-01",
	fiscalReceiptUrl: "https://receipt",
	fiscalReceipt: { data: "receipt" },
	payerFullName: "Барабаш Сергей Васильевич",
	payerInn: "770123456789",
	payerBirthDate: "1990-01-01",
	payerIdentityDocument: "4510 123456",
	payerRelationship: "self",
	taxDeductionCode: "1",
	note: "Оплата стоматологических услуг",
	createdAt: mockDate,
	paidAt: mockDate,
	status: "paid",
};

/** Счётчик вызовов идёт по tx внутри withTenantCtx (dbRaw.transaction) с разбором таблиц. */
function stubTransaction(options: {
	lockedPatients?: Array<{ id: string; fullName?: string; familyGroupId?: string | null }>;
	insertedRows?: unknown[];
	updateSets?: Array<{ table: unknown; values: Record<string, unknown> }>;
}) {
	const calls = {
		select: 0,
		insert: 0,
		paymentsInsert: 0,
		fiscalInsert: 0,
		cashOpsInsert: 0,
		update: 0,
	};
	const defaultCashBoxes = [
		{
			id: TEST_CASHBOX_ID,
			organizationId: TEST_ORG_ID,
			type: "main",
			isMain: true,
			isCashless: false,
			balance: "0",
			balanceKopecks: 0n,
		},
		{
			id: TEST_CASHLESS_BOX_ID,
			organizationId: TEST_ORG_ID,
			type: "cashless",
			isMain: false,
			isCashless: true,
			balance: "0",
			balanceKopecks: 0n,
		},
	];
	const defaultShifts = [
		{
			id: TEST_SHIFT_ID,
			organizationId: TEST_ORG_ID,
			cashBoxId: TEST_CASHBOX_ID,
			status: "open",
			openedAt: new Date(),
			shiftNumber: 1,
			incomeCashKopecks: 0n,
			incomeElectronicKopecks: 0n,
			incomeSbpKopecks: 0n,
			advanceOffsetKopecks: 0n,
			insuranceTotalKopecks: 0n,
			expenseTotalKopecks: 0n,
			totalCashKopecks: 0n,
			totalElectronicKopecks: 0n,
			totalRefundsKopecks: 0n,
		},
	];
	const defaultVisits = [
		{
			id: TEST_VIS_ID,
			organizationId: TEST_ORG_ID,
			patientId: TEST_PAT_ID,
			appointmentId: TEST_APPT_ID,
			status: "draft",
		},
	];

	const rowsForTable = (table: unknown): unknown[] => {
		if (table === patients) {
			return (
				options.lockedPatients ?? [
					{ id: TEST_PAT_ID, fullName: "Тест Пациент", familyGroupId: null },
				]
			);
		}
		if (table === cashBoxes) return defaultCashBoxes;
		if (table === cashBoxShifts) return defaultShifts;
		if (table === visits) return defaultVisits;
		return [];
	};

	const tx = {
		select: () => {
			calls.select += 1;
			return {
				from: (table: unknown) => {
					const rows = rowsForTable(table);
					const makeChain = () => {
						const chain = {
							orderBy: () => ({
								for: async () => rows,
								limit: async () => rows,
							}),
							for: () =>
								Object.assign(Promise.resolve(rows), {
									limit: async () => rows,
								}),
							limit: async () => rows,
						};
						return Object.assign(Promise.resolve(rows), chain);
					};
					return {
						where: () => makeChain(),
						limit: async () => rows,
					};
				},
			};
		},
		insert: (table: unknown) => {
			calls.insert += 1;
			if (table === payments) calls.paymentsInsert += 1;
			if (table === fiscalReceiptQueue) calls.fiscalInsert += 1;
			if (table === cashOperations) calls.cashOpsInsert += 1;
			return {
				values: () => ({
					returning: async () =>
						table === payments ? (options.insertedRows ?? [mockPaymentData]) : [{ id: randomUUID() }],
				}),
			};
		},
		update: (table: unknown) => {
			calls.update += 1;
			return {
				set: (values: Record<string, unknown>) => {
					options.updateSets?.push({ table, values });
					return {
						where: async () => [],
					};
				},
			};
		},
		execute: async () => [],
	};
	mock.method(dbRaw, "transaction", async (callback: (t: unknown) => unknown) => callback(tx));
	return calls;
}

describe("createPaymentInDb", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	test("successfully creates a payment", async () => {
		const calls = stubTransaction({ insertedRows: [mockPaymentData] });

		const result = await createPaymentInDb(TEST_ORG_ID, {
			patientId: TEST_PAT_ID,
			amountRub: 1000,
			method: "card",
			clientMutationId: randomUUID(),
		});

		assert.strictEqual(result.id, TEST_PAY_ID);
		assert.strictEqual(result.amountRub, 1000);
		// 1 запись в payments + 1 запись в fiscalReceiptQueue по 54-ФЗ
		assert.strictEqual(calls.paymentsInsert, 1);
		assert.strictEqual(calls.fiscalInsert, 1);
		// Блокировка обязана быть взята до вставки.
		assert.ok(calls.select >= 1);
	});

	test("throws error when returning is empty", async () => {
		stubTransaction({ insertedRows: [] });

		await assert.rejects(
			() =>
				createPaymentInDb(TEST_ORG_ID, {
					patientId: TEST_PAT_ID,
					amountRub: 1000,
					method: "card",
					clientMutationId: randomUUID(),
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
				createPaymentInDb(TEST_ORG_ID, {
					patientId: TEST_PAT_ID,
					amountRub: 1000,
					method: "card",
					clientMutationId: randomUUID(),
				}),
			/не найден или заблокирован/,
		);
		assert.strictEqual(calls.insert, 0);
	});

	test("успешно проводит гарантийную переделку / платеж со 100% скидкой (0 руб)", async () => {
		const zeroPaymentData = {
			...mockPaymentData,
			amountRub: 0,
			amountKopecks: 0n,
			note: "Гарантийная переделка (скидка 100%)",
		};
		const calls = stubTransaction({ insertedRows: [zeroPaymentData] });

		const result = await createPaymentInDb(TEST_ORG_ID, {
			patientId: TEST_PAT_ID,
			amountRub: 0,
			discountPercent: 100,
			method: "card",
			note: "Гарантийная замена пломбы",
			clientMutationId: randomUUID(),
		});

		assert.strictEqual(result.id, TEST_PAY_ID);
		assert.strictEqual(result.amountRub, 0);
		assert.strictEqual(calls.paymentsInsert, 1);
		assert.strictEqual(calls.fiscalInsert, 0);
	});

	test("успешно проводит смешанную оплату (split payment) с точностью до копейки и создает 2 записи (cash + card)", async () => {
		const calls = stubTransaction({ insertedRows: [mockPaymentData] });

		const result = await createPaymentInDb(TEST_ORG_ID, {
			patientId: TEST_PAT_ID,
			amountRub: 4000,
			method: "split",
			cashAmountKopecks: 150050,
			electronicAmountKopecks: 249950,
			clientMutationId: randomUUID(),
		});

		assert.strictEqual(result.amountRub, 4000);
		// Ровно 2 вставки в payments (наличная и безналичная части) + 1 запись в fiscalReceiptQueue
		assert.strictEqual(calls.paymentsInsert, 2);
		assert.strictEqual(calls.fiscalInsert, 1);
	});

	test("отклоняет смешанную оплату, если сумма частей не совпадает с общей суммой", async () => {
		stubTransaction({ insertedRows: [mockPaymentData] });

		await assert.rejects(
			() =>
				createPaymentInDb(TEST_ORG_ID, {
					patientId: TEST_PAT_ID,
					amountRub: 4000,
					method: "split",
					cashAmountKopecks: 100000,
					electronicAmountKopecks: 200000, // 1000 + 2000 = 3000 != 4000
					clientMutationId: randomUUID(),
				}),
			/не совпадает с общей суммой/,
		);
	});

	test("при полной оплате визита переводит визит в signed, прием в completed и услуги в completed", async () => {
		const updateSets: Array<{ table: unknown; values: Record<string, unknown> }> = [];
		stubTransaction({ insertedRows: [mockPaymentData], updateSets });

		const result = await createPaymentInDb(TEST_ORG_ID, {
			patientId: TEST_PAT_ID,
			visitId: TEST_VIS_ID,
			amountRub: 1000,
			method: "card",
			clientMutationId: randomUUID(),
		});

		assert.strictEqual(result.id, TEST_PAY_ID);
		const signedVisitUpdate = updateSets.find(
			(u) => u.table === visits && u.values.status === "signed",
		);
		const completedApptUpdate = updateSets.find(
			(u) => u.table === appointments && u.values.status === "completed",
		);
		assert.ok(signedVisitUpdate, "Визит должен быть переведен в статус signed");
		assert.ok(completedApptUpdate, "Связанная запись расписания должна быть переведена в completed");
	});
});
