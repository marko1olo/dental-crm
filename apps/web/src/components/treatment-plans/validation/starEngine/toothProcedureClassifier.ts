import type { TreatmentPlanItem } from "../../types";

export function isToothExtractionItem(item: TreatmentPlanItem): boolean {
	const code = (item.code804n || "").trim().toUpperCase();
	if (code.startsWith("A16.07.001")) return true;
	const name = (item.name || "").toLowerCase();
	if (
		name.includes("удаление зубного камня") ||
		name.includes("удаление отложений") ||
		name.includes("удаление пломбы") ||
		name.includes("удаление штифта") ||
		name.includes("удаление вкладки") ||
		name.includes("удаление коронки")
	) {
		return false;
	}
	return (
		/удалени[ея]\s+(постоянного\s+|временного\s+|молочного\s+|сложное\s+|простое\s+|ретинированного\s+|дистопированного\s+)?зуб/i.test(
			name,
		) || /экстракци[яи]\s+зуб/i.test(name)
	);
}

export function isToothPreservationOrProstheticItem(item: TreatmentPlanItem): boolean {
	const code = (item.code804n || "").trim().toUpperCase();
	const name = (item.name || "").toLowerCase();

	if (
		code.startsWith("A16.07.006") ||
		name.includes("на имплант") ||
		name.includes("на имплантат")
	) {
		return false;
	}

	if (
		code.startsWith("A16.07.002") ||
		code.startsWith("A16.07.008") ||
		code.startsWith("A16.07.030") ||
		code.startsWith("A16.07.004") ||
		code.startsWith("A16.07.003") ||
		code.startsWith("A16.07.005") ||
		code.startsWith("A16.07.082") ||
		code.startsWith("A16.07.091")
	) {
		return true;
	}

	return (
		/лечение кариеса/i.test(name) ||
		/пломбирование/i.test(name) ||
		/реставрация/i.test(name) ||
		/пульпит/i.test(name) ||
		/периодонтит/i.test(name) ||
		/обработка каналов/i.test(name) ||
		/коронк/i.test(name) ||
		/вкладк/i.test(name) ||
		/винир/i.test(name)
	);
}

export function isValidServiceCatalogCodeFormat(code: string): boolean {
	if (!code || typeof code !== "string") return false;
	const trimmed = code.trim().toUpperCase();
	const regex = /^[AB]\d{2}\.\d{2,3}\.\d{3}(\.\d{3})*$/;
	return regex.test(trimmed);
}

export const isValidOrder804nCodeFormat = isValidServiceCatalogCodeFormat;
