/**
 * Calculates appointment duration in minutes between startsAt and endsAt.
 */
export function getAppointmentDurationMinutes(
	startsAt?: string | null,
	endsAt?: string | null,
	fallbackMinutes = 30,
): number {
	const defaultMinutes = Math.max(1, fallbackMinutes || 30);
	if (!startsAt || !endsAt) return defaultMinutes;
	const startMs = Date.parse(startsAt);
	const endMs = Date.parse(endsAt);
	if (Number.isNaN(startMs) || Number.isNaN(endMs)) return defaultMinutes;
	const diffMinutes = Math.round((endMs - startMs) / 60000);
	return diffMinutes > 0 ? diffMinutes : defaultMinutes;
}

/**
 * Calculates elapsed waiting or in-chair minutes for realtime status badge.
 */
export function getAppointmentElapsedMinutes(appointment?: { startsAt?: string; status?: string } | null): number {
	if (!appointment?.startsAt) return 0;
	const startMs = Date.parse(appointment.startsAt);
	if (Number.isNaN(startMs)) return 0;
	const elapsed = Math.round((Date.now() - startMs) / 60000);
	return Math.max(0, elapsed);
}

/**
 * Calculates number of slots spanned by an appointment based on duration and grid step.
 */
export function calculateAppointmentSpan(
	durationMinutes: number,
	slotStepMinutes = 30,
): number {
	const step = Math.max(1, slotStepMinutes || 30);
	const duration = Math.max(1, durationMinutes || step);
	return Math.max(1, Math.round(duration / step));
}

/**
 * Calculates proportional appointment card height strictly based on durationMinutes.
 * Scale: 15 min = 38px, 30 min = 76px, 60 min = 152px.
 */
export function calculateProportionalCardHeight(durationMinutes: number): number {
	const validMinutes = Math.max(15, durationMinutes || 30);
	return Math.max(38, Math.round((validMinutes / 15) * 38));
}

/**
 * Calculates monolithic appointment card height in pixels corresponding to duration.
 */
export function calculateAppointmentCardHeight(
	durationMinutes: number,
	slotStepMinutes = 30,
	baseSlotHeightPx = 64,
): number {
	const span = calculateAppointmentSpan(durationMinutes, slotStepMinutes);
	return span * baseSlotHeightPx;
}
