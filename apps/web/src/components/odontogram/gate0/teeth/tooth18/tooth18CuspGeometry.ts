/**
 * Anatomical Cusp & Groove Geometry for Upper Right Third Molar 18 (Wheeler Ch. 12)
 * Features: Compact crown (61px), dominant MB cusp, strongly reduced DB cusp with steep distal slope,
 * sulcus buccalis with developmental blind pit (buccal pit), and background lingual silhouettes.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth18CuspDef {
	id: "MB" | "DB" | "ML" | "DL";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope: string;
	distalSlope: string;
	buccalRidgePath?: string;
	buccalMesialSlope?: string;
	buccalDistalSlope?: string;
}

export const TOOTH18_CUSPS: readonly Tooth18CuspDef[] = [
	{
		id: "MB",
		nameRu: "Мезиально-щечный бугор (доминирующий)",
		apex: { x: 34, y: 149 },
		ridgePath: "M 19,134 C 22.5,142 28,147.5 34,149 C 40,149 46,145.5 50.5,142",
		mesialSlope:
			"M 34,149 C 28,147.5 22.5,142 19,134 C 17.5,124 19,116 24.5,116 C 28,127 31,140 34,149 Z",
		distalSlope:
			"M 34,149 C 40,149 46,145.5 50.5,142 C 49,134 44.5,124 39,118 C 35.5,128 35,140 34,149 Z",
		buccalRidgePath: "M 34,149 C 33,139 32,129 31,116",
		buccalMesialSlope:
			"M 34,149 C 28,147.5 22.5,142 19,134 C 21,126 25,120 31,116 C 32,129 33,139 34,149 Z",
		buccalDistalSlope:
			"M 34,149 C 33,139 32,129 31,116 C 37,117 43.5,120 50.5,122 C 50.6,132 50.6,138 50.5,142 C 46,145.5 40,149 34,149 Z",
	},
	{
		id: "DB",
		nameRu: "Дистально-щечный бугор (редуцированный, крутой скат)",
		apex: { x: 65, y: 145 },
		ridgePath: "M 50.5,142 C 55,145 60,146 65,145 C 71,144 76.5,139 79.5,133",
		mesialSlope:
			"M 65,145 C 60,146 55,145 50.5,142 C 51,134 55,125 59.5,118 C 62.5,127 63.5,137 65,145 Z",
		distalSlope:
			"M 65,145 C 71,144 76.5,139 79.5,133 C 80.5,125 78,118 73,116 C 70.5,126 68.5,137 65,145 Z",
		buccalRidgePath: "M 65,145 C 65.5,137 66.5,128 67.5,118",
		buccalMesialSlope:
			"M 65,145 C 60,146 55,145 50.5,142 C 50.6,132 50.6,125 50.5,122 C 57,118 63,118 67.5,118 C 66.5,128 65.5,137 65,145 Z",
		buccalDistalSlope:
			"M 65,145 C 65.5,137 66.5,128 67.5,118 C 72,118 76.5,122 79.5,129 C 79.5,131 79.5,132 79.5,133 C 76.5,139 71,144 65,145 Z",
	},
	{
		id: "ML",
		nameRu: "Мезиально-язычный бугор (глубина 2.5D)",
		apex: { x: 43, y: 150.5 },
		ridgePath: "M 38,148 C 41,150 43,150.5 46,149",
		mesialSlope: "M 43,150.5 C 41,150 38,148 38,146 C 41,147 44,148 43,150.5 Z",
		distalSlope: "M 43,150.5 C 46,149 48.5,147 48.5,145 C 45,147 43,148.5 43,150.5 Z",
	},
	{
		id: "DL",
		nameRu: "Дистально-язычный бугор (рудиментарный)",
		apex: { x: 73, y: 144 },
		ridgePath: "M 70,143 C 72,144 73,144 75,142",
		mesialSlope: "M 73,144 C 72,144 70,143 70,141.5 C 72,142 73,143 73,144 Z",
		distalSlope: "M 73,144 C 75,142 76.5,140.5 76.5,139 C 75.5,140.5 74,142 73,144 Z",
	},
];
