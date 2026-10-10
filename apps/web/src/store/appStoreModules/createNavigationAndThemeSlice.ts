import { getInitialNavigationAndThemeState } from "./initialAppState";
import type { AppSliceCreator, NavigationAndThemeSlice } from "./types";

export const createNavigationAndThemeSlice: AppSliceCreator<
	NavigationAndThemeSlice
> = (set) => {
	const initial = getInitialNavigationAndThemeState();
	return {
		...initial,
		setOdontogramUseSurfaces: (val) =>
			set((state) => ({
				odontogramUseSurfaces:
					typeof val === "function" ? val(state.odontogramUseSurfaces) : val,
			})),
		setOdontogramViewMode: (val) =>
			set((state) => ({
				odontogramViewMode:
					typeof val === "function" ? val(state.odontogramViewMode) : val,
			})),
		setUiPreferencesHydrated: (val) => set({ uiPreferencesHydrated: val }),
		setUiLanguage: (val) => set({ uiLanguage: val }),
		setClinicProfileDraft: (val) =>
			set((state) => ({
				clinicProfileDraft:
					typeof val === "function" ? val(state.clinicProfileDraft) : val,
			})),
		setClinicProfileSaveState: (val) => set({ clinicProfileSaveState: val }),
		setClinicProfileDirty: (val) => set({ clinicProfileDirty: val }),
		setCurrentView: (val) => set({ currentView: val }),
		setSettingsTab: (val) => set({ settingsTab: val }),
		setSelectedWorkspaceRole: (val) => set({ selectedWorkspaceRole: val }),
		setNewStaffName: (val) => set({ newStaffName: val }),
		setNewStaffRole: (val) => set({ newStaffRole: val }),
		setNewStaffSpecialty: (val) => set({ newStaffSpecialty: val }),
		setNewChairName: (val) => set({ newChairName: val }),
		setNewChairHasXraySensor: (val) => set({ newChairHasXraySensor: val }),
		setNewChairHasMicroscope: (val) => set({ newChairHasMicroscope: val }),
		setNewChairHasSurgeryKit: (val) => set({ newChairHasSurgeryKit: val }),
		setNewRuleTitle: (val) => set({ newRuleTitle: val }),
		setNewRuleAction: (val) => set({ newRuleAction: val }),
		setNewRuleSeverity: (val) => set({ newRuleSeverity: val }),
		setNewRuleOwnerRole: (val) => set({ newRuleOwnerRole: val }),
		setNewRuleSpecialty: (val) => set({ newRuleSpecialty: val }),
		setNewRuleCategory: (val) => set({ newRuleCategory: val }),
		setNewRuleTriggerServiceId: (val) => set({ newRuleTriggerServiceId: val }),
		setNewRuleRequiredServiceId: (val) =>
			set({ newRuleRequiredServiceId: val }),
		setNewRuleCompletedServiceId: (val) =>
			set({ newRuleCompletedServiceId: val }),
		setNewRuleBlockedServiceId: (val) => set({ newRuleBlockedServiceId: val }),
		setNewRuleWarningText: (val) => set({ newRuleWarningText: val }),
		setNewRulePatientText: (val) => set({ newRulePatientText: val }),
		setOhifBaseUrl: (val) => set({ ohifBaseUrl: val }),
	};
};
