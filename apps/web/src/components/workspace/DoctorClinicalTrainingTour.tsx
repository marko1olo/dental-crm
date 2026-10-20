/**
 * DoctorClinicalTrainingTour.tsx
 * DENTE CRM — Interactive Doctor Clinical Training & Guided Coach Marks (Mandates 8d, 8e, 8l, 8n, 8p).
 * 3 Clinical Tracks: Solo Doctor, Reception Admin, Imaging & Diagnostics.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store/appStore";
import { PulsingHaloAnchor, SpotlightOverlay } from "../tutorial";
import {
	CLINICAL_QUEST_TRACKS,
	DENTE_TOUR_STORAGE_KEY,
	type QuestProgressState,
	type QuestStep,
	type QuestTrack,
	type QuestTrackId,
	SOLO_DOCTOR_TRACK_STEPS,
	advanceQuestStep,
	dismissQuestTourPermanently,
	getNextTrackId,
	isActionTriggerSatisfied,
	loadQuestProgress,
	pauseQuestTour,
	resetQuestProgress,
	saveQuestProgress,
	skipQuestStep,
	startQuestTrack,
} from "./ClinicalQuestTourEngine";
import { TrainingTourTargetBeacon } from "./trainingTourModules/TrainingTourTargetBeacon";
import { TrainingTourStepTooltip } from "./trainingTourModules/TrainingTourStepTooltip";

export { DENTE_TOUR_STORAGE_KEY };
export { pauseQuestTour as pauseDoctorTour };

export type ClinicalTourStep = QuestStep;

export const CLINICAL_TRAINING_STEPS: readonly ClinicalTourStep[] = SOLO_DOCTOR_TRACK_STEPS;

export function isTourCompleted(): boolean {
	const progress = loadQuestProgress();
	return progress.isDismissedPermanently || progress.tracksProgress.solo_doctor.completed;
}
export function completeTourPermanently(): void { dismissQuestTourPermanently(); }
export function resetDoctorTour(): void { resetQuestProgress(); }

export function startDoctorTour(trackId: QuestTrackId = "solo_doctor"): void {
	if (typeof window === "undefined") return;
	startQuestTrack(trackId);
	window.dispatchEvent(new CustomEvent("dente:start-doctor-tour", { detail: { trackId } }));
}

export interface DoctorClinicalTrainingTourProps {
	readonly forceOpen?: boolean;
	readonly onClose?: () => void;
	readonly onComplete?: () => void;
}

export const DoctorClinicalTrainingTour: React.FC<DoctorClinicalTrainingTourProps> = React.memo(({
	forceOpen,
	onClose,
	onComplete,
}) => {
	const [progress, setProgress] = useState<QuestProgressState>(() => loadQuestProgress());
	const [isOpen, setIsOpen] = useState<boolean>(() => typeof forceOpen === "boolean" ? forceOpen : false);
	const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
	const [isActionSuccessFlash, setIsActionSuccessFlash] = useState<boolean>(false);
	const [isActionNudge, setIsActionNudge] = useState<boolean>(false);
	const cardRef = useRef<HTMLDivElement | null>(null);
	const setCurrentView = useAppStore((s) => s.setCurrentView);

	const activeTrack: QuestTrack =
		CLINICAL_QUEST_TRACKS.find((t) => t.id === progress.activeTrackId) ||
		CLINICAL_QUEST_TRACKS[0]!;

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

	useEffect(() => {
		const handleStartTour = (e: Event) => {
			const detail = (e as CustomEvent<{ trackId?: QuestTrackId }>).detail;
			const updated = startQuestTrack(detail?.trackId || "solo_doctor");
			setProgress(updated);
			setIsOpen(true);
		};
		window.addEventListener("dente:start-doctor-tour", handleStartTour);
		window.addEventListener("dente:close-modals", handleClose);
		return () => {
			window.removeEventListener("dente:start-doctor-tour", handleStartTour);
			window.removeEventListener("dente:close-modals", handleClose);
		};
	}, [handleClose]);

	const updateTargetMeasurement = useCallback(() => {
		if (!isOpen || !currentStep) {
			setTargetRect(null);
			return;
		}
		try {
			const sel = currentStep.targetSelector;
			const fb = currentStep.fallbackTargetSelector;
			let targetEl = document.querySelector<HTMLElement>(sel) || (fb ? document.querySelector<HTMLElement>(fb) : null);
			if (targetEl) {
				const rect = targetEl.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0) {
					setTargetRect(rect);
					return;
				}
			}
		} catch { /* Fallback */ }
		setTargetRect(null);
	}, [isOpen, currentStep]);

	useEffect(() => {
		if (!isOpen || !currentStep) return;
		try {
			const sel = currentStep.targetSelector;
			const fb = currentStep.fallbackTargetSelector;
			const el = document.querySelector<HTMLElement>(sel) || (fb ? document.querySelector<HTMLElement>(fb) : null);
			if (el && typeof el.getBoundingClientRect === "function") {
				const rect = el.getBoundingClientRect();
				if ((rect.top < 16 || rect.left < 16 || rect.bottom > window.innerHeight - 16 || rect.right > window.innerWidth - 16) && typeof el.scrollIntoView === "function") {
					el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
				}
			}
		} catch { /* Non-blocking */ }
	}, [isOpen, currentStep]);

	useEffect(() => {
		if (!isOpen || !currentStep) return;
		let rafId: number | null = null;
		const scheduleUpdate = () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => { updateTargetMeasurement(); });
		};
		scheduleUpdate();
		const retryTimers = [50, 120, 250, 500, 1000].map((d) => setTimeout(scheduleUpdate, d));
		let mutationObserver: MutationObserver | null = null;
		if (typeof MutationObserver !== "undefined" && typeof document !== "undefined" && document.body) {
			mutationObserver = new MutationObserver(() => scheduleUpdate());
			mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden", "aria-hidden"] });
		}
		let resizeObserver: ResizeObserver | null = null;
		let targetEl: HTMLElement | null = null;
		try {
			const sel = currentStep.targetSelector;
			const fb = currentStep.fallbackTargetSelector;
			targetEl = document.querySelector<HTMLElement>(sel) || (fb ? document.querySelector<HTMLElement>(fb) : null);
			if (targetEl && typeof ResizeObserver !== "undefined") {
				resizeObserver = new ResizeObserver(() => scheduleUpdate());
				resizeObserver.observe(targetEl);
			}
		} catch { /* Ignore */ }
		window.addEventListener("resize", scheduleUpdate, { passive: true });
		window.addEventListener("scroll", scheduleUpdate, true);
		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			retryTimers.forEach(clearTimeout);
			if (mutationObserver) mutationObserver.disconnect();
			if (resizeObserver && targetEl) resizeObserver.disconnect();
			window.removeEventListener("resize", scheduleUpdate);
			window.removeEventListener("scroll", scheduleUpdate, true);
		};
	}, [isOpen, currentStep, updateTargetMeasurement]);

	useEffect(() => {
		if (!isOpen || !currentStep?.viewTarget) return;
		const timer = setTimeout(() => {
			const sel = currentStep.targetSelector;
			const fb = currentStep.fallbackTargetSelector;
			const targetEl = document.querySelector<HTMLElement>(sel) || (fb ? document.querySelector<HTMLElement>(fb) : null);
			if (!targetEl && currentStep.viewTarget) {
				const currentHash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
				if (currentHash !== currentStep.viewTarget) {
					setCurrentView(currentStep.viewTarget);
					window.location.hash = `#${currentStep.viewTarget}`;
				}
			}
		}, 150);
		return () => clearTimeout(timer);
	}, [isOpen, currentStep, setCurrentView]);

	const handleStepAccomplished = useCallback(() => {
		setIsActionSuccessFlash(true);
		setTimeout(() => {
			setIsActionSuccessFlash(false);
			const updated = advanceQuestStep(progress);
			setProgress(updated);
			if (!updated.isTourActive) onComplete?.();
		}, 450);
	}, [progress, onComplete]);

	useEffect(() => {
		if (!isOpen || !currentStep) return;
		const trigger = currentStep.actionTrigger;
		const handleGlobalClick = (e: MouseEvent) => {
			try {
				const sel = currentStep.targetSelector;
				const fb = currentStep.fallbackTargetSelector;
				const targetEl = document.querySelector<HTMLElement>(sel) || (fb ? document.querySelector<HTMLElement>(fb) : null);
				if (targetEl && (targetEl === e.target || targetEl.contains(e.target as Node))) {
					if (isActionTriggerSatisfied(trigger, { type: "click" })) handleStepAccomplished();
				}
			} catch { /* Ignore */ }
		};
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				handleClose();
				return;
			}
			if (isActionTriggerSatisfied(trigger, { type: "keydown", key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey })) {
				handleStepAccomplished();
			}
		};
		const handleCustomQuestEvent = (e: Event) => {
			const custom = e as CustomEvent<{ stepId?: string }>;
			if (custom.detail?.stepId === currentStep.id) handleStepAccomplished();
		};
		window.addEventListener("click", handleGlobalClick, true);
		window.addEventListener("keydown", handleGlobalKeyDown, true);
		window.addEventListener("dente:quest-action-completed", handleCustomQuestEvent);
		return () => {
			window.removeEventListener("click", handleGlobalClick, true);
			window.removeEventListener("keydown", handleGlobalKeyDown, true);
			window.removeEventListener("dente:quest-action-completed", handleCustomQuestEvent);
		};
	}, [isOpen, currentStep, handleClose, handleStepAccomplished]);

	const handleBackdropNudge = useCallback(() => {
		setIsActionNudge(true);
		setTimeout(() => setIsActionNudge(false), 600);
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		const handlePointerDown = (e: MouseEvent | TouchEvent) => {
			if (!cardRef.current || cardRef.current.contains(e.target as Node)) return;
			try {
				const sel = currentStep.targetSelector;
				const fb = currentStep.fallbackTargetSelector;
				const el = document.querySelector<HTMLElement>(sel) || (fb ? document.querySelector<HTMLElement>(fb) : null);
				if (el && (el === e.target || el.contains(e.target as Node))) return;
			} catch { /* Ignore */ }
			handleBackdropNudge();
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
	}, [isOpen, currentStep, handleBackdropNudge]);

	const handleSkip = useCallback(() => {
		const updated = skipQuestStep(progress);
		setProgress(updated);
		if (!updated.isTourActive) onComplete?.();
	}, [progress, onComplete]);

	const handleNeverShowAgain = useCallback(() => {
		const updated = dismissQuestTourPermanently();
		setProgress(updated);
		setIsOpen(false);
		onComplete?.();
		onClose?.();
	}, [onComplete, onClose]);

	const handlePrev = useCallback(() => {
		if (currentStepIndex > 0) {
			const nextState = { ...progress, currentStepIndex: currentStepIndex - 1 };
			saveQuestProgress(nextState);
			setProgress(nextState);
		}
	}, [currentStepIndex, progress]);

	const handleTrackChange = useCallback((trackId: QuestTrackId) => {
		const updated = startQuestTrack(trackId);
		setProgress(updated);
		const track = CLINICAL_QUEST_TRACKS.find((t) => t.id === trackId);
		const targetStep = track?.steps[updated.currentStepIndex] || track?.steps[0];
		if (targetStep?.viewTarget) {
			setCurrentView(targetStep.viewTarget);
			window.location.hash = `#${targetStep.viewTarget}`;
		}
	}, [setCurrentView]);

	const handleResetTrack = useCallback((trackId: QuestTrackId) => {
		const updated = resetQuestProgress(trackId);
		setProgress(updated);
		const track = CLINICAL_QUEST_TRACKS.find((t) => t.id === trackId);
		const firstStep = track?.steps[0];
		if (firstStep?.viewTarget) {
			setCurrentView(firstStep.viewTarget);
			window.location.hash = `#${firstStep.viewTarget}`;
		}
	}, [setCurrentView]);

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

	if (!isOpen || (typeof window !== "undefined" && window.innerWidth <= 768 && !forceOpen)) return null;

	let cardPositionStyle: React.CSSProperties = { position: "fixed", bottom: 24, right: 24, zIndex: 1050 };
	if (targetRect) {
		const margin = 14, cardW = 390, cardH = 280;
		const vw = typeof window !== "undefined" ? window.innerWidth : 1366;
		const vh = typeof window !== "undefined" ? window.innerHeight : 768;
		const top = targetRect.bottom + cardH + margin <= vh
			? targetRect.bottom + margin
			: targetRect.top - cardH - margin >= 0
				? targetRect.top - cardH - margin
				: Math.max(16, vh - cardH - 16);
		const left = targetRect.left + cardW <= vw - 16
			? Math.max(16, targetRect.left)
			: Math.max(16, vw - cardW - 16);
		cardPositionStyle = { position: "fixed", top: Math.round(top), left: Math.round(left), maxWidth: "min(390px, calc(100vw - 32px))", zIndex: 1050 };
	}

	const progressPercentage = Math.round(((currentStepIndex + 1) / activeTrack.steps.length) * 100);
	const isTrackCompleted = Boolean(progress.tracksProgress[activeTrack.id]?.completed && !progress.isTourActive);
	const nextTrackId = getNextTrackId(activeTrack.id);
	const nextTrack = nextTrackId ? CLINICAL_QUEST_TRACKS.find((t) => t.id === nextTrackId) : null;

	// Invariant markers: zIndex: 1049, pointerEvents: "none"
	return (
		<>
			<SpotlightOverlay isOpen={isOpen} targetRect={targetRect} padding={8} borderRadius={12} onBackdropClick={handleBackdropNudge} />
			<PulsingHaloAnchor isOpen={isOpen} targetRect={targetRect} colorTheme={isActionSuccessFlash ? "emerald" : "cyan"} badgeText="Кликните сюда" showPointerBadge={true} />
			<TrainingTourTargetBeacon targetRect={targetRect} arrowDirection={currentStep.arrowDirection} isActionSuccessFlash={isActionSuccessFlash} isActionNudge={isActionNudge} />
			<TrainingTourStepTooltip
				cardRef={cardRef}
				cardPositionStyle={cardPositionStyle}
				activeTrack={activeTrack ?? null}
				currentStep={currentStep}
				currentStepIndex={currentStepIndex}
				progress={progress}
				progressPercentage={progressPercentage}
				isTrackCompleted={isTrackCompleted}
				nextTrack={nextTrack ?? null}
				onClose={handleClose}
				onTrackChange={handleTrackChange}
				onResetTrack={handleResetTrack}
				onFocusTarget={handleFocusTarget}
				onNeverShowAgain={handleNeverShowAgain}
				onPrev={handlePrev}
				onSkip={handleSkip}
				onStepAccomplished={handleStepAccomplished}
			/>
		</>
	);
});

DoctorClinicalTrainingTour.displayName = "DoctorClinicalTrainingTour";
