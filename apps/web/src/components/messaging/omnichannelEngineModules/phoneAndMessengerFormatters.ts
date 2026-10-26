import {
	formatCurrencyRu,
	formatKopecksRu,
	formatRussianPhone,
	maskRussianPhone as canonicalMaskRussianPhone,
} from "../../../utils/formatters.js";

export { formatRussianPhone, formatCurrencyRu, formatKopecksRu };

/**
 * Маскирует номер телефона для соблюдения защиты персональных данных (скрывает средние цифры):
 * Пример: "+7 (916) 450-12-34" -> "+7 (916) ***-**-34"
 * В каналах SMS/мессенджеров используются ASCII-звездочки для защиты кодировки GSM-7.
 */
export function maskRussianPhone(phone: string): string {
	return canonicalMaskRussianPhone(phone, { maskChar: "*" });
}

/**
 * Формирует прямую web-ссылку WhatsApp (wa.me) с корректной нормализацией номера РФ (7XXXXXXXXXX).
 */
export function formatWhatsAppUrl(phone: string, text?: string): string {
	const digits = phone.replace(/\D/g, "");
	const waDigits =
		digits.length === 11 && digits.startsWith("8")
			? `7${digits.slice(1)}`
			: digits;
	const query = text ? `?text=${encodeURIComponent(text)}` : "";
	return `https://wa.me/${waDigits}${query}`;
}

/**
 * Формирует прямую web-ссылку Telegram (t.me) для контакта или номера телефона.
 */
export function formatTelegramUrl(identifier: string, text?: string): string {
	const clean = identifier.trim().replace(/^@/, "");
	const isPhone = /^\+?\d+$/.test(clean);
	const target = isPhone ? `+${clean.replace(/\D/g, "")}` : clean;
	const query = text ? `?text=${encodeURIComponent(text)}` : "";
	return `https://t.me/${target}${query}`;
}
