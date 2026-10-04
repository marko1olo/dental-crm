import { create } from "zustand";
import type { ScheduleDensityMode } from "./appointmentCardHelpers";
export type { ScheduleDensityMode } from "./appointmentCardHelpers";

const DENSITY_STORAGE_KEY = "dental_schedule_density_mode";

function getStoredDensityMode(): ScheduleDensityMode {
	if (typeof window === "undefined" || !window.localStorage) {
		return "informative";
	}
	try {
		const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
		if (stored === "compact" || stored === "informative" || stored === "expanded") {
			return stored;
		}
	} catch {
		// ignore storage quota / access issues
	}
	return "informative";
}

export interface ScheduleDensityState {
	densityMode: ScheduleDensityMode;
	setDensityMode: (mode: ScheduleDensityMode) => void;
}

export const useScheduleDensityStore = create<ScheduleDensityState>((set) => ({
	densityMode: getStoredDensityMode(),
	setDensityMode: (mode: ScheduleDensityMode) => {
		try {
			if (typeof window !== "undefined" && window.localStorage) {
				window.localStorage.setItem(DENSITY_STORAGE_KEY, mode);
			}
		} catch {
			// ignore storage errors
		}
		set({ densityMode: mode });
	},
}));

export function useScheduleDensity() {
	const densityMode = useScheduleDensityStore((s) => s.densityMode);
	const setDensityMode = useScheduleDensityStore((s) => s.setDensityMode);
	return { densityMode, setDensityMode };
}
