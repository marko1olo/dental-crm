/**
 * consolidatedPayrollEngine.test.ts — Consolidated Staff Payroll Aggregation & Ledger
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateConsolidatedStaffPayroll,
	generateStaffPayrollT51Csv,
} from "../../staffPayrollEngine";

describe("Staff Multi-Role: Consolidated Payroll & Ledger Summary", () => {
	it("4.1 Aggregates doctors, assistants, and administrators correctly", () => {
		const summary = calculateConsolidatedStaffPayroll({
			clinicName: "ООО «Денте Тест»",
			organizationInn: "7701984512",
			organizationKpp: "770101001",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			doctors: [{
				employeeId: "doc-1",
				employeeTabNumber: "00101",
				employeeFullName: "Смирнов А.П.",
				specialtyId: "therapist",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				services: [{
					id: "s-1",
					dateIso: "2026-08-10",
					patientName: "Пациент 1",
					medicalCardNumber: "043/у-1",
					serviceNameRu: "Терапия",
					category: "therapy",
					grossRevenueKop: 10000000,
					labCostKop: 0,
					materialCostKop: 1000000,
				}],
			}],
			assistants: [{
				employeeId: "asst-1",
				employeeTabNumber: "00201",
				employeeFullName: "Иванова Е.С.",
				category: "highest",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				shifts: [{ id: "sh-1", dateIso: "2026-08-05", shiftType: "standard_6h", hoursWorked: 6.0 }],
			}],
			administrators: [{
				employeeId: "adm-1",
				employeeTabNumber: "00301",
				employeeFullName: "Соколова Е.В.",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				shiftsWorked: 10,
				clinicCashRevenueKop: 50000000,
				primaryLeadsCount: 20,
				convertedLeadsCount: 16,
			}],
		});

		assert.equal(summary.totalEmployeesCount, 3);
		assert.equal(summary.records.length, 3);
		assert.equal(summary.roleSummaries.doctor.employeesCount, 1);
		assert.equal(summary.roleSummaries.assistant.employeesCount, 1);
		assert.equal(summary.roleSummaries.administrator.employeesCount, 1);
		assert.equal(
			summary.totalGrossPayoutKop,
			summary.records.reduce((acc, r) => acc + r.grossPayoutBeforeTaxKop, 0)
		);
	});

	it("5.1 Generates compliant Payroll Ledger CSV with UTF-8 BOM and exact totals", () => {
		const summary = calculateConsolidatedStaffPayroll({
			clinicName: "ООО «Денте Стоматология»",
			organizationInn: "7701984512",
			organizationKpp: "770101001",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			administrators: [{
				employeeId: "adm-1",
				employeeTabNumber: "00301",
				employeeFullName: "Соколова Елена Викторовна",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				shiftsWorked: 15,
				clinicCashRevenueKop: 100000000,
				primaryLeadsCount: 30,
				convertedLeadsCount: 25,
			}],
		});

		const csv = generateStaffPayrollT51Csv(summary);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("Гонорарная ведомость начислений персонала клиники"));
		assert.ok(csv.includes("ООО «Денте Стоматология»"));
		assert.ok(csv.includes("Соколова Елена Викторовна"));
		assert.ok(csv.includes("ИТОГО ПО КЛИНИКЕ"));
		assert.ok(!csv.includes("Удержано НДФЛ"));
		assert.ok(!csv.includes("Страховые взносы СФР"));
	});
});
