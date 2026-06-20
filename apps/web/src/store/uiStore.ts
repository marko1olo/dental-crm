import { create } from "zustand";

export type UiLanguage = "ru" | "en";

interface UiStore {
  uiLanguage: UiLanguage;
  setUiLanguage: (lang: UiLanguage) => void;
  onboardingDismissed: boolean;
  setOnboardingDismissed: (dismissed: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  uiLanguage: "ru",
  setUiLanguage: (lang) => set({ uiLanguage: lang }),
  onboardingDismissed: false,
  setOnboardingDismissed: (dismissed) => set({ onboardingDismissed: dismissed }),
}));
