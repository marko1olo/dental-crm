import assert from "node:assert";
import { describe, it } from "node:test";
import type { Dashboard } from "@dental/shared";
import {
	clinicalRuleSummaryForUi,
	completedActContractReferenceForUi,
	paymentFiscalReceiptLabelForUi,
	paymentTaxYearForUi,
	taxPaymentPayerKeyForUi,
} from "../workspaceUiLabels.js";

describe("workspaceUiLabels functions", () => {
	describe("paymentTaxYearForUi", () => {
		it("returns null if neither date is present", () => {
			assert.strictEqual(paymentTaxYearForUi({} as any), null);
		});

		it("returns the year from fiscalReceiptIssuedAt if it starts with year", () => {
			assert.strictEqual(
				paymentTaxYearForUi({
					fiscalReceiptIssuedAt: "2023-10-15",
					paidAt: null,
				} as unknown as Pick<
					Dashboard["payments"][number],
					"fiscalReceiptIssuedAt" | "paidAt"
				>),
				2023,
			);
		});

		it("falls back to paidAt if fiscalReceiptIssuedAt is not present", () => {
			assert.strictEqual(
				paymentTaxYearForUi({
					paidAt: "2022-05-20",
					fiscalReceiptIssuedAt: null,
				} as unknown as Pick<
					Dashboard["payments"][number],
					"fiscalReceiptIssuedAt" | "paidAt"
				>),
				2022,
			);
		});

		it("prefers fiscalReceiptIssuedAt over paidAt", () => {
			assert.strictEqual(
				paymentTaxYearForUi({
					fiscalReceiptIssuedAt: "2024-01-01",
					paidAt: "2023-12-31",
				}),
				2024,
			);
		});

		it("handles ISO date strings", () => {
			assert.strictEqual(
				paymentTaxYearForUi({ paidAt: "2021-08-10T12:00:00Z" }),
				2021,
			);
		});

		it("handles explicit parsing fallback", () => {
			assert.strictEqual(
				paymentTaxYearForUi({ paidAt: "October 13, 2014 11:13:00" }),
				2014,
			);
		});

		it("returns null for invalid date formats", () => {
			assert.strictEqual(paymentTaxYearForUi({ paidAt: "invalid-date" }), null);
		});
	});

	describe("taxPaymentPayerKeyForUi", () => {
		it("returns inn key if payerInn is present", () => {
			assert.strictEqual(
				taxPaymentPayerKeyForUi({ payerInn: "1234567890" }),
				"inn:1234567890",
			);
		});

		it("trims payerInn", () => {
			assert.strictEqual(
				taxPaymentPayerKeyForUi({ payerInn: " 1234567890 " }),
				"inn:1234567890",
			);
		});

		it("returns identity key if at least 3 identity parts are present", () => {
			assert.strictEqual(
				taxPaymentPayerKeyForUi({
					payerFullName: "Иванов Иван Иванович",
					payerBirthDate: "1990-01-01",
					payerIdentityDocument: "1234 567890",
				}),
				"identity:иванов иван иванович|1990-01-01|1234 567890",
			);
		});

		it("includes all 4 identity parts if present", () => {
			assert.strictEqual(
				taxPaymentPayerKeyForUi({
					payerFullName: "Иванов Иван Иванович",
					payerBirthDate: "1990-01-01",
					payerIdentityDocument: "1234 567890",
					payerRelationship: "child",
				}),
				"identity:иванов иван иванович|1990-01-01|1234 567890|child",
			);
		});

		it("returns empty string if fewer than 3 identity parts are present", () => {
			assert.strictEqual(
				taxPaymentPayerKeyForUi({
					payerFullName: "Иванов Иван Иванович",
					payerBirthDate: "1990-01-01",
				}),
				"",
			);
		});

		it("returns empty string if no fields are provided", () => {
			assert.strictEqual(taxPaymentPayerKeyForUi({}), "");
		});
	});

	describe("paymentFiscalReceiptLabelForUi", () => {
		it("returns structured label if fiscalReceipt parts are present", () => {
			assert.strictEqual(
				paymentFiscalReceiptLabelForUi({
					id: "123",
					fiscalReceipt: { fn: "111", fd: "222", fpd: "333" },
				}),
				"ФН 111; ФД 222; ФПД 333",
			);
		});

		it("filters out missing structured parts", () => {
			assert.strictEqual(
				paymentFiscalReceiptLabelForUi({
					id: "123",
					fiscalReceipt: { fn: "111", fpd: "333" },
				}),
				"ФН 111; ФПД 333",
			);
		});

		it("falls back to fiscalReceiptNumber if no structured parts are present", () => {
			assert.strictEqual(
				paymentFiscalReceiptLabelForUi({
					id: "123",
					fiscalReceiptNumber: "999888",
				}),
				"999888",
			);
		});

		it("falls back to 8-char id if neither structured parts nor fiscalReceiptNumber are present", () => {
			assert.strictEqual(
				paymentFiscalReceiptLabelForUi({ id: "1234567890abcdef" }),
				"12345678",
			);
		});

		it("trims fiscalReceiptNumber", () => {
			assert.strictEqual(
				paymentFiscalReceiptLabelForUi({
					id: "123",
					fiscalReceiptNumber: " 999888 ",
				}),
				"999888",
			);
		});
	});

	describe("clinicalRuleSummaryForUi", () => {
		const defaultEval = {
			id: "1",
			ruleId: "rule1",
			resolved: false,
			severity: "warning",
			action: "show_warning",
			missingRequiredServiceIds: [],
			ruleName: "rule",
			entityId: "e",
			entityType: "visit",
		} as unknown as Dashboard["clinicalRuleEvaluations"][number];

		it("summarizes empty evaluations", () => {
			assert.deepStrictEqual(clinicalRuleSummaryForUi([], 5), {
				activeRules: 5,
				evaluatedRules: 0,
				unresolved: 0,
				blockers: 0,
				warnings: 0,
				requiredServices: 0,
				coveredRules: 0,
			});
		});

		it("counts resolved rules", () => {
			assert.deepStrictEqual(
				clinicalRuleSummaryForUi([{ ...defaultEval, resolved: true }], 5),
				{
					activeRules: 5,
					evaluatedRules: 1,
					unresolved: 0,
					blockers: 0,
					warnings: 0,
					requiredServices: 0,
					coveredRules: 1,
				},
			);
		});

		it("counts unresolved blockers and warnings", () => {
			const evaluations = [
				{ ...defaultEval, severity: "blocker" as const },
				{ ...defaultEval, severity: "blocker" as const },
				{ ...defaultEval, severity: "warning" as const },
				{ ...defaultEval, severity: "info" as const },
			];
			assert.deepStrictEqual(clinicalRuleSummaryForUi(evaluations, 10), {
				activeRules: 10,
				evaluatedRules: 4,
				unresolved: 4,
				blockers: 2,
				warnings: 1,
				requiredServices: 0,
				coveredRules: 0,
			});
		});

		it("collects unique required services", () => {
			const evaluations = [
				{ ...defaultEval, missingRequiredServiceIds: ["srv1", "srv2"] },
				{ ...defaultEval, missingRequiredServiceIds: ["srv2", "srv3"] },
				{ ...defaultEval, resolved: true, missingRequiredServiceIds: ["srv4"] }, // resolved ones shouldn't count for requiredServices
			];
			const summary = clinicalRuleSummaryForUi(evaluations, 10);
			assert.strictEqual(summary.requiredServices, 3); // srv1, srv2, srv3
		});
	});

	describe("completedActContractReferenceForUi", () => {
		it("returns document title if no contract payload is present", () => {
			assert.strictEqual(
				completedActContractReferenceForUi({ title: "Doc Title" }),
				"Doc Title",
			);
		});

		it("returns document title if contractNumber is missing", () => {
			assert.strictEqual(
				completedActContractReferenceForUi({
					title: "Doc Title",
					chainSummary: { paidMedicalServicesContract: {} } as any,
				}),
				"Doc Title",
			);
		});

		it("returns just contractNumber if contractDate is not present", () => {
			assert.strictEqual(
				completedActContractReferenceForUi({
					title: "Doc Title",
					chainSummary: {
						paidMedicalServicesContract: { contractNumber: "C-123" },
					} as any,
				}),
				"C-123",
			);
		});

		it("returns formatted string if both number and date are present", () => {
			assert.strictEqual(
				completedActContractReferenceForUi({
					title: "Doc Title",
					chainSummary: {
						paidMedicalServicesContract: {
							contractNumber: "C-123",
							contractDate: "2023-10-15",
						},
					} as any,
				}),
				"C-123 от 2023-10-15",
			);
		});

		it("trims contractDate", () => {
			assert.strictEqual(
				completedActContractReferenceForUi({
					title: "Doc Title",
					chainSummary: {
						paidMedicalServicesContract: {
							contractNumber: "C-123",
							contractDate: " 2023-10-15 ",
						},
					} as any,
				}),
				"C-123 от 2023-10-15",
			);
		});
	});
});
