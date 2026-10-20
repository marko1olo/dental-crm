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
		ridgePath: "M 24,18 C 27.5,19.2 32.5,20.5 38,22",
		mesialSlope:
			"M 24,18 C 19.5,16.5 15.5,19 14,24 C 17.5,25.5 21.5,24.5 24,21 C 25,19.5 24.8,18.5 24,18 Z",
		distalSlope:
			"M 24,18 C 27.5,19.2 32.5,20.5 38,22 C 36.5,27 34,30 31,28 C 27.5,24.5 25,20.5 24,18 Z",
		buccalRidgePath: "M 24,18 C 23.5,28 22.8,42 22,58",
		buccalMesialSlope:
			"M 24,18 C 23.5,28 22.8,42 22,58 C 17,54 13.8,42 14,24 C 15.5,19 19.5,16.5 24,18 Z",
		buccalDistalSlope:
			"M 24,18 C 23.5,28 22.8,42 22,58 C 28.5,58 33,48 35.5,35 C 38,22 32.5,20.5 24,18 Z",
	},
	{
		id: "DB",
		nameRu: "Дистально-щечный",
		apex: { x: 50, y: 18 },
		ridgePath: "M 50,18 C 50.5,19.5 51.2,21 52,22",
		mesialSlope:
			"M 50,18 C 45.5,19 41.5,20.8 38,22 C 38.5,25.5 42.5,24.5 50,18 Z",
		distalSlope:
			"M 50,18 C 53.5,19 57.5,20.8 62,22 C 60.5,25.5 56.5,24.5 50,18 Z",
		buccalRidgePath: "M 50,18 C 50,30 49.5,45 49,62",
		buccalMesialSlope:
			"M 50,18 C 50,30 49.5,45 49,62 C 41,60 36.5,48 35.5,35 C 41.5,20.8 45.5,19 50,18 Z",
		buccalDistalSlope:
			"M 50,18 C 50,30 49.5,45 49,62 C 57,60 61.5,48 62.5,35 C 57.5,20.8 53.5,19 50,18 Z",
	},
	{
		id: "D",
		nameRu: "Дистальный",
		apex: { x: 74, y: 22 },
		ridgePath: "M 74,22 C 70,22 66,22 62,22",
		mesialSlope: "M 74,22 C 70,22 66,22 62,22 C 63.5,25.5 68.5,25.5 74,22 Z",
		distalSlope:
			"M 74,22 C 77.5,21.5 81.5,24 83.5,27.5 C 79.5,28 76.5,26 74,22 Z",
		buccalRidgePath: "M 74,22 C 74.8,32 75.5,44 76,58",
		buccalMesialSlope:
			"M 74,22 C 74.8,32 75.5,44 76,58 C 69.5,58 64.5,48 62.5,35 C 66,22 70,22 74,22 Z",
		buccalDistalSlope:
			"M 74,22 C 74.8,32 75.5,44 76,58 C 81.5,54 84.5,42 83.5,27.5 C 81.5,24 77.5,21.5 74,22 Z",
	},
	{
		id: "ML",
		nameRu: "Медиально-язычный",
		apex: { x: 30, y: 11 },
		ridgePath: "M 30,11 C 33,14 36,17 38,20",
		mesialSlope: "M 30,11 C 25,12 20.5,14 17.5,17.5 C 21.5,18 25,16 30,11 Z",
		distalSlope:
			"M 30,11 C 33,14 36,17 38,20 C 42.5,18 45.5,15 48,12 C 40.5,11 34.5,11 30,11 Z",
	},
	{
		id: "DL",
		nameRu: "Дистально-язычный",
		apex: { x: 62, y: 12 },
		ridgePath: "M 62,12 C 59,15 56,18 53,21",
		mesialSlope:
			"M 62,12 C 57.5,12 52.5,12 48,12 C 49.8,15.8 51.5,18.8 53,21 C 56,18 59,15 62,12 Z",
		distalSlope:
			"M 62,12 C 65.8,13 70.5,16 73.5,19.5 C 69.5,19.8 65.8,17 62,12 Z",
	},
] as const;
