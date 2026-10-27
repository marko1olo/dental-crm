import type { AppointmentCardProps } from "./AppointmentCardTypes";
import {
	isAppointmentEntityEqual,
	isAppointmentEditingStateEqual,
	isAppointmentReadinessEqual,
} from "./appointmentCardMemoSelectors";

function isAppointmentDashboardSliceEqual(prev: AppointmentCardProps, next: AppointmentCardProps): boolean {
	if (prev.dashboard === next.dashboard) return true;
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

	const pDocId = prev.appointment.doctorUserId;
	const nDocId = next.appointment.doctorUserId;
	if (pDocId !== nDocId) return false;
	if (pDocId) {
		const prevDoc = (prev.dashboard?.clinicSettings?.staff ?? []).find((s) => s?.id === pDocId);
		const nextDoc = (next.dashboard?.clinicSettings?.staff ?? []).find((s) => s?.id === nDocId);
		if (prevDoc?.fullName !== nextDoc?.fullName || prevDoc?.role !== nextDoc?.role) return false;
	}

	const pChairId = prev.appointment.chairId;
	const nChairId = next.appointment.chairId;
	if (pChairId !== nChairId) return false;
	if (pChairId) {
		const prevChair = (prev.dashboard?.clinicSettings?.chairs ?? []).find((c) => c?.id === pChairId);
		const nextChair = (next.dashboard?.clinicSettings?.chairs ?? []).find((c) => c?.id === nChairId);
		if (prevChair?.name !== nextChair?.name) return false;
	}

	if (prev.dashboard?.clinicSettings?.profile?.timezone !== next.dashboard?.clinicSettings?.profile?.timezone) {
		return false;
	}

	if (prev.dashboard?.appointments !== next.dashboard?.appointments) {
		const curDoc = prev.appointment.doctorUserId;
		const curCh = prev.appointment.chairId;
		const curPat = prev.appointment.patientId;
		const pStart = new Date(prev.appointment.startsAt).getTime();
		const pEnd = new Date(prev.appointment.endsAt).getTime();

		const hasConflict = (appts: typeof prev.dashboard.appointments) =>
			(appts ?? []).some((o) => {
				if (o.id === prev.appointment.id || o.status === "cancelled" || o.status === "no_show") return false;
				const oStart = new Date(o.startsAt).getTime();
				const oEnd = new Date(o.endsAt).getTime();
				const overlaps = pStart < oEnd && pEnd > oStart;
				if (!overlaps) return false;
				return (curDoc && o.doctorUserId === curDoc) || (curCh && o.chairId === curCh) || (curPat && o.patientId === curPat);
			});

		if (hasConflict(prev.dashboard?.appointments) !== hasConflict(next.dashboard?.appointments)) {
			return false;
		}
	}

	return true;
}

export function areAppointmentCardPropsEqual(
	prev: AppointmentCardProps,
	next: AppointmentCardProps,
): boolean {
	if (!isAppointmentEntityEqual(prev, next)) return false;
	if (!isAppointmentEditingStateEqual(prev, next)) return false;
	if (!isAppointmentReadinessEqual(prev, next)) return false;

	if (prev.visibleScheduleSuggestions !== next.visibleScheduleSuggestions) {
		const pId = prev.appointment.id;
		const prevHas = (prev.visibleScheduleSuggestions ?? []).some((s) => s?.appointmentId === pId);
		const nextHas = (next.visibleScheduleSuggestions ?? []).some((s) => s?.appointmentId === pId);
		if (prevHas !== nextHas) return false;
	}

	if (!isAppointmentDashboardSliceEqual(prev, next)) return false;

	return true;
}
