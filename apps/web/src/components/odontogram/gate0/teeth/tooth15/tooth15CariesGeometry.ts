/**
 * Biological Caries Geometry for Upper Right Second Premolar 15 (Wheeler Ch. 10)
 * Authentic Class I central fissure, Class II (MO, DO, MOD), Class V cervical.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH15_CARIES_GEOMETRY = {
	// Class I: Central Occlusal Fissure Crater
	class1: {
		demineralizedHalo:
			"M 38,146 C 42,143 46,144 50,145 C 54,144 58,143 62,146 " +
			"C 60,149 56,151 50,150 C 44,151 40,149 38,146 Z",
		dendriticCariesPath:
			"M 41,146.5 C 44,144.5 47,145 50,146 C 53,145 56,144.5 59,146.5 " +
			"C 57,148.5 54,149.5 50,149 C 46,149.5 43,148.5 41,146.5 Z",
		necroticCore:
			"M 46,146.5 C 48,145.5 52,145.5 54,146.5 C 52,148 48,148 46,146.5 Z",
		microPits: [
			{ cx: 45, cy: 146.5, r: 0.7 },
			{ cx: 50, cy: 147.0, r: 0.8 },
			{ cx: 55, cy: 146.5, r: 0.7 },
		] as const,
		buccalGrooveTrace: "M 50,151 C 50,144 50,136 50,128",
	},

	// Class II: Approximal Box Cavitations (MO, DO, MOD)
	class2: {
		mesialBox: {
			halo: "M 22.5,126 C 22,118 23,112 27,108 C 31,106 35,110 35.5,118 C 33.5,126 28,132 22.5,126 Z",
			crater: "M 23.5,124 C 23,118 24,114 27,111 C 30,110 32.5,113 33.5,118 C 31.5,124 27.5,128 23.5,124 Z",
			necrotic: "M 24.5,122 C 24,118 25,115 27,113 C 29,113 31,115 31.5,118 C 30,122 27,124 24.5,122 Z",
		},
		distalBox: {
			halo: "M 77.5,126 C 78,118 77,112 73,108 C 69,106 65,110 64.5,118 C 66.5,126 72,132 77.5,126 Z",
			crater: "M 76.5,124 C 77,118 76,114 73,111 C 70,110 67.5,113 66.5,118 C 68.5,124 72.5,128 76.5,124 Z",
			necrotic: "M 75.5,122 C 76,118 75,115 73,113 C 71,113 69,115 68.5,118 C 70,122 73,124 75.5,122 Z",
		},
		modTunnel:
			"M 33,118 C 39,122 45,124 50,124 C 55,124 61,122 67,118 " +
			"C 65,126 58,129 50,129 C 42,129 35,126 33,118 Z",
	},

	// Class V: Organic lenticular cervical lesion at CEJ
	class5: {
		halo:
			"M 32,98.5 C 38,103 44,105 50,105 C 56,105 62,103 68,98.5 " +
			"C 62,96 50,95.5 32,98.5 Z",
		crater:
			"M 36,99 C 41,102.5 45.5,104 50,104 C 54.5,104 59,102.5 64,99 " +
			"C 59,97 50,96.8 36,99 Z",
		necrotic:
			"M 40,99.5 C 43.5,102 46.5,103 50,103 C 53.5,103 56.5,102 60,99.5 " +
			"C 56,98 50,97.8 40,99.5 Z",
	},

	// Destructive extensive gross breakdown
	destructive:
		"M 23,120 C 31,124 40,130 50,128 C 60,130 69,124 77,120 " +
		"C 79,132 75,143 70,147 C 60,150 50,148 40,150 C 30,148 23,139 23,120 Z",
} as const;
