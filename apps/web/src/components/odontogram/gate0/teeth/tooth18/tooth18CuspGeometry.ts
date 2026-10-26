/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary Third Molar (Tooth 18) 3 Cusps
 * Tricuspid Heart-Shaped Crown: MB, DB, Lingual (ZERO Cusp of Carabelli).
 * Mandate 8b: Strictly <= 120 lines.
 */

export interface Tooth18CuspDef {
	id: "MB" | "DB" | "Lingual";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope?: string;
	distalSlope?: string;
	buccalRidgePath?: string;
	buccalMesialSlope?: string;
	buccalDistalSlope?: string;
}

export const TOOTH18_CUSPS: readonly Tooth18CuspDef[] = [
	{
		id: "MB",
		nameRu: "Мезиально-щечный",
		apex: { x: 30, y: 148 },
		ridgePath: "M 30,148 C 36,141 42,135 46,126",
		mesialSlope: "M 30,148 C 24,144 20,137 17,130 C 21,131 26,129 32,125 C 38,131 42,137 46,126 C 40,135 34,143 30,148 Z",
		distalSlope: "M 30,148 C 36,142 42,135 46,126 C 46,132 44,137 40,141 C 36,145 32,147 30,148 Z",
		buccalRidgePath: "M 30,148 C 30,138 29.5,127 29,115",
		buccalMesialSlope: "M 30,148 C 24,144 19,136 17,128 C 17,120 22,116 29,115 C 29.5,127 30,138 30,148 Z",
		buccalDistalSlope: "M 30,148 C 29.5,127 29,115 29,115 C 36,117 42,123 46,126 C 40,135 34,143 30,148 Z",
	},
	{
		id: "DB",
		nameRu: "Дистально-щечный",
		apex: { x: 70, y: 146 },
		ridgePath: "M 70,146 C 64,140 58,134 54,129",
		mesialSlope: "M 70,146 C 64,140 58,134 54,129 C 56,133 60,137 63,139 C 67,142 69,144 70,146 Z",
		distalSlope: "M 70,146 C 74,142 78,135 80,128 C 77,130 73,132 70,134 C 64,133 59,130 54,129 C 59,134 64,140 70,146 Z",
		buccalRidgePath: "M 70,146 C 70,136 70.5,126 71,115",
		buccalMesialSlope: "M 70,146 C 64,140 58,134 54,129 C 61,123 67,117 71,115 C 70.5,126 70,136 70,146 Z",
		buccalDistalSlope: "M 70,146 C 70.5,126 71,115 71,115 C 76,117 79,120 80,128 C 77,135 73,142 70,146 Z",
	},
	{
		id: "Lingual",
		nameRu: "Слитый нёбный",
		apex: { x: 48, y: 152 },
		ridgePath: "M 48,152 C 48,144 49,136 50,128",
		mesialSlope: "M 48,152 C 41,148 35,142 30,138 C 36,137 42,133 48,130 C 50,134 50,131 50,128 C 48,138 48,145 48,152 Z",
		distalSlope: "M 48,152 C 54,147 60,140 64,132 C 60,134 56,135 52,141 C 50,145 48,149 48,152 Z",
	},
] as const;
