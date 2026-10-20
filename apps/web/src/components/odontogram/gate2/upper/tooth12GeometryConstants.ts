/**
 * DENTE Dental CRM — Maxillary Lateral Incisor (FDI 12 / 22) Geometry
 * Wheeler's Dental Anatomy (11th Ed., Ch. 8): Slender shovel crown, prominently
 * rounded distoincisal angle, deep palatal fossa, palatoradicular groove,
 * slender conical root with distal apical curve, single slender canal.
 * ViewBox: "0 0 100 160", Mandate 8b <= 120 lines.
 */

export const TOOTH12_GEOMETRY = {
	viewBox: "0 0 100 160",
	aspectRatio: "100 / 160",
	cejCurve: "M 24,96 C 36,93 64,93 76,96",
	crownMonolithPath:
		"M 24,96 C 22,106 21,122 22,134 C 22,142 23,147 25,150 " +
		"C 30,150 44,151 50,151 C 58,151 68,149 73,146 C 76,143 78,138 78,130 " +
		"C 78,120 77,106 76,96 C 64,93 36,93 24,96 Z",
	rootMonolithPath:
		"M 24,96 C 27,72 36,40 50,14 C 52,10 55,7 58,8 C 60,9 60,13 58,18 " +
		"C 54,38 68,68 76,96 Z",
	rootApex: { x: 57, y: 8 },
	distalApicalCurve: "M 50,26 C 53,18 56,12 57,8",
	rootGroove: "M 52,16 C 50,38 50,66 50,92",
	// Palatal features (Wheeler Ch. 8)
	cingulumPath:
		"M 28,96 C 30,106 36,114 50,114 C 64,114 70,106 72,96 C 62,93 38,93 28,96 Z",
	foramenCaecum: { x: 50, y: 114 },
	palatoradicularGroove: "M 50,114 C 52,104 54,94 55,86",
	lingualFossaPath:
		"M 30,113 C 32,122 34,132 36,139 C 43,141 57,141 64,138 " +
		"C 66,132 68,122 69,113 C 63,116 37,116 30,113 Z",
	mesialMarginalRidge: "M 25,100 C 25,116 27,132 30,144",
	distalMarginalRidge: "M 75,100 C 75,116 73,130 68,140",
	incisalEdgeCurve: "M 25,150 C 37,151 60,150 73,146",
	mesioIncisalAngle: { x: 25, y: 150, isSharp: false },
	distoIncisalAngle: { x: 73, y: 146, isSharp: false },
	// Developmental depressions & lobes
	developmentalGrooves: [
		"M 38,104 C 38,120 37,138 37,149",
		"M 62,104 C 62,120 63,136 63,147",
	],
	lobes: [
		{
			id: "mesial" as const,
			nameRu: "Мезиальный валик",
			ridgePath: "M 29,108 C 29,122 30,136 31,146",
			highlightPath: "M 30,116 C 30,126 31,136 32,144",
		},
		{
			id: "middle" as const,
			nameRu: "Центральный валик",
			ridgePath: "M 50,106 C 50,120 50,134 50,147",
			highlightPath: "M 50,114 C 50,124 50,134 50,145",
		},
		{
			id: "distal" as const,
			nameRu: "Дистальный валик",
			ridgePath: "M 71,108 C 71,122 70,134 68,142",
			highlightPath: "M 69,116 C 69,126 68,134 66,140",
		},
	],
	// Slender root canal with distal apical curve & 1.5px pulpal floor overlap
	canal: {
		canalPath:
			"M 55.5,10 C 53,20 48,42 46,97.5 L 54,97.5 C 56,66 57,36 58,10 Z",
		guttaPerchaPath:
			"M 56,12 C 54,20 49,42 47,97.5 L 53,97.5 C 55,66 56.2,36 57.2,12 Z",
		pulpChamberPath:
			"M 46,96 C 40,102 34,112 36,122 C 38,124 42,120 45,117 C 50,120 55,120 " +
			"58,116 C 61,120 64,122 65,119 C 66,112 60,102 54,96 Z",
		orifice: { x: 50, y: 97.5 },
		apexPoint: { x: 56.5, y: 10 },
		horns: [
			{ id: "mesial", x: 36, y: 122 },
			{ id: "distal", x: 65, y: 119 },
		],
	},
	periapicalAnchor: { id: "apex-12", x: 57, y: 8, r: 7 },
	overlays: {
		veneerFacingPath:
			"M 25,98 C 23,108 22,122 23,134 C 23,142 24,147 26,149 " +
			"C 31,149 44,150 50,150 C 58,150 67,148 72,145 C 75,142 77,137 77,130 " +
			"C 77,120 76,108 75,98 C 63,95 37,95 25,98 Z",
		veneerChamferMargin: "M 25,98 C 37,95 63,95 75,98",
		veneerIncisalHalo: "M 26,146 C 38,148 60,147 72,143",
		traumaEllis2Mesial: "M 22,136 L 36,150 L 25,150 Z",
		traumaEllis2Distal: "M 78,130 L 62,148 L 73,146 Z",
		traumaEllis4Line: "M 25,124 C 40,122 60,126 75,123",
		wearDegree1Path: "M 25,150 L 26,147 C 38,148 60,147 72,144 L 73,146 Z",
		wearDegree2Path: "M 26,146 C 38,147 60,146 72,143 L 71,141 C 59,144 39,144 27,143 Z",
		wearDegree3Path: "M 27,140 C 39,142 59,141 71,137 L 70,134 C 58,137 38,137 28,136 Z",
		abfractionWedge: "M 27,96 L 38,94 L 37,100 L 27,96 Z",
		fiberPostShaft: "M 53.5,22 L 56.5,22 L 52.5,98 L 48.5,98 Z",
		compositeCoreStump: "M 44,96 C 42,106 43,116 50,116 C 57,116 58,106 56,96 Z",
	},
} as const;
