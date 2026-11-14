import React from "react";
import type { Patient } from "@dental/shared";
import type { EmkSectionProps } from "./EmkTypes";

export interface EmkSomaticCardProps extends Partial<EmkSectionProps> {
	onApplyPhysiologicalNorm?: (() => void) | undefined;
	onFillNormQuick?: (() => void) | undefined;
	patient?: Patient | Record<string, unknown> | null;
	allergies?: string[];
	somaticAlerts?: string[];
	isCardioRisk?: boolean;
	cardioRiskMessage?: string;
}

/**
 * EmkSomaticCard
 * Per Mandate 8p.4: Critical somatic warnings (allergies, pacemaker, anticoagulants, etc.)
 * live strictly as quiet badges in the visit header.
 * The duplicate somatic alert card is eliminated from the diary body.
 */
export function EmkSomaticCard(_props: EmkSomaticCardProps) {
	return null;
}
