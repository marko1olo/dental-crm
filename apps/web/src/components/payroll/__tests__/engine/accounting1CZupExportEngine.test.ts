/**
 * accounting1CZupExportEngine.test.ts — 1C:ZUP 3.1 XML and CSV Accrual Exports
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateConsolidatedStaffPayroll,
	generate1CZup31Xml,
	generate1CZup31Csv,
} from "../../staffPayrollEngine";

describe("Staff Multi-Role: 1C:ZUP 3.1 XML & CSV Exports", () => {
	it("1.1 Generates compliant 1C:ZUP 3.1 XML document with accruals section only", () => {
		const summary = calculateConsolidatedStaffPayroll({
			clinicName: "ООО «Денте Стоматология»",
			organizationInn: "7701984512",
			organizationKpp: "770101001",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			doctors: [{
				employeeId: "doc-1",
				employeeTabNumber: "00101",
				employeeFullName: "Смирнов Алексей Петрович",
				specialtyId: "therapist",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				comprehensivePlansCount: 2,
				services: [{
					id: "s-1",
					dateIso: "2026-08-10",
					patientName: "Пациент",
					medicalCardNumber: "043/у",
					serviceNameRu: "Терапия",
					category: "therapy",
					grossRevenueKop: 50000000,
					labCostKop: 0,
					materialCostKop: 2000000,
				}],
			}],
		});

		const xml = generate1CZup31Xml(summary, "ЗП-2026-08", "2026-08-31");
		assert.ok(xml.includes("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
		assert.ok(xml.includes("<ИНН>7701984512</ИНН>"));
		assert.ok(xml.includes("Сдельная оплата труда (стоматология)"));
		assert.ok(xml.includes("<Начисления>"));
		assert.ok(!xml.includes("<Удержания>"));
		assert.ok(!xml.includes("<СтраховыеВзносы>"));
		assert.ok(!xml.includes("<Выплаты>"));
	});

	it("1.2 Generates compliant 1C:ZUP 3.1 CSV table with UTF-8 BOM and accrual operations only", () => {
		const summary = calculateConsolidatedStaffPayroll({
			clinicName: "ООО «Денте Стоматология»",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			assistants: [{
				employeeId: "asst-1",
				employeeTabNumber: "00201",
				employeeFullName: "Иванова Екатерина Сергеевна",
				category: "highest",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				shifts: [{ id: "sh-1", dateIso: "2026-08-05", shiftType: "standard_6h", hoursWorked: 6.0 }],
			}],
		});

		const csv = generate1CZup31Csv(summary);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("ТабельныйНомер;ФИО;Должность;Подразделение;ВидОперации;Сумма;ПериодДействия;КодДоходаНДФЛ"));
		assert.ok(csv.includes("Иванова Екатерина Сергеевна"));
		assert.ok(csv.includes("Начисление"));
		assert.ok(!csv.includes('"НДФЛ"'));
		assert.ok(!csv.includes('"Выплата"'));
	});
});
