import type React from "react";
import type { RadiologyStudy } from "../types";
import type {
	DirectRvgCaptureModalProps,
	ProjectionAngleType,
	SensorCaptureStatus,
	SensorModelInfo,
} from "../directRvgTypes";
import type { AnatomicalZone, PatientCategory } from "../DirectRvgProjectionSelector";
import type { RvgFilterValues } from "../RvgFiltersToolbar";
import type { useDirectRvgPanZoom } from "../useDirectRvgPanZoom";

export type {
	DirectRvgCaptureModalProps,
	ProjectionAngleType,
	SensorCaptureStatus,
	SensorModelInfo,
	AnatomicalZone,
	PatientCategory,
	RvgFilterValues,
};

/** Certified dental RVG sensor model descriptor */
export interface RvgSensorDeviceOption {
	id: string;
	name: string;
	resolution: string;
	pixelSpacing: number;
	brandName?: string;
}

/** Supported RVG sensor hardware brands */
export type RvgSensorBrand =
	| "vatech"
	| "carestream"
	| "dexis"
	| "planmeca"
	| "sirona"
	| "schick"
	| "fona"
	| "kavo"
	| "acteon"
	| "woodpecker"
	| "handy"
	| "myray"
	| "owandy"
	| "eighteeth"
	| "xpectvision";

/** Exposure calibration parameters */
export interface RvgExposureParameters {
	kv: number;
	ma: number;
	exposureSec: number;
	calculatedDoseMicrosv: number;
	patientCategory: PatientCategory;
	anatomicalZone: AnatomicalZone;
}

export interface DirectRvgDeviceSelectorProps {
	modalId: string;
	patientName: string;
	patientCardNumber: string;
	doctorName: string;
	onClose: () => void;
	sensorStatus: SensorCaptureStatus;
	acquisitionProgress: number;
	selectedSensorModel: string;
	onSelectSensorModel: (modelId: string) => void;
	availableSensors: RvgSensorDeviceOption[];
	onTriggerCapture: () => void;
	onAutoDetectSensor: () => Promise<void>;
	onTestSensorConnection: () => Promise<void>;
	isDetectingSensor: boolean;
	sensorStatusMessage: string;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface DirectRvgViewportProps {
	modalId: string;
	sensorStatus: SensorCaptureStatus;
	acquisitionProgress: number;
	capturedImage: string;
	selectedTeeth: string[];
	projectionType: ProjectionAngleType;
	panZoom: ReturnType<typeof useDirectRvgPanZoom>;
	filters: RvgFilterValues;
	onFiltersChange: (filters: RvgFilterValues) => void;
	activePresetId: string;
	onSelectPresetId: (id: string) => void;
	isSplitCompare: boolean;
	onToggleSplitCompare: (split: boolean) => void;
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	isDragOver: boolean;
	onViewportDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
	onViewportDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
	onViewportDrop: (e: React.DragEvent<HTMLDivElement>) => void;
	onTriggerCapture: () => void;
	onUploadClick: () => void;
	onLoadDemo: () => void;
	isDemo: boolean;
	cssFilterStyle: string;
}

export interface DirectRvgToothAssignerProps {
	selectedTeeth: string[];
	onToothToggle: (tooth: string, multiSelect?: boolean) => void;
	onSelectTeeth: (teeth: string[]) => void;
	primaryTooth: string;
	primaryToothName: string;
	projectionType: ProjectionAngleType;
	onSelectProjectionType: (projId: ProjectionAngleType, typicalExp?: number) => void;
	patientCategory: PatientCategory;
	onChangePatientCategory: (cat: PatientCategory) => void;
	anatomicalZone: AnatomicalZone;
	onChangeAnatomicalZone: (zone: AnatomicalZone) => void;
	clinicalNotes: string;
	onChangeClinicalNotes: (notes: string) => void;
}

export interface DirectRvgFooterActionsProps {
	selectedTeeth: string[];
	calculatedDoseMicrosv: number;
	isSaving: boolean;
	onExportDicom: () => void;
	onSendToLab: () => void;
	onSaveToEmr: () => void;
	onSendToPlan: () => void;
	onRetake: () => void;
}

export interface DirectRvgCaptureState {
	sensorStatus: SensorCaptureStatus;
	selectedSensorModel: string;
	acquisitionProgress: number;
	isSaving: boolean;
	isDetectingSensor: boolean;
	sensorHealthStatus: string;
	patientCategory: PatientCategory;
	anatomicalZone: AnatomicalZone;
	exposureSec: number;
	selectedTeeth: string[];
	projectionType: ProjectionAngleType;
	clinicalNotes: string;
	capturedImage: string;
	filters: RvgFilterValues;
	activePresetId: string;
	isSplitCompare: boolean;
	calculatedDoseMicrosv: number;
	primaryTooth: string;
	primaryToothName: string;
	availableSensors: RvgSensorDeviceOption[];
	isDragOver: boolean;
	isDemo: boolean;
	cssFilterStyle: string;
	modalId: string;
}
