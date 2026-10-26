/**
 * exportCanvasDownloadHelper.ts — Экспорт холста в форматы DICOM/PNG/JPEG и триггер загрузки (Мандат 8b <= 120 строк).
 */

import {
	buildLegalExportCanvas,
	DEFAULT_CLINIC_CREDENTIALS,
	DEFAULT_DOCTOR_SIGNATURE,
} from "../../visiograph/VisiographLegalWatermark";
import {
	createDicomSecondaryCaptureFile,
	exportCanvasToJpeg,
	exportCanvasToPng,
	triggerBinaryDownload,
} from "../../visiograph/VisiographDicomExporter";
import type { ImagingExportOptions } from "../types";

export interface CanvasExportParams {
	canvas: HTMLCanvasElement;
	options: ImagingExportOptions;
	isAnonymized: boolean;
	patientId?: string | null | undefined;
	rawPatientName: string;
	clinicName: string;
	doctorName: string;
	studyId?: string | null | undefined;
	effectiveStudy: { id: string; capturedAt?: string | undefined };
	toothCode?: string | null | undefined;
	calibration?: any;
	isCalibrated?: boolean | undefined;
	rulers?: any[] | undefined;
	angles?: any[] | undefined;
	lesions?: any[] | undefined;
}

export async function processCanvasDownload(params: CanvasExportParams): Promise<HTMLCanvasElement> {
	const {
		canvas, options, isAnonymized, patientId, rawPatientName, clinicName, doctorName,
		studyId, effectiveStudy, toothCode, calibration, isCalibrated, rulers = [], angles = [], lesions = [],
	} = params;

	let outputCanvas = canvas;
	if (options.withAnnotations || options.withMeasurements) {
		outputCanvas = buildLegalExportCanvas(canvas, {
			patient: {
				id: patientId || "pat_001",
				fullName: isAnonymized ? `Пациент_${patientId?.slice(-4) || "0000"}` : rawPatientName,
			},
			clinic: { ...DEFAULT_CLINIC_CREDENTIALS, clinicName: clinicName || DEFAULT_CLINIC_CREDENTIALS.clinicName },
			doctor: { ...DEFAULT_DOCTOR_SIGNATURE, doctorFullName: doctorName || DEFAULT_DOCTOR_SIGNATURE.doctorFullName },
			study: { id: studyId || effectiveStudy.id, toothCode: toothCode || undefined, capturedAt: effectiveStudy.capturedAt || new Date().toISOString() },
			calibration: isCalibrated && calibration ? calibration : undefined,
			rulers: options.withMeasurements ? rulers : [],
			angles: options.withMeasurements ? angles : [],
			lesions: options.withAnnotations ? lesions : [],
		});
	}

	const filenameBase = `dente_scan_${toothCode ? `tooth_${toothCode}_` : ""}${Date.now()}`;
	if (options.format === "dicom") {
		const dicomBytes = createDicomSecondaryCaptureFile(outputCanvas, {
			patientId: isAnonymized ? "PATIENT-152FZ" : (patientId || "PATIENT-001"),
			patientFullName: isAnonymized ? "ANONYMIZED" : rawPatientName,
			toothCode: toothCode || undefined,
			clinicName: clinicName || DEFAULT_CLINIC_CREDENTIALS.clinicName,
			doctorFullName: doctorName,
			scaleMmPerPixel: calibration?.scaleMmPerPixel,
		});
		triggerBinaryDownload(dicomBytes, `${filenameBase}.dcm`, "application/dicom");
	} else if (options.format === "png") {
		const dataUri = exportCanvasToPng(outputCanvas);
		const blob = await (await fetch(dataUri)).blob();
		triggerBinaryDownload(blob, `${filenameBase}.png`, "image/png");
	} else {
		const dataUri = exportCanvasToJpeg(outputCanvas, options.quality ?? 0.95);
		const blob = await (await fetch(dataUri)).blob();
		triggerBinaryDownload(blob, `${filenameBase}.jpg`, "image/jpeg");
	}

	return outputCanvas;
}
