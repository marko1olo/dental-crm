/**
 * VisiographLegalPrintProtocol.ts
 * 1-Click Fast Legal Protocol Printout with Clinic Stamp (Mandate 8e, Doctor Autonomy).
 * Modular decomposition <= 120 lines (Mandate 8b).
 */

import {
	buildLegalExportCanvas,
	DEFAULT_CLINIC_CREDENTIALS,
	DEFAULT_DOCTOR_SIGNATURE,
} from "./VisiographLegalWatermark";
import { exportCanvasToPng } from "./VisiographDicomExporter";
import type {
	AngleMeasurement,
	CalibrationReference,
	PeriapicalLesion,
	RulerMeasurement,
} from "./VisiographMeasurementMath";
import { generateVisiographPrintHtml } from "./VisiographPrintTemplate";

export interface PrintVisiographOptions {
	canvas: HTMLCanvasElement;
	patientId?: string | null | undefined;
	patientFullName?: string | undefined;
	doctorName?: string | undefined;
	studyId?: string | undefined;
	toothCode?: string | null | undefined;
	isCalibrated: boolean;
	calibration: CalibrationReference;
	rulers: RulerMeasurement[];
	angles: AngleMeasurement[];
	lesions: PeriapicalLesion[];
}

export function printVisiographLegalProtocol({
	canvas,
	patientId,
	patientFullName = "Пациент",
	doctorName = "Врач-рентгенолог ДЕНТЕ",
	studyId,
	toothCode,
	isCalibrated,
	calibration,
	rulers,
	angles,
	lesions,
}: PrintVisiographOptions): void {
	if (typeof document === "undefined") return;

	const legalCanvas = buildLegalExportCanvas(canvas, {
		patient: { id: patientId || "pat_001", fullName: patientFullName || "Пациент" },
		clinic: DEFAULT_CLINIC_CREDENTIALS,
		doctor: { ...DEFAULT_DOCTOR_SIGNATURE, doctorFullName: doctorName || DEFAULT_DOCTOR_SIGNATURE.doctorFullName },
		study: { id: studyId, toothCode: toothCode || undefined, capturedAt: new Date().toISOString() },
		calibration: isCalibrated ? calibration : undefined,
		rulers,
		angles,
		lesions,
	});

	const imageUri = exportCanvasToPng(legalCanvas);
	const printFrame = document.createElement("iframe");
	printFrame.style.position = "fixed";
	printFrame.style.width = "0";
	printFrame.style.height = "0";
	printFrame.style.border = "0";
	document.body.appendChild(printFrame);

	const printDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
	if (!printDoc) return;

	const measurementsRows = [
		...rulers.map((r, i) => `<tr><td>Линейка #${i + 1} (${r.label})</td><td>${r.lengthMm.toFixed(1)} мм</td><td>Калибр: 1 px = ${calibration.scaleMmPerPixel.toFixed(4)} мм</td></tr>`),
		...angles.map((a, i) => `<tr><td>Угломер #${i + 1} (${a.label})</td><td>${a.angleDeg.toFixed(1)}°</td><td>Ось зуба / коронки</td></tr>`),
		...lesions.map((les, i) => `<tr><td>Очаг #${i + 1} (${les.classificationLabel})</td><td>${les.areaMm2.toFixed(1)} мм² (Ø ${les.equivalentDiameterMm.toFixed(1)} мм)</td><td>${les.treatmentRecommendation}</td></tr>`),
	].join("");

	const html = generateVisiographPrintHtml({
		patientFullName,
		patientId,
		toothCode,
		doctorName,
		scaleMmPerPixel: calibration.scaleMmPerPixel,
		imageUri,
		measurementsRows,
		clinicName: DEFAULT_CLINIC_CREDENTIALS.clinicName,
	});

	printDoc.open();
	printDoc.write(html);
	printDoc.close();
	setTimeout(() => {
		printFrame.contentWindow?.focus();
		printFrame.contentWindow?.print();
		setTimeout(() => {
			if (document.body.contains(printFrame)) document.body.removeChild(printFrame);
		}, 1000);
	}, 250);
}
