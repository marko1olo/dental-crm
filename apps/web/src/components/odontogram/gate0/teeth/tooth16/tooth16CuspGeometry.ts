/**
 * Anatomical Cusp & Groove Geometry for Upper Right Molar 16 (Wheeler Ch. 11)
 * Buccal projection: 2 prominent buccal cusps (MB, DB) separated by sulcus buccalis
 * with anatomical buccal pit, plus background lingual silhouettes (ML, DL).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth16CuspDef {
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

export const TOOTH16_CUSPS: readonly Tooth16CuspDef[] = [
	{
		id: "MB",
		nameRu: "Мезиально-щечный бугор",
		apex: { x: 32, y: 152 },
		ridgePath: "M 16,134 C 20,144 26,150 32,152 C 38,152 46,148 52.5,145",
		mesialSlope:
			"M 32,152 C 26,150 20,144 16,134 C 14,124 16,116 22,116 C 26,128 29,142 32,152 Z",
		distalSlope:
			"M 32,152 C 38,152 46,148 52.5,145 C 51,136 46,125 40,118 C 35,128 33,142 32,152 Z",
		buccalRidgePath: "M 32,152 C 31,142 30,130 29,116",
		buccalMesialSlope:
			"M 32,152 C 26,150 20,144 16,134 C 18,126 23,120 29,116 C 30,130 31,142 32,152 Z",
		buccalDistalSlope:
			"M 32,152 C 31,142 30,130 29,116 C 36,117 44,120 52.5,125 C 52.6,135 52.6,141 52.5,145 C 46,148 38,152 32,152 Z",
	},
	{
		id: "DB",
		nameRu: "Дистально-щечный бугор",
		apex: { x: 69, y: 149.5 },
		ridgePath: "M 52.5,145 C 58,148 64,150 69,149.5 C 76,148 81,142 84,136",
		mesialSlope:
			"M 69,149.5 C 64,150 58,148 52.5,145 C 53,136 57,126 62,118 C 65,128 67,140 69,149.5 Z",
		distalSlope:
			"M 69,149.5 C 76,148 81,142 84,136 C 85,126 82,118 76,116 C 73,128 71,140 69,149.5 Z",
		buccalRidgePath: "M 69,149.5 C 69,140 70,130 71,118",
		buccalMesialSlope:
			"M 69,149.5 C 64,150 58,148 52.5,145 C 52.6,135 52.6,128 52.5,125 C 60,119 66,118 71,118 C 70,130 69,140 69,149.5 Z",
		buccalDistalSlope:
			"M 69,149.5 C 69,140 70,130 71,118 C 76,118 81,122 84,130 C 84,133 84,135 84,136 C 81,142 76,148 69,149.5 Z",
	},
	{
		id: "ML",
		nameRu: "Мезиально-язычный бугор (глубина 2.5D)",
		apex: { x: 44, y: 153.5 },
		ridgePath: "M 38,150 C 41,152.5 44,153.5 47,152",
		mesialSlope: "M 44,153.5 C 41,152.5 38,150 38,148 C 42,149 46,150 44,153.5 Z",
		distalSlope: "M 44,153.5 C 47,152 50,149.5 50,147 C 46,149 43,151 44,153.5 Z",
	},
	{
		id: "DL",
		nameRu: "Дистально-язычный бугор (глубина 2.5D)",
		apex: { x: 77, y: 148 },
		ridgePath: "M 74,147 C 76,148 77,148 79,146",
		mesialSlope: "M 77,148 C 76,148 74,147 74,145 C 76,146 77,147 77,148 Z",
		distalSlope: "M 77,148 C 79,146 81,144 81,142 C 80,144 78,146 77,148 Z",
	},
];
