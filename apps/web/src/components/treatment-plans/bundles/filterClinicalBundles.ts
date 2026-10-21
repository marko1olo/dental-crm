import {
	CLINICAL_BUNDLES,
	type ClinicalBundleCategory,
	type ClinicalBundleDefinition,
} from "../treatmentPlanBundlesEngine";

export function filterClinicalBundles(
	category: ClinicalBundleCategory | "all",
	searchQuery: string,
): readonly ClinicalBundleDefinition[] {
	return CLINICAL_BUNDLES.filter((b) => {
		if (category !== "all" && b.category !== category) return false;
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase().trim();
		return (
			b.title.toLowerCase().includes(q) ||
			b.shortTitle.toLowerCase().includes(q) ||
			b.description.toLowerCase().includes(q) ||
			b.items.some(
				(it) =>
					it.name.toLowerCase().includes(q) ||
					(it.serviceCode || it.code804n || "").toLowerCase().includes(q),
			)
		);
	});
}
