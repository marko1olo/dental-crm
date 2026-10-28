import { containsAnyFuzzyRoot } from "../stringUtils.js";
import type { ParsedDateResult } from "./bookingParserTypes.js";

const MONTHS: Record<string, number> = {
	янв: 0, фев: 1, мар: 2, апр: 3, мая: 4, май: 4,
	июн: 5, июл: 6, авг: 7, сен: 8, окт: 9, ноя: 10, дек: 11,
};

const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "сред", "четверг", "пятниц", "суббот"];

function setCalendarDay(target: Date, monthValue: number | null, dayValue: number): void {
	target.setDate(1);
	if (monthValue !== null) target.setMonth(monthValue);
	const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
	target.setDate(Math.min(dayValue, lastDay));
}

export function parseBookingDate(text: string, baseNow = new Date()): ParsedDateResult {
	const now = new Date(baseNow);
	const targetDate = new Date(now);
	let remaining = text;
	let dateFound = false;

	const relativeWords = [
		{ word: "послезавтра", addDays: 2 },
		{ word: "завтра", addDays: 1 },
		{ word: "сегодня", addDays: 0 },
		{ word: "щас", addDays: 0 },
		{ word: "сейчас", addDays: 0 },
	];

	for (const rw of relativeWords) {
		if (containsAnyFuzzyRoot(remaining, [rw.word])) {
			targetDate.setDate(now.getDate() + rw.addDays);
			dateFound = true;
			remaining = remaining.replace(new RegExp(`(?:^|[^а-яёa-z0-9])(${rw.word})(?:[^а-яёa-z0-9]|$)`, "ig"), " ");
			break;
		}
	}

	if (!dateFound) {
		const explicitMatch =
			remaining.match(/(?:на\s+)?([1-9]|[12][0-9]|3[01])\s+([а-я]{3,8})/i) ||
			remaining.match(/(?:на\s+)?([1-9]|[12][0-9]|3[01])\s+число/i);

		if (explicitMatch) {
			const day = parseInt(explicitMatch[1]!, 10);
			const monthStr = explicitMatch[2] ? explicitMatch[2].slice(0, 3).toLowerCase() : undefined;
			const monthIndex = monthStr && MONTHS[monthStr] !== undefined ? MONTHS[monthStr]! : null;
			setCalendarDay(targetDate, monthIndex, day);

			const startOfToday = new Date(now);
			startOfToday.setHours(0, 0, 0, 0);
			if (targetDate.getTime() < startOfToday.getTime()) {
				if (monthIndex !== null) {
					targetDate.setFullYear(targetDate.getFullYear() + 1);
					setCalendarDay(targetDate, monthIndex, day);
				} else {
					targetDate.setDate(1);
					targetDate.setMonth(targetDate.getMonth() + 1);
					setCalendarDay(targetDate, null, day);
				}
			}
			dateFound = true;
			remaining = remaining.replace(explicitMatch[0], " ");
		} else {
			for (let i = 0; i < WEEKDAYS.length; i++) {
				const dayName = WEEKDAYS[i]!;
				if (containsAnyFuzzyRoot(remaining, [dayName])) {
					const currentDay = targetDate.getDay();
					let diff = i - currentDay;
					if (diff <= 0) diff += 7;
					targetDate.setDate(now.getDate() + diff);
					dateFound = true;
					remaining = remaining.replace(new RegExp(`(?:^|[^а-яёa-z0-9])(?:в|на|во|со)?\\s*${dayName}(?:[^а-яёa-z0-9]|$)`, "ig"), " ");
					break;
				}
			}
		}
	}

	return { targetDate, dateFound, remainingText: remaining };
}
