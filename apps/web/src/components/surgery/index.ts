/**
 * apps/web/src/components/surgery/index.ts — Единый SSOT модуль амбулаторной хирургии и паспортов имплантатов.
 */

export * from "./surgeryCatalogData";
export {
	ChairsideSurgeryHubModal,
	SurgeryStudioModal,
	type ChairsideSurgeryHubModalProps,
	type SurgeryStudioModalProps,
	type SurgeryHubTab,
} from "./ChairsideSurgeryHubModal";
export * from "./DirectSurgeryLauncher";
