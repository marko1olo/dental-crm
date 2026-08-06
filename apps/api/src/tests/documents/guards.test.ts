import assert from "node:assert";
import { test } from "node:test";
import type { CreateDocumentInput, Payment } from "@dental/shared";
import { taxPaymentSelectionErrorForDocument } from "../../documents/guards.js";

test("taxPaymentSelectionErrorForDocument", async (t) => {
	const baseInput: CreateDocumentInput = {
		patientId: "patient-1",
		kind: "medical_record_extract", // not a tax document
		payload: {},
	};

	const validPayment: Payment = {
		id: "payment-1",
		patientId: "patient-1",
		status: "paid",
		amountRub: 1000,
		paidAt: "2024-05-10T10:00:00Z",
		payerInn: "123456789012",
		createdAt: "2024-05-10T10:00:00Z",
		updatedAt: "2024-05-10T10:00:00Z",
	} as unknown as Payment; // Cast as Payment for partial mock

	await t.test("returns null for non-tax document kinds", () => {
		const error = taxPaymentSelectionErrorForDocument(baseInput, [
			validPayment,
		]);
		assert.strictEqual(error, null);
	});

	const taxInput: CreateDocumentInput = {
		patientId: "patient-1",
		kind: "tax_deduction_certificate",
		taxYear: 2024,
		taxPayerInn: "123456789012",
		payload: {
			taxPaymentSelection: {
				selectedPaymentIds: [],
			},
		},
	};

	await t.test(
		"returns error when no payments are selected for a tax document",
		() => {
			const error = taxPaymentSelectionErrorForDocument(taxInput, [
				validPayment,
			]);
			assert.match(error!, /нужно явно выбрать фискальные чеки/);
		},
	);

	await t.test("returns error for duplicate selected payment IDs", () => {
		const duplicateInput: CreateDocumentInput = {
			...taxInput,
			payload: {
				taxPaymentSelection: {
					selectedPaymentIds: ["payment-1", "payment-1"],
				},
			},
		};
		const error = taxPaymentSelectionErrorForDocument(duplicateInput, [
			validPayment,
		]);
		assert.match(error!, /В выбранных чеках есть дубли/);
	});

	const validTaxInput: CreateDocumentInput = {
		...taxInput,
		payload: {
			taxPaymentSelection: {
				selectedPaymentIds: ["payment-1"],
			},
		},
	};

	await t.test("returns error when a selected payment is not found", () => {
		const error = taxPaymentSelectionErrorForDocument(validTaxInput, []);
		assert.match(error!, /Выбранный фискальный чек не найден/);
	});

	await t.test(
		"returns error when a selected payment belongs to a different patient",
		() => {
			const otherPatientPayment = { ...validPayment, patientId: "patient-2" };
			const error = taxPaymentSelectionErrorForDocument(validTaxInput, [
				otherPatientPayment,
			]);
			assert.match(error!, /относится к другому пациенту/);
		},
	);

	await t.test("returns error when a selected payment is not paid", () => {
		const unpaidPayment = {
			...validPayment,
			status: "pending",
		} as unknown as Payment;
		const error = taxPaymentSelectionErrorForDocument(validTaxInput, [
			unpaidPayment,
		]);
		assert.match(error!, /только проведенные положительные оплаты/);
	});

	await t.test("returns error when a selected payment has zero amount", () => {
		const zeroAmountPayment = { ...validPayment, amountRub: 0 };
		const error = taxPaymentSelectionErrorForDocument(validTaxInput, [
			zeroAmountPayment,
		]);
		assert.match(error!, /только проведенные положительные оплаты/);
	});

	await t.test(
		"returns error when a selected payment is from a different tax year",
		() => {
			const pastYearPayment = {
				...validPayment,
				paidAt: "2023-05-10T10:00:00Z",
			};
			const error = taxPaymentSelectionErrorForDocument(validTaxInput, [
				pastYearPayment,
			]);
			assert.match(error!, /не относится к выбранному налоговому году/);
		},
	);

	await t.test(
		"returns error when a selected payment has a different taxpayer INN",
		() => {
			const differentInnPayment = { ...validPayment, payerInn: "098765432109" };
			const error = taxPaymentSelectionErrorForDocument(validTaxInput, [
				differentInnPayment,
			]);
			assert.match(error!, /относится к другому ИНН плательщика/);
		},
	);

	await t.test("returns null when all checks pass", () => {
		const error = taxPaymentSelectionErrorForDocument(validTaxInput, [
			validPayment,
		]);
		assert.strictEqual(error, null);
	});

	await t.test(
		"returns null for tax_deduction_application when all checks pass",
		() => {
			const applicationInput: CreateDocumentInput = {
				patientId: "patient-1",
				kind: "tax_deduction_application",
				payload: {
					taxDeductionApplication: {
						requestedTaxYear: 2024,
						taxpayerInn: "123456789012",
						selectedPaymentIds: ["payment-1"],
					},
				} as any, // Cast as any because we might not be providing all the required fields for the application payload mock
			};
			const error = taxPaymentSelectionErrorForDocument(applicationInput, [
				validPayment,
			]);
			assert.strictEqual(error, null);
		},
	);
});
