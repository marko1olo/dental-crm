/**
 * useNewAppointmentSubmit.ts — Submission and auto-patient creation handlers.
 * Mandate 8e: Doctor & staff autonomy, zero blocking friction.
 */

import type { Dashboard } from "@dental/shared";
import type { AppointmentScheduleDraft } from "../../../AppConstants";
import { DEFAULT_SOLO_CHAIR } from "../ScheduleGrid";
import { resolveChairDutyDoctor } from "../QuickBookingDrawer";
import { quickCreatePatientFromQuery, resolveDraftPatient } from "./newAppointmentPatientResolver";

interface UseNewAppointmentSubmitParams {
	dashboard: Dashboard;
	newAppointmentDraft: Partial<AppointmentScheduleDraft> | null | undefined;
	updateNewAppointmentDraft: (field: string, val: any) => void;
	createAppointmentFromDraft: (opts: any) => Promise<any>;
	patientSearchQuery: string;
	authRef: React.MutableRefObject<any>;
	chairDoctorAssignments?: Record<string, any>;
	collision: any;
}

export function useNewAppointmentSubmit({
	dashboard,
	newAppointmentDraft,
	updateNewAppointmentDraft,
	createAppointmentFromDraft,
	patientSearchQuery,
	authRef,
	chairDoctorAssignments,
	collision,
}: UseNewAppointmentSubmitParams) {
	const handleQuickCreatePatientFromQuery = () =>
		quickCreatePatientFromQuery(patientSearchQuery, authRef, updateNewAppointmentDraft);

	const handleCreateAppointment = async () => {
		if (!newAppointmentDraft?.startsAt) {
			const now = new Date();
			now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
			updateNewAppointmentDraft("startsAt", now.toISOString());
		}
		if (!newAppointmentDraft?.endsAt) {
			const start = newAppointmentDraft?.startsAt ? new Date(newAppointmentDraft.startsAt) : new Date();
			const end = new Date(start.getTime() + 30 * 60 * 1000);
			updateNewAppointmentDraft("endsAt", end.toISOString());
		}
		let currentChairId = newAppointmentDraft?.chairId;
		if (!currentChairId) {
			const firstChair = (dashboard.clinicSettings?.chairs ?? []).find((c) => c.active);
			currentChairId = firstChair?.id || DEFAULT_SOLO_CHAIR.id;
			updateNewAppointmentDraft("chairId", currentChairId);
		}
		if (!newAppointmentDraft?.doctorUserId) {
			const targetTime = newAppointmentDraft?.startsAt;
			let resolvedDocId: string | undefined;
			if (currentChairId) {
				const duty = resolveChairDutyDoctor(
					currentChairId, targetTime, chairDoctorAssignments,
					targetTime ? String(targetTime).slice(0, 10) : undefined,
				);
				resolvedDocId = duty.doctorId ?? undefined;
			}
			if (!resolvedDocId && dashboard.clinicSettings?.staff) {
				const activeDocs = dashboard.clinicSettings.staff.filter((m) => m.active && (m.role === "doctor" || m.role === "owner"));
				if (activeDocs.length > 0 && activeDocs[0]) resolvedDocId = activeDocs[0].id;
			}
			if (resolvedDocId) updateNewAppointmentDraft("doctorUserId", resolvedDocId);
		}
		await resolveDraftPatient(newAppointmentDraft, patientSearchQuery, dashboard, authRef, updateNewAppointmentDraft);
		const isCitoOrOverbook = Boolean(
			collision.isCitoOverbooking || collision.hasCollision ||
			newAppointmentDraft?.isCito || newAppointmentDraft?.cito,
		);
		if (!newAppointmentDraft?.reason) {
			newAppointmentDraft!.reason = isCitoOrOverbook ? "Срочно! Острая боль" : "Осмотр и консультация";
			updateNewAppointmentDraft("reason", newAppointmentDraft!.reason);
		}
		await createAppointmentFromDraft({
			allowOverbooking: isCitoOrOverbook,
			allowEmergencyOverride: isCitoOrOverbook,
		});
	};

	return { handleQuickCreatePatientFromQuery, handleCreateAppointment };
}
