import type { Appointment, Dashboard } from "@dental/shared";
import { useCallback, useMemo } from "react";
import { toDateTimeLocalValue } from "../../AppHelpers";
import { useScheduleStore } from "../../store/scheduleStore";

export interface ScheduleFilterControllerOptions {
	dashboard: Dashboard | null;
}

export function useScheduleFilterController({
	dashboard,
}: ScheduleFilterControllerOptions) {
	const {
		scheduleDoctorFilterId,
		setScheduleDoctorFilterId,
		scheduleAssistantFilterId,
		setScheduleAssistantFilterId,
		scheduleChairFilterId,
		setScheduleChairFilterId,
		scheduleDefaultDoctorUserId,
		setScheduleDefaultDoctorUserId,
		scheduleDefaultAssistantUserId,
		setScheduleDefaultAssistantUserId,
		scheduleDefaultChairId,
		setScheduleDefaultChairId,
		scheduleStatusFilter,
		setScheduleStatusFilter,
		scheduleDateFilter,
		setScheduleDateFilter,
	} = useScheduleStore();

	const sortedAppointments = useMemo(() => {
		if (!dashboard) return [];
		return (dashboard.appointments || [])
			.filter((appointment) => {
				if (
					scheduleDoctorFilterId &&
					appointment.doctorUserId !== scheduleDoctorFilterId
				)
					return false;
				if (
					scheduleAssistantFilterId &&
					appointment.assistantUserId !== scheduleAssistantFilterId
				)
					return false;
				if (
					scheduleChairFilterId &&
					appointment.chairId !== scheduleChairFilterId
				)
					return false;
				if (
					scheduleStatusFilter !== "all" &&
					appointment.status !== scheduleStatusFilter
				)
					return false;
				if (scheduleDateFilter) {
					const localAppointmentDate = toDateTimeLocalValue(
						appointment.startsAt,
						dashboard?.clinicSettings?.profile?.timezone,
					).slice(0, 10);
					if (localAppointmentDate !== scheduleDateFilter) return false;
				}
				return true;
			})
			.sort((left, right) =>
				(left.startsAt ?? "").localeCompare(right.startsAt ?? ""),
			);
	}, [
		dashboard,
		scheduleAssistantFilterId,
		scheduleChairFilterId,
		scheduleDateFilter,
		scheduleDoctorFilterId,
		scheduleStatusFilter,
	]);

	const resetScheduleFilters = useCallback(() => {
		setScheduleDoctorFilterId(null);
		setScheduleAssistantFilterId(null);
		setScheduleChairFilterId(null);
		setScheduleStatusFilter("all");
		setScheduleDateFilter(null);
	}, [
		setScheduleAssistantFilterId,
		setScheduleChairFilterId,
		setScheduleDateFilter,
		setScheduleDoctorFilterId,
		setScheduleStatusFilter,
	]);

	const setDoctorFilter = useCallback(
		(id: string | null) => {
			setScheduleDoctorFilterId(id);
		},
		[setScheduleDoctorFilterId],
	);

	const setAssistantFilter = useCallback(
		(id: string | null) => {
			setScheduleAssistantFilterId(id);
		},
		[setScheduleAssistantFilterId],
	);

	const setChairFilter = useCallback(
		(id: string | null) => {
			setScheduleChairFilterId(id);
		},
		[setScheduleChairFilterId],
	);

	const setStatusFilter = useCallback(
		(status: Appointment["status"] | "all") => {
			setScheduleStatusFilter(status);
		},
		[setScheduleStatusFilter],
	);

	const setDateFilter = useCallback(
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(date: any) => {
			setScheduleDateFilter(date);
		},
		[setScheduleDateFilter],
	);

	const hasActiveFilters = Boolean(
		scheduleDoctorFilterId ||
			scheduleAssistantFilterId ||
			scheduleChairFilterId ||
			scheduleStatusFilter !== "all" ||
			scheduleDateFilter,
	);

	return {
		scheduleDoctorFilterId,
		setScheduleDoctorFilterId,
		scheduleAssistantFilterId,
		setScheduleAssistantFilterId,
		scheduleChairFilterId,
		setScheduleChairFilterId,
		scheduleDefaultDoctorUserId,
		setScheduleDefaultDoctorUserId,
		scheduleDefaultAssistantUserId,
		setScheduleDefaultAssistantUserId,
		scheduleDefaultChairId,
		setScheduleDefaultChairId,
		scheduleStatusFilter,
		setScheduleStatusFilter,
		scheduleDateFilter,
		setScheduleDateFilter,
		sortedAppointments,
		resetScheduleFilters,
		setDoctorFilter,
		setAssistantFilter,
		setChairFilter,
		setStatusFilter,
		setDateFilter,
		hasActiveFilters,
	};
}
