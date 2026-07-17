import React from "react";
import { Bot, Check, AlertTriangle, Mic, Lock } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { ClinicalRulePanel } from "../../ClinicalRulePanel";

export function VisitPrimaryActions({ isSignDialogOpen, setIsSignDialogOpen, isSigned }: any) {
	const {
		visitPrimaryAction,
		visitWorkflowSteps,
		activeVisitClinicalRuleEvaluations,
		clinicalRuleActionLabels,
		dashboard,
		serviceTitle,
		clinicalRuleSeverityLabels,
		staffRoleLabels,
		activeVisitClinicalRuleSummary,
	} = useAppLogicContext();

	return (
		<details className="clinical-rules-toggle">
					<summary>
						📋 Клинические рекомендации
						{activeVisitClinicalRuleEvaluations?.length
							? ` (${activeVisitClinicalRuleEvaluations.length})`
							: ""}
					</summary>
					<div style={{ marginTop: "1rem" }}>
						<ClinicalRulePanel
							actionLabels={clinicalRuleActionLabels}
							context="visit"
							// evaluations={activeVisitClinicalRuleEvaluations}
							evaluations={
								dashboard?.clinicSettings?.profile?.mode === "solo_doctor"
									? activeVisitClinicalRuleEvaluations.filter(
											(e: any) => e.ownerRole !== "assistant",
										)
									: activeVisitClinicalRuleEvaluations
							}
							serviceTitle={serviceTitle}
							severityLabels={clinicalRuleSeverityLabels}
							staffRoleLabels={staffRoleLabels}
							summary={activeVisitClinicalRuleSummary}
						/>
					</div>
				</details>
	);
}
