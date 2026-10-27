/**
 * Biological Caries Geometry for Upper Right Second Molar 17 (Wheeler Ch. 12)
 * Authentic Class I dendritic fissure + buccal pit, Class II (MO, DO, MOD), Class V cervical.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH17_CARIES_GEOMETRY = {
	// Class I: Dendritic fissure system + Tear-shaped Buccal Pit (Foramen caecum)
	class1: {
		// Chalky demineralized halo along occlusal fissures and buccal groove
		demineralizedHalo:
			"M 23,145 C 27,141 33,142 41,144 C 46,142 49,139 51.5,137 " +
			"C 53,129 50,123 51.5,119 C 55,119 57.5,122 57,127 " +
			"C 55,133 53,139 55,143 C 61,142 66,141 72,143 " +
			"C 70,147 64,149 59,148 C 55,147 53,144 51.5,144 " +
			"C 49,145 44,149 36,150 C 29,151 24,148 23,145 Z",
		// Softened amber dentin core
		dendriticCariesPath:
			"M 26,146 C 31,143 37,144 43,145 C 48,143 50.5,141 51.5,139 " +
			"C 52.5,131 51,125 51.5,121 C 54,121 55.5,123 55,126 " +
			"C 53.5,132 52.5,137 54,141 C 59,143 63,142 68,144 " +
			"C 66,146 62,147 58,146.5 C 54,146 52.5,143 51.5,143 " +
			"C 48,144 42,148 35,148.5 C 30,149 27,147 26,146 Z",
		// Deep necrotic cavitated core inside central groove and buccal pit
		necroticCore:
			"M 51.5,122 C 53,122 54,123.5 53.5,125 C 53,126.5 52,127 51.5,127 " +
			"C 50.5,127 49.8,126.2 50,125 C 50.2,123.5 50.8,122 51.5,122 Z " +
			"M 44,145 C 47,143.5 51,143.5 54,145 C 52,146.5 47,146.8 44,145 Z",
		microPits: [
			{ cx: 35, cy: 147, r: 0.7 },
			{ cx: 51.5, cy: 124.5, r: 0.9 },
			{ cx: 63, cy: 145, r: 0.65 },
		] as const,
		buccalGrooveTrace: "M 51.5,143.5 C 51.8,137 51.2,130 51.5,124",
	},

	// Class II: Approximal Box Cavitations (MO, DO, MOD)
	class2: {
		mesialBox: {
			halo: "M 15.5,126 C 15,118 16,112 20,108 C 24,106 28,110 28.5,118 C 26.5,126 21,132 15.5,126 Z",
			crater: "M 16.5,124 C 16,118 17,114 20,111 C 23,110 25.5,113 26.5,118 C 24.5,124 20.5,128 16.5,124 Z",
			necrotic: "M 17.5,122 C 17,118 18,115 20,113 C 22,113 24,115 24.5,118 C 23,122 20,124 17.5,122 Z",
		},
		distalBox: {
			halo: "M 82.5,126 C 83,118 82,112 78,108 C 74,106 70.5,110 69.5,118 C 71.5,126 77,132 82.5,126 Z",
			crater: "M 81.5,124 C 82,118 81,114 78,111 C 75,110 72.5,113 71.5,118 C 73.5,124 77.5,128 81.5,124 Z",
			necrotic: "M 80.5,122 C 81,118 80,115 78,113 C 76,113 74,115 73.5,118 C 75,122 78,124 80.5,122 Z",
		},
		modTunnel:
			"M 26.5,118 C 35,122 43.5,124 51.5,124 C 59.5,124 67.5,122 71.5,118 " +
			"C 69.5,126 61,129 51.5,129 C 42,129 33.5,126 26.5,118 Z",
	},

	// Class V: Organic lenticular cervical lesion at CEJ
	class5: {
		halo:
			"M 29,98.5 C 37,103 44,105 51.5,105 C 59,105 67,103 72,98.5 " +
			"C 66,96 51.5,95.5 29,98.5 Z",
		crater:
			"M 33,99 C 39.5,102.5 45,104 51.5,104 C 58,104 64.5,102.5 68,99 " +
			"C 63,97 51.5,96.8 33,99 Z",
		necrotic:
			"M 38,99.5 C 42.5,102 47,103 51.5,103 C 56,103 61,102 64,99.5 " +
			"C 60,98 51.5,97.8 38,99.5 Z",
	},

	// Destructive extensive gross breakdown
	destructive:
		"M 17.5,120 C 27,124 38,130 51.5,128 C 64,130 74,124 82.5,120 " +
		"C 84.5,132 80,144 74,147 C 63,149 51.5,146 41,151 C 27,149 17.5,141 17.5,120 Z",
} as const;
