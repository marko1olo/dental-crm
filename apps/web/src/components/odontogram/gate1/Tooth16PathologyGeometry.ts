/**
 * DENTE Dental CRM — Pathology Geometries for Upper Molars 16 / 26
 * Abfraction at CEJ, Post & Core in Palatal root, Calculus, Enamel Craze Line.
 * Mandate 8b <= 120 lines.
 */

export const TOOTH16_PATHOLOGY_GEOMETRY = {
	// 1. Cervical wedge defect (Abfraction) at buccal CEJ margin
	abfractionCervicalWedge: "M 14,96 C 18,94 22,94 26,95 C 22,98 18,98 14,96 Z",
	abfractionExposedDentin:
		"M 16,95.5 C 18,95 21,95 23,95.5 C 21,97 18,97 16,95.5 Z",

	// 2. Post & Core in Palatal canal (the widest, straightest canal of maxillary molar)
	palatalPostPin: "M 48.5,102 L 48.5,36 L 51.5,36 L 51.5,102 Z",
	anatomicalCoreBuildUp:
		"M 34,102 C 34,116 38,126 44,126 C 50,126 50,120 56,120 " +
		"C 62,120 62,126 66,126 C 70,126 72,116 70,102 Z",

	// 3. Supragingival & Subgingival Calculus at cervical zone
	calculusBuccalBand:
		"M 14,94 C 18,92 24,93 30,94 C 28,96 16,97 14,94 Z " +
		"M 70,94 C 76,93 82,92 86,94 C 84,97 72,96 70,94 Z",
	calculusFurcationSpot: "M 46,65 C 48,63 52,63 54,65 C 52,67 48,67 46,65 Z",

	// 4. Submicron Enamel Crack (Craze line 0.5px) crossing Crista Obliqua
	crazeLineFissureCross:
		"M 40,118 C 44,124 48,130 52,134 C 58,140 64,144 68,146",
} as const;
