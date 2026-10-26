export type LabelPresetType = "kraft_sanpin" | "prp_tube";
export type PackageType = "combined_heat_seal" | "paper_single" | "paper_double";

export function getValidityDays(packageType: PackageType): number {
	switch (packageType) {
		case "combined_heat_seal":
			return 60; // 60 суток для термосвариваемых пакетов
		case "paper_double":
			return 50; // 50 суток
		case "paper_single":
		default:
			return 20; // 20 суток
	}
}
