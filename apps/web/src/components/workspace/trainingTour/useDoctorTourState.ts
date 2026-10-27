import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "../../../store/appStore";
import {
	CLINICAL_QUEST_TRACKS,
	type QuestProgressState,
	type QuestStep,
	type QuestTrack,
	advanceQuestStep,
	getNextTrackId,
	loadQuestProgress,
	saveQuestProgress,
	startQuestTrack,
} from "../ClinicalQuestTourEngine";
import { computeCardPosition } from "./tourCardPosition";
import { useTargetMeasurement } from "./useTargetMeasurement";
import { useTourGlobalEvents } from "./useTourGlobalEvents";
import { useTourActions } from "./useTourActions";

export interface UseDoctorTourStateParams {
	readonly forceOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onComplete?: (() => void) | undefined;
}

export function useDoctorTourState({ forceOpen, onClose, onComplete }: UseDoctorTourStateParams) {
	const [progress, setProgress] = useState<QuestProgressState>(() => loadQuestProgress());
	const [isOpen, setIsOpen] = useState<boolean>(() => (typeof forceOpen === "boolean" ? forceOpen : false));
	const [isActionSuccessFlash, setIsActionSuccessFlash] = useState<boolean>(false);
	const [isActionNudge, setIsActionNudge] = useState<boolean>(false);
	const cardRef = useRef<HTMLDivElement | null>(null);
	const setCurrentView = useAppStore((s) => s.setCurrentView);

	const activeTrack: QuestTrack =
		CLINICAL_QUEST_TRACKS.find((t) => t.id === progress.activeTrackId) || CLINICAL_QUEST_TRACKS[0]!;
	const currentStepIndex = Math.min(progress.currentStepIndex, activeTrack.steps.length - 1);
	const currentStep: QuestStep = activeTrack.steps[currentStepIndex] || activeTrack.steps[0]!;

	const handleClose = useCallback(() => {
		const updated: QuestProgressState = { ...progress, isTourActive: false };
		saveQuestProgress(updated);
		setProgress(updated);
		setIsOpen(false);
		onClose?.();
	}, [progress, onClose]);

	useEffect(() => {
		if (typeof forceOpen === "boolean") setIsOpen(forceOpen);
	}, [forceOpen]);

	const { targetRect } = useTargetMeasurement(isOpen, currentStep, setCurrentView);

	const handleStepAccomplished = useCallback(() => {
		setIsActionSuccessFlash(true);
		setTimeout(() => {
			setIsActionSuccessFlash(false);
			const updated = advanceQuestStep(progress);
			setProgress(updated);
			if (!updated.isTourActive) onComplete?.();
		}, 450);
	}, [progress, onComplete]);

	const handleBackdropNudge = useCallback(() => {
		setIsActionNudge(true);
		setTimeout(() => setIsActionNudge(false), 600);
	}, []);

	useTourGlobalEvents({
		isOpen,
		currentStep,
		cardRef,
		onStartTour: (trackId) => {
			const updated = startQuestTrack(trackId || "solo_doctor");
			setProgress(updated);
			setIsOpen(true);
		},
		onClose: handleClose,
		onStepAccomplished: handleStepAccomplished,
		onBackdropNudge: handleBackdropNudge,
	});

	const actions = useTourActions({
		progress,
		setProgress,
		setIsOpen,
		currentStepIndex,
		currentStep,
		setCurrentView,
		onComplete,
		onClose,
	});

	const cardPositionStyle = computeCardPosition(targetRect);
	const progressPercentage = Math.round(((currentStepIndex + 1) / activeTrack.steps.length) * 100);
	const isTrackCompleted = Boolean(progress.tracksProgress[activeTrack.id]?.completed && !progress.isTourActive);
	const nextTrackId = getNextTrackId(activeTrack.id);
	const nextTrack = nextTrackId ? CLINICAL_QUEST_TRACKS.find((t) => t.id === nextTrackId) : null;

	return {
		cardRef,
		isOpen,
		progress,
		activeTrack,
		currentStep,
		currentStepIndex,
		targetRect,
		isActionSuccessFlash,
		isActionNudge,
		cardPositionStyle,
		progressPercentage,
		isTrackCompleted,
		nextTrack,
		handleClose,
		handleStepAccomplished,
		handleBackdropNudge,
		...actions,
	};
}
