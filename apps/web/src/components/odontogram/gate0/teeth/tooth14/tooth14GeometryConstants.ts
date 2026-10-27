/**
 * Anatomical Constants and Reference Geometry for Tooth 14 (Upper Right First Premolar)
 * Wheeler Ch. 9: Bifurcated roots (Buccal + Palatal) + angular crown (54px) + longer mesial cusp slope.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
import { TOOTH14_CUSPS, type Tooth14CuspDef } from "./tooth14CuspGeometry";
import { TOOTH14_ROOTS_GEOMETRY } from "./tooth14RootsGeometry";

export type { Tooth14CuspDef } from "./tooth14CuspGeometry";
export { TOOTH14_ROOTS_GEOMETRY } from "./tooth14RootsGeometry";

export const TOOTH14_GEOMETRY = {
	viewBox: "0 0 100 170",
	crownMonolithPath:
		"M 23.5,96.0 C 22.0,105.0 20.5,118.0 21.5,126.0 C 22.5,131.0 24.0,135.0 51.5,152.0 " +
		"C 70.0,141.0 75.5,134.0 77.5,126.0 C 79.0,118.0 78.0,105.0 76.5,96.0 " +
		"C 68.0,94.0 59.0,93.5 50.0,93.5 C 41.0,93.5 32.0,94.0 23.5,96.0 Z",
	crownMonolithPathWithAbfraction:
		"M 23.5,96.0 L 23.5,96.5 L 28.0,99.2 L 22.0,102.8 " +
		"C 22.0,105.0 20.5,118.0 21.5,126.0 C 22.5,131.0 24.0,135.0 51.5,152.0 " +
		"C 70.0,141.0 75.5,134.0 77.5,126.0 C 79.0,118.0 78.0,105.0 76.5,96.0 " +
		"C 68.0,94.0 59.0,93.5 50.0,93.5 C 41.0,93.5 32.0,94.0 23.5,96.0 Z",
	// Roots
	palatalRootPath: TOOTH14_ROOTS_GEOMETRY.palatalRootPath,
	buccalRootsMonolithPath: TOOTH14_ROOTS_GEOMETRY.buccalRootMonolithPath,
	rootMonolithPath: TOOTH14_ROOTS_GEOMETRY.buccalRootMonolithPath,
	combinedRootsSilhouette: TOOTH14_ROOTS_GEOMETRY.combinedRootsSilhouette,
	saddleShadowPath: TOOTH14_ROOTS_GEOMETRY.saddleShadowPath,
	cejPath: "M 23.5,96.0 C 32.0,94.0 41.0,93.5 50.0,93.5 C 59.0,93.5 68.0,94.0 76.5,96.0",
	cejCurve: "M 23.5,96.0 C 32.0,94.0 41.0,93.5 50.0,93.5 C 59.0,93.5 68.0,94.0 76.5,96.0",
	mbCastShadowPath: "",
	trifurcationShadowPath: "",
	bifurcationShadowPath: TOOTH14_ROOTS_GEOMETRY.saddleShadowPath,
	furcationApex: TOOTH14_ROOTS_GEOMETRY.bifurcationCrotch,
	bifurcationCrotch: TOOTH14_ROOTS_GEOMETRY.bifurcationCrotch,
	buccalApex: TOOTH14_ROOTS_GEOMETRY.buccalApex,
	palatalApex: TOOTH14_ROOTS_GEOMETRY.palatalApex,
	mesialApex: TOOTH14_ROOTS_GEOMETRY.buccalApex,
	distalApex: TOOTH14_ROOTS_GEOMETRY.palatalApex,
	singleApex: TOOTH14_ROOTS_GEOMETRY.buccalApex,
	apices: TOOTH14_ROOTS_GEOMETRY.apices,
	buccalCervicalRidge:
		"M 23.5,96.0 C 27.5,102.0 38.0,107.0 50.0,107.0 C 62.0,107.0 72.5,102.0 76.5,96.0 C 67.0,97.5 33.0,97.5 23.5,96.0 Z",
	cervicalRidgeHighlight: "M 25.0,98.0 C 29.5,103.0 39.0,106.0 50.0,106.0 C 61.0,106.0 70.5,103.0 75.0,98.0",
	fissures: {
		centralGroove: "M 51.5,152.0 C 51.2,142.0 51.0,132.0 50.5,124.0",
		sulcusMesialis: "M 23.5,133.0 C 31.0,141.0 41.0,148.0 51.5,152.0",
		sulcusDistalis: "M 51.5,152.0 C 61.0,148.0 69.0,142.0 76.5,135.0",
		mesialPit: { cx: 36.0, cy: 140.0, r: 0.95 },
		distalPit: { cx: 66.5, cy: 138.0, r: 0.95 },
	},
	fissuresMaxillary: [
		{ id: "mesial-depression", d: "M 36.0,140.0 C 35.0,132.0 34.5,124.0 35.5,118.0" },
		{ id: "distal-depression", d: "M 66.5,138.0 C 67.5,130.0 68.0,123.0 67.0,118.0" },
		{ id: "occlusal-sulcus", d: "M 42.0,147.0 C 47.0,149.5 52.0,150.0 57.0,148.5" },
	],
	fissuresY5: [
		{ id: "mesial-depression", d: "M 36.0,140.0 C 35.0,132.0 34.5,124.0 35.5,118.0" },
		{ id: "distal-depression", d: "M 66.5,138.0 C 67.5,130.0 68.0,123.0 67.0,118.0" },
		{ id: "occlusal-sulcus", d: "M 42.0,147.0 C 47.0,149.5 52.0,150.0 57.0,148.5" },
	],
	cusps: TOOTH14_CUSPS,
	endoCanals: [
		{ id: "B", nameRu: "Щечный корневой канал", apex: { x: 44.0, y: 12.0 } },
		{ id: "P", nameRu: "Нёбный корневой канал", apex: { x: 54.5, y: 10.5 } },
	],
} as const;
