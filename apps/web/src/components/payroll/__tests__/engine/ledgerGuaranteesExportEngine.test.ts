/**
 * ledgerGuaranteesExportEngine.test.ts — Payroll Ledger Invariants & Minimum Guarantees
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateConsolidatedStaffPayroll,
	generateStaffPayrollT51Csv,
	generate1CZup31Xml,
} from "../../staffPayrollEngine";

describe("Staff Multi-Role: Accounting Ledger & Guarantee Invariants", () => {
	it("1.1 Preserves Ledger Base + Bonus == Gross equality when doctor minimum guarantee applies", () => {
		const summary = calculateConsolidatedStaffPayroll({
			clinicName: "ООО «Денте Стоматология»",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			doctors: [{
				employeeId: "doc-low",
				employeeTabNumber: "00199",
				employeeFullName: "Новиков Денис Олегович",
				specialtyId: "therapist",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				services: [{
					id: "s-1",
					dateIso: "2026-08-10",
					patientName: "Пациент",
					medicalCardNumber: "043/у",
					serviceNameRu: "Осмотр",
					category: "therapy",
					grossRevenueKop: 2000000,
					labCostKop: 0,
					materialCostKop: 0,
				}],
			}],
		});

		const docResult = summary.records[0];
		assert.ok(docResult && docResult.role === "doctor");
		assert.equal(docResult.minimumGuaranteeApplied, true);
		assert.equal(docResult.grossPayoutBeforeTaxKop, 6000000);

		const csv = generateStaffPayrollT51Csv(summary);
		const doctorRow = csv.split("\n").find((l) => l.includes("Новиков Денис Олегович"));
		assert.ok(doctorRow, "Doctor row exists in CSV");

		const cols = doctorRow.split(";");
		const col8Base = Number.parseFloat(cols[7] ?? "0");
		const col9Bonus = Number.parseFloat(cols[8] ?? "0");
		const col10Gross = Number.parseFloat(cols[9] ?? "0");

		assert.equal(col8Base, 6000.0);
		assert.equal(col9Bonus, 54000.0);
		assert.equal(col10Gross, 60000.0);
		assert.equal(Math.round((col8Base + col9Bonus) * 100), Math.round(col10Gross * 100));

		const xml = generate1CZup31Xml(summary);
		assert.ok(xml.includes("Доплата до гарантированного оклада (минимальная гарантия)"));
		assert.ok(xml.includes("<Сумма>54000.00</Сумма>"));
	});
});
