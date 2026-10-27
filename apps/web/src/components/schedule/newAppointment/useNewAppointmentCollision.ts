/**
 * useNewAppointmentCollision.ts — Appointment collision detection and duration preset handlers.
 */

import { useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import type { AppointmentScheduleDraft } from "../../../AppConstants";
import { checkAppointmentResourceCollision, isCitoAppointment } from "../../../utils/scheduleCollisionUtils";
import { applyAppointmentReasonPreset } from "./newAppointmentReasonApplier";
import type { QuickAppointmentReasonPreset } from "./types";

interface UseNewAppointmentCollisionParams {
	dashboard: Dashboard;
	newAppointmentDraft: Partial<AppointmentScheduleDraft> | null | undefined;
	updateNewAppointmentDraft: (field: string, val: any) => void;
	toDateTimeLocalValue: (iso: string, timezone?: string) => string;
	fromDateTimeLocalValue: (dtLocal: string, timezone?: string) => string;
	chairDoctorAssignments?: Record<string, any>;
}

export function useNewAppointmentCollision({
	dashboard,
	newAppointmentDraft,
	updateNewAppointmentDraft,
	toDateTimeLocalValue,
	fromDateTimeLocalValue,
	chairDoctorAssignments,
}: UseNewAppointmentCollisionParams) {
	const clinicTimezone = dashboard.clinicSettings?.profile?.timezone;

	const collision = useMemo(() => {
		const isCito = Boolean(
			newAppointmentDraft?.cito ||
			newAppointmentDraft?.isCito ||
			newAppointmentDraft?.tag === "cito" ||
			(newAppointmentDraft?.reason && isCitoAppointment(newAppointmentDraft as any)),
		);
		return checkAppointmentResourceCollision(
			newAppointmentDraft as AppointmentScheduleDraft,
			dashboard.appointments,
			{
				staff: dashboard.clinicSettings?.staff,
				chairs: dashboard.clinicSettings?.chairs,
				patients: dashboard.patients,
				formatTimeFn: (iso) => toDateTimeLocalValue(iso, clinicTimezone).slice(11, 16),
				isCito,
				allowCitoOverbooking: isCito,
			},
		);
	}, [newAppointmentDraft, dashboard.appointments, dashboard.clinicSettings, clinicTimezone, dashboard.patients, toDateTimeLocalValue]);

	const currentDurationMinutes = useMemo(() => {
		if (!newAppointmentDraft?.startsAt || !newAppointmentDraft?.endsAt) return 0;
		try {
			const startMs = Date.parse(newAppointmentDraft.startsAt);
			const endMs = Date.parse(newAppointmentDraft.endsAt);
			if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 0;
			return Math.round((endMs - startMs) / (60 * 1000));
		} catch {
			return 0;
		}
	}, [newAppointmentDraft?.startsAt, newAppointmentDraft?.endsAt]);

	const applyDuration = (minutes: number) => {
		let startIso = newAppointmentDraft?.startsAt;
		if (!startIso) {
			const now = new Date();
			now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
			const localNow = typeof toDateTimeLocalValue === "function"
				? toDateTimeLocalValue(now.toISOString(), clinicTimezone) : now.toISOString();
			startIso = typeof fromDateTimeLocalValue === "function"
				? fromDateTimeLocalValue(localNow, clinicTimezone) : now.toISOString();
			if (!startIso) startIso = now.toISOString();
			updateNewAppointmentDraft("startsAt", startIso);
		}
		try {
			const startDate = new Date(startIso);
			if (!Number.isNaN(startDate.getTime())) {
				const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
				const localEnd = typeof toDateTimeLocalValue === "function"
					? toDateTimeLocalValue(endDate.toISOString(), clinicTimezone) : endDate.toISOString();
				const endVal = typeof fromDateTimeLocalValue === "function"
					? fromDateTimeLocalValue(localEnd, clinicTimezone) : endDate.toISOString();
				updateNewAppointmentDraft("endsAt", endVal || endDate.toISOString());
			}
		} catch {}
	};

	const handleApplyReasonPreset = (preset: QuickAppointmentReasonPreset) => {
		applyAppointmentReasonPreset({
			preset, dashboard, newAppointmentDraft, updateNewAppointmentDraft,
			applyDuration, chairDoctorAssignments,
		});
	};

	return { collision, currentDurationMinutes, applyDuration, handleApplyReasonPreset, clinicTimezone };
}
