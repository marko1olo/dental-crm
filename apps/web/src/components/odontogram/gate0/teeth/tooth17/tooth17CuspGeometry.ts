/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary Second Molar (Tooth 17) 4 Cusps
 * Exact 4-Cusp Occlusal Architecture: MB, ML, DB, DL (ZERO Cusp of Carabelli).
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
		apex: { x: 28, y: 149 },
		ridgePath: "M 28,149 C 34,142 40,136 44,126",
		mesialSlope: "M 28,149 C 22,145 18,138 15,131 C 19,132 24,130 30,126 C 36,132 40,138 44,126 C 38,136 32,144 28,149 Z",
		distalSlope: "M 28,149 C 34,143 40,136 44,126 C 44,132 42,138 38,142 C 34,146 30,148 28,149 Z",
		buccalRidgePath: "M 28,149 C 28,139 27.5,127 27,115",
		buccalMesialSlope: "M 28,149 C 22,145 17,137 15,129 C 15,121 20,117 27,115 C 27.5,127 28,139 28,149 Z",
		buccalDistalSlope: "M 28,149 C 27.5,127 27,115 27,115 C 34,117 40,123 44,126 C 38,136 32,144 28,149 Z",
	},
	{
		id: "ML",
		nameRu: "Мезиально-нёбный",
		apex: { x: 36, y: 153 },
		ridgePath: "M 36,153 C 40,143 45,136 49,128",
		mesialSlope: "M 36,153 C 30,149 24,143 20,139 C 25,138 30,134 36,131 C 42,135 46,131 49,128 C 43,137 39,145 36,153 Z",
		distalSlope: "M 36,153 C 42,147 48,139 52,131 C 48,133 44,135 40,141 C 38,145 36,149 36,153 Z",
	},
	{
		id: "DB",
		nameRu: "Дистально-щечный",
		apex: { x: 72, y: 147 },
		ridgePath: "M 72,147 C 66,141 61,135 56,130",
		mesialSlope: "M 72,147 C 66,141 61,135 56,130 C 58,134 62,138 65,140 C 69,143 71,145 72,147 Z",
		distalSlope: "M 72,147 C 76,143 81,136 83,129 C 80,131 76,133 72,135 C 66,134 61,131 56,130 C 61,135 66,141 72,147 Z",
		buccalRidgePath: "M 72,147 C 72,137 72.5,127 73,115",
		buccalMesialSlope: "M 72,147 C 66,141 61,135 56,130 C 63,124 69,117 73,115 C 72.5,127 72,137 72,147 Z",
		buccalDistalSlope: "M 72,147 C 72.5,127 73,115 73,115 C 78,117 82,121 83,129 C 80,136 76,143 72,147 Z",
	},
	{
		id: "DL",
		nameRu: "Дистально-нёбный (редуцирован)",
		apex: { x: 64, y: 144 },
		ridgePath: "M 64,144 C 61,139 58,135 57,132",
		mesialSlope: "M 64,144 C 61,139 58,135 57,132 C 59,134 61,137 63,139 C 63.5,141 64,143 64,144 Z",
		distalSlope: "M 64,144 C 68,140 71,136 74,132 C 71,133 67,135 64,137 C 63.5,141 64,143 64,144 Z",
	},
] as const;
