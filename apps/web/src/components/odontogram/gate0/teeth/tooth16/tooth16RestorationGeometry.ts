/**
 * Anatomical Restoration & Prosthetic Geometry for Upper Right Molar 16
 * Authentic Post & Core (КШВ/СВШ), Ferrule, Chamfer, Milled Zirconia Crown, Inlay/Onlay.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH16_RESTORATION_GEOMETRY = {
	// 1. Natural Prepared Ferrule Collar (1.5-2mm dentin band above/below CEJ)
	ferruleCollar:
		"M 16,96 C 15,98.5 16.5,100.5 18.5,101.5 " +
		"C 32,100.5 50,100.0 81.5,101.5 " +
		"C 83.5,100.5 85,98.5 84,96 " +
		"C 72,94 50,93.5 16,96 Z",
	chamferMarginLine: "M 18.5,101.5 C 32,100.2 50,99.8 81.5,101.5",

	// 2. Post & Core (Anchor pin in straight Palatal canal + Anatomical prepared stump)
	postCore: {
		// Conical fiber/cast post in Palatal root (Y=35..100.5)
		palatalShaft:
			"M 49.1,35 L 50.9,35 " +
			"C 51.1,56 51.3,78 51.8,100.5 L 48.2,100.5 " +
			"C 48.7,78 48.9,56 49.1,35 Z",
		// Auxiliary mesial anti-rotational retention pin
		mesialPin:
			"M 33.5,72 C 34.0,82 35.0,92 36.5,100.5 L 34.5,100.5 " +
			"C 33.5,92 32.5,82 32.0,72 Z",
		// Anatomical prepared molar stump (6-8° convergence, rounded occlusal table)
		coreStump:
			"M 21.0,101.5 C 22.5,110 24.5,120 28.0,128 " +
			"C 29.5,130 34.0,131.5 40.0,131.5 C 45.0,131.5 49.0,130.5 52.5,130.5 " +
			"C 56.0,130.5 60.0,131.5 65.0,131.5 C 71.0,131.5 75.5,130 77.0,128 " +
			"C 80.5,120 82.5,110 84.0,101.5 C 70.0,100.5 50.0,100.0 21.0,101.5 Z",
	},

	// 3. Milled Anatomical Zirconia Crown Details
	crownShell:
		"M 16,96 C 13.5,104 12,118 13.5,130 C 14.5,138 18.0,146 32,152 " +
		"C 40,152 47,148 52.5,145 C 58,148 64,150 69,149.5 " +
		"C 76,148 82,142 85,130 C 86.5,118 85.5,104 84,96 " +
		"C 72,94 62,93.5 50,93.5 C 38,93.5 28,94 16,96 Z",
	cervicalShoulder:
		"M 16,96 C 28,94 50,93.5 84,96 C 72,96.5 50,96 16,96 Z",
	glazeHighlights: [
		{ id: "mb_crest", d: "M 24,148 C 28,151 32,151.5 36,150.5" },
		{ id: "db_crest", d: "M 62,148.5 C 66,149.5 69,149.2 74,147" },
		{ id: "equator", d: "M 28,118 C 40,119.5 60,119.5 72,118" },
	],
	milledFissures: [
		{ id: "buccal_groove", d: "M 52.5,145 C 52.8,138 52.6,131 52.5,125" },
		{ id: "mb_slope", d: "M 32,152 C 38,151 46,147 52.5,145" },
		{ id: "db_slope", d: "M 52.5,145 C 58,147 64,149 69,149.5" },
	],

	// 4. Inlay / Onlay / Composite Restorations
	compositeFilling:
		"M 24,136 C 30,138 36,142 44,144 C 52.5,143 60,142 68,144 " +
		"C 74,142 78,138 80,136 C 76,144 72,148 68,149.5 " +
		"C 60,149 54,146 52.5,145 C 48,147 40,152 32,152 " +
		"C 25,150 22,144 24,136 Z",
	inlay:
		"M 28,138 C 36,140 44,143 52.5,143 C 60,143 68,140 74,138 " +
		"C 72,145 66,147 60,146.5 C 54,146 50,145 44,146.5 " +
		"C 36,147 30,145 28,138 Z",
	onlay:
		"M 16,132 C 22,140 28,148 32,152 C 40,152 47,148 52.5,145 " +
		"C 58,148 64,150 69,149.5 C 76,148 81,140 84,134 " +
		"C 78,132 70,135 62,134 C 52,133 42,135 34,133 C 26,134 20,132 16,132 Z",
	abfractionDefect: "M 16,96 L 21,99.2 L 13.8,102.8 C 15.0,99.5 15.5,97.5 16,96 Z",
} as const;
