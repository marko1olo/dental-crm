/**
 * DENTE Dental CRM — Authentic Class II Proximal Geometry for Tooth 44
 * Mandibular First Premolar: M, D, MO, DO, MOD Isthmus Bridge & Massive Fractures.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH44_CARIES_CLASS2_GEOMETRY = {
	class2M: {
		halo: "M 26.0,38 C 25.5,32 26.5,27 29.5,24 C 33,21 36,21 37.5,24 C 36.5,28 35.5,35 34,38 C 31,40 28,40 26.0,38 Z",
		crater: "M 26.5,36 C 26,31 27,27 29.5,25 C 32,22 35,22.5 36,25 C 35.5,28 34.5,34 33.5,36.5 C 31,38 28.5,38 26.5,36 Z",
		necrotic: "M 27,34 C 26.8,30 27.8,27 29.8,26 C 31.8,24 33.8,24 34.8,26 C 34.2,29 33.5,33 32.5,34.5 C 30.5,35.5 28.5,35.5 27,34 Z",
	},

	class2D: {
		halo: "M 74.0,38 C 74.5,32 73.5,27 70.5,24 C 67,21 64,21 62.5,24 C 63.5,28 64.5,35 66,38 C 69,40 72,40 74.0,38 Z",
		crater: "M 73.5,36 C 74,31 73,27 70.5,25 C 68,22 65,22.5 64,25 C 64.5,28 65.5,34 66.5,36.5 C 69,38 71.5,38 73.5,36 Z",
		necrotic: "M 73,34 C 73.2,30 72.2,27 70.2,26 C 68.2,24 66.2,24 65.2,26 C 65.8,29 66.5,33 67.5,34.5 C 69.5,35.5 71.5,35.5 73,34 Z",
	},

	class2Mo: {
		halo: "M 26.0,38 C 25.5,32 26.5,27 29.5,23 C 33,19 38,19 43.5,20.5 C 45.5,22.5 44.0,26.5 40.0,28.0 C 36.5,29 35.5,35 34,38 C 31,40 28,40 26.0,38 Z",
		crater: "M 26.5,36 C 26,31 27,27 29.5,24 C 32,20.5 37,20.5 42.2,21.5 C 43.8,23.0 42.5,26.0 39.0,27.0 C 35.5,28 34.5,34 33.5,36.5 C 31,38 28.5,38 26.5,36 Z",
		necrotic: "M 27,34 C 26.8,30 27.8,27 29.8,25 C 31.8,22 36,22 40.5,23 C 41.5,24.0 41.0,25.5 38.0,26.0 C 34.5,27 33.5,33 32.5,34.5 Z",
	},

	class2Do: {
		halo: "M 74.0,38 C 74.5,32 73.5,27 70.5,23 C 67,19 62,19 56.5,20.5 C 54.5,22.5 56.0,26.5 60.0,28.0 C 63.5,29 64.5,35 66,38 C 69,40 72,40 74.0,38 Z",
		crater: "M 73.5,36 C 74,31 73,27 70.5,24 C 68,20.5 63,20.5 57.8,21.5 C 56.2,23.0 57.5,26.0 61.0,27.0 C 64.5,28 65.5,34 66.5,36.5 C 69,38 71.5,38 73.5,36 Z",
		necrotic: "M 73,34 C 73.2,30 72.2,27 70.2,25 C 68.2,22 64,22 59.5,23 C 58.5,24.0 59.0,25.5 62.0,26.0 C 65.5,27 66.5,33 67.5,34.5 Z",
	},

	class2ModBridge: {
		halo: "M 40,20 C 44,19 56,19 60,20 C 58,25 42,25 40,20 Z",
		crater: "M 41,20.8 C 45,20 55,20 59,20.8 C 57,24 43,24 41,20.8 Z",
		necrotic: "M 43,21.5 C 47,21 53,21 57,21.5 C 55,23.5 45,23.5 43,21.5 Z",
	},

	// M: chip strictly of approximal contact wall (Y=26..44), cusp intact
	destructiveCutoutM:
		"M 22,26 L 36,26 L 36,34 L 31,40 L 24,44 L 22,44 Z",
	destructiveM: {
		fractureMargin: "M 22,26 L 36,26 L 36,34 L 31,40 L 24,44 L 22,44",
		fractureSteps: ["M 22,26 L 36,26 L 36,34 L 31,40 L 24,44", "M 36,26 L 38,30", "M 31,40 L 33,42"],
	},

	// D: chip strictly of distal contact wall (Y=26..44), cusp intact
	destructiveCutoutD:
		"M 78,26 L 64,26 L 64,34 L 69,40 L 76,44 L 78,44 Z",
	destructiveD: {
		fractureMargin: "M 78,26 L 64,26 L 64,34 L 69,40 L 76,44 L 78,44",
		fractureSteps: ["M 78,26 L 64,26 L 64,34 L 69,40 L 76,44", "M 64,26 L 62,30", "M 69,40 L 67,42"],
	},

	// MO: breakdown of mesial wall and mesial cusp slope
	destructiveCutoutMO:
		"M 22,12 L 52,12 L 51,22 L 46,28 L 38,36 L 24,44 L 22,44 Z",
	destructiveMO: {
		fractureMargin: "M 52,12 L 51,22 L 46,28 L 38,36 L 24,44 L 22,44",
		fractureSteps: ["M 52,12 L 51,22 L 46,28 L 38,36 L 24,44", "M 46,28 L 48,32", "M 38,36 L 40,40"],
	},

	// DO: breakdown of distal wall and distal cusp slope
	destructiveCutoutDO:
		"M 78,12 L 48,12 L 49,22 L 54,28 L 62,36 L 76,44 L 78,44 Z",
	destructiveDO: {
		fractureMargin: "M 48,12 L 49,22 L 54,28 L 62,36 L 76,44 L 78,44",
		fractureSteps: ["M 48,12 L 49,22 L 54,28 L 62,36 L 76,44", "M 54,28 L 52,32", "M 62,36 L 60,40"],
	},

	// MOD: massive bilateral through-and-through saddle breakdown
	destructiveCutoutMOD:
		"M 22,12 L 78,12 L 78,44 L 76,44 L 69,39 L 64,32 L 61,24 L 56,28 L 50,30 L 44,28 L 39,24 L 36,32 L 31,39 L 24,44 L 22,44 Z",
	destructiveMOD: {
		fractureMargin:
			"M 22,44 L 24,44 L 31,39 L 36,32 L 39,24 L 44,28 L 50,30 L 56,28 L 61,24 L 64,32 L 69,39 L 76,44 L 78,44",
		fractureSteps: [
			"M 24,44 L 31,39 L 36,32 L 39,24",
			"M 39,24 L 44,28 L 50,30 L 56,28 L 61,24",
			"M 61,24 L 64,32 L 69,39 L 76,44",
			"M 36,32 L 38,35",
			"M 64,32 L 62,35",
		],
	},
} as const;
