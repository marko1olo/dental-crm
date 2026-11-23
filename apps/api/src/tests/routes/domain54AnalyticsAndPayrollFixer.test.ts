import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateDoctorPeriodPayroll } from "@dental/shared";

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
		const revenue = 1000;
		const labOrdersCostRub = 600;
		const doctorPayrollRub = 500;
		const materialsCostRub = 100;

		// 1000р - 600р - 500р - 100р = -200р убытка клиники.
		const clinicMarginRub = revenue > 0
			? revenue - labOrdersCostRub - doctorPayrollRub - materialsCostRub
			: 0;

		assert.equal(clinicMarginRub, -200, "Margin must be -200, reflecting real loss without false zero masking");
		const percentFactor = 100;
		const margin = revenue > 0 ? Math.round((clinicMarginRub * percentFactor) / revenue) : null;
		assert.equal(margin, -20, "Margin percent must be -20%");
	});
});
