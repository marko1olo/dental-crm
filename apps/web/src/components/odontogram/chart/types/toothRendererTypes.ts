import type React from "react";
import type { ToothState } from "../toothChartTypes";
import type { EndoToothClinicalData } from "../../../endo/EndoCanalLogModal";
import type {
	DentitionMode,
} from "../../pediatricDentitionEngine";
import {
	type CanalObturationMaterial,
	type FurcationGrade,
	type PeriodontalBoneLossPattern,
	type PostCoreType,
	type RestorativeMaterialKey,
	type RootResorptionStage,
	getFurcationMarkerSvg,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
	ROOT_RESORPTION_STAGES,
} from "../../anatomicalToothGeometries";
import type { OdontogramQuadrantId } from "./toothQuadrantTypes";

export * from "./toothQuadrantTypes";
export * from "./toothNumberConstants";
export * from "./areToothChartPropsEqual";

export {
	getFurcationMarkerSvg,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
	ROOT_RESORPTION_STAGES,
};

export type {
	CanalObturationMaterial,
	FurcationGrade,
	PeriodontalBoneLossPattern,
	PostCoreType,
	RestorativeMaterialKey,
	DentitionMode,
	RootResorptionStage,
};

export interface ToothData {
	toothNumber: number;
	state: ToothState;
	surfaces?: string[] | undefined;
	material?: RestorativeMaterialKey;
	canalObturation?: CanalObturationMaterial;
	hasPost?: boolean;
	postType?: PostCoreType;
	boneLossLevel?: number;
	boneLossType?: PeriodontalBoneLossPattern;
	furcationGrade?: FurcationGrade;
	furcation?: FurcationGrade;
	rootResorptionStage?: RootResorptionStage;
	rootResorption?: RootResorptionStage;
	mobility?: 0 | 1 | 2 | 3;
	gingivalRecession?: number;
	bopSites?: string[];
	suppurationSites?: string[];
	periapicalLesion?: boolean;
	pocketDepth?: number;
	pocketDepthMm?: number;
	maxPocketDepth?: number;
	canalCount?: number;
	notes?: string;
	clinicalData?: EndoToothClinicalData | Record<string, unknown>;
	bridgeRole?: "pillar" | "pontic" | null;
	canalObturationLevel?: "full" | "two_thirds" | "half";
	periapicalLesionSize?: "small" | "medium" | "large" | 6 | 10 | 16;
	hasFracture?: boolean;
	hasApicoectomy?: boolean;
	stageBadge?: string | undefined;
	updatedAt?: string;
}

export interface ToothChartProps {
	teethData?: ToothData[] | undefined;
	patientId?: string | undefined;
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	dentitionMode?: DentitionMode | undefined;
	onDentitionModeChange?: ((mode: DentitionMode) => void) | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onToothClick?: ((num: number, rect?: DOMRect, surface?: string | undefined) => void) | ((e: React.MouseEvent, num: number) => void) | undefined;
	onToothContextMenu?: ((e: React.MouseEvent, num: number) => void) | undefined;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
	onSurfacesChange?: ((targets: number[], surfaces: readonly string[]) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	hideQuadrantSwitcher?: boolean | undefined;
	hideDentitionSwitcher?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	activeQuadrant?: OdontogramQuadrantId | undefined;
	onQuadrantChange?: ((quadrant: OdontogramQuadrantId) => void) | undefined;
	onMarkIntactDentition?: (() => void) | undefined;
	onMarkWisdomTeethMissing?: (() => void) | undefined;
	onMarkMolarsMissing?: (() => void) | undefined;
	onMarkFrontIntact?: (() => void) | undefined;
	onMarkProHygieneDone?: ((protocol?: unknown) => void) | undefined;
	onApplyFastCariesK021?: ((protocol?: unknown) => void) | undefined;
	hideExpressActions?: boolean | undefined;
	className?: string | undefined;
}
