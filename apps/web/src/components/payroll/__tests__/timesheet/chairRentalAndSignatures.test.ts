/**
 * chairRentalAndSignatures.test.ts — Chair Rental Economics, Payslip Signatures & Mandate 8b
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { calculateDoctorPeriodPayroll } from "../../staffPayrollEngine";
import { generateDoctorPayslipHtml } from "../../staffPayrollExports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Red Team: Chair Rental Shift Economics & Decomposed Submodules", () => {
	it("5.1 Chair rental shift economics: shiftsCount * shiftRateRub computes rent and profit", () => {
		const shiftsCount = 15;
		const shiftRateRub = 3500;
		const chairRentalRub = shiftsCount * shiftRateRub;

		const res = calculateDoctorPeriodPayroll({
			doctorId: "solo-doc-rent",
			doctorName: "Д-р Кузнецов М.М.",
			specialtyId: "solo_practitioner",
			periodStartIso: "2026-10-01",
			periodEndIso: "2026-10-31",
			payoutModel: "chair_rental",
			chairRentalKop: chairRentalRub * 100,
			services: [{
				id: "srv-rent-1",
				dateIso: "2026-10-15",
				patientName: "Пациент Соло",
				medicalCardNumber: "201",
				serviceNameRu: "Комплексная реабилитация",
				category: "therapy",
				grossRevenueKop: 30000000,
				labCostKop: 3000000,
				materialCostKop: 2000000,
				isPaid: true,
			}],
		});

		assert.equal(chairRentalRub, 52500);
		assert.equal(res.chairRentalKop, 5250000);
		assert.equal(res.totalNetBaseKop, 19750000);
		assert.equal(res.earnedBaseCommissionKop, 19750000);
		assert.equal(res.baseCommissionPercent, 100);
	});

	it("5.2 Printable payslip includes Accountant, Head of Clinic, and Doctor signature blocks", () => {
		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-sig",
			doctorName: "Д-р Соколова А.Н.",
			specialtyId: "therapist",
			periodStartIso: "2026-10-01",
			periodEndIso: "2026-10-31",
			services: [{
				id: "srv-sig",
				dateIso: "2026-10-10",
				patientName: "Пациент С",
				medicalCardNumber: "301",
				serviceNameRu: "Лечение кариеса",
				category: "therapy",
				grossRevenueKop: 10000000,
				labCostKop: 0,
				materialCostKop: 1000000,
				isPaid: true,
			}],
		});

		const html = generateDoctorPayslipHtml(res, "ООО «Денте Стоматология»");
		assert.ok(html.includes("Главный бухгалтер:"));
		assert.ok(html.includes("Руководитель клиники / Главврач:"));
		assert.ok(html.includes("Врач-специалист (подпись):"));
	});

	it("5.3 DoctorPayrollModal and all submodules strictly adhere to <= 120 lines limit (Mandate 8b)", () => {
		const payrollDir = path.resolve(__dirname, "../..");
		const modulesDir = path.join(payrollDir, "payrollModules");
		const filesToCheck = [
			path.join(payrollDir, "DoctorPayrollModal.tsx"),
			path.join(modulesDir, "PayrollHeader.tsx"),
			path.join(modulesDir, "PayrollRentalSection.tsx"),
			path.join(modulesDir, "PayrollServicesTable.tsx"),
			path.join(modulesDir, "PayrollTotalsBar.tsx"),
		];

		for (const file of filesToCheck) {
			assert.ok(fs.existsSync(file), `File ${file} must exist`);
			const content = fs.readFileSync(file, "utf8");
			const lines = content.split("\n").length;
			assert.ok(lines <= 120, `File ${path.basename(file)} has ${lines} lines, exceeding 120 lines limit!`);
		}
	});
});
