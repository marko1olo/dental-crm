import {
	CBCT_CLINICAL_BUNDLES,
	CLINICAL_BUNDLES,
	type CbctBundleId,
	type ClinicalBundleDefinition,
	type ClinicalBundleId,
} from "../treatmentPlanBundlesPresets";

export function getClinicalBundleById(
	bundleId: ClinicalBundleId | CbctBundleId | string,
): ClinicalBundleDefinition | undefined {
	return (
		CLINICAL_BUNDLES.find((b) => b.id === bundleId) ??
		CBCT_CLINICAL_BUNDLES.find((b) => b.id === bundleId)
	);
}

export function getCbctBundleById(
	bundleId: CbctBundleId | string,
): ClinicalBundleDefinition | undefined {
	return CBCT_CLINICAL_BUNDLES.find((b) => b.id === bundleId);
}

export function getAllCbctBundles(): readonly ClinicalBundleDefinition[] {
	return CBCT_CLINICAL_BUNDLES;
}

export function getAllClinicalBundles(): readonly ClinicalBundleDefinition[] {
	return CLINICAL_BUNDLES;
}
