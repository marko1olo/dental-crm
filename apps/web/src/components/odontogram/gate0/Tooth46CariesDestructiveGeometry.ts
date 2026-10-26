/**
 * DENTE Dental CRM — Destructive Caries Cutouts & Fracture Geometry for Tooth 46
 * Organic anatomical cleavage masks & fracture steps for M, D, MO, DO, MOD, and Class I.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH46_CARIES_DESTRUCTIVE_GEOMETRY = {
	// Class I Destructive: organic central occlusal table crater
	destructiveCutout:
		"M 30,0 L 70,0 C 72,16 68,26 62,34 C 56,38 44,38 38,34 C 32,26 28,16 30,0 Z",

	destructive: {
		fractureMargin: "M 30,16 C 32,26 38,34 50,37 C 62,34 68,26 70,16",
		fractureSteps: [
			"M 30,16 C 32,26 38,34 50,37 C 62,34 68,26 70,16",
			"M 38,34 L 35,38",
			"M 62,34 L 65,38",
		],
	},

	// Class II M: organic chip strictly of proximal contact wall, cusp intact (Y=24..48)
	destructiveCutoutM:
		"M 0,22 C 14,22 18,24 22,28 C 25,33 24,41 18,47 C 13,51 6,52 0,52 Z",

	destructiveM: {
		fractureMargin: "M 0,22 C 14,22 18,24 22,28 C 25,33 24,41 18,47 C 13,51 6,52 0,52",
		fractureSteps: [
			"M 6,24 C 16,24 22,28 22,34 C 22,40 18,46 6,48",
			"M 22,28 L 25,32",
			"M 22,38 L 24,42",
		],
	},

	// Class II D: organic chip strictly of distal contact wall, cusp intact (Y=22..48)
	destructiveCutoutD:
		"M 100,22 C 86,22 82,24 78,28 C 75,33 76,41 82,47 C 87,51 94,52 100,52 Z",

	destructiveD: {
		fractureMargin: "M 100,22 C 86,22 82,24 78,28 C 75,33 76,41 82,47 C 87,51 94,52 100,52",
		fractureSteps: [
			"M 94,24 C 84,24 78,28 78,34 C 78,40 82,46 94,48",
			"M 78,28 L 75,32",
			"M 78,38 L 76,42",
		],
	},

	// Class II MO: organic breakdown of mesial wall AND mesial cusp/occlusal table
	destructiveCutoutMO:
		"M 0,0 L 48,0 C 48,14 46,20 44,25 C 40,32 30,38 20,44 C 14,48 8,50 0,50 Z",

	destructiveMO: {
		fractureMargin: "M 48,0 C 48,14 46,20 44,25 C 40,32 30,38 20,44 C 14,48 8,50 0,50",
		fractureSteps: [
			"M 44,25 C 40,32 30,38 20,44",
			"M 44,25 L 47,29",
			"M 30,38 L 33,42",
		],
	},

	// Class II DO: organic breakdown of distal wall AND distal cusp/occlusal table
	destructiveCutoutDO:
		"M 100,0 L 52,0 C 52,14 54,20 56,25 C 60,32 70,38 80,44 C 86,48 92,50 100,50 Z",

	destructiveDO: {
		fractureMargin: "M 52,0 C 52,14 54,20 56,25 C 60,32 70,38 80,44 C 86,48 92,50 100,50",
		fractureSteps: [
			"M 56,25 C 60,32 70,38 80,44",
			"M 56,25 L 53,29",
			"M 70,38 L 67,42",
		],
	},

	// Class II MOD: continuous organic saddle breakdown
	destructiveCutoutMOD:
		"M 0,0 L 100,0 L 100,48 C 92,48 84,42 76,34 C 68,26 60,28 50,30 C 40,28 32,26 24,34 C 16,42 8,48 0,48 Z",

	destructiveMOD: {
		fractureMargin:
			"M 0,48 C 8,48 16,42 24,34 C 32,26 40,28 50,30 C 60,28 68,26 76,34 C 84,42 92,48 100,48",
		fractureSteps: [
			"M 8,46 C 16,40 24,34 32,27",
			"M 32,27 C 40,29 50,30 60,29 C 68,27 76,34 92,46",
			"M 24,34 L 26,38",
			"M 76,34 L 74,38",
		],
	},
} as const;
