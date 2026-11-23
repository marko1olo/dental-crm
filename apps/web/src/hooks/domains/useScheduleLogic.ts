import { useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Dashboard } from "@dental/shared";
import type {
	AppointmentScheduleDraft,
	ClinicProfileDraft,
	StaffScheduleDraft,
} from "../../AppConstants";
import { useScheduleStore } from "../../store/scheduleStore";
import { scheduleAdminSecretRefusal } from "./schedule/scheduleAdminSecretRefusal";
import { useAppointmentDrafts } from "./schedule/useAppointmentDrafts";
import { useAppointmentMutations } from "./schedule/useAppointmentMutations";
import { useStaffChairScheduleDrafts } from "./schedule/useStaffChairScheduleDrafts";

export { scheduleAdminSecretRefusal } from "./schedule/scheduleAdminSecretRefusal";

export interface UseScheduleLogicProps {
	dashboard: Dashboard | null | undefined;
	query?: string | undefined;
	setError: (error: string | null) => void;
	auth: {
		settingsAccessHeaders: (extra?: Record<string, string>) => Record<string, string>;
		scheduleMutationHeaders: (extra?: Record<string, string>) => Record<string, string>;
		denteClinicalMutationHeaders?: (extra?: Record<string, string>) => Record<string, string>;
	};
	setDashboard: (
		updater: ((prev: Dashboard | null) => Dashboard | null) | Dashboard | null,
	) => void;
	setQuery?: ((query: string) => void) | undefined;
	selectedPatientId?: string | null | undefined;
	setEditingAppointmentId?: ((id: string | null) => void) | Dispatch<SetStateAction<string | null>> | undefined;
	newAppointmentDraftUserEditedRef?: MutableRefObject<boolean> | undefined;
	setSelectedPatientId?: ((id: string | null) => void) | undefined;
	setNewAppointmentError?: ((error: string | null) => void) | undefined;
	clinicProfileDraft?: ClinicProfileDraft | null | undefined;
	setSettingsTab?: ((tab: string) => void) | undefined;
	staffScheduleDraftsRef?: MutableRefObject<Record<string, StaffScheduleDraft>> | undefined;
	chairScheduleDraftsRef?: MutableRefObject<Record<string, StaffScheduleDraft>> | undefined;
	appointmentScheduleDraftsRef?: MutableRefObject<Record<string, AppointmentScheduleDraft>> | undefined;
	loadDashboard: (options?: { adminSecret?: string; silent?: boolean } | undefined) => Promise<unknown> | void;
	selectedSpecialty?: string | undefined;
}

export function useScheduleLogic({
	dashboard,
	setError,
	auth,
	setDashboard,
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
}: UseScheduleLogicProps) {
	const scheduleStore = useScheduleStore();
	const internalNewAppointmentDraftRef = {
		current: scheduleStore.newAppointmentDraft,
	};
	const defaultStaffDraftsRef = useRef<Record<string, StaffScheduleDraft>>({});
	const defaultChairDraftsRef = useRef<Record<string, StaffScheduleDraft>>({});
	const defaultApptDraftsRef = useRef<Record<string, AppointmentScheduleDraft>>({});
	const defaultUserEditedRef = useRef(false);

	const effectiveStaffDraftsRef = staffScheduleDraftsRef ?? defaultStaffDraftsRef;
	const effectiveChairDraftsRef = chairScheduleDraftsRef ?? defaultChairDraftsRef;
	const effectiveApptDraftsRef = appointmentScheduleDraftsRef ?? defaultApptDraftsRef;
	const effectiveUserEditedRef = newAppointmentDraftUserEditedRef ?? defaultUserEditedRef;

	const defaultSetEditingAppointmentId: Dispatch<SetStateAction<string | null>> = () => {};
	const effectiveSetEditingAppointmentId: Dispatch<SetStateAction<string | null>> =
		typeof setEditingAppointmentId === "function"
			? (action) => {
					if (typeof action === "function") {
						setEditingAppointmentId((action as (prev: string | null) => string | null)(null));
					} else {
						setEditingAppointmentId(action);
					}
			  }
			: defaultSetEditingAppointmentId;
	const effectiveSetSelectedPatientId = setSelectedPatientId ?? (() => {});
	const effectiveSetNewAppointmentError = setNewAppointmentError ?? (() => {});
	const effectiveSetSettingsTab = setSettingsTab ?? (() => {});

	const safeLoadDashboard = async () => {
		await loadDashboard();
	};

	const staffChairDrafts = useStaffChairScheduleDrafts({
		dashboard: dashboard ?? null,
		auth,
		setError,
		clinicProfileDraft,
		staffScheduleDraftsRef: effectiveStaffDraftsRef,
		chairScheduleDraftsRef: effectiveChairDraftsRef,
		loadDashboard: safeLoadDashboard,
		scheduleStore,
	});

	const apptDrafts = useAppointmentDrafts({
		dashboard: dashboard ?? null,
		selectedPatientId: selectedPatientId ?? null,
		selectedSpecialty: selectedSpecialty ?? null,
		setEditingAppointmentId: effectiveSetEditingAppointmentId,
		setSelectedPatientId: effectiveSetSelectedPatientId,
		setNewAppointmentError: effectiveSetNewAppointmentError,
		setSettingsTab: effectiveSetSettingsTab,
		appointmentScheduleDraftsRef: effectiveApptDraftsRef,
		newAppointmentDraftRef: internalNewAppointmentDraftRef,
		newAppointmentDraftUserEditedRef: effectiveUserEditedRef,
		scheduleStore,
	});

	const mutations = useAppointmentMutations({
		dashboard: dashboard ?? null,
		setError,
		auth,
		setDashboard,
		selectedPatientId: selectedPatientId ?? null,
		selectedSpecialty: selectedSpecialty ?? null,
		setEditingAppointmentId: effectiveSetEditingAppointmentId,
		setSelectedPatientId: effectiveSetSelectedPatientId,
		setNewAppointmentError: effectiveSetNewAppointmentError,
		appointmentScheduleDraftsRef: effectiveApptDraftsRef,
		newAppointmentDraftRef: internalNewAppointmentDraftRef,
		newAppointmentDraftUserEditedRef: effectiveUserEditedRef,
		scheduleStore,
	});

	return {
		...scheduleStore,
		slotConflict: mutations.slotConflict,
		setSlotConflict: mutations.setSlotConflict,
		applySuggestedSlot: mutations.applySuggestedSlot,
		markStaffScheduleDirty: staffChairDrafts.markStaffScheduleDirty,
		markChairScheduleDirty: staffChairDrafts.markChairScheduleDirty,
		updateStaffScheduleDraft: staffChairDrafts.updateStaffScheduleDraft,
		updateChairScheduleDraft: staffChairDrafts.updateChairScheduleDraft,
		updateStaffScheduleDay: staffChairDrafts.updateStaffScheduleDay,
		updateChairScheduleDay: staffChairDrafts.updateChairScheduleDay,
		openAppointmentEditor: apptDrafts.openAppointmentEditor,
		markAppointmentScheduleDirty: apptDrafts.markAppointmentScheduleDirty,
		updateAppointmentScheduleDraft: apptDrafts.updateAppointmentScheduleDraft,
		newAppointmentPreferenceDefaults: apptDrafts.newAppointmentPreferenceDefaults,
		updateNewAppointmentDraft: apptDrafts.updateNewAppointmentDraft,
		resetNewAppointmentDraft: apptDrafts.resetNewAppointmentDraft,
		closeAppointmentEditor: apptDrafts.closeAppointmentEditor,
		buildOnboardingFirstAppointmentIssues:
			staffChairDrafts.buildOnboardingFirstAppointmentIssues,
		saveOnboardingSchedulesIfDirty:
			staffChairDrafts.saveOnboardingSchedulesIfDirty,
		openScheduleWarning: apptDrafts.openScheduleWarning,
		saveStaffSchedule: staffChairDrafts.saveStaffSchedule,
		saveChairSchedule: staffChairDrafts.saveChairSchedule,
		saveAppointmentSchedule: mutations.saveAppointmentSchedule,
		newAppointmentMissingFields: apptDrafts.newAppointmentMissingFields,
		createAppointmentFromDraft: mutations.createAppointmentFromDraft,
	};
}
