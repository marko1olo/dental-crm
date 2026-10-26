/**
 * DENTE Dental CRM — Wheeler Ch. 10 Maxillary First Premolar (Tooth 14) 2 Cusps
 * Marked Buccal Dominance: Sharp Buccal Cusp (B) & Softer Palatal Cusp (P).
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
		nameRu: "Щечный (высокий острый)",
		apex: { x: 48.0, y: 151.5 },
		ridgePath: "M 48.0,151.5 L 48.0,138.0",
		mesialSlope:
			"M 48.0,151.5 C 41.0,148.0 34.0,144.0 28.0,137.0 C 34.0,135.0 41.0,136.0 48.0,138.0 Z",
		distalSlope:
			"M 48.0,151.5 C 54.0,148.0 62.0,143.0 68.0,136.0 C 62.0,135.0 55.0,136.0 48.0,138.0 Z",
		buccalRidgePath: "M 48.0,151.5 L 48.0,102.0",
		buccalMesialSlope:
			"M 48.0,151.5 C 42.0,150.0 34.0,145.0 25.0,136.0 C 23.5,124.0 24.0,112.0 25.0,102.0 C 33.0,104.0 41.0,103.0 48.0,102.0 Z",
		buccalDistalSlope:
			"M 48.0,151.5 C 54.0,150.0 64.0,144.0 74.0,134.0 C 76.0,124.0 75.5,112.0 75.0,102.0 C 67.0,104.0 57.0,103.0 48.0,102.0 Z",
	},
	{
		id: "P",
		nameRu: "Нёбный (меньший закругленный)",
		apex: { x: 54.0, y: 146.0 },
		ridgePath: "M 54.0,146.0 L 51.0,138.0",
		mesialSlope:
			"M 54.0,146.0 C 47.0,144.0 42.0,141.0 37.0,138.0 C 41.0,137.0 46.0,137.0 51.0,138.0 Z",
		distalSlope:
			"M 54.0,146.0 C 59.0,144.0 64.0,142.0 68.0,139.0 C 63.0,138.0 57.0,137.5 51.0,138.0 Z",
	},
];
