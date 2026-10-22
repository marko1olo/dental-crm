export interface Tooth46CuspDef {
	id: "MB" | "DB" | "D" | "ML" | "DL";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope: string;
	distalSlope: string;
	buccalRidgePath?: string;
	buccalMesialSlope?: string;
	buccalDistalSlope?: string;
}

export const TOOTH46_CUSPS: readonly Tooth46CuspDef[] = [
	{
		id: "MB",
		nameRu: "Медиально-щечный",
		apex: { x: 24, y: 18 },
		ridgePath: "M 24,18 C 28,19.2 33,20.5 38,22",
		mesialSlope:
			"M 24,18 C 19.5,16.5 15.5,19 14,24 C 18,24.8 23,23.5 28,20.5 C 32,21 35,21.5 38,22 C 33,20.5 28,19.2 24,18 Z",
		distalSlope:
			"M 24,18 C 28,19.2 33,20.5 38,22 C 37,24.5 33,25.5 29,24 C 26.5,22 25,20 24,18 Z",
		buccalRidgePath: "M 24,18 C 23.5,28 22.8,40 22,54",
		buccalMesialSlope:
			"M 24,18 C 23.5,28 22.8,40 22,54 C 18,50 14.5,38 14,24 C 15.5,19 19.5,16.5 24,18 Z",
		buccalDistalSlope:
			"M 24,18 C 23.5,28 22.8,40 22,54 C 28,52 33,42 35.5,34 C 38,22 33,20.5 24,18 Z",
	},
	{
		id: "DB",
		nameRu: "Дистально-щечный",
		apex: { x: 50, y: 18 },
		ridgePath: "M 50,18 C 50.4,19.5 50.8,20.8 51,21.8",
		mesialSlope:
			"M 50,18 C 46,19 42,20.5 38,22 C 42,22 47,21.8 51,21.8 C 50.8,20.8 50.4,19.5 50,18 Z",
		distalSlope:
			"M 50,18 C 50.4,19.5 50.8,20.8 51,21.8 C 55,21.8 59,22 62,22 C 58,20.5 54,19 50,18 Z",
		buccalRidgePath: "M 50,18 C 50,28 49.6,40 49,56",
		buccalMesialSlope:
			"M 50,18 C 50,28 49.6,40 49,56 C 41,52 36.5,42 35.5,34 C 41.5,20.8 45.5,19 50,18 Z",
		buccalDistalSlope:
			"M 50,18 C 50,28 49.6,40 49,56 C 57,52 61.5,42 62.5,34 C 57.5,20.8 53.5,19 50,18 Z",
	},
	{
		id: "D",
		nameRu: "Дистальный",
		apex: { x: 74, y: 22 },
		ridgePath: "M 74,22 C 70,22 66,22 62,22",
		mesialSlope: "M 74,22 C 70,22 66,22 62,22 C 65,23.8 69,24.2 74,22 Z",
		distalSlope:
			"M 74,22 C 77.5,21.5 81.5,24 83.5,27.5 C 79,27 75,25 72,21.5 C 69,21.8 65,22 62,22 C 66,22 70,22 74,22 Z",
		buccalRidgePath: "M 74,22 C 74.8,30 75.4,42 76,54",
		buccalMesialSlope:
			"M 74,22 C 74.8,30 75.4,42 76,54 C 69.5,52 64.5,42 62.5,34 C 66,22 70,22 74,22 Z",
		buccalDistalSlope:
			"M 74,22 C 74.8,30 75.4,42 76,54 C 81,50 83.8,38 83.5,27.5 C 81.5,24 77.5,21.5 74,22 Z",
	},
	{
		id: "ML",
		nameRu: "Медиально-язычный",
		apex: { x: 30, y: 11 },
		ridgePath: "M 30,11 C 33,14 36,17.5 38,20.5",
		mesialSlope:
			"M 30,11 C 25,12 20.5,14 17.5,17.5 C 21,18.5 24.5,19.5 28,20.5 C 31,20.5 35,20.5 38,20.5 C 36,17.5 33,14 30,11 Z",
		distalSlope:
			"M 30,11 C 33,14 36,17.5 38,20.5 C 42,21 47,21.5 51,21.8 C 50,18 49,15 48,12 C 41,11 34.5,11 30,11 Z",
	},
	{
		id: "DL",
		nameRu: "Дистально-язычный",
		apex: { x: 62, y: 12 },
		ridgePath: "M 62,12 C 59,15 56,18.5 54,21.5",
		mesialSlope:
			"M 62,12 C 57.5,12 52.5,12 48,12 C 49,15 50,18 51,21.8 C 52,21.8 53,21.6 54,21.5 C 56,18.5 59,15 62,12 Z",
		distalSlope:
			"M 62,12 C 65.8,13 70.5,16 73.5,19.5 C 73,20.5 72.5,21 72,21.5 C 68,22 64,22 62,22 C 59,21.8 56,21.6 54,21.5 C 56,18.5 59,15 62,12 Z",
	},
];
