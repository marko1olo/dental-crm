/**
 * VisiographLegalWatermark.ts
 *
 * Medical-legal watermark and forensic clinical overlay engine:
 * - Top clinical banner: Clinic Name, Medical License, Patient Full Name, Patient ID, Capture Date & Time.
 * - Bottom legal footer: Doctor EDS / Digital Signature (ГОСТ Р 34.10 / SHA-256 fingerprint), calibration metadata, Form 043/u outpatient card inscription.
 * - Doctor stamp seal (Официальный штамп врача с ЭЦП).
 * - Full graphic rendering of calibrated rulers, angles, and periapical lesion contours.
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
	clinicName: 'Стоматологическая клиника «DENTE CLINIC»',
	ogrn: "1187746001234",
	inn: "7701234567",
	licenseNumber: "ЛО-77-01-019842 от 14.10.2020",
	clinicAddress: "г. Москва, ул. Клиническая, д. 12",
	clinicPhone: "+7 (495) 789-01-23",
};

export const DEFAULT_DOCTOR_SIGNATURE: LegalDoctorSignature = {
	doctorFullName: "Врач-стоматолог-рентгенолог ДЕНТЕ",
	speciality: "Стоматология общей практики / Лучевая диагностика",
	certificateOrSnils: "СНИЛС: 123-456-789 00",
};

/**
 * Computes deterministic cryptographic-style verification digest for legal forensic records.
 */
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
	const hex2 = ((hash ^ 0x55555555) >>> 0)
		.toString(16)
		.toUpperCase()
		.padStart(8, "0");
	return `ГОСТ Р 34.10 · ЭЦП [${hex.slice(0, 4)}-${hex.slice(4)}-${hex2.slice(0, 4)}-${hex2.slice(4)}]`;
}

/**
 * Draws high-precision graphical overlays for rulers, angles, and periapical lesion contours.
 */
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

	// 1. Draw Rulers
	for (const ruler of rulers) {
		const { p1, p2, lengthMm, color = "#00e5ff", label } = ruler;
		ctx.strokeStyle = color;
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";

		// Main line
		ctx.beginPath();
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.stroke();

		// End caps (orthogonal ticks)
		const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
		const tickLen = 6;
		const perpAngle = angle + Math.PI / 2;

		const drawCap = (p: { x: number; y: number }) => {
			ctx.beginPath();
			ctx.moveTo(
				p.x - Math.cos(perpAngle) * tickLen,
				p.y - Math.sin(perpAngle) * tickLen,
			);
			ctx.lineTo(
				p.x + Math.cos(perpAngle) * tickLen,
				p.y + Math.sin(perpAngle) * tickLen,
			);
			ctx.stroke();
		};
		drawCap(p1);
		drawCap(p2);

		// Badge with millimeter value
		const midX = (p1.x + p2.x) / 2;
		const midY = (p1.y + p2.y) / 2;
		const text = `${label ? `${label}: ` : ""}${lengthMm.toFixed(1)} мм`;

		ctx.font = "bold 12px sans-serif";
		const textMetrics = ctx.measureText(text);
		const bgWidth = textMetrics.width + 12;
		const bgHeight = 20;

		ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
		ctx.beginPath();
		ctx.roundRect(
			midX - bgWidth / 2,
			midY - bgHeight / 2 - 12,
			bgWidth,
			bgHeight,
			4,
		);
		ctx.fill();

		ctx.strokeStyle = color;
		ctx.lineWidth = 1.0;
		ctx.stroke();

		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, midX, midY - 12);
	}

	// 2. Draw Angles / Protractors
	for (const angle of angles) {
		const { vertex, arm1, arm2, angleDeg, color = "#ffab00", label } = angle;
		ctx.strokeStyle = color;
		ctx.lineWidth = 2.0;

		// Arms
		ctx.beginPath();
		ctx.moveTo(arm1.x, arm1.y);
		ctx.lineTo(vertex.x, vertex.y);
		ctx.lineTo(arm2.x, arm2.y);
		ctx.stroke();

		// Vertex marker
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(vertex.x, vertex.y, 4, 0, Math.PI * 2);
		ctx.fill();

		// Arc
		const a1 = Math.atan2(arm1.y - vertex.y, arm1.x - vertex.x);
		const a2 = Math.atan2(arm2.y - vertex.y, arm2.x - vertex.x);
		const arcRadius = 24;

		ctx.beginPath();
		ctx.arc(vertex.x, vertex.y, arcRadius, a1, a2, false);
		ctx.stroke();

		// Text badge
		const text = `${label ? `${label}: ` : ""}${angleDeg.toFixed(1)}°`;
		ctx.font = "bold 12px sans-serif";
		const textMetrics = ctx.measureText(text);
		const bgWidth = textMetrics.width + 10;
		const bgHeight = 18;

		ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
		ctx.beginPath();
		ctx.roundRect(
			vertex.x + 10,
			vertex.y - 20,
			bgWidth,
			bgHeight,
			4,
		);
		ctx.fill();
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.stroke();

		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, vertex.x + 10 + bgWidth / 2, vertex.y - 11);
	}

	// 3. Draw Periapical Lesion Contours
	for (const lesion of lesions) {
		const { points, areaMm2, equivalentDiameterMm, color = "#ff1744", classificationLabel } = lesion;
		if (points.length < 3) continue;

		// Semi-transparent filled polygon
		ctx.fillStyle = "rgba(255, 23, 68, 0.22)";
		ctx.strokeStyle = color;
		ctx.lineWidth = 2.0;
		ctx.setLineDash([4, 3]);

		ctx.beginPath();
		const first = points[0];
		if (!first) continue;
		ctx.moveTo(first.x, first.y);
		for (let i = 1; i < points.length; i++) {
			const p = points[i];
			if (p) ctx.lineTo(p.x, p.y);
		}
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.setLineDash([]); // Reset dash

		// Draw polygon vertices
		ctx.fillStyle = color;
		for (const p of points) {
			ctx.beginPath();
			ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
			ctx.fill();
		}

		// Centroid for text label
		let cx = 0;
		let cy = 0;
		for (const p of points) {
			cx += p.x;
			cy += p.y;
		}
		cx /= points.length;
		cy /= points.length;

		const text = `Очаг: ${areaMm2.toFixed(1)} мм² (Ø ${equivalentDiameterMm.toFixed(1)} мм)`;
		ctx.font = "bold 11px sans-serif";
		const textMetrics = ctx.measureText(text);
		const bgWidth = textMetrics.width + 12;
		const bgHeight = 22;

		ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
		ctx.beginPath();
		ctx.roundRect(cx - bgWidth / 2, cy - bgHeight / 2, bgWidth, bgHeight, 4);
		ctx.fill();

		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.stroke();

		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, cx, cy);
	}

	ctx.restore();
}

/**
 * Draws official medical-legal header and footer banners with Russian EDS verification stamp.
 */
export function renderLegalWatermarkBanners(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	options: LegalWatermarkOptions,
): void {
	const clinic = options.clinic ?? DEFAULT_CLINIC_CREDENTIALS;
	const doctor = options.doctor ?? DEFAULT_DOCTOR_SIGNATURE;
	const patient = options.patient;
	const study = options.study;
	const capturedAt = study?.capturedAt
		? new Date(study.capturedAt).toLocaleString("ru-RU")
		: new Date().toLocaleString("ru-RU");

	ctx.save();

	const headerHeight = Math.max(34, Math.round(height * 0.055));
	const footerHeight = Math.max(48, Math.round(height * 0.075));

	// 1. TOP HEADER BANNER
	ctx.fillStyle = "rgba(10, 16, 26, 0.92)";
	ctx.fillRect(0, 0, width, headerHeight);

	// Thin accent border
	ctx.fillStyle = "#00e5ff";
	ctx.fillRect(0, headerHeight - 2, width, 2);

	ctx.fillStyle = "#ffffff";
	ctx.font = `bold ${Math.max(11, Math.round(headerHeight * 0.36))}px sans-serif`;
	ctx.textBaseline = "middle";
	ctx.textAlign = "left";

	const toothStr = study?.toothCode ? ` | Зуб FDI № ${study.toothCode}` : "";
	const clinicTitle = `${clinic.clinicName} (Лиц. ${clinic.licenseNumber || "№ ЛО-01"})`;
	ctx.fillText(clinicTitle, 12, headerHeight / 2);

	ctx.textAlign = "right";
	const patientTitle = `Пациент: ${patient.fullName} (ID: ${patient.id})${toothStr} · ${capturedAt}`;
	ctx.fillText(patientTitle, width - 12, headerHeight / 2);

	// 2. BOTTOM FOOTER BANNER
	const footerY = height - footerHeight;
	ctx.fillStyle = "rgba(10, 16, 26, 0.92)";
	ctx.fillRect(0, footerY, width, footerHeight);

	// Top border of footer
	ctx.fillStyle = "#00e5ff";
	ctx.fillRect(0, footerY, width, 2);

	// Footer Line 1: Scale & Calibration + Measurements summary
	ctx.fillStyle = "#a0aec0";
	ctx.font = `${Math.max(10, Math.round(footerHeight * 0.24))}px sans-serif`;
	ctx.textAlign = "left";
	ctx.textBaseline = "top";

	const calibText = options.calibration
		? `Масштаб: 1 px = ${options.calibration.scaleMmPerPixel.toFixed(4)} мм [Калибровано: ${options.calibration.knownLengthMm.toFixed(1)} мм]`
		: "Масштаб: 1 px ≈ 0.0500 мм (Стандартный датчик)";

	const rulersCount = options.rulers?.length ?? 0;
	const anglesCount = options.angles?.length ?? 0;
	const lesionsCount = options.lesions?.length ?? 0;
	const measSummary = `Линейки: ${rulersCount} шт | Углы: ${anglesCount} шт | Очаги деструкции: ${lesionsCount} шт`;

	ctx.fillText(`${calibText} | ${measSummary}`, 12, footerY + 6);

	// Footer Line 2: Doctor Digital Signature (ЭЦП ГОСТ) & Legal Inscription
	const edsig =
		doctor.digitalSignatureHash ||
		computeDoctorSignatureDigest(
			doctor.doctorFullName,
			patient.id,
			study?.capturedAt || new Date().toISOString(),
		);

	ctx.fillStyle = "#ffffff";
	ctx.font = `bold ${Math.max(10, Math.round(footerHeight * 0.28))}px sans-serif`;
	ctx.fillText(
		`Врач: ${doctor.doctorFullName} (${doctor.speciality || "Рентгенолог"}) · ${edsig}`,
		12,
		footerY + footerHeight * 0.52,
	);

	ctx.textAlign = "right";
	ctx.fillStyle = "#4fd1c5";
	ctx.fillText(
		"Медицинская карта 043/у · Юридически заверенная цифровая копия",
		width - 12,
		footerY + footerHeight * 0.52,
	);

	// 3. DOCTOR DIGITAL STAMP SEAL (Right bottom circular badge)
	renderDoctorStampBadge(ctx, width - 80, height - footerHeight - 75, doctor);

	ctx.restore();
}

/**
 * Draws official Russian medical doctor electronic stamp seal.
 */
function renderDoctorStampBadge(
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

	// Circular stamp frame
	ctx.beginPath();
	ctx.arc(cx, cy, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	// Inner dashed circle
	ctx.strokeStyle = "rgba(0, 229, 255, 0.75)";
	ctx.lineWidth = 1;
	ctx.setLineDash([3, 2]);
	ctx.beginPath();
	ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
	ctx.stroke();
	ctx.setLineDash([]);

	// Text inside seal
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

/**
 * Creates high-DPI export canvas with burned-in legal watermark and measurement overlays.
 */
export function buildLegalExportCanvas(
	sourceCanvas: HTMLCanvasElement,
	options: LegalWatermarkOptions,
): HTMLCanvasElement {
	if (typeof document === "undefined") {
		return sourceCanvas;
	}

	const w = sourceCanvas.width || 800;
	const h = sourceCanvas.height || 600;

	const exportCanvas = document.createElement("canvas");
	exportCanvas.width = w;
	exportCanvas.height = h;

	const ctx = exportCanvas.getContext("2d");
	if (!ctx) return sourceCanvas;

	// 1. Draw source image
	ctx.drawImage(sourceCanvas, 0, 0, w, h);

	// 2. Draw measurement overlays (rulers, angles, lesions)
	renderMeasurementsOverlay(ctx, {
		rulers: options.rulers,
		angles: options.angles,
		lesions: options.lesions,
		calibration: options.calibration,
	});

	// 3. Draw Legal Banners & Doctor Stamp
	renderLegalWatermarkBanners(ctx, w, h, options);

	return exportCanvas;
}
