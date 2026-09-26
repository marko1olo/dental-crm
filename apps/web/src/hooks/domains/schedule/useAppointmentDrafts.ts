import type { Appointment, ScheduleWarning } from "@dental/shared";
import type { AppointmentScheduleDraft } from "../../../AppConstants";
import {
	appointmentScheduleDraftFromAppointment,
	appointmentScheduleMissingFields,
	newAppointmentDraftFromDashboard,
} from "../../../AppHelpers";
import { useWorkspaceProfileStore } from "../../useWorkspaceProfile";

export interface UseAppointmentDraftsProps {
	dashboard: any;
	selectedPatientId: string | null;
	selectedSpecialty: string | null;
	setEditingAppointmentId: React.Dispatch<React.SetStateAction<string | null>>;
	setSelectedPatientId: (id: string | null) => void;
	setNewAppointmentError: (msg: string | null) => void;
	setSettingsTab: (tab: string) => void;
	newAppointmentDraftUserEditedRef: React.MutableRefObject<boolean>;
	scheduleStore: any;
}

export function useAppointmentDrafts({
	dashboard,
	selectedPatientId,
	selectedSpecialty,
	setEditingAppointmentId,
	setSelectedPatientId,
	setNewAppointmentError,
	setSettingsTab,
	newAppointmentDraftUserEditedRef,
	scheduleStore,
}: UseAppointmentDraftsProps) {
	const workspaceProfile = useWorkspaceProfileStore();
	const {
		scheduleDefaultDoctorUserId,
		setScheduleDefaultDoctorUserId,
		scheduleDefaultAssistantUserId,
		setScheduleDefaultAssistantUserId,
		scheduleDefaultChairId,
		setScheduleDefaultChairId,
		setAppointmentScheduleDrafts,
		setAppointmentScheduleDirtyIds,
		setAppointmentScheduleSaveStates,
		setAppointmentScheduleErrors,
		newAppointmentDraft,
		setNewAppointmentDraft,
		setNewAppointmentSaveState,
	} = scheduleStore;

	function openAppointmentEditor(appointment: Appointment) {
		setEditingAppointmentId(appointment.id);
		setAppointmentScheduleDrafts((current: any) => ({
			...current,
			[appointment.id]:
				current[appointment.id] ??
				appointmentScheduleDraftFromAppointment(appointment),
		}));
		setAppointmentScheduleSaveStates((current: any) => ({
			...current,
			[appointment.id]: "idle",
		}));
		setAppointmentScheduleErrors((current: any) => ({
			...current,
			[appointment.id]: null,
		}));
	}

	function markAppointmentScheduleDirty(appointmentId: string) {
		setAppointmentScheduleDirtyIds((current: Set<string>) => {
			const next = new Set(current);
			next.add(appointmentId);
			return next;
		});
		setAppointmentScheduleSaveStates((current: any) => ({
			...current,
			[appointmentId]: "idle",
		}));
		setAppointmentScheduleErrors((current: any) => ({
			...current,
			[appointmentId]: null,
		}));
	}

	function updateAppointmentScheduleDraft<
		K extends keyof AppointmentScheduleDraft,
	>(appointmentId: string, key: K, value: AppointmentScheduleDraft[K]) {
		const sourceAppointment = dashboard?.appointments?.find(
			(appointment: any) => appointment.id === appointmentId,
		);
		setAppointmentScheduleDrafts((current: any) => ({
			...current,
			[appointmentId]: {
				...(current[appointmentId] ??
					(sourceAppointment
						? appointmentScheduleDraftFromAppointment(sourceAppointment)
						: {})),
				[key]: value,
			} as AppointmentScheduleDraft,
		}));
		markAppointmentScheduleDirty(appointmentId);
	}

	function newAppointmentPreferenceDefaults() {
		let defaultChairId = scheduleDefaultChairId;
		if (
			!workspaceProfile.hasMultipleChairs &&
			dashboard?.clinicSettings?.chairs
		) {
			const activeChairs = dashboard.clinicSettings.chairs.filter(
				(c: any) => c.active,
			);
			if (activeChairs.length > 0) {
				defaultChairId = activeChairs[0].id;
			}
		}
		return {
			selectedPatientId,
			selectedSpecialty: (selectedSpecialty as any) || undefined,
			scheduleDefaultDoctorUserId,
			scheduleDefaultAssistantUserId,
			scheduleDefaultChairId: defaultChairId,
		};
	}

	function updateNewAppointmentDraft<K extends keyof AppointmentScheduleDraft>(
		key: K,
		value: AppointmentScheduleDraft[K],
	) {
		newAppointmentDraftUserEditedRef.current = true;
		setNewAppointmentDraft((current: any) => ({ ...current, [key]: value }));
		if (key === "patientId" && typeof value === "string")
			setSelectedPatientId(value || null);
		if (key === "doctorUserId" && typeof value === "string")
			setScheduleDefaultDoctorUserId(value || null);
		if (key === "assistantUserId" && typeof value === "string")
			setScheduleDefaultAssistantUserId(value || null);
		if (key === "chairId" && typeof value === "string")
			setScheduleDefaultChairId(value || null);
		setNewAppointmentSaveState("idle");
		setNewAppointmentError(null);
	}

	function resetNewAppointmentDraft() {
		if (!dashboard) return;
		newAppointmentDraftUserEditedRef.current = false;
		setNewAppointmentDraft(
			newAppointmentDraftFromDashboard(
				dashboard,
				newAppointmentPreferenceDefaults() as any,
			),
		);
		setNewAppointmentSaveState("idle");
		setNewAppointmentError(null);
	}

	function closeAppointmentEditor(appointmentId: string) {
		setEditingAppointmentId((current) =>
			current === appointmentId ? null : current,
		);
		setAppointmentScheduleSaveStates((current: any) => ({
			...current,
			[appointmentId]: "idle",
		}));
		setAppointmentScheduleErrors((current: any) => ({
			...current,
			[appointmentId]: null,
		}));
	}

	function newAppointmentMissingFields(
		draft: AppointmentScheduleDraft,
	): string[] {
		return appointmentScheduleMissingFields(
			draft,
			dashboard?.clinicSettings?.profile?.mode,
			dashboard?.clinicSettings?.staff,
			{
				chairs: dashboard?.clinicSettings?.chairs,
				patients: dashboard?.patients,
			},
		);
	}

	function openScheduleWarning(warning: ScheduleWarning) {
		if (warning.actionLabel.toLowerCase().includes("связ")) {
			window.location.hash = "communications";
			return;
		}
		if (warning.actionLabel.toLowerCase().includes("оплат")) {
			window.location.hash = "finance";
			return;
		}
		if (warning.actionLabel.toLowerCase().includes("документ")) {
			window.location.hash = "documents";
			return;
		}
		if (warning.actionLabel.toLowerCase().includes("роль")) {
			window.location.hash = "settings";
			setSettingsTab("clinic");
			return;
		}
		if (warning.actionLabel.toLowerCase().includes("пациент")) {
			window.location.hash = "patients";
			return;
		}
		window.location.hash = "visit";
	}

	return {
		openAppointmentEditor,
		markAppointmentScheduleDirty,
		updateAppointmentScheduleDraft,
		newAppointmentPreferenceDefaults,
		updateNewAppointmentDraft,
		resetNewAppointmentDraft,
		closeAppointmentEditor,
		newAppointmentMissingFields,
		openScheduleWarning,
	};
}
