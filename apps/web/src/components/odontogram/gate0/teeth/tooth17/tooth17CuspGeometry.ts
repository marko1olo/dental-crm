/**
 * Anatomical Cusp & Groove Geometry for Upper Right Second Molar 17 (Wheeler Ch. 12)
 * High-contrast asymmetry vs Tooth 16:
 * - MB cusp on the right (65.0, 149.0): dominant, higher.
 * - DB cusp on the left (32.0, 142.5): markedly smaller, lower (6.5px difference!), steep distal tilt leftward.
 * - Mesial slope shorter, distal slope sharp and sloping to the left.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth17CuspDef {
	id: "MB" | "DB" | "ML" | "DL";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope: string;
	distalSlope: string;
	buccalMesialSlope?: string;
	buccalDistalSlope?: string;
	buccalRidgePath?: string;
}

export const TOOTH17_CUSPS: readonly Tooth17CuspDef[] = [
	{
		id: "MB",
		nameRu: "Медиально-щечный бугор (доминирующий, справа)",
		apex: { x: 65.0, y: 149.0 },
		ridgePath: "M 47.0,140.0 C 53.0,146.0 60.0,149.0 65.0,149.0 C 72.0,148.0 78.0,142.0 82.5,136.0",
		mesialSlope:
			"M 65.0,149.0 C 72.0,148.0 78.0,142.0 82.5,136.0 C 80.5,124.0 77.0,118.0 70.0,118.0 C 66.0,128.0 64.0,138.0 65.0,149.0 Z",
		distalSlope:
			"M 65.0,149.0 C 60.0,149.0 53.0,146.0 47.0,140.0 C 47.0,126.0 52.0,118.0 57.0,118.0 C 61.0,126.0 63.5,138.0 65.0,149.0 Z",
		buccalRidgePath: "M 65.0,149.0 C 65.5,139.0 66.0,129.0 66.0,118.0",
		buccalMesialSlope:
			"M 65.0,149.0 C 72.0,148.0 78.0,142.0 82.5,136.0 C 80.0,126.0 75.0,120.0 66.0,118.0 C 66.0,129.0 65.5,139.0 65.0,149.0 Z",
		buccalDistalSlope:
			"M 65.0,149.0 C 65.5,139.0 66.0,129.0 66.0,118.0 C 58.0,118.0 52.0,124.0 47.0,140.0 C 53.0,146.0 60.0,149.0 65.0,149.0 Z",
	},
	{
		id: "DB",
		nameRu: "Дистально-щечный бугор (заметно редуцирован, слева)",
		apex: { x: 32.0, y: 142.5 },
		ridgePath: "M 17.5,134.0 C 22.0,139.0 27.0,142.0 32.0,142.5 C 38.0,142.0 42.5,141.0 47.0,140.0",
		mesialSlope:
			"M 32.0,142.5 C 38.0,142.0 42.5,141.0 47.0,140.0 C 47.0,126.0 42.0,118.0 37.0,118.0 C 34.0,124.0 32.5,134.0 32.0,142.5 Z",
		distalSlope:
			"M 32.0,142.5 C 27.0,142.0 22.0,139.0 17.5,134.0 C 18.0,124.0 22.0,118.0 27.0,118.0 C 29.5,124.0 31.0,134.0 32.0,142.5 Z",
		buccalRidgePath: "M 32.0,142.5 C 32.5,134.0 33.0,126.0 33.5,118.0",
		buccalMesialSlope:
			"M 32.0,142.5 C 33.0,126.0 33.5,118.0 33.5,118.0 C 38.0,118.0 43.0,124.0 47.0,140.0 C 42.5,141.0 38.0,142.0 32.0,142.5 Z",
		buccalDistalSlope:
			"M 32.0,142.5 C 27.0,142.0 22.0,139.0 17.5,134.0 C 19.0,126.0 24.0,120.0 33.5,118.0 C 33.0,126.0 32.5,134.0 32.0,142.5 Z",
	},
	{
		id: "ML",
		nameRu: "Медиально-язычный бугор (глубина 2.5D)",
		apex: { x: 62.0, y: 145.0 },
		ridgePath: "M 52.0,142.0 C 57.0,144.5 62.0,145.0 67.0,144.0 C 72.0,142.0 74.0,141.0 74.0,141.0",
		mesialSlope: "M 62.0,145.0 C 67.0,144.0 72.0,142.0 74.0,141.0 C 71.0,138.0 65.0,139.0 62.0,145.0 Z",
		distalSlope: "M 62.0,145.0 C 57.0,144.5 52.0,142.0 52.0,140.0 C 56.0,140.0 60.0,141.0 62.0,145.0 Z",
	},
	{
		id: "DL",
		nameRu: "Дистально-язычный бугор (сильно редуцирован 2.5D)",
		apex: { x: 30.0, y: 139.0 },
		ridgePath: "M 22.0,136.0 C 26.0,138.0 30.0,139.0 34.0,138.5 C 38.0,137.0 40.0,136.0 40.0,136.0",
		mesialSlope: "M 30.0,139.0 C 34.0,138.5 38.0,137.0 40.0,136.0 C 37.0,134.0 32.0,135.0 30.0,139.0 Z",
		distalSlope: "M 30.0,139.0 C 26.0,138.0 22.0,136.0 22.0,134.0 C 25.0,134.0 28.0,135.0 30.0,139.0 Z",
	},
];
