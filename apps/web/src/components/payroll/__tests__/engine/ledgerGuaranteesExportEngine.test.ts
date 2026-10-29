/**
 * ledgerGuaranteesExportEngine.test.ts — Payroll Ledger Invariants & Minimum Guarantees
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateConsolidatedStaffPayroll,
	generateStaffPayrollT51Csv,
} from "../../staffPayrollEngine";

describe("Staff Multi-Role: Accounting Ledger & Guarantee Invariants", () => {
	it("1.1 Preserves Ledger Base + Bonus == Gross equality when doctor minimum guarantee applies", () => {
		const summary = calculateConsolidatedStaffPayroll({
			clinicName: "Стоматологическая клиника ДЕНТЕ",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			doctors: [{
				employeeId: "doc-low",
				employeeTabNumber: "00199",
				employeeFullName: "Новиков Денис Олегович",
				specialtyId: "therapist",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				daysWorked: 12,
				services: [{
					id: "srv-low",
					dateIso: "2026-08-05",
					patientName: "Пациент Н",
					medicalCardNumber: "101",
					serviceNameRu: "Осмотр и консультация",
					category: "therapy",
					grossRevenueKop: 2000000,
					labCostKop: 0,
					materialCostKop: 0,
				}],
			}],
		});

		const doctorRecord = summary.records.find((r) => r.employeeId === "doc-low");
		assert.ok(doctorRecord, "Doctor record must exist");
		assert.equal(doctorRecord.role, "doctor");
		if (doctorRecord.role === "doctor") {
			assert.equal(doctorRecord.minimumGuaranteeApplied, true);
			assert.equal(doctorRecord.grossPayoutBeforeTaxKop, 6000000); // 60,000 ₽ minimum guarantee floor
			assert.ok(doctorRecord.guaranteeTopUpKop && doctorRecord.guaranteeTopUpKop > 0);
		}

		const csv = generateStaffPayrollT51Csv(summary);
		const rows = csv.split("\n");
		const doctorRow = rows.find((r) => r.includes("Новиков Денис Олегович"));
		assert.ok(doctorRow, "Doctor must be listed in T-51 CSV");

		const cols = doctorRow.split(";");
		const col8Base = Number.parseFloat(cols[7] ?? "0");
		const col9Bonus = Number.parseFloat(cols[8] ?? "0");
		const col10Gross = Number.parseFloat(cols[9] ?? "0");

		assert.equal(col8Base, 6000.0);
		assert.equal(col9Bonus, 54000.0);
		assert.equal(col10Gross, 60000.0);
		assert.equal(Math.round((col8Base + col9Bonus) * 100), Math.round(col10Gross * 100));
	});
});
