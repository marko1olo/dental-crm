import type { Appointment, Dashboard } from "@dental/shared";

export type ResourceCollisionResult = {
	hasCollision: boolean;
	conflictType: "doctor" | "chair" | "assistant" | "patient" | null;
	conflictingAppointment: Appointment | null;
	message: string | null;
};

export function checkAppointmentResourceCollision(
	draft: {
		startsAt?: string | null;
		endsAt?: string | null;
		doctorUserId?: string | null;
		chairId?: string | null;
		assistantUserId?: string | null;
		patientId?: string | null;
	},
	appointments: readonly Appointment[] | null | undefined,
	options: {
		excludeAppointmentId?: string | null;
		staff?: Dashboard["clinicSettings"]["staff"];
		chairs?: Dashboard["clinicSettings"]["chairs"];
		patients?: Dashboard["patients"];
		formatTimeFn?: (iso: string) => string;
	} = {},
): ResourceCollisionResult {
	if (!draft.startsAt || !draft.endsAt || !appointments?.length) {
		return {
			hasCollision: false,
			conflictType: null,
			conflictingAppointment: null,
			message: null,
		};
	}

	const draftStart = Date.parse(draft.startsAt);
	const draftEnd = Date.parse(draft.endsAt);
	if (
		!Number.isFinite(draftStart) ||
		!Number.isFinite(draftEnd) ||
		draftEnd <= draftStart
	) {
		return {
			hasCollision: false,
			conflictType: null,
			conflictingAppointment: null,
			message: null,
		};
	}

	const format = options.formatTimeFn ?? ((iso: string) => iso.slice(11, 16));

	for (const appt of appointments) {
		if (options.excludeAppointmentId && appt.id === options.excludeAppointmentId) {
			continue;
		}
		if (appt.status === "cancelled" || appt.status === "no_show") {
			continue;
		}

		const apptStart = Date.parse(appt.startsAt);
		const apptEnd = Date.parse(appt.endsAt);
		if (!Number.isFinite(apptStart) || !Number.isFinite(apptEnd)) continue;

		// Interval overlap: (draftStart < apptEnd) && (draftEnd > apptStart)
		const overlaps = draftStart < apptEnd && draftEnd > apptStart;
		if (!overlaps) continue;

		const timeIntervalStr = `${format(appt.startsAt)}–${format(appt.endsAt)}`;

		if (draft.patientId && appt.patientId === draft.patientId) {
			const patientObj = options.patients?.find((p) => p.id === draft.patientId);
			const name = patientObj?.fullName ?? "Пациент";
			return {
				hasCollision: true,
				conflictType: "patient",
				conflictingAppointment: appt,
				message: `У пациента ${name} уже есть запись на это время (${timeIntervalStr}).`,
			};
		}

		if (draft.doctorUserId && appt.doctorUserId === draft.doctorUserId) {
			const doctorObj = options.staff?.find((s) => s.id === draft.doctorUserId);
			const name = doctorObj?.fullName ?? "Врач";
			return {
				hasCollision: true,
				conflictType: "doctor",
				conflictingAppointment: appt,
				message: `Врач ${name} уже занят(а) в это время (${timeIntervalStr}).`,
			};
		}

		if (draft.chairId && appt.chairId === draft.chairId) {
			const chairObj = options.chairs?.find((c) => c.id === draft.chairId);
			const name = chairObj?.name ?? "Кресло";
			return {
				hasCollision: true,
				conflictType: "chair",
				conflictingAppointment: appt,
				message: `Кресло «${name}» уже занято в это время (${timeIntervalStr}).`,
			};
		}

		if (draft.assistantUserId && appt.assistantUserId === draft.assistantUserId) {
			const astObj = options.staff?.find((s) => s.id === draft.assistantUserId);
			const name = astObj?.fullName ?? "Ассистент";
			return {
				hasCollision: true,
				conflictType: "assistant",
				conflictingAppointment: appt,
				message: `Ассистент ${name} уже занят(а) в это время (${timeIntervalStr}).`,
			};
		}
	}

	return {
		hasCollision: false,
		conflictType: null,
		conflictingAppointment: null,
		message: null,
	};
}
