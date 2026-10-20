/**
 * DENTE Dental CRM — Maxillary Central Incisor (FDI 11 / 21) Geometry
 * Wheeler's Dental Anatomy (11th Ed., Ch. 8): Shovel crown, tuberculum dentale,
 * fossa lingualis, single massive conical root, single wide canal.
 * ViewBox: "0 0 100 160", Mandate 8b <= 120 lines.
 */

export const TOOTH11_GEOMETRY = {
	viewBox: "0 0 100 160",
	aspectRatio: "100 / 160",
	cejCurve: "M 18,96 C 32,92 68,92 82,96",
	crownMonolithPath:
		"M 18,96 C 16,108 15,126 15,138 C 15,146 16,150 17,152 " +
		"C 22,152 38,153 50,153 C 62,153 76,152 81,150 C 83,148 85,143 85,136 " +
		"C 85,124 84,108 82,96 C 68,92 32,92 18,96 Z",
	rootMonolithPath:
		"M 18,96 C 22,70 32,36 46,10 C 48,8 52,8 54,10 C 68,36 78,70 82,96 Z",
	rootApex: { x: 50, y: 10 },
	rootGroove: "M 50,12 C 50,38 50,68 50,92",
	// Palatal features (Wheeler Ch. 8)
	cingulumPath:
		"M 24,96 C 26,108 34,116 50,116 C 66,116 74,108 76,96 C 64,93 36,93 24,96 Z",
	foramenCaecum: { x: 50, y: 116 },
	lingualFossaPath:
		"M 26,114 C 28,124 30,136 32,142 C 42,144 58,144 68,142 " +
		"C 70,136 72,124 74,114 C 66,118 34,118 26,114 Z",
	mesialMarginalRidge: "M 20,100 C 20,118 22,134 26,146",
	distalMarginalRidge: "M 80,100 C 80,118 78,134 74,144",
	incisalEdgeCurve: "M 17,152 C 34,153 66,153 81,150",
	mesioIncisalAngle: { x: 17, y: 152, isSharp: true },
	distoIncisalAngle: { x: 81, y: 150, isSharp: false },
	// Developmental depressions & 3 lobes
	developmentalGrooves: [
		"M 36,104 C 36,122 35,142 35,151",
		"M 64,104 C 64,122 65,142 65,150",
	],
	lobes: [
		{
			id: "mesial" as const,
			nameRu: "Мезиальный валик",
			ridgePath: "M 24,108 C 24,124 25,138 26,148",
			highlightPath: "M 26,116 C 26,128 27,138 28,146",
		},
		{
			id: "middle" as const,
			nameRu: "Центральный валик",
			ridgePath: "M 50,106 C 50,122 50,136 50,149",
			highlightPath: "M 50,114 C 50,126 50,138 50,147",
		},
		{
			id: "distal" as const,
			nameRu: "Дистальный валик",
			ridgePath: "M 75,108 C 75,124 74,138 73,147",
			highlightPath: "M 73,116 C 73,128 72,138 71,145",
		},
	],
	// Single wide conical canal with 1.5px pulpal floor overlap (y=96 -> y=97.5)
	canal: {
		canalPath: "M 48.5,12 C 47,38 45,66 44,97.5 L 56,97.5 C 55,66 53,38 51.5,12 Z",
		guttaPerchaPath:
			"M 49,14 C 47.8,38 46,66 45,97.5 L 55,97.5 C 54,66 52.2,38 51,14 Z",
		pulpChamberPath:
			"M 44,96 C 36,104 28,114 30,124 C 32,126 36,122 40,118 C 45,123 50,123 " +
			"55,118 C 60,122 64,126 66,124 C 68,114 62,104 56,96 Z",
		orifice: { x: 50, y: 97.5 },
		apexPoint: { x: 50, y: 12 },
		horns: [
			{ id: "mesial", x: 30, y: 124 },
			{ id: "middle", x: 50, y: 122 },
			{ id: "distal", x: 66, y: 124 },
		],
	},
	periapicalAnchor: { id: "apex-11", x: 50, y: 10, r: 8 },
	overlays: {
		veneerFacingPath:
			"M 19,98 C 17,110 16,126 16,138 C 16,146 17,150 18,151 " +
			"C 23,151 38,152 50,152 C 62,152 76,151 80,149 C 82,147 84,142 84,136 " +
			"C 84,124 83,110 81,98 C 67,95 33,95 19,98 Z",
		veneerChamferMargin: "M 19,98 C 33,95 67,95 81,98",
		veneerIncisalHalo: "M 18,148 C 34,150 66,150 80,147",
		traumaEllis2Mesial: "M 15,138 L 32,153 L 17,152 Z",
		traumaEllis2Distal: "M 85,136 L 68,151 L 81,150 Z",
		traumaEllis4Line: "M 20,125 C 38,122 62,128 80,124",
		wearDegree1Path: "M 17,152 L 18,149 C 34,150 66,150 80,147 L 81,150 Z",
		wearDegree2Path: "M 18,148 C 34,149 66,149 80,146 L 79,144 C 65,147 35,147 19,146 Z",
		wearDegree3Path: "M 19,142 C 34,144 66,144 79,140 L 78,136 C 64,140 34,140 20,138 Z",
		abfractionWedge: "M 22,96 L 36,94 L 34,101 L 22,96 Z",
		fiberPostShaft: "M 48,26 L 52,26 L 52.5,98 L 47.5,98 Z",
		compositeCoreStump: "M 42,96 C 40,108 42,118 50,118 C 58,118 60,108 58,96 Z",
	},
} as const;
