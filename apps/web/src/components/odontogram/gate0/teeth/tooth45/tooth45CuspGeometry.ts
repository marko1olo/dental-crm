/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular Second Premolar (Tooth 45) 3 Cusps
 * Wheeler 3-cusp type: 1 dominant Buccal, 2 Lingual (ML > DL).
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
		nameRu: "Щечный (доминантный широкий)",
		apex: { x: 49.5, y: 18.0 },
		ridgePath: "M 49.5,18.0 L 49.5,23.5",
		mesialSlope:
			"M 49.5,18.0 C 43.0,19.0 37.0,21.0 32.0,23.0 C 35.0,26.5 40.0,27.5 44.5,27.0 C 47.0,25.0 48.5,22.0 49.5,18.0 Z",
		distalSlope:
			"M 49.5,18.0 C 56.0,19.0 62.0,21.0 67.0,23.0 C 64.0,26.5 59.0,27.5 54.5,27.0 C 52.0,25.0 50.5,22.0 49.5,18.0 Z",
		buccalRidgePath: "M 49.5,18.0 C 49.8,28.0 50.0,38.0 50.5,52.0",
		buccalMesialSlope:
			"M 49.5,18.0 C 41.0,19.0 32.0,23.0 25.5,38.0 C 24.5,46.0 26.0,50.0 28.0,53.5 C 36.0,54.5 43.0,53.5 50.5,52.0 C 50.0,38.0 49.8,28.0 49.5,18.0 Z",
		buccalDistalSlope:
			"M 49.5,18.0 C 58.0,19.0 67.0,23.0 74.5,38.0 C 75.5,46.0 74.0,50.0 72.0,53.5 C 64.0,54.5 57.0,53.5 50.5,52.0 C 50.0,38.0 49.8,28.0 49.5,18.0 Z",
	},
	{
		id: "ML",
		nameRu: "Мезиолингвальный (крупный)",
		apex: { x: 38.0, y: 26.0 },
		ridgePath: "M 38.0,26.0 C 41.5,25.0 45.5,24.2 49.5,23.5",
		mesialSlope:
			"M 38.0,26.0 C 35.0,25.0 31.0,24.0 28.0,23.0 C 31.0,22.0 34.0,22.5 38.0,23.0 C 39.5,24.0 40.5,25.0 38.0,26.0 Z",
		distalSlope:
			"M 38.0,26.0 C 41.5,27.0 45.0,28.0 49.5,29.0 C 49.5,26.5 49.5,24.5 49.5,23.5 C 45.5,24.2 41.5,25.0 38.0,26.0 Z",
	},
	{
		id: "DL",
		nameRu: "Дистолингвальный (меньший)",
		apex: { x: 58.0, y: 27.0 },
		ridgePath: "M 58.0,27.0 C 55.0,25.8 52.0,24.5 49.5,23.5",
		mesialSlope:
			"M 58.0,27.0 C 55.0,28.0 52.0,28.5 49.5,29.0 C 49.5,26.5 49.5,24.5 49.5,23.5 C 52.0,24.5 55.0,25.8 58.0,27.0 Z",
		distalSlope:
			"M 58.0,27.0 C 61.5,26.0 65.5,24.5 69.0,23.0 C 66.0,22.0 62.5,22.5 59.0,23.0 C 58.0,24.5 57.5,25.5 58.0,27.0 Z",
	},
];
