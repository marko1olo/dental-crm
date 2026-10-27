/**
 * Anatomical Constants and Reference Geometry for Tooth 16 (Upper Right First Molar)
 * Wheeler Ch. 11: 3 roots (MB, DB, Palatal) + 2 prominent buccal cusps (MB, DB) + buccal pit.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
import { TOOTH16_CUSPS, type Tooth16CuspDef } from "./tooth16CuspGeometry";
import { TOOTH16_ROOTS_GEOMETRY } from "./tooth16RootsGeometry";

export type { Tooth16CuspDef } from "./tooth16CuspGeometry";
export { TOOTH16_ROOTS_GEOMETRY } from "./tooth16RootsGeometry";

export const TOOTH16_GEOMETRY = {
	viewBox: "0 0 100 170",
	crownMonolithPath:
		"M 16,96 C 13.5,104 12,118 13.5,130 C 14.5,138 18.0,146 32,152 " +
		"C 40,152 47,148 52.5,145 C 58,148 64,150 69,149.5 " +
		"C 76,148 82,142 85,130 C 86.5,118 85.5,104 84,96 " +
		"C 72,94 62,93.5 50,93.5 C 38,93.5 28,94 16,96 Z",
	crownMonolithPathWithAbfraction:
		"M 16,96 L 16,96.5 L 21,99.2 L 13.8,102.8 " +
		"C 13.5,104 12,118 13.5,130 C 14.5,138 18.0,146 32,152 " +
		"C 40,152 47,148 52.5,145 C 58,148 64,150 69,149.5 " +
		"C 76,148 82,142 85,130 C 86.5,118 85.5,104 84,96 " +
		"C 72,94 62,93.5 50,93.5 C 38,93.5 28,94 16,96 Z",
	// Roots
	palatalRootPath: TOOTH16_ROOTS_GEOMETRY.palatalRootPath,
	buccalRootsMonolithPath: TOOTH16_ROOTS_GEOMETRY.buccalRootsMonolithPath,
	rootMonolithPath: TOOTH16_ROOTS_GEOMETRY.combinedRootsSilhouette,
	combinedRootsSilhouette: TOOTH16_ROOTS_GEOMETRY.combinedRootsSilhouette,
	cejPath: "M 16,96 C 28,94 38,93.5 50,93.5 C 62,93.5 72,94 84,96",
	cejCurve: "M 16,96 C 28,94 38,93.5 50,93.5 C 62,93.5 72,94 84,96",
	saddleShadowPath: TOOTH16_ROOTS_GEOMETRY.saddleShadowPath,
	mbCastShadowPath: TOOTH16_ROOTS_GEOMETRY.mbCastShadowPath,
	trifurcationShadowPath: TOOTH16_ROOTS_GEOMETRY.saddleShadowPath,
	bifurcationShadowPath: TOOTH16_ROOTS_GEOMETRY.saddleShadowPath,
	furcationApex: TOOTH16_ROOTS_GEOMETRY.trifurcationCrotch,
	bifurcationCrotch: TOOTH16_ROOTS_GEOMETRY.trifurcationCrotch,
	mesialApex: TOOTH16_ROOTS_GEOMETRY.mbApex,
	distalApex: TOOTH16_ROOTS_GEOMETRY.dbApex,
	palatalApex: TOOTH16_ROOTS_GEOMETRY.palatalApex,
	apices: TOOTH16_ROOTS_GEOMETRY.apices,
	buccalCervicalRidge:
		"M 16,96 C 20,102 35,108 50,108 C 65,108 80,102 84,96 C 70,98 30,98 16,96 Z",
	cervicalRidgeHighlight: "M 17,98 C 22,104 35,107 50,107 C 65,107 78,103 83,98",
	fissures: {
		sulcusBuccalis: "M 52.5,145 C 52.8,138 52.6,131 52.5,125",
		buccalPit: { cx: 52.5, cy: 125, r: 1.1 },
		sulcusMesiobuccalis: "M 16,134 C 20,144 26,150 32,152",
		sulcusDistobuccalis: "M 69,149.5 C 76,148 81,142 84,136",
		sulcusCentralis: "M 32,152 C 40,152 47,148 52.5,145 C 58,148 64,150 69,149.5",
	},
	fissuresMaxillary: [
		{ id: "buccal-groove", d: "M 52.5,145 C 52.8,138 52.6,131 52.5,125" },
		{ id: "mesial-slope", d: "M 16,134 C 20,144 26,150 32,152" },
		{ id: "distal-slope", d: "M 69,149.5 C 76,148 81,142 84,136" },
		{ id: "central-crest", d: "M 32,152 C 40,152 47,148 52.5,145 C 58,148 64,150 69,149.5" },
	],
	fissuresY5: [
		{ id: "buccal-groove", d: "M 52.5,145 C 52.8,138 52.6,131 52.5,125" },
		{ id: "central-crest", d: "M 32,152 C 40,152 47,148 52.5,145 C 58,148 64,150 69,149.5" },
	],
	cusps: TOOTH16_CUSPS,
	endoCanals: [
		{ id: "P", nameRu: "Нёбный канал", apex: { x: 50, y: 8.5 } },
		{ id: "MB1", nameRu: "Мезиобуккальный 1 канал", apex: { x: 23, y: 22 } },
		{ id: "MB2", nameRu: "Мезиобуккальный 2 канал", apex: { x: 25.5, y: 23 } },
		{ id: "DB", nameRu: "Дистобуккальный канал", apex: { x: 78.5, y: 26 } },
	],
} as const;
