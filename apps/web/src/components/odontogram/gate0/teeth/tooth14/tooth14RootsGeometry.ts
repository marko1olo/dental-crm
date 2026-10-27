/**
 * Anatomical 2.5D Bifurcated Root Geometry for Upper First Premolar 14
 * Wheeler's Dental Anatomy Ch. 9 — Maxillary First Premolar:
 * 1. Bifurcated Root System (60-70% incidence): Buccal (B) and Palatal (P) roots.
 * 2. Deep bifurcation crotch at mid/apical third (Y ≈ 53.0).
 * 3. Buccal root foreground (apex 44.0, 12.0), Palatal root in depth (apex 54.5, 10.5).
 * 4. Mesial radicular groove (Canine fossa) crossing the CEJ.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH14_ROOTS_GEOMETRY = {
	buccalApex: { x: 44.0, y: 12.0 },
	palatalApex: { x: 54.5, y: 10.5 },
	bifurcationCrotch: { x: 48.5, y: 53.0 },

	// 1. BACKGROUND LAYER: Palatal Root in Lingual Depth (Apex at 54.5, 10.5)
	palatalRootPath:
		"M 36.0,62.0 " +
		"C 38.0,46.0 44.0,28.0 51.0,14.0 " +
		"C 52.8,10.5 56.0,10.5 57.5,13.5 " +
		"C 62.0,24.0 67.0,42.0 71.0,60.0 " +
		"C 74.0,76.0 76.0,88.0 76.5,96.0 " +
		"C 68.0,94.0 59.0,93.5 50.0,93.5 " +
		"C 42.0,93.5 35.0,94.2 27.0,96.0 " +
		"C 30.0,84.0 33.5,72.0 36.0,62.0 Z",

	// 2. FOREGROUND LAYER: Buccal Root & Root Trunk Monolith (Apex at 44.0, 12.0)
	buccalRootMonolithPath:
		"M 23.5,96.0 " +
		"C 25.5,80.0 30.0,54.0 36.5,30.0 " +
		"C 40.0,18.0 42.5,12.0 44.0,12.0 " +
		"C 45.5,12.0 46.5,18.0 47.0,28.0 " +
		"C 47.5,38.0 48.0,47.0 48.5,53.0 " +
		"C 54.0,63.0 62.0,76.0 70.0,86.0 " +
		"C 73.0,90.5 75.0,93.5 76.5,96.0 " +
		"C 68.0,94.0 59.0,93.5 50.0,93.5 " +
		"C 41.0,93.5 32.0,94.0 23.5,96.0 Z",

	// 3. Combined Root Silhouette for Clipping
	combinedRootsSilhouette:
		"M 23.5,96.0 " +
		"C 25.5,80.0 30.0,54.0 36.5,30.0 " +
		"C 40.0,18.0 42.5,12.0 44.0,12.0 " +
		"C 45.5,12.0 46.5,18.0 47.0,28.0 " +
		"C 47.5,38.0 48.0,47.0 48.5,53.0 " +
		"C 49.5,42.0 51.5,24.0 54.0,14.0 " +
		"C 55.0,10.5 56.5,10.5 58.0,14.0 " +
		"C 62.5,25.0 67.5,44.0 71.5,62.0 " +
		"C 74.0,76.0 75.5,88.0 76.5,96.0 " +
		"C 68.0,94.0 59.0,93.5 50.0,93.5 " +
		"C 41.0,93.5 32.0,94.0 23.5,96.0 Z",

	// 4. Saddle Contact Ambient Shadow at Furcation Crotch
	saddleShadowPath:
		"M 44.0,38.0 " +
		"C 46.0,45.0 47.5,52.0 48.5,53.0 " +
		"C 50.5,52.0 53.0,46.0 55.0,40.0 " +
		"C 52.5,43.0 49.5,47.0 48.5,47.0 " +
		"C 47.0,47.0 45.0,42.0 44.0,38.0 Z",

	// 5. Mesial Radicular Groove (Canine Fossa — Wheeler hallmark)
	mesialRadicularGroove: "M 29.0,94.0 C 30.5,78.0 33.5,60.0 39.0,46.0",
	distalRadicularGroove: "M 71.5,94.0 C 69.5,78.0 66.5,60.0 62.0,46.0",
	buccalTrunkRidge: "M 46.0,54.0 C 47.0,66.0 48.0,80.0 48.5,92.0",

	// 6. Clinical Apices for Buccal & Palatal roots
	apices: [
		{ id: "B", nameRu: "Щечный корень/канал", x: 44.0, y: 12.0, r: 12 },
		{ id: "P", nameRu: "Нёбный корень/канал", x: 54.5, y: 10.5, r: 13 },
	],
} as const;
