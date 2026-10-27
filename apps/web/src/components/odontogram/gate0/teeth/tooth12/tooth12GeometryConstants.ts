/**
 * Anatomical Constants and Reference Geometry for Tooth 12 (Upper Right Lateral Incisor)
 * Wheeler Ch. 7: Slender root with distal hook (apex Y=14.0) + delicate crown (42px) + sharp mesial 90° / rounded distal angle.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
import { TOOTH12_CUSPS, type Tooth12CuspDef } from "./tooth12CuspGeometry";
import { TOOTH12_ROOTS_GEOMETRY } from "./tooth12RootsGeometry";

export type { Tooth12CuspDef } from "./tooth12CuspGeometry";
export { TOOTH12_ROOTS_GEOMETRY } from "./tooth12RootsGeometry";

export const TOOTH12_GEOMETRY = {
	viewBox: "0 0 100 170",
	crownMonolithPath:
		"M 29.0,96.0 C 27.5,108.0 27.0,120.0 27.8,132.0 C 28.0,138.0 28.5,143.0 29.0,146.0 " +
		"C 34.0,148.5 44.0,150.0 50.0,150.5 C 60.0,151.0 67.0,151.0 71.0,151.0 " +
		"L 71.8,132.0 C 72.2,120.0 71.8,106.0 71.0,96.0 " +
		"C 64.0,94.0 57.0,93.0 50.0,93.0 C 43.0,93.0 36.0,94.0 29.0,96.0 Z",
	crownMonolithPathWithAbfraction:
		"M 29.0,96.0 L 29.0,96.5 L 33.0,99.2 L 27.5,102.8 " +
		"C 27.5,108.0 27.0,120.0 27.8,132.0 C 28.0,138.0 28.5,143.0 29.0,146.0 " +
		"C 34.0,148.5 44.0,150.0 50.0,150.5 C 60.0,151.0 67.0,151.0 71.0,151.0 " +
		"L 71.8,132.0 C 72.2,120.0 71.8,106.0 71.0,96.0 " +
		"C 64.0,94.0 57.0,93.0 50.0,93.0 C 43.0,93.0 36.0,94.0 29.0,96.0 Z",
	// Roots
	palatalRootPath: TOOTH12_ROOTS_GEOMETRY.rootMonolithPath,
	buccalRootsMonolithPath: TOOTH12_ROOTS_GEOMETRY.rootMonolithPath,
	rootMonolithPath: TOOTH12_ROOTS_GEOMETRY.rootMonolithPath,
	combinedRootsSilhouette: TOOTH12_ROOTS_GEOMETRY.combinedRootsSilhouette,
	cejPath: "M 29.0,96.0 C 36.0,94.0 43.0,93.0 50.0,93.0 C 57.0,93.0 64.0,94.0 71.0,96.0",
	cejCurve: "M 29.0,96.0 C 36.0,94.0 43.0,93.0 50.0,93.0 C 57.0,93.0 64.0,94.0 71.0,96.0",
	saddleShadowPath: "",
	mbCastShadowPath: "",
	trifurcationShadowPath: "",
	bifurcationShadowPath: "",
	furcationApex: { x: 50.0, y: 96.0 },
	bifurcationCrotch: { x: 50.0, y: 96.0 },
	lateralApex: TOOTH12_ROOTS_GEOMETRY.lateralApex,
	singleApex: TOOTH12_ROOTS_GEOMETRY.lateralApex,
	palatalApex: TOOTH12_ROOTS_GEOMETRY.lateralApex,
	mesialApex: TOOTH12_ROOTS_GEOMETRY.lateralApex,
	distalApex: TOOTH12_ROOTS_GEOMETRY.lateralApex,
	apices: TOOTH12_ROOTS_GEOMETRY.apices,
	buccalCervicalRidge:
		"M 29.0,96.0 C 32.0,101.5 40.0,105.5 50.0,105.5 C 60.0,105.5 68.0,101.5 71.0,96.0 C 64.0,97.5 36.0,97.5 29.0,96.0 Z",
	cervicalRidgeHighlight: "M 30.5,98.0 C 34.0,102.5 41.0,104.5 50.0,104.5 C 59.0,104.5 66.0,102.5 69.5,98.0",
	fissures: {
		centralGroove: "M 50.0,150.5 C 50.0,138.0 50.0,126.0 50.0,114.0",
		sulcusMesialis: "M 71.0,151.0 L 71.0,136.0",
		sulcusDistalis: "M 29.0,146.0 C 33.0,148.5 45.0,150.0 50.0,150.5",
	},
	fissuresMaxillary: [
		{ id: "labial-ridge-crest", d: "M 50.0,150.5 C 50.0,138.0 50.0,126.0 50.0,114.0" },
	],
	fissuresY5: [
		{ id: "mamelon-mesial", d: "M 59.0,150.5 C 59.0,138.0 58.5,128.0 58.0,118.0" },
		{ id: "mamelon-distal", d: "M 41.0,148.0 C 41.0,136.0 41.5,126.0 42.0,116.0" },
	],
	cusps: TOOTH12_CUSPS,
	endoCanals: [
		{ id: "L", nameRu: "Магистральный канал латерального резца", apex: { x: 43.0, y: 14.0 } },
	],
} as const;
