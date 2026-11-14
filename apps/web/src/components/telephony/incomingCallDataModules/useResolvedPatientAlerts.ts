import { useMemo } from "react";
import type { Dashboard, TelephonyPatientLike, TelephonyPatientInsightLike } from "@dental/shared";
import type {
	CallerLookupResult,
	PatientSomaticAlert,
	PatientActiveTreatmentPlanSummary,
} from "../../../store/telephonyTypes";
import {
	resolvePatientSomaticAlerts,
	resolvePatientActiveTreatmentPlan,
} from "../../../store/telephonyStore";

export interface ResolvedPatientAlertsResult {
	somaticAlerts: PatientSomaticAlert[];
	allergyAlerts: PatientSomaticAlert[];
	acutePainAlerts: PatientSomaticAlert[];
	activeTreatmentPlan: PatientActiveTreatmentPlanSummary;
}

export function useResolvedPatientAlerts(
	serverLookup: CallerLookupResult | null,
	resolvedPatient: TelephonyPatientLike | null,
	patientInsight: TelephonyPatientInsightLike | null | undefined,
	dashboard: Dashboard | undefined,
): ResolvedPatientAlertsResult {
	const somaticAlerts: PatientSomaticAlert[] = useMemo(() => {
		if (
			serverLookup?.found &&
			serverLookup.somaticAlerts &&
			serverLookup.somaticAlerts.length > 0
		) {
			return serverLookup.somaticAlerts;
		}
		return resolvePatientSomaticAlerts(resolvedPatient, patientInsight);
	}, [serverLookup, resolvedPatient, patientInsight]);

	const allergyAlerts = useMemo(() => {
		return somaticAlerts.filter((a) => a.category === "allergy");
	}, [somaticAlerts]);

	const acutePainAlerts = useMemo(() => {
		return somaticAlerts.filter((a) => a.category === "pain");
	}, [somaticAlerts]);

	const activeTreatmentPlan: PatientActiveTreatmentPlanSummary = useMemo(() => {
		if (serverLookup?.found && serverLookup.activeTreatmentPlan?.hasActivePlan) {
			return serverLookup.activeTreatmentPlan;
		}
		return resolvePatientActiveTreatmentPlan(
			resolvedPatient?.id || null,
			dashboard?.treatmentPlanItems,
			dashboard?.treatmentPlanScenarios,
		);
	}, [
		serverLookup,
		resolvedPatient?.id,
		dashboard?.treatmentPlanItems,
		dashboard?.treatmentPlanScenarios,
	]);

	return {
		somaticAlerts,
		allergyAlerts,
		acutePainAlerts,
		activeTreatmentPlan,
	};
}
