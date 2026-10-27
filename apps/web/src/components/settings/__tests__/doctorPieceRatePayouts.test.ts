import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type DoctorCategoryPerformanceInput,
	calculateDoctorPieceRatePayout,
	formatKopecksToRublesDisplay,
	parseRublesToKopecks,
} from "@dental/shared";
import { STATUTORY_ORDER_804N_PRESETS } from "../../catalog/pricelist/servicePricelistPresets";

describe("Doctor Piece-Rate Payouts & Pricelist Kopecks Calculation", () => {
	it("Номенклатура услуг содержит базовые расценки в копейках", () => {
		assert.ok(STATUTORY_ORDER_804N_PRESETS.length >= 20);
		const cariesService = STATUTORY_ORDER_804N_PRESETS.find(
			(s) => s.code804n === "A16.07.002.001" || s.id.includes("caries"),
		);
		assert.ok(cariesService && cariesService.basePriceKopecks > 0);
	});

	it("Рассчитывает чистую маржу в целых копейках без погрешностей", () => {
		const retailPriceKopecks = 450000;
		const materialCostKopecks = 45000;
		const netMarginKopecks = retailPriceKopecks - materialCostKopecks;
		assert.equal(netMarginKopecks, 405000);
		const marginPct = Math.round((netMarginKopecks / retailPriceKopecks) * 10000) / 100;
		assert.equal(marginPct, 90);
	});

	it("Рассчитывает стандартную сдельную выплату терапевта", () => {
		const input: DoctorCategoryPerformanceInput = {
			therapyRevenueKopecks: 45000000,
			therapyRatePct: 25,
			orthopedicsRevenueKopecks: 0,
			orthopedicsRatePct: 0,
			surgeryRevenueKopecks: 0,
			surgeryRatePct: 0,
			hygieneRevenueKopecks: 8000000,
			hygieneRatePct: 30,
			labOrdersCostKopecks: 0,
			labDeductionPct: 100,
			materialCostKopecks: 3500000,
			materialDeductionPct: 0,
			baseShiftSalaryKopecks: 0,
		};
		const result = calculateDoctorPieceRatePayout(input);
		assert.equal(result.accruedTherapyKopecks, 11250000);
		assert.equal(result.accruedHygieneKopecks, 2400000);
		assert.equal(result.grossAccruedCommissionKopecks, 13650000);
		assert.equal(result.totalDeductionsKopecks, 0);
		assert.equal(result.netPayoutKopecks, 13650000);
	});

	it("Рассчитывает выплату ортопеда с удержанием лаборатории ЗТЛ", () => {
		const input: DoctorCategoryPerformanceInput = {
			therapyRevenueKopecks: 0,
			therapyRatePct: 0,
			orthopedicsRevenueKopecks: 80000000,
			orthopedicsRatePct: 20,
			surgeryRevenueKopecks: 0,
			surgeryRatePct: 0,
			hygieneRevenueKopecks: 0,
			hygieneRatePct: 0,
			labOrdersCostKopecks: 24000000,
			labDeductionPct: 100,
			materialCostKopecks: 0,
			materialDeductionPct: 0,
			baseShiftSalaryKopecks: 0,
		};
		const result = calculateDoctorPieceRatePayout(input);
		assert.equal(result.accruedOrthopedicsKopecks, 16000000);
		assert.equal(result.withheldLabKopecks, 24000000);
		assert.equal(result.netPayoutKopecks, -8000000);
	});

	it("Форматирует и парсит копейки строго целочисленно", () => {
		const formatted = formatKopecksToRublesDisplay(125050);
		assert.ok(formatted.includes("1") && formatted.includes("250,50") && formatted.includes("₽"));
		assert.equal(parseRublesToKopecks("1 250,50"), 125050);
		assert.equal(parseRublesToKopecks("500"), 50000);
	});
});
