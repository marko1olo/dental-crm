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

export type A11yFontSize = "normal" | "large" | "x-large";

const THEME_STORAGE_KEY = "dente_theme_mode";
const THEME_PREV_STORAGE_KEY = "dente_theme_mode_prev";
const A11Y_MODE_STORAGE_KEY = "dente_a11y_mode";
const A11Y_FONT_STORAGE_KEY = "dente_a11y_font_size";

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

function isA11yFontSize(value: unknown): value is A11yFontSize {
	return value === "normal" || value === "large" || value === "x-large";
}

function readThemeMode(): ThemeMode {
	const stored = safeLocalStorageGetItem(THEME_STORAGE_KEY);
	return isThemeMode(stored) ? stored : "auto";
}

function readPrevThemeMode(): ThemeMode {
	const stored = safeLocalStorageGetItem(THEME_PREV_STORAGE_KEY);
	return isThemeMode(stored) && stored !== "contrast" ? stored : "auto";
}

function readA11yFontSize(): A11yFontSize {
	const stored = safeLocalStorageGetItem(A11Y_FONT_STORAGE_KEY);
	return isA11yFontSize(stored) ? stored : "normal";
}

function readA11yMode(mode: ThemeMode): boolean {
	if (mode === "contrast") return true;
	const stored = safeLocalStorageGetItem(A11Y_MODE_STORAGE_KEY);
	return stored === "true";
}

export interface ThemeState {
	themeMode: ThemeMode;
	isAccessibilityMode: boolean;
	a11yFontSize: A11yFontSize;
	setThemeMode: (mode: ThemeMode) => void;
	toggleAccessibilityMode: () => void;
	setA11yFontSize: (size: A11yFontSize) => void;
	reset: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
	const initialMode = readThemeMode();
	const initialA11y = readA11yMode(initialMode);
	const initialFontSize = readA11yFontSize();

	return {
		themeMode: initialA11y ? "contrast" : initialMode,
		isAccessibilityMode: initialA11y,
		a11yFontSize: initialFontSize,
		setThemeMode: (mode) => {
			safeLocalStorageSetItem(THEME_STORAGE_KEY, mode);
			const isA11y = mode === "contrast";
			if (!isA11y) {
				safeLocalStorageSetItem(THEME_PREV_STORAGE_KEY, mode);
				safeLocalStorageSetItem(A11Y_MODE_STORAGE_KEY, "false");
			} else {
				safeLocalStorageSetItem(A11Y_MODE_STORAGE_KEY, "true");
			}
			set({
				themeMode: mode,
				isAccessibilityMode: isA11y,
			});
		},
		toggleAccessibilityMode: () => {
			const currentMode = get().themeMode;
			const isCurrentA11y =
				get().isAccessibilityMode || currentMode === "contrast";
			if (isCurrentA11y) {
				const prev = readPrevThemeMode();
				const target = prev === "contrast" ? "auto" : prev;
				safeLocalStorageSetItem(THEME_STORAGE_KEY, target);
				safeLocalStorageSetItem(A11Y_MODE_STORAGE_KEY, "false");
				set({
					themeMode: target,
					isAccessibilityMode: false,
				});
			} else {
				if (currentMode !== "contrast") {
					safeLocalStorageSetItem(THEME_PREV_STORAGE_KEY, currentMode);
				}
				safeLocalStorageSetItem(THEME_STORAGE_KEY, "contrast");
				safeLocalStorageSetItem(A11Y_MODE_STORAGE_KEY, "true");
				set({
					themeMode: "contrast",
					isAccessibilityMode: true,
				});
			}
		},
		setA11yFontSize: (size) => {
			safeLocalStorageSetItem(A11Y_FONT_STORAGE_KEY, size);
			set({ a11yFontSize: size });
		},
		reset: () => {
			const mode = readThemeMode();
			const isA11y = readA11yMode(mode);
			set({
				themeMode: isA11y ? "contrast" : mode,
				isAccessibilityMode: isA11y,
				a11yFontSize: readA11yFontSize(),
			});
		},
	};
});

if (typeof window !== "undefined") {
	(
		window as Window & { __useThemeStore?: typeof useThemeStore }
	).__useThemeStore = useThemeStore;
}
