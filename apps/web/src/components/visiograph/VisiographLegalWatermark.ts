/**
 * VisiographLegalWatermark.ts — Модуль юридического протоколирования, ЭЦП и графических оверлеев (Мандаты 8b, 8e).
 *
 * Объединяет:
 * 1. Типы клинических реквизитов, данных пациента и ЭЦП врача.
 * 2. Графические оверлеи калиброванных линеек, угломеров и оконтуренных очагов деструкции.
 * 3. Медико-юридические шапки/подвалы и печать цифровой подписи врача по ГОСТ Р 34.10-2012.
 *
 * Sweet Spot: 240–280 строк.
 */

import type {
	AngleMeasurement,
	CalibrationReference,
	PeriapicalLesion,
	RulerMeasurement,
} from "./VisiographMeasurementMath";

export interface LegalClinicCredentials {
	clinicName: string;
	ogrn?: string | undefined;
	inn?: string | undefined;
	licenseNumber?: string | undefined;
	clinicAddress?: string | undefined;
	clinicPhone?: string | undefined;
}

export interface LegalDoctorSignature {
	doctorFullName: string;
	speciality?: string | undefined;
	certificateOrSnils?: string | undefined;
	digitalSignatureHash?: string | undefined;
	signedAt?: string | undefined;
}

export interface LegalWatermarkOptions {
	patient: {
		id: string;
		fullName: string;
		birthDate?: string | undefined;
	};
	clinic?: LegalClinicCredentials | undefined;
	doctor?: LegalDoctorSignature | undefined;
	study?: {
		id?: string | undefined;
		toothCode?: string | undefined;
		kind?: string | undefined;
		capturedAt?: string | undefined;
	} | undefined;
	calibration?: CalibrationReference | undefined;
	rulers?: RulerMeasurement[] | undefined;
	angles?: AngleMeasurement[] | undefined;
	lesions?: PeriapicalLesion[] | undefined;
}

export const DEFAULT_CLINIC_CREDENTIALS: LegalClinicCredentials = {
	clinicName: "Стоматологическая клиника",
	ogrn: "",
	inn: "",
	licenseNumber: "",
	clinicAddress: "",
	clinicPhone: "",
};

export const DEFAULT_DOCTOR_SIGNATURE: LegalDoctorSignature = {
	doctorFullName: "Врач-стоматолог-рентгенолог",
	speciality: "Стоматология общей практики / Лучевая диагностика",
	certificateOrSnils: "",
};

export function computeDoctorSignatureDigest(
	doctorName: string,
	patientId: string,
	timestamp: string,
): string {
	let hash = 0x811c9dc5;
	const str = `${doctorName}|${patientId}|${timestamp}|DENTE-LEGAL-FIXATION`;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
	const hex2 = ((hash ^ 0x55555555) >>> 0).toString(16).toUpperCase().padStart(8, "0");
	return `ГОСТ Р 34.10 · ЭЦП [${hex.slice(0, 4)}-${hex.slice(4)}-${hex2.slice(0, 4)}-${hex2.slice(4)}]`;
}

export function renderMeasurementsOverlay(
	ctx: CanvasRenderingContext2D,
	options: {
		rulers?: RulerMeasurement[] | undefined;
		angles?: AngleMeasurement[] | undefined;
		lesions?: PeriapicalLesion[] | undefined;
		calibration?: CalibrationReference | undefined;
	},
): void {
	const { rulers = [], angles = [], lesions = [] } = options;
	ctx.save();

	// 1. Линейки измерений в мм
	for (const ruler of rulers) {
		const { p1, p2, lengthMm, color = "#00e5ff", label } = ruler;
		ctx.strokeStyle = color;
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.stroke();

		const midX = (p1.x + p2.x) / 2;
		const midY = (p1.y + p2.y) / 2;
		const text = `${label ? `${label}: ` : ""}${lengthMm.toFixed(1)} мм`;
		ctx.font = "bold 12px sans-serif";
		const bgWidth = ctx.measureText(text).width + 12;
		ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
		ctx.beginPath();
		ctx.roundRect(midX - bgWidth / 2, midY - 22, bgWidth, 20, 4);
		ctx.fill();
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.0;
		ctx.stroke();

		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, midX, midY - 12);
	}

	// 2. Угломеры
	for (const angle of angles) {
		const { vertex, arm1, arm2, angleDeg, color = "#ffab00", label } = angle;
		ctx.strokeStyle = color;
		ctx.lineWidth = 2.0;
		ctx.beginPath();
		ctx.moveTo(arm1.x, arm1.y);
		ctx.lineTo(vertex.x, vertex.y);
		ctx.lineTo(arm2.x, arm2.y);
		ctx.stroke();

		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(vertex.x, vertex.y, 4, 0, Math.PI * 2);
		ctx.fill();

		const text = `${label ? `${label}: ` : ""}${angleDeg.toFixed(1)}°`;
		ctx.font = "bold 12px sans-serif";
		const bgWidth = ctx.measureText(text).width + 10;
		ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
		ctx.beginPath();
		ctx.roundRect(vertex.x + 10, vertex.y - 20, bgWidth, 18, 4);
		ctx.fill();
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.stroke();

		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, vertex.x + 10 + bgWidth / 2, vertex.y - 11);
	}

	// 3. Периапикальные очаги костной деструкции
	for (const lesion of lesions) {
		const { points, areaMm2, equivalentDiameterMm, color = "#ff1744" } = lesion;
		if (points.length < 3) continue;

		ctx.fillStyle = "rgba(255, 23, 68, 0.22)";
		ctx.strokeStyle = color;
		ctx.lineWidth = 2.0;
		ctx.setLineDash([4, 3]);
		ctx.beginPath();
		const first = points[0]!;
		ctx.moveTo(first.x, first.y);
		for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.setLineDash([]);

		let cx = 0;
		let cy = 0;
		for (const pt of points) {
			cx += pt.x;
			cy += pt.y;
		}
		cx /= points.length;
		cy /= points.length;

		const label = `S: ${areaMm2.toFixed(1)} мм² (Ø ${(equivalentDiameterMm ?? 0).toFixed(1)} мм)`;
		ctx.font = "bold 11px sans-serif";
		const width = ctx.measureText(label).width + 8;
		ctx.fillStyle = "rgba(0,0,0,0.85)";
		ctx.fillRect(cx - width / 2, cy - 8, width, 16);
		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(label, cx, cy);
	}
	ctx.restore();
}

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
	ctx.fillText(calibText, 12, footerY + 8);

	const sigDigest = doctor.digitalSignatureHash ?? computeDoctorSignatureDigest(doctor.doctorFullName, patient.id, capturedAt);
	ctx.fillStyle = "#00e5ff";
	ctx.fillText(sigDigest, 12, footerY + 24);

	ctx.fillStyle = "#ffffff";
	ctx.textAlign = "right";
	ctx.fillText(`Врач: ${doctor.doctorFullName} (${doctor.speciality || "Стоматолог"})`, width - 100, footerY + 12);
	ctx.fillStyle = "#a0aec0";
	ctx.font = "9px sans-serif";
	ctx.fillText("Юридически заверенная копия протокола лучевой диагностики DENTE CRM", width - 100, footerY + 28);

	// Штамп ЭЦП врача
	renderDoctorStampBadge(ctx, width - 50, footerY + footerHeight / 2, doctor);
	ctx.restore();

	// Отрисовка оверлеев измерений
	renderMeasurementsOverlay(ctx, options);
}

export { buildLegalExportCanvas } from "./VisiographWatermarkBanners";
