import { normalizePhoneDigits } from "./phoneFormatters.js";

/**
 * 1-Click Messaging URL & Confirmation Templates (WhatsApp, SMS, Telegram)
 */

export function generateAppointmentConfirmationMessage(params: {
	patientName: string;
	doctorName?: string | null;
	appointmentStartsAt: string;
	clinicName?: string;
	clinicAddress?: string | null;
	templateType?: "confirmation" | "reminder" | "urgent";
}): string {
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

export function generateWhatsAppConfirmationUrl(phone: string, text: string): string {
	const clean = normalizePhoneDigits(phone);
	const e164 = clean.startsWith("8") ? `7${clean.slice(1)}` : clean;
	return `https://wa.me/${e164}?text=${encodeURIComponent(text)}`;
}

export function generateSmsConfirmationUrl(phone: string, text: string): string {
	const clean = normalizePhoneDigits(phone);
	const e164 = clean.startsWith("8") ? `+7${clean.slice(1)}` : `+${clean}`;
	return `sms:${e164}?body=${encodeURIComponent(text)}`;
}

export function generateTelegramConfirmationUrl(phone: string, text: string): string {
	const clean = normalizePhoneDigits(phone);
	const e164 = clean.startsWith("8") ? `+7${clean.slice(1)}` : `+${clean}`;
	return `https://t.me/share/url?url=${encodeURIComponent(e164)}&text=${encodeURIComponent(text)}`;
}

export function openWhatsAppChat(phone: string, text: string): void {
	if (typeof globalThis !== "undefined") {
		const g = globalThis as unknown as { window?: { open?: (url: string, target: string) => void } };
		if (g.window?.open) {
			const url = generateWhatsAppConfirmationUrl(phone, text);
			g.window.open(url, "_blank");
		}
	}
}
