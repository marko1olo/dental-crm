/**
 * Генерация текста предложения свободного окна пациенту без канцелярита.
 */
import type { WaitlistMatchRow, WaitlistMatchReport } from "./waitlistTypes";

export function generateOfferMessage(
	match: WaitlistMatchRow,
	slot?: WaitlistMatchReport["slot"],
	clinicName?: string,
): string {
	const clinic = clinicName?.trim() || "стоматологии DENTE";
	const doctorText = slot?.doctorName ? ` к врачу ${slot.doctorName}` : "";
	const fromStr = slot?.from || "ближайшее время";
	const toStr = slot?.to ? `–${slot.to}` : "";

	return `Здравствуйте, ${match.patientName}! В ${clinic} освободилось окно на приём${doctorText}: ${fromStr}${toStr}. Предлагаем записать вас на это время. Ответьте на это сообщение или позвоните нам.`;
}

export function sanitizePhoneForCall(phone: string | null): string {
	if (!phone) return "";
	return phone.replace(/[^\d+]/g, "");
}
