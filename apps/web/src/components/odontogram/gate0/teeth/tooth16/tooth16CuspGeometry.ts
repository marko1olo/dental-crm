/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary First Molar (Tooth 16) 5 Cusps
 * Exact 5-Cusp Occlusal Architecture: MB, ML, DB, DL + Cusp of Carabelli.
 * Roots UP (Y: 10..74), Crown DOWN (Y: 74..153).
 * Mandate 8b: Strictly <= 120 lines.
 */

export interface Tooth16CuspDef {
	id: "MB" | "ML" | "DB" | "DL" | "Carabelli";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope?: string;
	distalSlope?: string;
	buccalRidgePath?: string;
	buccalMesialSlope?: string;
	buccalDistalSlope?: string;
}

export const TOOTH16_CUSPS: readonly Tooth16CuspDef[] = [
	{
		id: "MB",
		nameRu: "Мезиально-щечный",
		apex: { x: 26, y: 149 },
		ridgePath: "M 26,149 C 32,141 38,131 42,118",
		mesialSlope: "M 26,149 C 20,144 16,134 13,124 C 17,126 22,122 28,118 C 34,124 38,131 42,118 C 36,131 30,142 26,149 Z",
		distalSlope: "M 26,149 C 32,142 38,131 42,118 C 42,126 40,134 36,139 C 32,144 28,147 26,149 Z",
		buccalRidgePath: "M 26,149 C 26,136 25.5,118 25,96",
		buccalMesialSlope: "M 26,149 C 20,144 15,134 13,122 C 13,108 18,98 25,96 C 25.5,118 26,136 26,149 Z",
		buccalDistalSlope: "M 26,149 C 25.5,118 25,96 25,96 C 32,98 38,110 42,118 C 36,131 30,142 26,149 Z",
	},
	{
		id: "ML",
		nameRu: "Мезиально-нёбный (главный)",
		apex: { x: 34, y: 153 },
		ridgePath: "M 34,153 C 38,141 44,130 48,118",
		mesialSlope: "M 34,153 C 28,148 22,140 18,134 C 23,133 28,127 34,122 C 40,128 44,122 48,118 C 42,132 38,143 34,153 Z",
		distalSlope: "M 34,153 C 40,145 46,134 50,122 C 46,126 42,129 38,137 C 36,142 34,148 34,153 Z",
	},
	{
		id: "DB",
		nameRu: "Дистально-щечный",
		apex: { x: 74, y: 147 },
		ridgePath: "M 74,147 C 68,139 62,129 56,120",
		mesialSlope: "M 74,147 C 68,139 62,129 56,120 C 58,126 62,132 66,137 C 70,142 72,145 74,147 Z",
		distalSlope: "M 74,147 C 78,142 83,133 86,122 C 83,125 79,129 74,131 C 68,129 62,124 56,120 C 62,129 68,139 74,147 Z",
		buccalRidgePath: "M 74,147 C 74,134 74.5,118 75,96",
		buccalMesialSlope: "M 74,147 C 68,139 62,129 56,120 C 64,110 70,98 75,96 C 74.5,118 74,134 74,147 Z",
		buccalDistalSlope: "M 74,147 C 74.5,118 75,96 75,96 C 81,98 85,108 86,122 C 83,133 78,142 74,147 Z",
	},
	{
		id: "DL",
		nameRu: "Дистально-нёбный",
		apex: { x: 66, y: 145 },
		ridgePath: "M 66,145 C 63,137 60,130 58,124",
		mesialSlope: "M 66,145 C 63,137 60,130 58,124 C 60,128 62,133 64,138 C 65,141 66,144 66,145 Z",
		distalSlope: "M 66,145 C 70,140 74,133 77,126 C 74,128 70,131 66,134 C 65,139 65.5,142 66,145 Z",
	},
	{
		id: "Carabelli",
		nameRu: "Бугорок Карабелли",
		apex: { x: 18, y: 139 },
		ridgePath: "M 18,139 C 22,142 26,144 30,145",
		mesialSlope: "M 18,139 C 14,133 12,126 14,120 C 17,124 20,130 24,134 C 21,136 19,138 18,139 Z",
		distalSlope: "M 18,139 C 22,142 26,144 30,145 C 28,142 26,138 24,134 C 21,136 19,138 18,139 Z",
	},
] as const;
