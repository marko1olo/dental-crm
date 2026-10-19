/**
 * DENTE Dental CRM — Defect Geometries for Tooth 16 / 26 Restorations & Prosthetics
 * Compliant with Mandate 8b <= 120 lines.
 */

export const TOOTH16_DEFECT_GEOMETRY = {
	// 1. Defective composite: marginal leakage & secondary caries
	compositeMarginalLeakage:
		"M 30,120 C 26,122 28,128 32,130 M 56,128 C 60,126 68,126 74,130",
	compositeSecondaryCaries:
		"M 28,121 C 26,123 27,127 30,129 C 28,126 27,123 28,121 Z",
	compositeFractureChip: "M 46,122 L 48,124 L 46,126 L 43,124 Z",

	// 2. Defective crown: porcelain fracture, open margin, perforation
	crownPorcelainChipMB:
		"M 23,121 C 21,123 22,126 25,128 C 28,129 29,126 28,123 C 27,121 24,120 23,121 Z",
	crownExposedSubstructureMB:
		"M 24,122 C 23,123 24,125 26,126 C 27,125 26,123 24,122 Z",
	crownCervicalDecementationGap: "M 14,96 C 34,92 66,92 86,96",
	crownOcclusalPerforation:
		"M 48,131 C 46,132 47,135 50,135 C 52,135 53,132 50,131 C 49,130 48,130 48,131 Z",
} as const;
