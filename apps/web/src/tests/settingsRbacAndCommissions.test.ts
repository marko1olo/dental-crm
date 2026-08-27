/**
 * settingsRbacAndCommissions.test.ts — Unit tests for RBAC, 152-FZ Masking, and Doctor Piece-Rate Calculator.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	GRANULAR_STAFF_ROLES,
	GRANULAR_ROLE_MATRIX,
	ROLE_METADATA_REGISTRY,
	canViewFinancialReports,
	canViewAllDoctorPayrolls,
	canViewOwnPayroll,
	canAccessFullPatientPii,
	canSignMedicalRecords,
	getAccessLevelBadge,
	maskRussianPhone,
	maskRussianPassport,
	maskRussianSnils,
	maskResidentialAddress,
	sanitizePatientRecordForViewer,
	calculateDoctorPieceRatePayout,
	formatKopecksToRublesDisplay,
	parseRublesToKopecks,
} from "@dental/shared";

describe("Settings RBAC: 8 Clinical & Administrative Roles", () => {
	it("verifies all 8 roles have full metadata and configured permissions", () => {
		assert.strictEqual(GRANULAR_STAFF_ROLES.length, 8);
		for (const role of GRANULAR_STAFF_ROLES) {
			const meta = ROLE_METADATA_REGISTRY[role];
			assert.ok(meta, `Role ${role} must have metadata`);
			assert.ok(meta.title.length > 0, `Role ${role} title must not be empty`);
			assert.ok(meta.description.length > 0, `Role ${role} description must not be empty`);

			const matrix = GRANULAR_ROLE_MATRIX[role];
			assert.ok(matrix, `Role ${role} must have matrix entry`);
			assert.ok(Object.keys(matrix).length >= 20, `Role ${role} must have at least 20 permissions configured`);
		}
	});

	it("strictly enforces P&L and financial isolation policy", () => {
		// Financial Reports (P&L, Margins, Clinic Revenue)
		assert.strictEqual(canViewFinancialReports("owner"), true);
		assert.strictEqual(canViewFinancialReports("head_doctor"), true);
		assert.strictEqual(canViewFinancialReports("accountant"), true);

		// Must be false for all clinical and front-desk staff
		assert.strictEqual(canViewFinancialReports("doctor"), false);
		assert.strictEqual(canViewFinancialReports("assistant"), false);
		assert.strictEqual(canViewFinancialReports("senior_nurse"), false);
		assert.strictEqual(canViewFinancialReports("senior_admin"), false);
		assert.strictEqual(canViewFinancialReports("registrar"), false);
	});

	it("strictly isolates all-staff payrolls while allowing own piece-rate earnings", () => {
		// All Staff Payrolls
		assert.strictEqual(canViewAllDoctorPayrolls("owner"), true);
		assert.strictEqual(canViewAllDoctorPayrolls("accountant"), true);
		assert.strictEqual(canViewAllDoctorPayrolls("head_doctor"), true);

		assert.strictEqual(canViewAllDoctorPayrolls("doctor"), false);
		assert.strictEqual(canViewAllDoctorPayrolls("assistant"), false);

		// Own Payroll / Piece-Rate
		assert.strictEqual(canViewOwnPayroll("doctor"), true);
		assert.strictEqual(canViewOwnPayroll("assistant"), true);
	});

	it("verifies 152-FZ PII access and masking policies", () => {
		// Full PII view allowed for clinical staff and patient reception
		assert.strictEqual(canAccessFullPatientPii("owner"), true);
		assert.strictEqual(canAccessFullPatientPii("head_doctor"), true);
		assert.strictEqual(canAccessFullPatientPii("doctor"), true);
		assert.strictEqual(canAccessFullPatientPii("senior_admin"), true);
		assert.strictEqual(canAccessFullPatientPii("registrar"), true);

		// Masked for junior nursing and assistants
		assert.strictEqual(canAccessFullPatientPii("assistant"), false);
		assert.strictEqual(canAccessFullPatientPii("senior_nurse"), false);

		const patient = {
			fullName: "Кузнецова Ольга Павловна",
			phone: "+7 (903) 987-65-43",
			passport: "45 15 123456",
			snils: "112-233-445 95",
			address: "г. Санкт-Петербург, Невский пр., д. 10",
		};

		const assistantMasked = sanitizePatientRecordForViewer(patient, "assistant");
		assert.strictEqual(assistantMasked.phone, "+7 (903) •••-••-43");
		assert.strictEqual(assistantMasked.passport, "45 •• ••••••");
		assert.strictEqual(assistantMasked.snils, "•••-•••-••• 95");
		assert.strictEqual(assistantMasked.address, "г. Санкт-Петербург, [ул. и дом скрыты 152-ФЗ]");
	});
});

describe("Doctor Piece-Rate & Motivation Calculation Engine", () => {
	it("calculates piece-rate payout with therapeutic & orthopedic splits minus lab cost", () => {
		const calculation = calculateDoctorPieceRatePayout({
			therapyRevenueKopecks: 200_000_00, // 200,000.00 ₽ (25%) -> 50,000.00 ₽
			therapyRatePct: 25,
			orthopedicsRevenueKopecks: 500_000_00, // 500,000.00 ₽ (20%) -> 100,000.00 ₽
			orthopedicsRatePct: 20,
			surgeryRevenueKopecks: 0,
			surgeryRatePct: 0,
			hygieneRevenueKopecks: 0,
			hygieneRatePct: 0,
			labOrdersCostKopecks: 80_000_00, // 80,000.00 ₽ lab cost (100% deduction) -> -80,000.00 ₽
			labDeductionPct: 100,
			materialCostKopecks: 10_000_00, // 10,000.00 ₽ materials (0% deduction) -> 0.00 ₽
			materialDeductionPct: 0,
			baseShiftSalaryKopecks: 0,
		});

		// Gross Accrual = 50,000 + 100,000 = 150,000.00 ₽ (15,000,000 kopecks)
		assert.strictEqual(calculation.grossAccruedCommissionKopecks, 150_000_00);
		// Withheld Lab = 80,000.00 ₽ (8,000,000 kopecks)
		assert.strictEqual(calculation.withheldLabKopecks, 80_000_00);
		// Net Payout = 150,000 - 80,000 = 70,000.00 ₽ (7,000,000 kopecks)
		assert.strictEqual(calculation.netPayoutKopecks, 70_000_00);

		// Formatted display
		assert.strictEqual(formatKopecksToRublesDisplay(calculation.netPayoutKopecks), "70 000,00 ₽");
	});

	it("handles string to integer kopecks conversion without precision loss", () => {
		assert.strictEqual(parseRublesToKopecks("350000"), 35000000);
		assert.strictEqual(parseRublesToKopecks("1250,50"), 125050);
		assert.strictEqual(parseRublesToKopecks("0.99"), 99);
	});
});
