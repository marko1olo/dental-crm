import { useMemo } from "react";
import type { Dashboard, Patient } from "@dental/shared";
import type { InventoryItemLookup } from "../../treatmentPlanMaterialEngine.js";
import {
	buildStageCompletedActData,
	buildTreatmentPlanValidationPayload,
	calculatePlanAgeDays,
	formatPlanContractNumber,
	resolveDoctorOptions,
	type PlanStaffMemberInput,
} from "./planFinancialCalculators.js";
import type { PlanAuthContext, TreatmentPlanStage, TreatmentPlanTier } from "./types.js";

export interface PlanDashboardContext {
	readonly clinicSettings?: {
		readonly profile?: {
			readonly brandName?: string | undefined;
		} | undefined;
		readonly staff?: readonly PlanStaffMemberInput[] | undefined;
	} | undefined;
	readonly inventoryItems?: readonly InventoryItemLookup[] | undefined;
	readonly patients?: readonly (Patient & { balanceRub?: number | null | undefined })[] | undefined;
	readonly serviceCatalog?: Dashboard["serviceCatalog"] | undefined;
}

interface ContextDataParams {
	readonly planCreatedAtIso?: string | undefined;
	readonly dashboard: PlanDashboardContext | Dashboard | null | undefined;
	readonly auth: PlanAuthContext | null | undefined;
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
	const planDashboard = dashboard as PlanDashboardContext | null | undefined;
	const planAgeDays = useMemo(() => calculatePlanAgeDays(planCreatedAtIso), [planCreatedAtIso]);
	const contractNumber = formatPlanContractNumber(patientId);
	const doctorOptions = useMemo(
		() => resolveDoctorOptions(planDashboard?.clinicSettings?.staff),
		[planDashboard?.clinicSettings?.staff],
	);

	const completedActData = useMemo(
		() =>
			buildStageCompletedActData({
				selectedActStage,
				contractNumber,
				patientId,
				patientName,
				doctorFullName: auth?.currentUser?.name,
				clinicName: planDashboard?.clinicSettings?.profile?.brandName,
				inventoryItems: planDashboard?.inventoryItems,
			}),
		[selectedActStage, contractNumber, patientId, patientName, auth, planDashboard],
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
