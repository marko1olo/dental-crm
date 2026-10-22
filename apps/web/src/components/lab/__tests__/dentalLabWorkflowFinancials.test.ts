import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { calculateLabWorkflowFinancials } from "../dentalLabWorkflowEngine";

describe("5. Integer-Kopeck Financial Accounting & Doctor Piece-Rate Clearing", () => {
	test("Рассчитывает себестоимость ЗТЛ в целочисленных копейках и вычитает из сдельной базы врача", () => {
		const fin = calculateLabWorkflowFinancials({
			unitsCount: 2,
			pricePerUnitKopecks: 2400000,
			costPerUnitKopecks: 800000,
			doctorPercent: 25,
		});

		assert.equal(fin.unitsCount, 2);
		assert.equal(fin.patientPriceTotalKopecks, 4800000);
		assert.equal(fin.labCostKopecks, 1600000);
		assert.equal(fin.labCostTotalKopecks, 1600000);
		assert.equal(fin.clinicGrossMarginKopecks, 3200000);
		assert.equal(fin.grossMarginPercent, 66.7);

		assert.equal(fin.doctorWageBaseKopecks, 3200000);
		assert.equal(fin.doctorWageKopecks, 800000);
		assert.equal(fin.clinicNetProfitKopecks, 2400000);

		assert.equal(fin.isBalanced, true);
		assert.equal(
			fin.doctorWageKopecks + fin.clinicNetProfitKopecks,
			fin.doctorWageBaseKopecks,
		);

		assert.equal(fin.patientPriceTotalRub, 48000);
		assert.equal(fin.labCostTotalRub, 16000);
		assert.equal(fin.clinicGrossMarginRub, 32000);
		assert.equal(fin.doctorWageRub, 8000);
		assert.equal(fin.clinicNetProfitRub, 24000);
	});

	test("Корректно обрабатывает ввод в рублях с переводом в целочисленные копейки", () => {
		const fin = calculateLabWorkflowFinancials({
			unitsCount: 1,
			pricePerUnitRub: 22000,
			costPerUnitRub: 7000,
			doctorPercent: 20,
		});

		assert.equal(fin.patientPriceTotalKopecks, 2200000);
		assert.equal(fin.labCostKopecks, 700000);
		assert.equal(fin.clinicGrossMarginKopecks, 1500000);
		assert.equal(fin.doctorWageKopecks, 300000);
		assert.equal(fin.clinicNetProfitKopecks, 1200000);
		assert.equal(fin.isBalanced, true);
	});

	test("Защита от отрицательной маржи и нулевых значений", () => {
		const fin = calculateLabWorkflowFinancials({
			unitsCount: 1,
			pricePerUnitRub: 5000,
			costPerUnitRub: 6000,
			doctorPercent: 20,
		});

		assert.equal(fin.clinicGrossMarginKopecks, 0);
		assert.equal(fin.doctorWageKopecks, 0);
		assert.equal(fin.clinicNetProfitKopecks, 0);
		assert.equal(fin.isBalanced, true);
	});
});
