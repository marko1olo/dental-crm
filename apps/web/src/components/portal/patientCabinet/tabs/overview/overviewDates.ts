export function getAppointmentCalendarDates(
	dateIso?: string,
	timeRu?: string,
	durationMinutes = 60,
): {
	readonly startCompact: string;
	readonly endCompact: string;
	readonly startYandex: string;
	readonly endYandex: string;
} {
	let rawDate = (dateIso || "2026-09-01").trim();
	if (rawDate.includes("T")) {
		const parts = rawDate.split("T");
		rawDate = parts[0] || "2026-09-01";
		if (!timeRu && parts[1]) {
			timeRu = parts[1].slice(0, 5);
		}
	}
	let rawTime = (timeRu || "14:30").trim();
	let calculatedDuration = durationMinutes;
	const parseNum = (val: string | undefined, fallback: number): number => {
		if (!val) return fallback;
		const n = Number.parseInt(val, 10);
		return Number.isNaN(n) ? fallback : n;
	};

	if (rawTime.includes("-")) {
		const [startTimeStr, endTimeStr] = rawTime.split("-");
		rawTime = startTimeStr?.trim() || "14:30";
		if (endTimeStr?.trim()) {
			const [endHStr, endMStr] = endTimeStr.trim().split(":");
			const [startHStr, startMStr] = rawTime.split(":");
			const sH = parseNum(startHStr, 14);
			const sM = parseNum(startMStr, 30);
			const eH = parseNum(endHStr, 15);
			const eM = parseNum(endMStr, 30);
			const diff = eH * 60 + eM - (sH * 60 + sM);
			if (diff > 0) calculatedDuration = diff;
		}
	}

	const [hStr, mStr] = rawTime.split(":");
	const h = parseNum(hStr, 14);
	const m = parseNum(mStr, 30);
	const endMinutesTotal = h * 60 + m + calculatedDuration;
	const endH = Math.floor(endMinutesTotal / 60) % 24;
	const endM = endMinutesTotal % 60;

	const pad = (n: number) => String(n).padStart(2, "0");
	const compactDate = rawDate.slice(0, 10).replace(/-/g, "");
	const startCompact = `${compactDate}T${pad(h)}${pad(m)}00`;
	const endCompact = `${compactDate}T${pad(endH)}${pad(endM)}00`;

	const startYandex = `${rawDate.slice(0, 10)}T${pad(h)}:${pad(m)}:00`;
	const endYandex = `${rawDate.slice(0, 10)}T${pad(endH)}:${pad(endM)}:00`;

	return {
		startCompact,
		endCompact,
		startYandex,
		endYandex,
	};
}
