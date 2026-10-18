/**
 * DENTE Dental CRM — Anatomical Pulp & Endodontic System for Tooth 46
 * Cavitas pulparis with 5 pulp horns (cornua) & 3 tapered biological canals.
 * All coordinates strictly within SVG ViewBox "0 0 100 160" (Mandate 8b <= 120 lines).
 */

export interface Tooth46CanalAnatomy {
	id: "MB" | "ML" | "D";
	nameRu: string;
	centerLine: string;
	taperedLumen: string;
	apex: { x: number; y: number };
}

export const TOOTH46_PULP_GEOMETRY = {
	// Cavitas pulparis coronae with smooth vaulted dome (svod) & 5 pulp horns (cornua)
	coronalPulpChamber:
		"M 24.5,38 " +
		"C 24.5,30 25.2,25 26.5,22 " +
		"C 28.0,23.5 30.5,18 33,15 " +
		"C 36.5,19 42,24 46,24.5 " +
		"C 49,25 50.5,23.8 52,23 " +
		"C 54.5,24 58.5,18 62,16 " +
		"C 65.5,19.5 70,24.5 73.5,26 " +
		"C 75.5,30 75.5,44 73,54 " +
		"C 71,57.5 69,58.5 66,58.5 " +
		"C 62,58.5 56,57.5 50,57 " +
		"C 44,57.5 38,58.5 36,58.5 " +
		"C 32,58.5 30,58.5 27,58.5 " +
		"C 25,56 24.5,48 24.5,38 Z",
	canals: [
		{
			id: "MB",
			nameRu: "Медиально-щечный канал",
			centerLine:
				"M 28.5,57.0 C 26.5,78 20.5,108 21.6,128 C 22.3,137 22.7,142 23,145.8",
			taperedLumen:
				"M 25.5,57.0 C 24.0,78 18.8,108 20.8,128 C 21.8,137 22.3,142.5 22.3,145.8 " +
				"L 23.7,145.8 C 23.7,142.5 23.4,137 22.7,128 C 21.8,108 28.5,78 31.5,57.0 Z",
			apex: { x: 23, y: 145.8 },
		},
		{
			id: "ML",
			nameRu: "Медиально-язычный канал",
			centerLine:
				"M 36.5,57.0 C 34.5,78 26.8,106 24.2,126 C 23.4,137 23.1,142 23,145.8",
			taperedLumen:
				"M 33.5,57.0 C 32.0,78 25.2,106 23.2,126 C 22.7,137 22.5,142.5 22.5,145.8 " +
				"L 23.5,145.8 C 23.8,142.5 24.0,137 25.0,126 C 28.0,106 36.2,78 39.5,57.0 Z",
			apex: { x: 23, y: 145.8 },
		},
		{
			id: "D",
			nameRu: "Дистальный канал",
			centerLine:
				"M 65.5,57.0 C 69.0,78 74.5,108 76.6,128 C 77.8,137 78.5,142 79,144.5",
			taperedLumen:
				"M 62.5,57.0 C 67.0,78 73.0,108 75.4,128 C 77.0,137 78.2,142 78.2,144.5 " +
				"L 79.8,144.5 C 79.8,142.0 79.2,137 78.2,128 C 76.2,108 71.0,78 68.5,57.0 Z",
			apex: { x: 79, y: 144.5 },
		},
	] as readonly Tooth46CanalAnatomy[],
	neuroPlexus: [
		{ id: "mb", d: "M 26.5,22 C 28,32 30,42 29,52" },
		{ id: "ml", d: "M 33,15 C 34,26 35,40 36,52" },
		{ id: "db", d: "M 52,23 C 51,34 49,42 48,52" },
		{ id: "dl", d: "M 62,16 C 61,26 59,40 58,52" },
		{ id: "d", d: "M 73.5,26 C 71,36 69,44 66,52" },
	] as const,
} as const;
