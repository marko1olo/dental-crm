/**
 * useNewAppointmentAutoFill.ts — Auto-fill chairs, duty doctors, and specialty-matching chairs.
 * Mandate 8e / 8n: Frictionless auto-assignment for reception and solo practitioners.
 */

import { useEffect } from "react";
import type { Dashboard } from "@dental/shared";
import type { AppointmentScheduleDraft } from "../../../AppConstants";
import { DEFAULT_SOLO_CHAIR } from "../ScheduleGrid";
import { resolveChairDutyDoctor } from "../QuickBookingDrawer";

interface UseNewAppointmentAutoFillParams {
	dashboard: Dashboard;
	newAppointmentDraft: Partial<AppointmentScheduleDraft> | null | undefined;
	updateNewAppointmentDraft: (field: string, val: any) => void;
	chairDoctorAssignments?: Record<string, any>;
}

export function useNewAppointmentAutoFill({
	dashboard,
	newAppointmentDraft,
	updateNewAppointmentDraft,
	chairDoctorAssignments,
}: UseNewAppointmentAutoFillParams) {
	// Auto-assign first active chair if unassigned
	useEffect(() => {
		if (!newAppointmentDraft?.chairId) {
			const firstActiveChair = (dashboard.clinicSettings?.chairs ?? []).find((c) => c.active);
			updateNewAppointmentDraft("chairId", firstActiveChair?.id || DEFAULT_SOLO_CHAIR.id);
		}
	}, [newAppointmentDraft?.chairId, dashboard.clinicSettings?.chairs, updateNewAppointmentDraft]);

	// Auto-assign duty doctor for chair & time slot
	useEffect(() => {
		const activeChairId = newAppointmentDraft?.chairId;
		const targetTime = newAppointmentDraft?.startsAt;
		if (activeChairId && dashboard.clinicSettings?.staff) {
			const activeDocs = dashboard.clinicSettings.staff.filter(
				(m) => m.active && (m.role === "doctor" || m.role === "owner"),
			);
			const chs = (dashboard.clinicSettings?.chairs ?? []).filter((c) => c.active);
			const targetChairObj = chs.find((c) => c.id === activeChairId);
			const duty = resolveChairDutyDoctor(
				activeChairId,
				targetTime,
				chairDoctorAssignments,
				targetTime ? String(targetTime).slice(0, 10) : undefined,
				null,
				(targetChairObj as any)?.defaultDoctorId || (activeDocs.length === 1 && activeDocs[0] ? activeDocs[0].id : null),
			);
			if (duty.doctorId) {
				const firstActiveDocId = activeDocs.length > 0 ? activeDocs[0]?.id : undefined;
				if (!newAppointmentDraft?.doctorUserId || newAppointmentDraft?.doctorUserId === firstActiveDocId) {
					if (newAppointmentDraft?.doctorUserId !== duty.doctorId) {
						updateNewAppointmentDraft("doctorUserId", duty.doctorId);
					}
				}
			}
		}
	}, [
		newAppointmentDraft?.chairId,
		newAppointmentDraft?.startsAt,
		newAppointmentDraft?.doctorUserId,
		dashboard.clinicSettings?.staff,
		dashboard.clinicSettings?.chairs,
		chairDoctorAssignments,
		updateNewAppointmentDraft,
	]);

	// Fallback to first doctor if doctorUserId is still unset
	useEffect(() => {
		if (!newAppointmentDraft?.doctorUserId && dashboard.clinicSettings?.staff) {
			const activeDocs = dashboard.clinicSettings.staff.filter(
				(m) => m.active && (m.role === "doctor" || m.role === "owner"),
			);
			if (activeDocs.length > 0 && activeDocs[0]) {
				updateNewAppointmentDraft("doctorUserId", activeDocs[0].id);
			}
		}
	}, [
		newAppointmentDraft?.doctorUserId,
		newAppointmentDraft?.chairId,
		newAppointmentDraft?.startsAt,
		chairDoctorAssignments,
		dashboard.clinicSettings?.staff,
		updateNewAppointmentDraft,
	]);

	// Auto-match chair to doctor's specialty
	useEffect(() => {
		if (newAppointmentDraft?.doctorUserId && dashboard.clinicSettings?.chairs && dashboard.clinicSettings?.staff) {
			const doc = dashboard.clinicSettings.staff.find((m) => m.id === newAppointmentDraft.doctorUserId);
			if (doc?.specialties?.length) {
				const matchingChair = dashboard.clinicSettings.chairs.find(
					(c) => c.active && c.specialization && doc.specialties.includes(c.specialization),
				);
				if (matchingChair && matchingChair.id !== newAppointmentDraft.chairId) {
					updateNewAppointmentDraft("chairId", matchingChair.id);
				}
			}
		}
	}, [newAppointmentDraft?.doctorUserId, dashboard.clinicSettings?.chairs, dashboard.clinicSettings?.staff, updateNewAppointmentDraft]);
}
