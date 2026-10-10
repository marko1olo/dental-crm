import { useMemo, useRef } from "react";
import type { Dashboard, StaffRole } from "@dental/shared";
import { useAppStore } from "../../store/appStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useScheduleLogic as useDomainScheduleLogic } from "../domains/useScheduleLogic";
import { useScheduleFilterController } from "../domains/useScheduleFilterController";
import { useScheduleSettingsLogic } from "../domains/useScheduleSettingsLogic";
import type {
	AppointmentScheduleDraft,
	StaffScheduleDraft,
} from "../../AppHelpers";
import type { ScheduleLogicSlice } from "./types";

interface UseScheduleLogicProps {
	dashboard: Dashboard | null;
	setDashboard: (dashboard: Dashboard | null) => void;
	auth: any;
	setError: (err: string | null) => void;
	selectedPatientId: string;
	setSelectedPatientId: (id: string) => void;
	loadDashboard: () => Promise<void>;
	selectedSpecialty: string;
	clinicProfileDraft: any;
	setSettingsTab: (tab: string) => void;
}

export function useScheduleLogic({
	dashboard,
	setDashboard,
	auth,
	setError,
	selectedPatientId,
	setSelectedPatientId,
	loadDashboard,
	selectedSpecialty,
	clinicProfileDraft,
	setSettingsTab,
}: UseScheduleLogicProps): ScheduleLogicSlice {
	const {
		query,
		setQuery,
		editingAppointmentId,
		setEditingAppointmentId,
		newAppointmentError,
		setNewAppointmentError,
		newChairName,
		setNewChairName,
		newChairHasXraySensor,
		setNewChairHasXraySensor,
		newChairHasMicroscope,
		setNewChairHasMicroscope,
		newChairHasSurgeryKit,
		setNewChairHasSurgeryKit,
		newStaffName,
		setNewStaffName,
		newStaffRole,
		setNewStaffRole,
		newStaffSpecialty,
		setNewStaffSpecialty,
	} = useAppStore();

	const {
		scheduleAdminSecretDraft,
		scheduleAdminSecretSession,
	} = useSettingsStore();

	const newAppointmentDraftUserEditedRef = useRef<boolean>(false);
	const staffScheduleDraftsRef = useRef<Record<string, StaffScheduleDraft>>({});
	const chairScheduleDraftsRef = useRef<Record<string, any>>({});
	const appointmentScheduleDraftsRef = useRef<Record<string, any>>({});

	const activeAppointment = useMemo(() => {
		if (!dashboard) return null;
		return (
			(selectedPatientId
				? dashboard.appointments?.find(
						(appointment) => appointment.patientId === selectedPatientId,
				  )
				: null) ??
			dashboard.appointments?.find(
				(appointment) =>
					appointment.id === dashboard?.activeVisit?.appointmentId,
			) ??
			dashboard.appointments?.[0] ??
			null
		);
	}, [dashboard, selectedPatientId]);

	const activeDoctor = useMemo(() => {
		if (!dashboard || !activeAppointment) return null;
		return (
			dashboard?.clinicSettings?.staff?.find(
				(member) =>
					member.id === activeAppointment.doctorUserId && member.active,
			) ?? null
		);
	}, [activeAppointment, dashboard]);

	const todayDoctorSlots = useMemo(() => {
		if (!dashboard?.appointments || !activeDoctor?.id) return [];
		return (
			dashboard.appointments as {
				doctorUserId?: string;
				status?: string;
				startsAt?: string;
				endsAt?: string;
			}[]
		)
			.filter(
				(app) =>
					app.doctorUserId === activeDoctor.id &&
					!["cancelled", "no_show"].includes(String(app.status ?? "").toLowerCase()),
			)
			.map((app) => ({ endsAt: app.endsAt ?? app.startsAt ?? "" }));
	}, [dashboard?.appointments, activeDoctor?.id]);

	const activeChair = useMemo(() => {
		if (!dashboard || !activeAppointment) return null;
		return (
			dashboard?.clinicSettings?.chairs?.find(
				(chair) => chair.id === activeAppointment.chairId && chair.active,
			) ?? null
		);
	}, [activeAppointment, dashboard]);

	const domainSchedule = useDomainScheduleLogic({
		dashboard,
		query,
		setError,
		auth,
		setDashboard,
		setQuery,
		selectedPatientId,
		setEditingAppointmentId,
		newAppointmentDraftUserEditedRef,
		setSelectedPatientId,
		setNewAppointmentError,
		clinicProfileDraft,
		setSettingsTab,
		staffScheduleDraftsRef,
		chairScheduleDraftsRef,
		appointmentScheduleDraftsRef,
		loadDashboard,
		selectedSpecialty,
	});

	const {
		staffScheduleDrafts,
		staffScheduleSavingId,
		staffScheduleSaveStates,
		updateStaffScheduleDraft,
		updateChairScheduleDraft,
		updateStaffScheduleDay,
		updateChairScheduleDay,
		updateAppointmentScheduleDraft,
		updateNewAppointmentDraft,
		saveStaffSchedule,
	} = domainSchedule;

	const scheduleFilterController = useScheduleFilterController({
		dashboard,
	});

	const {
		toggleChairWorkingDay,
		toggleClinicWorkingDay,
		toggleStaffWorkingDay,
	} = useScheduleSettingsLogic({
		clinicProfileDraft,
		staffScheduleDrafts,
		chairScheduleDrafts: domainSchedule.chairScheduleDrafts,
		updateClinicProfileDraft: () => {},
		updateStaffScheduleDay,
		updateChairScheduleDay,
	} as any);

	const appointmentReadinessById = useMemo(() => {
		const result: Record<string, any> = {};
		for (const app of dashboard?.appointments ?? []) {
			result[app.id] = {
				isReady: Boolean(app.patientId && app.doctorUserId && app.startsAt),
			};
		}
		return result;
	}, [dashboard?.appointments]);

	const sortedAppointments = useMemo(() => {
		return (dashboard?.appointments ?? []).slice().sort((a, b) => {
			return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
		});
	}, [dashboard?.appointments]);

	return {
		editingAppointmentId,
		setEditingAppointmentId,
		newAppointmentError,
		setNewAppointmentError,
		newChairName,
		setNewChairName,
		newChairHasXraySensor,
		setNewChairHasXraySensor,
		newChairHasMicroscope,
		setNewChairHasMicroscope,
		newChairHasSurgeryKit,
		setNewChairHasSurgeryKit,
		newStaffName,
		setNewStaffName,
		newStaffRole: newStaffRole as StaffRole,
		setNewStaffRole: (r: StaffRole) => setNewStaffRole(r as any),
		newStaffSpecialty,
		setNewStaffSpecialty,
		activeAppointment,
		activeDoctor,
		todayDoctorSlots,
		activeChair,
		sortedAppointments,
		appointmentReadinessById,
		scheduleAdminSecretDraft,
		scheduleAdminSecretSession,
		updateAppointmentScheduleDraft,
		updateChairScheduleDay,
		updateChairScheduleDraft,
		updateNewAppointmentDraft,
		updateStaffScheduleDay,
		updateStaffScheduleDraft,
		toggleChairWorkingDay,
		toggleClinicWorkingDay,
		toggleStaffWorkingDay,
		staffScheduleDrafts,
		staffScheduleSaveStates,
		staffScheduleSavingId,
		saveStaffSchedule,
		schedule: domainSchedule,
		scheduleFilterController,
	};
}
