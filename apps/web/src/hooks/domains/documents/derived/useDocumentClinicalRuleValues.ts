import { useMemo } from "react";
import type { Dashboard, Patient } from "@dental/shared";
import { clinicalRuleSummaryForUi } from "../../../../workspaceUiLabels";

export interface UseDocumentClinicalRuleProps {
	dashboard: Dashboard | null;
	documentPatient: Patient | null;
}

export function useDocumentClinicalRuleValues({
	dashboard,
	documentPatient,
}: UseDocumentClinicalRuleProps) {
	const _activeTreatmentPlanScenarios = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		return (dashboard.treatmentPlanScenarios || []).filter(
			(scenario) => scenario.patientId === documentPatient.id,
		);
	}, [dashboard, documentPatient]);

	const activeVisitClinicalRuleEvaluations = useMemo(() => {
		if (!dashboard) return [];
		const severityRank = { blocker: 0, warning: 1, info: 2 } as const;
		return (dashboard.clinicalRuleEvaluations || [])
			.filter(
				(evaluation) =>
					evaluation.patientId === dashboard?.activeVisit?.patientId,
			)
			.sort(
				(left, right) =>
					Number(left.resolved) - Number(right.resolved) ||
					severityRank[left.severity] - severityRank[right.severity],
			);
	}, [dashboard]);

	const patientClinicalRuleEvaluations = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		const severityRank = { blocker: 0, warning: 1, info: 2 } as const;
		return (dashboard.clinicalRuleEvaluations || [])
			.filter((evaluation) => evaluation.patientId === documentPatient.id)
			.sort(
				(left, right) =>
					Number(left.resolved) - Number(right.resolved) ||
					severityRank[left.severity] - severityRank[right.severity],
			);
	}, [dashboard, documentPatient]);

	const _activeVisitClinicalRuleSummary = useMemo(
		() =>
			clinicalRuleSummaryForUi(
				activeVisitClinicalRuleEvaluations,
				dashboard?.clinicalRuleSummary?.activeRules ?? 0,
			),
		[
			activeVisitClinicalRuleEvaluations,
			dashboard?.clinicalRuleSummary?.activeRules,
		],
	);

	const _patientClinicalRuleSummary = useMemo(
		() =>
			clinicalRuleSummaryForUi(
				patientClinicalRuleEvaluations,
				dashboard?.clinicalRuleSummary?.activeRules ?? 0,
			),
		[
			patientClinicalRuleEvaluations,
			dashboard?.clinicalRuleSummary?.activeRules,
		],
	);

	return {
		_activeTreatmentPlanScenarios,
		activeVisitClinicalRuleEvaluations,
		patientClinicalRuleEvaluations,
		_activeVisitClinicalRuleSummary,
		_patientClinicalRuleSummary,
	};
}
