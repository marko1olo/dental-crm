/**
 * Anatomical 2.5D Fused Anomalous Root Geometry for Upper Third Molar 18 (Wheeler Ch. 12)
 * Features:
 * 1. Fused conical roots converging into an anomalous DISTAL HOOK CURVING TO THE LEFT (X < 50).
 * 2. Deep longitudinal fusion grooves defining 3 fused lobes (DB on left, MB on right, Palatal).
 * 3. Tightly clustered apices (DB: 37.0, MB: 48.0, Palatal: 41.0) with spread = 11px!
 * 4. Shortened root length (apices Y=19.0..23.5).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH18_ROOTS_GEOMETRY = {
	palatalApex: { x: 41.0, y: 19.0 },
	dbApex: { x: 37.0, y: 23.0 },
	mbApex: { x: 48.0, y: 22.5 },
	fusedClusterApex: { x: 41.0, y: 19.0 },
	trifurcationCrotch: { x: 42.0, y: 88.0 },

	// 1. Monolithic Fused Conical Root Mass with Distal Hook to the LEFT (X < 50)
	fusedConicalRootPath:
		"M 19.0,96 " +
		"C 20.5,82 25.0,62 31.0,46 " +
		"C 34.0,38 34.5,29 36.5,23.0 " +
		"C 38.0,18.5 42.0,17.5 44.5,19.0 " +
		"C 48.5,21.5 54.0,30.0 60.0,42.0 " +
		"C 67.0,56 73.5,74 78.5,86 " +
		"C 79.5,90 80.0,93 80.0,96 " +
		"C 70,94 60,93.5 50,93.5 " +
		"C 40,93.5 30,94 19.0,96 Z",

	// Alias paths for compatibility
	palatalRootPath:
		"M 26,94 C 27,80 30,62 34,46 C 37,34 39,23 41,19.0 C 43,18.0 46,19 49,23.5 C 54,32 60,48 66,66 C 70,80 72,94 72,94 Z",

	buccalRootsMonolithPath:
		"M 19.0,96 " +
		"C 20.5,82 25.0,62 31.0,46 " +
		"C 34.0,38 34.5,29 36.5,23.0 " +
		"C 38.0,18.5 42.0,17.5 44.5,19.0 " +
		"C 48.5,21.5 54.0,30.0 60.0,42.0 " +
		"C 67.0,56 73.5,74 78.5,86 " +
		"C 79.5,90 80.0,93 80.0,96 " +
		"C 70,94 60,93.5 50,93.5 " +
		"C 40,93.5 30,94 19.0,96 Z",

	combinedRootsSilhouette:
		"M 19.0,96 " +
		"C 20.5,82 25.0,62 31.0,46 " +
		"C 34.0,38 34.5,29 36.5,23.0 " +
		"C 38.0,18.5 42.0,17.5 44.5,19.0 " +
		"C 48.5,21.5 54.0,30.0 60.0,42.0 " +
		"C 67.0,56 73.5,74 78.5,86 " +
		"C 79.5,90 80.0,93 80.0,96 " +
		"C 70,94 60,93.5 50,93.5 " +
		"C 40,93.5 30,94 19.0,96 Z",

	// 2. 2.5D Deep Longitudinal Fusion Grooves
	distalFusionGroove: "M 32,94 C 33,76 34,55 38,25",
	mesialFusionGroove: "M 59,94 C 57,76 53,55 46,24",
	buccalTrunkGroove: "M 46,94 C 45,76 43,55 41,20",
	fusedCenterShadow: "M 46,94 C 45,76 43,55 41,20",
	mesialGrooveShadow: "M 56,94 C 55,76 51,55 45,24 L 47,24 C 53,55 57,76 58,94 Z",
	distalGrooveShadow: "M 31,94 C 32,76 33,55 37,25 L 39,25 C 35,55 34,76 33,94 Z",

	saddleShadowPath: "",
	trifurcationShadowPath: "",
	mbCastShadowPath: "",

	// 3. Clinical Periapical Apices
	apices: [
		{ id: "P", nameRu: "Нёбный апекс сросшегося монолита", x: 41.0, y: 19.0, r: 12 },
		{ id: "DB", nameRu: "Дистально-щечный крючок (влево)", x: 37.0, y: 23.0, r: 10 },
		{ id: "MB", nameRu: "Медиально-щечный апекс", x: 48.0, y: 22.5, r: 10 },
	],
} as const;
