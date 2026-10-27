/**
 * Anatomical Incisal Edge & Angle Geometry for Upper Central Incisor 11 (Wheeler Ch. 6)
 * Features:
 * 1. Proportional aesthetic crown (width 50px, golden ratio, not an oversized spade).
 * 2. Mesio-incisal angle (right, facial midline): Strict 90° right angle at (75.0, 153.0).
 * 3. Disto-incisal angle (left, towards 1.2): Slightly rounded angle at (25.0, 151.0).
 * 4. Mamelon developmental grooves on labial face.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth11CuspDef {
	id: "I" | "L";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope: string;
	distalSlope: string;
	labialRidgePath?: string;
	labialMesialSlope?: string;
	labialDistalSlope?: string;
}

export const TOOTH11_CUSPS: readonly Tooth11CuspDef[] = [
	{
		id: "I",
		nameRu: "Режущий край (строгий 90° мезиальный угол, слегка скругленный дистальный)",
		apex: { x: 75.0, y: 153.0 },
		ridgePath: "M 25.0,151.0 C 30.0,152.0 45.0,152.5 50.0,152.5 C 60.0,152.5 70.0,153.0 75.0,153.0",
		// Mesial straight edge (in line with dental midline)
		mesialSlope:
			"M 75.0,153.0 L 75.0,132.0 C 75.0,118.0 72.0,112.0 64.0,112.0 C 60.0,122.0 67.0,140.0 75.0,153.0 Z",
		// Distal outline (slightly rounded corner)
		distalSlope:
			"M 75.0,153.0 C 60.0,152.5 45.0,152.0 25.0,151.0 C 24.0,138.0 27.0,122.0 36.0,112.0 C 42.0,122.0 58.0,140.0 75.0,153.0 Z",
		labialRidgePath: "M 50.0,152.5 C 50.0,138.0 50.0,124.0 50.0,110.0",
		labialMesialSlope:
			"M 75.0,153.0 L 75.0,132.0 C 74.0,120.0 68.0,114.0 58.0,112.0 C 56.0,126.0 53.0,140.0 50.0,152.5 Z",
		labialDistalSlope:
			"M 50.0,152.5 C 45.0,152.0 32.0,151.5 25.0,151.0 C 26.0,134.0 32.0,120.0 42.0,112.0 C 45.0,126.0 48.0,140.0 50.0,152.5 Z",
	},
	{
		id: "L",
		nameRu: "Бугорок пояска (cingulum 2.5D глубина)",
		apex: { x: 50.0, y: 145.0 },
		ridgePath: "M 40.0,143.0 C 45.0,145.0 50.0,145.0 55.0,145.0 C 60.0,143.0 60.0,143.0 60.0,143.0",
		mesialSlope: "M 50.0,145.0 C 55.0,145.0 60.0,143.0 60.0,141.0 C 56.0,142.0 53.0,143.0 50.0,145.0 Z",
		distalSlope: "M 50.0,145.0 C 45.0,145.0 40.0,143.0 40.0,141.0 C 44.0,142.0 47.0,143.0 50.0,145.0 Z",
	},
];
