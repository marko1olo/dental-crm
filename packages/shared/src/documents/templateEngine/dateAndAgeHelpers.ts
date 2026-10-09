import { formatKopecksRu, parseKopecks } from "../../money.js";
import type { PassportData } from "./types.js";

const RU_MONTHS_GENITIVE = [
	"января",
	"февраля",
	"марта",
	"апреля",
	"мая",
	"июня",
	"июля",
	"августа",
	"сентября",
	"октября",
	"ноября",
	"декабря",
];

export function formatDateDdMmYyyy(val: unknown): string {
	if (!val) return "";
	if (typeof val === "string") {
		const trimmed = val.trim();
		if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) return trimmed;
		const d = new Date(trimmed);
		if (Number.isNaN(d.getTime())) return trimmed;
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const year = d.getFullYear();
		return `${day}.${month}.${year}`;
	}
	if (val instanceof Date) {
		if (Number.isNaN(val.getTime())) return "";
		const day = String(val.getDate()).padStart(2, "0");
		const month = String(val.getMonth() + 1).padStart(2, "0");
		const year = val.getFullYear();
		return `${day}.${month}.${year}`;
	}
	return String(val);
}

export function formatDateFullRussian(val: unknown): string {
	if (!val) return "";
	let d: Date;
	if (val instanceof Date) {
		d = val;
	} else if (typeof val === "string") {
		const trimmed = val.trim();
		const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
		if (dotMatch) {
			const day = Number.parseInt(dotMatch[1] ?? "1", 10);
			const month = Number.parseInt(dotMatch[2] ?? "1", 10) - 1;
			const year = Number.parseInt(dotMatch[3] ?? "2026", 10);
			d = new Date(year, month, day);
		} else {
			d = new Date(trimmed);
		}
	} else {
		return String(val);
	}

	if (Number.isNaN(d.getTime())) return typeof val === "string" ? val : "";
	const day = d.getDate();
	const monthName = RU_MONTHS_GENITIVE[d.getMonth()] ?? "";
	const year = d.getFullYear();
	return `${day} ${monthName} ${year} г.`;
}

export function formatInitials(fullName: string | null | undefined): string {
	if (!fullName || !fullName.trim()) return "";
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "";
	if (parts.length === 1) return parts[0] ?? "";
	const firstInitial = parts[1]?.[0] ? `${parts[1][0].toUpperCase()}.` : "";
	const secondInitial = parts[2]?.[0] ? `${parts[2][0].toUpperCase()}.` : "";
	return [parts[0], firstInitial, secondInitial].filter(Boolean).join(" ");
}

export function calculatePatientAgeNumber(
	birthDateVal: unknown,
): number | null {
	if (!birthDateVal) return null;
	let bDate: Date;
	if (birthDateVal instanceof Date) {
		bDate = birthDateVal;
	} else if (typeof birthDateVal === "string") {
		const trimmed = birthDateVal.trim();
		const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
		if (dotMatch) {
			const day = Number.parseInt(dotMatch[1] ?? "1", 10);
			const month = Number.parseInt(dotMatch[2] ?? "1", 10) - 1;
			const year = Number.parseInt(dotMatch[3] ?? "2026", 10);
			bDate = new Date(year, month, day);
		} else {
			bDate = new Date(trimmed);
		}
	} else {
		return null;
	}

	if (Number.isNaN(bDate.getTime())) return null;
	const now = new Date();
	let age = now.getFullYear() - bDate.getFullYear();
	const mDiff = now.getMonth() - bDate.getMonth();
	if (mDiff < 0 || (mDiff === 0 && now.getDate() < bDate.getDate())) {
		age--;
	}
	return age < 0 ? 0 : age;
}

export function calculatePatientAgeString(birthDateVal: unknown): string {
	const age = calculatePatientAgeNumber(birthDateVal);
	if (age === null) return "";
	return String(age);
}

export function calculatePatientAgeWithUnit(birthDateVal: unknown): string {
	const age = calculatePatientAgeNumber(birthDateVal);
	if (age === null) return "";
	const rem10 = age % 10;
	const rem100 = age % 100;
	let unit = "лет";
	if (rem10 === 1 && rem100 !== 11) {
		unit = "год";
	} else if (rem10 >= 2 && rem10 <= 4 && (rem100 < 10 || rem100 >= 20)) {
		unit = "года";
	}
	return `${age} ${unit}`;
}

export function formatDateRussianDayMonthYear(val: unknown): string {
	if (!val) return "";
	let d: Date;
	if (val instanceof Date) {
		d = val;
	} else if (typeof val === "string") {
		const trimmed = val.trim();
		const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
		if (dotMatch) {
			const day = Number.parseInt(dotMatch[1] ?? "1", 10);
			const month = Number.parseInt(dotMatch[2] ?? "1", 10) - 1;
			const year = Number.parseInt(dotMatch[3] ?? "2026", 10);
			d = new Date(year, month, day);
		} else {
			d = new Date(trimmed);
		}
	} else {
		return String(val);
	}

	if (Number.isNaN(d.getTime())) return typeof val === "string" ? val : "";
	const day = d.getDate();
	const monthName = RU_MONTHS_GENITIVE[d.getMonth()] ?? "";
	const year = d.getFullYear();
	return `${day} ${monthName} ${year}`;
}

export function extractYearFromDate(val: unknown): string {
	if (!val) return "";
	if (typeof val === "string") {
		const match = val.match(/\b(\d{4})\b/);
		if (match) return match[1] ?? "";
	}
	if (val instanceof Date && !Number.isNaN(val.getTime())) {
		return String(val.getFullYear());
	}
	return "";
}

export function formatPassportFullString(
	passport?: PassportData | null | undefined,
): string {
	if (!passport) return "";
	const parts: string[] = [];
	const seriesNumber = [passport.series, passport.number]
		.filter(Boolean)
		.join(" ");
	if (seriesNumber) {
		parts.push(`Паспорт РФ: ${seriesNumber}`);
	}
	if (passport.issuedDate) {
		parts.push(`Выдан: ${formatDateDdMmYyyy(passport.issuedDate)}`);
	}
	if (passport.issuedBy) {
		parts.push(passport.issuedBy);
	}
	if (passport.divisionCode) {
		parts.push(`Код подразделения: ${passport.divisionCode}`);
	}
	return parts.join(", ");
}

export function formatMoney(
	amountKopecksOrUnits: number | string,
	_currency = "RUB",
): string {
	try {
		const raw =
			typeof amountKopecksOrUnits === "string"
				? amountKopecksOrUnits.trim().replace(",", ".")
				: amountKopecksOrUnits;
		const kopecks = parseKopecks(raw);
		return formatKopecksRu(kopecks);
	} catch {
		return formatKopecksRu(0);
	}
}
