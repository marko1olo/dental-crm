/**
 * DENTE Dental CRM — Authentic Class II Proximal Geometry for Tooth 45
 * Mandibular Second Premolar: M, D, MO, DO, MOD Anatomical Fossa Ingress & Organic Fractures.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH45_CARIES_CLASS2_GEOMETRY = {
	class2M: {
		halo: "M 25.0,38 C 24.5,32 25.5,27 28.5,24 C 32,21 35,21 36.5,24 C 35.5,28 34.5,35 33,38 C 30,40 27,40 25.0,38 Z",
		crater: "M 25.5,36 C 25,31 26,27 28.5,25 C 31,22 34,22.5 35,25 C 34.5,28 33.5,34 32.5,36.5 C 30,38 27.5,38 25.5,36 Z",
		necrotic: "M 26,34 C 25.8,30 26.8,27 28.8,26 C 30.8,24 32.8,24 33.8,26 C 33.2,29 32.5,33 31.5,34.5 C 29.5,35.5 27.5,35.5 26,34 Z",
	},

	class2D: {
		halo: "M 75.0,38 C 75.5,32 74.5,27 71.5,24 C 68,21 65,21 63.5,24 C 64.5,28 65.5,35 67,38 C 70,40 73,40 75.0,38 Z",
		crater: "M 74.5,36 C 75,31 74,27 71.5,25 C 69,22 66,22.5 65,25 C 65.5,28 66.5,34 67.5,36.5 C 70,38 72.5,38 74.5,36 Z",
		necrotic: "M 74,34 C 74.2,30 73.2,27 71.2,26 C 69.2,24 67.2,24 66.2,26 C 66.8,29 67.5,33 68.5,34.5 C 70.5,35.5 72.5,35.5 74,34 Z",
	},

	// MO: Mesial box flows across mesial ridge into Y-fissure mesial arm and central pit
	class2Mo: {
		halo: "M 25,44 C 24,36 25,29 28.5,25 C 32,21 38,20.5 45,22 C 48.5,23 47.5,26.5 43,27.5 C 38,28.5 35,29.5 33,32.5 C 30.5,36 29.5,40.5 28.5,44 Z",
		crater: "M 26,42 C 25,35 26,30 29.5,26 C 33,22.5 38,22 44,23.2 C 46.5,24 45.5,25.8 42,26.8 C 37,27.8 34.5,28.8 32.5,31.5 C 30.5,35 29.5,39.5 29,42 Z",
		necrotic: "M 27,39 C 26,34 27,30 30.5,27 C 33.5,24 38,23.5 42.5,24.5 C 44,25.2 43,26.2 40.5,26.8 C 36.5,27.5 34.5,28.5 32.5,31.5 C 31,34 30,37.5 29.5,39 Z",
	},

	// DO: Distal box flows across distal ridge into Y-fissure distal arm and central pit
	class2Do: {
		halo: "M 75,44 C 76,36 75,29 71.5,25 C 68,21 62,20.5 55,22 C 51.5,23 52.5,26.5 57,27.5 C 62,28.5 65,29.5 67,32.5 C 69.5,36 70.5,40.5 71.5,44 Z",
		crater: "M 74,42 C 75,35 74,30 70.5,26 C 67,22.5 62,22 56,23.2 C 53.5,24 54.5,25.8 58,26.8 C 63,27.8 65.5,28.8 67.5,31.5 C 69.5,35 70.5,39.5 71,42 Z",
		necrotic: "M 73,39 C 74,34 73,30 69.5,27 C 66.5,24 62,23.5 57.5,24.5 C 56,25.2 57,26.2 59.5,26.8 C 63.5,27.5 65.5,28.5 67.5,31.5 C 69,34 70,37.5 70.5,39 Z",
	},

	// MOD: Continuous anatomical tunnel through Y-fissure mesial and distal arms and central pit
	class2Mod: {
		halo: "M 25,44 C 24,36 25,29 28.5,25 C 33,21 39,20.5 49.5,21.5 C 60,20.5 66,21 71.5,25 C 75,29 76,36 75,44 C 71.5,44 70.5,40.5 67,32.5 C 65,29 61,25.5 49.5,26 C 38,25.5 34,29 33,32.5 C 29.5,40.5 28.5,44 25,44 Z",
		crater: "M 26,42 C 25,35 26,30 29.5,26 C 34,22.5 40,21.8 49.5,22.5 C 59,21.8 65,22.5 70.5,26 C 74,30 75,35 74,42 C 71,42 70.5,39.5 67.5,31.5 C 65,28 60.5,25 49.5,25.5 C 38.5,25 34,28 32.5,31.5 C 29.5,39.5 29,42 26,42 Z",
		necrotic: "M 27,39 C 26,34 27,30 30.5,27 C 34.5,23.5 40,22.8 49.5,23.5 C 59,22.8 64.5,23.5 69.5,27 C 73,30 74,34 73,39 C 70.5,39 70,37.5 67.5,31.5 C 64,27 59.5,24.5 49.5,25 C 39.5,24.5 35,27 32.5,31.5 C 30,37.5 29.5,39 27,39 Z",
	},
	class2ModBridge: {
		halo: "M 38,21.5 C 44,19.5 56,19.5 62,21.5 C 60,26 40,26 38,21.5 Z",
		crater: "M 39,22.2 C 45,20.5 55,20.5 61,22.2 C 59,25 41,25 39,22.2 Z",
		necrotic: "M 42,22.8 C 46,21.5 54,21.5 58,22.8 C 56,24.2 44,24.2 42,22.8 Z",
	},

	// M: organic chip strictly of proximal contact wall (Y=24..48), cusp intact
	destructiveCutoutM:
		"M 22,22 C 28,22 32,25 36,30 C 39,36 38,42 32,48 C 28,52 23,53 22,53 Z",
	destructiveM: {
		fractureMargin: "M 22,22 C 28,22 32,25 36,30 C 39,36 38,42 32,48 C 28,52 23,53 22,53",
		fractureSteps: ["M 26,24 C 30,27 36,30 36,36 C 36,42 32,48 26,50", "M 36,30 L 39,34", "M 36,39 L 38,43"],
	},

	// D: organic chip strictly of distal contact wall (Y=22..48), cusp intact
	destructiveCutoutD:
		"M 78,22 C 72,22 68,25 64,30 C 61,36 62,42 68,48 C 72,52 77,53 78,53 Z",
	destructiveD: {
		fractureMargin: "M 78,22 C 72,22 68,25 64,30 C 61,36 62,42 68,48 C 72,52 77,53 78,53",
		fractureSteps: ["M 74,24 C 70,27 64,30 64,36 C 64,42 68,48 74,50", "M 64,30 L 61,34", "M 64,39 L 62,43"],
	},

	// MO: organic breakdown of mesial wall and mesial cusp slope
	destructiveCutoutMO:
		"M 22,0 L 49,0 C 48,12 46,18 42,24 C 38,30 32,37 26,43 C 22,47 22,49 22,49 Z",
	destructiveMO: {
		fractureMargin: "M 49,0 C 48,12 46,18 42,24 C 38,30 32,37 26,43 C 22,47 22,49 22,49",
		fractureSteps: ["M 42,24 C 38,30 32,37 26,43", "M 42,24 L 45,28", "M 32,37 L 35,41"],
	},

	// DO: organic breakdown of distal wall and distal cusp slope
	destructiveCutoutDO:
		"M 78,0 L 51,0 C 52,12 54,18 58,24 C 62,30 68,37 74,43 C 78,47 78,49 78,49 Z",
	destructiveDO: {
		fractureMargin: "M 51,0 C 52,12 54,18 58,24 C 62,30 68,37 74,43 C 78,47 78,49 78,49",
		fractureSteps: ["M 58,24 C 62,30 68,37 74,43", "M 58,24 L 55,28", "M 68,37 L 65,41"],
	},

	// MOD: continuous organic saddle breakdown
	destructiveCutoutMOD:
		"M 22,0 L 78,0 L 78,48 C 73,48 68,42 62,32 C 57,25 53,26 49.5,27 C 46,26 42,25 37,32 C 31,42 26,48 22,48 Z",
	destructiveMOD: {
		fractureMargin:
			"M 22,48 C 26,48 31,42 37,32 C 42,25 46,26 49.5,27 C 53,26 57,25 62,32 C 68,42 73,48 78,48",
		fractureSteps: [
			"M 26,46 C 30,40 36,33 42,27",
			"M 42,27 C 46,27 49.5,28 53,27 C 57,27 63,33 74,46",
			"M 37,32 L 39,36",
			"M 62,32 L 60,36",
		],
	},
} as const;
