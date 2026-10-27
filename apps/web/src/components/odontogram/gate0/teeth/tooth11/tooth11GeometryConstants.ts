/**
 * Anatomical Constants and Reference Geometry for Tooth 11 (Upper Right Central Incisor)
 * Wheeler Ch. 6: Straight conical root (apex Y=12.5) + aesthetic golden ratio crown (50px) + sharp 90° mesio-incisal corner.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
import { TOOTH11_CUSPS, type Tooth11CuspDef } from "./tooth11CuspGeometry";
import { TOOTH11_ROOTS_GEOMETRY } from "./tooth11RootsGeometry";

export type { Tooth11CuspDef } from "./tooth11CuspGeometry";
export { TOOTH11_ROOTS_GEOMETRY } from "./tooth11RootsGeometry";

export const TOOTH11_GEOMETRY = {
	viewBox: "0 0 100 170",
	crownMonolithPath:
		"M 25.0,96.0 C 23.5,110.0 23.5,124.0 24.2,136.0 C 24.5,144.0 24.8,148.0 25.0,151.0 " +
		"C 34.0,152.0 44.0,152.5 50.0,152.5 C 60.0,152.5 68.0,152.8 75.0,153.0 " +
		"L 75.5,134.0 C 75.8,120.0 75.5,106.0 75.0,96.0 " +
		"C 67.0,94.0 58.0,93.0 50.0,93.0 C 42.0,93.0 33.0,94.0 25.0,96.0 Z",
	crownMonolithPathWithAbfraction:
		"M 25.0,96.0 L 25.0,96.5 L 29.5,99.2 L 23.5,102.8 " +
		"C 23.5,110.0 23.5,124.0 24.2,136.0 C 24.5,144.0 24.8,148.0 25.0,151.0 " +
		"C 34.0,152.0 44.0,152.5 50.0,152.5 C 60.0,152.5 68.0,152.8 75.0,153.0 " +
		"L 75.5,134.0 C 75.8,120.0 75.5,106.0 75.0,96.0 " +
		"C 67.0,94.0 58.0,93.0 50.0,93.0 C 42.0,93.0 33.0,94.0 25.0,96.0 Z",
	// Roots
	palatalRootPath: TOOTH11_ROOTS_GEOMETRY.rootMonolithPath,
	buccalRootsMonolithPath: TOOTH11_ROOTS_GEOMETRY.rootMonolithPath,
	rootMonolithPath: TOOTH11_ROOTS_GEOMETRY.rootMonolithPath,
	combinedRootsSilhouette: TOOTH11_ROOTS_GEOMETRY.combinedRootsSilhouette,
	cejPath: "M 25.0,96.0 C 33.0,94.0 42.0,93.0 50.0,93.0 C 58.0,93.0 67.0,94.0 75.0,96.0",
	cejCurve: "M 25.0,96.0 C 33.0,94.0 42.0,93.0 50.0,93.0 C 58.0,93.0 67.0,94.0 75.0,96.0",
	saddleShadowPath: "",
	mbCastShadowPath: "",
	trifurcationShadowPath: "",
	bifurcationShadowPath: "",
	furcationApex: { x: 50.0, y: 96.0 },
	bifurcationCrotch: { x: 50.0, y: 96.0 },
	centralApex: TOOTH11_ROOTS_GEOMETRY.centralApex,
	singleApex: TOOTH11_ROOTS_GEOMETRY.centralApex,
	palatalApex: TOOTH11_ROOTS_GEOMETRY.centralApex,
	mesialApex: TOOTH11_ROOTS_GEOMETRY.centralApex,
	distalApex: TOOTH11_ROOTS_GEOMETRY.centralApex,
	apices: TOOTH11_ROOTS_GEOMETRY.apices,
	buccalCervicalRidge:
		"M 25.0,96.0 C 29.0,102.0 39.0,106.0 50.0,106.0 C 61.0,106.0 71.0,102.0 75.0,96.0 C 66.0,97.5 34.0,97.5 25.0,96.0 Z",
	cervicalRidgeHighlight: "M 26.5,98.0 C 31.0,103.0 40.0,105.0 50.0,105.0 C 60.0,105.0 69.0,103.0 73.5,98.0",
	fissures: {
		centralGroove: "M 50.0,152.5 C 50.0,140.0 50.0,128.0 50.0,116.0",
		sulcusMesialis: "M 62.0,152.5 C 62.0,142.0 61.5,130.0 61.0,120.0",
		sulcusDistalis: "M 38.0,151.5 C 38.0,142.0 38.5,130.0 39.0,120.0",
	},
	fissuresMaxillary: [
		{ id: "mamelon-mesial", d: "M 62.0,152.5 C 62.0,142.0 61.5,130.0 61.0,120.0" },
		{ id: "mamelon-distal", d: "M 38.0,151.5 C 38.0,142.0 38.5,130.0 39.0,120.0" },
	],
	fissuresY5: [
		{ id: "mamelon-mesial", d: "M 62.0,152.5 C 62.0,142.0 61.5,130.0 61.0,120.0" },
		{ id: "mamelon-distal", d: "M 38.0,151.5 C 38.0,142.0 38.5,130.0 39.0,120.0" },
	],
	cusps: TOOTH11_CUSPS,
	endoCanals: [
		{ id: "M", nameRu: "Магистральный канал центрального резца", apex: { x: 50.0, y: 12.5 } },
	],
} as const;
