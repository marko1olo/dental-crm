/**
 * DENTE Dental CRM — Adult Upper Canine & Incisor Geometries
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { AnatomicalTemplateData } from "../anatomicalGeometriesTypes";

export const UPPER_CANINE_GEOMETRY: AnatomicalTemplateData = {
	crown: "M 26 96 C 20 110, 18 134, 50 154 C 82 134, 80 110, 74 96 Q 50 92 26 96 Z",
	root: "M 26 96 C 23 72, 34 32, 50 4 C 66 32, 77 72, 74 96 Z",
	cej: "M 26 96 Q 50 92 74 96",
	fissures: "M 50 120 L 50 150",
	pulpChamber: "M 42 124 C 40 114, 42 100, 46 72 C 48 40, 49 14, 50 4 C 51 14, 52 40, 54 72 C 58 100, 60 114, 58 124 C 54 132, 46 132, 42 124 Z",
	canals: [
		{ id: "Main", nameRu: "Основной корневой канал", path: "M 50 120 C 50 88, 50 44, 50 4", apex: { x: 50, y: 4 }, defaultLengthMm: 26.0 },
	],
	apexHalos: [{ x: 50, y: 4 }],
	periodontal: {
		boneCrestNormal: "M 22 86 Q 50 81 78 86",
		boneResorptionMild: "M 22 74 Q 50 69 78 74",
		boneResorptionModerate: "M 22 58 Q 50 53 78 58",
		boneResorptionSevere: "M 22 36 Q 50 31 78 36",
		furcationSites: [],
	},
	surfaces: {
		O: "M 38 124 Q 50 128 62 124 L 50 154 Z",
		V: "M 26 96 C 38 93, 62 93, 74 96 L 62 124 Q 50 128 38 124 Z",
		L: "M 38 124 L 50 154 L 62 124 Q 50 136 38 124 Z",
		M: "M 26 96 L 38 124 L 50 154 C 28 138, 22 114, 26 96 Z",
		D: "M 74 96 C 78 114, 72 138, 50 154 L 62 124 Z",
		C: "M 26 96 Q 50 92 74 96 L 68 108 Q 50 104 32 108 Z",
	},
	viewBox: { x: 12, y: 0, width: 76, height: 160 },
	standardWidthPx: 68,
	standardHeightPx: 150,
};

export const UPPER_INCISOR_GEOMETRY: AnatomicalTemplateData = {
	crown: "M 26 96 C 20 110, 18 138, 24 150 C 36 153, 64 153, 76 150 C 82 138, 80 110, 74 96 Q 50 92 26 96 Z",
	root: "M 26 96 C 25 70, 36 36, 50 10 C 64 36, 75 70, 74 96 Z",
	cej: "M 26 96 Q 50 92 74 96",
	fissures: "M 34 146 L 66 146",
	pulpChamber: "M 40 122 C 38 114, 40 100, 46 72 C 48 44, 49 20, 50 10 C 51 20, 52 44, 54 72 C 60 100, 62 114, 60 122 C 56 126, 44 126, 40 122 Z",
	canals: [
		{ id: "Main", nameRu: "Центральный канал", path: "M 50 120 C 50 88, 50 44, 50 10", apex: { x: 50, y: 10 }, defaultLengthMm: 22.5 },
	],
	apexHalos: [{ x: 50, y: 10 }],
	periodontal: {
		boneCrestNormal: "M 22 86 Q 50 82 78 86",
		boneResorptionMild: "M 22 74 Q 50 70 78 74",
		boneResorptionModerate: "M 22 60 Q 50 56 78 60",
		boneResorptionSevere: "M 22 40 Q 50 36 78 40",
		furcationSites: [],
	},
	surfaces: {
		O: "M 32 136 L 68 136 L 76 150 L 24 150 Z",
		V: "M 26 96 C 38 93, 62 93, 74 96 L 68 136 L 32 136 Z",
		L: "M 32 136 L 68 136 L 60 148 L 40 148 Z",
		M: "M 26 96 L 32 136 L 24 150 C 18 136, 20 110, 26 96 Z",
		D: "M 74 96 C 80 110, 82 136, 76 150 L 68 136 Z",
		C: "M 26 96 Q 50 92 74 96 L 68 108 Q 50 104 32 108 Z",
	},
	viewBox: { x: 12, y: 0, width: 76, height: 160 },
	standardWidthPx: 64,
	standardHeightPx: 150,
};
