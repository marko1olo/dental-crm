/**
 * DENTE Dental CRM — Adult Lower Molar & Premolar Geometries
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { AnatomicalTemplateData } from "../anatomicalGeometriesTypes";

export const LOWER_MOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown: "M 16 64 C 10 50, 8 22, 24 12 C 34 7, 48 10, 50 18 C 52 10, 66 7, 76 12 C 92 22, 90 50, 84 64 Q 50 68 16 64 Z",
	root: "M 16 64 C 11 88, 14 124, 22 154 C 28 142, 38 120, 50 96 C 62 120, 72 142, 78 150 C 86 124, 89 88, 84 64 Z",
	cej: "M 16 64 Q 50 68 84 64",
	fissures: "M 28 28 Q 50 20 72 28 M 50 42 L 50 18 M 36 38 Q 50 32 64 38",
	pulpChamber: "M 28 34 C 26 44, 32 58, 36 64 C 42 70, 58 70, 64 64 C 68 58, 74 44, 72 34 C 66 30, 56 38, 50 34 C 44 38, 34 30, 28 34 Z",
	canals: [
		{ id: "MB", nameRu: "Медиально-щечный (MB)", path: "M 32 56 C 26 84, 18 122, 18 152", apex: { x: 18, y: 152 }, defaultLengthMm: 21.0 },
		{ id: "ML", nameRu: "Медиально-язычный (ML)", path: "M 42 56 C 40 84, 32 120, 28 146", apex: { x: 28, y: 146 }, defaultLengthMm: 21.0 },
		{ id: "D", nameRu: "Дистальный (Distal)", path: "M 66 56 C 70 84, 78 120, 78 148", apex: { x: 78, y: 148 }, defaultLengthMm: 21.5 },
	],
	apexHalos: [{ x: 20, y: 150 }, { x: 78, y: 148 }],
	periodontal: {
		boneCrestNormal: "M 12 74 Q 50 78 88 74",
		boneResorptionMild: "M 12 84 Q 50 88 88 84",
		boneResorptionModerate: "M 12 98 Q 50 102 88 98",
		boneResorptionSevere: "M 12 118 Q 50 122 88 118",
		furcationSites: [
			{ id: "M_D_Bifurcation_Buccal", nameRu: "Щечная бифуркация нижнего моляра", position: { x: 50, y: 96 }, type: "bifurcation" as const },
			{ id: "M_D_Bifurcation_Lingual", nameRu: "Язычная бифуркация нижнего моляра", position: { x: 50, y: 98 }, type: "bifurcation" as const },
		],
	},
	surfaces: {
		O: "M 30 38 Q 50 32 70 38 L 66 18 Q 50 14 34 18 Z",
		V: "M 16 64 C 32 67, 68 67, 84 64 L 70 38 Q 50 32 30 38 Z",
		L: "M 34 18 Q 50 14 66 18 L 76 12 C 66 7, 34 7, 24 12 Z",
		M: "M 16 64 L 30 38 L 34 18 L 24 12 C 10 22, 10 50, 16 64 Z",
		D: "M 84 64 C 90 50, 90 22, 76 12 L 66 18 L 70 38 Z",
		C: "M 16 64 Q 50 68 84 64 L 78 52 Q 50 56 22 52 Z",
	},
	viewBox: { x: 0, y: 0, width: 100, height: 160 },
	standardWidthPx: 88,
	standardHeightPx: 150,
};

export const LOWER_PREMOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown: "M 24 64 C 18 52, 18 22, 34 12 C 44 8, 56 8, 66 12 C 82 22, 82 52, 76 64 Q 50 68 24 64 Z",
	root: "M 24 64 C 23 88, 35 124, 50 154 C 65 124, 77 88, 76 64 Z",
	cej: "M 24 64 Q 50 68 76 64",
	fissures: "M 36 30 Q 50 26 64 30 M 50 40 L 50 20",
	pulpChamber: "M 42 36 C 40 46, 42 60, 46 88 C 48 116, 49 140, 50 154 C 51 140, 52 116, 54 88 C 58 60, 60 46, 58 36 C 54 28, 46 28, 42 36 Z",
	canals: [
		{ id: "Main", nameRu: "Основной корневой канал", path: "M 50 40 C 50 72, 50 116, 50 154", apex: { x: 50, y: 154 }, defaultLengthMm: 22.0 },
	],
	apexHalos: [{ x: 50, y: 154 }],
	periodontal: {
		boneCrestNormal: "M 20 74 Q 50 78 80 74",
		boneResorptionMild: "M 20 86 Q 50 90 80 86",
		boneResorptionModerate: "M 20 102 Q 50 106 80 102",
		boneResorptionSevere: "M 20 122 Q 50 126 80 122",
		furcationSites: [],
	},
	surfaces: {
		O: "M 36 38 Q 50 34 64 38 L 60 20 Q 50 16 40 20 Z",
		V: "M 24 64 C 36 67, 64 67, 76 64 L 64 38 Q 50 34 36 38 Z",
		L: "M 40 20 Q 50 16 60 20 L 66 12 C 56 8, 44 8, 34 12 Z",
		M: "M 24 64 L 36 38 L 40 20 L 34 12 C 18 22, 18 52, 24 64 Z",
		D: "M 76 64 C 82 52, 82 22, 66 12 L 60 20 L 64 38 Z",
		C: "M 24 64 Q 50 68 76 64 L 70 52 Q 50 56 30 52 Z",
	},
	viewBox: { x: 10, y: 0, width: 80, height: 160 },
	standardWidthPx: 72,
	standardHeightPx: 150,
};
