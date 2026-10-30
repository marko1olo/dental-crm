/**
 * VisiographStudioTypes.ts
 * Types and presets for Visiograph & PACS Studio (Mandates 8b, 8d, 8e).
 */

import {
	DENTAL_SENSOR_PRESETS,
	type DentalSensorPreset,
	type RulerMeasurement,
	type AngleMeasurement,
	type PeriapicalLesion,
	recalculateLesionsWithScale,
	recalculateRulersWithScale,
} from "./VisiographMeasurementMath";
import type { ActiveVisiographToolType } from "./VisiographInteractiveOverlay";

export type SensorCalibrationPreset = DentalSensorPreset;

export const STANDARD_SENSOR_PRESETS: readonly SensorCalibrationPreset[] = DENTAL_SENSOR_PRESETS;

export { recalculateRulersWithScale, recalculateLesionsWithScale };

export type ActiveVisiographTool = ActiveVisiographToolType;

export interface VisiographStudioCanvasProps {
	imageUrl: string;
	patientId?: string | null | undefined;
	patientFullName?: string | undefined;
	toothCode?: string | null | undefined;
	studyId?: string | undefined;
	doctorName?: string | undefined;
	initialTool?: ActiveVisiographTool;
	isModalHost?: boolean | undefined;
	onSaveToRecord?: (
		imageDataUri: string,
		exportMeta: {
			rulers: RulerMeasurement[];
			angles: AngleMeasurement[];
			lesions: PeriapicalLesion[];
			scaleMmPerPx: number;
		},
	) => Promise<void> | void;
	onClose?: () => void;
}
