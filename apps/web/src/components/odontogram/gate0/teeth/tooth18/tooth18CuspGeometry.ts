/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary Third Molar (Tooth 18) 3 Cusps
 * Tricuspid Heart-Shaped Crown: MB, DB, Lingual (ZERO Cusp of Carabelli).
 * Roots UP (Y: 18..74), Crown DOWN (Y: 74..149).
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
		apex: { x: 30, y: 146 },
		ridgePath: "M 30,146 C 36,139 42,131 46,122",
		mesialSlope: "M 30,146 C 24,142 20,133 17,124 C 21,126 26,123 32,120 C 38,125 42,131 46,122 C 40,131 34,140 30,146 Z",
		distalSlope: "M 30,146 C 36,140 42,131 46,122 C 46,128 44,134 40,138 C 36,142 32,144 30,146 Z",
		buccalRidgePath: "M 30,146 C 30,134 29.5,119 29,96",
		buccalMesialSlope: "M 30,146 C 24,142 19,132 17,122 C 17,110 22,99 29,96 C 29.5,119 30,134 30,146 Z",
		buccalDistalSlope: "M 30,146 C 29.5,119 29,96 29,96 C 36,98 42,110 46,122 C 40,131 34,140 30,146 Z",
	},
	{
		id: "DB",
		nameRu: "Дистально-щечный",
		apex: { x: 70, y: 144 },
		ridgePath: "M 70,144 C 64,137 58,129 54,122",
		mesialSlope: "M 70,144 C 64,137 58,129 54,122 C 56,126 60,132 63,136 C 67,140 69,142 70,144 Z",
		distalSlope: "M 70,144 C 74,139 78,131 80,123 C 77,125 73,128 70,130 C 64,128 59,124 54,122 C 59,128 64,137 70,144 Z",
		buccalRidgePath: "M 70,144 C 70,133 70.5,119 71,96",
		buccalMesialSlope: "M 70,144 C 64,137 58,129 54,122 C 61,112 67,100 71,96 C 70.5,119 70,133 70,144 Z",
		buccalDistalSlope: "M 70,144 C 70.5,119 71,96 71,96 C 76,98 79,108 80,123 C 77,132 73,139 70,144 Z",
	},
	{
		id: "Lingual",
		nameRu: "Слитый нёбный",
		apex: { x: 48, y: 149 },
		ridgePath: "M 48,149 C 48,139 49,129 50,120",
		mesialSlope: "M 48,149 C 41,144 35,138 30,132 C 36,131 42,126 48,122 C 50,127 50,123 50,120 C 48,132 48,141 48,149 Z",
		distalSlope: "M 48,149 C 54,143 60,135 64,126 C 60,128 56,130 52,137 C 50,141 48,146 48,149 Z",
	},
] as const;
