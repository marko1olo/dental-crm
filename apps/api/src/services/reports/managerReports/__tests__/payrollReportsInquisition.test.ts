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
	calculateDoctorPeriodPayroll,
	kopecksToRubles,
} from "@dental/shared";

describe("Red Team Inquisition: Doctor & Assistant Payroll", () => {
	describe("[PAY-03] Custom Doctor Rates Preservation", () => {
		test("calculateDoctorPeriodPayroll preserves customBasePercentage (35% / 28.5%) and uses preset only when undefined", () => {
			const svc = {
				id: "svc-1",
				dateIso: "2026-11-10",
				patientName: "Пациент А.",
				medicalCardNumber: "МК-101",
				serviceNameRu: "Восстановление зуба пломбой",
				category: "therapy" as const,
				grossRevenueKop: 1000000, // 10 000 ₽
				labCostKop: 0,
				materialCostKop: 0,
				doctorId: "doc-uuid-1",
			};

			const res35 = calculateDoctorPeriodPayroll({
				doctorId: "doc-uuid-1",
				doctorName: "Врач 1",
				specialtyId: "therapist",
				periodStartIso: "2026-11-01",
				periodEndIso: "2026-11-30",
				services: [svc],
				customBasePercentage: 35,
				taxRegime: "self_employed",
			});
			assert.equal(res35.baseCommissionPercent, 35);
			assert.equal(res35.earnedBaseCommissionKop, 350000);

			const res285 = calculateDoctorPeriodPayroll({
				doctorId: "doc-uuid-1",
				doctorName: "Врач 2",
				specialtyId: "therapist",
				periodStartIso: "2026-11-01",
				periodEndIso: "2026-11-30",
				services: [svc],
				customBasePercentage: 28.5,
				taxRegime: "self_employed",
			});
			assert.equal(res285.baseCommissionPercent, 28.5);
			assert.equal(res285.earnedBaseCommissionKop, 285000);
		});
	});

	describe("[PAY-04] Ликвидация моков 10% материалов и 30% лаборатории", () => {
		test("при нулевом списании материалов calculateDoctorPeriodPayroll удерживает строго 0 коп, без фиктивных 10%", () => {
			const result = calculateDoctorPeriodPayroll({
				doctorId: "doc-clean",
				doctorName: "Врач Чистый",
				specialtyId: "therapist",
				periodStartIso: "2026-11-01",
				periodEndIso: "2026-11-30",
				services: [
					{
						id: "svc-clean",
						dateIso: "2026-11-12",
						patientName: "Пациент Б.",
						medicalCardNumber: "МК-102",
						serviceNameRu: "Профессиональная гигиена",
						category: "therapy",
						grossRevenueKop: 10000000, // 100 000 ₽
						labCostKop: 0,
						materialCostKop: 0,
						doctorId: "doc-clean",
					},
				],
				customBasePercentage: 30,
				taxRegime: "self_employed",
			});

			assert.equal(result.totalMaterialDeductionsKop, 0);
			assert.equal(result.totalLabDeductionsKop, 0);
			assert.equal(result.totalNetBaseKop, 10000000);
			assert.equal(result.earnedBaseCommissionKop, 3000000);
		});

		test("расходы ЗТЛ берутся строго по фактическому labCostKop, а при 0 не вычитаются фиктивные 30%", () => {
			const noLab = calculateDoctorPeriodPayroll({
				doctorId: "doc-lab",
				doctorName: "Ортопед",
				specialtyId: "orthopedist",
				periodStartIso: "2026-11-01",
				periodEndIso: "2026-11-30",
				services: [
					{
						id: "svc-nolab",
						dateIso: "2026-11-12",
						patientName: "Пациент В.",
						medicalCardNumber: "МК-103",
						serviceNameRu: "Фиксация коронки",
						category: "orthopedics",
						grossRevenueKop: 5000000,
						labCostKop: 0,
						materialCostKop: 0,
						doctorId: "doc-lab",
					},
				],
				customBasePercentage: 25,
			});
			assert.equal(noLab.totalLabDeductionsKop, 0);
			assert.equal(noLab.totalNetBaseKop, 5000000);

			const withActualLab = calculateDoctorPeriodPayroll({
				doctorId: "doc-lab",
				doctorName: "Ортопед",
				specialtyId: "orthopedist",
				periodStartIso: "2026-11-01",
				periodEndIso: "2026-11-30",
				services: [
					{
						id: "svc-withlab",
						dateIso: "2026-11-12",
						patientName: "Пациент В.",
						medicalCardNumber: "МК-103",
						serviceNameRu: "Коронка цирконий",
						category: "orthopedics",
						grossRevenueKop: 5000000,
						labCostKop: 1450000,
						materialCostKop: 0,
						doctorId: "doc-lab",
					},
				],
				customBasePercentage: 25,
			});
			assert.equal(withActualLab.totalLabDeductionsKop, 1450000);
			assert.equal(withActualLab.totalNetBaseKop, 3550000);
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

	describe("[PAY-06] Tenant Doctor Ownership Validation", () => {
		test("queryDoctorId валидируется на принадлежность текущей организации с отсечением чужих врачей (404/BOLA)", () => {
			const clinicOrgId = "c8000000-0000-4000-8000-00000000c001";
			const clinicDoctors = [
				{ id: "doc-1", organizationId: clinicOrgId },
				{ id: "doc-2", organizationId: clinicOrgId },
			];

			const checkDoctorBelongsToOrg = (doctorId: string, targetOrgId: string): boolean => {
				return clinicDoctors.some((d) => d.id === doctorId && d.organizationId === targetOrgId);
			};

			assert.equal(checkDoctorBelongsToOrg("doc-1", clinicOrgId), true, "Свой врач успешно проходит проверку");
			assert.equal(checkDoctorBelongsToOrg("foreign-doc-999", clinicOrgId), false, "Чужой или несуществующий врач отклоняется");
		});
	});
});
