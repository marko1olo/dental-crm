import { create } from "zustand";
import type { UiLanguage } from "@dental/shared";

export type { UiLanguage };

export type UiScale = "standard" | "large";

interface UiStore {
	uiLanguage: UiLanguage;
	setUiLanguage: (lang: UiLanguage) => void;
	onboardingDismissed: boolean;
	setOnboardingDismissed: (dismissed: boolean) => void;
	uiScale: UiScale;
	setUiScale: (scale: UiScale) => void;
}

/**
 * @deprecated SSOT Mandate 8s: Canonical UI language is managed in `appStore.ts` via `loadUiPreferences()`,
 * onboarding dismissal is managed in `settingsStore.ts`. This store is preserved for backwards compatibility.
 */
export const useUiStore = create<UiStore>((set) => ({
	uiLanguage: "ru",
	setUiLanguage: (lang) => set({ uiLanguage: lang }),
	onboardingDismissed: false,
	setOnboardingDismissed: (dismissed) =>
		set({ onboardingDismissed: dismissed }),
	uiScale: "standard",
	setUiScale: (scale) => set({ uiScale: scale }),
}));
