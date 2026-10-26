/**
 * DENTE Dental CRM — Wheeler Ch. 10 Maxillary Second Premolar (Tooth 15) 2 Cusps
 * Rounded Anatomy & Equal Height Cusps: Buccal (B) & Palatal (P).
 * Mandate 8b: Strictly <= 120 lines.
 */

export interface Tooth15CuspDef {
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

export const TOOTH15_CUSPS: readonly Tooth15CuspDef[] = [
	{
		id: "B",
		nameRu: "Щечный (округлый)",
		apex: { x: 48.5, y: 150.0 },
		ridgePath: "M 48.5,150.0 L 49.5,138.0",
		mesialSlope:
			"M 48.5,150.0 C 42.0,147.0 35.0,143.0 30.0,137.0 C 36.0,136.0 42.0,137.0 48.5,138.0 Z",
		distalSlope:
			"M 48.5,150.0 C 55.0,147.0 61.0,143.0 66.0,137.0 C 60.0,136.0 54.0,137.0 48.5,138.0 Z",
		buccalRidgePath: "M 48.5,150.0 L 49.0,102.0",
		buccalMesialSlope:
			"M 48.5,150.0 C 43.0,149.0 35.0,145.0 26.0,135.0 C 24.5,123.0 24.5,111.0 25.0,102.0 C 33.0,104.0 41.0,103.0 49.0,102.0 Z",
		buccalDistalSlope:
			"M 48.5,150.0 C 54.0,149.0 63.0,144.0 73.0,134.0 C 75.0,123.0 75.0,111.0 75.0,102.0 C 67.0,104.0 57.0,103.0 49.0,102.0 Z",
	},
	{
		id: "P",
		nameRu: "Нёбный (равновысокий)",
		apex: { x: 51.5, y: 149.8 },
		ridgePath: "M 51.5,149.8 L 50.5,138.0",
		mesialSlope:
			"M 51.5,149.8 C 45.0,146.0 39.0,142.0 35.0,138.0 C 40.0,137.0 45.0,137.0 50.5,138.0 Z",
		distalSlope:
			"M 51.5,149.8 C 57.0,146.0 63.0,142.0 67.0,138.0 C 62.0,137.0 56.0,137.0 50.5,138.0 Z",
	},
];
