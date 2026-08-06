import type { Appointment } from "@dental/shared";
import { create } from "zustand";
import {
	type AppointmentScheduleDraft,
	type AppointmentScheduleSaveState,
	defaultUiPreferences,
	emptyAppointmentScheduleDraft,
	loadUiPreferences,
	type StaffScheduleDraft,
	type StaffScheduleSaveState,
} from "../AppHelpers";
import { resolveUpdater } from "./updater";

const initialUiPreferences = loadUiPreferences() ?? defaultUiPreferences;

export interface ScheduleStore {
	scheduleDoctorFilterId: string | null;
	setScheduleDoctorFilterId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	scheduleAssistantFilterId: string | null;
	setScheduleAssistantFilterId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	scheduleChairFilterId: string | null;
	setScheduleChairFilterId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	scheduleDefaultDoctorUserId: string | null;
	setScheduleDefaultDoctorUserId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	scheduleDefaultAssistantUserId: string | null;
	setScheduleDefaultAssistantUserId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	scheduleDefaultChairId: string | null;
	setScheduleDefaultChairId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	scheduleStatusFilter: Appointment["status"] | "all";
	setScheduleStatusFilter: (
		val:
			| Appointment["status"]
			| "all"
			| ((
					prev: Appointment["status"] | "all",
			  ) => Appointment["status"] | "all"),
	) => void;
	scheduleDateFilter: any;
	setScheduleDateFilter: (val: any | ((prev: any) => any)) => void;
	staffScheduleDrafts: Record<string, StaffScheduleDraft>;
	setStaffScheduleDrafts: (
		val:
			| Record<string, StaffScheduleDraft>
			| ((
					prev: Record<string, StaffScheduleDraft>,
			  ) => Record<string, StaffScheduleDraft>),
	) => void;
	staffScheduleSavingId: string | null;
	setStaffScheduleSavingId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	staffScheduleDirtyIds: Set<string>;
	setStaffScheduleDirtyIds: (
		val: Set<string> | ((prev: Set<string>) => Set<string>),
	) => void;
	staffScheduleSaveStates: Record<string, StaffScheduleSaveState>;
	setStaffScheduleSaveStates: (
		val:
			| Record<string, StaffScheduleSaveState>
			| ((
					prev: Record<string, StaffScheduleSaveState>,
			  ) => Record<string, StaffScheduleSaveState>),
	) => void;
	chairScheduleDrafts: Record<string, StaffScheduleDraft>;
	setChairScheduleDrafts: (
		val:
			| Record<string, StaffScheduleDraft>
			| ((
					prev: Record<string, StaffScheduleDraft>,
			  ) => Record<string, StaffScheduleDraft>),
	) => void;
	chairScheduleSavingId: string | null;
	setChairScheduleSavingId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	chairScheduleDirtyIds: Set<string>;
	setChairScheduleDirtyIds: (
		val: Set<string> | ((prev: Set<string>) => Set<string>),
	) => void;
	chairScheduleSaveStates: Record<string, StaffScheduleSaveState>;
	setChairScheduleSaveStates: (
		val:
			| Record<string, StaffScheduleSaveState>
			| ((
					prev: Record<string, StaffScheduleSaveState>,
			  ) => Record<string, StaffScheduleSaveState>),
	) => void;
	appointmentScheduleDrafts: Record<string, AppointmentScheduleDraft>;
	setAppointmentScheduleDrafts: (
		val:
			| Record<string, AppointmentScheduleDraft>
			| ((
					prev: Record<string, AppointmentScheduleDraft>,
			  ) => Record<string, AppointmentScheduleDraft>),
	) => void;
	appointmentScheduleDirtyIds: Set<string>;
	setAppointmentScheduleDirtyIds: (
		val: Set<string> | ((prev: Set<string>) => Set<string>),
	) => void;
	appointmentScheduleSaveStates: Record<string, AppointmentScheduleSaveState>;
	setAppointmentScheduleSaveStates: (
		val:
			| Record<string, AppointmentScheduleSaveState>
			| ((
					prev: Record<string, AppointmentScheduleSaveState>,
			  ) => Record<string, AppointmentScheduleSaveState>),
	) => void;
	appointmentScheduleErrors: Record<string, string | null>;
	setAppointmentScheduleErrors: (
		val:
			| Record<string, string | null>
			| ((
					prev: Record<string, string | null>,
			  ) => Record<string, string | null>),
	) => void;
	newAppointmentDraft: AppointmentScheduleDraft;
	setNewAppointmentDraft: (
		val:
			| AppointmentScheduleDraft
			| ((prev: AppointmentScheduleDraft) => AppointmentScheduleDraft),
	) => void;
	newAppointmentSaveState: AppointmentScheduleSaveState;
	setNewAppointmentSaveState: (
		val:
			| AppointmentScheduleSaveState
			| ((prev: AppointmentScheduleSaveState) => AppointmentScheduleSaveState),
	) => void;
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
	scheduleDoctorFilterId: initialUiPreferences.scheduleDoctorFilterId,
	scheduleAssistantFilterId: initialUiPreferences.scheduleAssistantFilterId,
	scheduleChairFilterId: initialUiPreferences.scheduleChairFilterId,
	scheduleDefaultDoctorUserId: initialUiPreferences.scheduleDefaultDoctorUserId,
	scheduleDefaultAssistantUserId:
		initialUiPreferences.scheduleDefaultAssistantUserId,
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
	setScheduleDoctorFilterId: (val) =>
		set((state) => ({
			scheduleDoctorFilterId: resolveUpdater(val, state.scheduleDoctorFilterId),
		})),
	setScheduleAssistantFilterId: (val) =>
		set((state) => ({
			scheduleAssistantFilterId: resolveUpdater(
				val,
				state.scheduleAssistantFilterId,
			),
		})),
	setScheduleChairFilterId: (val) =>
		set((state) => ({
			scheduleChairFilterId: resolveUpdater(val, state.scheduleChairFilterId),
		})),
	setScheduleDefaultDoctorUserId: (val) =>
		set((state) => ({
			scheduleDefaultDoctorUserId: resolveUpdater(
				val,
				state.scheduleDefaultDoctorUserId,
			),
		})),
	setScheduleDefaultAssistantUserId: (val) =>
		set((state) => ({
			scheduleDefaultAssistantUserId: resolveUpdater(
				val,
				state.scheduleDefaultAssistantUserId,
			),
		})),
	setScheduleDefaultChairId: (val) =>
		set((state) => ({
			scheduleDefaultChairId: resolveUpdater(val, state.scheduleDefaultChairId),
		})),
	setScheduleStatusFilter: (val) =>
		set((state) => ({
			scheduleStatusFilter: resolveUpdater(val, state.scheduleStatusFilter),
		})),
	setScheduleDateFilter: (val) =>
		set((state) => ({
			scheduleDateFilter: resolveUpdater(val, state.scheduleDateFilter),
		})),
	setStaffScheduleDrafts: (val) =>
		set((state) => ({
			staffScheduleDrafts: resolveUpdater(val, state.staffScheduleDrafts),
		})),
	setStaffScheduleSavingId: (val) =>
		set((state) => ({
			staffScheduleSavingId: resolveUpdater(val, state.staffScheduleSavingId),
		})),
	setStaffScheduleDirtyIds: (val) =>
		set((state) => ({
			staffScheduleDirtyIds: resolveUpdater(val, state.staffScheduleDirtyIds),
		})),
	setStaffScheduleSaveStates: (val) =>
		set((state) => ({
			staffScheduleSaveStates: resolveUpdater(
				val,
				state.staffScheduleSaveStates,
			),
		})),
	setChairScheduleDrafts: (val) =>
		set((state) => ({
			chairScheduleDrafts: resolveUpdater(val, state.chairScheduleDrafts),
		})),
	setChairScheduleSavingId: (val) =>
		set((state) => ({
			chairScheduleSavingId: resolveUpdater(val, state.chairScheduleSavingId),
		})),
	setChairScheduleDirtyIds: (val) =>
		set((state) => ({
			chairScheduleDirtyIds: resolveUpdater(val, state.chairScheduleDirtyIds),
		})),
	setChairScheduleSaveStates: (val) =>
		set((state) => ({
			chairScheduleSaveStates: resolveUpdater(
				val,
				state.chairScheduleSaveStates,
			),
		})),
	setAppointmentScheduleDrafts: (val) =>
		set((state) => ({
			appointmentScheduleDrafts: resolveUpdater(
				val,
				state.appointmentScheduleDrafts,
			),
		})),
	setAppointmentScheduleDirtyIds: (val) =>
		set((state) => ({
			appointmentScheduleDirtyIds: resolveUpdater(
				val,
				state.appointmentScheduleDirtyIds,
			),
		})),
	setAppointmentScheduleSaveStates: (val) =>
		set((state) => ({
			appointmentScheduleSaveStates: resolveUpdater(
				val,
				state.appointmentScheduleSaveStates,
			),
		})),
	setAppointmentScheduleErrors: (val) =>
		set((state) => ({
			appointmentScheduleErrors: resolveUpdater(
				val,
				state.appointmentScheduleErrors,
			),
		})),
	setNewAppointmentDraft: (val) =>
		set((state) => ({
			newAppointmentDraft: resolveUpdater(val, state.newAppointmentDraft),
		})),
	setNewAppointmentSaveState: (val) =>
		set((state) => ({
			newAppointmentSaveState: resolveUpdater(
				val,
				state.newAppointmentSaveState,
			),
		})),
}));
