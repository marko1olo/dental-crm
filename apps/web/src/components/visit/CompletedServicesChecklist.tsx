/**
 * @file CompletedServicesChecklist.tsx
 * @description Canonical thin facade for the decomposed CompletedServicesChecklist module (Mandate 8b).
 */

export * from "./completedServices/index.js";
export {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
	CompletedServicesChecklist,
	type CompletedServicesChecklistProps,
	CompletedServiceRowItem,
	PreliminaryTreatmentPlanSection,
	QuickServiceSearchAndPresets,
	completedLineOf,
	serviceTitleOf,
	toothSuffixOf,
} from "./completedServices/index.js";
