import { create } from "zustand";

export type UiLanguage = "ru" | "en";

export type UiScale = "standard" | "large";

interface UiStore {
	uiLanguage: UiLanguage;
	setUiLanguage: (lang: UiLanguage) => void;
	onboardingDismissed: boolean;
	setOnboardingDismissed: (dismissed: boolean) => void;
	uiScale: UiScale;
	setUiScale: (scale: UiScale) => void;
}

export const useUiStore = create<UiStore>((set) => ({
	uiLanguage: "ru",
	setUiLanguage: (lang) => set({ uiLanguage: lang }),
	onboardingDismissed: false,
	setOnboardingDismissed: (dismissed) =>
		set({ onboardingDismissed: dismissed }),
	uiScale: "standard",
	setUiScale: (scale) => set({ uiScale: scale }),
}));
