/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary First Molar (Tooth 16) 5 Cusps
 * Exact 5-Cusp Occlusal Architecture: MB, ML, DB, DL + Cusp of Carabelli.
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
		apex: { x: 26, y: 150 },
		ridgePath: "M 26,150 C 32,143 38,136 42,126",
		mesialSlope: "M 26,150 C 20,146 16,138 13,132 C 17,133 22,130 28,126 C 34,132 38,138 42,126 C 36,136 30,144 26,150 Z",
		distalSlope: "M 26,150 C 32,144 38,136 42,126 C 42,132 40,138 36,142 C 32,146 28,148 26,150 Z",
		buccalRidgePath: "M 26,150 C 26,140 25.5,128 25,116",
		buccalMesialSlope: "M 26,150 C 20,146 15,138 13,130 C 13,122 18,118 25,116 C 25.5,128 26,140 26,150 Z",
		buccalDistalSlope: "M 26,150 C 25.5,128 25,116 25,116 C 32,118 38,124 42,126 C 36,136 30,144 26,150 Z",
	},
	{
		id: "ML",
		nameRu: "Мезиально-нёбный (главный)",
		apex: { x: 34, y: 154 },
		ridgePath: "M 34,154 C 38,144 44,136 48,128",
		mesialSlope: "M 34,154 C 28,150 22,144 18,140 C 23,139 28,135 34,132 C 40,136 44,132 48,128 C 42,138 38,146 34,154 Z",
		distalSlope: "M 34,154 C 40,148 46,140 50,132 C 46,134 42,136 38,142 C 36,146 34,150 34,154 Z",
	},
	{
		id: "DB",
		nameRu: "Дистально-щечный",
		apex: { x: 74, y: 148 },
		ridgePath: "M 74,148 C 68,142 62,135 56,130",
		mesialSlope: "M 74,148 C 68,142 62,135 56,130 C 58,134 62,138 66,141 C 70,144 72,146 74,148 Z",
		distalSlope: "M 74,148 C 78,144 83,137 86,130 C 83,132 79,134 74,136 C 68,135 62,132 56,130 C 62,135 68,142 74,148 Z",
		buccalRidgePath: "M 74,148 C 74,138 74.5,128 75,116",
		buccalMesialSlope: "M 74,148 C 68,142 62,135 56,130 C 64,124 70,118 75,116 C 74.5,128 74,138 74,148 Z",
		buccalDistalSlope: "M 74,148 C 74.5,128 75,116 75,116 C 81,118 85,122 86,130 C 83,137 78,144 74,148 Z",
	},
	{
		id: "DL",
		nameRu: "Дистально-нёбный",
		apex: { x: 66, y: 146 },
		ridgePath: "M 66,146 C 63,140 60,135 58,132",
		mesialSlope: "M 66,146 C 63,140 60,135 58,132 C 60,135 62,138 64,141 C 65,143 66,145 66,146 Z",
		distalSlope: "M 66,146 C 70,142 74,137 77,133 C 74,134 70,136 66,138 C 65,142 65.5,144 66,146 Z",
	},
	{
		id: "Carabelli",
		nameRu: "Бугорок Карабелли",
		apex: { x: 18, y: 142 },
		ridgePath: "M 18,142 C 22,144 26,146 30,147",
		mesialSlope: "M 18,142 C 14,138 12,133 14,128 C 17,131 20,135 24,138 C 21,140 19,141 18,142 Z",
		distalSlope: "M 18,142 C 22,144 26,146 30,147 C 28,145 26,142 24,138 C 21,140 19,141 18,142 Z",
	},
] as const;
