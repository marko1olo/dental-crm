const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolveValidVisitUuid(
	openVisitId: string | null,
	openVisitAppointmentId: string | null,
	appointmentId: string | null,
): string | null {
	if (openVisitId && UUID_REGEX.test(openVisitId)) {
		if (!openVisitAppointmentId || !appointmentId || openVisitAppointmentId === appointmentId) {
			return openVisitId;
		}
	}
	if (appointmentId && UUID_REGEX.test(appointmentId)) {
		return appointmentId;
	}
	if (openVisitAppointmentId && UUID_REGEX.test(openVisitAppointmentId)) {
		return openVisitAppointmentId;
	}
	if (openVisitId) {
		return openVisitId;
	}
	return appointmentId || null;
}
