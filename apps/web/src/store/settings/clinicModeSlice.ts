/**
 * DENTE CRM — Clinic Mode & Onboarding Store Slice
 *
 * Mandate 8n: Solo practitioner & small clinic first.
 * Default is null (waiting for server) or "solo_doctor" (1-2 chairs).
 * "network_clinic" must NEVER be a blind default.
 */

import type { OnboardingStep } from "../../AppConstants.js";
import { defaultUiPreferences, loadUiPreferences } from "../../utils/preferencesUtils.js";
import { resolveUpdater, type Updater } from "../updater.js";

export type ClinicMode = "solo_doctor" | "one_chair" | "small_clinic" | "network_clinic";

export interface ClinicModeSliceState {
	clinicMode: ClinicMode | null;
	onboardingDismissed: boolean;
	onboardingDismissedAt: string | null;
	onboardingStep: OnboardingStep;
	onboardingDraftMode: boolean;
	onboardingGuideExpanded: boolean;
}

export interface ClinicModeSliceActions {
	setClinicMode: (val: Updater<ClinicMode | null>) => void;
	setOnboardingDismissed: (val: Updater<boolean>) => void;
	setOnboardingDismissedAt: (val: Updater<string | null>) => void;
	setOnboardingStep: (val: Updater<OnboardingStep>) => void;
	setOnboardingDraftMode: (val: Updater<boolean>) => void;
	setOnboardingGuideExpanded: (val: Updater<boolean>) => void;
}

export const initialClinicModeSlice: ClinicModeSliceState = {
	clinicMode: null,
	onboardingDismissed: (loadUiPreferences() ?? defaultUiPreferences).onboardingDismissed,
	onboardingDismissedAt: (loadUiPreferences() ?? defaultUiPreferences).onboardingDismissedAt,
	onboardingStep: (loadUiPreferences() ?? defaultUiPreferences).onboardingStep,
	onboardingDraftMode: (loadUiPreferences() ?? defaultUiPreferences).onboardingDraftMode,
	onboardingGuideExpanded: false,
};

export function createClinicModeSlice(
	set: (fn: (s: ClinicModeSliceState) => Partial<ClinicModeSliceState>) => void,
): ClinicModeSliceActions {
	return {
		setClinicMode: (val) => set((s) => ({ clinicMode: resolveUpdater(val, s.clinicMode) })),
		setOnboardingDismissed: (val) => set((s) => ({ onboardingDismissed: resolveUpdater(val, s.onboardingDismissed) })),
		setOnboardingDismissedAt: (val) => set((s) => ({ onboardingDismissedAt: resolveUpdater(val, s.onboardingDismissedAt) })),
		setOnboardingStep: (val) => set((s) => ({ onboardingStep: resolveUpdater(val, s.onboardingStep) })),
		setOnboardingDraftMode: (val) => set((s) => ({ onboardingDraftMode: resolveUpdater(val, s.onboardingDraftMode) })),
		setOnboardingGuideExpanded: (val) => set((s) => ({ onboardingGuideExpanded: resolveUpdater(val, s.onboardingGuideExpanded) })),
	};
}
