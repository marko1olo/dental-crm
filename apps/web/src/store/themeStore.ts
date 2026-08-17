import { create } from "zustand";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";

export type ThemeMode =
	| "auto"
	| "light"
	| "dark"
	| "night"
	| "calm_teal"
	| "contrast"
	| "sakura"
	| "ocean"
	| "emerald"
	| "cyber_xray"
	| "warm_sand";

const THEME_STORAGE_KEY = "dente_theme_mode";

function isThemeMode(value: unknown): value is ThemeMode {
	return (
		value === "auto" ||
		value === "light" ||
		value === "dark" ||
		value === "night" ||
		value === "calm_teal" ||
		value === "contrast" ||
		value === "sakura" ||
		value === "ocean" ||
		value === "emerald" ||
		value === "cyber_xray" ||
		value === "warm_sand"
	);
}

function readThemeMode(): ThemeMode {
	const stored = safeLocalStorageGetItem(THEME_STORAGE_KEY);
	return isThemeMode(stored) ? stored : "auto";
}

export interface ThemeState {
	themeMode: ThemeMode;
	setThemeMode: (mode: ThemeMode) => void;
	reset: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
	themeMode: readThemeMode(),
	setThemeMode: (mode) => {
		safeLocalStorageSetItem(THEME_STORAGE_KEY, mode);
		set({ themeMode: mode });
	},
	reset: () => set({ themeMode: readThemeMode() }),
}));

if (typeof window !== "undefined") {
	(
		window as Window & { __useThemeStore?: typeof useThemeStore }
	).__useThemeStore = useThemeStore;
}
