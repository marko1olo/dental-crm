/**
 * DENTE Dental CRM — Anatomical Pediatric Dentition SVG Geometries
 *
 * SVG geometries, physiological resorption stages (0..100%), and tooth numbers
 * for primary (deciduous) and mixed dentition.
 */

import type {
	AnatomicalTemplateData,
	CanalDefinition,
	PhysiologicalResorptionGeometry,
	RootResorptionStage,
} from "./anatomicalGeometriesTypes";
import { ROOT_RESORPTION_STAGES } from "./anatomicalGeometriesTypes";
import {
	LOWER_CANINE_GEOMETRY,
	LOWER_INCISOR_GEOMETRY,
	UPPER_CANINE_GEOMETRY,
	UPPER_INCISOR_GEOMETRY,
} from "./anatomicalAdultGeometries";

// --- 9. МОЛОЧНЫЕ ВЕРХНИЕ МОЛЯРЫ (54, 55, 64, 65) ---
// 3 широко расставленных корня для зачатка премоляра
export const PEDIATRIC_UPPER_MOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 18 84 C 12 96, 10 128, 28 138 C 36 142, 48 140, 50 134 C 52 140, 64 142, 72 138 C 90 128, 88 96, 82 84 Q 50 80 18 84 Z",
	root:
		"M 18 84 C 10 64, 10 38, 16 18 C 24 30, 32 48, 36 66 C 42 48, 46 28, 50 14 C 54 28, 58 48, 64 66 C 68 48, 76 30, 84 18 C 90 38, 90 64, 82 84 Z",
	cej: "M 18 84 Q 50 80 82 84",
	fissures: "M 30 124 Q 50 130 70 124 M 50 110 L 50 132",
	pulpChamber: "M 30 114 C 28 104, 32 94, 38 86 C 44 82, 56 82, 62 86 C 68 94, 72 104, 70 114 C 64 118, 36 118, 30 114 Z",
	canals: [
		{
			id: "MB",
			nameRu: "Медиально-щечный (MB)",
			path: "M 36 92 C 30 70, 20 44, 16 18",
			apex: { x: 16, y: 18 },
			defaultLengthMm: 16.5,
		},
		{
			id: "P",
			nameRu: "Нёбный (Palatal)",
			path: "M 50 92 C 50 70, 50 38, 50 14",
			apex: { x: 50, y: 14 },
			defaultLengthMm: 17.5,
		},
		{
			id: "DB",
			nameRu: "Дистально-щечный (DB)",
			path: "M 64 92 C 70 70, 80 44, 84 18",
			apex: { x: 84, y: 18 },
			defaultLengthMm: 16.0,
		},
	],
	apexHalos: [
		{ x: 16, y: 18 },
		{ x: 50, y: 14 },
		{ x: 84, y: 18 },
	],
	periodontal: {
		boneCrestNormal: "M 14 76 Q 50 72 86 76",
		boneResorptionMild: "M 14 66 Q 50 62 86 66",
		boneResorptionModerate: "M 14 54 Q 50 50 86 54",
		boneResorptionSevere: "M 14 38 Q 50 34 86 38",
		furcationSites: [
			{
				id: "Pediatric_Trifurcation",
				nameRu: "Дивергирующая трифуркация молочного моляра",
				position: { x: 50, y: 66 },
				type: "trifurcation_buccal" as const,
			},
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

// --- 10. МОЛОЧНЫЕ НИЖНИЕ МОЛЯРЫ (74, 75, 84, 85) ---
// 2 широко дивергирующих корня
export const PEDIATRIC_LOWER_MOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 18 76 C 12 64, 10 32, 28 22 C 36 18, 48 20, 50 26 C 52 20, 64 18, 72 22 C 90 32, 88 64, 82 76 Q 50 80 18 76 Z",
	root:
		"M 18 76 C 10 96, 10 122, 16 142 C 26 130, 36 110, 50 90 C 64 110, 74 130, 84 142 C 90 122, 90 96, 82 76 Z",
	cej: "M 18 76 Q 50 80 82 76",
	fissures: "M 30 36 Q 50 30 70 36 M 50 50 L 50 28",
	pulpChamber: "M 30 46 C 28 56, 32 66, 38 74 C 44 78, 56 78, 62 74 C 68 66, 72 56, 70 46 C 64 42, 36 42, 30 46 Z",
	canals: [
		{
			id: "M",
			nameRu: "Медиальный канал (M)",
			path: "M 36 68 C 28 88, 20 116, 16 142",
			apex: { x: 16, y: 142 },
			defaultLengthMm: 16.0,
		},
		{
			id: "D",
			nameRu: "Дистальный канал (D)",
			path: "M 64 68 C 72 88, 80 116, 84 142",
			apex: { x: 84, y: 142 },
			defaultLengthMm: 16.0,
		},
	],
	apexHalos: [
		{ x: 16, y: 142 },
		{ x: 84, y: 142 },
	],
	periodontal: {
		boneCrestNormal: "M 14 84 Q 50 88 86 84",
		boneResorptionMild: "M 14 94 Q 50 98 86 94",
		boneResorptionModerate: "M 14 106 Q 50 110 86 106",
		boneResorptionSevere: "M 14 122 Q 50 126 86 122",
		furcationSites: [
			{
				id: "Pediatric_Bifurcation",
				nameRu: "Дивергирующая бифуркация нижнего молочного моляра",
				position: { x: 50, y: 90 },
				type: "bifurcation" as const,
			},
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

let _geometryResolver: ((fdi: number) => { rootPath: string; canals: readonly CanalDefinition[] }) | null = null;

export function registerGeometryResolver(
	fn: (fdi: number) => { rootPath: string; canals: readonly CanalDefinition[] },
): void {
	_geometryResolver = fn;
}

function resolveFallbackGeometry(fdiNumber: number): { rootPath: string; canals: readonly CanalDefinition[] } {
	if (_geometryResolver) {
		return _geometryResolver(fdiNumber);
	}
	const quadrant = Math.floor(fdiNumber / 10);
	const isTop = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
	const pos = fdiNumber % 10;
	if (pos === 4 || pos === 5) {
		return isTop
			? { rootPath: PEDIATRIC_UPPER_MOLAR_GEOMETRY.root, canals: PEDIATRIC_UPPER_MOLAR_GEOMETRY.canals }
			: { rootPath: PEDIATRIC_LOWER_MOLAR_GEOMETRY.root, canals: PEDIATRIC_LOWER_MOLAR_GEOMETRY.canals };
	}
	if (pos === 3) {
		return isTop
			? { rootPath: UPPER_CANINE_GEOMETRY.root, canals: UPPER_CANINE_GEOMETRY.canals }
			: { rootPath: LOWER_CANINE_GEOMETRY.root, canals: LOWER_CANINE_GEOMETRY.canals };
	}
	return isTop
		? { rootPath: UPPER_INCISOR_GEOMETRY.root, canals: UPPER_INCISOR_GEOMETRY.canals }
		: { rootPath: LOWER_INCISOR_GEOMETRY.root, canals: LOWER_INCISOR_GEOMETRY.canals };
}

/**
 * Расчет физиологической резорбции корней молочных зубов (0%, 25%, 50%, 75%, 100%).
 */
export function getPhysiologicalRootResorptionGeometry(
	fdiNumber: number,
	stage: RootResorptionStage = 0,
): PhysiologicalResorptionGeometry {
	const quadrant = Math.floor(fdiNumber / 10);
	const isPediatric = quadrant >= 5 && quadrant <= 8;
	const isTop = quadrant === 5 || quadrant === 6;
	const pos = fdiNumber % 10;
	const isMolar = pos === 4 || pos === 5;
	const stageInfo = ROOT_RESORPTION_STAGES[stage] ?? ROOT_RESORPTION_STAGES[0];

	if (!isPediatric || stage === 0) {
		const fullGeom = resolveFallbackGeometry(fdiNumber);
		return {
			stage,
			isResorbed: false,
			rootPath: fullGeom.rootPath,
			opacity: 1.0,
			showCanals: true,
			canals: fullGeom.canals,
			stageInfo,
		};
	}

	if (stage === 100) {
		return {
			stage: 100,
			isResorbed: true,
			rootPath: "",
			opacity: 0,
			showCanals: false,
			canals: [],
			stageInfo,
		};
	}

	if (isTop) {
		if (isMolar) {
			if (stage === 25) {
				return {
					stage: 25,
					isResorbed: true,
					rootPath:
						"M 18 84 C 12 66, 12 48, 18 32 Q 26 32 30 42 C 34 52, 36 62, 38 68 C 42 54, 46 40, 50 28 Q 54 40, 58 54 C 60 62, 62 52, 66 42 Q 70 32 78 32 C 84 48, 84 66, 82 84 Z",
					resorptionLinePath: "M 18 32 Q 50 24 78 32",
					resorptionHatchAreaPath:
						"M 18 32 C 10 48, 10 64, 18 84 Q 50 80 82 84 C 90 64, 90 48, 78 32 Q 50 24 18 32 Z",
					opacity: 0.9,
					showCanals: true,
					canals: [
						{ id: "MB", nameRu: "MB (25% резорбция)", path: "M 36 92 C 30 76, 24 58, 20 36", apex: { x: 20, y: 36 }, defaultLengthMm: 12.0 },
						{ id: "P", nameRu: "P (25% резорбция)", path: "M 50 92 C 50 76, 50 54, 50 32", apex: { x: 50, y: 32 }, defaultLengthMm: 13.0 },
						{ id: "DB", nameRu: "DB (25% резорбция)", path: "M 64 92 C 70 76, 76 58, 80 36", apex: { x: 80, y: 36 }, defaultLengthMm: 12.0 },
					],
					stageInfo,
				};
			}
			if (stage === 50) {
				return {
					stage: 50,
					isResorbed: true,
					rootPath:
						"M 18 84 C 14 72, 16 60, 24 50 Q 36 50 42 64 C 44 58, 46 54, 50 46 Q 54 54, 56 64 C 62 50, 74 50, 76 50 C 82 60, 84 72, 82 84 Z",
					resorptionLinePath: "M 24 50 Q 50 42 76 50",
					resorptionHatchAreaPath:
						"M 24 50 C 18 64, 18 74, 18 84 Q 50 80 82 84 C 82 74, 82 64, 76 50 Q 50 42 24 50 Z",
					opacity: 0.65,
					showCanals: true,
					canals: [
						{ id: "MB", nameRu: "MB (50% резорбция)", path: "M 36 92 C 32 80, 28 66, 26 52", apex: { x: 26, y: 52 }, defaultLengthMm: 8.0 },
						{ id: "P", nameRu: "P (50% резорбция)", path: "M 50 92 C 50 80, 50 68, 50 48", apex: { x: 50, y: 48 }, defaultLengthMm: 8.5 },
						{ id: "DB", nameRu: "DB (50% резорбция)", path: "M 64 92 C 68 80, 72 66, 74 52", apex: { x: 74, y: 52 }, defaultLengthMm: 8.0 },
					],
					stageInfo,
				};
			}
			return {
				stage: 75,
				isResorbed: true,
				rootPath:
					"M 18 84 C 18 78, 22 68, 30 68 Q 50 64 70 68 C 78 68, 82 78, 82 84 Z",
				resorptionLinePath: "M 30 68 Q 50 64 70 68",
				resorptionHatchAreaPath:
					"M 30 68 C 22 78, 18 78, 18 84 Q 50 80 82 84 C 82 78, 78 78, 70 68 Q 50 64 30 68 Z",
				opacity: 0.35,
				showCanals: false,
				canals: [],
				stageInfo,
			};
		}
		// Верхние молочные резцы и клыки (51, 52, 53, 61, 62, 63)
		if (stage === 25) {
			return {
				stage: 25,
				isResorbed: true,
				rootPath:
					"M 26 84 C 28 66, 36 44, 44 28 Q 50 24 56 28 C 64 44, 72 66, 74 84 Z",
				resorptionLinePath: "M 44 28 Q 50 24 56 28",
				resorptionHatchAreaPath:
					"M 44 28 C 36 44, 28 66, 26 84 Q 50 80 74 84 C 72 66, 64 44, 56 28 Q 50 24 44 28 Z",
				opacity: 0.9,
				showCanals: true,
				canals: [
					{ id: "Main", nameRu: "Канал (25% резорбция)", path: "M 50 88 C 50 68, 50 48, 50 28", apex: { x: 50, y: 28 }, defaultLengthMm: 14.0 },
				],
				stageInfo,
			};
		}
		if (stage === 50) {
			return {
				stage: 50,
				isResorbed: true,
				rootPath:
					"M 26 84 C 30 70, 36 58, 42 48 Q 50 44 58 48 C 64 58, 70 70, 74 84 Z",
				resorptionLinePath: "M 42 48 Q 50 44 58 48",
				resorptionHatchAreaPath:
					"M 42 48 C 36 58, 30 70, 26 84 Q 50 80 74 84 C 70 70, 64 58, 58 48 Q 50 44 42 48 Z",
				opacity: 0.65,
				showCanals: true,
				canals: [
					{ id: "Main", nameRu: "Канал (50% резорбция)", path: "M 50 88 C 50 74, 50 62, 50 48", apex: { x: 50, y: 48 }, defaultLengthMm: 9.5 },
				],
				stageInfo,
			};
		}
		return {
			stage: 75,
			isResorbed: true,
			rootPath:
				"M 26 84 C 28 76, 36 68, 42 66 Q 50 64 58 66 C 64 68, 72 76, 74 84 Z",
			resorptionLinePath: "M 42 66 Q 50 64 58 66",
			resorptionHatchAreaPath:
				"M 42 66 C 36 68, 28 76, 26 84 Q 50 80 74 84 C 72 76, 64 68, 58 66 Q 50 64 42 66 Z",
			opacity: 0.35,
			showCanals: false,
			canals: [],
			stageInfo,
		};
	} else {
		// Нижняя челюсть (71..75, 81..85)
		if (isMolar) {
			if (stage === 25) {
				return {
					stage: 25,
					isResorbed: true,
					rootPath:
						"M 18 76 C 12 94, 12 112, 18 126 Q 26 126 30 116 C 36 104, 42 96, 50 88 C 58 96, 64 104, 70 116 Q 74 126 82 126 C 88 112, 88 94, 82 76 Z",
					resorptionLinePath: "M 18 126 Q 50 134 82 126",
					resorptionHatchAreaPath:
						"M 18 76 C 10 96, 10 112, 18 126 Q 50 134 82 126 C 90 112, 90 96, 82 76 Z",
					opacity: 0.9,
					showCanals: true,
					canals: [
						{ id: "M", nameRu: "M (25% резорбция)", path: "M 36 68 C 28 84, 22 104, 20 124", apex: { x: 20, y: 124 }, defaultLengthMm: 12.0 },
						{ id: "D", nameRu: "D (25% резорбция)", path: "M 64 68 C 72 84, 78 104, 80 124", apex: { x: 80, y: 124 }, defaultLengthMm: 12.0 },
					],
					stageInfo,
				};
			}
			if (stage === 50) {
				return {
					stage: 50,
					isResorbed: true,
					rootPath:
						"M 18 76 C 14 88, 16 98, 24 108 Q 36 108 42 96 C 44 100, 46 104, 50 112 C 54 104, 56 100, 58 96 Q 64 108 76 108 C 84 98, 86 88, 82 76 Z",
					resorptionLinePath: "M 24 108 Q 50 116 76 108",
					resorptionHatchAreaPath:
						"M 18 76 C 16 88, 18 98, 24 108 Q 50 116 76 108 C 82 98, 84 88, 82 76 Z",
					opacity: 0.65,
					showCanals: true,
					canals: [
						{ id: "M", nameRu: "M (50% резорбция)", path: "M 36 68 C 30 80, 26 94, 26 106", apex: { x: 26, y: 106 }, defaultLengthMm: 8.0 },
						{ id: "D", nameRu: "D (50% резорбция)", path: "M 64 68 C 70 80, 74 94, 74 106", apex: { x: 74, y: 106 }, defaultLengthMm: 8.0 },
					],
					stageInfo,
				};
			}
			return {
				stage: 75,
				isResorbed: true,
				rootPath:
					"M 18 76 C 18 82, 22 92, 30 92 Q 50 96 70 92 C 78 92, 82 82, 82 76 Z",
				resorptionLinePath: "M 30 92 Q 50 96 70 92",
				resorptionHatchAreaPath:
					"M 18 76 C 18 82, 22 92, 30 92 Q 50 96 70 92 C 78 92, 82 82, 82 76 Z",
				opacity: 0.35,
				showCanals: false,
				canals: [],
				stageInfo,
			};
		}
		// Нижние молочные резцы и клыки (71, 72, 73, 81, 82, 83)
		if (stage === 25) {
			return {
				stage: 25,
				isResorbed: true,
				rootPath:
					"M 28 64 C 30 84, 36 108, 44 130 Q 50 134 56 130 C 64 108, 70 84, 72 64 Z",
				resorptionLinePath: "M 44 130 Q 50 134 56 130",
				resorptionHatchAreaPath:
					"M 28 64 C 28 86, 36 108, 44 130 Q 50 134 56 130 C 64 108, 72 86, 72 64 Z",
				opacity: 0.9,
				showCanals: true,
				canals: [
					{ id: "Main", nameRu: "Канал (25% резорбция)", path: "M 50 68 C 50 88, 50 108, 50 128", apex: { x: 50, y: 128 }, defaultLengthMm: 12.5 },
				],
				stageInfo,
			};
		}
		if (stage === 50) {
			return {
				stage: 50,
				isResorbed: true,
				rootPath:
					"M 28 64 C 30 78, 36 94, 42 108 Q 50 112 58 108 C 64 94, 70 78, 72 64 Z",
				resorptionLinePath: "M 42 108 Q 50 112 58 108",
				resorptionHatchAreaPath:
					"M 28 64 C 30 78, 36 94, 42 108 Q 50 112 58 108 C 64 94, 70 78, 72 64 Z",
				opacity: 0.65,
				showCanals: true,
				canals: [
					{ id: "Main", nameRu: "Канал (50% резорбция)", path: "M 50 68 C 50 82, 50 96, 50 106", apex: { x: 50, y: 106 }, defaultLengthMm: 8.5 },
				],
				stageInfo,
			};
		}
		return {
			stage: 75,
			isResorbed: true,
			rootPath:
				"M 28 64 C 30 72, 36 78, 42 84 Q 50 88 58 84 C 64 78, 70 72, 72 64 Z",
			resorptionLinePath: "M 42 84 Q 50 88 58 84",
			resorptionHatchAreaPath:
				"M 28 64 C 30 72, 36 78, 42 84 Q 50 88 58 84 C 64 78, 70 72, 72 64 Z",
			opacity: 0.35,
			showCanals: false,
			canals: [],
			stageInfo,
		};
	}
}

/**
 * Все 20 молочных зубов ребенка (FDI).
 */
export const PEDIATRIC_UPPER_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65] as const;
export const PEDIATRIC_LOWER_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] as const;

/**
 * Сменный прикус (Mixed Dentition).
 */
export const MIXED_UPPER_TEETH = [
	16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26,
] as const;

export const MIXED_LOWER_TEETH = [
	46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36,
] as const;
