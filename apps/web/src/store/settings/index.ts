/**
 * DENTE CRM — Modular Settings Store
 */

import { create } from "zustand";
import {
	type ClinicMode,
	type ClinicModeSliceActions,
	type ClinicModeSliceState,
	createClinicModeSlice,
	initialClinicModeSlice,
} from "./clinicModeSlice.js";
import {
	type StaffPinSliceActions,
	type StaffPinSliceState,
	createStaffPinSlice,
	initialStaffPinSlice,
} from "./staffPinSlice.js";
import {
	type UiPreferencesSliceActions,
	type UiPreferencesSliceState,
	createUiPreferencesSlice,
	initialUiPreferencesSlice,
} from "./uiPreferencesSlice.js";
import {
	createTelegramSettingsSlice,
	initialTelegramSettingsSlice,
} from "./telegramSettingsSlice.js";
import type {
	TelegramSettingsActions,
	TelegramSettingsState,
} from "./telegramSettingsTypes.js";

export type { ClinicMode };

export type SettingsState = ClinicModeSliceState &
	StaffPinSliceState &
	UiPreferencesSliceState &
	TelegramSettingsState;

export type SettingsActions = ClinicModeSliceActions &
	StaffPinSliceActions &
	UiPreferencesSliceActions &
	TelegramSettingsActions;

export const useSettingsStore = create<SettingsState & SettingsActions>()((set) => ({
	...initialClinicModeSlice,
	...initialStaffPinSlice,
	...initialUiPreferencesSlice,
	...initialTelegramSettingsSlice,
	...createClinicModeSlice(set),
	...createStaffPinSlice(set),
	...createUiPreferencesSlice(set),
	...createTelegramSettingsSlice(set),
}));
