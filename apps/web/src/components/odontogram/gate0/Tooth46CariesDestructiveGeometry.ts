/**
 * DENTE Dental CRM — Destructive Caries Cutouts & Fracture Geometry for Tooth 46
 * Individual destructive masks & fracture steps for M, D, MO, DO, MOD, and Class I.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH46_CARIES_DESTRUCTIVE_GEOMETRY = {
	// Class I Destructive: central occlusal table collapse
	destructiveCutout:
		"M 24,10 L 76,10 L 75,22 L 70,30 L 62,37 L 50,38 L 38,37 L 30,30 L 25,22 Z",

	destructive: {
		fractureMargin: "M 25,22 L 30,30 L 38,37 L 50,38 L 62,37 L 70,30 L 75,22",
		fractureSteps: [
			"M 25,22 L 30,30 L 38,37 L 50,38 L 62,37 L 70,30 L 75,22",
			"M 30,30 L 27,34",
			"M 70,30 L 73,34",
		],
	},

	// Class II M: chip STRICTLY of approximal contact wall (X=6..26, Y=24..46), cusp intact!
	destructiveCutoutM:
		"M 6,24 L 26,24 L 26,34 L 22,42 L 14,46 L 6,46 Z",

	destructiveM: {
		fractureMargin: "M 6,24 L 26,24 L 26,34 L 22,42 L 14,46 L 6,46",
		fractureSteps: [
			"M 6,24 L 26,24 L 26,34 L 22,42 L 14,46",
			"M 26,24 L 28,28",
			"M 22,42 L 20,44",
		],
	},

	// Class II D: chip STRICTLY of distal contact wall (X=74..94, Y=24..46), cusp intact!
	destructiveCutoutD:
		"M 94,24 L 74,24 L 74,34 L 78,42 L 86,46 L 94,46 Z",

	destructiveD: {
		fractureMargin: "M 94,24 L 74,24 L 74,34 L 78,42 L 86,46 L 94,46",
		fractureSteps: [
			"M 94,24 L 74,24 L 74,34 L 78,42 L 86,46",
			"M 74,24 L 72,28",
			"M 78,42 L 80,44",
		],
	},

	// Class II MO: breakdown of mesial wall AND mesial cusp/occlusal table (X=6..48, Y=10..42)
	destructiveCutoutMO:
		"M 6,10 L 48,10 L 48,22 L 44,30 L 36,36 L 24,42 L 6,42 Z",

	destructiveMO: {
		fractureMargin: "M 48,10 L 48,22 L 44,30 L 36,36 L 24,42 L 6,42",
		fractureSteps: [
			"M 48,10 L 48,22 L 44,30 L 36,36 L 24,42",
			"M 44,30 L 46,34",
			"M 36,36 L 38,40",
		],
	},

	// Class II DO: breakdown of distal wall AND distal cusp/occlusal table (X=52..94, Y=10..42)
	destructiveCutoutDO:
		"M 94,10 L 52,10 L 52,22 L 56,30 L 64,36 L 76,42 L 94,42 Z",

	destructiveDO: {
		fractureMargin: "M 52,10 L 52,22 L 56,30 L 64,36 L 76,42 L 94,42",
		fractureSteps: [
			"M 52,10 L 52,22 L 56,30 L 64,36 L 76,42",
			"M 56,30 L 54,34",
			"M 64,36 L 62,40",
		],
	},

	// Class II MOD: massive bilateral through-and-through saddle breakdown (X=6..94)
	destructiveCutoutMOD:
		"M 6,10 L 94,10 L 94,44 L 80,44 L 74,38 L 66,28 L 50,33 L 34,28 L 26,38 L 20,44 L 6,44 Z",

	destructiveMOD: {
		fractureMargin:
			"M 6,44 L 20,44 L 26,38 L 34,28 L 50,33 L 66,28 L 74,38 L 80,44 L 94,44",
		fractureSteps: [
			"M 20,44 L 26,38 L 34,28 L 50,33",
			"M 50,33 L 66,28 L 74,38 L 80,44",
			"M 34,28 L 36,32",
			"M 66,28 L 64,32",
		],
	},
} as const;
