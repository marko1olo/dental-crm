/**
 * DENTE Dental CRM — Physiological Root Resorption Geometry Dispatcher
 * Compliant with Mandate 8b (<= 120 lines).
 */

import {
	type PhysiologicalResorptionGeometry,
	ROOT_RESORPTION_STAGES,
	type RootResorptionStage,
} from "../anatomicalGeometriesTypes";
import { resolveFallbackGeometry } from "./resorptionGeometryResolver";
import { getLowerResorptionGeometry } from "./resorptionLowerCalculations";
import { getUpperResorptionGeometry } from "./resorptionUpperCalculations";

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
		return getUpperResorptionGeometry(isMolar, stage, stageInfo);
	}
	return getLowerResorptionGeometry(isMolar, stage, stageInfo);
}
