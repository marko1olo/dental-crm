import { useMemo } from "react";
import {
	buildStageCompletedActData,
	buildTreatmentPlanValidationPayload,
	calculatePlanAgeDays,
	formatPlanContractNumber,
	resolveDoctorOptions,
} from "./planFinancialCalculators.js";
import type { TreatmentPlanStage, TreatmentPlanTier } from "./types.js";

interface ContextDataParams {
	readonly planCreatedAtIso?: string | undefined;
	readonly dashboard: any;
	readonly auth: any;
	readonly patientId: string;
	readonly patientName: string;
	readonly stages: readonly TreatmentPlanStage[];
	readonly currentTier: TreatmentPlanTier;
	readonly discountPercent: number;
	readonly selectedActStage: TreatmentPlanStage | null;
}

export function usePlanContextData({
	planCreatedAtIso,
	dashboard,
	auth,
	patientId,
	patientName,
	stages,
	currentTier,
	discountPercent,
	selectedActStage,
}: ContextDataParams) {
	const planAgeDays = useMemo(() => calculatePlanAgeDays(planCreatedAtIso), [planCreatedAtIso]);
	const contractNumber = formatPlanContractNumber(patientId);
	const doctorOptions = useMemo(
		() => resolveDoctorOptions(dashboard?.clinicSettings?.staff as any[] | undefined),
		[dashboard?.clinicSettings?.staff],
	);

	const completedActData = useMemo(
		() =>
			buildStageCompletedActData({
				selectedActStage,
				contractNumber,
				patientId,
				patientName,
				doctorFullName: auth?.currentUser?.name,
				clinicName: dashboard?.clinicSettings?.profile?.brandName,
				inventoryItems: dashboard?.inventoryItems,
			}),
		[selectedActStage, contractNumber, patientId, patientName, auth, dashboard],
	);

	const validationPayload = useMemo(
		() =>
			buildTreatmentPlanValidationPayload({
				stages,
				patientId,
				patientName,
				currentTierTitle: currentTier.title,
				doctorId: auth?.currentUser?.id,
				doctorFullName: auth?.currentUser?.name,
				discountPercent,
				planCreatedAtIso,
			}),
		[stages, patientId, patientName, currentTier.title, auth, discountPercent, planCreatedAtIso],
	);

	return { planAgeDays, contractNumber, doctorOptions, completedActData, validationPayload };
}
