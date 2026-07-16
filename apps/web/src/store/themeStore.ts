import { create } from "zustand";

export interface ThemeState {
	themeMode: "auto" | "light" | "dark";
	setThemeMode: (mode: "auto" | "light" | "dark") => void;
	reset: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
	themeMode:
		(localStorage.getItem("dente_theme_mode") as "auto" | "light" | "dark") ||
		"auto",
	setThemeMode: (mode) => {
		localStorage.setItem("dente_theme_mode", mode);
		set({ themeMode: mode });
	},
	reset: () =>
		set({
			themeMode:
				(localStorage.getItem("dente_theme_mode") as
					| "auto"
					| "light"
					| "dark") || "auto",
		}),
}));

if (typeof window !== "undefined") {
	(window as any).__useThemeStore = useThemeStore;
}
