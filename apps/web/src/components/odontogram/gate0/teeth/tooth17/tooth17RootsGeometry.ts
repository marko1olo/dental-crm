/**
 * Anatomical 2.5D Multi-Root Trifurcation Geometry for Upper Second Molar 17 (Wheeler Ch. 12)
 * Features:
 * 1. Strongly convergent roots sweeping DISTALLY TO THE LEFT (X < 50).
 * 2. High trifurcation crotch (Y=78.0) creating a narrow, distally inclined window (high contrast vs 16).
 * 3. DB apex on left (20.0, 26.5), MB apex on right (58.0, 22.5), Palatal apex (44.0, 11.0).
 * 4. Inter-apical spread = 38.0px (31% narrower than 16's 55.5px spread).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH17_ROOTS_GEOMETRY = {
	palatalApex: { x: 44.0, y: 11.0 },
	dbApex: { x: 20.0, y: 26.5 },
	mbApex: { x: 58.0, y: 22.5 },
	trifurcationCrotch: { x: 43.5, y: 78.0 },

	// 1. BACKGROUND LAYER: Palatal Root Sweeping to the Left (Apex at 44.0, 11.0)
	palatalRootPath:
		"M 27.0,83.0 " +
		"C 27.5,67.0 30.0,52.0 34.0,38.0 " +
		"C 37.5,27.0 41.0,17.0 43.0,11.5 " +
		"C 44.5,11.0 46.5,11.0 48.0,13.0 " +
		"C 51.5,19.0 55.0,30.0 58.0,42.0 " +
		"C 62.0,56.0 66.0,72.0 68.0,83.0 " +
		"C 56.0,81.0 41.0,81.0 27.0,83.0 Z",

	// 2. FOREGROUND LAYER: Convergent Buccal Roots Sweeping Left (38px spread)
	buccalRootsMonolithPath:
		"M 17.5,96.0 " +
		"C 16.0,82.0 16.0,66.0 17.0,50.0 " +
		"C 17.5,40.0 18.5,30.0 20.0,26.5 " +
		"C 22.0,26.5 24.0,31.0 26.5,41.0 " +
		"C 30.5,55.0 36.0,68.0 40.5,75.0 " +
		"C 42.0,78.0 45.0,78.0 47.0,75.0 " +
		"C 51.0,67.0 54.0,54.0 56.5,38.0 " +
		"C 57.5,27.0 58.0,22.5 59.5,22.5 " +
		"C 61.5,22.5 63.5,28.0 65.5,40.0 " +
		"C 70.0,60.0 75.5,78.0 82.5,96.0 " +
		"C 75.0,94.5 63.0,93.8 50.0,93.5 " +
		"C 34.0,93.8 23.0,94.5 17.5,96.0 Z",

	// 3. Combined Root Silhouette for Clipping
	combinedRootsSilhouette:
		"M 17.5,96.0 " +
		"C 16.0,82.0 16.0,66.0 17.0,50.0 " +
		"C 17.5,40.0 18.5,30.0 20.0,26.5 " +
		"C 22.0,26.5 24.0,31.0 26.5,41.0 " +
		"C 30.5,55.0 34.0,46.0 38.0,30.0 " +
		"C 41.0,18.0 43.0,11.0 44.5,11.0 " +
		"C 46.5,11.0 49.0,18.0 52.0,30.0 " +
		"C 54.5,42.0 55.5,50.0 56.5,38.0 " +
		"C 57.5,27.0 58.0,22.5 59.5,22.5 " +
		"C 61.5,22.5 63.5,28.0 65.5,40.0 " +
		"C 70.0,60.0 75.5,78.0 82.5,96.0 " +
		"C 75.0,94.5 63.0,93.8 50.0,93.5 " +
		"C 34.0,93.8 23.0,94.5 17.5,96.0 Z",

	// 4. Saddle Contact Shadow Tracing the Higher Leftward V-crotch (Y=78.0)
	saddleShadowPath:
		"M 33.0,60.0 " +
		"C 36.5,69.0 41.0,76.5 43.5,76.5 " +
		"C 46.5,76.5 50.0,69.0 53.0,60.0 " +
		"C 50.0,64.0 46.0,70.5 43.5,70.5 " +
		"C 41.0,70.5 37.0,64.0 33.0,60.0 Z",

	// 5. Directional Cast Shadow on Palatal Root from Inner Flank
	mbCastShadowPath: "M 32.0,64.0 C 35.0,50.0 38.0,34.0 42.0,22.0 C 40.5,30.0 37.5,46.0 34.0,66.0 Z",

	// 6. Clinical Developmental Grooves (Distal sweep)
	mbSulcusLongitudinalis: "M 68.0,92.0 C 64.0,74.0 60.5,52.0 58.5,28.0",
	dbDevelopmentalGroove: "M 23.0,90.0 C 22.0,70.0 21.0,50.0 20.5,33.0",
	buccalTrunkGroove: "M 43.5,78.0 C 44.5,82.0 46.0,86.0 48.0,91.0",

	// 7. Clinical Periapical Apices for all 4 canals
	apices: [
		{ id: "P", nameRu: "Нёбный апекс (наклон влево)", x: 44.0, y: 11.0, r: 13 },
		{ id: "DB", nameRu: "Дистально-щечный апекс (влево)", x: 20.0, y: 26.5, r: 11 },
		{ id: "MB1", nameRu: "Медиально-щечный 1 апекс", x: 58.0, y: 22.5, r: 11 },
		{ id: "MB2", nameRu: "Медиально-щечный 2 апекс", x: 55.5, y: 25.0, r: 10 },
	],
} as const;
