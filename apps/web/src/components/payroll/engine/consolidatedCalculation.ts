import type {
	StaffRole,
	RoleSummary,
	StaffPayrollRecord,
	ConsolidatedStaffPayrollSummary,
	ConsolidatedPayrollCalculationParams,
} from "./staffPayrollAssistantAdminTypes";
import { calculateDoctorStaffPayroll } from "./doctorStaffCalculation";
import { calculateAssistantStaffPayroll } from "./assistantStaffCalculation";
import { calculateAdministratorStaffPayroll } from "./administratorStaffCalculation";

export function calculateConsolidatedStaffPayroll(
	params: ConsolidatedPayrollCalculationParams
): ConsolidatedStaffPayrollSummary {
	const clinicName = params.clinicName ?? "ООО «Денте Стоматология»";
	const organizationInn = params.organizationInn ?? "7701984512";
	const organizationKpp = params.organizationKpp ?? "770101001";

	const records: StaffPayrollRecord[] = [];
	let doctorGrossRev = 0;
	let doctorLab = 0;
	let doctorMat = 0;
	let doctorNetBase = 0;
	let doctorGrossPayout = 0;

	if (params.doctors) {
		for (const docInput of params.doctors) {
			const res = calculateDoctorStaffPayroll(docInput);
			records.push(res);
			doctorGrossRev += res.totalGrossRevenueKop;
			doctorLab += res.totalLabDeductionsKop;
			doctorMat += res.totalMaterialDeductionsKop;
			doctorNetBase += res.totalNetBaseKop;
			doctorGrossPayout += res.grossPayoutBeforeTaxKop;
		}
	}

	let assistantGrossPayout = 0;
	if (params.assistants) {
		for (const asstInput of params.assistants) {
			const res = calculateAssistantStaffPayroll(asstInput);
			records.push(res);
			assistantGrossPayout += res.grossPayoutBeforeTaxKop;
		}
	}

	let adminGrossPayout = 0;
	if (params.administrators) {
		for (const adminInput of params.administrators) {
			const res = calculateAdministratorStaffPayroll(adminInput);
			records.push(res);
			adminGrossPayout += res.grossPayoutBeforeTaxKop;
		}
	}

	const roleSummaries: Record<StaffRole, RoleSummary> = {
		doctor: {
			role: "doctor",
			roleTitleRu: "Врачи-стоматологи",
			employeesCount: params.doctors?.length ?? 0,
			grossRevenueKop: doctorGrossRev,
			grossPayoutKop: doctorGrossPayout,
		},
		assistant: {
			role: "assistant",
			roleTitleRu: "Ассистенты и медсестры",
			employeesCount: params.assistants?.length ?? 0,
			grossRevenueKop: 0,
			grossPayoutKop: assistantGrossPayout,
		},
		administrator: {
			role: "administrator",
			roleTitleRu: "Администраторы и ресепшен",
			employeesCount: params.administrators?.length ?? 0,
			grossRevenueKop: 0,
			grossPayoutKop: adminGrossPayout,
		},
	};

	const totalGrossPayoutKop = doctorGrossPayout + assistantGrossPayout + adminGrossPayout;

	return {
		clinicName,
		organizationInn,
		organizationKpp,
		periodStartIso: params.periodStartIso,
		periodEndIso: params.periodEndIso,
		periodLabelRu: `${params.periodStartIso} — ${params.periodEndIso}`,
		generatedAtIso: new Date().toISOString(),
		records,
		totalEmployeesCount: records.length,
		totalGrossRevenueKop: doctorGrossRev,
		totalLabDeductionsKop: doctorLab,
		totalMaterialDeductionsKop: doctorMat,
		totalNetBaseKop: doctorNetBase,
		totalGrossPayoutKop,
		roleSummaries,
	};
}

export function validateStaffPayrollInput(input: unknown): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	if (!input || typeof input !== "object") {
		errors.push("Входные данные расчета должны быть объектом");
		return { valid: false, errors };
	}
	return { valid: errors.length === 0, errors };
}
