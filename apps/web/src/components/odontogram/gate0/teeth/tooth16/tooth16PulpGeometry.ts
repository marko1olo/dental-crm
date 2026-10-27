/**
 * Anatomical Unified Endodontic System Geometry for Maxillary Molar 16
 * Wheeler Ch. 11 & Cohen's Pathways of the Pulp:
 * - Seamless unified pulp system: coronal chamber + 4 canals (P, MB1, MB2, DB) in 1 polygon.
 * - Inverted physiological dome (Y=170-Y from Tooth 46 canon): 2 rounded horns, zero saw-teeth.
 * - Smooth anatomical funnels at canal orifices with zero flat horizontal cuts.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth16CanalAnatomy {
	id: "P" | "MB1" | "MB2" | "DB";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH16_PULP_GEOMETRY = {
	// 1. SEAMLESS MONOLITHIC PULP SYSTEM (Chamber + 4 Canals in ONE organic polygon)
	unifiedPulpSystemPath:
		"M 78.9,26 " +
		"C 75.8,46 68.0,72 62.0,98.0 " +
		"C 62.4,104.5 61.8,111.0 60.5,115.5 " +
		"C 59.2,119.0 55.2,119.0 53.5,116.5 " +
		"C 49.5,112.5 43.5,112.5 40.8,117.5 " +
		"C 39.5,122.0 35.5,122.0 34.5,118.5 " +
		"C 33.2,113.0 32.4,105.0 33.0,98.0 " +
		"C 31.5,74 23.8,48 22.4,22 L 23.6,22 " +
		"C 25.0,48 33.0,74 36.8,98.5 " +
		"C 37.2,99.2 37.8,99.8 38.2,100.5 " +
		"C 35.0,74 28.0,50 25.0,23 L 26.0,23 " +
		"C 29.0,50 36.5,74 40.6,100.5 " +
		"C 43.0,102.5 46.5,102.5 48.2,99.5 " +
		"C 48.6,68 49.0,36 49.4,8.5 L 50.6,8.5 " +
		"C 51.0,36 51.4,68 51.8,99.5 " +
		"C 54.0,102.5 57.0,101.5 58.4,98.0 " +
		"C 65.5,72 74.5,46 77.7,26 L 78.9,26 Z",

	// 2. COMPACT CORONAL PULP CHAMBER (Cavitas pulparis coronae: 2 rounded horns)
	coronalPulpChamber:
		"M 33.0,98.0 " +
		"C 32.4,105.0 33.2,113.0 34.5,118.5 " +
		"C 35.5,122.0 39.5,122.0 40.8,117.5 " +
		"C 43.5,112.5 49.5,112.5 53.5,116.5 " +
		"C 55.2,119.0 59.2,119.0 60.5,115.5 " +
		"C 61.8,111.0 62.4,104.5 62.0,98.0 " +
		"C 57.0,101.5 54.0,102.5 50.0,102.5 " +
		"C 46.0,102.5 43.0,102.5 38.2,100.5 " +
		"C 36.8,99.5 35.0,98.5 33.0,98.0 Z",

	// 3. 4 INDIVIDUAL ROOT CANALS (Smooth funnel orifices, tapering to apices)
	canals: [
		{
			id: "P",
			nameRu: "Нёбный канал (Palatal)",
			orifice: { x: 50.0, y: 100.5 },
			apex: { x: 50.0, y: 8.5 },
			centerLine: "M 50,101.0 C 50,68 50,36 50,8.5",
			taperedLumen:
				"M 48.2,99.5 C 48.6,68 49.0,36 49.4,8.5 " +
				"L 50.6,8.5 C 51.0,36 51.4,68 51.8,99.5 Z",
		},
		{
			id: "MB1",
			nameRu: "Мезиобуккальный 1 канал (MB1)",
			orifice: { x: 35.0, y: 98.2 },
			apex: { x: 23.0, y: 22.0 },
			centerLine: "M 34.9,98.2 C 32.0,74 24.0,48 23.0,22",
			taperedLumen:
				"M 33.0,98.0 C 31.5,74 23.8,48 22.4,22 " +
				"L 23.6,22 C 25.0,48 33.0,74 36.8,98.5 Z",
		},
		{
			id: "MB2",
			nameRu: "Мезиобуккальный 2 канал (MB2)",
			orifice: { x: 39.4, y: 100.5 },
			apex: { x: 25.5, y: 23.0 },
			centerLine: "M 39.4,100.5 C 36.0,74 28.5,50 25.5,23",
			taperedLumen:
				"M 38.2,100.5 C 35.0,74 28.0,50 25.0,23 " +
				"L 26.0,23 C 29.0,50 36.5,74 40.6,100.5 Z",
		},
		{
			id: "DB",
			nameRu: "Дистобуккальный канал (DB)",
			orifice: { x: 60.2, y: 98.0 },
			apex: { x: 78.3, y: 26.0 },
			centerLine: "M 60.2,98.0 C 66.5,72 75.0,46 78.3,26",
			taperedLumen:
				"M 58.4,98.0 C 65.5,72 74.5,46 77.7,26 " +
				"L 78.9,26 C 75.8,46 68.0,72 62.0,98.0 Z",
		},
	] as readonly Tooth16CanalAnatomy[],

	rostrumMap: {
		orifices: [
			{ id: "P", x: 50.0, y: 100.5, r: 1.4 },
			{ id: "MB1", x: 35.0, y: 98.2, r: 1.2 },
			{ id: "MB2", x: 39.4, y: 100.5, r: 1.0 },
			{ id: "DB", x: 60.2, y: 98.0, r: 1.2 },
		],
	},
} as const;
