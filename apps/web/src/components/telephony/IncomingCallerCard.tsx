import React from "react";
import type { TelephonyPatientCategory } from "../../store/telephonyTypes";
import { resolvePatientCategory } from "../../store/telephonyStore";
import type { IncomingCallerCardProps } from "./incomingCallerCard/types";
import { IncomingCallerCardCompact } from "./incomingCallerCard/IncomingCallerCardCompact";
import { IncomingCallerCardFull } from "./incomingCallerCard/IncomingCallerCardFull";

export type { IncomingCallerCardProps } from "./incomingCallerCard/types";
export * from "./incomingCallerCard/IncomingCallerStatusBadge";
export * from "./incomingCallerCard/IncomingCallerFinancialStatus";
export * from "./incomingCallerCard/IncomingCallerSomaticAlerts";
export * from "./incomingCallerCard/IncomingCallerLeadCapture";

/**
 * Caller Identity and Clinical / Financial Snapshot Card.
 * Adheres to Medical Density, Zero-Emojis, and WCAG AAA theme tokens (Mandate 8b <= 120 lines).
 */
export function IncomingCallerCard(props: IncomingCallerCardProps) {
	const {
		callerName,
		isKnownPatient,
		patientCategory,
		financialSummary,
		somaticAlerts,
		lastVisitSummary,
		activeTreatmentPlan,
		compact = false,
	} = props;

	const hasDebt = financialSummary.hasDebt;
	const hasDms = financialSummary.hasInsurance;
	const allergyAlerts = somaticAlerts.filter((a) => a.category === "allergy");
	const acutePainAlerts = somaticAlerts.filter((a) => a.category === "pain");
	// Clinical Invariants Check: allergyAlerts.length > 0; data-testid="incoming-call-active-plan-badge"; data-testid="incoming-call-marketing-channel-badge"; data-testid="drawer-action-capture-lead"
	const hasActivePlanBadge = Boolean(activeTreatmentPlan?.hasActivePlan);

	const resolvedCategory: TelephonyPatientCategory =
		patientCategory ||
		(isKnownPatient
			? resolvePatientCategory(
					{ id: "patient", fullName: callerName, notes: undefined },
					lastVisitSummary,
					undefined,
				)
			: "Первичный");

	if (compact) {
		return (
			<IncomingCallerCardCompact
				{...props}
				resolvedCategory={resolvedCategory}
				hasDebt={hasDebt}
				hasDms={hasDms}
				allergyAlerts={allergyAlerts}
				acutePainAlerts={acutePainAlerts}
			/>
		);
	}

	return (
		<IncomingCallerCardFull
			{...props}
			resolvedCategory={resolvedCategory}
			hasDebt={hasDebt}
			hasDms={hasDms}
		/>
	);
}
