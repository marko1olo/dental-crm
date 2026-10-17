/**
 * DENTE Dental CRM — Anatomical Tooth SVG Props Types
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type React from "react";
import type { ToothState } from "../ToothChart";
import type {
	CanalObturationMaterial,
	FurcationGrade,
	PeriodontalBoneLossPattern,
	PostCoreType,
	RestorativeMaterialKey,
	RootResorptionStage,
} from "../anatomicalGeometriesTypes";

export interface AnatomicalToothSVGProps {
	number: number;
	state: ToothState;
	scale: number;
	material?: RestorativeMaterialKey | undefined;
	isPontic?: boolean | undefined;
	bridgeMaterial?: RestorativeMaterialKey | undefined;
	canalObturation?: CanalObturationMaterial | undefined;
	canalObturationLevel?: "full" | "two_thirds" | "half" | undefined;
	periapicalLesionSize?: "small" | "medium" | "large" | 6 | 10 | 16 | undefined;
	hasFracture?: boolean | undefined;
	hasApicoectomy?: boolean | undefined;
	hasPost?: boolean | undefined;
	postType?: PostCoreType | undefined;
	boneLossLevel?: number | undefined;
	boneLossType?: PeriodontalBoneLossPattern | undefined;
	furcation?: FurcationGrade | undefined;
	mobility?: 0 | 1 | 2 | 3 | undefined;
	gingivalRecession?: number | undefined;
	bopSites?: string[] | undefined;
	suppurationSites?: string[] | undefined;
	periapicalLesion?: boolean | undefined;
	rootResorptionStage?: RootResorptionStage | undefined;
	rootResorption?: RootResorptionStage | undefined;
	pocketDepth?: number | undefined;
	isSelected?: boolean | undefined;
	onClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	pediatricMode?: boolean | undefined;
	surfaces?: readonly string[] | undefined;
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
}
