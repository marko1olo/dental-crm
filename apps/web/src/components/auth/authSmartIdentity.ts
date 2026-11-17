import {
	getCachedActiveStaffUser,
	getCachedClinicProfile,
} from "../../lib/offlineStorage";
import type { StaffUser } from "./staffPinPad/staffPinPadTypes";
import { DEMO_SHOWCASE_ORG_ID } from "../../lib/demoMode";

export type IdentityType = "email" | "phone" | "clinic_id";

/**
 * Интеллектуальное автоопределение формата идентификатора на лету:
 * - Если есть '@' -> Email
 * - Если начинается с '+' или состоит только из цифр/дефисов/скобок -> Телефон
 * - Иначе -> ID клиники, алиас организации или кодовый логин
 */
export function detectIdentityType(rawInput: string): IdentityType {
	const trimmed = rawInput.trim();
	if (!trimmed) return "email";

	if (trimmed.includes("@")) {
		return "email";
	}

	const digitsOnly = trimmed.replace(/[\s\-\(\)\+]/g, "");
	// Если после очистки знаков пунктуации остались только цифры (длиной от 6 до 15 знаков),
	// и в исходной строке нет букв
	if (
		/^\d{6,15}$/.test(digitsOnly) &&
		!/[a-zA-Zа-яА-ЯёЁ]/.test(trimmed)
	) {
		return "phone";
	}

	return "clinic_id";
}

/**
 * Живое динамическое приветствие по времени суток для клиники и доктора
 */
export function getLiveTimeOfDayGreeting(): {
	greeting: string;
	timeSlot: "morning" | "day" | "evening" | "night";
} {
	const hour = new Date().getHours();

	if (hour >= 5 && hour < 12) {
		return { greeting: "Доброе утро, доктор", timeSlot: "morning" };
	}
	if (hour >= 12 && hour < 18) {
		return { greeting: "Добрый день, доктор", timeSlot: "day" };
	}
	if (hour >= 18 && hour < 23) {
		return { greeting: "Добрый вечер, доктор", timeSlot: "evening" };
	}
	return { greeting: "Доброй ночи, доктор", timeSlot: "night" };
}

export interface QuickResumeData {
	hasResume: boolean;
	fullName: string;
	roleLabel: string;
	rawUser?: StaffUser | null;
	clinicName?: string | undefined;
}

/**
 * Извлекает данные предыдущей сессии для фичи Quick Resume (Быстрый возврат в 1 клик)
 */
export function getQuickResumeData(): QuickResumeData {
	const rawCachedUser = getCachedActiveStaffUser();
	const cachedUser = (rawCachedUser && typeof rawCachedUser === "object" ? rawCachedUser : null) as (Partial<StaffUser> & { name?: string }) | null;

	const cachedClinic = getCachedClinicProfile() as {
		name?: string;
		clinicName?: string;
	} | null;

	if (cachedUser && (cachedUser.fullName || cachedUser.name || cachedUser.id)) {
		const name = cachedUser.fullName || (typeof cachedUser.name === "string" ? cachedUser.name : "") || "Доктор";
		let roleLabel = "Врач клиники";
		if (cachedUser.role === "owner") roleLabel = "Главный врач / Владелец";
		else if (cachedUser.role === "admin") roleLabel = "Администратор";
		else if (cachedUser.role === "doctor") roleLabel = "Врач-стоматолог";

		const normalizedUser: StaffUser = {
			id: typeof cachedUser.id === "string" && cachedUser.id ? cachedUser.id : "demo-doctor-chief",
			fullName: name,
			role: typeof cachedUser.role === "string" ? cachedUser.role : "doctor",
			organizationId: typeof cachedUser.organizationId === "string" ? cachedUser.organizationId : DEMO_SHOWCASE_ORG_ID,
			email: typeof cachedUser.email === "string" ? cachedUser.email : undefined,
		};

		return {
			hasResume: true,
			fullName: name,
			roleLabel,
			rawUser: normalizedUser,
			clinicName: cachedClinic?.name || cachedClinic?.clinicName,
		};
	}

	return {
		hasResume: false,
		fullName: "",
		roleLabel: "",
		rawUser: null,
	};
}
