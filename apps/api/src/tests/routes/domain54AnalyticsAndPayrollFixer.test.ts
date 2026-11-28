import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateDoctorPeriodPayroll, calculateLabWageDeductionKopecks } from "@dental/shared";

describe("Domain 54 Fixer Surgeon Verifications: Analytics, PnL & Doctor Payroll", () => {
	it("[SEV-1.1] Deducts unallocated dental lab (ЗТЛ) costs from overall doctor payout without evaporation", () => {
		// Врач провел терапевтическую услугу (где нет ЗТЛ) на 100 000 коп (1 000 руб) с комиссией 25% = 250 руб (25 000 коп).
		// При этом за период накопился нераспределенный заказ ЗТЛ на 5 000 коп (50 руб).
		const payrollResult = calculateDoctorPeriodPayroll({
			doctorId: "doc-test-1",
			doctorName: "Д-р Иванов",
			specialtyId: "therapy",
			periodStartIso: "2026-11-01",
			periodEndIso: "2026-11-30",
			services: [
				{
					id: "srv-1",
					dateIso: "2026-11-05",
					patientName: "Пациент Тестовый",
					medicalCardNumber: "К-100",
					serviceNameRu: "Лечение кариеса",
					category: "therapy",
					grossRevenueKop: 100000,
					labCostKop: 0,
					materialCostKop: 0,
					isPaid: true,
				},
			],
			customBasePercentage: 25,
			unallocatedLabKop: 5000,
			taxRegime: "self_employed", // 0% NDFL для наглядности
		});

		// Общие удержания ЗТЛ должны включать 5000 коп
		assert.equal(payrollResult.totalLabDeductionsKop, 5000, "totalLabDeductionsKop must include unallocated lab");
		assert.equal(payrollResult.unallocatedLabDeductionsKop, 5000, "unallocatedLabDeductionsKop must equal 5000");

		// Заработок до удержания: 25 000 коп. С вычетом ЗТЛ 5 000 коп = 20 000 коп (200 руб).
		assert.equal(payrollResult.grossPayoutBeforeTaxKop, 20000, "Payout must subtract unallocated lab: 25000 - 5000 = 20000");
	});

	it("[SEV-2.3] Synchronizes pricelist custom commission percentage in doctor payroll", () => {
		const payrollResult = calculateDoctorPeriodPayroll({
			doctorId: "doc-test-2",
			doctorName: "Д-р Петров",
			specialtyId: "orthopedics",
			periodStartIso: "2026-11-01",
			periodEndIso: "2026-11-30",
			services: [
				{
					id: "srv-pl-1",
					dateIso: "2026-11-10",
					patientName: "Пациент Прейскурантный",
					medicalCardNumber: "К-200",
					serviceNameRu: "Металлокерамическая коронка",
					category: "orthopedics",
					grossRevenueKop: 200000, // 2 000 руб
					labCostKop: 50000, // 500 руб ЗТЛ
					materialCostKop: 0,
					customCommissionPercent: 30, // Спец-процент из прейскуранта
					isPaid: true,
				},
			],
			customBasePercentage: 20, // Базовый процент врача 20%, но прейскурант дает 30%
			taxRegime: "self_employed",
		});

		// Net base: 200 000 - 50 000 = 150 000 коп.
		// Комиссия по прейскуранту: 30% от 150 000 = 45 000 коп (450 руб).
		assert.equal(payrollResult.earnedBaseCommissionKop, 45000, "Must calculate commission using pricelist rate 30%");
		assert.equal(payrollResult.grossPayoutBeforeTaxKop, 45000, "Payout must match pricelist rate 45 000 коп");
	});

	it("[SEV-2.4] Honest clinic margin allows negative values without forced zero clamp", () => {
		const res = calculateLabWageDeductionKopecks({
			patientPriceKopecks: 0,
			labCostKopecks: 50000,
			doctorSharePercent: 20,
			isWarranty: true,
		});
		assert.equal(res.clinicMarginKopecks, -50000, "Warranty margin must be negative reflecting real loss");
		assert.equal(res.doctorWageKopecks, 0);
	});

	it("[ROT-015] Standard lab wage deduction calculates exact kopeck margin and doctor fee", () => {
		const res = calculateLabWageDeductionKopecks({
			patientPriceKopecks: 100000,
			labCostKopecks: 30000,
			doctorSharePercent: 25,
			isWarranty: false,
		});
		assert.equal(res.doctorWageKopecks, 17500, "Doctor receives 25% of net 70000 kop = 17500 kop");
		assert.equal(res.clinicMarginKopecks, 52500, "Clinic retains 75% of net 70000 kop = 52500 kop");
	});

	it("[ROT-015] Lab cost equal to revenue leaves zero margin and zero doctor fee", () => {
		const res = calculateLabWageDeductionKopecks({
			patientPriceKopecks: 50000,
			labCostKopecks: 50000,
			doctorSharePercent: 30,
			isWarranty: false,
		});
		assert.equal(res.doctorWageKopecks, 0);
		assert.equal(res.clinicMarginKopecks, 0);
	});

	it("[ROT-015] Zero lab cost gives doctor exact percentage of patient gross price", () => {
		const res = calculateLabWageDeductionKopecks({
			patientPriceKopecks: 200000,
			labCostKopecks: 0,
			doctorSharePercent: 35,
			isWarranty: false,
		});
		assert.equal(res.doctorWageKopecks, 70000);
		assert.equal(res.clinicMarginKopecks, 130000);
	});
});
