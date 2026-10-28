/**
 * doctorPreferencesStore.ts — Фасад хранилища предпочтений врача (Мандат 8b: лимит строк <=300).
 * Декомпозирован на:
 * - doctorPreferences/types.ts (типы данных)
 * - doctorPreferences/odontogramDisplaySlice.ts (нотации и шкала времени)
 * - doctorPreferences/clinicalNormPresetsSlice.ts (препараты, иглы, пресеты по специальностям)
 */

import { create } from "zustand";
import {
	safeLocalStorageGetJson,
	safeLocalStorageSetJson,
} from "../lib/safeLocalStorage";
import {
	fetchDoctorPreferencesFromApi,
	saveDoctorPreferencesToApi,
} from "../api/doctorPreferencesApi";
import {
	ADHESIVE_OPTIONS,
	ANESTHETIC_OPTIONS,
	COMPOSITE_OPTIONS,
	ETCHANT_OPTIONS,
	ISOLATION_OPTIONS,
} from "../components/settings/doctorClinicalPreferencesConstants";
import type {
	DoctorPreferences,
	DoctorPreferencesState,
	DoctorSpecialtyKey,
} from "./doctorPreferences/types.js";
import {
	DEFAULT_DOCTOR_PREFERENCES,
	getSpecialtyPresetPatch,
} from "./doctorPreferences/clinicalNormPresetsSlice.js";

// Полный реэкспорт констант и типов для 100% обратной совместимости
export {
	ADHESIVE_OPTIONS,
	ANESTHETIC_OPTIONS,
	COMPOSITE_OPTIONS,
	ETCHANT_OPTIONS,
	ISOLATION_OPTIONS,
};
export * from "./doctorPreferences/types.js";
export * from "./doctorPreferences/odontogramDisplaySlice.js";
export * from "./doctorPreferences/clinicalNormPresetsSlice.js";

const DOCTOR_PREFS_KEY = "dente_doctor_preferences_v1";

function readStoredPreferences(): DoctorPreferences {
	const stored = safeLocalStorageGetJson<Partial<DoctorPreferences>>(
		DOCTOR_PREFS_KEY,
		{},
	);
	return {
		...DEFAULT_DOCTOR_PREFERENCES,
		...stored,
	};
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
function triggerSyncToApi(prefs: DoctorPreferences) {
	if (typeof window === "undefined") return;
	if (syncTimer) clearTimeout(syncTimer);
	syncTimer = setTimeout(() => {
		void saveDoctorPreferencesToApi(prefs);
	}, 400);
}

export const useDoctorPreferencesStore = create<DoctorPreferencesState>(
	(set, get) => ({
		preferences: readStoredPreferences(),
		loadServerPreferences: async () => {
			const serverPrefs = await fetchDoctorPreferencesFromApi();
			if (serverPrefs && Object.keys(serverPrefs).length > 0) {
				const merged: DoctorPreferences = {
					...get().preferences,
					...serverPrefs,
				};
				safeLocalStorageSetJson(DOCTOR_PREFS_KEY, merged, true);
				set({ preferences: merged });
			}
		},
		updatePreferences: (patch) => {
			const updated = {
				...get().preferences,
				...patch,
			};
			safeLocalStorageSetJson(DOCTOR_PREFS_KEY, updated, true);
			set({ preferences: updated });
			triggerSyncToApi(updated);
		},
		resetPreferences: () => {
			safeLocalStorageSetJson(
				DOCTOR_PREFS_KEY,
				DEFAULT_DOCTOR_PREFERENCES,
				true,
			);
			set({ preferences: { ...DEFAULT_DOCTOR_PREFERENCES } });
			triggerSyncToApi({ ...DEFAULT_DOCTOR_PREFERENCES });
		},
		applySpecialtyPreset: (specialty: DoctorSpecialtyKey) => {
			const presetPatch = getSpecialtyPresetPatch(specialty);
			const updated = {
				...get().preferences,
				...presetPatch,
			};
			safeLocalStorageSetJson(DOCTOR_PREFS_KEY, updated, true);
			set({ preferences: updated });
			triggerSyncToApi(updated);
		},
	}),
);

if (typeof window !== "undefined") {
	void useDoctorPreferencesStore.getState().loadServerPreferences();
}
