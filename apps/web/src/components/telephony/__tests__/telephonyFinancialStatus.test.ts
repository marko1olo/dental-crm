import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { calculatePatientFinancialStatus } from "../../../store/telephonyStore.js";
import { mockInsuranceContracts, mockPatients } from "./telephonyTestFixtures.js";

describe("Telephony: Financial Status & Debtor Checks", () => {
	test("calculates debtor financial status with active DMS insurance", () => {
		const summary = calculatePatientFinancialStatus(
			mockPatients[0],
			null,
			mockInsuranceContracts,
		);
		assert.equal(summary.balanceRub, -4500);
		assert.equal(summary.hasDebt, true);
		assert.equal(summary.debtRub, 4500);
		assert.equal(summary.hasInsurance, true);
		assert.equal(summary.insuranceName, "СОГАЗ Страхование");
		assert.equal(summary.policyNumber, "СОГАЗ-987654");
	});

	test("calculates positive balance financial status", () => {
		const summary = calculatePatientFinancialStatus(
			mockPatients[1],
			null,
			mockInsuranceContracts,
		);
		assert.equal(summary.balanceRub, 12000);
		assert.equal(summary.hasDebt, false);
		assert.equal(summary.debtRub, 0);
		assert.ok(summary.formattedBalance.startsWith("+"));
	});

	test("handles null patient gracefully", () => {
		const summary = calculatePatientFinancialStatus(null);
		assert.equal(summary.balanceRub, 0);
		assert.equal(summary.hasDebt, false);
		assert.equal(summary.debtRub, 0);
		assert.equal(summary.hasInsurance, false);
	});
});
