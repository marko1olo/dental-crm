/**
 * Anatomical Constants and Reference Geometry for Tooth 18 (Upper Right Third Molar)
 * Wheeler Ch. 12: Fused conical roots (distal hook, zero open window) + compact crown + buccal pit.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
import { TOOTH18_CUSPS, type Tooth18CuspDef } from "./tooth18CuspGeometry";
import { TOOTH18_ROOTS_GEOMETRY } from "./tooth18RootsGeometry";

export type { Tooth18CuspDef } from "./tooth18CuspGeometry";
export { TOOTH18_ROOTS_GEOMETRY } from "./tooth18RootsGeometry";

export const TOOTH18_GEOMETRY = {
	viewBox: "0 0 100 170",
	crownMonolithPath:
		"M 19.0,96 C 17.5,103 16,117 17.5,128 C 18.5,136 21.5,144 34,149 " +
		"C 40.5,149 46,145.5 50.5,142 C 55,145 60,146 65,145 " +
		"C 71,144 76.5,139 79.5,128 C 81,117 80.5,103 80.0,96 " +
		"C 70,94 60,93.5 50,93.5 C 40,93.5 30,94 19.0,96 Z",
	crownMonolithPathWithAbfraction:
		"M 19.0,96 L 19.0,96.5 L 23.5,99.2 L 17.0,102.8 " +
		"C 17.5,103 16,117 17.5,128 C 18.5,136 21.5,144 34,149 " +
		"C 40.5,149 46,145.5 50.5,142 C 55,145 60,146 65,145 " +
		"C 71,144 76.5,139 79.5,128 C 81,117 80.5,103 80.0,96 " +
		"C 70,94 60,93.5 50,93.5 C 40,93.5 30,94 19.0,96 Z",
	// Roots (Fused Monolith with Distal Hook)
	palatalRootPath: TOOTH18_ROOTS_GEOMETRY.palatalRootPath,
	buccalRootsMonolithPath: TOOTH18_ROOTS_GEOMETRY.buccalRootsMonolithPath,
	fusedConicalRootPath: TOOTH18_ROOTS_GEOMETRY.fusedConicalRootPath,
	rootMonolithPath: TOOTH18_ROOTS_GEOMETRY.combinedRootsSilhouette,
	combinedRootsSilhouette: TOOTH18_ROOTS_GEOMETRY.combinedRootsSilhouette,
	cejPath: "M 19.0,96 C 30,94 40,93.5 50,93.5 C 60,93.5 70,94 80.0,96",
	cejCurve: "M 19.0,96 C 30,94 40,93.5 50,93.5 C 60,93.5 70,94 80.0,96",
	saddleShadowPath: TOOTH18_ROOTS_GEOMETRY.saddleShadowPath,
	mbCastShadowPath: "",
	trifurcationShadowPath: TOOTH18_ROOTS_GEOMETRY.saddleShadowPath,
	bifurcationShadowPath: TOOTH18_ROOTS_GEOMETRY.saddleShadowPath,
	furcationApex: TOOTH18_ROOTS_GEOMETRY.trifurcationCrotch,
	bifurcationCrotch: TOOTH18_ROOTS_GEOMETRY.trifurcationCrotch,
	mesialApex: TOOTH18_ROOTS_GEOMETRY.mbApex,
	distalApex: TOOTH18_ROOTS_GEOMETRY.dbApex,
	palatalApex: TOOTH18_ROOTS_GEOMETRY.palatalApex,
	fusedClusterApex: TOOTH18_ROOTS_GEOMETRY.fusedClusterApex,
	apices: TOOTH18_ROOTS_GEOMETRY.apices,
	buccalCervicalRidge:
		"M 19.0,96 C 22,102 35,108 50,108 C 65,108 77,102 80.0,96 C 68,98 32,98 19.0,96 Z",
	cervicalRidgeHighlight: "M 20.0,98 C 24,104 35,107 50,107 C 65,107 75,103 79.0,98",
	fissures: {
		sulcusBuccalis: "M 50.5,142 C 50.8,136 50.6,128 50.5,122",
		buccalPit: { cx: 50.5, cy: 122, r: 1.0 },
		sulcusMesiobuccalis: "M 19,134 C 22.5,142 28,147.5 34,149",
		sulcusDistobuccalis: "M 65,145 C 71,144 76.5,139 79.5,133",
		sulcusCentralis: "M 34,149 C 40.5,149 46,145.5 50.5,142 C 55,145 60,146 65,145",
	},
	fissuresMaxillary: [
		{ id: "buccal-groove", d: "M 50.5,142 C 50.8,136 50.6,128 50.5,122" },
		{ id: "mesial-slope", d: "M 19,134 C 22.5,142 28,147.5 34,149" },
		{ id: "distal-slope", d: "M 65,145 C 71,144 76.5,139 79.5,133" },
		{ id: "central-crest", d: "M 34,149 C 40.5,149 46,145.5 50.5,142 C 55,145 60,146 65,145" },
	],
	fissuresY5: [
		{ id: "buccal-groove", d: "M 50.5,142 C 50.8,136 50.6,128 50.5,122" },
		{ id: "central-crest", d: "M 34,149 C 40.5,149 46,145.5 50.5,142 C 55,145 60,146 65,145" },
	],
	cusps: TOOTH18_CUSPS,
	endoCanals: [
		{ id: "P", nameRu: "Нёбный канал (слитная верхушка)", apex: { x: 55.0, y: 19.0 } },
		{ id: "MB1", nameRu: "Мезиобуккальный канал (сходящийся)", apex: { x: 48.5, y: 22.5 } },
		{ id: "DB", nameRu: "Дистобуккальный канал (сходящийся)", apex: { x: 59.5, y: 23.5 } },
	],
} as const;
