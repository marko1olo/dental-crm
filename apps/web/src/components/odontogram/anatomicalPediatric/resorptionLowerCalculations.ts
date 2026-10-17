/**
 * DENTE Dental CRM — Mandibular Root Resorption Geometries
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type {
	PhysiologicalResorptionGeometry,
	RootResorptionDetail,
	RootResorptionStage,
} from "../anatomicalGeometriesTypes";

export function getLowerResorptionGeometry(
	isMolar: boolean,
	stage: RootResorptionStage,
	stageInfo: RootResorptionDetail,
): PhysiologicalResorptionGeometry {
	if (isMolar) {
		if (stage === 25) {
			return {
				stage: 25, isResorbed: true,
				rootPath: "M 18 76 C 12 94, 12 112, 18 126 Q 26 126 30 116 C 36 104, 42 96, 50 88 C 58 96, 64 104, 70 116 Q 74 126 82 126 C 88 112, 88 94, 82 76 Z",
				resorptionLinePath: "M 18 126 Q 50 134 82 126",
				resorptionHatchAreaPath: "M 18 76 C 10 96, 10 112, 18 126 Q 50 134 82 126 C 90 112, 90 96, 82 76 Z",
				opacity: 0.9, showCanals: true,
				canals: [
					{ id: "M", nameRu: "M (25% резорбция)", path: "M 36 68 C 28 84, 22 104, 20 124", apex: { x: 20, y: 124 }, defaultLengthMm: 12.0 },
					{ id: "D", nameRu: "D (25% резорбция)", path: "M 64 68 C 72 84, 78 104, 80 124", apex: { x: 80, y: 124 }, defaultLengthMm: 12.0 },
				],
				stageInfo,
			};
		}
		if (stage === 50) {
			return {
				stage: 50, isResorbed: true,
				rootPath: "M 18 76 C 14 88, 16 98, 24 108 Q 36 108 42 96 C 44 100, 46 104, 50 112 C 54 104, 56 100, 58 96 Q 64 108 76 108 C 84 98, 86 88, 82 76 Z",
				resorptionLinePath: "M 24 108 Q 50 116 76 108",
				resorptionHatchAreaPath: "M 18 76 C 16 88, 18 98, 24 108 Q 50 116 76 108 C 82 98, 84 88, 82 76 Z",
				opacity: 0.65, showCanals: true,
				canals: [
					{ id: "M", nameRu: "M (50% резорбция)", path: "M 36 68 C 30 80, 26 94, 26 106", apex: { x: 26, y: 106 }, defaultLengthMm: 8.0 },
					{ id: "D", nameRu: "D (50% резорбция)", path: "M 64 68 C 70 80, 74 94, 74 106", apex: { x: 74, y: 106 }, defaultLengthMm: 8.0 },
				],
				stageInfo,
			};
		}
		return {
			stage: 75, isResorbed: true,
			rootPath: "M 18 76 C 18 82, 22 92, 30 92 Q 50 96 70 92 C 78 92, 82 82, 82 76 Z",
			resorptionLinePath: "M 30 92 Q 50 96 70 92",
			resorptionHatchAreaPath: "M 18 76 C 18 82, 22 92, 30 92 Q 50 96 70 92 C 78 92, 82 82, 82 76 Z",
			opacity: 0.35, showCanals: false, canals: [], stageInfo,
		};
	}
	// Резцы и клыки нижней челюсти
	if (stage === 25) {
		return {
			stage: 25, isResorbed: true,
			rootPath: "M 28 64 C 30 84, 36 108, 44 130 Q 50 134 56 130 C 64 108, 70 84, 72 64 Z",
			resorptionLinePath: "M 44 130 Q 50 134 56 130",
			resorptionHatchAreaPath: "M 28 64 C 28 86, 36 108, 44 130 Q 50 134 56 130 C 64 108, 72 86, 72 64 Z",
			opacity: 0.9, showCanals: true,
			canals: [{ id: "Main", nameRu: "Канал (25% резорбция)", path: "M 50 68 C 50 88, 50 108, 50 128", apex: { x: 50, y: 128 }, defaultLengthMm: 12.5 }],
			stageInfo,
		};
	}
	if (stage === 50) {
		return {
			stage: 50, isResorbed: true,
			rootPath: "M 28 64 C 30 78, 36 94, 42 108 Q 50 112 58 108 C 64 94, 70 78, 72 64 Z",
			resorptionLinePath: "M 42 108 Q 50 112 58 108",
			resorptionHatchAreaPath: "M 28 64 C 30 78, 36 94, 42 108 Q 50 112 58 108 C 64 94, 70 78, 72 64 Z",
			opacity: 0.65, showCanals: true,
			canals: [{ id: "Main", nameRu: "Канал (50% резорбция)", path: "M 50 68 C 50 82, 50 96, 50 106", apex: { x: 50, y: 106 }, defaultLengthMm: 8.5 }],
			stageInfo,
		};
	}
	return {
		stage: 75, isResorbed: true,
		rootPath: "M 28 64 C 30 72, 36 78, 42 84 Q 50 88 58 84 C 64 78, 70 72, 72 64 Z",
		resorptionLinePath: "M 42 84 Q 50 88 58 84",
		resorptionHatchAreaPath: "M 28 64 C 30 72, 36 78, 42 84 Q 50 88 58 84 C 64 78, 70 72, 72 64 Z",
		opacity: 0.35, showCanals: false, canals: [], stageInfo,
	};
}
