/**
 * Anatomical 2.5D Multi-Root Trifurcation Geometry for Maxillary Molar 16
 * Wheeler's Dental Anatomy Ch. 11 — Buccal Projection & 2.5D Layering:
 * 1. Background Layer: Palatal root (longest 13-14mm, apex Y=8.5, dome curvature)
 * 2. Foreground Layer: Buccal monolith (MB + DB + 4mm common root trunk)
 * 3. 2.5D Occlusion: Buccal roots overlap palatal root with saddle contact shadow
 * Mandate 8b <= 120 lines.
 */

export const TOOTH16_ROOTS_GEOMETRY = {
	palatalApex: { x: 50, y: 8.5 },
	mbApex: { x: 23, y: 22 },
	dbApex: { x: 78.5, y: 26 },
	trifurcationCrotch: { x: 50, y: 73.5 },

	// 1. BACKGROUND LAYER: Palatal Root in Lingual Depth (Apex at Y=8.5)
	palatalRootPath:
		"M 27,78 " +
		"C 27.5,62 30.5,48 35,36 " +
		"C 39,26 43,16 46.5,10.5 " +
		"C 48,8.5 52,8.5 53.5,10.5 " +
		"C 57,16 61,26 65,36 " +
		"C 69.5,48 72.5,62 73,78 " +
		"C 60,76 42,76 27,78 Z",

	// 2. FOREGROUND LAYER: Buccal Roots (MB + DB) & 4mm Root Trunk Monolith
	buccalRootsMonolithPath:
		"M 16,96 " +
		"C 13,82 12,62 14,46 " +
		"C 15,36 17.5,26 23,22 " +
		"C 25.5,22 27,27 29,37 " +
		"C 33,51 38,63 44.5,70.5 " +
		"C 47,73.5 53,73.5 55.5,70.5 " +
		"C 62,63 67,51 71,37 " +
		"C 73,27 75,26 78.5,26 " +
		"C 81.5,26 83.5,31 84.5,42 " +
		"C 86.5,60 85.5,82 84,96 " +
		"C 80,94.5 68,93.8 50,93.5 " +
		"C 32,93.8 20,94.5 16,96 Z",

	// 3. Combined Root Silhouette for Clipping
	combinedRootsSilhouette:
		"M 16,96 " +
		"C 13,82 12,62 14,46 " +
		"C 15,36 17.5,26 23,22 " +
		"C 25.5,22 27,27 29,37 " +
		"C 33,51 36,44 41,27 " +
		"C 44,16 47,8.5 50,8.5 " +
		"C 53,8.5 56,16 59,27 " +
		"C 64,44 67,51 71,37 " +
		"C 73,27 75,26 78.5,26 " +
		"C 81.5,26 83.5,31 84.5,42 " +
		"C 86.5,60 85.5,82 84,96 " +
		"C 80,94.5 68,93.8 50,93.5 " +
		"C 32,93.8 20,94.5 16,96 Z",

	// 4. Saddle Contact Ambient Shadow (Traces the V-crotch, zero circles)
	saddleShadowPath:
		"M 34,54 " +
		"C 39,64 45,72.5 50,72.5 " +
		"C 55,72.5 61,64 66,54 " +
		"C 62,60 56,66 50,66 " +
		"C 44,66 38,60 34,54 Z",

	// 5. Directional Cast Shadow on Palatal Root from MB Inner Flank
	mbCastShadowPath: "M 31,60 C 35,46 40,32 46,20 C 44,28 39,44 35,62 Z",

	// 6. Clinical Developmental Grooves
	mbSulcusLongitudinalis: "M 21,92 C 19.5,74 18,52 22.5,28",
	dbDevelopmentalGroove: "M 78,90 C 78,70 77,50 77.5,33",
	buccalTrunkGroove: "M 50,73.5 C 50,78 49.5,83 49.5,89",

	// 7. Clinical Periapical Apices for all 4 canals
	apices: [
		{ id: "P", nameRu: "Нёбный канал/апекс", x: 50, y: 8.5, r: 14 },
		{ id: "MB1", nameRu: "Мезиобуккальный 1 апекс", x: 23, y: 22, r: 14 },
		{ id: "MB2", nameRu: "Мезиобуккальный 2 апекс", x: 25.5, y: 23, r: 14 },
		{ id: "DB", nameRu: "Дистобуккальный апекс", x: 78.5, y: 26, r: 14 },
	],
} as const;
