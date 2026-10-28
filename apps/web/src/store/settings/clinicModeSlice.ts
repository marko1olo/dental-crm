/**
 * DENTE CRM — Clinic Mode & Onboarding Store Slice
 *
 * Mandate 8n: Solo practitioner & small clinic first.
 * Default is null (waiting for server) or "solo_doctor" (1-2 chairs).
 * "network_clinic" must NEVER be a blind default.
 */

import type { OnboardingStep } from "../../AppConstants.js";
import { defaultUiPreferences, loadUiPreferences } from "../../utils/preferencesUtils.js";
import { resolveUpdater } from "../updater.js";

export type ClinicMode = "solo_doctor" | "one_chair" | "small_clinic" | "network_clinic";

export interface ClinicModeSliceState {
	clinicMode: ClinicMode | null;
	onboardingDismissed: any;
	onboardingDismissedAt: string | null;
	onboardingStep: OnboardingStep;
	onboardingDraftMode: any;
	onboardingGuideExpanded: any;
}

export interface ClinicModeSliceActions {
	setClinicMode: (val: ClinicMode | null | ((prev: ClinicMode | null) => ClinicMode | null)) => void;
	setOnboardingDismissed: (val: any | ((prev: any) => any)) => void;
	setOnboardingDismissedAt: (val: string | null | ((prev: string | null) => string | null)) => void;
	setOnboardingStep: (val: OnboardingStep | ((prev: OnboardingStep) => OnboardingStep)) => void;
	setOnboardingDraftMode: (val: any | ((prev: any) => any)) => void;
	setOnboardingGuideExpanded: (val: any | ((prev: any) => any)) => void;
}

export const initialClinicModeSlice: ClinicModeSliceState = {
	clinicMode: null,
	onboardingDismissed: (loadUiPreferences() ?? defaultUiPreferences).onboardingDismissed,
	onboardingDismissedAt: (loadUiPreferences() ?? defaultUiPreferences).onboardingDismissedAt,
	onboardingStep: (loadUiPreferences() ?? defaultUiPreferences).onboardingStep,
	onboardingDraftMode: (loadUiPreferences() ?? defaultUiPreferences).onboardingDraftMode,
	onboardingGuideExpanded: false,
};

export function createClinicModeSlice(set: any): ClinicModeSliceActions {
	return {
		setClinicMode: (val) => set((s: any) => ({ clinicMode: resolveUpdater(val, s.clinicMode) })),
		setOnboardingDismissed: (val) => set((s: any) => ({ onboardingDismissed: resolveUpdater(val, s.onboardingDismissed) })),
		setOnboardingDismissedAt: (val) => set((s: any) => ({ onboardingDismissedAt: resolveUpdater(val, s.onboardingDismissedAt) })),
		setOnboardingStep: (val) => set((s: any) => ({ onboardingStep: resolveUpdater(val, s.onboardingStep) })),
		setOnboardingDraftMode: (val) => set((s: any) => ({ onboardingDraftMode: resolveUpdater(val, s.onboardingDraftMode) })),
		setOnboardingGuideExpanded: (val) => set((s: any) => ({ onboardingGuideExpanded: resolveUpdater(val, s.onboardingGuideExpanded) })),
	};
}
