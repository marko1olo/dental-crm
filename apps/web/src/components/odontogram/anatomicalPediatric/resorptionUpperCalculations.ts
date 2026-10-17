/**
 * DENTE Dental CRM — Maxillary Root Resorption Geometries
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type {
	PhysiologicalResorptionGeometry,
	RootResorptionDetail,
	RootResorptionStage,
} from "../anatomicalGeometriesTypes";

export function getUpperResorptionGeometry(
	isMolar: boolean,
	stage: RootResorptionStage,
	stageInfo: RootResorptionDetail,
): PhysiologicalResorptionGeometry {
	if (isMolar) {
		if (stage === 25) {
			return {
				stage: 25, isResorbed: true,
				rootPath: "M 18 84 C 12 66, 12 48, 18 32 Q 26 32 30 42 C 34 52, 36 62, 38 68 C 42 54, 46 40, 50 28 Q 54 40, 58 54 C 60 62, 62 52, 66 42 Q 70 32 78 32 C 84 48, 84 66, 82 84 Z",
				resorptionLinePath: "M 18 32 Q 50 24 78 32",
				resorptionHatchAreaPath: "M 18 32 C 10 48, 10 64, 18 84 Q 50 80 82 84 C 90 64, 90 48, 78 32 Q 50 24 18 32 Z",
				opacity: 0.9, showCanals: true,
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
				stage: 50, isResorbed: true,
				rootPath: "M 18 84 C 14 72, 16 60, 24 50 Q 36 50 42 64 C 44 58, 46 54, 50 46 Q 54 54, 56 64 C 62 50, 74 50, 76 50 C 82 60, 84 72, 82 84 Z",
				resorptionLinePath: "M 24 50 Q 50 42 76 50",
				resorptionHatchAreaPath: "M 24 50 C 18 64, 18 74, 18 84 Q 50 80 82 84 C 82 74, 82 64, 76 50 Q 50 42 24 50 Z",
				opacity: 0.65, showCanals: true,
				canals: [
					{ id: "MB", nameRu: "MB (50% резорбция)", path: "M 36 92 C 32 80, 28 66, 26 52", apex: { x: 26, y: 52 }, defaultLengthMm: 8.0 },
					{ id: "P", nameRu: "P (50% резорбция)", path: "M 50 92 C 50 80, 50 68, 50 48", apex: { x: 50, y: 48 }, defaultLengthMm: 8.5 },
					{ id: "DB", nameRu: "DB (50% резорбция)", path: "M 64 92 C 68 80, 72 66, 74 52", apex: { x: 74, y: 52 }, defaultLengthMm: 8.0 },
				],
				stageInfo,
			};
		}
		return {
			stage: 75, isResorbed: true,
			rootPath: "M 18 84 C 18 78, 22 68, 30 68 Q 50 64 70 68 C 78 68, 82 78, 82 84 Z",
			resorptionLinePath: "M 30 68 Q 50 64 70 68",
			resorptionHatchAreaPath: "M 30 68 C 22 78, 18 78, 18 84 Q 50 80 82 84 C 82 78, 78 78, 70 68 Q 50 64 30 68 Z",
			opacity: 0.35, showCanals: false, canals: [], stageInfo,
		};
	}
	// Резцы и клыки верхней челюсти
	if (stage === 25) {
		return {
			stage: 25, isResorbed: true,
			rootPath: "M 26 84 C 28 66, 36 44, 44 28 Q 50 24 56 28 C 64 44, 72 66, 74 84 Z",
			resorptionLinePath: "M 44 28 Q 50 24 56 28",
			resorptionHatchAreaPath: "M 44 28 C 36 44, 28 66, 26 84 Q 50 80 74 84 C 72 66, 64 44, 56 28 Q 50 24 44 28 Z",
			opacity: 0.9, showCanals: true,
			canals: [{ id: "Main", nameRu: "Канал (25% резорбция)", path: "M 50 88 C 50 68, 50 48, 50 28", apex: { x: 50, y: 28 }, defaultLengthMm: 14.0 }],
			stageInfo,
		};
	}
	if (stage === 50) {
		return {
			stage: 50, isResorbed: true,
			rootPath: "M 26 84 C 30 70, 36 58, 42 48 Q 50 44 58 48 C 64 58, 70 70, 74 84 Z",
			resorptionLinePath: "M 42 48 Q 50 44 58 48",
			resorptionHatchAreaPath: "M 42 48 C 36 58, 30 70, 26 84 Q 50 80 74 84 C 70 70, 64 58, 58 48 Q 50 44 42 48 Z",
			opacity: 0.65, showCanals: true,
			canals: [{ id: "Main", nameRu: "Канал (50% резорбция)", path: "M 50 88 C 50 74, 50 62, 50 48", apex: { x: 50, y: 48 }, defaultLengthMm: 9.5 }],
			stageInfo,
		};
	}
	return {
		stage: 75, isResorbed: true,
		rootPath: "M 26 84 C 28 76, 36 68, 42 66 Q 50 64 58 66 C 64 68, 72 76, 74 84 Z",
		resorptionLinePath: "M 42 66 Q 50 64 58 66",
		resorptionHatchAreaPath: "M 42 66 C 36 68, 28 76, 26 84 Q 50 80 74 84 C 72 76, 64 68, 58 66 Q 50 64 42 66 Z",
		opacity: 0.35, showCanals: false, canals: [], stageInfo,
	};
}
