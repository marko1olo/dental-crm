import assert from "node:assert";
import test from "node:test";
import {
	calculateDoctorNetSalary,
	calculateServicesPayrollBreakdown,
} from "../finance/doctorNetSalaryEngine.js";

test("calculateDoctorNetSalary: correctly calculates Net Revenue according to Form T-51 statutory formula", () => {
	const result = calculateDoctorNetSalary({
		grossRevenueRub: 100000,
		labCostRub: 20000,
		materialsCostRub: 10000,
		categoryPercent: 25,
		fixedSalaryRub: 10000,
		bonusesRub: 5000,
		penaltiesRub: 1000,
		ndflRatePercent: 13,
	});

	// Net Base = 100 000 - 20 000 - 10 000 = 70 000 RUB (7 000 000 kop)
	assert.strictEqual(result.netBaseRevenueRub, 70000);
	assert.strictEqual(result.netBaseRevenueKop, 7000000);

	// Piecework = 70 000 * 25% = 17 500 RUB (1 750 000 kop)
	assert.strictEqual(result.pieceworkAccruedRub, 17500);
	assert.strictEqual(result.pieceworkAccruedKop, 1750000);

	// Total Accrued = 17 500 + 10 000 (fixed) + 5 000 (bonus) - 1 000 (penalty) = 31 500 RUB (3 150 000 kop)
	assert.strictEqual(result.totalAccruedRub, 31500);
	assert.strictEqual(result.totalAccruedKop, 3150000);

	// NDFL 13% = 31 500 * 13% = 4 095 RUB (409 500 kop)
	assert.strictEqual(result.ndflTaxRub, 4095);
	assert.strictEqual(result.ndflTaxKop, 409500);

	// Net Payout "На руки" = 31 500 - 4 095 = 27 405 RUB (2 740 500 kop)
	assert.strictEqual(result.netPayoutRub, 27405);
	assert.strictEqual(result.netPayoutKop, 2740500);
});

test("calculateDoctorNetSalary: handles kopeck exactness without float drift", () => {
	const result = calculateDoctorNetSalary({
		grossRevenueRub: 15555.55,
		labCostRub: 3333.33,
		materialsCostRub: 1111.11,
		categoryPercent: 30,
		fixedSalaryRub: 0,
		serviceSalaryPriceRub: 500.50,
		ndflRatePercent: 13,
	});

	// Gross kop: 1 555 555
	// Lab kop: 333 333
	// Mat kop: 111 111
	// Net Base kop: 1 555 555 - 333 333 - 111 111 = 1 111 111 kop (11 111.11 RUB)
	assert.strictEqual(result.netBaseRevenueKop, 1111111);
	assert.strictEqual(result.netBaseRevenueRub, 11111.11);

	// Piecework: round(1 111 111 * 0.3) = round(333 333.3) = 333 333 kop (3 333.33 RUB)
	assert.strictEqual(result.pieceworkAccruedKop, 333333);

	// Service Salary Price: 500.50 RUB = 50 050 kop
	assert.strictEqual(result.serviceSalaryPriceKop, 50050);

	// Total Accrued: 333 333 + 50 050 = 383 383 kop (3 833.83 RUB)
	assert.strictEqual(result.totalAccruedKop, 383383);

	// NDFL: round(383 383 * 0.13) = round(49 839.79) = 49 840 kop (498.40 RUB)
	assert.strictEqual(result.ndflTaxKop, 49840);
	assert.strictEqual(result.ndflTaxRub, 498.40);

	// Net payout: 383 383 - 49 840 = 333 543 kop (3 335.43 RUB)
	assert.strictEqual(result.netPayoutKop, 333543);
	assert.strictEqual(result.netPayoutRub, 3335.43);
});

test("calculateServicesPayrollBreakdown: itemizes services with isExpensive flag for FNS deduction codes", () => {
	const result = calculateServicesPayrollBreakdown([
		{
			id: "srv-1",
			title: "Лечение кариеса (Терапия)",
			priceRub: 6000,
			materialsCostRub: 800,
			categoryPercent: 25,
			isExpensive: false, // Код 1
		},
		{
			id: "srv-2",
			title: "Установка имплантата Osstem (Хирургия)",
			priceRub: 45000,
			materialsCostRub: 12000,
			categoryPercent: 20,
			isExpensive: true, // Код 2
		},
		{
			id: "srv-3",
			title: "Коронка циркониевая CAD/CAM (Ортопедия)",
			priceRub: 25000,
			labCostRub: 9000,
			materialsCostRub: 500,
			categoryPercent: 25,
			salaryPriceRub: 1000,
			isExpensive: false,
		},
	]);

	assert.strictEqual(result.items.length, 3);
	assert.strictEqual(result.items[1]?.isExpensive, true);
	assert.strictEqual(result.items[0]?.isExpensive, false);

	// Total Gross: 6000 + 45000 + 25000 = 76 000 RUB = 7 600 000 kop
	assert.strictEqual(result.totalGrossKop, 7600000);
	// Total Lab: 9 000 RUB = 900 000 kop
	assert.strictEqual(result.totalLabKop, 900000);
	// Total Materials: 800 + 12000 + 500 = 13 300 RUB = 1 330 000 kop
	assert.strictEqual(result.totalMaterialsKop, 1330000);
	// Total Net Base: 76000 - 9000 - 13300 = 53 700 RUB = 5 370 000 kop
	assert.strictEqual(result.totalNetBaseKop, 5370000);
});
