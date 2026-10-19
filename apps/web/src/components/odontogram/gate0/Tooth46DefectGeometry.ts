/**
 * DENTE Dental CRM — Defective Restoration Geometry for Tooth 46
 * Recurrent caries, marginal micro-leakage, ceramic chipping & perforation.
 * Wheeler Dental Anatomy clinical failure modes (Mandate 8b <= 120 lines).
 */

export const TOOTH46_DEFECT_GEOMETRY = {
	// Defective Composite: Marginal gap pigmentation, dentin infiltration & chip
	defectiveComposite: {
		marginalLeakageBorder:
			"M 27,20 C 31,18 36,18.5 41,19.5 C 39,22 33,23 27,21.5 Z " +
			"M 64,20 C 69,20 74,21 75,22 C 73,24 67,23 64,21 Z",
		subFillingCariesInfiltration:
			"M 26.5,21.5 " +
			"C 29,23.5 33,24.5 36,23.5 " +
			"C 34,25.5 29,26 26.5,23 Z",
		fracturedCompositeChip: "M 61,25 L 66,24.5 L 65,29 L 60.5,28.5 Z",
	},

	// Defective Crown: Ceramic chipping on MB cusp, cervical washout & wear perforation
	defectiveCrown: {
		// Chipped ceramic cusp exposing underlying core / metal substructure
		ceramicChippingMB:
			"M 23,20.5 " +
			"C 26,17.5 30,18.5 29,23.5 " +
			"C 27,25.5 24,24.5 23,20.5 Z",
		// Cervical cement washout & recurrent caries along prep shoulder at CEJ
		cervicalWashoutGap:
			"M 16,73 " + "C 24,76.5 34,77.5 42,76 " + "C 36,78.5 24,78.5 16,73 Z",
		// Occlusal wear perforation on DB cusp facet
		occlusalPerforationHole:
			"M 50.5,21.5 " +
			"C 53.5,20.5 56,22 55,24.8 " +
			"C 52.5,26 49.5,24.5 50.5,21.5 Z",
		// Overhanging proximal margin into mesial interdental embrasure
		overhangingMargin: "M 15.5,73 C 12,74 11,76 13,78 C 15,79 17,76 15.5,73 Z",
	},
} as const;
