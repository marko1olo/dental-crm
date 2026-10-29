/**
 * VisiographTopToolbarTypes.ts
 * Types and interfaces for VisiographTopToolbar (Mandates 8b, 8e).
 */

import type React from "react";
import type { ClinicalVisiographFilterPreset } from "./VisiographWindowPresets";
import type { ActiveVisiographToolType } from "./VisiographInteractiveOverlay";
import type { VisiographImageParams } from "./VisiographImageProcessor";
import type { DentalSensorPreset } from "./VisiographMeasurementMath";

export type SensorPresetItem = DentalSensorPreset;

export interface VisiographTopToolbarProps {
	activeTool: ActiveVisiographToolType;
	setActiveTool: (tool: ActiveVisiographToolType) => void;
	onClearDrawing: () => void;
	params: VisiographImageParams;
	setParams: React.Dispatch<React.SetStateAction<VisiographImageParams>>;
	activeClinicalFilter: string | null;
	onApplyClinicalFilter: (filter: ClinicalVisiographFilterPreset) => void;
	canvasZoom: number;
	setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
	setCanvasRotationDeg: React.Dispatch<React.SetStateAction<number>>;
	sensorPresets: readonly SensorPresetItem[];
	activeSensorPresetId: string | null;
	isCalibrated: boolean;
	onApplySensorPreset: (preset: SensorPresetItem) => void;
	onResetAll: () => void;
	onPrintProtocol: () => void;
	onOpenExportModal: () => void;
	onClose?: (() => void) | undefined;
	toothCode?: string | null | undefined;
	onToothChange?: ((tooth: string) => void) | undefined;
	onAttachToVisit?: (() => void) | undefined;
	isAttachedToVisit?: boolean | undefined;
	onToggleMobileDrawer?: (() => void) | undefined;
}
