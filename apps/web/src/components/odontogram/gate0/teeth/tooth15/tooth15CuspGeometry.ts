/**
 * Anatomical Cusp & Groove Geometry for Upper Right Second Premolar 15 (Wheeler Ch. 10)
 * Buccal projection: Single prominent buccal cusp (B) centered at (50, 151) with rounded slopes,
 * prominent buccal ridge, and background lingual cusp silhouette (L).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth15CuspDef {
	id: "B" | "L";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope: string;
	distalSlope: string;
	buccalRidgePath?: string;
	buccalMesialSlope?: string;
	buccalDistalSlope?: string;
}

export const TOOTH15_CUSPS: readonly Tooth15CuspDef[] = [
	{
		id: "B",
		nameRu: "Щечный бугор (центральный, доминирующий)",
		apex: { x: 50, y: 151 },
		ridgePath: "M 24.5,134 C 29,142 39,148 50,151 C 61,148 71,142 75.5,134",
		mesialSlope:
			"M 50,151 C 39,148 29,142 24.5,134 C 23,124 25,116 32,116 C 37,126 43,139 50,151 Z",
		distalSlope:
			"M 50,151 C 61,148 71,142 75.5,134 C 77,124 75,116 68,116 C 63,126 57,139 50,151 Z",
		buccalRidgePath: "M 50,151 C 50,138 50,126 50,114",
		buccalMesialSlope:
			"M 50,151 C 39,148 29,142 24.5,134 C 26.5,126 33,120 42,115 C 45,127 48,139 50,151 Z",
		buccalDistalSlope:
			"M 50,151 C 61,148 71,142 75.5,134 C 73.5,126 67,120 58,115 C 55,127 52,139 50,151 Z",
	},
	{
		id: "L",
		nameRu: "Нёбный бугор (глубина 2.5D)",
		apex: { x: 50, y: 147.5 },
		ridgePath: "M 40,145 C 45,147 50,147.5 55,147 C 60,145 60,145 60,145",
		mesialSlope: "M 50,147.5 C 45,147 40,145 40,143 C 44,144 48,145 50,147.5 Z",
		distalSlope: "M 50,147.5 C 55,147 60,145 60,143 C 56,144 52,145 50,147.5 Z",
	},
];
