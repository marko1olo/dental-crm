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
		apex: { x: 47, y: 17.2 },
		ridgePath: "M 47,17.2 C 48.0,20.0 49.0,22.8 50,25.5",
		mesialSlope:
			"M 47,17.2 C 37,18.5 27,21.5 20,24.5 C 24,28 31,30 38,30 C 42,27 45,23 47,17.2 Z",
		distalSlope:
			"M 47,17.2 C 57,18.5 67,21.5 74,24.5 C 70,28 63,30 56,30 C 52,27 49,23 47,17.2 Z",
		buccalRidgePath: "M 47,17.2 C 47.5,28.0 48.0,38.0 48.8,52.0",
		buccalMesialSlope:
			"M 47,17.2 C 37,18.5 26,23.0 15.0,38 C 14.0,46 15.5,50 18.0,53.5 C 27.0,54.5 38.0,53.5 48.8,52.0 C 48.0,38.0 47.5,28.0 47,17.2 Z",
		buccalDistalSlope:
			"M 47,17.2 C 57,18.5 68,23.0 85.0,38 C 86.0,46 84.5,50 82.0,53.5 C 73.0,54.5 61.0,53.5 48.8,52.0 C 48.0,38.0 47.5,28.0 47,17.2 Z",
	},
	{
		id: "L",
		nameRu: "Язычный (рудиментарный низкий)",
		apex: { x: 50, y: 25.5 },
		ridgePath: "M 50,25.5 C 49.0,22.8 48.0,20.0 47,17.2",
		mesialSlope:
			"M 50,25.5 C 44,25.0 38,24.5 32,23.0 C 36,21.5 41,21.8 45,23.5 C 47,24.5 48.5,25.0 50,25.5 Z",
		distalSlope:
			"M 50,25.5 C 56,25.0 62,24.5 68,23.0 C 64,21.5 59,21.8 55,23.5 C 53,24.5 51.5,25.0 50,25.5 Z",
	},
];
