/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular Second Premolar (Tooth 45) 3 Cusps
 * 3-Cusp Occlusal Architecture: 1 Massive Buccal (B), 2 Lingual (ML, DL).
 * Mandate 8b: Strictly <= 120 lines.
 */

export interface Tooth45CuspDef {
	id: "B" | "ML" | "DL";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope: string;
	distalSlope: string;
	buccalRidgePath?: string;
	buccalMesialSlope?: string;
	buccalDistalSlope?: string;
}

export const TOOTH45_CUSPS: readonly Tooth45CuspDef[] = [
	{
		id: "B",
		nameRu: "Щечный (массивный выпуклый)",
		apex: { x: 48, y: 18.0 },
		ridgePath: "M 48,18.0 C 48.5,20.0 49.0,21.8 49,23.5",
		mesialSlope:
			"M 48,18.0 C 38,19.0 28,21.5 20,24 C 24,28 32,30 40,30 C 44,28 47,26 49,23.5 C 48.5,21.5 48,19.5 48,18.0 Z",
		distalSlope:
			"M 48,18.0 C 58,19.0 68,21.5 76,24 C 72,28 64,30 56,30 C 53,28 50,26 49,23.5 C 48.5,21.5 48,19.5 48,18.0 Z",
		buccalRidgePath: "M 48,18.0 C 48.2,28.0 48.8,38.0 49.5,52.0",
		buccalMesialSlope:
			"M 48,18.0 C 38,19.0 26,23.0 14.0,38 C 13.0,46 14.5,50 17.0,53.5 C 26.0,54.5 38.0,53.5 49.5,52.0 C 48.8,38.0 48.2,28.0 48,18.0 Z",
		buccalDistalSlope:
			"M 48,18.0 C 58,19.0 70,23.0 86.0,38 C 87.0,46 85.5,50 83.0,53.5 C 74.0,54.5 62.0,53.5 49.5,52.0 C 48.8,38.0 48.2,28.0 48,18.0 Z",
	},
	{
		id: "ML",
		nameRu: "Медиально-язычный (крупный)",
		apex: { x: 33, y: 14.0 },
		ridgePath: "M 33,14.0 C 38,17.0 44,20.5 49,23.5",
		mesialSlope:
			"M 33,14.0 C 26,15.0 20.0,18.0 16.5,21.0 C 20,22.0 25.5,22.8 31,23.2 C 37,23.4 43,23.5 49,23.5 C 44,20.5 38,17.0 33,14.0 Z",
		distalSlope:
			"M 33,14.0 C 38,17.0 44,20.5 49,23.5 C 49.2,20.0 49.5,17.0 49.8,14.0 C 44,13.8 38.5,13.8 33,14.0 Z",
	},
	{
		id: "DL",
		nameRu: "Дистально-язычный (меньший)",
		apex: { x: 65, y: 15.0 },
		ridgePath: "M 65,15.0 C 60,17.8 54,20.8 49,23.5",
		mesialSlope:
			"M 65,15.0 C 60,17.8 54,20.8 49,23.5 C 49.2,20.0 49.5,17.0 49.8,14.0 C 55,14.2 60.0,14.5 65,15.0 Z",
		distalSlope:
			"M 65,15.0 C 72,16.0 78.0,19.0 81.5,22.0 C 78,22.8 73.0,23.2 68,23.4 C 62,23.5 55,23.5 49,23.5 C 54,20.8 60,17.8 65,15.0 Z",
	},
];
