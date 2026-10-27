import { useCallback, useEffect } from "react";
import { isActionTriggerSatisfied } from "../ClinicalQuestTourEngine";
import type { QuestStep, QuestTrackId } from "../trainingTourModules/trainingTourTypes";

export interface UseTourGlobalEventsParams {
	readonly isOpen: boolean;
	readonly currentStep: QuestStep | null;
	readonly cardRef: React.RefObject<HTMLDivElement | null>;
	readonly onStartTour: (trackId?: QuestTrackId) => void;
	readonly onClose: () => void;
	readonly onStepAccomplished: () => void;
	readonly onBackdropNudge: () => void;
}

export function useTourGlobalEvents({
	isOpen,
	currentStep,
	cardRef,
	onStartTour,
	onClose,
	onStepAccomplished,
	onBackdropNudge,
}: UseTourGlobalEventsParams) {
	useEffect(() => {
		const handleStartTour = (e: Event) => {
			const detail = (e as CustomEvent<{ trackId?: QuestTrackId }>).detail;
			onStartTour(detail?.trackId);
		};
		window.addEventListener("dente:start-doctor-tour", handleStartTour);
		window.addEventListener("dente:close-modals", onClose);
		return () => {
			window.removeEventListener("dente:start-doctor-tour", handleStartTour);
			window.removeEventListener("dente:close-modals", onClose);
		};
	}, [onStartTour, onClose]);

	useEffect(() => {
		if (!isOpen || !currentStep) return;
		const trigger = currentStep.actionTrigger;
		const handleGlobalClick = (e: MouseEvent) => {
			try {
				const sel = currentStep.targetSelector;
				const fb = currentStep.fallbackTargetSelector;
				const targetEl = document.querySelector<HTMLElement>(sel) || (fb ? document.querySelector<HTMLElement>(fb) : null);
				if (targetEl && (targetEl === e.target || targetEl.contains(e.target as Node))) {
					if (isActionTriggerSatisfied(trigger, { type: "click" })) onStepAccomplished();
				}
			} catch { /* Ignore */ }
		};
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				onClose();
				return;
			}
			if (isActionTriggerSatisfied(trigger, { type: "keydown", key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey })) {
				onStepAccomplished();
			}
		};
		const handleCustomQuestEvent = (e: Event) => {
			const custom = e as CustomEvent<{ stepId?: string }>;
			if (custom.detail?.stepId === currentStep.id) onStepAccomplished();
		};
		window.addEventListener("click", handleGlobalClick, true);
		window.addEventListener("keydown", handleGlobalKeyDown, true);
		window.addEventListener("dente:quest-action-completed", handleCustomQuestEvent);
		return () => {
			window.removeEventListener("click", handleGlobalClick, true);
			window.removeEventListener("keydown", handleGlobalKeyDown, true);
			window.removeEventListener("dente:quest-action-completed", handleCustomQuestEvent);
		};
	}, [isOpen, currentStep, onClose, onStepAccomplished]);

	useEffect(() => {
		if (!isOpen) return;
		const handlePointerDown = (e: MouseEvent | TouchEvent) => {
			if (!cardRef.current || cardRef.current.contains(e.target as Node)) return;
			try {
				const sel = currentStep?.targetSelector;
				const fb = currentStep?.fallbackTargetSelector;
				const el = sel ? (document.querySelector<HTMLElement>(sel) || (fb ? document.querySelector<HTMLElement>(fb) : null)) : null;
				if (el && (el === e.target || el.contains(e.target as Node))) return;
			} catch { /* Ignore */ }
			onBackdropNudge();
		};
		const timer = setTimeout(() => {
			document.addEventListener("mousedown", handlePointerDown);
			document.addEventListener("touchstart", handlePointerDown);
		}, 100);
		return () => {
			clearTimeout(timer);
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("touchstart", handlePointerDown);
		};
	}, [isOpen, currentStep, cardRef, onBackdropNudge]);
}
