/**
 * DENTE Dental CRM — Wheeler Ch. 10 Maxillary First Premolar (Tooth 14) 2 Cusps
 * Marked Buccal Dominance: Sharp Buccal Cusp (B, mesial slope longer!) & Softer Palatal Cusp (P).
 * Mandate 8b: Strictly <= 120 lines.
 */

export interface Tooth14CuspDef {
	id: "B" | "P";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope: string;
	distalSlope: string;
	buccalRidgePath?: string;
	buccalMesialSlope?: string;
	buccalDistalSlope?: string;
}

export const TOOTH14_CUSPS: readonly Tooth14CuspDef[] = [
	{
		id: "B",
		nameRu: "Щечный (острый доминантный)",
		apex: { x: 51.5, y: 146.0 },
		ridgePath: "M 51.5,146.0 L 51.0,126.0",
		mesialSlope:
			"M 51.5,146.0 C 44.0,142.0 36.0,137.0 29.0,130.0 C 35.0,127.0 43.0,128.0 51.0,129.0 Z",
		distalSlope:
			"M 51.5,146.0 C 57.0,142.0 64.0,136.0 70.0,129.0 C 64.0,127.5 57.0,128.0 51.0,129.0 Z",
		buccalRidgePath: "M 51.5,146.0 C 51.5,124.0 51.0,102.0 50.0,82.0",
		buccalMesialSlope:
			"M 51.5,146.0 C 44.0,143.0 35.0,138.0 24.5,126.0 C 23.0,112.0 23.5,96.0 24.5,82.0 C 33.0,84.0 42.0,83.0 50.0,82.0 Z",
		buccalDistalSlope:
			"M 51.5,146.0 C 58.0,143.0 67.0,136.0 75.0,125.0 C 76.5,112.0 76.0,96.0 75.0,82.0 C 67.0,84.0 58.0,83.0 50.0,82.0 Z",
	},
	{
		id: "P",
		nameRu: "Нёбный (меньший закругленный)",
		apex: { x: 47.0, y: 140.5 },
		ridgePath: "M 47.0,140.5 L 48.0,126.0",
		mesialSlope:
			"M 47.0,140.5 C 41.0,138.0 37.0,134.0 33.0,130.0 C 37.0,128.5 42.0,128.0 48.0,129.0 Z",
		distalSlope:
			"M 47.0,140.5 C 52.0,138.0 57.0,135.0 62.0,131.0 C 58.0,129.5 53.0,128.5 48.0,129.0 Z",
	},
];
