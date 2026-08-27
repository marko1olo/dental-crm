/**
 * masking152Fz.ts — Движок маскирования персональных данных (152-ФЗ РФ и ст. 13 323-ФЗ Врачебная тайна).
 *
 * Обеспечивает защиту ПДн пациентов и сотрудников при отображении в интерфейсах
 * для персонала с ограниченными правами (ассистенты, младший медперсонал, стажёры).
 */

import { canAccessFullPatientPii } from "./rbacMatrix.js";

/**
 * Маскирует российский номер телефона.
 * Пример: "+7 (916) 123-45-67" -> "+7 (916) •••-••-67"
 *         "89161234567" -> "+7 (916) •••-••-67"
 */
export function maskRussianPhone(phone: string | null | undefined): string {
	if (!phone || typeof phone !== "string") return "";
	const trimmed = phone.trim();
	if (!trimmed) return "";

	const digits = trimmed.replace(/\D/g, "");
	if (digits.length < 10) {
		return "••••••••••";
	}

	// Нормализуем последние 10 цифр
	const clean10 = digits.slice(-10);
	const code = clean10.slice(0, 3);
	const last2 = clean10.slice(-2);

	return `+7 (${code}) •••-••-${last2}`;
}

/**
 * Маскирует паспортные данные РФ (серия и номер).
 * Пример: "45 12 789456" -> "45 •• ••••••"
 */
export function maskRussianPassport(passport: string | null | undefined): string {
	if (!passport || typeof passport !== "string") return "";
	const digits = passport.replace(/\D/g, "");
	if (digits.length < 10) return "•• •• ••••••";

	const seriesPrefix = digits.slice(0, 2);
	return `${seriesPrefix} •• ••••••`;
}

/**
 * Маскирует СНИЛС (11 цифр).
 * Пример: "123-456-789 01" -> "•••-•••-••• 01"
 */
export function maskRussianSnils(snils: string | null | undefined): string {
	if (!snils || typeof snils !== "string") return "";
	const digits = snils.replace(/\D/g, "");
	if (digits.length < 11) return "•••-•••-••• ••";

	const checkSum = digits.slice(-2);
	return `•••-•••-••• ${checkSum}`;
}

/**
 * Маскирует полис ОМС (16 цифр).
 * Пример: "1234567890123456" -> "1234 •••• •••• 3456"
 */
export function maskRussianOmsPolicy(policy: string | null | undefined): string {
	if (!policy || typeof policy !== "string") return "";
	const digits = policy.replace(/\D/g, "");
	if (digits.length < 16) return "•••• •••• •••• ••••";

	const first4 = digits.slice(0, 4);
	const last4 = digits.slice(-4);
	return `${first4} •••• •••• ${last4}`;
}

/**
 * Маскирует адрес электронной почты.
 * Пример: "ivanov.doctor@example.com" -> "i•••••••r@example.com"
 */
export function maskEmailAddress(email: string | null | undefined): string {
	if (!email || typeof email !== "string") return "";
	const trimmed = email.trim();
	const atIndex = trimmed.indexOf("@");
	if (atIndex <= 1) return "••••@••••.••";

	const localPart = trimmed.slice(0, atIndex);
	const domainPart = trimmed.slice(atIndex);

	if (localPart.length <= 2) {
		return `${localPart[0]}•${domainPart}`;
	}

	const firstChar = localPart[0];
	const lastChar = localPart[localPart.length - 1];
	const maskedMiddle = "•".repeat(Math.min(7, localPart.length - 2));

	return `${firstChar}${maskedMiddle}${lastChar}${domainPart}`;
}

/**
 * Маскирует адрес проживания (сохраняет субъект/город, скрывает улицу и квартиру).
 * Пример: "г. Москва, ул. Тверская, д. 12, кв. 4" -> "г. Москва, [ул. и дом скрыты 152-ФЗ]"
 */
export function maskResidentialAddress(address: string | null | undefined): string {
	if (!address || typeof address !== "string") return "";
	const trimmed = address.trim();
	if (!trimmed) return "";

	const parts = trimmed.split(/,/);
	if (parts.length > 0 && parts[0] && parts[0].trim().length > 0) {
		const regionOrCity = parts[0].trim();
		return `${regionOrCity}, [ул. и дом скрыты 152-ФЗ]`;
	}

	return "[Адрес скрыт 152-ФЗ]";
}

/**
 * Инициализирует или маскирует ФИО для ограниченного просмотра
 * Пример: "Иванов Иван Иванович" -> "Иванов И. И."
 */
export function formatInitialsOnly(fullName: string | null | undefined): string {
	if (!fullName || typeof fullName !== "string") return "";
	const parts = fullName.trim().split(/\s+/);
	if (parts.length === 1) return parts[0] ?? "";
	if (parts.length === 2) return `${parts[0]} ${parts[1]?.[0] ?? ""}.`;
	return `${parts[0]} ${parts[1]?.[0] ?? ""}. ${parts[2]?.[0] ?? ""}.`;
}

export interface PatientPiiRecord {
	readonly id?: string;
	readonly fullName?: string | null;
	readonly phone?: string | null;
	readonly email?: string | null;
	readonly passport?: string | null;
	readonly snils?: string | null;
	readonly omsPolicy?: string | null;
	readonly address?: string | null;
	readonly birthDate?: string | null;
	readonly [key: string]: unknown;
}

/**
 * Контекстное маскирование карточки пациента по роли текущего пользователя
 */
export function sanitizePatientRecordForViewer<T extends PatientPiiRecord>(
	patient: T,
	viewerRole: string | null | undefined,
	hasPiiGrant = false,
): T {
	if (!patient || typeof patient !== "object") return patient;

	// Если роль имеет полный доступ или выдан персональный грант
	if (hasPiiGrant || canAccessFullPatientPii(viewerRole)) {
		return patient;
	}

	return {
		...patient,
		phone: patient.phone ? maskRussianPhone(patient.phone) : patient.phone,
		email: patient.email ? maskEmailAddress(patient.email) : patient.email,
		passport: patient.passport ? maskRussianPassport(patient.passport) : patient.passport,
		snils: patient.snils ? maskRussianSnils(patient.snils) : patient.snils,
		omsPolicy: patient.omsPolicy ? maskRussianOmsPolicy(patient.omsPolicy) : patient.omsPolicy,
		address: patient.address ? maskResidentialAddress(patient.address) : patient.address,
	};
}
