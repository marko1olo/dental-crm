import type {
	Appointment,
	Dashboard,
	DentalSpecialty,
	ScheduleWarning,
} from "@dental/shared";
import type {
	AppointmentScheduleDraft,
	AppointmentScheduleSaveState,
} from "../../../AppConstants";
import {
	appointmentScheduleDraftFromAppointment,
	appointmentScheduleMissingFields,
	newAppointmentDraftFromDashboard,
} from "../../../AppHelpers";
import type { ScheduleStore } from "../../../store/scheduleStore";
import { useWorkspaceProfileStore } from "../../useWorkspaceProfile";

export interface UseAppointmentDraftsProps {
	dashboard: Dashboard | null | undefined;
	selectedPatientId: string | null;
	selectedSpecialty: string | null;
	setEditingAppointmentId: React.Dispatch<React.SetStateAction<string | null>>;
	setSelectedPatientId: (id: string | null) => void;
	setNewAppointmentError: (msg: string | null) => void;
	setSettingsTab: (tab: string) => void;
	appointmentScheduleDraftsRef?: React.MutableRefObject<
		Record<string, AppointmentScheduleDraft>
	> | undefined;
	newAppointmentDraftRef?: { current: AppointmentScheduleDraft } | undefined;
	newAppointmentDraftUserEditedRef: React.MutableRefObject<boolean>;
	scheduleStore: ScheduleStore;
}

export function useAppointmentDrafts({
	dashboard,
	selectedPatientId,
	selectedSpecialty,
	setEditingAppointmentId,
	setSelectedPatientId,
	setNewAppointmentError,
	setSettingsTab,
	appointmentScheduleDraftsRef,
	newAppointmentDraftRef,
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
		const fallbackDraft = appointmentScheduleDraftFromAppointment(appointment);
		if (appointmentScheduleDraftsRef?.current) {
			appointmentScheduleDraftsRef.current = {
				...appointmentScheduleDraftsRef.current,
				[appointment.id]:
					appointmentScheduleDraftsRef.current[appointment.id] ?? fallbackDraft,
			};
		}
		setAppointmentScheduleDrafts(
			(current: Record<string, AppointmentScheduleDraft>) => ({
				...current,
				[appointment.id]: current[appointment.id] ?? fallbackDraft,
			}),
		);
		setAppointmentScheduleSaveStates(
			(current: Record<string, AppointmentScheduleSaveState>) => ({
				...current,
				[appointment.id]: "idle",
			}),
		);
		setAppointmentScheduleErrors(
			(current: Record<string, string | null>) => ({
				...current,
				[appointment.id]: null,
			}),
		);
	}

	function markAppointmentScheduleDirty(appointmentId: string) {
		setAppointmentScheduleDirtyIds((current: Set<string>) => {
			const next = new Set(current);
			next.add(appointmentId);
			return next;
		});
		setAppointmentScheduleSaveStates(
			(current: Record<string, AppointmentScheduleSaveState>) => ({
				...current,
				[appointmentId]: "idle",
			}),
		);
		setAppointmentScheduleErrors(
			(current: Record<string, string | null>) => ({
				...current,
				[appointmentId]: null,
			}),
		);
	}

	function updateAppointmentScheduleDraft<
		K extends keyof AppointmentScheduleDraft,
	>(appointmentId: string, key: K, value: AppointmentScheduleDraft[K]) {
		const sourceAppointment = dashboard?.appointments?.find(
			(appointment: Appointment) => appointment.id === appointmentId,
		);
		const baseFromRef =
			appointmentScheduleDraftsRef?.current?.[appointmentId] ??
			scheduleStore?.appointmentScheduleDrafts?.[appointmentId] ??
			(sourceAppointment
				? appointmentScheduleDraftFromAppointment(sourceAppointment)
				: ({} as Partial<AppointmentScheduleDraft>));
		const nextDraft = {
			...baseFromRef,
			[key]: value,
		} as AppointmentScheduleDraft;
		if (appointmentScheduleDraftsRef?.current) {
			appointmentScheduleDraftsRef.current = {
				...appointmentScheduleDraftsRef.current,
				[appointmentId]: nextDraft,
			};
		}
		setAppointmentScheduleDrafts(
			(current: Record<string, AppointmentScheduleDraft>) => ({
				...current,
				[appointmentId]: {
					...(current[appointmentId] ?? baseFromRef),
					[key]: value,
				} as AppointmentScheduleDraft,
			}),
		);
		markAppointmentScheduleDirty(appointmentId);
	}

	function newAppointmentPreferenceDefaults(): NonNullable<
		Parameters<typeof newAppointmentDraftFromDashboard>[1]
	> {
		let defaultChairId = scheduleDefaultChairId;
		if (
			!workspaceProfile.hasMultipleChairs &&
			dashboard?.clinicSettings?.chairs
		) {
			const activeChairs = dashboard.clinicSettings.chairs.filter(
				(c) => c.active,
			);
			if (activeChairs.length > 0) {
				defaultChairId = activeChairs[0]?.id ?? defaultChairId;
			}
		}
		const validSpecialties: readonly DentalSpecialty[] = [
			"universal",
			"therapist",
			"surgeon",
			"orthopedist",
			"orthodontist",
			"pediatric",
			"hygienist",
			"periodontist",
			"implantologist",
			"radiologist",
		];
		const parsedSpecialty =
			selectedSpecialty &&
			validSpecialties.includes(selectedSpecialty as DentalSpecialty)
				? (selectedSpecialty as DentalSpecialty)
				: null;

		const defaults: {
			selectedPatientId?: string | null;
			selectedSpecialty?: DentalSpecialty;
			scheduleDefaultDoctorUserId?: string | null;
			scheduleDefaultAssistantUserId?: string | null;
			scheduleDefaultChairId?: string | null;
		} = {
			selectedPatientId,
			scheduleDefaultDoctorUserId,
			scheduleDefaultAssistantUserId,
			scheduleDefaultChairId: defaultChairId,
		};
		if (parsedSpecialty) {
			defaults.selectedSpecialty = parsedSpecialty;
		}
		return defaults;
	}

	function updateNewAppointmentDraft<K extends keyof AppointmentScheduleDraft>(
		key: K,
		value: AppointmentScheduleDraft[K],
	) {
		newAppointmentDraftUserEditedRef.current = true;
		if (newAppointmentDraftRef) {
			newAppointmentDraftRef.current = {
				...(newAppointmentDraftRef.current ?? newAppointmentDraft),
				[key]: value,
			};
		}
		setNewAppointmentDraft((current: AppointmentScheduleDraft) => ({
			...current,
			[key]: value,
		}));
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
		const freshDraft = newAppointmentDraftFromDashboard(
			dashboard,
			newAppointmentPreferenceDefaults(),
		);
		if (newAppointmentDraftRef) {
			newAppointmentDraftRef.current = freshDraft;
		}
		setNewAppointmentDraft(freshDraft);
		setNewAppointmentSaveState("idle");
		setNewAppointmentError(null);
	}

	function closeAppointmentEditor(appointmentId: string) {
		setEditingAppointmentId((current) =>
			current === appointmentId ? null : current,
		);
		setAppointmentScheduleSaveStates(
			(current: Record<string, AppointmentScheduleSaveState>) => ({
				...current,
				[appointmentId]: "idle",
			}),
		);
		setAppointmentScheduleErrors(
			(current: Record<string, string | null>) => ({
				...current,
				[appointmentId]: null,
			}),
		);
	}

	function newAppointmentMissingFields(
		draft: AppointmentScheduleDraft,
	): string[] {
		const resources: {
			chairs?: Dashboard["clinicSettings"]["chairs"] | null;
			patients?: Dashboard["patients"] | null;
		} = {};
		if (dashboard?.clinicSettings?.chairs !== undefined) {
			resources.chairs = dashboard.clinicSettings.chairs;
		}
		if (dashboard?.patients !== undefined) {
			resources.patients = dashboard.patients;
		}
		return appointmentScheduleMissingFields(
			draft,
			dashboard?.clinicSettings?.profile?.mode,
			dashboard?.clinicSettings?.staff,
			resources,
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
