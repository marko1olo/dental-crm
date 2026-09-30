import type { AppointmentCardProps } from "./AppointmentCardTypes";

export function areAppointmentCardPropsEqual(
	prev: AppointmentCardProps,
	next: AppointmentCardProps,
): boolean {
	// 1. Appointment entity identity & core fields
	if (prev.appointment !== next.appointment) {
		const p = prev.appointment;
		const n = next.appointment;
		if (
			p.id !== n.id ||
			p.status !== n.status ||
			p.startsAt !== n.startsAt ||
			p.endsAt !== n.endsAt ||
			p.patientId !== n.patientId ||
			p.doctorUserId !== n.doctorUserId ||
			p.chairId !== n.chairId ||
			p.assistantUserId !== n.assistantUserId ||
			p.reason !== n.reason ||
			p.comment !== n.comment
		) {
			return false;
		}
		// Compare teeth array if present
		const prevTeeth = (p as any)?.teeth;
		const nextTeeth = (n as any)?.teeth;
		if (Array.isArray(prevTeeth) || Array.isArray(nextTeeth)) {
			if (!Array.isArray(prevTeeth) || !Array.isArray(nextTeeth)) return false;
			if (prevTeeth.length !== nextTeeth.length) return false;
			for (let i = 0; i < prevTeeth.length; i++) {
				if (prevTeeth[i] !== nextTeeth[i]) return false;
			}
		}
	}

	// 2. Schedule editing & persistence state
	if (
		prev.appointmentEditing !== next.appointmentEditing ||
		prev.appointmentDirty !== next.appointmentDirty ||
		prev.appointmentSaveState !== next.appointmentSaveState ||
		prev.appointmentSaveError !== next.appointmentSaveError ||
		prev.appointmentHasOpenVisit !== next.appointmentHasOpenVisit ||
		prev.appointmentActiveVisitStatusLocked !== next.appointmentActiveVisitStatusLocked ||
		prev.appointmentReadyToSave !== next.appointmentReadyToSave ||
		prev.useManualSelects !== next.useManualSelects
	) {
		return false;
	}

	// 3. Missing steps check (skip re-render if both are empty or identical)
	if (prev.appointmentMissingSteps !== next.appointmentMissingSteps) {
		const pLen = prev.appointmentMissingSteps?.length ?? 0;
		const nLen = next.appointmentMissingSteps?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.appointmentMissingSteps[i] !== next.appointmentMissingSteps[i]) return false;
		}
	}

	// 4. Draft comparison (only matters when editing or dirty)
	if (prev.appointmentEditing || next.appointmentEditing || prev.appointmentDirty || next.appointmentDirty) {
		if (prev.appointmentDraft !== next.appointmentDraft) {
			const pD = prev.appointmentDraft;
			const nD = next.appointmentDraft;
			if (pD && nD) {
				const keys = new Set([...Object.keys(pD), ...Object.keys(nD)]);
				for (const key of keys) {
					if (pD[key] !== nD[key]) return false;
				}
			} else if (pD !== nD) {
				return false;
			}
		}
	}

	// 5. Readiness for this specific appointment
	if (prev.appointmentReadinessById !== next.appointmentReadinessById) {
		const pId = prev.appointment.id;
		const prevR = prev.appointmentReadinessById instanceof Map ? prev.appointmentReadinessById.get(pId) : undefined;
		const nextR = next.appointmentReadinessById instanceof Map ? next.appointmentReadinessById.get(pId) : undefined;
		if (prevR !== nextR) {
			if (!prevR || !nextR) return false;
			if (
				prevR.appointmentId !== nextR.appointmentId ||
				prevR.state !== nextR.state ||
				prevR.score !== nextR.score ||
				prevR.blockers?.length !== nextR.blockers?.length
			) {
				return false;
			}
		}
	}

	// 6. Visible schedule suggestions for this appointment
	if (prev.visibleScheduleSuggestions !== next.visibleScheduleSuggestions) {
		const pId = prev.appointment.id;
		const prevHas = (prev.visibleScheduleSuggestions ?? []).some((s) => s?.appointmentId === pId);
		const nextHas = (next.visibleScheduleSuggestions ?? []).some((s) => s?.appointmentId === pId);
		if (prevHas !== nextHas) return false;
	}

	// 7. Dashboard changes: only compare slices relevant to this card
	if (prev.dashboard !== next.dashboard) {
		const pPatId = prev.appointment.patientId;
		const nPatId = next.appointment.patientId;
		if (pPatId !== nPatId) return false;

		if (pPatId) {
			const prevPat = (prev.dashboard?.patients ?? []).find((p) => p?.id === pPatId);
			const nextPat = (next.dashboard?.patients ?? []).find((p) => p?.id === nPatId);
			if (
				prevPat?.fullName !== nextPat?.fullName ||
				prevPat?.balanceRub !== nextPat?.balanceRub ||
				(prevPat as any)?.balance !== (nextPat as any)?.balance ||
				prevPat?.phone !== nextPat?.phone
			) {
				return false;
			}
		}

		// Doctor & chair
		const pDocId = prev.appointment.doctorUserId;
		const nDocId = next.appointment.doctorUserId;
		if (pDocId !== nDocId) return false;
		if (pDocId) {
			const prevDoc = (prev.dashboard?.clinicSettings?.staff ?? []).find((s) => s?.id === pDocId);
			const nextDoc = (next.dashboard?.clinicSettings?.staff ?? []).find((s) => s?.id === nDocId);
			if (prevDoc?.fullName !== nextDoc?.fullName || prevDoc?.role !== nextDoc?.role) {
				return false;
			}
		}

		const pChairId = prev.appointment.chairId;
		const nChairId = next.appointment.chairId;
		if (pChairId !== nChairId) return false;
		if (pChairId) {
			const prevChair = (prev.dashboard?.clinicSettings?.chairs ?? []).find((c) => c?.id === pChairId);
			const nextChair = (next.dashboard?.clinicSettings?.chairs ?? []).find((c) => c?.id === nChairId);
			if (prevChair?.name !== nextChair?.name) {
				return false;
			}
		}

		// Timezone
		if (
			prev.dashboard?.clinicSettings?.profile?.timezone !==
			next.dashboard?.clinicSettings?.profile?.timezone
		) {
			return false;
		}

		// Collisions: if appointments changed, check if any overlapping appointment for this doctor/chair/patient changed
		if (prev.dashboard?.appointments !== next.dashboard?.appointments) {
			const curDoc = prev.appointment.doctorUserId;
			const curCh = prev.appointment.chairId;
			const curPat = prev.appointment.patientId;
			const pStart = new Date(prev.appointment.startsAt).getTime();
			const pEnd = new Date(prev.appointment.endsAt).getTime();

			const hasConflict = (appts: typeof prev.dashboard.appointments) =>
				(appts ?? []).some((o) => {
					if (o.id === prev.appointment.id || o.status === "cancelled" || o.status === "no_show") {
						return false;
					}
					const oStart = new Date(o.startsAt).getTime();
					const oEnd = new Date(o.endsAt).getTime();
					const overlaps = pStart < oEnd && pEnd > oStart;
					if (!overlaps) return false;
					return (
						(curDoc && o.doctorUserId === curDoc) ||
						(curCh && o.chairId === curCh) ||
						(curPat && o.patientId === curPat)
					);
				});

			if (hasConflict(prev.dashboard?.appointments) !== hasConflict(next.dashboard?.appointments)) {
				return false;
			}
		}
	}

	return true;
}
