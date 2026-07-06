import { useState, useCallback, useMemo } from "react";
import { type UiPreferences } from "@dental/shared";

export function useAuthLogic(options: {
  persistUiPreferences: (prefs: UiPreferences) => void;
  currentUiPreferencesInput: () => Omit<UiPreferences, "version" | "savedAt" | "onboardingDismissed" | "onboardingDismissedAt" | "onboardingDraftMode">;
  uiPreferencesServerReadyRef: React.MutableRefObject<boolean>;
  saveServerUiPreferences: (prefs: UiPreferences, secret: string) => Promise<void>;
  settingsAdminSecretSession: string;
}) {
  const [isOnboardingDismissed, setOnboardingDismissed] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(true);

  // Clinical secrets
  const [clinicalAdminSecretDraft, setClinicalAdminSecretDraft] = useState("");
  const [settingsAdminSecretDraft, setSettingsAdminSecretDraft] = useState("");
  const [scheduleAdminSecretDraft, setScheduleAdminSecretDraft] = useState("");
  const [telegramAdminSecretDraft, setTelegramAdminSecretDraft] = useState("");

  const [clinicalAdminSecretSession, setClinicalAdminSecretSession] = useState("");
  const [settingsAdminSecretSession, setSettingsAdminSecretSession] = useState("");
  const [scheduleAdminSecretSession, setScheduleAdminSecretSession] = useState("");
  const [telegramAdminSecretSession, setTelegramAdminSecretSession] = useState("");

  const [accessUnlockRequired, setAccessUnlockRequired] = useState(false);
  const [accessUnlockMessage, setAccessUnlockMessage] = useState("");

  const handleSelectDemoMode = useCallback(async () => {
    try {
      const dismissalSavedAt = new Date().toISOString();
      const savedPreferences: UiPreferences = {
        version: 1,
        ...options.currentUiPreferencesInput(),
        onboardingDismissed: true,
        onboardingDismissedAt: dismissalSavedAt,
        onboardingDraftMode: false,
        savedAt: dismissalSavedAt
      };
      
      if (options.uiPreferencesServerReadyRef.current) {
        try {
          await options.saveServerUiPreferences(savedPreferences, options.settingsAdminSecretSession);
        } catch (e) {
          console.warn("Preferences server sync failed", e);
        }
      }
      options.persistUiPreferences(savedPreferences);
      setOnboardingDismissed(true);
      setIsOnboarding(false);
    } catch (error) {
      console.error(error);
    }
  }, [options]);

  const unlockTelegramAdminSession = useCallback((domain: string) => {
    if (domain === "all" || domain === "clinical") setClinicalAdminSecretSession(clinicalAdminSecretDraft.trim());
    if (domain === "all" || domain === "settings") setSettingsAdminSecretSession(settingsAdminSecretDraft.trim());
    if (domain === "all" || domain === "schedule") setScheduleAdminSecretSession(scheduleAdminSecretDraft.trim());
    if (domain === "all" || domain === "telegram") setTelegramAdminSecretSession(telegramAdminSecretDraft.trim());
    setAccessUnlockRequired(false);
  }, [clinicalAdminSecretDraft, settingsAdminSecretDraft, scheduleAdminSecretDraft, telegramAdminSecretDraft]);

  return {
    isOnboardingDismissed, setOnboardingDismissed,
    isOnboarding, setIsOnboarding,
    handleSelectDemoMode,

    clinicalAdminSecretDraft, setClinicalAdminSecretDraft,
    settingsAdminSecretDraft, setSettingsAdminSecretDraft,
    scheduleAdminSecretDraft, setScheduleAdminSecretDraft,
    telegramAdminSecretDraft, setTelegramAdminSecretDraft,

    clinicalAdminSecretSession, setClinicalAdminSecretSession,
    settingsAdminSecretSession, setSettingsAdminSecretSession,
    scheduleAdminSecretSession, setScheduleAdminSecretSession,
    telegramAdminSecretSession, setTelegramAdminSecretSession,

    accessUnlockRequired, setAccessUnlockRequired,
    accessUnlockMessage, setAccessUnlockMessage,
    unlockTelegramAdminSession
  };
}
