import { containsAnyFuzzyRoot } from "../stringUtils.js";
import type { ParsedTimeResult } from "./bookingParserTypes.js";

const HALF_MAP: Record<string, number> = {
	"1": 12, первого: 12, "2": 13, второго: 13, "3": 14, третьего: 14,
	"4": 15, четвертого: 15, "5": 16, пятого: 16, "6": 17, шестого: 17,
	"7": 18, седьмого: 18, "8": 19, восьмого: 19, "9": 9, девятого: 9,
	"10": 10, десятого: 10, "11": 11, одиннадцатого: 11, "12": 12, двенадцатого: 12,
};

export function parseBookingDuration(text: string): { durationMinutes: number; explicitFound: boolean; cleanedText: string } {
	let remaining = text;
	if (containsAnyFuzzyRoot(remaining, ["на полчаса", "на пол часа", "полчаса"])) {
		return { durationMinutes: 30, explicitFound: true, cleanedText: remaining.replace(/(?:^|[^а-яёa-z0-9])(на\s+)?(полчаса|пол часа)(?:[^а-яёa-z0-9]|$)/gi, " ") };
	}
	if (containsAnyFuzzyRoot(remaining, ["на полтора часа", "полтора часа"])) {
		return { durationMinutes: 90, explicitFound: true, cleanedText: remaining.replace(/(?:^|[^а-яёa-z0-9])(на\s+)?(полтора часа)(?:[^а-яёa-z0-9]|$)/gi, " ") };
	}
	const minsMatch = remaining.match(/(?:^|[^а-яёa-z0-9])(на\s+)?([1-9][0-9]*)\s*(минут|мин)(?:[^а-яёa-z0-9]|$)/i);
	if (minsMatch) {
		return { durationMinutes: parseInt(minsMatch[2]!, 10), explicitFound: true, cleanedText: remaining.replace(minsMatch[0], " ") };
	}
	const hrsMatch = remaining.match(/(?:^|[^а-яёa-z0-9])(на\s+)?([1-9][0-9]?)\s*(час|часов|часа)(?:[^а-яёa-z0-9]|$)/i);
	if (hrsMatch) {
		return { durationMinutes: parseInt(hrsMatch[2]!, 10) * 60, explicitFound: true, cleanedText: remaining.replace(hrsMatch[0], " ") };
	}
	if (containsAnyFuzzyRoot(remaining, ["на час"])) {
		return { durationMinutes: 60, explicitFound: true, cleanedText: remaining.replace(/(?:^|[^а-яёa-z0-9])(на час)(?:[^а-яёa-z0-9]|$)/gi, " ") };
	}
	return { durationMinutes: 60, explicitFound: false, cleanedText: remaining };
}

export function parseBookingTime(text: string, isCancel = false): ParsedTimeResult {
	let remaining = text;
	let hours = 8, minutes = 0, timeFound = false, durationMinutes = 60, explicitDurationFound = false;

	const rangeRegex = /(?:с|от)\s+([01]?[0-9]|2[0-3])[:\-.]?([0-5][0-9])?\s+(?:до|по)\s+([01]?[0-9]|2[0-3])[:\-.]?([0-5][0-9])?(?=\s|$|[^а-яёa-z0-9])/i;
	const rangeMatch = remaining.match(rangeRegex);
	if (rangeMatch && !isCancel) {
		hours = parseInt(rangeMatch[1]!, 10);
		minutes = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
		const endH = parseInt(rangeMatch[3]!, 10);
		const endM = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : 0;
		let total = endH * 60 + endM - (hours * 60 + minutes);
		if (total < 0) total += 24 * 60;
		durationMinutes = total;
		explicitDurationFound = true;
		timeFound = true;
		remaining = remaining.replace(rangeMatch[0], " ");
	} else if (!isCancel) {
		const dur = parseBookingDuration(remaining);
		durationMinutes = dur.durationMinutes;
		explicitDurationFound = dur.explicitFound;
		remaining = dur.cleanedText;

		const halfMatch = remaining.match(/(?:(?:в|на|к)\s+)?(?:пол[\s-]*|в\s+половину\s+|половина\s+)([1-9]|1[0-2]|первого|второго|третьего|четвертого|пятого|шестого|седьмого|восьмого|девятого|десятого|одиннадцатого|двенадцатого)(?=\s|$|[^а-яё0-9])/i);
		const timeMatch = remaining.match(/(?:^|\s|\b)(?:в\s+)?([01]?[0-9]|2[0-3])[:\-.]([0-5][0-9])(?=\s|$|\b)/i);
		const timeMatchSpace = remaining.match(/(?:^|\s)(?:в|на)?\s*([0-1]?[0-9]|2[0-3])\s+([0-5][0-9])(?=\s|$)/);
		const hourMatch = remaining.match(/(?:(?:в|на|к)\s+)?([01]?[0-9]|2[0-3])(?:\s*(часов|утра|вечера|вечером|дня))(?=\s|$)/i);
		const pureHourMatch = remaining.match(/(?:в\s+)([01]?[0-9]|2[0-3])(?=\s|$|[^а-яёa-z0-9])/i);

		if (halfMatch) {
			hours = HALF_MAP[halfMatch[1]?.toLowerCase() ?? ""] || 12;
			minutes = 30; timeFound = true; remaining = remaining.replace(halfMatch[0], " ");
		} else if (timeMatch) {
			hours = parseInt(timeMatch[1]!, 10); minutes = parseInt(timeMatch[2]!, 10); timeFound = true; remaining = remaining.replace(timeMatch[0], " ");
		} else if (timeMatchSpace) {
			hours = parseInt(timeMatchSpace[1]!, 10); minutes = parseInt(timeMatchSpace[2]!, 10); timeFound = true; remaining = remaining.replace(timeMatchSpace[0], " ");
		} else if (hourMatch) {
			hours = parseInt(hourMatch[1]!, 10); minutes = 0; timeFound = true;
			if ((hourMatch[0].includes("вечера") || hourMatch[0].includes("вечером")) && hours < 12) hours += 12;
			if (hourMatch[0].includes("дня") && hours < 12 && hours >= 1) hours += 12;
			if (hours >= 1 && hours <= 8 && !hourMatch[0].includes("утра")) hours += 12;
			remaining = remaining.replace(hourMatch[0], " ");
		} else if (pureHourMatch) {
			hours = parseInt(pureHourMatch[1]!, 10);
			if (hours >= 1 && hours <= 8) hours += 12;
			minutes = 0; timeFound = true; remaining = remaining.replace(pureHourMatch[0], " ");
		}
	}

	return { hours, minutes, timeFound, durationMinutes, explicitDurationFound, remainingText: remaining };
}
