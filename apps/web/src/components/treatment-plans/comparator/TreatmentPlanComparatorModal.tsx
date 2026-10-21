/**
 * TreatmentPlanComparatorModal.tsx — Facade: Multi-Variant Comparator & Presentation Studio Modal
 * Decomposed into ./modal/* according to Mandate 8b (<= 120 lines).
 */

import {
	TreatmentPlanComparatorModalView,
	type TreatmentPlanComparatorModalProps,
} from "./modal";

export {
	TreatmentPlanComparatorModalView,
	type TreatmentPlanComparatorModalProps,
};

export const TreatmentPlanComparatorModal = TreatmentPlanComparatorModalView;
export const TreatmentPlanComparisonModal = TreatmentPlanComparatorModalView;
export const PlanScenarioComparisonModal = TreatmentPlanComparatorModalView;
export type TreatmentPlanComparisonModalProps = TreatmentPlanComparatorModalProps;
export type PlanScenarioComparisonModalProps = TreatmentPlanComparatorModalProps;
export default TreatmentPlanComparatorModal;
