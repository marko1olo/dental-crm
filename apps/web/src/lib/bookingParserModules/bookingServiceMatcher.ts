import { containsAnyFuzzyRoot } from "../stringUtils.js";

export const DURATION_MAP: Record<string, number> = {
	имплант: 120, имплантаци: 120, "all-on-4": 240, пульпит: 90, периодонтит: 90, кариес: 60,
	удалени: 45, восьмерк: 60, гигиен: 45, чистк: 45, профгигиен: 45, ортодонт: 60, брекет: 90,
	элайнер: 60, кт: 15, клкт: 15, оптг: 15, осмотр: 30, консультаци: 30, слепк: 30, коронк: 60,
	примерк: 30, винир: 120, синус: 120, швы: 15, "снятие швов": 15, лечени: 60, лечение: 60,
	терапи: 60, отбеливани: 60, пломб: 60,
};

export const REASON_NAMES: Record<string, string> = {
	имплант: "Имплантация", имплантаци: "Имплантация", "all-on-4": "All-on-4", пульпит: "Пульпит",
	периодонтит: "Периодонтит", кариес: "Кариес", удалени: "Удаление зуба", восьмерк: "Удаление зуба мудрости",
	гигиен: "Профгигиена", чистк: "Профгигиена", профгигиен: "Профгигиена", ортодонт: "Ортодонтия",
	брекет: "Брекеты", элайнер: "Элайнеры", кт: "КЛКТ", клкт: "КЛКТ", оптг: "ОПТГ", осмотр: "Осмотр",
	консультаци: "Консультация", слепк: "Слепки", коронк: "Коронка", примерк: "Примерка",
	винир: "Виниры", синус: "Синус-лифтинг", швы: "Снятие швов", "снятие швов": "Снятие швов",
	лечени: "Лечение зуба", лечение: "Лечение зуба", терапи: "Терапия", отбеливани: "Отбеливание",
	пломб: "Установка пломбы",
};

export function matchBookingService(
	text: string,
	isCancel: boolean,
	currentDuration = 60,
	explicitDurationFound = false,
): { reason?: string; durationMinutes: number; remainingText: string } {
	let remaining = text;
	let durationMinutes = currentDuration;
	let matchedReasonKey = "";

	if (!isCancel) {
		for (const [key, duration] of Object.entries(DURATION_MAP)) {
			if (containsAnyFuzzyRoot(remaining, [key])) {
				if (key.length > matchedReasonKey.length) {
					matchedReasonKey = key;
					if (!explicitDurationFound) durationMinutes = duration;
				}
			}
		}
	}

	let reason: string | undefined;
	if (matchedReasonKey && !isCancel) {
		reason = REASON_NAMES[matchedReasonKey] || (matchedReasonKey.charAt(0).toUpperCase() + matchedReasonKey.slice(1));
		remaining = remaining.replace(
			new RegExp(`(?:^|[^а-яёa-z0-9])\\S*${matchedReasonKey}\\S*(?:[^а-яёa-z0-9]|$)`, "ig"),
			" ",
		);
	}

	return { reason, durationMinutes, remainingText: remaining };
}
