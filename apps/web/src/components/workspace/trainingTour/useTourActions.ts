import { useCallback } from "react";
import {
	CLINICAL_QUEST_TRACKS,
	type QuestProgressState,
	type QuestStep,
	type QuestTrackId,
	dismissQuestTourPermanently,
	resetQuestProgress,
	saveQuestProgress,
	skipQuestStep,
	startQuestTrack,
} from "../ClinicalQuestTourEngine";

export interface UseTourActionsParams {
	readonly progress: QuestProgressState;
	readonly setProgress: React.Dispatch<React.SetStateAction<QuestProgressState>>;
	readonly setIsOpen: (open: boolean) => void;
	readonly currentStepIndex: number;
	readonly currentStep: QuestStep;
	readonly setCurrentView: (view: string) => void;
	readonly onComplete?: (() => void) | undefined;
	readonly onClose?: (() => void) | undefined;
}

export function useTourActions({
	progress,
	setProgress,
	setIsOpen,
	currentStepIndex,
	currentStep,
	setCurrentView,
	onComplete,
	onClose,
}: UseTourActionsParams) {
	const handleSkip = useCallback(() => {
		const updated = skipQuestStep(progress);
		setProgress(updated);
		if (!updated.isTourActive) onComplete?.();
	}, [progress, setProgress, onComplete]);

	const handleNeverShowAgain = useCallback(() => {
		const updated = dismissQuestTourPermanently();
		setProgress(updated);
		setIsOpen(false);
		onComplete?.();
		onClose?.();
	}, [setProgress, setIsOpen, onComplete, onClose]);

	const handlePrev = useCallback(() => {
		if (currentStepIndex > 0) {
			const nextState = { ...progress, currentStepIndex: currentStepIndex - 1 };
			saveQuestProgress(nextState);
			setProgress(nextState);
		}
	}, [currentStepIndex, progress, setProgress]);

	const handleTrackChange = useCallback((trackId: QuestTrackId) => {
		const updated = startQuestTrack(trackId);
		setProgress(updated);
		const track = CLINICAL_QUEST_TRACKS.find((t) => t.id === trackId);
		const targetStep = track?.steps[updated.currentStepIndex] || track?.steps[0];
		if (targetStep?.viewTarget) {
			setCurrentView(targetStep.viewTarget);
			window.location.hash = `#${targetStep.viewTarget}`;
		}
	}, [setProgress, setCurrentView]);

	const handleResetTrack = useCallback((trackId: QuestTrackId) => {
		const updated = resetQuestProgress(trackId);
		setProgress(updated);
		const track = CLINICAL_QUEST_TRACKS.find((t) => t.id === trackId);
		const firstStep = track?.steps[0];
		if (firstStep?.viewTarget) {
			setCurrentView(firstStep.viewTarget);
			window.location.hash = `#${firstStep.viewTarget}`;
		}
	}, [setProgress, setCurrentView]);

	const handleFocusTarget = useCallback(() => {
		try {
			const sel = currentStep.targetSelector;
			const fb = currentStep.fallbackTargetSelector;
			const targetEl = document.querySelector<HTMLElement>(sel) || (fb ? document.querySelector<HTMLElement>(fb) : null);
			if (targetEl) {
				targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
				targetEl.focus?.();
			} else if (currentStep.viewTarget) {
				setCurrentView(currentStep.viewTarget);
				window.location.hash = `#${currentStep.viewTarget}`;
			}
		} catch { /* Fallback */ }
	}, [currentStep, setCurrentView]);

	return {
		handleSkip,
		handleNeverShowAgain,
		handlePrev,
		handleTrackChange,
		handleResetTrack,
		handleFocusTarget,
	};
}
