/**
 * Anatomical Cusp & Ridge Geometry for Upper First Premolar 14 (Wheeler Ch. 9)
 * Buccal projection:
 * 1. Single prominent buccal cusp (B) with unique hallmark: Mesial slope is LONGER than distal slope!
 * 2. Cusp peak is shifted slightly distal to center: (51.5, 152.0).
 * 3. Prominent buccal ridge and mesiobuccal/distobuccal developmental depressions.
 * 4. Lingual cusp silhouette (L) in background 2.5D depth.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth14CuspDef {
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

export const TOOTH14_CUSPS: readonly Tooth14CuspDef[] = [
	{
		id: "B",
		nameRu: "Щечный бугор (мезиальный скат длиннее дистального)",
		apex: { x: 51.5, y: 152.0 },
		ridgePath: "M 23.5,133.0 C 30.0,141.0 40.0,148.0 51.5,152.0 C 62.0,148.0 70.0,142.0 76.5,135.0",
		// Mesial slope: Longer (dx=28, dy=19, length=33.8px)
		mesialSlope:
			"M 51.5,152.0 C 40.0,148.0 30.0,141.0 23.5,133.0 C 22.0,123.0 24.5,115.0 31.5,115.0 C 37.0,125.0 44.0,138.0 51.5,152.0 Z",
		// Distal slope: Shorter (dx=25, dy=17, length=30.2px)
		distalSlope:
			"M 51.5,152.0 C 62.0,148.0 70.0,142.0 76.5,135.0 C 78.0,124.0 75.5,116.0 68.5,116.0 C 63.5,126.0 57.5,139.0 51.5,152.0 Z",
		buccalRidgePath: "M 51.5,152.0 C 51.2,138.0 51.0,126.0 51.0,114.0",
		buccalMesialSlope:
			"M 51.5,152.0 C 40.0,148.0 30.0,141.0 23.5,133.0 C 25.5,125.0 32.5,119.0 42.0,114.5 C 45.5,127.0 49.0,139.0 51.5,152.0 Z",
		buccalDistalSlope:
			"M 51.5,152.0 C 62.0,148.0 70.0,142.0 76.5,135.0 C 74.0,126.0 67.5,120.0 58.0,115.0 C 55.5,127.0 53.0,139.0 51.5,152.0 Z",
	},
	{
		id: "L",
		nameRu: "Нёбный бугор (глубина 2.5D)",
		apex: { x: 52.0, y: 147.5 },
		ridgePath: "M 41.0,145.0 C 46.0,147.0 52.0,147.5 57.0,147.0 C 61.0,145.0 61.0,145.0 61.0,145.0",
		mesialSlope: "M 52.0,147.5 C 46.0,147.0 41.0,145.0 41.0,143.0 C 45.0,144.0 49.0,145.0 52.0,147.5 Z",
		distalSlope: "M 52.0,147.5 C 57.0,147.0 61.0,145.0 61.0,143.0 C 58.0,144.0 54.0,145.0 52.0,147.5 Z",
	},
];
