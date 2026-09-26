import { useScheduleStore } from "../../store/scheduleStore";
import { scheduleAdminSecretRefusal } from "./schedule/scheduleAdminSecretRefusal";
import { useAppointmentDrafts } from "./schedule/useAppointmentDrafts";
import { useAppointmentMutations } from "./schedule/useAppointmentMutations";
import { useStaffChairScheduleDrafts } from "./schedule/useStaffChairScheduleDrafts";

export { scheduleAdminSecretRefusal } from "./schedule/scheduleAdminSecretRefusal";

export function useScheduleLogic({
	dashboard,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: automated suppression
	query,
	setError,
	auth,
	setDashboard,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: automated suppression
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
}: any) {
	const scheduleStore = useScheduleStore();

	const staffChairDrafts = useStaffChairScheduleDrafts({
		dashboard,
		auth,
		setError,
		clinicProfileDraft,
		staffScheduleDraftsRef,
		chairScheduleDraftsRef,
		loadDashboard,
		scheduleStore,
	});

	const apptDrafts = useAppointmentDrafts({
		dashboard,
		selectedPatientId,
		selectedSpecialty,
		setEditingAppointmentId,
		setSelectedPatientId,
		setNewAppointmentError,
		setSettingsTab,
		newAppointmentDraftUserEditedRef,
		scheduleStore,
	});

	const mutations = useAppointmentMutations({
		dashboard,
		setError,
		auth,
		setDashboard,
		selectedPatientId,
		selectedSpecialty,
		setEditingAppointmentId,
		setSelectedPatientId,
		setNewAppointmentError,
		appointmentScheduleDraftsRef,
		newAppointmentDraftUserEditedRef,
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
