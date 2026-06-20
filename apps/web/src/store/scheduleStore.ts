import { create } from "zustand";
import { Appointment } from "@dental/shared";

import { emptyAppointmentScheduleDraft, StaffScheduleDraft, StaffScheduleSaveState, AppointmentScheduleDraft, AppointmentScheduleSaveState, loadUiPreferences, defaultUiPreferences } from "../AppHelpers";

const initialUiPreferences = loadUiPreferences() ?? defaultUiPreferences;

export interface ScheduleStore {
  scheduleDoctorFilterId: string | null;
  setScheduleDoctorFilterId: (val: string | null | ((prev: string | null) => string | null)) => void;
  scheduleAssistantFilterId: string | null;
  setScheduleAssistantFilterId: (val: string | null | ((prev: string | null) => string | null)) => void;
  scheduleChairFilterId: string | null;
  setScheduleChairFilterId: (val: string | null | ((prev: string | null) => string | null)) => void;
  scheduleDefaultDoctorUserId: string | null;
  setScheduleDefaultDoctorUserId: (val: string | null | ((prev: string | null) => string | null)) => void;
  scheduleDefaultAssistantUserId: string | null;
  setScheduleDefaultAssistantUserId: (val: string | null | ((prev: string | null) => string | null)) => void;
  scheduleDefaultChairId: string | null;
  setScheduleDefaultChairId: (val: string | null | ((prev: string | null) => string | null)) => void;
  scheduleStatusFilter: Appointment["status"] | "all";
  setScheduleStatusFilter: (val: Appointment["status"] | "all" | ((prev: Appointment["status"] | "all") => Appointment["status"] | "all")) => void;
  scheduleDateFilter: any;
  setScheduleDateFilter: (val: any | ((prev: any) => any)) => void;
  staffScheduleDrafts: Record<string, StaffScheduleDraft>;
  setStaffScheduleDrafts: (val: Record<string, StaffScheduleDraft> | ((prev: Record<string, StaffScheduleDraft>) => Record<string, StaffScheduleDraft>)) => void;
  staffScheduleSavingId: string | null;
  setStaffScheduleSavingId: (val: string | null | ((prev: string | null) => string | null)) => void;
  staffScheduleDirtyIds: Set<string>;
  setStaffScheduleDirtyIds: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  staffScheduleSaveStates: Record<string, StaffScheduleSaveState>;
  setStaffScheduleSaveStates: (val: Record<string, StaffScheduleSaveState> | ((prev: Record<string, StaffScheduleSaveState>) => Record<string, StaffScheduleSaveState>)) => void;
  chairScheduleDrafts: Record<string, StaffScheduleDraft>;
  setChairScheduleDrafts: (val: Record<string, StaffScheduleDraft> | ((prev: Record<string, StaffScheduleDraft>) => Record<string, StaffScheduleDraft>)) => void;
  chairScheduleSavingId: string | null;
  setChairScheduleSavingId: (val: string | null | ((prev: string | null) => string | null)) => void;
  chairScheduleDirtyIds: Set<string>;
  setChairScheduleDirtyIds: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  chairScheduleSaveStates: Record<string, StaffScheduleSaveState>;
  setChairScheduleSaveStates: (val: Record<string, StaffScheduleSaveState> | ((prev: Record<string, StaffScheduleSaveState>) => Record<string, StaffScheduleSaveState>)) => void;
  appointmentScheduleDrafts: Record<string, AppointmentScheduleDraft>;
  setAppointmentScheduleDrafts: (val: Record<string, AppointmentScheduleDraft> | ((prev: Record<string, AppointmentScheduleDraft>) => Record<string, AppointmentScheduleDraft>)) => void;
  appointmentScheduleDirtyIds: Set<string>;
  setAppointmentScheduleDirtyIds: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  appointmentScheduleSaveStates: Record<string, AppointmentScheduleSaveState>;
  setAppointmentScheduleSaveStates: (val: Record<string, AppointmentScheduleSaveState> | ((prev: Record<string, AppointmentScheduleSaveState>) => Record<string, AppointmentScheduleSaveState>)) => void;
  appointmentScheduleErrors: Record<string, string | null>;
  setAppointmentScheduleErrors: (val: Record<string, string | null> | ((prev: Record<string, string | null>) => Record<string, string | null>)) => void;
  newAppointmentDraft: AppointmentScheduleDraft;
  setNewAppointmentDraft: (val: AppointmentScheduleDraft | ((prev: AppointmentScheduleDraft) => AppointmentScheduleDraft)) => void;
  newAppointmentSaveState: AppointmentScheduleSaveState;
  setNewAppointmentSaveState: (val: AppointmentScheduleSaveState | ((prev: AppointmentScheduleSaveState) => AppointmentScheduleSaveState)) => void;
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  scheduleDoctorFilterId: initialUiPreferences.scheduleDoctorFilterId,
  scheduleAssistantFilterId: initialUiPreferences.scheduleAssistantFilterId,
  scheduleChairFilterId: initialUiPreferences.scheduleChairFilterId,
  scheduleDefaultDoctorUserId: initialUiPreferences.scheduleDefaultDoctorUserId,
  scheduleDefaultAssistantUserId: initialUiPreferences.scheduleDefaultAssistantUserId,
  scheduleDefaultChairId: initialUiPreferences.scheduleDefaultChairId,
  scheduleStatusFilter: initialUiPreferences.scheduleStatusFilter,
  scheduleDateFilter: initialUiPreferences.scheduleDateFilter,
  staffScheduleDrafts: {},
  staffScheduleSavingId: null,
  staffScheduleDirtyIds: new Set(),
  staffScheduleSaveStates: {},
  chairScheduleDrafts: {},
  chairScheduleSavingId: null,
  chairScheduleDirtyIds: new Set(),
  chairScheduleSaveStates: {},
  appointmentScheduleDrafts: {},
  appointmentScheduleDirtyIds: new Set(),
  appointmentScheduleSaveStates: {},
  appointmentScheduleErrors: {},
  newAppointmentDraft: emptyAppointmentScheduleDraft(),
  newAppointmentSaveState: "idle",
  setScheduleDoctorFilterId: (val) => set((state) => ({ scheduleDoctorFilterId: typeof val === 'function' ? (val as any)(state.scheduleDoctorFilterId) : val })),
  setScheduleAssistantFilterId: (val) => set((state) => ({ scheduleAssistantFilterId: typeof val === 'function' ? (val as any)(state.scheduleAssistantFilterId) : val })),
  setScheduleChairFilterId: (val) => set((state) => ({ scheduleChairFilterId: typeof val === 'function' ? (val as any)(state.scheduleChairFilterId) : val })),
  setScheduleDefaultDoctorUserId: (val) => set((state) => ({ scheduleDefaultDoctorUserId: typeof val === 'function' ? (val as any)(state.scheduleDefaultDoctorUserId) : val })),
  setScheduleDefaultAssistantUserId: (val) => set((state) => ({ scheduleDefaultAssistantUserId: typeof val === 'function' ? (val as any)(state.scheduleDefaultAssistantUserId) : val })),
  setScheduleDefaultChairId: (val) => set((state) => ({ scheduleDefaultChairId: typeof val === 'function' ? (val as any)(state.scheduleDefaultChairId) : val })),
  setScheduleStatusFilter: (val) => set((state) => ({ scheduleStatusFilter: typeof val === 'function' ? (val as any)(state.scheduleStatusFilter) : val })),
  setScheduleDateFilter: (val) => set((state) => ({ scheduleDateFilter: typeof val === 'function' ? (val as any)(state.scheduleDateFilter) : val })),
  setStaffScheduleDrafts: (val) => set((state) => ({ staffScheduleDrafts: typeof val === 'function' ? (val as any)(state.staffScheduleDrafts) : val })),
  setStaffScheduleSavingId: (val) => set((state) => ({ staffScheduleSavingId: typeof val === 'function' ? (val as any)(state.staffScheduleSavingId) : val })),
  setStaffScheduleDirtyIds: (val) => set((state) => ({ staffScheduleDirtyIds: typeof val === 'function' ? (val as any)(state.staffScheduleDirtyIds) : val })),
  setStaffScheduleSaveStates: (val) => set((state) => ({ staffScheduleSaveStates: typeof val === 'function' ? (val as any)(state.staffScheduleSaveStates) : val })),
  setChairScheduleDrafts: (val) => set((state) => ({ chairScheduleDrafts: typeof val === 'function' ? (val as any)(state.chairScheduleDrafts) : val })),
  setChairScheduleSavingId: (val) => set((state) => ({ chairScheduleSavingId: typeof val === 'function' ? (val as any)(state.chairScheduleSavingId) : val })),
  setChairScheduleDirtyIds: (val) => set((state) => ({ chairScheduleDirtyIds: typeof val === 'function' ? (val as any)(state.chairScheduleDirtyIds) : val })),
  setChairScheduleSaveStates: (val) => set((state) => ({ chairScheduleSaveStates: typeof val === 'function' ? (val as any)(state.chairScheduleSaveStates) : val })),
  setAppointmentScheduleDrafts: (val) => set((state) => ({ appointmentScheduleDrafts: typeof val === 'function' ? (val as any)(state.appointmentScheduleDrafts) : val })),
  setAppointmentScheduleDirtyIds: (val) => set((state) => ({ appointmentScheduleDirtyIds: typeof val === 'function' ? (val as any)(state.appointmentScheduleDirtyIds) : val })),
  setAppointmentScheduleSaveStates: (val) => set((state) => ({ appointmentScheduleSaveStates: typeof val === 'function' ? (val as any)(state.appointmentScheduleSaveStates) : val })),
  setAppointmentScheduleErrors: (val) => set((state) => ({ appointmentScheduleErrors: typeof val === 'function' ? (val as any)(state.appointmentScheduleErrors) : val })),
  setNewAppointmentDraft: (val) => set((state) => ({ newAppointmentDraft: typeof val === 'function' ? (val as any)(state.newAppointmentDraft) : val })),
  setNewAppointmentSaveState: (val) => set((state) => ({ newAppointmentSaveState: typeof val === 'function' ? (val as any)(state.newAppointmentSaveState) : val })),
}));
