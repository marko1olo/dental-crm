/**
 * Anatomical Incisal Edge & Angle Geometry for Upper Lateral Incisor 12 (Wheeler Ch. 7)
 * Features:
 * 1. Narrow delicate crown (width 42px).
 * 2. Mesio-incisal angle (right, towards 1.1): Sharp ~90° angle at (71.0, 151.0).
 * 3. Disto-incisal angle (left, towards 1.3): Distinctly, semi-lunarly rounded at (29.0, 146.0).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth12CuspDef {
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

export const TOOTH12_CUSPS: readonly Tooth12CuspDef[] = [
	{
		id: "I",
		nameRu: "Режущий край (острый мезиальный угол, скругленный дистальный)",
		apex: { x: 71.0, y: 151.0 },
		ridgePath: "M 29.0,146.0 C 33.0,148.5 45.0,150.0 50.0,150.5 C 60.0,151.0 67.0,151.0 71.0,151.0",
		// Mesial outline (sharp 90 deg corner towards 1.1)
		mesialSlope:
			"M 71.0,151.0 L 71.0,132.0 C 71.0,120.0 68.0,114.0 62.0,114.0 C 59.0,124.0 65.0,140.0 71.0,151.0 Z",
		// Distal outline (rounded semi-lunar corner towards 1.3)
		distalSlope:
			"M 71.0,151.0 C 60.0,151.0 45.0,150.0 29.0,146.0 C 27.5,135.0 30.5,120.0 37.0,114.0 C 42.0,124.0 56.0,140.0 71.0,151.0 Z",
		labialRidgePath: "M 50.0,150.5 C 50.0,136.0 50.0,124.0 50.0,112.0",
		labialMesialSlope:
			"M 71.0,151.0 L 71.0,132.0 C 70.0,122.0 64.0,116.0 55.0,113.0 C 54.0,126.0 52.0,140.0 50.0,150.5 Z",
		labialDistalSlope:
			"M 50.0,150.5 C 45.0,150.0 35.0,148.0 29.0,146.0 C 29.5,132.0 35.0,120.0 45.0,113.0 C 47.0,126.0 48.5,140.0 50.0,150.5 Z",
	},
	{
		id: "L",
		nameRu: "Бугорок пояска (cingulum 2.5D глубина)",
		apex: { x: 50.0, y: 144.0 },
		ridgePath: "M 42.0,142.0 C 46.0,144.0 50.0,144.0 54.0,144.0 C 58.0,142.0 58.0,142.0 58.0,142.0",
		mesialSlope: "M 50.0,144.0 C 54.0,144.0 58.0,142.0 58.0,140.0 C 55.0,141.0 52.0,142.0 50.0,144.0 Z",
		distalSlope: "M 50.0,144.0 C 46.0,144.0 42.0,142.0 42.0,140.0 C 45.0,141.0 48.0,142.0 50.0,144.0 Z",
	},
];
