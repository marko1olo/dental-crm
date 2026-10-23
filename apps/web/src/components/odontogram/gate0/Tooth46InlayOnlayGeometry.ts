/**
 * DENTE Dental CRM — Ceramic Inlay, Onlay & Overlay Geometry for Tooth 46
 * Precision CAD/CAM bonded restorations (Mandate 8b <= 120 lines).
 */

export const TOOTH46_INLAY_ONLAY_GEOMETRY = {
	// Inlay: Conservative ceramic restoration confined within cusp planes
	inlay: {
		shell:
			"M 26,19.5 " +
			"C 31,18 36,18.5 41,19.5 " +
			"C 45,17.5 49,17 53,17.5 " +
			"C 57,19 61,19.5 65,20.5 " +
			"C 69,20.5 73,21.5 75,22.5 " +
			"C 73,24.5 68,25 64,25 " +
			"C 60,25.5 61,28 61,29.5 " +
			"C 58,28.5 56,26 54,25.5 " +
			"C 49,25.5 45,26 42,26.5 " +
			"C 40,28.5 38,31 36.5,31 " +
			"C 35.5,29 36,27 37,25 " +
			"C 33,25 29,23.5 26,22 " +
			"C 25.5,20.8 25.5,20.2 26,19.5 Z",
		glaze:
			"M 28,20.2 C 34,18.8 42,19 50,19.5 C 58,19 66,20 72,21.5",
	},

	// Onlay: Partial crown covering weakened MB & DB cusps with buccal shoeing bevel
	onlay: {
		shell:
			"M 16,36 " +
			"C 14.5,28 17.5,18 24,18 " +
			"C 28,18 33.5,19.5 38,22 " +
			"C 42.5,19.5 46.5,17.5 50,17.8 " +
			"C 54,17.8 58,19.5 62,22 " +
			"C 63.5,27 65,33 65,37 " +
			"C 55,38 42,39 32,38 " +
			"C 24,37.5 19,37 16,36 Z",
		bevelMargin: "M 16,36 C 24,37.5 42,39 65,37",
		glaze: "M 22,19.5 C 32,19 44,18.5 54,19",
	},

	// Overlay (Table-top / 3/4 Crown): Full occlusal plateau covering all 5 cusps
	overlay: {
		shell:
			"M 15,40 " +
			"C 13.8,28 17.5,18 24,18 " +
			"C 28,18 33.5,19.5 38,22 " +
			"C 42.5,19.5 46.5,17.5 50,17.8 " +
			"C 54,17.8 58,19.5 62,22 " +
			"C 65.5,21.0 70,21.0 74,21.5 " +
			"C 79,22.5 84.5,28 85.5,38 " +
			"C 85,41 83,43 81,42 " +
			"C 68,44 48,45 30,44 " +
			"C 22,43 17,42 15,40 Z",
		chamferMargin: "M 15,40 C 30,44 68,44 81,42",
		glaze:
			"M 20,20 C 35,19.5 52,19 68,21 C 74,22 79,23.5 82,27",
	},
} as const;
