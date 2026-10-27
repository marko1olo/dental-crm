/**
 * DENTE Dental CRM — Wheeler Ch. 10 Maxillary Second Premolar (Tooth 15) 2 Cusps
 * Balanced Occlusal Equilibrium: Equal Height Buccal (B) & Palatal (P) Cusps.
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
		nameRu: "Щечный (равновеликий)",
		apex: { x: 49.0, y: 145.0 },
		ridgePath: "M 49.0,145.0 L 49.0,126.0",
		mesialSlope:
			"M 49.0,145.0 C 43.0,141.5 36.0,136.0 30.0,129.0 C 36.0,127.5 42.0,128.0 49.0,129.0 Z",
		distalSlope:
			"M 49.0,145.0 C 55.0,141.5 62.0,136.0 68.0,129.0 C 62.0,127.5 56.0,128.0 49.0,129.0 Z",
		buccalRidgePath: "M 49.0,145.0 C 49.0,124.0 49.5,102.0 50.0,82.0",
		buccalMesialSlope:
			"M 49.0,145.0 C 42.5,142.0 34.0,136.0 24.5,125.0 C 23.5,112.0 23.8,96.0 24.5,82.0 C 33.0,84.0 42.0,83.0 50.0,82.0 Z",
		buccalDistalSlope:
			"M 49.0,145.0 C 56.0,142.0 65.0,136.0 74.5,125.0 C 76.0,112.0 75.8,96.0 75.0,82.0 C 67.0,84.0 58.0,83.0 50.0,82.0 Z",
	},
	{
		id: "P",
		nameRu: "Нёбный (равновеликий)",
		apex: { x: 51.5, y: 144.8 },
		ridgePath: "M 51.5,144.8 L 51.0,126.0",
		mesialSlope:
			"M 51.5,144.8 C 45.0,142.0 40.0,138.0 35.0,132.0 C 39.5,130.0 45.0,129.0 51.0,129.0 Z",
		distalSlope:
			"M 51.5,144.8 C 57.0,142.0 62.0,138.0 66.0,133.0 C 62.0,131.0 57.0,130.0 51.0,129.0 Z",
	},
];
