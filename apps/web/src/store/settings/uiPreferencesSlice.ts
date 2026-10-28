/**
 * DENTE CRM — UI Preferences & CBCT Defaults Slice
 */

import { type DoctorCbctDefaultSettings, loadDoctorCbctSettings } from "../../components/radiology/cbctLutMath.js";
import { resolveUpdater } from "../updater.js";

export interface UiPreferencesSliceState {
	cbctDefaults: DoctorCbctDefaultSettings;
	telegramSendingItemId: string | null;
	telegramRevokingLinkId: string | null;
}

export interface UiPreferencesSliceActions {
	setCbctDefaults: (val: DoctorCbctDefaultSettings | ((prev: DoctorCbctDefaultSettings) => DoctorCbctDefaultSettings)) => void;
	setTelegramSendingItemId: (val: string | null | ((prev: string | null) => string | null)) => void;
	setTelegramRevokingLinkId: (val: string | null | ((prev: string | null) => string | null)) => void;
}

export const initialUiPreferencesSlice: UiPreferencesSliceState = {
	cbctDefaults: loadDoctorCbctSettings(),
	telegramSendingItemId: null,
	telegramRevokingLinkId: null,
};

export function createUiPreferencesSlice(set: any): UiPreferencesSliceActions {
	return {
		setCbctDefaults: (val) => set((s: any) => ({ cbctDefaults: resolveUpdater(val, s.cbctDefaults) })),
		setTelegramSendingItemId: (val) => set((s: any) => ({ telegramSendingItemId: resolveUpdater(val, s.telegramSendingItemId) })),
		setTelegramRevokingLinkId: (val) => set((s: any) => ({ telegramRevokingLinkId: resolveUpdater(val, s.telegramRevokingLinkId) })),
	};
}
