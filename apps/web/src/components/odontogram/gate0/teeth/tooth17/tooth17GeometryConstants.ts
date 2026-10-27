/**
 * Anatomical Constants and Reference Geometry for Tooth 17 (Upper Right Second Molar)
 * Wheeler Ch. 12: 3 convergent roots (distal sweep to the left) + sharp asymmetrical crown + buccal pit.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
import { TOOTH17_CUSPS, type Tooth17CuspDef } from "./tooth17CuspGeometry";
import { TOOTH17_ROOTS_GEOMETRY } from "./tooth17RootsGeometry";

export type { Tooth17CuspDef } from "./tooth17CuspGeometry";
export { TOOTH17_ROOTS_GEOMETRY } from "./tooth17RootsGeometry";

export const TOOTH17_GEOMETRY = {
	viewBox: "0 0 100 170",
	crownMonolithPath:
		"M 17.5,96.0 C 15.5,104.0 14.5,118.0 16.0,128.0 C 16.5,134.0 22.0,139.0 32.0,142.5 " +
		"C 38.0,142.0 42.5,141.0 47.0,140.0 C 53.0,146.0 60.0,149.0 65.0,149.0 " +
		"C 72.0,148.0 78.0,142.0 82.5,134.0 C 84.0,118.0 83.5,104.0 82.5,96.0 " +
		"C 71.0,94.0 61.0,93.5 50.0,93.5 C 39.0,93.5 29.0,94.0 17.5,96.0 Z",
	crownMonolithPathWithAbfraction:
		"M 17.5,96.0 L 17.5,96.5 L 22.0,99.2 L 15.2,102.8 " +
		"C 15.5,104.0 14.5,118.0 16.0,128.0 C 16.5,134.0 22.0,139.0 32.0,142.5 " +
		"C 38.0,142.0 42.5,141.0 47.0,140.0 C 53.0,146.0 60.0,149.0 65.0,149.0 " +
		"C 72.0,148.0 78.0,142.0 82.5,134.0 C 84.0,118.0 83.5,104.0 82.5,96.0 " +
		"C 71.0,94.0 61.0,93.5 50.0,93.5 C 39.0,93.5 29.0,94.0 17.5,96.0 Z",
	// Roots
	palatalRootPath: TOOTH17_ROOTS_GEOMETRY.palatalRootPath,
	buccalRootsMonolithPath: TOOTH17_ROOTS_GEOMETRY.buccalRootsMonolithPath,
	rootMonolithPath: TOOTH17_ROOTS_GEOMETRY.combinedRootsSilhouette,
	combinedRootsSilhouette: TOOTH17_ROOTS_GEOMETRY.combinedRootsSilhouette,
	cejPath: "M 17.5,96.0 C 29.0,94.0 39.0,93.5 50.0,93.5 C 61.0,93.5 71.0,94.0 82.5,96.0",
	cejCurve: "M 17.5,96.0 C 29.0,94.0 39.0,93.5 50.0,93.5 C 61.0,93.5 71.0,94.0 82.5,96.0",
	saddleShadowPath: TOOTH17_ROOTS_GEOMETRY.saddleShadowPath,
	mbCastShadowPath: TOOTH17_ROOTS_GEOMETRY.mbCastShadowPath,
	trifurcationShadowPath: TOOTH17_ROOTS_GEOMETRY.saddleShadowPath,
	bifurcationShadowPath: TOOTH17_ROOTS_GEOMETRY.saddleShadowPath,
	furcationApex: TOOTH17_ROOTS_GEOMETRY.trifurcationCrotch,
	bifurcationCrotch: TOOTH17_ROOTS_GEOMETRY.trifurcationCrotch,
	mesialApex: TOOTH17_ROOTS_GEOMETRY.mbApex,
	distalApex: TOOTH17_ROOTS_GEOMETRY.dbApex,
	palatalApex: TOOTH17_ROOTS_GEOMETRY.palatalApex,
	apices: TOOTH17_ROOTS_GEOMETRY.apices,
	buccalCervicalRidge:
		"M 17.5,96.0 C 21.0,102.0 35.0,108.0 50.0,108.0 C 65.0,108.0 79.0,102.0 82.5,96.0 C 69.0,98.0 31.0,98.0 17.5,96.0 Z",
	cervicalRidgeHighlight: "M 18.5,98.0 C 23.0,104.0 35.0,107.0 50.0,107.0 C 65.0,107.0 77.0,103.0 81.5,98.0",
	fissures: {
		sulcusBuccalis: "M 47.0,140.0 C 47.0,134.0 47.0,128.0 47.0,122.0",
		buccalPit: { cx: 47.0, cy: 122.0, r: 1.05 },
		sulcusMesiobuccalis: "M 65.0,149.0 C 72.0,148.0 78.0,142.0 82.5,134.0",
		sulcusDistobuccalis: "M 17.5,134.0 C 22.0,139.0 27.0,142.0 32.0,142.5",
		sulcusCentralis: "M 32.0,142.5 C 38.0,142.0 42.5,141.0 47.0,140.0 C 53.0,146.0 60.0,149.0 65.0,149.0",
	},
	fissuresMaxillary: [
		{ id: "buccal-groove", d: "M 47.0,140.0 C 47.0,134.0 47.0,128.0 47.0,122.0" },
		{ id: "mesial-slope", d: "M 65.0,149.0 C 72.0,148.0 78.0,142.0 82.5,134.0" },
		{ id: "distal-slope", d: "M 17.5,134.0 C 22.0,139.0 27.0,142.0 32.0,142.5" },
		{ id: "central-crest", d: "M 32.0,142.5 C 38.0,142.0 42.5,141.0 47.0,140.0 C 53.0,146.0 60.0,149.0 65.0,149.0" },
	],
	fissuresY5: [
		{ id: "buccal-groove", d: "M 47.0,140.0 C 47.0,134.0 47.0,128.0 47.0,122.0" },
		{ id: "central-crest", d: "M 32.0,142.5 C 38.0,142.0 42.5,141.0 47.0,140.0 C 53.0,146.0 60.0,149.0 65.0,149.0" },
	],
	cusps: TOOTH17_CUSPS,
	endoCanals: [
		{ id: "P", nameRu: "Нёбный канал (дистальный наклон)", apex: { x: 44.0, y: 11.0 } },
		{ id: "DB", nameRu: "Дистально-щечный канал", apex: { x: 20.0, y: 26.5 } },
		{ id: "MB1", nameRu: "Медиально-щечный 1 канал", apex: { x: 58.0, y: 22.5 } },
		{ id: "MB2", nameRu: "Медиально-щечный 2 канал", apex: { x: 55.5, y: 25.0 } },
	],
} as const;
