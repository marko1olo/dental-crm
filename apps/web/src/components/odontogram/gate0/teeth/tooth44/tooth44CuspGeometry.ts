/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular First Premolar (Tooth 44) 2 Cusps
 * Marked Oral Asymmetry: Dominant Buccal Cusp (B) & Non-functional Lingual Cusp (L).
 * Mandate 8b: Strictly <= 120 lines.
 */

export interface Tooth44CuspDef {
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

export const TOOTH44_CUSPS: readonly Tooth44CuspDef[] = [
	{
		id: "B",
		nameRu: "Щечный (высокий острый)",
		apex: { x: 48, y: 17.2 },
		ridgePath: "M 48,17.2 C 48.5,20.0 49.0,22.8 50,25.5",
		mesialSlope:
			"M 48,17.2 C 41,18.5 34,21.5 29,24.5 C 32,28 37,30 42,30 C 45,27 47,23 48,17.2 Z",
		distalSlope:
			"M 48,17.2 C 55,18.5 62,21.5 67,24.5 C 64,28 59,30 54,30 C 51,27 49,23 48,17.2 Z",
		buccalRidgePath: "M 48,17.2 C 48.5,28.0 49.0,38.0 49.5,52.0",
		buccalMesialSlope:
			"M 48,17.2 C 40,18.5 32,23.0 26.5,38 C 25.5,46 27.0,50 29.0,53.5 C 36.0,54.5 43.0,53.5 49.5,52.0 C 49.0,38.0 48.5,28.0 48,17.2 Z",
		buccalDistalSlope:
			"M 48,17.2 C 56,18.5 64,23.0 73.5,38 C 74.5,46 73.0,50 71.0,53.5 C 64.0,54.5 57.0,53.5 49.5,52.0 C 49.0,38.0 48.5,28.0 48,17.2 Z",
	},
	{
		id: "L",
		nameRu: "Язычный (рудиментарный низкий)",
		apex: { x: 50, y: 25.5 },
		ridgePath: "M 50,25.5 C 49.5,22.8 49.0,20.0 48,17.2",
		mesialSlope:
			"M 50,25.5 C 46,25.0 41,24.5 37,23.0 C 40,21.5 43,21.8 46,23.5 C 48,24.5 49,25.0 50,25.5 Z",
		distalSlope:
			"M 50,25.5 C 54,25.0 59,24.5 63,23.0 C 60,21.5 57,21.8 54,23.5 C 52,24.5 51,25.0 50,25.5 Z",
	},
];
