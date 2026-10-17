import { resolveDoctorPreset } from "@dental/shared/payroll";
import type {
	DoctorStaffPayrollInput,
	DoctorStaffPayrollResult,
} from "./staffPayrollRoleTypes";
import { DOCTOR_SPECIALTY_CONFIGS } from "./doctorPresets";
import { calculateDoctorServicesMetrics } from "./doctorServicesCalculation";

export function calculateDoctorStaffPayroll(
	input: DoctorStaffPayrollInput
): DoctorStaffPayrollResult {
	const preset = DOCTOR_SPECIALTY_CONFIGS[input.specialtyId] ?? resolveDoctorPreset(input.specialtyId);
	const basePercent = input.customBasePercentage ?? preset.defaultPercentage;

	const { totalGross, totalLab, totalMaterial, earnedBase, earnedRetail } =
		calculateDoctorServicesMetrics(input, preset, basePercent);

	const totalNetBase = Math.max(0, totalGross - totalLab - totalMaterial);

	let revenueKpiPercent = 0;
	let kpiBadge = "Базовая ставка";
	if (totalGross >= 100000000) {
		revenueKpiPercent = 5;
		kpiBadge = "Топ-выручка (+5% премия)";
	} else if (totalGross >= 50000000) {
		revenueKpiPercent = 2;
		kpiBadge = "План выполнен (+2% премия)";
	}

	const revenueKpiBonusKop = Math.round((totalNetBase * revenueKpiPercent) / 100);
	const compPlansCount = Math.round(Number(input.comprehensivePlansCount) || 0);
	const compPlanBonusPerUnit = Math.round(Number(input.comprehensivePlanBonusPerUnitKop) || 500000);
	const comprehensivePlanBonusKop = Math.round(compPlansCount * compPlanBonusPerUnit);
	const manualAdj = Math.round(Number(input.manualAdjustmentKop) || 0);
	const noteRu = input.manualAdjustmentNoteRu ?? "";

	const preGuaranteeCalculated = earnedBase + earnedRetail + revenueKpiBonusKop + comprehensivePlanBonusKop + manualAdj;
	let preGuaranteeGross = preGuaranteeCalculated;
	let guaranteeApplied = false;
	let guaranteeTopUpKop = 0;

	const daysWorked = input.daysWorked !== undefined ? Math.round(Number(input.daysWorked)) : (input.services.length > 0 ? 21 : 0);
	const hoursWorked = input.hoursWorked !== undefined ? Number(input.hoursWorked) : Number((daysWorked * 6.6).toFixed(1));
	const hasActiveProductionOrAttendance = input.services.length > 0 || daysWorked > 0;

	if (preGuaranteeGross < preset.minGuaranteeMonthlyKop && hasActiveProductionOrAttendance && preset.minGuaranteeMonthlyKop > 0) {
		guaranteeTopUpKop = preset.minGuaranteeMonthlyKop - preGuaranteeGross;
		preGuaranteeGross = preset.minGuaranteeMonthlyKop;
		guaranteeApplied = true;
	}

	const grossPayoutBeforeTaxKop = Math.max(0, preGuaranteeGross);

	return {
		employeeId: input.employeeId,
		employeeTabNumber: input.employeeTabNumber,
		employeeFullName: input.employeeFullName,
		role: "doctor",
		specialtyId: input.specialtyId,
		positionRu: preset.titleRu,
		departmentRu: "Клиническое отделение",
		periodLabelRu: `${input.periodStartIso} — ${input.periodEndIso}`,
		daysWorked,
		hoursWorked,
		totalGrossRevenueKop: totalGross,
		totalLabDeductionsKop: totalLab,
		totalMaterialDeductionsKop: totalMaterial,
		totalNetBaseKop: totalNetBase,
		baseCommissionPercent: basePercent,
		earnedBaseCommissionKop: earnedBase,
		earnedRetailCommissionKop: earnedRetail,
		comprehensivePlansCount: compPlansCount,
		comprehensivePlanBonusKop,
		revenueKpiPercent,
		revenueKpiBonusKop,
		kpiBadgeLabelRu: kpiBadge,
		minimumGuaranteeKop: preset.minGuaranteeMonthlyKop,
		minimumGuaranteeApplied: guaranteeApplied,
		guaranteeTopUpKop,
		manualAdjustmentKop: manualAdj,
		manualAdjustmentNoteRu: noteRu,
		grossPayoutBeforeTaxKop,
		servicesCount: input.services.length,
	};
}
