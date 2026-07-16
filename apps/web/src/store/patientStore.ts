import { create } from "zustand";
import {
	defaultUiPreferences,
	denteAdminSecretRequestHeaders,
	emptyPatientAdministrativeProfileDraft,
	emptyPatientCoreDraft,
	loadUiPreferences,
	type PatientAdministrativeProfileDraft,
	type PatientAdministrativeProfileSaveState,
	type PatientCoreDraft,
	type PatientCoreSaveState,
} from "../AppHelpers";

const initialUiPreferences = loadUiPreferences() ?? defaultUiPreferences;

export type ToothStatus =
	| "Healthy"
	| "Caries"
	| "Filling"
	| "Missing"
	| "Implant"
	| "Crown";

export interface PatientStore {
	odontogramState: Record<number, ToothStatus>;
	setToothStatus: (toothNumber: number, status: ToothStatus) => void;
	loadOdontogram: (patientId: string) => Promise<void>;
	saveToothStatus: (
		patientId: string,
		toothNumber: number | number[],
		status: ToothStatus,
	) => Promise<void>;

	anamnesisDraft: {
		allergies: string[];
		systemicDiseases: string[];
		hasCriticalAlerts: boolean;
	};
	setAnamnesisDraft: (
		val:
			| PatientStore["anamnesisDraft"]
			| ((
					prev: PatientStore["anamnesisDraft"],
			  ) => PatientStore["anamnesisDraft"]),
	) => void;
	anamnesisSaveState: "idle" | "saving" | "saved" | "error";
	setAnamnesisSaveState: (val: "idle" | "saving" | "saved" | "error") => void;
	loadAnamnesis: (patientId: string) => Promise<void>;
	saveAnamnesis: (patientId: string) => Promise<void>;

	selectedPatientId: string | null;
	setSelectedPatientId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;

	patientCoreDraft: PatientCoreDraft;
	setPatientCoreDraft: (
		val: PatientCoreDraft | ((prev: PatientCoreDraft) => PatientCoreDraft),
	) => void;

	patientCoreSaveState: PatientCoreSaveState;
	setPatientCoreSaveState: (
		val:
			| PatientCoreSaveState
			| ((prev: PatientCoreSaveState) => PatientCoreSaveState),
	) => void;

	patientCoreDirty: boolean;
	setPatientCoreDirty: (val: boolean | ((prev: boolean) => boolean)) => void;

	patientAdministrativeProfileDraft: PatientAdministrativeProfileDraft;
	setPatientAdministrativeProfileDraft: (
		val:
			| PatientAdministrativeProfileDraft
			| ((
					prev: PatientAdministrativeProfileDraft,
			  ) => PatientAdministrativeProfileDraft),
	) => void;

	patientAdministrativeProfileSaveState: PatientAdministrativeProfileSaveState;
	setPatientAdministrativeProfileSaveState: (
		val:
			| PatientAdministrativeProfileSaveState
			| ((
					prev: PatientAdministrativeProfileSaveState,
			  ) => PatientAdministrativeProfileSaveState),
	) => void;

	patientAdministrativeProfileDirty: boolean;
	setPatientAdministrativeProfileDirty: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;

	newPatientName: string;
	setNewPatientName: (val: string | ((prev: string) => string)) => void;

	newPatientPhone: string;
	setNewPatientPhone: (val: string | ((prev: string) => string)) => void;

	newPatientBirthDate: string;
	setNewPatientBirthDate: (val: string | ((prev: string) => string)) => void;

	isPatientCreating: boolean;
	setIsPatientCreating: (val: boolean | ((prev: boolean) => boolean)) => void;

	newRulePatientText: string;
	setNewRulePatientText: (val: string | ((prev: string) => string)) => void;

	reset: () => void;
}

export const usePatientStore = create<PatientStore>((set) => ({
	odontogramState: {},
	setToothStatus: (toothNumber, status) =>
		set((state) => ({
			odontogramState: { ...state.odontogramState, [toothNumber]: status },
		})),
	loadOdontogram: async (patientId) => {
		try {
			const res = await fetch(`/api/patients/${patientId}/tooth-states`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				const newState: Record<number, ToothStatus> = {};
				const mapBackendToFrontend: Record<string, ToothStatus> = {
					Healthy: "Healthy",
					Caries: "Caries",
					Filled: "Filling",
					Missing: "Missing",
					Implant: "Implant",
					Crown: "Crown",
					Pulpitis: "Caries",
					Planned_Implant: "Implant",
				};
				for (const item of data) {
					if (item.toothNumber && item.state) {
						newState[item.toothNumber] =
							mapBackendToFrontend[item.state] || "Healthy";
					}
				}
				set({ odontogramState: newState });
			}
		} catch (e) {
			console.error("Failed to load odontogram", e);
		}
	},
	saveToothStatus: async (patientId, toothNumber, status) => {
		const teeth = Array.isArray(toothNumber) ? toothNumber : [toothNumber];

		// Optimistic update
		set((state) => {
			const nextOdontogram = { ...state.odontogramState };
			for (const t of teeth) {
				nextOdontogram[t] = status;
			}
			return { odontogramState: nextOdontogram };
		});

		try {
			const mapFrontendToBackend: Record<ToothStatus, string> = {
				Healthy: "Healthy",
				Caries: "Caries",
				Filling: "Filled",
				Missing: "Missing",
				Implant: "Implant",
				Crown: "Crown",
			};
			await fetch(`/api/patients/${patientId}/tooth-states/batch`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					toothNumbers: teeth,
					state: mapFrontendToBackend[status] || "Healthy",
				}),
			});
		} catch (e) {
			console.error("Failed to save tooth status", e);
		}
	},

	anamnesisDraft: {
		allergies: [],
		systemicDiseases: [],
		hasCriticalAlerts: false,
	},
	setAnamnesisDraft: (val) =>
		set((state) => ({
			anamnesisDraft:
				typeof val === "function" ? val(state.anamnesisDraft) : val,
		})),
	anamnesisSaveState: "idle",
	setAnamnesisSaveState: (val) => set({ anamnesisSaveState: val }),
	loadAnamnesis: async (patientId) => {
		try {
			const res = await fetch(`/api/patients/${patientId}/anamnesis`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				set({
					anamnesisDraft: {
						allergies: data.allergies || [],
						systemicDiseases: data.systemicDiseases || [],
						hasCriticalAlerts: data.hasCriticalAlerts || false,
					},
					anamnesisSaveState: "idle",
				});
			}
		} catch (e) {
			console.error("Failed to load anamnesis", e);
		}
	},
	saveAnamnesis: async (patientId) => {
		set({ anamnesisSaveState: "saving" });
		try {
			const draft = usePatientStore.getState().anamnesisDraft;
			const res = await fetch(`/api/patients/${patientId}/anamnesis`, {
				method: "PUT",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(draft),
			});
			if (res.ok) {
				set({ anamnesisSaveState: "saved" });
				setTimeout(() => set({ anamnesisSaveState: "idle" }), 3000);
			} else {
				set({ anamnesisSaveState: "error" });
			}
		} catch (e) {
			console.error("Failed to save anamnesis", e);
			set({ anamnesisSaveState: "error" });
		}
	},

	selectedPatientId: initialUiPreferences.selectedPatientId ?? null,
	setSelectedPatientId: (val) =>
		set((state) => ({
			selectedPatientId:
				typeof val === "function" ? val(state.selectedPatientId) : val,
		})),

	patientCoreDraft: emptyPatientCoreDraft(),
	setPatientCoreDraft: (val) =>
		set((state) => ({
			patientCoreDraft:
				typeof val === "function" ? val(state.patientCoreDraft) : val,
		})),

	patientCoreSaveState: "idle",
	setPatientCoreSaveState: (val) =>
		set((state) => ({
			patientCoreSaveState:
				typeof val === "function" ? val(state.patientCoreSaveState) : val,
		})),

	patientCoreDirty: false,
	setPatientCoreDirty: (val) =>
		set((state) => ({
			patientCoreDirty:
				typeof val === "function" ? val(state.patientCoreDirty) : val,
		})),

	patientAdministrativeProfileDraft: emptyPatientAdministrativeProfileDraft(),
	setPatientAdministrativeProfileDraft: (val) =>
		set((state) => ({
			patientAdministrativeProfileDraft:
				typeof val === "function"
					? val(state.patientAdministrativeProfileDraft)
					: val,
		})),

	patientAdministrativeProfileSaveState: "idle",
	setPatientAdministrativeProfileSaveState: (val) =>
		set((state) => ({
			patientAdministrativeProfileSaveState:
				typeof val === "function"
					? val(state.patientAdministrativeProfileSaveState)
					: val,
		})),

	patientAdministrativeProfileDirty: false,
	setPatientAdministrativeProfileDirty: (val) =>
		set((state) => ({
			patientAdministrativeProfileDirty:
				typeof val === "function"
					? val(state.patientAdministrativeProfileDirty)
					: val,
		})),

	newPatientName: "",
	setNewPatientName: (val) =>
		set((state) => ({
			newPatientName:
				typeof val === "function" ? val(state.newPatientName) : val,
		})),

	newPatientPhone: "",
	setNewPatientPhone: (val) =>
		set((state) => ({
			newPatientPhone:
				typeof val === "function" ? val(state.newPatientPhone) : val,
		})),

	newPatientBirthDate: "",
	setNewPatientBirthDate: (val) =>
		set((state) => ({
			newPatientBirthDate:
				typeof val === "function" ? val(state.newPatientBirthDate) : val,
		})),

	isPatientCreating: false,
	setIsPatientCreating: (val) =>
		set((state) => ({
			isPatientCreating:
				typeof val === "function" ? val(state.isPatientCreating) : val,
		})),

	newRulePatientText: "",
	setNewRulePatientText: (val) =>
		set((state) => ({
			newRulePatientText:
				typeof val === "function" ? val(state.newRulePatientText) : val,
		})),

	reset: () =>
		set({
			odontogramState: {},
			selectedPatientId: null,
			patientCoreDraft: emptyPatientCoreDraft(),
			patientCoreSaveState: "idle",
			patientCoreDirty: false,
			patientAdministrativeProfileDraft:
				emptyPatientAdministrativeProfileDraft(),
			patientAdministrativeProfileSaveState: "idle",
			patientAdministrativeProfileDirty: false,
			newPatientName: "",
			newPatientPhone: "",
			newPatientBirthDate: "",
			isPatientCreating: false,
			newRulePatientText: "",
		}),
}));
