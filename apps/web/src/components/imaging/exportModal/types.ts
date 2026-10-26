/**
 * types.ts — Типы для модального окна экспорта снимков (Мандат 8b <= 120 строк).
 */

import type React from "react";
import type { ImagingStudy } from "../types";
import type {
	AngleMeasurement,
	CalibrationReference,
	PeriapicalLesion,
	RulerMeasurement,
} from "../../visiograph/VisiographMeasurementMath";

export interface ImagingExportModalProps {
	isOpen: boolean;
	onClose: () => void;
	study?: ImagingStudy | null | undefined;
	patient?: {
		fullName?: string | undefined;
		name?: string | undefined;
		birthDate?: string | undefined;
		medicalCardNumber?: string | undefined;
		cardNumber?: string | undefined;
		phone?: string | undefined;
	} | null | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	previewUrl?: string | null | undefined;
	reportSummary?: string | null | undefined;
	canvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
	patientId?: string | null | undefined;
	patientFullName?: string | undefined;
	studyId?: string | undefined;
	toothCode?: string | null | undefined;
	rulers?: RulerMeasurement[] | undefined;
	angles?: AngleMeasurement[] | undefined;
	lesions?: PeriapicalLesion[] | undefined;
	calibration?: CalibrationReference | undefined;
	isCalibrated?: boolean | undefined;
	onSaveToRecord?: ((
		imageDataUri: string,
		exportMeta: {
			rulers: RulerMeasurement[];
			angles: AngleMeasurement[];
			lesions: PeriapicalLesion[];
			scaleMmPerPx: number;
		},
	) => Promise<void> | void) | undefined;
	onPrintProtocol?: (() => void) | undefined;
}
