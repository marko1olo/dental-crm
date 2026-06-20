import { create } from "zustand";
import { 
  emptyPatientCoreDraft, 
  emptyPatientAdministrativeProfileDraft, 
  loadUiPreferences, 
  defaultUiPreferences, 
  type PatientCoreSaveState,
  type PatientAdministrativeProfileSaveState,
  type PatientCoreDraft,
  type PatientAdministrativeProfileDraft
} from "../AppHelpers";

const initialUiPreferences = loadUiPreferences() ?? defaultUiPreferences;

export interface PatientStore {
  selectedPatientId: string | null;
  setSelectedPatientId: (val: string | null | ((prev: string | null) => string | null)) => void;

  patientCoreDraft: PatientCoreDraft;
  setPatientCoreDraft: (val: PatientCoreDraft | ((prev: PatientCoreDraft) => PatientCoreDraft)) => void;

  patientCoreSaveState: PatientCoreSaveState;
  setPatientCoreSaveState: (val: PatientCoreSaveState | ((prev: PatientCoreSaveState) => PatientCoreSaveState)) => void;

  patientCoreDirty: boolean;
  setPatientCoreDirty: (val: boolean | ((prev: boolean) => boolean)) => void;

  patientAdministrativeProfileDraft: PatientAdministrativeProfileDraft;
  setPatientAdministrativeProfileDraft: (val: PatientAdministrativeProfileDraft | ((prev: PatientAdministrativeProfileDraft) => PatientAdministrativeProfileDraft)) => void;

  patientAdministrativeProfileSaveState: PatientAdministrativeProfileSaveState;
  setPatientAdministrativeProfileSaveState: (val: PatientAdministrativeProfileSaveState | ((prev: PatientAdministrativeProfileSaveState) => PatientAdministrativeProfileSaveState)) => void;

  patientAdministrativeProfileDirty: boolean;
  setPatientAdministrativeProfileDirty: (val: boolean | ((prev: boolean) => boolean)) => void;

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
}

export const usePatientStore = create<PatientStore>((set) => ({
  selectedPatientId: initialUiPreferences.selectedPatientId ?? null,
  setSelectedPatientId: (val) => set((state) => ({ selectedPatientId: typeof val === "function" ? val(state.selectedPatientId) : val })),

  patientCoreDraft: emptyPatientCoreDraft(),
  setPatientCoreDraft: (val) => set((state) => ({ patientCoreDraft: typeof val === "function" ? val(state.patientCoreDraft) : val })),

  patientCoreSaveState: "idle",
  setPatientCoreSaveState: (val) => set((state) => ({ patientCoreSaveState: typeof val === "function" ? val(state.patientCoreSaveState) : val })),

  patientCoreDirty: false,
  setPatientCoreDirty: (val) => set((state) => ({ patientCoreDirty: typeof val === "function" ? val(state.patientCoreDirty) : val })),

  patientAdministrativeProfileDraft: emptyPatientAdministrativeProfileDraft(),
  setPatientAdministrativeProfileDraft: (val) => set((state) => ({ patientAdministrativeProfileDraft: typeof val === "function" ? val(state.patientAdministrativeProfileDraft) : val })),

  patientAdministrativeProfileSaveState: "idle",
  setPatientAdministrativeProfileSaveState: (val) => set((state) => ({ patientAdministrativeProfileSaveState: typeof val === "function" ? val(state.patientAdministrativeProfileSaveState) : val })),

  patientAdministrativeProfileDirty: false,
  setPatientAdministrativeProfileDirty: (val) => set((state) => ({ patientAdministrativeProfileDirty: typeof val === "function" ? val(state.patientAdministrativeProfileDirty) : val })),

  newPatientName: "",
  setNewPatientName: (val) => set((state) => ({ newPatientName: typeof val === "function" ? val(state.newPatientName) : val })),

  newPatientPhone: "",
  setNewPatientPhone: (val) => set((state) => ({ newPatientPhone: typeof val === "function" ? val(state.newPatientPhone) : val })),

  newPatientBirthDate: "",
  setNewPatientBirthDate: (val) => set((state) => ({ newPatientBirthDate: typeof val === "function" ? val(state.newPatientBirthDate) : val })),

  isPatientCreating: false,
  setIsPatientCreating: (val) => set((state) => ({ isPatientCreating: typeof val === "function" ? val(state.isPatientCreating) : val })),

  newRulePatientText: "Это правило снижает риск повторного лечения и объясняет пациенту необходимость этапа.",
  setNewRulePatientText: (val) => set((state) => ({ newRulePatientText: typeof val === "function" ? val(state.newRulePatientText) : val })),
}));
