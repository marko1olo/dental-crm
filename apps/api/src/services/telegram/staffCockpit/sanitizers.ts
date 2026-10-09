/**
 * staffCockpit/sanitizers.ts
 *
 * Layer 0/1: Санитайзеры персональных данных (323-ФЗ ст. 13, 152-ФЗ),
 * форматирование ролей персонала и хранилище одноразовых токенов в памяти.
 */

import type {
	MedicalSecrecySanitizeResult,
	StaffAuthTokenRecord,
	StaffCockpitRole,
} from "./types.js";

// ============================================================================
// РОЛЕВАЯ МОДЕЛЬ ПЕРСОНАЛА В ТЕЛЕГРАМ-КОКПИТЕ
// ============================================================================

export function mapUserRoleToStaffCockpitRole(role: string): StaffCockpitRole {
	switch (role.toLowerCase()) {
		case "owner":
		case "admin":
			return "chief_doctor";
		case "doctor":
			return "dentist";
		case "assistant":
			return "assistant";
		case "administrator":
		case "reception":
			return "administrator";
		case "manager":
			return "manager";
		default:
			return "dentist";
	}
}

export function formatStaffRoleLabel(role: StaffCockpitRole | string): string {
	switch (role) {
		case "chief_doctor":
		case "owner":
		case "admin":
			return "Главный врач";
		case "dentist":
		case "doctor":
			return "Врач-стоматолог";
		case "assistant":
			return "Ассистент";
		case "administrator":
		case "reception":
			return "Администратор";
		case "manager":
			return "Управляющий";
		default:
			return "Сотрудник";
	}
}

// ============================================================================
// САНИТАЙЗЕР 323-ФЗ И ЗАЩИТА ВРАЧЕБНОЙ ТАЙНЫ (СТ. 13 323-ФЗ, 152-ФЗ)
// ============================================================================

/**
 * Преобразование полного ФИО пациента в защищенные инициалы (323-ФЗ ст. 13).
 * Например: "Смирнова Анна Сергеевна" -> "Смирнова А.С."
 * "Ковалев Дмитрий" -> "Ковалев Д."
 */
export function formatPatientInitials(fullName: string): string {
	const trimmed = fullName.trim();
	if (!trimmed) return "Пациент";
	const parts = trimmed.split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "Пациент";
	if (parts.length === 1) return parts[0] ?? "Пациент";

	const lastName = parts[0];
	const firstInitial = parts[1] ? `${parts[1][0]?.toUpperCase()}.` : "";
	const patronymicInitial = parts[2] ? `${parts[2][0]?.toUpperCase()}.` : "";
	return `${lastName} ${firstInitial}${patronymicInitial}`.trim();
}

/**
 * Очистка номера телефона для кликабельной кнопки [📞 Позвонить].
 */
export function sanitizePhoneForCall(phone?: string | null): string | null {
	if (!phone) return null;
	const digits = phone.replace(/\D/g, "");
	if (!digits) return null;
	if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		return `+7${digits.slice(1)}`;
	}
	return `+${digits}`;
}

/**
 * Санитайзер сообщений перед отправкой в Telegram Bot API.
 * Блокирует утечку паспортных данных, СНИЛС, полисов ОМС, диагнозов стигм и полных выписок.
 */
export function sanitizeStaffPushFor323FZ(text: string): MedicalSecrecySanitizeResult {
	const strippedItems: string[] = [];
	let safeText = text;

	// 1. Паспортные данные РФ: серия и номер (например, 4510 123456 или "паспорт 45 10 123456")
	const passportRegex = /\b(?:паспорт\s*[:№]?\s*)?([0-9]{2}\s*[0-9]{2}\s+[0-9]{6})\b/gi;
	if (passportRegex.test(safeText)) {
		strippedItems.push("Паспортные данные");
		safeText = safeText.replace(passportRegex, "[ПАСПОРТ СКРЫТ 152-ФЗ]");
	}

	// 2. СНИЛС (например, 123-456-789 01 или 123-456-789-01)
	const snilsRegex = /\b\d{3}[-\s]\d{3}[-\s]\d{3}[-\s]\d{2}\b/g;
	if (snilsRegex.test(safeText)) {
		strippedItems.push("СНИЛС");
		safeText = safeText.replace(snilsRegex, "[СНИЛС СКРЫТ 152-ФЗ]");
	}

	// 3. Полис ОМС (16 цифр)
	const omsRegex = /\b\d{16}\b/g;
	if (omsRegex.test(safeText)) {
		strippedItems.push("Полис ОМС");
		safeText = safeText.replace(omsRegex, "[ПОЛИС ОМС СКРЫТ]");
	}

	// 4. Стигматизирующие соматические диагнозы (ВИЧ, гепатит B/C, сифилис, туберкулез, онкология)
	const somaticStigmaRegex = /(?<![а-яёА-ЯЁ])(?:ВИЧ(?:-инфекци[а-яёА-ЯЁ]*)?|гепатит[а-яёА-ЯЁ]*\s*[BВСC]?|туберкул[её]з[а-яёА-ЯЁ]*|сифилис[а-яёА-ЯЁ]*|онкологи[а-яёА-ЯЁ]*|злокачественн[а-яёА-ЯЁ]*)(?![а-яёА-ЯЁ])/gi;
	if (somaticStigmaRegex.test(safeText)) {
		strippedItems.push("Соматический диагноз особой тайны");
		safeText = safeText.replace(somaticStigmaRegex, "[МЕДТАЙНА 323-ФЗ: см. в ЭМК]");
	}

	// 5. Адрес фактического проживания (ул. ..., д. ..., кв. ...)
	const addressRegex = /(?:ул\.?|улица|пер\.?|проспект|пр-т)\s+[А-Яа-яЁё0-9\s-]+,\s*(?:д\.?|дом)\s*\d+.*?(?:кв\.?\s*\d+)?/gi;
	if (addressRegex.test(safeText)) {
		strippedItems.push("Адрес проживания");
		safeText = safeText.replace(addressRegex, "[АДРЕС СКРЫТ 152-ФЗ]");
	}

	return {
		safeText,
		isCompliant: strippedItems.length === 0,
		strippedItems,
	};
}

// ============================================================================
// ХРАНИЛИЩЕ ОДНОРАЗОВЫХ ТОКЕНОВ В ПАМЯТИ (ДЛЯ ТЕСТОВ И АВТОНОМНОГО ОФЛАЙНА)
// ============================================================================

export const inMemoryStaffTokens = new Map<string, StaffAuthTokenRecord>();

export function clearInMemoryStaffTokensForTest(): void {
	inMemoryStaffTokens.clear();
}
