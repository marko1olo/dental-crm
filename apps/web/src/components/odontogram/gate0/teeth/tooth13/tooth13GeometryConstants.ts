/**
 * Anatomical Constants and Reference Geometry for Tooth 13 (Upper Right Canine)
 * Wheeler Ch. 8: Longest root in dentition (apex Y=4.5) + spear-shaped crown (47px) + shorter mesial slope.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
import { TOOTH13_CUSPS, type Tooth13CuspDef } from "./tooth13CuspGeometry";
import { TOOTH13_ROOTS_GEOMETRY } from "./tooth13RootsGeometry";

export type { Tooth13CuspDef } from "./tooth13CuspGeometry";
export { TOOTH13_ROOTS_GEOMETRY } from "./tooth13RootsGeometry";

export const TOOTH13_GEOMETRY = {
	viewBox: "0 0 100 170",
	crownMonolithPath:
		"M 26.5,96.0 C 24.5,106.0 23.5,118.0 25.0,126.0 C 25.5,130.0 26.5,133.0 51.5,153.5 " +
		"C 68.0,144.0 73.5,137.0 74.5,128.0 C 76.0,118.0 75.0,105.0 73.5,96.0 " +
		"C 66.0,94.0 58.0,93.0 50.0,93.0 C 42.0,93.0 34.0,94.0 26.5,96.0 Z",
	crownMonolithPathWithAbfraction:
		"M 26.5,96.0 L 26.5,96.5 L 30.5,99.2 L 25.0,102.8 " +
		"C 24.5,106.0 23.5,118.0 25.0,126.0 C 25.5,130.0 26.5,133.0 51.5,153.5 " +
		"C 68.0,144.0 73.5,137.0 74.5,128.0 C 76.0,118.0 75.0,105.0 73.5,96.0 " +
		"C 66.0,94.0 58.0,93.0 50.0,93.0 C 42.0,93.0 34.0,94.0 26.5,96.0 Z",
	// Roots
	palatalRootPath: TOOTH13_ROOTS_GEOMETRY.rootMonolithPath,
	buccalRootsMonolithPath: TOOTH13_ROOTS_GEOMETRY.rootMonolithPath,
	rootMonolithPath: TOOTH13_ROOTS_GEOMETRY.rootMonolithPath,
	combinedRootsSilhouette: TOOTH13_ROOTS_GEOMETRY.combinedRootsSilhouette,
	cejPath: "M 26.5,96.0 C 34.0,94.0 42.0,93.0 50.0,93.0 C 58.0,93.0 66.0,94.0 73.5,96.0",
	cejCurve: "M 26.5,96.0 C 34.0,94.0 42.0,93.0 50.0,93.0 C 58.0,93.0 66.0,94.0 73.5,96.0",
	saddleShadowPath: "",
	mbCastShadowPath: "",
	trifurcationShadowPath: "",
	bifurcationShadowPath: "",
	furcationApex: { x: 50.0, y: 96.0 },
	bifurcationCrotch: { x: 50.0, y: 96.0 },
	canineApex: TOOTH13_ROOTS_GEOMETRY.canineApex,
	singleApex: TOOTH13_ROOTS_GEOMETRY.canineApex,
	palatalApex: TOOTH13_ROOTS_GEOMETRY.canineApex,
	mesialApex: TOOTH13_ROOTS_GEOMETRY.canineApex,
	distalApex: TOOTH13_ROOTS_GEOMETRY.canineApex,
	apices: TOOTH13_ROOTS_GEOMETRY.apices,
	buccalCervicalRidge:
		"M 26.5,96.0 C 30.0,102.0 39.0,106.5 50.0,106.5 C 61.0,106.5 70.0,102.0 73.5,96.0 C 65.5,97.5 34.5,97.5 26.5,96.0 Z",
	cervicalRidgeHighlight: "M 28.0,98.0 C 32.0,103.0 40.0,105.5 50.0,105.5 C 60.0,105.5 68.0,103.0 72.0,98.0",
	fissures: {
		centralGroove: "M 51.5,153.5 C 51.2,142.0 50.8,130.0 50.5,118.0",
		sulcusMesialis: "M 51.5,153.5 C 60.0,149.0 67.0,143.0 73.5,137.0",
		sulcusDistalis: "M 26.5,133.0 C 34.0,142.0 42.0,149.0 51.5,153.5",
	},
	fissuresMaxillary: [
		{ id: "labial-ridge-crest", d: "M 51.5,153.5 C 51.2,138.0 50.8,124.0 50.5,110.0" },
		{ id: "mesial-slope", d: "M 51.5,153.5 C 60.0,149.0 67.0,143.0 73.5,137.0" },
		{ id: "distal-slope", d: "M 26.5,133.0 C 34.0,142.0 42.0,149.0 51.5,153.5" },
	],
	fissuresY5: [],
	cusps: TOOTH13_CUSPS,
	endoCanals: [
		{ id: "C", nameRu: "Магистральный канал клыка", apex: { x: 45.0, y: 4.5 } },
	],
} as const;
