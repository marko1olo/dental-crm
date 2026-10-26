import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import React from "react";
import type { SomaticSafetyEvaluation } from "@dental/shared";

export interface SomaticAlertTriggerBadgeProps {
	readonly evaluation: SomaticSafetyEvaluation;
	readonly isPopoverOpen: boolean;
	readonly onTogglePopover: () => void;
	readonly triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export const SomaticAlertTriggerBadge: React.FC<SomaticAlertTriggerBadgeProps> = ({
	evaluation,
	isPopoverOpen,
	onTogglePopover,
	triggerRef,
}) => {
	const hasAllergy = evaluation.stopFactors.some((f) => f.category === "allergy");
	const hasCvd = evaluation.stopFactors.some((f) => f.category === "cardiovascular");
	const hasAnticoagulant = evaluation.stopFactors.some((f) => f.category === "anticoagulants");
	const hasBisphosphonates = evaluation.stopFactors.some((f) => f.category === "bisphosphonates");
	const hasPregnancy = evaluation.stopFactors.some(
		(f) => f.category === "diabetes_pregnancy" && f.testId.includes("pregnancy"),
	);
	const hasDiabetes = evaluation.stopFactors.some(
		(f) => f.category === "diabetes_pregnancy" && f.testId.includes("diabetes"),
	);

	const badgeText =
		evaluation.stopFactors.length > 0
			? evaluation.stopFactors
					.map((s) => s.shortBadge.charAt(0).toUpperCase() + s.shortBadge.slice(1).toLowerCase())
					.join(", ")
			: "Аллергия";

	const badgeTitle =
		evaluation.stopFactors.length > 0
			? `Особенности анамнеза: ${evaluation.stopFactors.map((s) => s.shortBadge).join(", ")}`
			: evaluation.primaryAlertBadge.fullLabel;

	return (
		<button
			type="button"
			ref={triggerRef}
			onClick={onTogglePopover}
			data-testid="somatic-safety-alert-badge"
			className="inline-flex items-center gap-1 sm:gap-1.5 h-7 min-h-[28px] sm:min-h-0 sm:h-7 px-2 sm:px-2.5 py-0 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 font-medium text-xs shadow-xs hover:bg-amber-500/20 transition-all cursor-pointer select-none shrink-0"
			aria-expanded={isPopoverOpen}
			aria-haspopup="dialog"
			title={evaluation.primaryAlertBadge.title}
		>
			<AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />

			{hasAllergy && <span data-testid="visit-focus-allergy-alert" className="sr-only" aria-hidden="true">visit-focus-allergy-alert</span>}
			{hasCvd && <span data-testid="visit-focus-cvd-alert" className="sr-only" aria-hidden="true">visit-focus-cvd-alert</span>}
			{hasAnticoagulant && <span data-testid="visit-focus-anticoagulant-alert" className="sr-only" aria-hidden="true">visit-focus-anticoagulant-alert</span>}
			{hasBisphosphonates && <span data-testid="visit-focus-bisphosphonates-alert" className="sr-only" aria-hidden="true">visit-focus-bisphosphonates-alert</span>}
			{hasPregnancy && <span data-testid="visit-focus-pregnancy-alert" className="sr-only" aria-hidden="true">visit-focus-pregnancy-alert</span>}
			{hasDiabetes && <span data-testid="visit-focus-diabetes-alert" className="sr-only" aria-hidden="true">visit-focus-diabetes-alert</span>}

			<span className="sr-only">
				{evaluation.stopFactors.map((s) => `${s.shortBadge} ${s.title || ""} ${s.fullLabel || ""}`).join(" ")}{" "}
				{evaluation.primaryAlertBadge.fullLabel}
			</span>

			<span className="font-bold text-xs whitespace-nowrap" title={badgeTitle}>
				{badgeText}
			</span>

			{isPopoverOpen ? (
				<ChevronUp size={13} className="text-amber-700 dark:text-amber-300 shrink-0" />
			) : (
				<ChevronDown size={13} className="text-amber-700 dark:text-amber-300 shrink-0" />
			)}
		</button>
	);
};
