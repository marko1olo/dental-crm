/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary Second Molar (Tooth 17) 4 Cusps
 * 4-Cusp Occlusal Architecture: MB, ML, DB, DL (Carabelli-free, DL reduced).
 * Roots UP (Y: 10..74), Crown DOWN (Y: 74..151).
 * Mandate 8b: Strictly <= 120 lines.
 */

export interface Tooth17CuspDef {
	id: "MB" | "ML" | "DB" | "DL";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope?: string;
	distalSlope?: string;
	buccalRidgePath?: string;
	buccalMesialSlope?: string;
	buccalDistalSlope?: string;
}

export const TOOTH17_CUSPS: readonly Tooth17CuspDef[] = [
	{
		id: "MB",
		nameRu: "Мезиально-щечный",
		apex: { x: 28, y: 147 },
		ridgePath: "M 28,147 C 34,140 40,131 43,120",
		mesialSlope: "M 28,147 C 22,143 18,133 15,123 C 19,125 24,122 29,119 C 35,124 39,131 43,120 C 37,131 32,141 28,147 Z",
		distalSlope: "M 28,147 C 34,141 40,131 43,120 C 43,127 41,134 37,138 C 33,142 30,145 28,147 Z",
		buccalRidgePath: "M 28,147 C 28,135 27.5,119 27,96",
		buccalMesialSlope: "M 28,147 C 22,143 17,133 15,121 C 15,108 20,98 27,96 C 27.5,119 28,135 28,147 Z",
		buccalDistalSlope: "M 28,147 C 27.5,119 27,96 27,96 C 33,98 39,110 43,120 C 37,131 32,141 28,147 Z",
	},
	{
		id: "ML",
		nameRu: "Мезиально-нёбный (главный)",
		apex: { x: 38, y: 151 },
		ridgePath: "M 38,151 C 42,140 47,130 50,120",
		mesialSlope: "M 38,151 C 32,146 26,139 22,133 C 27,132 32,126 38,122 C 43,127 47,122 50,120 C 45,132 41,142 38,151 Z",
		distalSlope: "M 38,151 C 43,144 48,134 52,122 C 48,126 44,129 41,136 C 39,141 38,147 38,151 Z",
	},
	{
		id: "DB",
		nameRu: "Дистально-щечный",
		apex: { x: 72, y: 145 },
		ridgePath: "M 72,145 C 66,138 61,129 55,121",
		mesialSlope: "M 72,145 C 66,138 61,129 55,121 C 57,126 61,132 64,136 C 68,140 70,143 72,145 Z",
		distalSlope: "M 72,145 C 76,140 80,132 82,123 C 80,125 76,128 72,130 C 67,128 61,124 55,121 C 61,129 66,138 72,145 Z",
		buccalRidgePath: "M 72,145 C 72,133 72.5,119 73,96",
		buccalMesialSlope: "M 72,145 C 66,138 61,129 55,121 C 63,111 68,99 73,96 C 72.5,119 72,133 72,145 Z",
		buccalDistalSlope: "M 72,145 C 72.5,119 73,96 73,96 C 78,98 81,108 82,123 C 80,132 76,140 72,145 Z",
	},
	{
		id: "DL",
		nameRu: "Дистально-нёбный (редуцированный)",
		apex: { x: 64, y: 142 },
		ridgePath: "M 64,142 C 61,135 59,129 57,124",
		mesialSlope: "M 64,142 C 61,135 59,129 57,124 C 59,128 61,132 62,136 C 63,139 64,141 64,142 Z",
		distalSlope: "M 64,142 C 67,138 71,132 74,126 C 71,128 68,130 64,132 C 63,137 63.5,140 64,142 Z",
	},
] as const;
