/**
 * VisiographLegalPrintProtocol.ts
 *
 * 1-Click Fast Legal Protocol Printout with Clinic Stamp (Mandate 8e, Doctor Autonomy).
 * Generates an A4 portrait layout with radiological image, clinical findings table, and stamp.
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
		patient: {
			id: patientId || "pat_001",
			fullName: patientFullName || "Пациент",
		},
		clinic: DEFAULT_CLINIC_CREDENTIALS,
		doctor: {
			...DEFAULT_DOCTOR_SIGNATURE,
			doctorFullName: doctorName || DEFAULT_DOCTOR_SIGNATURE.doctorFullName,
		},
		study: {
			id: studyId,
			toothCode: toothCode || undefined,
			capturedAt: new Date().toISOString(),
		},
		calibration: isCalibrated ? calibration : undefined,
		rulers,
		angles,
		lesions,
	});

	const imageUri = exportCanvasToPng(legalCanvas);

	const printFrame = document.createElement("iframe");
	printFrame.style.position = "fixed";
	printFrame.style.right = "0";
	printFrame.style.bottom = "0";
	printFrame.style.width = "0";
	printFrame.style.height = "0";
	printFrame.style.border = "0";
	document.body.appendChild(printFrame);

	const printDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
	if (!printDoc) return;

	const measurementsRows = [
		...rulers.map(
			(r, i) =>
				`<tr><td>Линейка #${i + 1} (${r.label})</td><td>${r.lengthMm.toFixed(1)} мм</td><td>Калибр: 1 px = ${calibration.scaleMmPerPixel.toFixed(4)} мм</td></tr>`,
		),
		...angles.map(
			(a, i) =>
				`<tr><td>Угломер #${i + 1} (${a.label})</td><td>${a.angleDeg.toFixed(1)}°</td><td>Ось зуба / коронки</td></tr>`,
		),
		...lesions.map(
			(les, i) =>
				`<tr><td>Очаг #${i + 1} (${les.classificationLabel})</td><td>${les.areaMm2.toFixed(1)} мм² (Ø ${les.equivalentDiameterMm.toFixed(1)} мм)</td><td>${les.treatmentRecommendation}</td></tr>`,
		),
	].join("");

	const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Протокол рентгенограммы — ${patientFullName}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; margin: 0; padding: 0; font-size: 10pt; line-height: 1.35; }
  .clinic-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #14b8a6; padding-bottom: 8px; margin-bottom: 10px; }
  .clinic-title { font-size: 13pt; font-weight: 800; text-transform: uppercase; color: #0f172a; }
  .clinic-sub { font-size: 8.5pt; color: #64748b; }
  .protocol-badge { text-align: right; font-weight: 800; font-size: 11pt; color: #0d9488; }
  .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 9pt; }
  .image-wrapper { text-align: center; margin: 10px 0; }
  .image-wrapper img { max-width: 100%; max-height: 140mm; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .table-title { font-weight: 700; font-size: 9.5pt; margin: 10px 0 4px 0; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 8px; text-align: left; }
  th { background: #f1f5f9; font-weight: 700; color: #334155; }
  .stamp-footer { margin-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 8.5pt; color: #475569; }
  .stamp-box { width: 70px; height: 70px; border: 1px dashed #94a3b8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8pt; font-weight: 700; color: #64748b; }
</style>
</head>
<body>
  <div class="clinic-header">
    <div>
      <div class="clinic-title">${DEFAULT_CLINIC_CREDENTIALS.clinicName}</div>
      <div class="clinic-sub">Лицензия № ЛО-77-01-018942 · Рентген-кабинет радиовизиографии</div>
    </div>
    <div class="protocol-badge">
      ПРОТОКОЛ РВГ<br>
      <span style="font-size: 8.5pt; font-weight: normal; color: #64748b;">${new Date().toLocaleDateString("ru-RU")}</span>
    </div>
  </div>
  <div class="patient-grid">
    <div><strong>Пациент:</strong> ${patientFullName} (ID: ${patientId || "pat_001"})</div>
    <div><strong>Зуб (FDI):</strong> ${toothCode ? `Зуб ${toothCode}` : "Прицельный снимок"}</div>
    <div><strong>Врач:</strong> ${doctorName}</div>
    <div><strong>Калибровка:</strong> 1 px = ${calibration.scaleMmPerPixel.toFixed(4)} мм</div>
  </div>
  <div class="image-wrapper">
    <img src="${imageUri}" alt="Радиовизиограмма" />
  </div>
  ${
		measurementsRows.length > 0
			? `
  <div class="table-title">Клинические измерения и периапикальные очаги:</div>
  <table>
    <thead><tr><th>Параметр / Метка</th><th>Значение</th><th>Примечание</th></tr></thead>
    <tbody>${measurementsRows}</tbody>
  </table>`
			: ""
  }
  <div class="stamp-footer">
    <div>
      <div>Заключение: Рентгенологический контроль завершен. Данные внесены в медицинскую карту пациента.</div>
      <div style="margin-top: 6px;">Врач: ${doctorName} ___________________ / Подпись</div>
    </div>
    <div class="stamp-box">М.П.</div>
  </div>
</body>
</html>`;

	printDoc.open();
	printDoc.write(html);
	printDoc.close();
	setTimeout(() => {
		printFrame.contentWindow?.focus();
		printFrame.contentWindow?.print();
		setTimeout(() => {
			if (document.body.contains(printFrame)) {
				document.body.removeChild(printFrame);
			}
		}, 1000);
	}, 250);
}
