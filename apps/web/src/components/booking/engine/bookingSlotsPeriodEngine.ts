export interface BookingSlot {
	time: string;
	startsAt: string;
	endsAt: string;
	availableDoctorIds?: string[];
	period?: "morning" | "afternoon" | "evening";
}

/**
 * Detects whether the current time is considered nighttime/offline for clinic booking
 * (e.g. 21:00 to 08:30).
 */
export function isClinicNightTime(
	now: Date = new Date(),
	openHour = 8.5,
	closeHour = 21.0,
): boolean {
	const currentHour = now.getHours() + now.getMinutes() / 60;
	return currentHour < openHour || currentHour >= closeHour;
}

/**
 * Groups slots into Morning (before 12:00), Afternoon (12:00-17:00), and Evening (17:00+).
 */
export function groupSlotsByDayPeriod(slots: BookingSlot[]): {
	morning: BookingSlot[];
	afternoon: BookingSlot[];
	evening: BookingSlot[];
} {
	const morning: BookingSlot[] = [];
	const afternoon: BookingSlot[] = [];
	const evening: BookingSlot[] = [];

	for (const slot of slots) {
		const hour = Number.parseInt(slot.time.split(":")[0] ?? "12", 10);
		if (hour < 12) {
			morning.push({ ...slot, period: "morning" });
		} else if (hour < 17) {
			afternoon.push({ ...slot, period: "afternoon" });
		} else {
			evening.push({ ...slot, period: "evening" });
		}
	}

	return { morning, afternoon, evening };
}

/**
 * Honest empty slots list when clinic has no available windows or API is offline.
 * Zero fake slots per Mandate 8a & 8k (No mocks / Truth in booking).
 */
export function generateFallbackSlots(_selectedDate: string): BookingSlot[] {
	return [];
}
