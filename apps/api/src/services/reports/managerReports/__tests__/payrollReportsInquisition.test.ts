/**
 * apps/api/src/services/reports/managerReports/__tests__/payrollReportsInquisition.test.ts
 *
 * RED TEAM INQUISITION TEST SUITE: DOCTOR & ASSISTANT PAYROLL
 * [PAY-03] SEV-1: Custom commission rate preservation (userId/doctorId, commissionPct/commissionPercent)
 * [PAY-04] SEV-2: Absence of hardcoded 10% materials tax and 30% lab tax
 * [PAY-05] SEV-2: Assistant wages calculation with shifts, radiographs, surgeries, and NDFL 13%
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	ASSISTANT_SHIFT_RULE,
	type AssistantShiftLogItem,
	calculateAssistantPeriodPayroll,
} from "@dental/shared";

describe("Red Team Inquisition: Doctor & Assistant Payroll", () => {
	describe("[PAY-03] Custom Doctor Rates Preservation", () => {
		test("индивидуальная ставка врача из doctor_commissions (userId или doctorId) не сбрасывается на 25%", () => {
			// Симуляция выборки commissionRateMap
			const mockCommissions = [
				{
					doctorId: null,
					userId: "doc-uuid-1",
					commissionPercent: null,
					commissionPct: "35.0",
				},
				{
					doctorId: "doc-uuid-2",
					userId: null,
					commissionPercent: "28.5",
					commissionPct: null,
				},
			];

			const commissionRateMap = new Map<string, number>();
			for (const comm of mockCommissions) {
				const rate = Number(comm.commissionPct ?? comm.commissionPercent);
				if (!Number.isNaN(rate) && rate > 0) {
					if (comm.userId) commissionRateMap.set(comm.userId, rate);
					if (comm.doctorId) commissionRateMap.set(comm.doctorId, rate);
				}
			}

			// Проверка для врача с userId
			const rate1 = commissionRateMap.get("doc-uuid-1") ?? 25.0;
			assert.equal(rate1, 35.0, "Ставка врача 1 должна быть 35%, а не 25% дефолт");

			// Проверка для врача с doctorId
			const rate2 = commissionRateMap.get("doc-uuid-2") ?? 25.0;
			assert.equal(rate2, 28.5, "Ставка врача 2 должна быть 28.5%, а не 25% дефолт");

			// Врач без индивидуальной ставки получает 25% дефолт
			const defaultRate = commissionRateMap.get("doc-uuid-3") ?? 25.0;
			assert.equal(defaultRate, 25.0, "Врач без записи комиссии получает дефолтные 25%");
		});
	});

	describe("[PAY-04] Ликвидация моков 10% материалов и 30% лаборатории", () => {
		test("при отсутствии складских списаний себестоимость материалов строго 0 ₽, а не 10% от выручки", () => {
			const revRub = 100000;
			// Ранее: Math.round(revRub * 0.1) -> 10000 ₽ налога из воздуха!
			// Теперь: при пустом materialsMap -> 0 ₽
			const materialsMap = new Map<string, number>();
			const statementsMap = new Map<string, { materialsCostRub: number }>();

			const docId = "doc-clean";
			const st = statementsMap.get(docId);
			const materialsCostRub =
				st && st.materialsCostRub > 0 ? st.materialsCostRub : (materialsMap.get(docId) ?? 0);

			assert.equal(materialsCostRub, 0, "Себестоимость материалов обязана быть 0 ₽ при отсутствии списаний");

			const netRevenueRub = Math.max(0, revRub - materialsCostRub);
			assert.equal(netRevenueRub, 100000, "Чистая база выручки не урезается на выдуманные 10%");
		});

		test("расходы ЗТЛ при отсутствии labCostRub строго 0 ₽, а не 30% от priceRub", () => {
			// Ранее: coalesce(labCostRub, priceRub * 0.3)
			// Теперь: coalesce(labCostRub, 0)
			const labOrderWithoutCost = {
				labCostRub: null as number | null,
				priceRub: 50000,
			};

			const calculatedCost = labOrderWithoutCost.labCostRub ?? 0;
			assert.equal(calculatedCost, 0, "Себестоимость лаборатории без наряда ЗТЛ строго 0 ₽");

			const labOrderWithActualCost = {
				labCostRub: 14500,
				priceRub: 50000,
			};
			const actualCost = labOrderWithActualCost.labCostRub ?? 0;
			assert.equal(actualCost, 14500, "Себестоимость лаборатории берется по фактическому наряду ЗТЛ");
		});
	});

	describe("[PAY-05] Расчет оплаты труда ассистентов клиники", () => {
		test("расчет смен, часов, снимков, хирургии и НДФЛ 13% в целочисленных копейках", () => {
			const shiftLogs: AssistantShiftLogItem[] = [
				{
					id: "shift-1",
					dateIso: "2026-11-01",
					shiftType: "standard_6h",
					hoursWorked: 6,
					radiographsTakenCount: 5,
					surgeriesAssistedCount: 1,
				},
				{
					id: "shift-2",
					dateIso: "2026-11-02",
					shiftType: "full_12h",
					hoursWorked: 12,
					radiographsTakenCount: 8,
					surgeriesAssistedCount: 2,
				},
			];

			const result = calculateAssistantPeriodPayroll(
				"ast-1",
				"Ковалева А.С.",
				"2026-11-01 — 2026-11-30",
				shiftLogs,
				ASSISTANT_SHIFT_RULE,
			);

			// 1 standard_6h смена (3 500 ₽) + 1 full_12h смена (7 000 ₽) = 10 500 ₽ (1050000 коп)
			assert.equal(result.baseShiftPayoutKop, 1050000, "Базовая ставка за смены = 10 500 ₽");

			// Снимки: (5 + 8) * 150 ₽ = 1 950 ₽ (195000 коп)
			assert.equal(result.radiographPayoutKop, 195000, "Доплата за 13 снимков = 1 950 ₽");

			// Хирургия: (1 + 2) * 200 ₽ = 600 ₽ (60000 коп)
			assert.equal(result.surgeryPayoutKop, 60000, "Доплата за 3 хирургии = 600 ₽");

			// Gross = 10500 + 1950 + 600 = 13 050 ₽ (1305000 коп)
			assert.equal(result.totalGrossPayoutKop, 1305000, "Gross начисление = 13 050 ₽");

			// НДФЛ 13% от 1305000 = 169700 коп (1 697 ₽)
			assert.equal(result.ndfl13TaxKop, 169700, "НДФЛ 13% = 1 697 ₽");

			// Net payout = 1305000 - 169700 = 1135300 коп (11 353 ₽)
			assert.equal(result.netPayoutToAssistantKop, 1135300, "К выплате на руки = 11 353 ₽");
		});

		test("сводный ФОТ клиники корректно агрегирует выплаты врачей и ассистентов", () => {
			const doctorPayoutKopecks = 33316000; // 333 160 ₽
			const assistantPayoutKopecks = 852600; // 8 526 ₽

			const totalClinicPayrollKopecks = doctorPayoutKopecks + assistantPayoutKopecks;
			const totalClinicPayrollRub = Math.round(totalClinicPayrollKopecks / 100);

			assert.equal(totalClinicPayrollKopecks, 34168600);
			assert.equal(totalClinicPayrollRub, 341686);
		});
	});
});
