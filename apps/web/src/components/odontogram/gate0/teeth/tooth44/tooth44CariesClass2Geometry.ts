/**
 * DENTE Dental CRM — Authentic Class II Proximal Geometry for Tooth 44
 * Mandibular First Premolar: M, D, MO, DO, MOD Anatomical Fossa Ingress & Organic Fractures.
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

	// MO: Mesial box flows across mesial ridge into mesial snake-eye fossa
	class2Mo: {
		halo: "M 25,44 C 24,36 25,29 29,25 C 33,21 38,20 44,21.5 C 47,23 46,26 42,27 C 37,28 34,29 32,32 C 30,35 29,40 28,44 Z",
		crater: "M 26,42 C 25,35 26,30 30,26.5 C 34,23 38,22 43,23 C 45,24 44,25.5 41,26.2 C 36,27 34,28 32,31 C 30,34 29,39 28.5,42 Z",
		necrotic: "M 27,39 C 26,34 27,30 31,27.5 C 34,24.5 38,23.5 41.5,24.5 C 43,25 42,26 39.5,26.5 C 36,27 34,28 32,31 C 30.5,33.5 29.5,37 29,39 Z",
	},

	// DO: Distal box flows across distal ridge into distal snake-eye fossa
	class2Do: {
		halo: "M 75,44 C 76,36 75,29 71,25 C 67,21 62,20 56,21.5 C 53,23 54,26 58,27 C 63,28 66,29 68,32 C 70,35 71,40 72,44 Z",
		crater: "M 74,42 C 75,35 74,30 70,26.5 C 66,23 62,22 57,23 C 55,24 56,25.5 59,26.2 C 64,27 66,28 68,31 C 70,34 71,39 71.5,42 Z",
		necrotic: "M 73,39 C 74,34 73,30 69,27.5 C 66,24.5 62,23.5 58.5,24.5 C 57,25 58,26 60.5,26.5 C 64,27 66,28 68,31 C 69.5,33.5 70.5,37 71,39 Z",
	},

	// MOD: Continuous anatomical tunnel through mesial and distal fossae across crista transversa
	class2Mod: {
		halo: "M 25,44 C 24,36 25,29 29,25 C 34,21 40,20 50,21 C 60,20 66,21 71,25 C 75,29 76,36 75,44 C 72,44 71,40 68,32 C 66,28 62,25 50,25.5 C 38,25 34,28 32,32 C 29,40 28,44 25,44 Z",
		crater: "M 26,42 C 25,35 26,30 30,26.5 C 35,22.5 41,21.5 50,22 C 59,21.5 65,22.5 70,26.5 C 74,30 75,35 74,42 C 71.5,42 71,39 68,31 C 65,27 61,24.5 50,25 C 39,24.5 35,27 32,31 C 29,39 28.5,42 26,42 Z",
		necrotic: "M 27,39 C 26,34 27,30 31,27.5 C 35,23.5 41,22.5 50,23 C 59,22.5 65,23.5 69,27.5 C 73,30 74,34 73,39 C 71,39 70.5,37 68,31 C 64,26.5 60,24 50,24.5 C 40,24 36,26.5 32,31 C 29.5,37 29,39 27,39 Z",
	},
	class2ModBridge: {
		halo: "M 36,22 C 42,20 54,20 60,22 C 58,26.5 40,26.5 36,22 Z",
		crater: "M 38,22.5 C 43,21 53,21 58,22.5 C 56,25.5 41,25.5 38,22.5 Z",
		necrotic: "M 41,23 C 45,22 51,22 55,23 C 54,24.5 43,24.5 41,23 Z",
	},

	// M: organic chip strictly of proximal contact wall (Y=24..48), cusp intact
	destructiveCutoutM:
		"M 16,22 C 24,22 28,24 34,28 C 37,33 36,41 30,47 C 26,51 20,52 16,52 Z",
	destructiveM: {
		fractureMargin: "M 16,22 C 24,22 28,24 34,28 C 37,33 36,41 30,47 C 26,51 20,52 16,52",
		fractureSteps: ["M 24,24 C 28,26 34,28 34,34 C 34,40 30,46 24,48", "M 34,28 L 37,32", "M 34,38 L 36,42"],
	},

	// D: organic chip strictly of distal contact wall (Y=22..48), cusp intact
	destructiveCutoutD:
		"M 84,22 C 76,22 72,24 66,28 C 63,33 64,41 70,47 C 74,51 80,52 84,52 Z",
	destructiveD: {
		fractureMargin: "M 84,22 C 76,22 72,24 66,28 C 63,33 64,41 70,47 C 74,51 80,52 84,52",
		fractureSteps: ["M 76,24 C 72,26 66,28 66,34 C 66,40 70,46 76,48", "M 66,28 L 63,32", "M 66,38 L 64,42"],
	},

	// MO: organic breakdown of mesial wall and mesial cusp slope
	destructiveCutoutMO:
		"M 16,0 L 48,0 C 48,12 46,18 42,24 C 38,30 32,36 26,42 C 20,46 16,48 16,48 Z",
	destructiveMO: {
		fractureMargin: "M 48,0 C 48,12 46,18 42,24 C 38,30 32,36 26,42 C 20,46 16,48 16,48",
		fractureSteps: ["M 42,24 C 38,30 32,36 26,42", "M 42,24 L 45,28", "M 32,36 L 35,40"],
	},

	// DO: organic breakdown of distal wall and distal cusp slope
	destructiveCutoutDO:
		"M 84,0 L 52,0 C 52,12 54,18 58,24 C 62,30 68,36 74,42 C 80,46 84,48 84,48 Z",
	destructiveDO: {
		fractureMargin: "M 52,0 C 52,12 54,18 58,24 C 62,30 68,36 74,42 C 80,46 84,48 84,48",
		fractureSteps: ["M 58,24 C 62,30 68,36 74,42", "M 58,24 L 55,28", "M 68,36 L 65,40"],
	},

	// MOD: continuous organic saddle breakdown
	destructiveCutoutMOD:
		"M 16,0 L 84,0 L 84,46 C 78,46 72,40 66,32 C 60,25 54,26 50,27 C 46,26 40,25 34,32 C 28,40 22,46 16,46 Z",
	destructiveMOD: {
		fractureMargin:
			"M 16,46 C 22,46 28,40 34,32 C 40,25 46,26 50,27 C 54,26 60,25 66,32 C 72,40 78,46 84,46",
		fractureSteps: [
			"M 22,44 C 28,38 34,32 42,26",
			"M 42,26 C 46,27 50,27 54,27 C 58,26 66,32 78,44",
			"M 34,32 L 36,36",
			"M 66,32 L 64,36",
		],
	},
} as const;
