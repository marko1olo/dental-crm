import type { XrayScan } from "../VisiographScanHelpers.js";
import type { VisiographPresetType } from "../VisiographCockpitPresets.js";

export type { XrayScan };

export interface VisiographAnalyzerProps {
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly toothCode?: string | undefined;
	readonly initialScan?: XrayScan | undefined;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly onConnectRvg?: (() => void) | undefined;
	readonly onUploadDicom?: (() => void) | undefined;
	readonly onReferToRadiology?: (() => void) | undefined;
	readonly selectedStudy?: {
		id: string;
		previewUrl?: string;
		viewerUrl?: string;
		title?: string;
		toothCode?: string | null;
		modality?: string | null;
		capturedAt?: string | null;
	} | null | undefined;
}

export interface VisiographCalibrationPoint {
	readonly x: number;
	readonly y: number;
}

export interface VisiographScaleCalibration {
	readonly standardReferenceMm: number; // default 5.0 mm reference ball / EzSensor standard pitch
	readonly pixelsPerMm: number;
	readonly mmPerPixel: number;
	readonly isCalibrated: boolean;
}

export interface VisiographFilterSettings {
	readonly invert: boolean;
	readonly sharpness: number;
	readonly contrast: number;
	readonly brightness: number;
}

export interface VisiographMeasurementSummary {
	readonly toothCode?: string | undefined;
	readonly rootCanalLengthMm?: number | undefined;
	readonly periapicalIndexPai?: number | undefined; // PAI score 1..5
	readonly calibrationMmPerPx: number;
	readonly notes?: string | undefined;
}

export interface VisiographToolbarControlsProps {
	readonly quickPreset: VisiographPresetType;
	readonly setQuickPreset: (preset: VisiographPresetType) => void;
	readonly isStudioMode: boolean;
	readonly onToggleStudio: () => void;
	readonly onOpenApexRuler: () => void;
	readonly isNormaApplied: boolean;
	readonly onApplyNormaTo043: () => void;
	readonly isAnalyzing: boolean;
	readonly onRunAiAnalysis: () => void;
	readonly hasAiReport: boolean;
	readonly onOpenSensorViewer: () => void;
}

export interface VisiographCanvasViewportProps {
	readonly isStudioMode: boolean;
	readonly currentImageUrl: string;
	readonly effectivePatientId?: string | undefined;
	readonly currentScan: XrayScan | null;
	readonly initialStudioTool: "pointer" | "root_canal";
	readonly quickPreset: VisiographPresetType;
	readonly onCloseStudio: () => void;
	readonly filmstripItems: readonly any[];
	readonly onSelectStudy: (item: any) => void;
	readonly onDoubleClickStudy: (item: any) => void;
	readonly isSaving: boolean;
}

export interface VisiographMeasurementPanelProps {
	readonly toothStatesArray: readonly { code: string; state: string }[];
	readonly appliedToothCodes: readonly string[];
	readonly isHistoryView: boolean;
	readonly selectedFindingCodes: Set<string>;
	readonly onToggleFindingCode: (code: string) => void;
	readonly onToggleSelectAll: () => void;
	readonly isApplyingToChart: boolean;
	readonly onApplyFindingsToChart: () => void;
	readonly aiReport?: string | undefined;
	readonly capturedAt?: string | undefined;
	readonly onInsertReportToProtocol: (reportText: string) => void;
	readonly currentScan: XrayScan | null;
	readonly deletingScanId: string | null;
	readonly onClear: () => void;
	readonly onDeleteScan: (scan: XrayScan) => void;
	readonly toothCode?: string | undefined;
	readonly calibration?: VisiographScaleCalibration | undefined;
	readonly workingLengthMm?: number | null | undefined;
	readonly onMeasureWorkingLength?: ((lengthMm: number) => void) | undefined;
}
