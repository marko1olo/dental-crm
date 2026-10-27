/**
 * Anatomical Restoration & Prosthetic Geometry for Upper Right Second Premolar 15
 * Post & Core in single central canal, Ferrule, Chamfer, Milled Zirconia Crown, Inlay/Onlay.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH15_RESTORATION_GEOMETRY = {
	// 1. Natural Prepared Ferrule Collar (1.5-2mm dentin band above/below CEJ)
	ferruleCollar:
		"M 24.5,96 C 23.5,98.5 25.0,100.5 27.0,101.5 " +
		"C 38,100.5 50,100.0 73.0,101.5 " +
		"C 75.0,100.5 76.5,98.5 75.5,96 " +
		"C 67,94 50,93.5 24.5,96 Z",
	chamferMarginLine: "M 27.0,101.5 C 38,100.2 50,99.8 73.0,101.5",

	// 2. Post & Core (Single central post + Anatomical prepared stump)
	postCore: {
		// Conical fiber post centered in single canal (Y=35..100.5)
		palatalShaft:
			"M 49.5,35 L 51.5,35 " +
			"C 51.6,56 51.8,78 51.8,100.5 L 48.2,100.5 " +
			"C 48.4,78 48.8,56 49.5,35 Z",
		mesialPin: "",
		// Anatomical prepared premolar stump (6-8° convergence, central crest)
		coreStump:
			"M 28.5,101.5 C 30.0,110 32.5,120 37.0,128 " +
			"C 39.0,131 44.0,132.5 50.0,132.5 C 56.0,132.5 61.0,131 63.0,128 " +
			"C 67.5,120 70.0,110 71.5,101.5 C 60.0,100.5 50.0,100.0 28.5,101.5 Z",
	},

	// 3. Milled Anatomical Zirconia Crown Details (Reflecting Tooth 15 contours)
	crownShell:
		"M 24.5,96 C 22.5,104 21.0,118 22.5,130 C 24.0,140 28.5,147 50.0,151 " +
		"C 71.5,147 76.0,140 77.5,130 C 79.0,118 77.5,104 75.5,96 " +
		"C 67,94 58,93.5 50,93.5 C 42,93.5 33,94 24.5,96 Z",
	cervicalShoulder:
		"M 24.5,96 C 33,94 50,93.5 75.5,96 C 67,96.5 50,96 24.5,96 Z",
	glazeHighlights: [
		{ id: "buccal_crest", d: "M 42,148 C 47,150.5 53,150.5 58,148" },
		{ id: "equator", d: "M 32,118 C 42,119.5 58,119.5 68,118" },
	],
	milledFissures: [
		{ id: "central_ridge", d: "M 50,151 C 50,140 50,128 50,116" },
	],

	// 4. Inlay / Onlay / Composite Restorations
	compositeFilling:
		"M 33,136 C 38,138 44,142 50,144 C 56,142 62,138 67,136 " +
		"C 65,143 58,148 50,151 C 42,148 35,143 33,136 Z",
	inlay:
		"M 36,138 C 42,140 46,143 50,143 C 54,143 58,140 64,138 " +
		"C 62,144 57,146 50,146 C 43,146 38,144 36,138 Z",
	onlay:
		"M 24.5,132 C 30,139 38,146 50,151 C 62,146 70,139 75.5,132 " +
		"C 70,130 63,133 50,132 C 37,133 30,130 24.5,132 Z",
	abfractionDefect: "M 24.5,96 L 29,99.2 L 23.0,102.8 C 23.8,99.5 24.2,97.5 24.5,96 Z",
} as const;
