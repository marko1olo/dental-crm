import { type Appointment, type Dashboard, areIntervalsOverlapping } from "@dental/shared";

export type SuggestedSlot = {
	timeDisplay: string;
	label: string;
	startsAt: string;
	endsAt: string;
};

export type ResourceCollisionResult = {
	hasCollision: boolean;
	conflictType: "doctor" | "chair" | "assistant" | "patient" | null;
	conflictingAppointment: Appointment | null;
	message: string | null;
	isCitoOverbooking?: boolean;
	suggestedSlot?: SuggestedSlot | null;
};

export function isCitoAppointment(
	appt:
		| Partial<Appointment>
		| {
				reason?: string | null;
				isCito?: boolean;
				cito?: boolean;
				isEmergency?: boolean;
		  }
		| null
		| undefined,
): boolean {
	if (!appt) return false;
	const anyAppt = appt as any;
	const reason = (appt.reason ?? "").toLowerCase();
	return Boolean(
		anyAppt.isCito ||
			anyAppt.cito ||
			anyAppt.isEmergency ||
			reason.includes("cito") ||
			reason.includes("острая боль") ||
			reason.includes("срочн"),
	);
}

export type ChairMaintenanceBlock = {
	id: string;
	chairId: string;
	startsAt: string;
	endsAt: string;
	reason: "sanitation" | "maintenance" | "disinfection" | "tech_break" | string;
	note?: string;
};

export type ResourceCollisionOptions = {
	excludeAppointmentId?: string | null | undefined;
	staff?: Dashboard["clinicSettings"]["staff"] | undefined;
	chairs?: Dashboard["clinicSettings"]["chairs"] | undefined;
	patients?: Dashboard["patients"] | undefined;
	chairMaintenanceBlocks?: readonly ChairMaintenanceBlock[] | undefined;
	formatTimeFn?: ((iso: string) => string) | undefined;
	allowCitoOverbooking?: boolean | undefined;
	isCito?: boolean | undefined;
};

export function findNearestAvailableSlot(
	draft: {
		startsAt?: string | null;
		endsAt?: string | null;
		doctorUserId?: string | null;
		chairId?: string | null;
		assistantUserId?: string | null;
		patientId?: string | null;
	},
	appointments: readonly Appointment[] | null | undefined,
	options: ResourceCollisionOptions = {},
): SuggestedSlot | null {
	if (!draft.startsAt || !draft.endsAt) return null;
	const draftStart = Date.parse(draft.startsAt);
	const draftEnd = Date.parse(draft.endsAt);
	if (
		!Number.isFinite(draftStart) ||
		!Number.isFinite(draftEnd) ||
		draftEnd <= draftStart
	) {
		return null;
	}

	const durationMs = draftEnd - draftStart;
	const format = options.formatTimeFn ?? ((iso: string) => iso.slice(11, 16));

	const activeAppointments = (appointments ?? []).filter((a) => {
		if (options.excludeAppointmentId && a.id === options.excludeAppointmentId)
			return false;
		return a.status !== "cancelled" && a.status !== "no_show";
	});

	const isIntervalFree = (startMs: number, endMs: number): boolean => {
		// 1. Chair maintenance blocks
		if (draft.chairId && options.chairMaintenanceBlocks?.length) {
			for (const block of options.chairMaintenanceBlocks) {
				if (block.chairId !== draft.chairId) continue;
				const bStart = Date.parse(block.startsAt);
				const bEnd = Date.parse(block.endsAt);
				if (!Number.isFinite(bStart) || !Number.isFinite(bEnd)) continue;
				if (areIntervalsOverlapping(startMs, endMs, bStart, bEnd)) return false;
			}
		}

		// 2. Active appointments
		for (const a of activeAppointments) {
			const aStart = Date.parse(a.startsAt);
			const aEnd = Date.parse(a.endsAt);
			if (!Number.isFinite(aStart) || !Number.isFinite(aEnd)) continue;
			if (areIntervalsOverlapping(startMs, endMs, aStart, aEnd)) {
				if (draft.patientId && a.patientId === draft.patientId) return false;
				if (draft.doctorUserId && a.doctorUserId === draft.doctorUserId)
					return false;
				if (draft.chairId && a.chairId === draft.chairId) return false;
				if (
					draft.assistantUserId &&
					a.assistantUserId === draft.assistantUserId
				)
					return false;
			}
		}
		return true;
	};

	const stepMs = 15 * 60_000;

	// Priority 1: Check endsAt of any overlapping appointments (natural free boundary)
	const overlappingAppts = activeAppointments.filter((a) => {
		const aStart = Date.parse(a.startsAt);
		const aEnd = Date.parse(a.endsAt);
		const timeOverlaps = areIntervalsOverlapping(draftStart, draftEnd, aStart, aEnd);
		if (!timeOverlaps) return false;
		return (
			(draft.doctorUserId && a.doctorUserId === draft.doctorUserId) ||
			(draft.chairId && a.chairId === draft.chairId) ||
			(draft.patientId && a.patientId === draft.patientId) ||
			(draft.assistantUserId && a.assistantUserId === draft.assistantUserId)
		);
	});

	const boundaryCandidates: number[] = [];
	for (const a of overlappingAppts) {
		const aEnd = Date.parse(a.endsAt);
		if (Number.isFinite(aEnd) && aEnd >= draftStart) {
			boundaryCandidates.push(aEnd);
		}
	}
	boundaryCandidates.sort((a, b) => a - b);

	const draftDateStr = new Date(draftStart).toISOString().slice(0, 10);

	for (const candStart of boundaryCandidates) {
		const candEnd = candStart + durationMs;
		const candDateStr = new Date(candStart).toISOString().slice(0, 10);
		if (candDateStr === draftDateStr && new Date(candStart).getUTCHours() < 21) {
			if (isIntervalFree(candStart, candEnd)) {
				const startsAtIso = new Date(candStart).toISOString();
				const endsAtIso = new Date(candEnd).toISOString();
				const timeDisplay = format(startsAtIso);
				return {
					timeDisplay,
					label: `Ближайшее окно сегодня в ${timeDisplay}`,
					startsAt: startsAtIso,
					endsAt: endsAtIso,
				};
			}
		}
	}

	// Priority 2: Scan forward in 15-minute steps on the same day
	const initialCandStart = Math.ceil(draftStart / stepMs) * stepMs;
	for (let offset = stepMs; offset <= 8 * 3600_000; offset += stepMs) {
		const candStart = initialCandStart + offset;
		const candEnd = candStart + durationMs;
		const candDateStr = new Date(candStart).toISOString().slice(0, 10);
		if (candDateStr !== draftDateStr) break;
		if (new Date(candStart).getUTCHours() >= 21) break;

		if (isIntervalFree(candStart, candEnd)) {
			const startsAtIso = new Date(candStart).toISOString();
			const endsAtIso = new Date(candEnd).toISOString();
			const timeDisplay = format(startsAtIso);
			return {
				timeDisplay,
				label: `Ближайшее окно сегодня в ${timeDisplay}`,
				startsAt: startsAtIso,
				endsAt: endsAtIso,
			};
		}
	}

	// Priority 3: Scan earlier on the same day (between 08:00 and draftStart)
	const morningStart = new Date(draftStart);
	morningStart.setUTCHours(8, 0, 0, 0);
	const morningStartMs = morningStart.getTime();

	if (draftStart > morningStartMs) {
		for (
			let candStart = morningStartMs;
			candStart + durationMs <= draftStart;
			candStart += stepMs
		) {
			const candEnd = candStart + durationMs;
			if (isIntervalFree(candStart, candEnd)) {
				const startsAtIso = new Date(candStart).toISOString();
				const endsAtIso = new Date(candEnd).toISOString();
				const timeDisplay = format(startsAtIso);
				return {
					timeDisplay,
					label: `Ближайшее окно сегодня в ${timeDisplay}`,
					startsAt: startsAtIso,
					endsAt: endsAtIso,
				};
			}
		}
	}

	// Priority 4: Tomorrow morning (09:00 UTC)
	const nextDay = new Date(draftStart);
	nextDay.setUTCDate(nextDay.getUTCDate() + 1);
	nextDay.setUTCHours(9, 0, 0, 0);
	const nextDayStartMs = nextDay.getTime();

	for (let offset = 0; offset <= 8 * 3600_000; offset += stepMs) {
		const candStart = nextDayStartMs + offset;
		const candEnd = candStart + durationMs;
		if (new Date(candStart).getUTCHours() >= 21) break;

		if (isIntervalFree(candStart, candEnd)) {
			const startsAtIso = new Date(candStart).toISOString();
			const endsAtIso = new Date(candEnd).toISOString();
			const timeDisplay = format(startsAtIso);
			return {
				timeDisplay,
				label: `Ближайшее окно завтра в ${timeDisplay}`,
				startsAt: startsAtIso,
				endsAt: endsAtIso,
			};
		}
	}

	return null;
}

export function checkAppointmentResourceCollision(
	draft: {
		startsAt?: string | null;
		endsAt?: string | null;
		doctorUserId?: string | null;
		chairId?: string | null;
		assistantUserId?: string | null;
		patientId?: string | null;
		isCito?: boolean;
		cito?: boolean;
		reason?: string | null;
		isEmergency?: boolean;
	},
	appointments: readonly Appointment[] | null | undefined,
	options: ResourceCollisionOptions = {},
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
			if (areIntervalsOverlapping(draftStart, draftEnd, blockStart, blockEnd)) {
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
					suggestedSlot: findNearestAvailableSlot(draft, appointments, options),
				};
			}
		}
	}

	const isDraftCito = Boolean(
		options.isCito ||
			options.allowCitoOverbooking ||
			isCitoAppointment(draft as any),
	);

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

			// Interval overlap via SSOT engine
			const overlaps = areIntervalsOverlapping(draftStart, draftEnd, apptStart, apptEnd);
			if (!overlaps) continue;

			const timeIntervalStr = `${format(appt.startsAt)}–${format(appt.endsAt)}`;

			if (draft.patientId && appt.patientId === draft.patientId) {
				const patientObj = options.patients?.find((p) => p.id === draft.patientId);
				const name = patientObj?.fullName ?? "Пациент";
				return {
					hasCollision: true,
					conflictType: "patient",
					conflictingAppointment: appt,
					isCitoOverbooking: false,
					message: `У пациента ${name} уже есть запись на это время (${timeIntervalStr}).`,
					suggestedSlot: findNearestAvailableSlot(draft, appointments, options),
				};
			}

			if (draft.doctorUserId && appt.doctorUserId === draft.doctorUserId) {
				const doctorObj = options.staff?.find((s) => s.id === draft.doctorUserId);
				const name = doctorObj?.fullName ?? "Врач";
				if (isDraftCito) {
					return {
						hasCollision: false,
						conflictType: "doctor",
						conflictingAppointment: appt,
						isCitoOverbooking: true,
						message: `Запись по острой боли (наложение слота допустимо): наложение с приёмом врача ${name} (${timeIntervalStr})`,
						suggestedSlot: null,
					};
				}
				return {
					hasCollision: true,
					conflictType: "doctor",
					conflictingAppointment: appt,
					isCitoOverbooking: false,
					message: `Врач ${name} уже занят(а) в это время (${timeIntervalStr}).`,
					suggestedSlot: findNearestAvailableSlot(draft, appointments, options),
				};
			}

			if (draft.chairId && appt.chairId === draft.chairId) {
				const chairObj = options.chairs?.find((c) => c.id === draft.chairId);
				const name = chairObj?.name ?? "Кресло";
				if (isDraftCito) {
					return {
						hasCollision: false,
						conflictType: "chair",
						conflictingAppointment: appt,
						isCitoOverbooking: true,
						message: `Запись по острой боли (наложение слота допустимо): наложение на кресле «${name}» (${timeIntervalStr})`,
						suggestedSlot: null,
					};
				}
				return {
					hasCollision: true,
					conflictType: "chair",
					conflictingAppointment: appt,
					isCitoOverbooking: false,
					message: `Кресло «${name}» уже занято в это время (${timeIntervalStr}).`,
					suggestedSlot: findNearestAvailableSlot(draft, appointments, options),
				};
			}

			if (draft.assistantUserId && appt.assistantUserId === draft.assistantUserId) {
				const astObj = options.staff?.find((s) => s.id === draft.assistantUserId);
				const name = astObj?.fullName ?? "Ассистент";
				if (isDraftCito) {
					return {
						hasCollision: false,
						conflictType: "assistant",
						conflictingAppointment: appt,
						isCitoOverbooking: true,
						message: `Запись по острой боли (наложение слота допустимо): ассистент ${name} совмещён (${timeIntervalStr})`,
						suggestedSlot: null,
					};
				}
				return {
					hasCollision: true,
					conflictType: "assistant",
					conflictingAppointment: appt,
					isCitoOverbooking: false,
					message: `Ассистент ${name} уже занят(а) в это время (${timeIntervalStr}).`,
					suggestedSlot: findNearestAvailableSlot(draft, appointments, options),
				};
			}
		}
	}

	return {
		hasCollision: false,
		conflictType: null,
		conflictingAppointment: null,
		message: null,
		suggestedSlot: null,
	};
}
