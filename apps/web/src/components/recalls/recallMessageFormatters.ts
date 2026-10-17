import type { PatientRecallRecord, RecallCycleType, RecallTemplateVariables } from "./recallCycleCatalog";
import { cleanPhoneDigits } from "../../utils/formatters";

export function extractFirstName(fullName: string): string {
	const trimmed = fullName.trim();
	if (!trimmed) return "Пациент";
	const parts = trimmed.split(/\s+/);
	if (parts.length >= 2 && parts[1]) {
		return parts[1];
	}
	return parts[0] || "Пациент";
}

export function extractPolitePatientName(fullName: string): string {
	const trimmed = fullName.trim();
	if (!trimmed) return "Пациент";
	const parts = trimmed.split(/\s+/);
	if (parts.length >= 3 && parts[1] && parts[2]) {
		return `${parts[1]} ${parts[2]}`;
	}
	if (parts.length === 2 && parts[1]) {
		return parts[1];
	}
	return parts[0] || "Пациент";
}

export const sanitizePhoneNumber = cleanPhoneDigits;

export function generate1ClickBookingLink(options: {
	readonly baseUrl?: string | undefined;
	readonly patientId: string;
	readonly doctorId?: string | undefined;
	readonly cycleType?: RecallCycleType | undefined;
	readonly source?: string | undefined;
	readonly campaign?: string | undefined;
}): string {
	const base = options.baseUrl ? options.baseUrl.replace(/\/+$/, "") : "";
	const path = `${base}/booking`;
	const params = new URLSearchParams();

	params.set("patient_id", options.patientId);
	if (options.doctorId) {
		params.set("doctor_id", options.doctorId);
	}
	if (options.cycleType) {
		params.set("recall_cycle", options.cycleType);
	}
	params.set("source", options.source ?? "recall_engine");
	params.set("utm_campaign", options.campaign ?? `recall_${options.cycleType ?? "general"}`);

	return `${path}?${params.toString()}`;
}

export function generatePdnProtectedRecallMessage(
	candidate: PatientRecallRecord,
	options: { readonly clinicName?: string | undefined; readonly baseUrl?: string | undefined } = {},
): string {
	const clinicName = options.clinicName || "Стоматология ДЕНТЕ";
	const politeName = extractPolitePatientName(candidate.fullName);
	const bookingUrl = generate1ClickBookingLink({
		baseUrl: options.baseUrl,
		patientId: candidate.patientId,
		doctorId: candidate.attendingDoctorId,
		cycleType: candidate.cycleType,
		source: "recall_pdn_152fz",
	});

	const visitPart = candidate.lastVisitDate ? ` (прошлый визит был ${candidate.lastVisitDate})` : "";
	return `${politeName}, подошел срок контрольного осмотра в клинике «${clinicName}»${visitPart}. Записаться: ${bookingUrl}`;
}

export function buildWhatsAppUrl(phone: string | null | undefined, text: string): string {
	const cleanPhone = sanitizePhoneNumber(phone);
	const encodedText = encodeURIComponent(text);
	return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
}

export function buildTelegramUrl(phoneOrUsername: string | null | undefined, text: string): string {
	const encodedText = encodeURIComponent(text);
	if (!phoneOrUsername) return `https://t.me/share/url?url=&text=${encodedText}`;
	const clean = phoneOrUsername.trim().replace(/^@/, "");
	if (/^\+?\d+$/.test(clean)) {
		return `https://t.me/+${sanitizePhoneNumber(clean)}?text=${encodedText}`;
	}
	return `https://t.me/${clean}?text=${encodedText}`;
}

export function interpolateRecallTemplate(template: string, variables: RecallTemplateVariables): string {
	return template
		.replace(/\{\{PATIENT_FIRST_NAME\}\}/g, variables.patientFirstName)
		.replace(/\{\{PATIENT_FULL_NAME\}\}/g, variables.patientFullName)
		.replace(/\{\{DOCTOR_NAME\}\}/g, variables.doctorName)
		.replace(/\{\{CLINIC_NAME\}\}/g, variables.clinicName)
		.replace(/\{\{SERVICE_NAME\}\}/g, variables.serviceName)
		.replace(/\{\{LAST_VISIT_DATE\}\}/g, variables.lastVisitDateFormatted)
		.replace(/\{\{DUE_DATE\}\}/g, variables.dueDateFormatted)
		.replace(/\{\{INTERVAL_DESC\}\}/g, variables.intervalDescription)
		.replace(/\{\{BOOKING_URL\}\}/g, variables.bookingUrl)
		.replace(/\{\{PHONE\}\}/g, variables.phone);
}
