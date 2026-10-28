/**
 * Anatomical Restoration & Prosthetic Geometry for Upper Right Third Molar 18
 * Authentic Post & Core (КШВ/СВШ), Ferrule, Chamfer, Milled Zirconia Crown, Inlay/Onlay.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH18_RESTORATION_GEOMETRY = {
	// 1. Natural Prepared Ferrule Collar (1.5-2mm dentin band above/below CEJ)
	ferruleCollar:
		"M 19.0,96 C 18.0,98.5 19.5,100.5 21.5,101.5 " +
		"C 34,100.5 50,100.0 77.5,101.5 " +
		"C 79.5,100.5 81.0,98.5 80.0,96 " +
		"C 70,94 50,93.5 19.0,96 Z",
	chamferMarginLine: "M 21.5,101.5 C 34,100.2 50,99.8 77.5,101.5",

	// 2. Post & Core (Anchor pin in Fused/Palatal canal + Anatomical prepared stump)
	postCore: {
		// Conical fiber/cast post in Fused/Palatal canal (Y=46..100.5), leaving apical seal to Y=19.0
		palatalShaft:
			"M 40.5,46.0 L 42.7,46.0 " +
			"C 43.5,65 45.0,84 47.0,100.5 L 43.5,100.5 " +
			"C 41.8,84 40.8,65 40.5,46.0 Z",
		// Anatomical prepared molar stump (6-8° convergence, DB lower)
		coreStump:
			"M 24.0,101.5 C 25.5,110 27.5,120 31.0,128 " +
			"C 32.5,130 36.5,131.5 42.5,131.5 C 47.0,131.5 49.0,130.5 51.0,130.5 " +
			"C 53.5,130.5 57.0,129.5 61.5,128.5 C 67.0,127.5 71.0,126.0 72.5,124.0 " +
			"C 75.5,117 77.5,108 79.0,101.5 C 67.0,100.5 50.0,100.0 24.0,101.5 Z",
	},

	// 3. Milled Anatomical Zirconia Crown Details (Reflecting Tooth 18 contours)
	crownShell:
		"M 19.0,96 C 17.5,103 16,117 17.5,128 C 18.5,136 21.5,144 34,149 " +
		"C 40.5,149 46,145.5 50.5,142 C 55,145 60,146 65,145 " +
		"C 71,144 76.5,139 79.5,128 C 81,117 80.5,103 80.0,96 " +
		"C 70,94 60,93.5 50,93.5 C 40,93.5 30,94 19.0,96 Z",
	cervicalShoulder:
		"M 19.0,96 C 30,94 50,93.5 80.0,96 C 70,96.5 50,96 19.0,96 Z",
	glazeHighlights: [
		{ id: "mb_crest", d: "M 26,146 C 30,148 34,148.5 38,147.5" },
		{ id: "db_crest", d: "M 59,144 C 63,145 65.5,144.8 70,143" },
		{ id: "equator", d: "M 30,118 C 42,119.5 58,119.5 69,118" },
	],
	milledFissures: [
		{ id: "buccal_groove", d: "M 50.5,142 C 50.8,136 50.6,128 50.5,122" },
		{ id: "mb_slope", d: "M 34,149 C 40,148 46,144.5 50.5,142" },
		{ id: "db_slope", d: "M 50.5,142 C 55,144 60,145 65,145" },
	],

	// 4. Inlay / Onlay / Composite Restorations
	compositeFilling:
		"M 26,136 C 32,138 38,142 45,144 C 51.5,143 57,142 64,144 " +
		"C 70,142 74,138 76,136 C 72,142 69,144.5 65,145 " +
		"C 58,145 52,143 50.5,142 C 46,144 41,149 34,149 " +
		"C 27,147 24,142 26,136 Z",
	inlay:
		"M 30,138 C 38,140 44,143 50.5,143 C 57,143 64,140 70,138 " +
		"C 68,143 63,145 58,144.5 C 53,144 49,143 43,144.5 " +
		"C 37,145 32,143 30,138 Z",
	onlay:
		"M 19.0,132 C 24,139 30,145.5 34,149 C 40.5,149 46,145.5 50.5,142 " +
		"C 55,145 60,146 65,145 C 71,144 75.5,138 79.5,132 " +
		"C 74,130 67,133 60,132 C 51,131 42,133 35,131 C 28,132 22,130 19.0,132 Z",
	abfractionDefect: "M 19.0,96 L 23.5,99.2 L 17.0,102.8 C 18.0,99.5 18.5,97.5 19.0,96 Z",
} as const;
