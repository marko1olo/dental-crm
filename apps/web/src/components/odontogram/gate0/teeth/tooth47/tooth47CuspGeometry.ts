/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular Second Molar (Tooth 47) 4 Cusps
 * Exact 4-Cusp Occlusal Architecture: MB, DB, ML, DL (Zero 5th Distal Cusp).
 * Mandate 8b: Strictly <= 120 lines.
 */

export interface Tooth47CuspDef {
	id: "MB" | "DB" | "ML" | "DL";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope: string;
	distalSlope: string;
	buccalRidgePath?: string;
	buccalMesialSlope?: string;
	buccalDistalSlope?: string;
}

export const TOOTH47_CUSPS: readonly Tooth47CuspDef[] = [
	{
		id: "MB",
		nameRu: "Медиально-щечный",
		apex: { x: 30, y: 18 },
		ridgePath: "M 30,18 C 36,19.5 43,21.0 50,22.0",
		mesialSlope:
			"M 30,18 C 22,18 16,28 13.0,38 C 17,32 23,26 29,20.5 C 34,21 42,21.5 50,22.0 C 42,20.5 35,19.2 30,18 Z",
		distalSlope:
			"M 30,18 C 36,19.5 43,21.0 50,22.0 C 48,24.5 44,25.5 40,24 C 36,22 32,20 30,18 Z",
		buccalRidgePath: "M 30,18 C 29.5,28.0 28.5,38.0 27.5,52.0",
		buccalMesialSlope:
			"M 30,18 C 22,18 16,28 13.0,38 C 12.0,46 14.0,50 16.5,53.5 C 20.0,54.5 24.0,53.8 27.5,52.0 C 28.5,38.0 29.5,28.0 30,18 Z",
		buccalDistalSlope:
			"M 30,18 C 29.5,28.0 28.5,38.0 27.5,52.0 C 34.0,53.8 41.0,52.5 45.0,49.5 C 46.5,45.0 48.5,35.0 50,22.0 C 43,21.0 36,19.5 30,18 Z",
	},
	{
		id: "DB",
		nameRu: "Дистально-щечный",
		apex: { x: 68, y: 18 },
		ridgePath: "M 68,18 C 62,19.5 56,21.0 50,22.0",
		mesialSlope:
			"M 68,18 C 62,19.5 56,21.0 50,22.0 C 52,24.5 56,25.5 60,24 C 64,22 66,20 68,18 Z",
		distalSlope:
			"M 68,18 C 76,18 82,28 87.0,38 C 83,32 77,26 71,20.5 C 66,21 58,21.5 50,22.0 C 56,21.0 62,19.5 68,18 Z",
		buccalRidgePath: "M 68,18 C 68.5,28.0 69.5,38.0 70.5,52.0",
		buccalMesialSlope:
			"M 68,18 C 68.5,28.0 69.5,38.0 70.5,52.0 C 64.0,53.8 57.0,52.5 53.0,49.5 C 51.5,45.0 49.5,35.0 50,22.0 C 56,21.0 62,19.5 68,18 Z",
		buccalDistalSlope:
			"M 68,18 C 76,18 82,28 87.0,38 C 88.0,46 86.0,50 83.5,53.5 C 80.0,54.5 75.0,53.8 70.5,52.0 C 69.5,38.0 68.5,28.0 68,18 Z",
	},
	{
		id: "ML",
		nameRu: "Медиально-язычный",
		apex: { x: 33, y: 11 },
		ridgePath: "M 33,11 C 38,14.5 44,18.0 50,22.0",
		mesialSlope:
			"M 33,11 C 26,12 20.0,15 16.5,18.5 C 20,19.5 24.5,20.5 29,21.5 C 35,21.8 42,22.0 50,22.0 C 44,18.0 38,14.5 33,11 Z",
		distalSlope:
			"M 33,11 C 38,14.5 44,18.0 50,22.0 C 49,18 49,15 49,12 C 43,11 37.5,11 33,11 Z",
	},
	{
		id: "DL",
		nameRu: "Дистально-язычный",
		apex: { x: 65, y: 11 },
		ridgePath: "M 65,11 C 60,14.5 55,18.0 50,22.0",
		mesialSlope:
			"M 65,11 C 60,14.5 55,18.0 50,22.0 C 51,18 51,15 51,12 C 57,11 61.5,11 65,11 Z",
		distalSlope:
			"M 65,11 C 72,12 78.0,15 81.5,18.5 C 78,19.5 73.5,20.5 69,21.5 C 63,21.8 56,22.0 50,22.0 C 55,18.0 60,14.5 65,11 Z",
	},
];
