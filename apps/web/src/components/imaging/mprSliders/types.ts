/**
 * types.ts — Типы свойств элементов управления MPR срезами (Мандат 8b <= 120 строк).
 */

import type { MprProjection, MprWindowPreset } from "@dental/shared";
import type { MprClinicalPreset } from "../../../imagingUiLabels";
import type { MprClinicalPresetFit } from "../../../mprClinicalStatus";

export interface ImagingMprSlidersProps {
	cbctWorkbenchProjections?: string[] | undefined;
	mprProjection?: MprProjection | string | undefined;
	setMprProjection: (proj: MprProjection | string) => void;
	mprControlsReady: boolean;
	mprProjectionLabels: Record<string, string>;
	mprAxisDeg: number;
	mprAxisRangeValue?: string | undefined;
	mprAxisBounds: { min: number; max: number };
	clampMprAxisDeg: (deg: number) => number;
	setMprAxisDeg: (deg: number) => void;
	mprAxisNudgeDeg?: readonly number[] | number[] | undefined;
	formatSignedMprStep: (val: number, unit: string) => string;
	mprAxisPresetDeg?: readonly number[] | number[] | undefined;
	mprSlabMm?: number | undefined;
	mprSlabRangeValue?: string | undefined;
	mprSlabBounds: { min: number; max: number };
	clampMprSlabMm: (mm: number) => number;
	setMprSlabMm: (mm: number) => void;
	mprSlabNudgeMm?: readonly number[] | number[] | undefined;
	mprSlabPresetMm?: readonly number[] | number[] | undefined;
	mprSliceLabel?: string | undefined;
	mprSliceMaxIndex: number;
	mprSafeSliceIndex: number;
	mprSliceRangeValue?: string | undefined;
	clampMprSliceIndex: (idx: number, max: number) => number;
	setMprSliceIndex: (idx: number) => void;
	mprSliceNudgeSteps?: readonly number[] | number[] | undefined;
	mprSlicePresetFractions?:
		| readonly { id: string; label: string; fraction: number }[]
		| { id: string; label: string; fraction: number }[]
		| undefined;
	mprSliceIndexFromFraction: (frac: number, max: number) => number;
	resetMprControls: () => void;
	mprWorkbenchLocalSavedAt?: string | number | Date | null | undefined;
	formatTime: (t: string | number | Date | null | undefined) => string;
	mprWorkbenchDraftRestored?: boolean | undefined;
	restoreMprWorkbenchLocalDraft: () => void;
	mprClinicalPresets?: MprClinicalPreset[] | undefined;
	describeMprClinicalPresetProjectionFallback: (
		presetProjection: string,
		supportedProjections: readonly string[] | undefined,
		labels: Record<string, string>,
	) => string | null;
	mprClinicalPresetButtonClass?: ((preset: MprClinicalPreset) => string) | undefined;
	applyMprClinicalPreset?: ((preset: MprClinicalPreset) => void) | undefined;
	mprNearestClinicalPreset?: MprClinicalPresetFit | null | undefined;
	mprWindowPresetLabels: Record<string, string>;
	mprWindowPreset?: MprWindowPreset | string | undefined;
	setMprWindowPreset: (p: MprWindowPreset | string) => void;
	mprCrosshairEnabled?: boolean | undefined;
	setMprCrosshairEnabled: (en: boolean) => void;
	mprLinkedPlanesEnabled?: boolean | undefined;
	setMprLinkedPlanesEnabled: (en: boolean) => void;
}
