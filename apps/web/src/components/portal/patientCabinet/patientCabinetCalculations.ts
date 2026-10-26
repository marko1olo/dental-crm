/**
 * Formatters and Date/Warranty Calculations
 * (DOMAIN: PORTAL PATIENT CABINET - LAYER 2 ENGINE)
 */

import type {
	CheckupDaysCalculation,
	WarrantyDaysCalculation,
} from "./patientCabinetProfileTypes.js";

export function formatRubles(rub: number): string {
	const whole = Math.round(rub);
	return whole.toLocaleString("ru-RU") + "\u00A0₽";
}

export function formatKopecksToRub(kopecks: number): string {
	const rub = kopecks / 100;
	return rub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "\u00A0₽";
}

export function formatRussianDateIso(isoDate: string): string {
	if (!isoDate) return "—";
	const parts = isoDate.split("T")[0]?.split("-");
	if (!parts || parts.length !== 3) return isoDate;
	const [year, month, day] = parts;
	const months = [
		"января", "февраля", "марта", "апреля", "мая", "июня",
		"июля", "августа", "сентября", "октября", "ноября", "декабря",
	];
	const mIndex = parseInt(month || "1", 10) - 1;
	return `${parseInt(day || "1", 10)} ${months[mIndex] || month} ${year}`;
}

export function calculateCheckupDaysRemaining(
	nextCheckupDateIso: string,
	fromDateIso?: string,
): CheckupDaysCalculation {
	const now = fromDateIso ? new Date(fromDateIso).getTime() : Date.now();
	const target = new Date(nextCheckupDateIso).getTime();
	const diffMs = target - now;
	const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	const isOverdue = days < 0;
	const isUrgent = days >= 0 && days <= 14;

	let labelRu = "";
	if (isOverdue) {
		labelRu = `Просрочен на ${Math.abs(days)} дн. (риск аннулирования гарантии)`;
	} else if (days === 0) {
		labelRu = "Сегодня (обязательный визит)";
	} else if (days === 1) {
		labelRu = "Завтра (обязательный визит)";
	} else {
		labelRu = `Через ${days} дн.`;
	}

	return {
		daysRemaining: days,
		isOverdue,
		isUrgent,
		formattedDueDateRu: formatRussianDateIso(nextCheckupDateIso),
		labelRu,
	};
}

export function calculateWarrantyValidity(
	expirationDateIso: string,
	fromDateIso?: string,
): WarrantyDaysCalculation {
	const now = fromDateIso ? new Date(fromDateIso).getTime() : Date.now();
	const target = new Date(expirationDateIso).getTime();
	const diffMs = target - now;
	const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	const isExpired = days <= 0;

	let labelRu = "";
	if (isExpired) {
		labelRu = "Срок гарантии истек";
	} else {
		labelRu = `Действует еще ${days} дн.`;
	}

	return {
		daysRemaining: Math.max(0, days),
		isExpired,
		formattedExpirationDateRu: formatRussianDateIso(expirationDateIso),
		labelRu,
	};
}
