/**
 * Anatomical Constants and Reference Geometry for Tooth 15 (Upper Right Second Premolar)
 * Wheeler Ch. 10: Single conical root (apex Y=13.0) + compact oval crown (51px) + single central buccal cusp.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
import { TOOTH15_CUSPS, type Tooth15CuspDef } from "./tooth15CuspGeometry";
import { TOOTH15_ROOTS_GEOMETRY } from "./tooth15RootsGeometry";

export type { Tooth15CuspDef } from "./tooth15CuspGeometry";
export { TOOTH15_ROOTS_GEOMETRY } from "./tooth15RootsGeometry";

export const TOOTH15_GEOMETRY = {
	viewBox: "0 0 100 170",
	crownMonolithPath:
		"M 24.5,96 C 22.5,104 21.0,118 22.5,130 C 24.0,140 28.5,147 50.0,151 " +
		"C 71.5,147 76.0,140 77.5,130 C 79.0,118 77.5,104 75.5,96 " +
		"C 67,94 58,93.5 50,93.5 C 42,93.5 33,94 24.5,96 Z",
	crownMonolithPathWithAbfraction:
		"M 24.5,96 L 24.5,96.5 L 29,99.2 L 23.0,102.8 " +
		"C 22.5,104 21.0,118 22.5,130 C 24.0,140 28.5,147 50.0,151 " +
		"C 71.5,147 76.0,140 77.5,130 C 79.0,118 77.5,104 75.5,96 " +
		"C 67,94 58,93.5 50,93.5 C 42,93.5 33,94 24.5,96 Z",
	// Roots
	palatalRootPath: TOOTH15_ROOTS_GEOMETRY.rootMonolithPath,
	buccalRootsMonolithPath: TOOTH15_ROOTS_GEOMETRY.rootMonolithPath,
	rootMonolithPath: TOOTH15_ROOTS_GEOMETRY.rootMonolithPath,
	combinedRootsSilhouette: TOOTH15_ROOTS_GEOMETRY.combinedRootsSilhouette,
	cejPath: "M 24.5,96 C 33,94 42,93.5 50,93.5 C 58,93.5 67,94 75.5,96",
	cejCurve: "M 24.5,96 C 33,94 42,93.5 50,93.5 C 58,93.5 67,94 75.5,96",
	saddleShadowPath: "",
	mbCastShadowPath: "",
	trifurcationShadowPath: "",
	bifurcationShadowPath: "",
	furcationApex: { x: 50.0, y: 96.0 },
	bifurcationCrotch: { x: 50.0, y: 96.0 },
	mesialApex: TOOTH15_ROOTS_GEOMETRY.rootApex,
	distalApex: TOOTH15_ROOTS_GEOMETRY.rootApex,
	palatalApex: TOOTH15_ROOTS_GEOMETRY.rootApex,
	singleApex: TOOTH15_ROOTS_GEOMETRY.rootApex,
	apices: TOOTH15_ROOTS_GEOMETRY.apices,
	buccalCervicalRidge:
		"M 24.5,96 C 28,102 38,107 50,107 C 62,107 72,102 75.5,96 C 66,97.5 34,97.5 24.5,96 Z",
	cervicalRidgeHighlight: "M 26,98 C 30,103 39,106 50,106 C 61,106 70,103 74,98",
	fissures: {
		centralGroove: "M 50,151 C 50,144 50,136 50,128",
		sulcusMesialis: "M 24.5,134 C 32,142 41,148 50,151",
		sulcusDistalis: "M 50,151 C 59,148 68,142 75.5,134",
		mesialPit: { cx: 37.0, cy: 140.0, r: 0.90 },
		distalPit: { cx: 63.0, cy: 140.0, r: 0.90 },
	},
	fissuresMaxillary: [
		{ id: "mesial-depression", d: "M 37.0,140.0 C 36.5,132.0 36.5,124.0 37.5,118.0" },
		{ id: "distal-depression", d: "M 63.0,140.0 C 63.5,132.0 63.5,124.0 62.5,118.0" },
		{ id: "occlusal-sulcus", d: "M 42.0,147.0 C 46.5,149.0 50.0,149.5 54.0,148.5" },
	],
	fissuresY5: [
		{ id: "mesial-depression", d: "M 37.0,140.0 C 36.5,132.0 36.5,124.0 37.5,118.0" },
		{ id: "distal-depression", d: "M 63.0,140.0 C 63.5,132.0 63.5,124.0 62.5,118.0" },
		{ id: "occlusal-sulcus", d: "M 42.0,147.0 C 46.5,149.0 50.0,149.5 54.0,148.5" },
	],
	cusps: TOOTH15_CUSPS,
	endoCanals: [
		{ id: "P", nameRu: "Магистральный корневой канал", apex: { x: 50.5, y: 13.0 } },
	],
} as const;
