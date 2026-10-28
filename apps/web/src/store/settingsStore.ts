/**
 * DENTE CRM — Settings Store (Facade)
 *
 * Decomposed under Mandate 8b into modular slices (<= 120 lines):
 * - clinicModeSlice: clinic mode, onboarding state (Mandate 8n solo doctor first)
 * - telegramSettingsSlice & telegramSettingsTypes: Telegram bot & outbox
 * - staffPinSlice: administrative secrets & PIN demand
 * - uiPreferencesSlice: CBCT and UI preferences
 */

export * from "./settings/index.js";
