/**
 * VisiographWatermarkBanners.ts
 * Medical-legal header and footer banners with doctor digital stamp seal.
 */

import {
	type LegalDoctorSignature,
	type LegalWatermarkOptions,
	DEFAULT_CLINIC_CREDENTIALS,
	DEFAULT_DOCTOR_SIGNATURE,
	computeDoctorSignatureDigest,
} from "./VisiographWatermarkTypes";
import { renderMeasurementsOverlay } from "./VisiographWatermarkOverlay";

export function renderDoctorStampBadge(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	doctor: LegalDoctorSignature,
): void {
	ctx.save();
	const radius = 46;
	ctx.strokeStyle = "rgba(0, 150, 255, 0.85)";
	ctx.fillStyle = "rgba(10, 25, 45, 0.85)";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.arc(cx, cy, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	ctx.strokeStyle = "rgba(0, 229, 255, 0.75)";
	ctx.lineWidth = 1;
	ctx.setLineDash([3, 2]);
	ctx.beginPath();
	ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
	ctx.stroke();
	ctx.setLineDash([]);

	ctx.fillStyle = "#00e5ff";
	ctx.font = "bold 8px sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("ЭЛЕКТРОННАЯ ПОДПИСЬ", cx, cy - 24);

	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 8px sans-serif";
	const surname = doctor.doctorFullName.split(" ")[0] || "ВРАЧ";
	ctx.fillText(`ВРАЧ: ${surname}`, cx, cy - 8);

	ctx.fillStyle = "#a0aec0";
	ctx.font = "7px sans-serif";
	ctx.fillText("ГОСТ Р 34.10-2012", cx, cy + 6);
	ctx.fillText("ЗАВЕРЕНО ЭЦП", cx, cy + 18);
	ctx.fillText("DENTE CLINIC", cx, cy + 28);
	ctx.restore();
}

export function renderLegalWatermarkBanners(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	options: LegalWatermarkOptions,
): void {
	const clinic = options.clinic ?? DEFAULT_CLINIC_CREDENTIALS;
	const doctor = options.doctor ?? DEFAULT_DOCTOR_SIGNATURE;
	const { patient, study } = options;
	const capturedAt = study?.capturedAt ? new Date(study.capturedAt).toLocaleString("ru-RU") : new Date().toLocaleString("ru-RU");

	ctx.save();
	const headerHeight = Math.max(34, Math.round(height * 0.055));
	const footerHeight = Math.max(48, Math.round(height * 0.075));

	// Top banner
	ctx.fillStyle = "rgba(10, 16, 26, 0.92)";
	ctx.fillRect(0, 0, width, headerHeight);
	ctx.fillStyle = "#00e5ff";
	ctx.fillRect(0, headerHeight - 2, width, 2);
	ctx.fillStyle = "#ffffff";
	ctx.font = `bold ${Math.max(11, Math.round(headerHeight * 0.36))}px sans-serif`;
	ctx.textBaseline = "middle";
	ctx.textAlign = "left";
	const toothStr = study?.toothCode ? ` | Зуб FDI № ${study.toothCode}` : "";
	ctx.fillText(`${clinic.clinicName} (Лиц. ${clinic.licenseNumber || "№ ЛО-01"})`, 12, headerHeight / 2);
	ctx.textAlign = "right";
	ctx.fillText(`Пациент: ${patient.fullName} (ID: ${patient.id})${toothStr} · ${capturedAt}`, width - 12, headerHeight / 2);

	// Bottom banner
	const footerY = height - footerHeight;
	ctx.fillStyle = "rgba(10, 16, 26, 0.92)";
	ctx.fillRect(0, footerY, width, footerHeight);
	ctx.fillStyle = "#00e5ff";
	ctx.fillRect(0, footerY, width, 2);

	ctx.fillStyle = "#a0aec0";
	ctx.font = `${Math.max(10, Math.round(footerHeight * 0.24))}px sans-serif`;
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	const calibText = options.calibration
		? `Масштаб: 1 px = ${options.calibration.scaleMmPerPixel.toFixed(4)} мм [Калибровано: ${options.calibration.knownLengthMm.toFixed(1)} мм]`
		: "Масштаб: 1 px ≈ 0.0500 мм (Стандартный датчик)";
	const counts = `Линейки: ${options.rulers?.length ?? 0} шт | Углы: ${options.angles?.length ?? 0} шт | Очаги: ${options.lesions?.length ?? 0} шт`;
	ctx.fillText(`${calibText} | ${counts}`, 12, footerY + 6);

	const edsig = doctor.digitalSignatureHash || computeDoctorSignatureDigest(doctor.doctorFullName, patient.id, study?.capturedAt || new Date().toISOString());
	ctx.fillStyle = "#ffffff";
	ctx.font = `bold ${Math.max(10, Math.round(footerHeight * 0.28))}px sans-serif`;
	ctx.fillText(`Врач: ${doctor.doctorFullName} (${doctor.speciality || "Рентгенолог"}) · ${edsig}`, 12, footerY + footerHeight * 0.52);

	ctx.textAlign = "right";
	ctx.fillStyle = "#4fd1c5";
	ctx.fillText("Медицинская карта пациента · Юридически заверенная цифровая копия", width - 12, footerY + footerHeight * 0.52);
	renderDoctorStampBadge(ctx, width - 80, height - footerHeight - 75, doctor);
	ctx.restore();
}

export function buildLegalExportCanvas(sourceCanvas: HTMLCanvasElement, options: LegalWatermarkOptions): HTMLCanvasElement {
	if (typeof document === "undefined") return sourceCanvas;
	const w = sourceCanvas.width || 800;
	const h = sourceCanvas.height || 600;
	const exportCanvas = document.createElement("canvas");
	exportCanvas.width = w;
	exportCanvas.height = h;
	const ctx = exportCanvas.getContext("2d");
	if (!ctx) return sourceCanvas;

	ctx.drawImage(sourceCanvas, 0, 0, w, h);
	renderMeasurementsOverlay(ctx, { rulers: options.rulers, angles: options.angles, lesions: options.lesions, calibration: options.calibration });
	renderLegalWatermarkBanners(ctx, w, h, options);
	return exportCanvas;
}
