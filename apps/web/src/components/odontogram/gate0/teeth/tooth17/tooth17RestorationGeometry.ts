/**
 * Anatomical Restoration & Prosthetic Geometry for Upper Right Second Molar 17
 * Authentic Post & Core (КШВ/СВШ), Ferrule, Chamfer, Milled Zirconia Crown, Inlay/Onlay.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH17_RESTORATION_GEOMETRY = {
	// 1. Natural Prepared Ferrule Collar (1.5-2mm dentin band above/below CEJ)
	ferruleCollar:
		"M 17.5,96 C 16.5,98.5 18.0,100.5 20.0,101.5 " +
		"C 33,100.5 50,100.0 80.0,101.5 " +
		"C 82.0,100.5 83.5,98.5 82.5,96 " +
		"C 71,94 50,93.5 17.5,96 Z",
	chamferMarginLine: "M 20.0,101.5 C 33,100.2 50,99.8 80.0,101.5",

	// 2. Post & Core (Anchor pin in Palatal canal + Anatomical prepared stump)
	postCore: {
		// Conical fiber/cast post in convergent Palatal root (Y=37..100.5)
		palatalShaft:
			"M 50.1,37 L 51.9,37 " +
			"C 51.9,56 52.1,78 52.4,100.5 L 48.8,100.5 " +
			"C 49.3,78 49.8,56 50.1,37 Z",
		// Auxiliary mesial anti-rotational retention pin
		mesialPin:
			"M 34.5,72 C 35.0,82 36.0,92 37.5,100.5 L 35.5,100.5 " +
			"C 34.5,92 33.5,82 33.0,72 Z",
		// Anatomical prepared molar stump (6-8° convergence, DB lower)
		coreStump:
			"M 22.5,101.5 C 24.0,110 26.0,120 29.5,128 " +
			"C 31.0,130 35.0,131.5 41.0,131.5 C 46.0,131.5 49.0,130.5 51.5,130.5 " +
			"C 54.5,130.5 58.0,130.0 63.0,129.5 C 69.0,129.0 73.5,127.5 75.0,125.5 " +
			"C 78.5,118 80.5,109 82.0,101.5 C 69.0,100.5 50.0,100.0 22.5,101.5 Z",
	},

	// 3. Milled Anatomical Zirconia Crown Details (Reflecting Tooth 17 contours)
	crownShell:
		"M 17.5,96 C 15.5,104 14,118 15.5,130 C 16.5,138 20.0,146 33,151 " +
		"C 40,151 46.5,147 51.5,143.5 C 56.5,146.5 62,148 67,147.5 " +
		"C 73.5,146.5 79,141 82.5,130 C 84,118 83.5,104 82.5,96 " +
		"C 71,94 61,93.5 50,93.5 C 39,93.5 29,94 17.5,96 Z",
	cervicalShoulder:
		"M 17.5,96 C 29,94 50,93.5 82.5,96 C 71,96.5 50,96 17.5,96 Z",
	glazeHighlights: [
		{ id: "mb_crest", d: "M 25,147.5 C 29,150 33,150.5 37,149.5" },
		{ id: "db_crest", d: "M 61,146.5 C 65,147.5 67.5,147.2 72,145" },
		{ id: "equator", d: "M 29,118 C 41,119.5 59,119.5 71,118" },
	],
	milledFissures: [
		{ id: "buccal_groove", d: "M 51.5,143.5 C 51.8,137 51.6,130 51.5,124" },
		{ id: "mb_slope", d: "M 33,151 C 39,150 46,146 51.5,143.5" },
		{ id: "db_slope", d: "M 51.5,143.5 C 56.5,145.5 62,147 67,147.5" },
	],

	// 4. Inlay / Onlay / Composite Restorations
	compositeFilling:
		"M 25,136 C 31,138 37,142 44,144 C 51.5,143 58,142 66,144 " +
		"C 72,142 76,138 78,136 C 74,143 71,146 67,147.5 " +
		"C 59,147 53,144.5 51.5,143.5 C 47,145.5 41,151 33,151 " +
		"C 26,149 23,143 25,136 Z",
	inlay:
		"M 29,138 C 37,140 44,143 51.5,143 C 58,143 66,140 72,138 " +
		"C 70,144 65,146 59,145.5 C 53,145 49,144 43,145.5 " +
		"C 36,146 31,144 29,138 Z",
	onlay:
		"M 17.5,132 C 23,140 29,147 33,151 C 40,151 46.5,147 51.5,143.5 " +
		"C 56.5,146.5 62,148 67,147.5 C 73.5,146.5 78,139 82.5,133 " +
		"C 76,131 69,134 61,133 C 52,132 42,134 35,132 C 27,133 21,131 17.5,132 Z",
	abfractionDefect: "M 17.5,96 L 22,99.2 L 15.2,102.8 C 16.5,99.5 17.0,97.5 17.5,96 Z",
} as const;
