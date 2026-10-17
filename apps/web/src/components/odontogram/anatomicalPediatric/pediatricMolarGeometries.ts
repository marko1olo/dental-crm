/**
 * DENTE Dental CRM — Pediatric Molar SVG Geometries
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { AnatomicalTemplateData } from "../anatomicalGeometriesTypes";

export const PEDIATRIC_UPPER_MOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown: "M 18 84 C 12 96, 10 128, 28 138 C 36 142, 48 140, 50 134 C 52 140, 64 142, 72 138 C 90 128, 88 96, 82 84 Q 50 80 18 84 Z",
	root: "M 18 84 C 10 64, 10 38, 16 18 C 24 30, 32 48, 36 66 C 42 48, 46 28, 50 14 C 54 28, 58 48, 64 66 C 68 48, 76 30, 84 18 C 90 38, 90 64, 82 84 Z",
	cej: "M 18 84 Q 50 80 82 84",
	fissures: "M 30 124 Q 50 130 70 124 M 50 110 L 50 132",
	pulpChamber: "M 30 114 C 28 104, 32 94, 38 86 C 44 82, 56 82, 62 86 C 68 94, 72 104, 70 114 C 64 118, 36 118, 30 114 Z",
	canals: [
		{ id: "MB", nameRu: "Медиально-щечный (MB)", path: "M 36 92 C 30 70, 20 44, 16 18", apex: { x: 16, y: 18 }, defaultLengthMm: 16.5 },
		{ id: "P", nameRu: "Нёбный (Palatal)", path: "M 50 92 C 50 70, 50 38, 50 14", apex: { x: 50, y: 14 }, defaultLengthMm: 17.5 },
		{ id: "DB", nameRu: "Дистально-щечный (DB)", path: "M 64 92 C 70 70, 80 44, 84 18", apex: { x: 84, y: 18 }, defaultLengthMm: 16.0 },
	],
	apexHalos: [{ x: 16, y: 18 }, { x: 50, y: 14 }, { x: 84, y: 18 }],
	periodontal: {
		boneCrestNormal: "M 14 76 Q 50 72 86 76",
		boneResorptionMild: "M 14 66 Q 50 62 86 66",
		boneResorptionModerate: "M 14 54 Q 50 50 86 54",
		boneResorptionSevere: "M 14 38 Q 50 34 86 38",
		furcationSites: [
			{ id: "Pediatric_Trifurcation", nameRu: "Дивергирующая трифуркация молочного моляра", position: { x: 50, y: 66 }, type: "trifurcation_buccal" as const },
		],
	},
	surfaces: {
		O: "M 32 110 Q 50 116 68 110 L 64 130 Q 50 134 36 130 Z",
		V: "M 18 84 C 32 81, 68 81, 82 84 L 68 110 Q 50 116 32 110 Z",
		L: "M 36 130 Q 50 134 64 130 L 72 138 C 64 142, 36 142, 28 138 Z",
		M: "M 18 84 L 32 110 L 36 130 L 28 138 C 12 128, 12 96, 18 84 Z",
		D: "M 82 84 C 88 96, 88 128, 72 138 L 64 130 L 68 110 Z",
		C: "M 18 84 Q 50 80 82 84 L 76 96 Q 50 92 24 96 Z",
	},
	viewBox: { x: 0, y: 0, width: 100, height: 160 },
	standardWidthPx: 78,
	standardHeightPx: 140,
};

export const PEDIATRIC_LOWER_MOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown: "M 18 76 C 12 64, 10 32, 28 22 C 36 18, 48 20, 50 26 C 52 20, 64 18, 72 22 C 90 32, 88 64, 82 76 Q 50 80 18 76 Z",
	root: "M 18 76 C 10 96, 10 122, 16 142 C 26 130, 36 110, 50 90 C 64 110, 74 130, 84 142 C 90 122, 90 96, 82 76 Z",
	cej: "M 18 76 Q 50 80 82 76",
	fissures: "M 30 36 Q 50 30 70 36 M 50 50 L 50 28",
	pulpChamber: "M 30 46 C 28 56, 32 66, 38 74 C 44 78, 56 78, 62 74 C 68 66, 72 56, 70 46 C 64 42, 36 42, 30 46 Z",
	canals: [
		{ id: "M", nameRu: "Медиальный канал (M)", path: "M 36 68 C 28 88, 20 116, 16 142", apex: { x: 16, y: 142 }, defaultLengthMm: 16.0 },
		{ id: "D", nameRu: "Дистальный канал (D)", path: "M 64 68 C 72 88, 80 116, 84 142", apex: { x: 84, y: 142 }, defaultLengthMm: 16.0 },
	],
	apexHalos: [{ x: 16, y: 142 }, { x: 84, y: 142 }],
	periodontal: {
		boneCrestNormal: "M 14 84 Q 50 88 86 84",
		boneResorptionMild: "M 14 94 Q 50 98 86 94",
		boneResorptionModerate: "M 14 106 Q 50 110 86 106",
		boneResorptionSevere: "M 14 122 Q 50 126 86 122",
		furcationSites: [
			{ id: "Pediatric_Bifurcation", nameRu: "Дивергирующая бифуркация нижнего молочного моляра", position: { x: 50, y: 90 }, type: "bifurcation" as const },
		],
	},
	surfaces: {
		O: "M 32 50 Q 50 44 68 50 L 64 30 Q 50 26 36 30 Z",
		V: "M 18 76 C 32 79, 68 79, 82 76 L 68 50 Q 50 44 32 50 Z",
		L: "M 36 30 Q 50 26 64 30 L 72 22 C 64 18, 36 18, 28 22 Z",
		M: "M 18 76 L 32 50 L 36 30 L 28 22 C 12 32, 12 64, 18 76 Z",
		D: "M 82 76 C 88 64, 88 32, 72 22 L 64 30 L 68 50 Z",
		C: "M 18 76 Q 50 80 82 76 L 76 64 Q 50 68 24 64 Z",
	},
	viewBox: { x: 0, y: 0, width: 100, height: 160 },
	standardWidthPx: 78,
	standardHeightPx: 140,
};
