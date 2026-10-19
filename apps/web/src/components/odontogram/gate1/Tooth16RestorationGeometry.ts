/**
 * DENTE Dental CRM — Restoration Geometries for Upper Molars 16 / 26
 * Anatomical nanohybrid composite in central/distal fossa + crista obliqua preserve.
 * Mandate 8b <= 120 lines.
 */

export const TOOTH16_RESTORATION_GEOMETRY = {
	// Class I / II Anatomical Composite Inlay in Central Fossa
	compositeCentralInlay:
		"M 30,120 C 26,122 28,128 32,130 C 38,132 44,130 48,124 " +
		"C 48,120 44,116 38,116 C 34,116 32,118 30,120 Z",

	// Distal Inlay extension crossing the oblique fissure
	compositeDistalInlay:
		"M 56,128 C 60,126 68,126 74,130 C 72,136 66,138 60,138 " +
		"C 56,136 54,132 56,128 Z",

	// Secondary modeled composite fissures
	compositeFissures: "M 32,122 C 38,124 42,124 46,122 M 58,130 C 64,132 70,132",
} as const;
