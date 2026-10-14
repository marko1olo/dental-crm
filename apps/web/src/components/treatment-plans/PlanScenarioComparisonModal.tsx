/**
 * PlanScenarioComparisonModal.tsx — Канонический фасад сравнения сценариев плана лечения (SSOT).
 *
 * Делегирует рендеринг и финансовую аналитику в канонический модуль
 * TreatmentPlanComparatorModal / TreatmentPlanPresenterModal (Мандат 8b: лимит строк и Single Source of Truth).
 * Устраняет дублирование кода презентеров и модалок сравнения.
 */

import React from "react";
import {
	TreatmentPlanComparatorModal,
	type TreatmentPlanComparatorModalProps,
} from "./comparator/TreatmentPlanComparatorModal";
import type {
	ComprehensivePlanVariant,
	PlanTierCode,
} from "./comparator/planPresentationPresets";

export type { ComprehensivePlanVariant, PlanTierCode };

export interface PlanScenarioComparisonModalProps extends TreatmentPlanComparatorModalProps {
	readonly onSelectScenario?: ((tierCode: PlanTierCode, variant: ComprehensivePlanVariant) => void) | undefined;
	readonly initialSelectedTier?: PlanTierCode | undefined;
	readonly initialPaymentTab?: "staged" | "discount" | "installments" | "ndfl" | undefined;
}

export const PlanScenarioComparisonModal: React.FC<PlanScenarioComparisonModalProps> = (props) => {
	const { onSelectScenario, onPlanSelected, ...rest } = props;
	const effectiveOnSelect = onPlanSelected || onSelectScenario;

	return (
		<TreatmentPlanComparatorModal
			{...rest}
			onPlanSelected={effectiveOnSelect}
		/>
	);
};

export default PlanScenarioComparisonModal;
