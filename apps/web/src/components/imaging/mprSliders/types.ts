/**
 * types.ts — Типы свойств элементов управления MPR срезами (Мандат 8b <= 120 строк).
 */

import type { MprWindowPreset } from "../types";

export interface ImagingMprSlidersProps {
	cbctWorkbenchProjections?: string[] | undefined;
	mprProjection?: string | undefined;
	setMprProjection: (proj: string) => void;
	mprControlsReady: boolean;
	mprProjectionLabels: Record<string, string>;
	mprAxisDeg: number;
	mprAxisRangeValue?: string | undefined;
	mprAxisBounds: { min: number; max: number };
	clampMprAxisDeg: (deg: number) => number;
	setMprAxisDeg: (deg: number) => void;
	mprAxisNudgeDeg?: number[] | undefined;
	formatSignedMprStep: (val: number, unit: string) => string;
	mprAxisPresetDeg?: number[] | undefined;
	mprSlabMm?: number | undefined;
	mprSlabRangeValue?: string | undefined;
	mprSlabBounds: { min: number; max: number };
	clampMprSlabMm: (mm: number) => number;
	setMprSlabMm: (mm: number) => void;
	mprSlabNudgeMm?: number[] | undefined;
	mprSlabPresetMm?: number[] | undefined;
	mprSliceLabel?: string | undefined;
	mprSliceMaxIndex: number;
	mprSafeSliceIndex: number;
	mprSliceRangeValue?: string | undefined;
	clampMprSliceIndex: (idx: number, max: number) => number;
	setMprSliceIndex: (idx: number) => void;
	mprSliceNudgeSteps?: number[] | undefined;
	mprSlicePresetFractions?: any[] | undefined;
	mprSliceIndexFromFraction: (frac: number, max: number) => number;
	resetMprControls: () => void;
	mprWorkbenchLocalSavedAt?: any;
	formatTime: (t: any) => string;
	mprWorkbenchDraftRestored?: boolean | undefined;
	restoreMprWorkbenchLocalDraft: () => void;
	mprClinicalPresets?: any[] | undefined;
	describeMprClinicalPresetProjectionFallback: any;
	mprClinicalPresetButtonClass?: any;
	applyMprClinicalPreset?: any;
	mprNearestClinicalPreset?: any;
	mprWindowPresetLabels: Record<string, string>;
	mprWindowPreset?: any;
	setMprWindowPreset: (p: any) => void;
	mprCrosshairEnabled?: boolean | undefined;
	setMprCrosshairEnabled: (en: boolean) => void;
	mprLinkedPlanesEnabled?: boolean | undefined;
	setMprLinkedPlanesEnabled: (en: boolean) => void;
}
