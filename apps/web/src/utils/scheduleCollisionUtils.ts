import type { Appointment, Dashboard } from "@dental/shared";

export type ResourceCollisionResult = {
	hasCollision: boolean;
	conflictType: "doctor" | "chair" | "assistant" | "patient" | null;
	conflictingAppointment: Appointment | null;
	message: string | null;
};

export type ChairMaintenanceBlock = {
	id: string;
	chairId: string;
	startsAt: string;
	endsAt: string;
	reason: "sanitation" | "maintenance" | "disinfection" | "tech_break" | string;
	note?: string;
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
		chairMaintenanceBlocks?: readonly ChairMaintenanceBlock[];
		formatTimeFn?: (iso: string) => string;
	} = {},
): ResourceCollisionResult {
	if (!draft.startsAt || !draft.endsAt) {
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

	// 1. Check if chair is marked inactive (global maintenance / offline)
	if (draft.chairId && options.chairs?.length) {
		const chairObj = options.chairs.find((c) => c.id === draft.chairId);
		if (chairObj && chairObj.active === false) {
			const name = chairObj.name ?? "Кресло";
			return {
				hasCollision: true,
				conflictType: "chair",
				conflictingAppointment: null,
				message: `Кресло «${name}» временно заблокировано (техобслуживание / санитарная обработка).`,
			};
		}
	}

	// 2. Check scheduled maintenance / sanitation time windows
	if (draft.chairId && options.chairMaintenanceBlocks?.length) {
		for (const block of options.chairMaintenanceBlocks) {
			if (block.chairId !== draft.chairId) continue;
			const blockStart = Date.parse(block.startsAt);
			const blockEnd = Date.parse(block.endsAt);
			if (!Number.isFinite(blockStart) || !Number.isFinite(blockEnd)) continue;
			if (draftStart < blockEnd && draftEnd > blockStart) {
				const chairObj = options.chairs?.find((c) => c.id === draft.chairId);
				const name = chairObj?.name ?? "Кресло";
				const blockTimeStr = `${format(block.startsAt)}–${format(block.endsAt)}`;
				const reasonRu =
					block.reason === "sanitation"
						? "санитарная обработка"
						: block.reason === "maintenance"
							? "техобслуживание"
							: block.reason === "disinfection"
								? "дезинфекция"
								: block.reason === "tech_break"
									? "технический перерыв"
									: block.reason;
				return {
					hasCollision: true,
					conflictType: "chair",
					conflictingAppointment: null,
					message: `Кресло «${name}» заблокировано на ${reasonRu} (${blockTimeStr}).`,
				};
			}
		}
	}

	if (appointments && appointments.length > 0) {
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
	}

	return {
		hasCollision: false,
		conflictType: null,
		conflictingAppointment: null,
		message: null,
	};
}
