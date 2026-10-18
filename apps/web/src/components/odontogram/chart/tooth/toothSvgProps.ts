import type React from "react";
import type {
	CanalObturationMaterial,
	PeriodontalBoneLossPattern,
	PostCoreType,
	RestorativeMaterialKey,
	RootResorptionStage,
} from "../../anatomicalToothGeometries";
import type { ToothState } from "../toothChartTypes";

export interface ToothSvgProps {
	number: number;
	state: ToothState;
	scale: number;
	material?: RestorativeMaterialKey | undefined;
	canalObturation?: CanalObturationMaterial | undefined;
	hasPost?: boolean | undefined;
	postType?: PostCoreType | undefined;
	boneLossLevel?: number | undefined;
	boneLossType?: PeriodontalBoneLossPattern | undefined;
	rootResorptionStage?: RootResorptionStage | number | undefined;
	periapicalLesion?: boolean | undefined;
	pocketDepth?: number | undefined;
	pocketDepthMm?: number | undefined;
	maxPocketDepth?: number | undefined;
	isSelected?: boolean | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
	pediatricMode?: boolean | undefined;
	surfaces?: readonly string[] | undefined;
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
}
