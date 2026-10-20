import type {
	AttritionWearDegree,
	MobilityGrade,
	RecessionSeverity,
	SplintMaterial,
	ToothLowerNumber,
} from "../lower/toothLowerTypes";

export interface LowerIncisorWearOverlayProps {
	degree?: AttritionWearDegree | undefined;
	toothNumber?: ToothLowerNumber | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export interface LowerIncisorAbfractionOverlayProps {
	toothNumber?: ToothLowerNumber | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export interface FrontalSplintingOverlayProps {
	splintType?: SplintMaterial | undefined;
	toothNumber?: ToothLowerNumber | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export interface LowerIncisorPeriodontalOverlayProps {
	recessionLevel?: RecessionSeverity | undefined;
	mobilityGrade?: MobilityGrade | undefined;
	toothNumber?: ToothLowerNumber | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}
