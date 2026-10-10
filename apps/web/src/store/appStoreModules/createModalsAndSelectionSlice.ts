import { getInitialModalsAndSelectionState } from "./initialAppState";
import type { AppSliceCreator, ModalsAndSelectionSlice } from "./types";

export const createModalsAndSelectionSlice: AppSliceCreator<
	ModalsAndSelectionSlice
> = (set) => {
	const initial = getInitialModalsAndSelectionState();
	return {
		...initial,
		setOmnibarOpen: (val) => set({ isOmnibarOpen: val }),
		setShortcutsModalOpen: (val) => set({ isShortcutsModalOpen: val }),
		setHelpDrawerOpen: (val) => set({ isHelpDrawerOpen: val }),
		setActiveHelpDrawerTab: (val) => set({ activeHelpDrawerTab: val }),
		setDashboard: (val) =>
			set((state) => ({
				dashboard: typeof val === "function" ? val(state.dashboard) : val,
			})),
		setAccessUnlockRequired: (val) => set({ accessUnlockRequired: val }),
		setAccessUnlockMessage: (val) => set({ accessUnlockMessage: val }),
		setQuery: (val) => set({ query: val }),
		setEditingAppointmentId: (val) => set({ editingAppointmentId: val }),
		setNewAppointmentError: (val) => set({ newAppointmentError: val }),
		setImportText: (val) => set({ importText: val }),
		setSmartImportText: (val) => set({ smartImportText: val }),
		setPricelistText: (val) => set({ pricelistText: val }),
		setPricelistSourceKind: (val) => set({ pricelistSourceKind: val }),
		setUsePricelistAi: (val) => set({ usePricelistAi: val }),
		setPricelistAnalysis: (val) => set({ pricelistAnalysis: val }),
		setPricelistImageBase64: (val) => set({ pricelistImageBase64: val }),
		setPricelistImageMimeType: (val) => set({ pricelistImageMimeType: val }),
		setPricelistImageName: (val) => set({ pricelistImageName: val }),
		setPricelistImageNote: (val) => set({ pricelistImageNote: val }),
		setRecognitionKind: (val) => set({ recognitionKind: val }),
		setRecognitionTarget: (val) => set({ recognitionTarget: val }),
		setRecognitionText: (val) => set({ recognitionText: val }),
		setImportSourceKind: (val) => set({ importSourceKind: val }),
		setSmartImportMode: (val) => set({ smartImportMode: val }),
		setBrowserMigrationDiscovery: (val) =>
			set({ browserMigrationDiscovery: val }),
		setBrowserMigrationScanProgress: (val) =>
			set({ browserMigrationScanProgress: val }),
		setImportIntake: (val) => set({ importIntake: val }),
		setImportPreview: (val) => set({ importPreview: val }),
		setImportCommit: (val) => set({ importCommit: val }),
		setMigrationAutopilot: (val) => set({ migrationAutopilot: val }),
		setMigrationSourceDiscovery: (val) =>
			set({ migrationSourceDiscovery: val }),
		setMigrationSourceWorkup: (val) => set({ migrationSourceWorkup: val }),
		setMigrationSourceProbe: (val) => set({ migrationSourceProbe: val }),
		setClinicPublicLookup: (val) => set({ clinicPublicLookup: val }),
		setSmartImportPreview: (val) => set({ smartImportPreview: val }),
		setSmartImportCommit: (val) => set({ smartImportCommit: val }),
		setRecognitionJob: (val) => set({ recognitionJob: val }),
		setActiveTooth: (val) =>
			set((state) => ({
				activeTooth: typeof val === "function" ? val(state.activeTooth) : val,
			})),
		setActiveDoctorName: (val) =>
			set((state) => ({
				activeDoctorName:
					typeof val === "function" ? val(state.activeDoctorName) : val,
			})),
		setActivePatientId: (val) =>
			set((state) => ({
				activePatientId:
					typeof val === "function" ? val(state.activePatientId) : val,
			})),
	};
};
