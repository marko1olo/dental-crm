/**
 * Anatomical Cusp & Labial Ridge Geometry for Upper Canine 13 (Wheeler Ch. 8)
 * Features:
 * 1. Compact spear-shaped crown (width 47px).
 * 2. Canine Law: Mesial slope is SHORTER than distal slope! Cusp tip at (51.5, 153.5).
 * 3. Prominent labial ridge with mesiolabial and distolabial developmental depressions.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth13CuspDef {
	id: "C" | "L";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope: string;
	distalSlope: string;
	labialRidgePath?: string;
	labialMesialSlope?: string;
	labialDistalSlope?: string;
}

export const TOOTH13_CUSPS: readonly Tooth13CuspDef[] = [
	{
		id: "C",
		nameRu: "Рвущий бугор клыка (мезиальный скат короче дистального)",
		apex: { x: 51.5, y: 153.5 },
		ridgePath: "M 26.5,133.0 C 34.0,142.0 42.0,149.0 51.5,153.5 C 60.0,149.0 67.0,143.0 73.5,137.0",
		// Mesial slope: Shorter (dx=22, dy=16.5, length=27.5px)
		mesialSlope:
			"M 51.5,153.5 C 60.0,149.0 67.0,143.0 73.5,137.0 C 75.0,126.0 73.5,116.0 66.5,116.0 C 62.0,126.0 57.0,140.0 51.5,153.5 Z",
		// Distal slope: Longer (dx=25, dy=20.5, length=32.3px)
		distalSlope:
			"M 51.5,153.5 C 42.0,149.0 34.0,142.0 26.5,133.0 C 25.0,122.0 27.5,114.0 34.5,114.0 C 40.0,124.0 46.0,139.0 51.5,153.5 Z",
		labialRidgePath: "M 51.5,153.5 C 51.2,138.0 50.8,124.0 50.5,110.0",
		labialMesialSlope:
			"M 51.5,153.5 C 60.0,149.0 67.0,143.0 73.5,137.0 C 72.0,126.0 66.0,118.0 57.0,113.0 C 55.0,126.0 53.0,140.0 51.5,153.5 Z",
		labialDistalSlope:
			"M 51.5,153.5 C 42.0,149.0 34.0,142.0 26.5,133.0 C 28.0,123.0 35.0,117.0 44.0,113.0 C 46.5,126.0 49.0,140.0 51.5,153.5 Z",
	},
	{
		id: "L",
		nameRu: "Бугорок пояска (cingulum 2.5D глубина)",
		apex: { x: 50.5, y: 147.0 },
		ridgePath: "M 42.0,144.0 C 46.0,146.5 50.5,147.0 55.0,146.5 C 58.0,144.0 58.0,144.0 58.0,144.0",
		mesialSlope: "M 50.5,147.0 C 55.0,146.5 58.0,144.0 58.0,142.0 C 55.0,143.0 52.0,144.5 50.5,147.0 Z",
		distalSlope: "M 50.5,147.0 C 46.0,146.5 42.0,144.0 42.0,142.0 C 45.0,143.0 48.0,144.5 50.5,147.0 Z",
	},
];
