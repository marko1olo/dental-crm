import { normalizePhoneDigits } from "../telephonyHelpers";
import type {
	AppointmentConfirmationParams,
	OrthopedicReadyMessageParams,
} from "./telephonyClinicalTypes";

/**
 * Generates an appointment confirmation message for WhatsApp / SMS.
 */
export function generateAppointmentConfirmationMessage(
	params: AppointmentConfirmationParams,
): string {
	const dateObj = new Date(params.appointmentStartsAt);
	const formattedDate = dateObj.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "short",
	});
	const formattedTime = dateObj.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
	const doctor = params.doctorName ? ` к врачу ${params.doctorName}` : "";
	const clinic = params.clinicName || "клинике DENTE";
	const address = params.clinicAddress ? ` (${params.clinicAddress})` : "";

	if (params.templateType === "urgent") {
		return `Здравствуйте, ${params.patientName}! Ждём вас на срочный приём в ${clinic}${address}: ${formattedDate} в ${formattedTime}${doctor}. При себе необходимо иметь паспорт. Подтвердите визит ответным сообщением ДА.`;
	}

	if (params.templateType === "reminder") {
		return `Здравствуйте, ${params.patientName}! Напоминаем о сегодняшнем визите в ${clinic}: ${formattedDate} в ${formattedTime}${doctor}. Пожалуйста, приходите за 5-10 минут до начала приёма.`;
	}

	return `Здравствуйте, ${params.patientName}! Напоминаем о вашей записи в ${clinic}: ${formattedDate} в ${formattedTime}${doctor}. Подтверждаете визит? Ответьте ДА или позвоните нам.`;
}

/**
 * Generates an orthopedic ready message for SMS / WhatsApp (Mandates 8b, 8d, 8e).
 * Strict zero emojis, polite natural clinical Russian tone with tooth FDI, material, and doctor.
 */
export function generateOrthopedicReadyMessage(
	params: OrthopedicReadyMessageParams,
): string {
	const firstName = params.patientName
		? params.patientName.split(" ")[1] || params.patientName.split(" ")[0] || "пациент"
		: "пациент";
	const teeth = Array.isArray(params.toothFdi)
		? params.toothFdi.join(", ")
		: params.toothFdi
			? String(params.toothFdi)
			: "16";
	const mat = params.material || "ортопедическая конструкция";
	const doc = params.doctorName || "лечащего врача";
	const clinic = params.clinicName || "DENTE";
	const phone = params.clinicPhone || "+7 (495) 000-00-00";
	const bookingUrl = params.bookingUrl || "https://dente.ru/book";

	if (params.channel === "sms") {
		return `${firstName}, ваша работа (${mat}, зуб ${teeth}) поступила в клинику ${clinic}. Ждем вас на примерку/фиксацию к д-ру ${doc}. Запись: ${phone}`;
	}

	const orderStr = params.orderNumber ? ` по наряду № ${params.orderNumber}` : "";
	return `Добрый день, ${firstName}! Рады сообщить, что ваша ортопедическая работа${orderStr} (${mat}, зуб ${teeth}) готова и доставлена в клинику ${clinic}. Доктор ${doc} готов провести примерку и постоянную фиксацию. Пожалуйста, сообщите удобное время для визита по тел. ${phone} или запишитесь онлайн: ${bookingUrl}. С заботой, стоматология ${clinic}!`;
}

/**
 * Creates a WhatsApp web/app link to trigger 1-click confirmation message.
 */
export function generateWhatsAppConfirmationUrl(
	phone: string,
	text: string,
): string {
	const clean = normalizePhoneDigits(phone);
	let e164 = clean;
	if (clean.length === 10) {
		e164 = `7${clean}`;
	} else if (clean.length === 11 && clean.startsWith("8")) {
		e164 = `7${clean.slice(1)}`;
	}
	return `https://wa.me/${e164}?text=${encodeURIComponent(text)}`;
}

/**
 * Creates an SMS URI to trigger 1-click SMS client.
 */
export function generateSmsConfirmationUrl(phone: string, text: string): string {
	const clean = normalizePhoneDigits(phone);
	let e164 = `+${clean}`;
	if (clean.length === 10) {
		e164 = `+7${clean}`;
	} else if (clean.length === 11 && clean.startsWith("8")) {
		e164 = `+7${clean.slice(1)}`;
	}
	return `sms:${e164}?body=${encodeURIComponent(text)}`;
}

/**
 * Creates a Telegram link for appointment confirmation.
 */
export function generateTelegramConfirmationUrl(
	phone: string,
	text: string,
): string {
	const clean = normalizePhoneDigits(phone);
	let e164 = `+${clean}`;
	if (clean.length === 10) {
		e164 = `+7${clean}`;
	} else if (clean.length === 11 && clean.startsWith("8")) {
		e164 = `+7${clean.slice(1)}`;
	}
	return `https://t.me/share/url?url=${encodeURIComponent(e164)}&text=${encodeURIComponent(text)}`;
}

/**
 * Opens WhatsApp chat via wa.me link.
 */
export function openWhatsAppChat(phone: string, text: string): void {
	if (typeof window === "undefined") return;
	const url = generateWhatsAppConfirmationUrl(phone, text);
	window.open(url, "_blank");
}
