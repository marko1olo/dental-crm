/**
 * newAppointmentReasonApplier.ts — Preset reason application logic with emergency auto-chair and duty doctor detection.
 */

import type { Dashboard } from "@dental/shared";
import type { AppointmentScheduleDraft } from "../../../AppConstants";
import { resolveChairDutyDoctor } from "../QuickBookingDrawer";
import { showToast } from "../../GlobalToast";
import type { QuickAppointmentReasonPreset } from "./types";

interface ApplyPresetParams {
	preset: QuickAppointmentReasonPreset;
	dashboard: Dashboard;
	newAppointmentDraft: Partial<AppointmentScheduleDraft> | null | undefined;
	updateNewAppointmentDraft: (field: string, val: any) => void;
	applyDuration: (minutes: number) => void;
	chairDoctorAssignments?: Record<string, any>;
}

export function applyAppointmentReasonPreset({
	preset,
	dashboard,
	newAppointmentDraft,
	updateNewAppointmentDraft,
	applyDuration,
	chairDoctorAssignments,
}: ApplyPresetParams) {
	updateNewAppointmentDraft("reason", preset.reason);
	applyDuration(preset.durationMinutes);
	if (preset.id === "emergency" || preset.tone === "emergency") {
		updateNewAppointmentDraft("cito", true);
		updateNewAppointmentDraft("isCito", true);
		updateNewAppointmentDraft("tag", "cito");
		let activeChairId = newAppointmentDraft?.chairId;
		if (!activeChairId && dashboard.clinicSettings?.chairs) {
			const firstActiveChair = dashboard.clinicSettings.chairs.find((c) => c.active);
			if (firstActiveChair) {
				activeChairId = firstActiveChair.id;
				updateNewAppointmentDraft("chairId", activeChairId);
			}
		}
		if (!newAppointmentDraft?.doctorUserId) {
			const targetTime = newAppointmentDraft?.startsAt;
			let resolvedDocId: string | undefined;
			if (activeChairId) {
				const duty = resolveChairDutyDoctor(
					activeChairId, targetTime, chairDoctorAssignments,
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
		showToast("Срочная запись (Острая боль): 30 мин (наложение слота допустимо)", "warning", 3000);
	}
}
