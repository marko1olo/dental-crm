/**
 * DENTE Dental CRM — Authentic Class II Proximal Geometry for Tooth 48
 * Mandibular Third Molar: M, D, MO, DO, MOD Crenulated Fissure Ingress & Organic Fractures.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH48_CARIES_CLASS2_GEOMETRY = {
	class2M: {
		halo: "M 16.0,42 C 15.5,35 16.5,29 19.5,26 C 23,23 26,23 27.5,26 C 26.5,30 25.5,38 24,42 C 21,44 18,44 16.0,42 Z",
		crater: "M 16.5,40 C 16,34 17,29 19.5,27 C 22,24 25,24.5 26,27 C 25.5,30 24.5,37 23.5,40.5 C 21,42 18.5,42 16.5,40 Z",
		necrotic: "M 17,38 C 16.8,33 17.8,29 19.8,28 C 21.8,26 23.8,26 24.8,28 C 24.2,32 23.5,36 22.5,38.5 C 20.5,39.5 18.5,39.5 17,38 Z",
	},

	class2D: {
		halo: "M 84.0,42 C 84.5,35 83.5,29 80.5,26 C 77,23 74,23 72.5,26 C 73.5,30 74.5,38 76,42 C 79,44 82,44 84.0,42 Z",
		crater: "M 83.5,40 C 84,34 83,29 80.5,27 C 78,24 75,24.5 74,27 C 74.5,30 75.5,37 76.5,40.5 C 79,42 81.5,42 83.5,40 Z",
		necrotic: "M 83,38 C 83.2,33 82.2,29 80.2,28 C 78.2,26 76.2,26 75.2,28 C 75.8,32 76.5,36 77.5,38.5 C 79.5,39.5 81.5,39.5 83,38 Z",
	},

	// MO: Mesial box flows across mesial ridge into crenulated central fissure
	class2Mo: {
		halo: "M 15,44 C 14.5,36 15.5,29 19.5,25 C 24,21 32,21 44,22.5 C 47.5,23.5 46.5,26.5 42,27.5 C 36,28.5 32,29.5 28.5,33 C 25,36.5 22,41 21,44 Z",
		crater: "M 16,42 C 15.5,35 16.5,30 20.5,26 C 25,22.5 33,22.2 43,23.5 C 45.5,24.2 44.5,26 41,26.8 C 35,27.5 31.5,28.5 28,31.5 C 24.5,35 21.5,39.5 21,42 Z",
		necrotic: "M 17,39 C 16.5,34 17.5,30 21.5,27 C 25.5,23.5 33,23.2 41.5,24.2 C 43,24.8 42,25.8 39.5,26.5 C 34.5,27.2 31.5,28.2 28,31.5 C 25,34 22.5,37.5 22,39 Z",
	},

	// DO: Distal box flows across distal ridge into crenulated central fissure
	class2Do: {
		halo: "M 85,44 C 85.5,36 84.5,29 80.5,25 C 76,21 68,21 56,22.5 C 52.5,23.5 53.5,26.5 58,27.5 C 64,28.5 68,29.5 71.5,33 C 75,36.5 78,41 79,44 Z",
		crater: "M 84,42 C 84.5,35 83.5,30 79.5,26 C 75,22.5 67,22.2 57,23.5 C 54.5,24.2 55.5,26 59,26.8 C 65,27.5 68.5,28.5 72,31.5 C 75.5,35 78.5,39.5 79,42 Z",
		necrotic: "M 83,39 C 83.5,34 82.5,30 78.5,27 C 74.5,23.5 67,23.2 58.5,24.2 C 57,24.8 58,25.8 60.5,26.5 C 65.5,27.2 68.5,28.2 72,31.5 C 75,34 77.5,37.5 78,39 Z",
	},

	// MOD: Continuous anatomical tunnel through crenulated central fissure from M to D
	class2Mod: {
		halo: "M 15,44 C 14.5,36 15.5,29 19.5,25 C 24,21 33,21 50,22 C 67,21 76,21 80.5,25 C 84.5,29 85.5,36 85,44 C 79,44 78,41 71.5,33 C 68,29.5 62,25.5 50,26 C 38,25.5 32,29.5 28.5,33 C 22,41 21,44 15,44 Z",
		crater: "M 16,42 C 15.5,35 16.5,30 20.5,26 C 25,22.5 34,22.2 50,22.8 C 66,22.2 75,22.5 79.5,26 C 83.5,30 84.5,35 84,42 C 78.5,42 77.5,39.5 72,32 C 68,28.5 61.5,25 50,25.5 C 38.5,25 32,28.5 28,32 C 22.5,39.5 21.5,42 16,42 Z",
		necrotic: "M 17,39 C 16.5,34 17.5,30 21.5,27 C 25.5,23.5 35,23.2 50,23.6 C 64.5,23.2 74.5,23.5 78.5,27 C 82.5,30 83.5,34 83,39 C 78,39 77,37.5 72.5,31.5 C 67,27 60.5,24.5 50,25 C 39.5,24.5 33,27 27.5,31.5 C 23,37.5 22,39 17,39 Z",
	},
	class2ModBridge: {
		halo: "M 29,21.0 C 39,19.5 61,19.5 71,21.0 C 69,25.5 31,25.5 29,21.0 Z",
		crater: "M 30,21.8 C 40,20.5 60,20.5 70,21.8 C 68,24.5 32,24.5 30,21.8 Z",
		necrotic: "M 33,22.2 C 42,21.5 58,21.5 67,22.2 C 65,23.8 35,23.8 33,22.2 Z",
	},

	// M: organic chip strictly of proximal contact wall (Y=24..48), cusp intact
	destructiveCutoutM:
		"M 13,24 C 19,24 23,26 28,31 C 32,37 31,43 25,49 C 20,53 15,54 13,54 Z",
	destructiveM: {
		fractureMargin: "M 13,24 C 19,24 23,26 28,31 C 32,37 31,43 25,49 C 20,53 15,54 13,54",
		fractureSteps: ["M 19,26 C 24,28 28,31 28,37 C 28,43 24,49 19,51", "M 28,31 L 31,35", "M 28,40 L 29,44"],
	},

	// D: organic chip strictly of distal contact wall (Y=24..48), cusp intact
	destructiveCutoutD:
		"M 87,24 C 81,24 77,26 72,31 C 68,37 69,43 75,49 C 80,53 85,54 87,54 Z",
	destructiveD: {
		fractureMargin: "M 87,24 C 81,24 77,26 72,31 C 68,37 69,43 75,49 C 80,53 85,54 87,54",
		fractureSteps: ["M 81,26 C 76,28 72,31 72,37 C 72,43 76,49 81,51", "M 72,31 L 69,35", "M 72,40 L 71,44"],
	},

	// MO: organic breakdown of mesial wall and mesial cusp slope
	destructiveCutoutMO:
		"M 13,0 L 48,0 C 48,12 46,18 41,24 C 36,30 29,37 23,43 C 17,48 13,50 13,50 Z",
	destructiveMO: {
		fractureMargin: "M 48,0 C 48,12 46,18 41,24 C 36,30 29,37 23,43 C 17,48 13,50 13,50",
		fractureSteps: ["M 41,24 C 36,30 29,37 23,43", "M 41,24 L 44,28", "M 29,37 L 32,41"],
	},

	// DO: organic breakdown of distal wall and distal cusp slope
	destructiveCutoutDO:
		"M 87,0 L 52,0 C 52,12 54,18 59,24 C 64,30 71,37 77,43 C 83,48 87,50 87,50 Z",
	destructiveDO: {
		fractureMargin: "M 52,0 C 52,12 54,18 59,24 C 64,30 71,37 77,43 C 83,48 87,50 87,50",
		fractureSteps: ["M 59,24 C 64,30 71,37 77,43", "M 59,24 L 56,28", "M 71,37 L 68,41"],
	},

	// MOD: continuous organic saddle breakdown
	destructiveCutoutMOD:
		"M 13,0 L 87,0 L 87,48 C 81,48 76,41 68,31 C 60,24 55,25 50,26 C 45,25 40,24 32,31 C 24,41 19,48 13,48 Z",
	destructiveMOD: {
		fractureMargin:
			"M 13,48 C 19,48 24,41 32,31 C 40,24 45,25 50,26 C 55,25 60,24 68,31 C 76,41 81,48 87,48",
		fractureSteps: [
			"M 19,46 C 24,39 32,31 40,25",
			"M 40,25 C 45,26 50,27 55,26 C 60,25 68,31 81,46",
			"M 32,31 L 34,35",
			"M 68,31 L 66,35",
		],
	},
} as const;
