/**
 * DENTE CRM — Staff PIN & Administrative Secrets Slice
 */

import { resolveUpdater } from "../updater.js";

export interface StaffPinSliceState {
	clinicalAdminSecretDraft: string;
	settingsAdminSecretDraft: string;
	scheduleAdminSecretDraft: string;
	telegramAdminSecretDraft: string;
	clinicalAdminSecretSession: string;
	settingsAdminSecretSession: string;
	scheduleAdminSecretSession: string;
	telegramAdminSecretSession: string;
	scheduleAdminSecretDemand: string;
}

export interface StaffPinSliceActions {
	setClinicalAdminSecretDraft: (val: string | ((prev: string) => string)) => void;
	setSettingsAdminSecretDraft: (val: string | ((prev: string) => string)) => void;
	setScheduleAdminSecretDraft: (val: string | ((prev: string) => string)) => void;
	setTelegramAdminSecretDraft: (val: string | ((prev: string) => string)) => void;
	setClinicalAdminSecretSession: (val: string | ((prev: string) => string)) => void;
	setSettingsAdminSecretSession: (val: string | ((prev: string) => string)) => void;
	setScheduleAdminSecretSession: (val: string | ((prev: string) => string)) => void;
	setTelegramAdminSecretSession: (val: string | ((prev: string) => string)) => void;
	setScheduleAdminSecretDemand: (val: string | ((prev: string) => string)) => void;
}

export const initialStaffPinSlice: StaffPinSliceState = {
	clinicalAdminSecretDraft: "",
	settingsAdminSecretDraft: "",
	scheduleAdminSecretDraft: "",
	telegramAdminSecretDraft: "",
	clinicalAdminSecretSession: "",
	settingsAdminSecretSession: "",
	scheduleAdminSecretSession: "",
	telegramAdminSecretSession: "",
	scheduleAdminSecretDemand: "",
};

export function createStaffPinSlice(set: any): StaffPinSliceActions {
	return {
		setClinicalAdminSecretDraft: (val) => set((s: any) => ({ clinicalAdminSecretDraft: resolveUpdater(val, s.clinicalAdminSecretDraft) })),
		setSettingsAdminSecretDraft: (val) => set((s: any) => ({ settingsAdminSecretDraft: resolveUpdater(val, s.settingsAdminSecretDraft) })),
		setScheduleAdminSecretDraft: (val) => set((s: any) => ({ scheduleAdminSecretDraft: resolveUpdater(val, s.scheduleAdminSecretDraft) })),
		setTelegramAdminSecretDraft: (val) => set((s: any) => ({ telegramAdminSecretDraft: resolveUpdater(val, s.telegramAdminSecretDraft) })),
		setClinicalAdminSecretSession: (val) => set((s: any) => ({ clinicalAdminSecretSession: resolveUpdater(val, s.clinicalAdminSecretSession) })),
		setSettingsAdminSecretSession: (val) => set((s: any) => ({ settingsAdminSecretSession: resolveUpdater(val, s.settingsAdminSecretSession) })),
		setScheduleAdminSecretSession: (val) => set((s: any) => ({ scheduleAdminSecretSession: resolveUpdater(val, s.scheduleAdminSecretSession) })),
		setTelegramAdminSecretSession: (val) => set((s: any) => ({ telegramAdminSecretSession: resolveUpdater(val, s.telegramAdminSecretSession) })),
		setScheduleAdminSecretDemand: (val) => set((s: any) => ({ scheduleAdminSecretDemand: resolveUpdater(val, s.scheduleAdminSecretDemand) })),
	};
}
