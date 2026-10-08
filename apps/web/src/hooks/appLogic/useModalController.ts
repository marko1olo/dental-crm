import { useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import { useAppStore } from "../../store/appStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useModalOrchestrator } from "../domains/useModalOrchestrator";
import {
	onboardingSteps,
	saveOnboardingDismissed,
	type OnboardingStep,
} from "../../AppHelpers";
import type { AppView } from "../../utils/routeUtils";
import type { ModalControllerSlice } from "./types";

interface UseModalControllerProps {
	dashboard: Dashboard | null;
	currentView: AppView;
	settingsTab: string;
	setCurrentView: (view: AppView) => void;
	setSettingsTab: (tab: string) => void;
	setError: (err: string | null) => void;
	setUiPreferencesSyncError: (err: string | null) => void;
}

export function useModalController({
	dashboard,
	currentView,
	settingsTab,
	setCurrentView,
	setSettingsTab,
	setError: _setError,
	setUiPreferencesSyncError: _setUiPreferencesSyncError,
}: UseModalControllerProps): ModalControllerSlice {
	const {
		accessUnlockRequired,
		setAccessUnlockRequired,
		accessUnlockMessage,
		setAccessUnlockMessage,
	} = useAppStore();

	const {
		clinicalAdminSecretDraft,
		setClinicalAdminSecretDraft,
		settingsAdminSecretDraft,
		setSettingsAdminSecretDraft,
		settingsAdminSecretSession,
		onboardingDismissed,
		setOnboardingDismissed,
		onboardingDismissedAt,
		setOnboardingDismissedAt,
		onboardingStep,
		setOnboardingStep,
		onboardingDraftMode,
		setOnboardingDraftMode,
		onboardingGuideExpanded,
		setOnboardingGuideExpanded,
	} = useSettingsStore();

	const modalOrchestrator = useModalOrchestrator();

	const currentOnboardingIndex = Math.max(
		0,
		onboardingSteps.findIndex((step) => step.id === onboardingStep),
	);

	const previousOnboardingStep =
		currentOnboardingIndex > 0
			? onboardingSteps[currentOnboardingIndex - 1]
			: null;

	const nextOnboardingStep =
		currentOnboardingIndex < onboardingSteps.length - 1
			? onboardingSteps[currentOnboardingIndex + 1]
			: null;

	const showFullOnboardingGuide =
		!onboardingDismissed &&
		currentView === "settings" &&
		settingsTab === "clinic" &&
		onboardingGuideExpanded;

	const onboardingFirstAppointmentIssues: any[] = [];
	const onboardingDocumentReadinessIssues: any[] = [];
	const onboardingBlockingIssues: any[] = [];
	const onboardingTelegramRecommendations: any[] = [];
	const onboardingReadyToFinish = true;
	const onboardingDocumentsReady = true;
	const onboardingStaffCreateGuidanceId = "onboarding-staff-create-guidance";
	const onboardingChairCreateGuidanceId = "onboarding-chair-create-guidance";
	const onboardingFinishGuidanceId = "onboarding-finish-guidance";

	async function dismissOnboarding() {
		const dismissalSavedAt = new Date().toISOString();
		saveOnboardingDismissed(
			true,
			dismissalSavedAt,
			false,
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
		);
		setOnboardingDismissed(true);
		setOnboardingDismissedAt(dismissalSavedAt);
		setOnboardingDraftMode(false);
	}

	async function continueOnboardingInDraftMode(targetView?: AppView) {
		const dismissalSavedAt = new Date().toISOString();
		saveOnboardingDismissed(
			true,
			dismissalSavedAt,
			true,
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
		);
		setOnboardingDismissed(true);
		setOnboardingDismissedAt(dismissalSavedAt);
		setOnboardingDraftMode(true);
		if (targetView && typeof window !== "undefined") {
			window.location.hash = targetView;
		}
	}

	async function moveOnboardingTo(step: OnboardingStep) {
		setOnboardingStep(step);
	}

	function reopenOnboarding() {
		const dismissal = saveOnboardingDismissed(
			false,
			new Date().toISOString(),
			false,
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
		);
		setOnboardingDismissed(false);
		setOnboardingDismissedAt(dismissal.savedAt);
		setOnboardingStep("intro");
		setOnboardingDraftMode(false);
		setOnboardingGuideExpanded(true);
		setCurrentView("settings");
		setSettingsTab("clinic");
		if (typeof window !== "undefined") {
			window.location.hash = "settings/clinic";
		}
	}

	function openOnboardingGuide(step?: OnboardingStep) {
		if (step) setOnboardingStep(step);
		setOnboardingGuideExpanded(true);
		setCurrentView("settings");
		setSettingsTab("clinic");
		if (typeof window !== "undefined") {
			window.location.hash = "settings/clinic";
		}
	}

	return {
		modalOrchestrator,
		accessUnlockRequired,
		setAccessUnlockRequired,
		accessUnlockMessage,
		setAccessUnlockMessage,
		clinicalAdminSecretDraft,
		setClinicalAdminSecretDraft,
		settingsAdminSecretDraft,
		setSettingsAdminSecretDraft,
		settingsAdminSecretSession,
		onboardingDismissed,
		setOnboardingDismissed,
		onboardingDismissedAt,
		setOnboardingDismissedAt,
		onboardingStep,
		setOnboardingStep,
		onboardingDraftMode,
		setOnboardingDraftMode,
		onboardingGuideExpanded,
		setOnboardingGuideExpanded,
		dismissOnboarding,
		continueOnboardingInDraftMode,
		moveOnboardingTo,
		reopenOnboarding,
		openOnboardingGuide,
		showFullOnboardingGuide,
		onboardingFirstAppointmentIssues,
		onboardingDocumentReadinessIssues,
		onboardingBlockingIssues,
		onboardingTelegramRecommendations,
		onboardingReadyToFinish,
		onboardingDocumentsReady,
		onboardingStaffCreateGuidanceId,
		onboardingChairCreateGuidanceId,
		onboardingFinishGuidanceId,
		currentOnboardingIndex,
		previousOnboardingStep,
		nextOnboardingStep,
	};
}
