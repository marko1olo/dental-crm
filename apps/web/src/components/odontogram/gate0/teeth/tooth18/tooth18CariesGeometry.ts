/**
 * Biological Caries Geometry for Upper Right Third Molar 18 (Wheeler Ch. 12)
 * Authentic Class I dendritic fissure + buccal pit, Class II (MO, DO, MOD), Class V cervical.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH18_CARIES_GEOMETRY = {
	// Class I: Dendritic fissure system + Tear-shaped Buccal Pit (Foramen caecum)
	class1: {
		// Chalky demineralized halo along occlusal fissures and buccal groove
		demineralizedHalo:
			"M 24,144 C 28,140 34,141 42,143 C 46,141 48.5,138 50.5,136 " +
			"C 52,128 49,121 50.5,117 C 54,117 56.5,120 56,125 " +
			"C 54,131 52,137 54,141 C 60,140 65,139 70,141 " +
			"C 68,145 63,147 58,146 C 54,145 52,142 50.5,142 " +
			"C 48,143 43,147 36,148 C 29,149 25,146 24,144 Z",
		// Softened amber dentin core
		dendriticCariesPath:
			"M 27,145 C 32,142 38,143 44,144 C 48,142 49.5,140 50.5,138 " +
			"C 51.5,130 50,123 50.5,119 C 53,119 54.5,121 54,124 " +
			"C 52.5,130 51.5,135 53,139 C 58,141 62,140 66,142 " +
			"C 64,144 61,145 57,144.5 C 53,144 51.5,141 50.5,141 " +
			"C 47,142 42,146 36,146.5 C 31,147 28,145 27,145 Z",
		// Deep necrotic cavitated core inside central groove and buccal pit
		necroticCore:
			"M 50.5,120 C 52,120 53,121.5 52.5,123 C 52,124.5 51,125 50.5,125 " +
			"C 49.5,125 48.8,124.2 49,123 C 49.2,121.5 49.8,120 50.5,120 Z " +
			"M 43,143.5 C 46,142 50,142 53,143.5 C 51,145 46,145.3 43,143.5 Z",
		microPits: [
			{ cx: 36, cy: 145, r: 0.7 },
			{ cx: 50.5, cy: 122.5, r: 0.9 },
			{ cx: 62, cy: 143, r: 0.65 },
		] as const,
		buccalGrooveTrace: "M 50.5,142 C 50.8,136 50.2,128 50.5,122",
	},

	// Class II: Approximal Box Cavitations (MO, DO, MOD)
	class2: {
		mesialBox: {
			halo: "M 17,126 C 16.5,118 17.5,112 21.5,108 C 25.5,106 29.5,110 30,118 C 28,126 22.5,132 17,126 Z",
			crater: "M 18,124 C 17.5,118 18.5,114 21.5,111 C 24.5,110 27,113 28,118 C 26,124 22,128 18,124 Z",
			necrotic: "M 19,122 C 18.5,118 19.5,115 21.5,113 C 23.5,113 25.5,115 26,118 C 24.5,122 21.5,124 19,122 Z",
		},
		distalBox: {
			halo: "M 80,126 C 80.5,118 79.5,112 75.5,108 C 71.5,106 68.5,110 67.5,118 C 69.5,126 75,132 80,126 Z",
			crater: "M 79,124 C 79.5,118 78.5,114 75.5,111 C 72.5,110 70,113 69,118 C 71,124 75,128 79,124 Z",
			necrotic: "M 78,122 C 78.5,118 77.5,115 75.5,113 C 73.5,113 71.5,115 71,118 C 72.5,122 75.5,124 78,122 Z",
		},
		modTunnel:
			"M 28,118 C 36,122 43.5,124 50.5,124 C 57.5,124 65,122 69,118 " +
			"C 67,126 59,129 50.5,129 C 42,129 34,126 28,118 Z",
	},

	// Class V: Organic lenticular cervical lesion at CEJ
	class5: {
		halo:
			"M 30,98.5 C 38,103 44,105 50.5,105 C 57,105 64,103 70,98.5 " +
			"C 64,96 50.5,95.5 30,98.5 Z",
		crater:
			"M 34,99 C 40,102.5 45,104 50.5,104 C 56,104 62,102.5 66,99 " +
			"C 61,97 50.5,96.8 34,99 Z",
		necrotic:
			"M 39,99.5 C 43,102 47,103 50.5,103 C 54,103 58,102 61,99.5 " +
			"C 57,98 50.5,97.8 39,99.5 Z",
	},

	// Destructive extensive gross breakdown
	destructive:
		"M 19,120 C 28,124 38,130 50.5,128 C 62,130 72,124 80,120 " +
		"C 82,132 78,143 72,145 C 61,147 50.5,144 41,149 C 28,147 19,139 19,120 Z",
} as const;
