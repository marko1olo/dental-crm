/**
 * Biological Caries Geometry for Upper Right Molar 16 (Wheeler Ch. 11)
 * Authentic Class I dendritic fissure + foramen caecum, Class II (MO, DO, MOD), Class V cervical.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH16_CARIES_GEOMETRY = {
	// Class I: Dendritic fissure system + Tear-shaped Buccal Pit (Foramen caecum)
	class1: {
		// Chalky demineralized halo along occlusal fissures and buccal groove
		demineralizedHalo:
			"M 22,146 C 26,142 32,143 40,145 C 46,143 50,140 52.5,138 " +
			"C 54,130 51,124 52.5,120 C 56,120 58.5,123 58,128 " +
			"C 56,134 54,140 56,144 C 62,143 68,142 74,145 " +
			"C 72,149 66,151 60,150 C 56,149 54,146 52.5,146 " +
			"C 50,147 44,151 36,152 C 28,153 23,150 22,146 Z",
		// Softened amber dentin core
		dendriticCariesPath:
			"M 25,147 C 30,144 36,145 42,146 C 48,144 51,142 52.5,140 " +
			"C 53.5,132 52,126 52.5,122 C 55,122 56.5,124 56,127 " +
			"C 54.5,133 53.5,138 55,142 C 60,144 65,143 70,146 " +
			"C 68,148 64,149 59,148.5 C 55,148 53.5,145 52.5,145 " +
			"C 49,146 42,150 35,150.5 C 29,151 26,149 25,147 Z",
		// Deep necrotic cavitated core inside central groove and buccal pit
		necroticCore:
			"M 52.5,123 C 54,123 55,124.5 54.5,126 C 54,127.5 53,128 52.5,128 " +
			"C 51.5,128 50.8,127.2 51,126 C 51.2,124.5 51.8,123 52.5,123 Z " +
			"M 45,146 C 48,144.5 52,144.5 55,146 C 53,147.5 48,147.8 45,146 Z",
		microPits: [
			{ cx: 34, cy: 148, r: 0.7 },
			{ cx: 52.5, cy: 125.5, r: 0.9 },
			{ cx: 64, cy: 147, r: 0.65 },
		] as const,
		buccalGrooveTrace: "M 52.5,145 C 52.8,138 52.2,131 52.5,125",
	},

	// Class II: Approximal Box Cavitations (MO, DO, MOD)
	class2: {
		mesialBox: {
			halo: "M 13.5,126 C 13,118 14,112 18,108 C 22,106 26,110 27,118 C 25,126 19,132 13.5,126 Z",
			crater: "M 14.5,124 C 14,118 15,114 18,111 C 21,110 24,113 25,118 C 23,124 18.5,128 14.5,124 Z",
			necrotic: "M 15.5,122 C 15,118 16,115 18,113 C 20,113 22,115 22.5,118 C 21,122 18,124 15.5,122 Z",
		},
		distalBox: {
			halo: "M 84.5,126 C 85,118 84,112 80,108 C 76,106 72,110 71,118 C 73,126 79,132 84.5,126 Z",
			crater: "M 83.5,124 C 84,118 83,114 80,111 C 77,110 74,113 73,118 C 75,124 79.5,128 83.5,124 Z",
			necrotic: "M 82.5,122 C 83,118 82,115 80,113 C 78,113 76,115 75.5,118 C 77,122 80,124 82.5,122 Z",
		},
		modTunnel:
			"M 25,118 C 34,122 44,124 52.5,124 C 61,124 70,122 73,118 " +
			"C 71,126 62,129 52.5,129 C 43,129 33,126 25,118 Z",
	},

	// Class V: Organic lenticular cervical lesion with undermined enamel border at CEJ
	class5: {
		halo:
			"M 28,98.5 C 36,103 44,105 52.5,105 C 61,105 69,103 74,98.5 " +
			"C 68,96 52.5,95.5 28,98.5 Z",
		crater:
			"M 32,99 C 39,102.5 45,104 52.5,104 C 60,104 66,102.5 70,99 " +
			"C 65,97 52.5,96.8 32,99 Z",
		necrotic:
			"M 37,99.5 C 42,102 47,103 52.5,103 C 58,103 63,102 66,99.5 " +
			"C 62,98 52.5,97.8 37,99.5 Z",
	},

	// Destructive extensive gross breakdown
	destructive:
		"M 16,120 C 26,124 38,130 52.5,128 C 65,130 76,124 84,120 " +
		"C 86,132 82,144 76,149 C 64,151 52.5,148 40,152 C 26,150 16,142 16,120 Z",
} as const;
