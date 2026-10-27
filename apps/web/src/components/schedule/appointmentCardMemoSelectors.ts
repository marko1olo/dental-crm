import type { AppointmentCardProps } from "./AppointmentCardTypes";

export function isAppointmentEntityEqual(prev: AppointmentCardProps, next: AppointmentCardProps): boolean {
	if (prev.appointment === next.appointment) return true;
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
	const prevTeeth = (p as any)?.teeth;
	const nextTeeth = (n as any)?.teeth;
	if (Array.isArray(prevTeeth) || Array.isArray(nextTeeth)) {
		if (!Array.isArray(prevTeeth) || !Array.isArray(nextTeeth)) return false;
		if (prevTeeth.length !== nextTeeth.length) return false;
		for (let i = 0; i < prevTeeth.length; i++) {
			if (prevTeeth[i] !== nextTeeth[i]) return false;
		}
	}
	return true;
}

export function isAppointmentEditingStateEqual(prev: AppointmentCardProps, next: AppointmentCardProps): boolean {
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
	if (prev.appointmentMissingSteps !== next.appointmentMissingSteps) {
		const pLen = prev.appointmentMissingSteps?.length ?? 0;
		const nLen = next.appointmentMissingSteps?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.appointmentMissingSteps[i] !== next.appointmentMissingSteps[i]) return false;
		}
	}
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
	return true;
}

export function isAppointmentReadinessEqual(prev: AppointmentCardProps, next: AppointmentCardProps): boolean {
	if (prev.appointmentReadinessById === next.appointmentReadinessById) return true;
	const pId = prev.appointment.id;
	const prevR = prev.appointmentReadinessById instanceof Map ? prev.appointmentReadinessById.get(pId) : undefined;
	const nextR = next.appointmentReadinessById instanceof Map ? next.appointmentReadinessById.get(pId) : undefined;
	if (prevR === nextR) return true;
	if (!prevR || !nextR) return false;
	return (
		prevR.appointmentId === nextR.appointmentId &&
		prevR.state === nextR.state &&
		prevR.score === nextR.score &&
		prevR.blockers?.length === nextR.blockers?.length
	);
}
