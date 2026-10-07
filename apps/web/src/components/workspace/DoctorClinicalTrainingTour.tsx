/**
 * DoctorClinicalTrainingTour.tsx
 * DENTE CRM — Interactive Doctor Clinical Training & Guided Coach Marks (Mandates 8d, 8e, 8l, 8n, 8p).
 * 3 Clinical Tracks: Solo Doctor, Reception Admin, Imaging & Diagnostics.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Award,
	CheckCircle2, ChevronLeft, ChevronRight, Crosshair, X, Zap,
} from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { PulsingHaloAnchor, SpotlightOverlay } from "../tutorial";
import {
	CLINICAL_QUEST_TRACKS, DENTE_TOUR_STORAGE_KEY,
	type QuestArrowDirection, type QuestProgressState,
	type QuestStep, type QuestTrack, type QuestTrackId,
	SOLO_DOCTOR_TRACK_STEPS, advanceQuestStep, dismissQuestTourPermanently,
	getNextTrackId, isActionTriggerSatisfied, loadQuestProgress,
	pauseQuestTour, resetQuestProgress, saveQuestProgress,
	skipQuestStep, startQuestTrack,
} from "./ClinicalQuestTourEngine";

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
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof forceOpen === "boolean") return forceOpen;
		return false;
	});

	const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
	const [isActionSuccessFlash, setIsActionSuccessFlash] = useState<boolean>(false);
	const [isActionNudge, setIsActionNudge] = useState<boolean>(false);
	const cardRef = useRef<HTMLDivElement | null>(null);

	const setCurrentView = useAppStore((s) => s.setCurrentView);

	// Get active track and active step
	const activeTrack: QuestTrack =
		CLINICAL_QUEST_TRACKS.find((t) => t.id === progress.activeTrackId) ||
		CLINICAL_QUEST_TRACKS[0]!;

	const currentStepIndex = Math.min(progress.currentStepIndex, activeTrack.steps.length - 1);
	const currentStep: QuestStep = activeTrack.steps[currentStepIndex] || activeTrack.steps[0]!;

	// Controlled close with progress preservation
	const handleClose = useCallback(() => {
		const updated: QuestProgressState = {
			...progress,
			isTourActive: false,
		};
		saveQuestProgress(updated);
		setProgress(updated);
		setIsOpen(false);
		onClose?.();
	}, [progress, onClose]);

	// Sync controlled forceOpen prop
	useEffect(() => {
		if (typeof forceOpen === "boolean") {
			setIsOpen(forceOpen);
		}
	}, [forceOpen]);

	// Listen for global custom events to launch or dismiss tour anytime
	useEffect(() => {
		const handleStartTour = (e: Event) => {
			const detail = (e as CustomEvent<{ trackId?: QuestTrackId }>).detail;
			const targetTrack = detail?.trackId || "solo_doctor";
			const updated = startQuestTrack(targetTrack);
			setProgress(updated);
			setIsOpen(true);
		};

		const handleCloseModals = () => {
			handleClose();
		};

		window.addEventListener("dente:start-doctor-tour", handleStartTour);
		window.addEventListener("dente:close-modals", handleCloseModals);
		return () => {
			window.removeEventListener("dente:start-doctor-tour", handleStartTour);
			window.removeEventListener("dente:close-modals", handleCloseModals);
		};
	}, [handleClose]);

	// Locate and measure active target element in the DOM
	const updateTargetMeasurement = useCallback(() => {
		if (!isOpen || !currentStep) {
			setTargetRect(null);
			return;
		}

		try {
			let targetEl = document.querySelector<HTMLElement>(currentStep.targetSelector);
			if (!targetEl && currentStep.fallbackTargetSelector) {
				targetEl = document.querySelector<HTMLElement>(currentStep.fallbackTargetSelector);
			}

			if (targetEl) {
				const rect = targetEl.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0) {
					setTargetRect(rect);
					return;
				}
			}
		} catch {
			// Fallback to non-anchored floating dock
		}
		setTargetRect(null);
	}, [isOpen, currentStep]);

	// Auto-scroll target into view if partially off-screen
	useEffect(() => {
		if (!isOpen || !currentStep) return;

		try {
			let targetEl = document.querySelector<HTMLElement>(currentStep.targetSelector);
			if (!targetEl && currentStep.fallbackTargetSelector) {
				targetEl = document.querySelector<HTMLElement>(currentStep.fallbackTargetSelector);
			}

			if (targetEl && typeof targetEl.getBoundingClientRect === "function") {
				const rect = targetEl.getBoundingClientRect();
				const isPartiallyOffscreen =
					rect.top < 16 ||
					rect.left < 16 ||
					rect.bottom > window.innerHeight - 16 ||
					rect.right > window.innerWidth - 16;

				if (isPartiallyOffscreen && typeof targetEl.scrollIntoView === "function") {
					targetEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
				}
			}
		} catch {
			// Non-blocking fallback
		}
	}, [isOpen, currentStep]);

	// Robust target measurement with MutationObserver, ResizeObserver and staggered retries
	useEffect(() => {
		if (!isOpen || !currentStep) return;

		let rafId: number | null = null;
		const scheduleUpdate = () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				updateTargetMeasurement();
			});
		};

		scheduleUpdate();

		// Staggered retries for async mounted elements
		const retryDelays = [50, 120, 250, 500, 1000];
		const retryTimers = retryDelays.map((delay) => setTimeout(scheduleUpdate, delay));

		// MutationObserver to detect when target element mounts into DOM
		let mutationObserver: MutationObserver | null = null;
		if (typeof MutationObserver !== "undefined" && typeof document !== "undefined" && document.body) {
			mutationObserver = new MutationObserver(() => {
				scheduleUpdate();
			});
			mutationObserver.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["class", "style", "hidden", "aria-hidden"],
			});
		}

		// ResizeObserver to track size/position changes of target element
		let resizeObserver: ResizeObserver | null = null;
		let targetEl: HTMLElement | null = null;
		try {
			targetEl =
				document.querySelector<HTMLElement>(currentStep.targetSelector) ||
				(currentStep.fallbackTargetSelector
					? document.querySelector<HTMLElement>(currentStep.fallbackTargetSelector)
					: null);
			if (targetEl && typeof ResizeObserver !== "undefined") {
				resizeObserver = new ResizeObserver(() => {
					scheduleUpdate();
				});
				resizeObserver.observe(targetEl);
			}
		} catch {
			// Ignore observer errors
		}

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

	// Auto-navigate to step viewTarget if element is not in DOM after brief grace period
	useEffect(() => {
		if (!isOpen || !currentStep?.viewTarget) return;

		const timer = setTimeout(() => {
			let targetEl = document.querySelector<HTMLElement>(currentStep.targetSelector);
			if (!targetEl && currentStep.fallbackTargetSelector) {
				targetEl = document.querySelector<HTMLElement>(currentStep.fallbackTargetSelector);
			}
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

	// Reactive Action Tracker: listen for real user actions (clicks and keyboard hotkeys)
	useEffect(() => {
		if (!isOpen || !currentStep) return;

		const trigger = currentStep.actionTrigger;

		const handleGlobalClick = (e: MouseEvent) => {
			try {
				let targetEl = document.querySelector<HTMLElement>(currentStep.targetSelector);
				if (!targetEl && currentStep.fallbackTargetSelector) {
					targetEl = document.querySelector<HTMLElement>(currentStep.fallbackTargetSelector);
				}

				if (targetEl && (targetEl === e.target || targetEl.contains(e.target as Node))) {
					if (isActionTriggerSatisfied(trigger, { type: "click" })) {
						handleStepAccomplished();
					}
				}
			} catch {
				// Ignore
			}
		};

		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				handleClose();
				return;
			}

			if (
				isActionTriggerSatisfied(trigger, {
					type: "keydown",
					key: e.key,
					ctrlKey: e.ctrlKey,
					metaKey: e.metaKey,
					shiftKey: e.shiftKey,
				})
			) {
				handleStepAccomplished();
			}
		};

		const handleCustomQuestEvent = (e: Event) => {
			const custom = e as CustomEvent<{ stepId?: string }>;
			if (custom.detail?.stepId === currentStep.id) {
				handleStepAccomplished();
			}
		};

		window.addEventListener("click", handleGlobalClick, true);
		window.addEventListener("keydown", handleGlobalKeyDown, true);
		window.addEventListener("dente:quest-action-completed", handleCustomQuestEvent);

		return () => {
			window.removeEventListener("click", handleGlobalClick, true);
			window.removeEventListener("keydown", handleGlobalKeyDown, true);
			window.removeEventListener("dente:quest-action-completed", handleCustomQuestEvent);
		};
	}, [isOpen, currentStep]);

	const handleBackdropNudge = useCallback(() => {
		setIsActionNudge(true);
		setTimeout(() => setIsActionNudge(false), 600);
	}, []);

	// Handle outside click/pointerdown: gentle beacon nudge instead of abrupt dismiss
	useEffect(() => {
		if (!isOpen) return;

		const handlePointerDown = (e: MouseEvent | TouchEvent) => {
			if (!cardRef.current) return;
			// Ignore clicks inside the coach mark card
			if (cardRef.current.contains(e.target as Node)) return;

			// Do NOT dismiss if clicking the target element or its children (Mandate 8e: Doctor Autonomy)
			try {
				let targetEl = document.querySelector<HTMLElement>(currentStep.targetSelector);
				if (!targetEl && currentStep.fallbackTargetSelector) {
					targetEl = document.querySelector<HTMLElement>(currentStep.fallbackTargetSelector);
				}
				if (targetEl && (targetEl === e.target || targetEl.contains(e.target as Node))) {
					return;
				}
			} catch {
				// Ignore
			}

			// Nudge target beacon on accidental outside misclick instead of destroying tour
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

	const handleStepAccomplished = () => {
		setIsActionSuccessFlash(true);
		setTimeout(() => {
			setIsActionSuccessFlash(false);
			const updated = advanceQuestStep(progress);
			setProgress(updated);
			if (!updated.isTourActive) onComplete?.();
		}, 450);
	};

	const handleSkip = () => {
		const updated = skipQuestStep(progress);
		setProgress(updated);
		if (!updated.isTourActive) onComplete?.();
	};

	const handleNeverShowAgain = () => {
		const updated = dismissQuestTourPermanently();
		setProgress(updated);
		setIsOpen(false);
		onComplete?.();
		onClose?.();
	};

	const handlePrev = () => {
		if (currentStepIndex > 0) {
			const nextState = { ...progress, currentStepIndex: currentStepIndex - 1 };
			saveQuestProgress(nextState);
			setProgress(nextState);
		}
	};

	const handleTrackChange = (trackId: QuestTrackId) => {
		const updated = startQuestTrack(trackId);
		setProgress(updated);
		const track = CLINICAL_QUEST_TRACKS.find((t) => t.id === trackId);
		const targetStep = track?.steps[updated.currentStepIndex] || track?.steps[0];
		if (targetStep?.viewTarget) {
			setCurrentView(targetStep.viewTarget);
			window.location.hash = `#${targetStep.viewTarget}`;
		}
	};

	const handleResetTrack = (trackId: QuestTrackId) => {
		const updated = resetQuestProgress(trackId);
		setProgress(updated);
		const track = CLINICAL_QUEST_TRACKS.find((t) => t.id === trackId);
		const firstStep = track?.steps[0];
		if (firstStep?.viewTarget) {
			setCurrentView(firstStep.viewTarget);
			window.location.hash = `#${firstStep.viewTarget}`;
		}
	};

	const handleFocusTarget = () => {
		try {
			let targetEl = document.querySelector<HTMLElement>(currentStep.targetSelector);
			if (!targetEl && currentStep.fallbackTargetSelector) {
				targetEl = document.querySelector<HTMLElement>(currentStep.fallbackTargetSelector);
			}

			if (targetEl) {
				targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
				targetEl.focus?.();
			} else if (currentStep.viewTarget) {
				setCurrentView(currentStep.viewTarget);
				window.location.hash = `#${currentStep.viewTarget}`;
			}
		} catch {
			// Fallback
		}
	};

	if (!isOpen) return null;

	// Calculate non-covering positioning for card
	let cardPositionStyle: React.CSSProperties = {
		position: "fixed",
		bottom: 24,
		right: 24,
		zIndex: 1050,
	};

	if (targetRect) {
		const margin = 14;
		const cardW = 390;
		const cardH = 280;
		const vw = typeof window !== "undefined" ? window.innerWidth : 1366;
		const vh = typeof window !== "undefined" ? window.innerHeight : 768;

		const top =
			targetRect.bottom + cardH + margin <= vh
				? targetRect.bottom + margin
				: targetRect.top - cardH - margin >= 0
					? targetRect.top - cardH - margin
					: Math.max(16, vh - cardH - 16);

		const left =
			targetRect.left + cardW <= vw - 16
				? Math.max(16, targetRect.left)
				: Math.max(16, vw - cardW - 16);

		cardPositionStyle = {
			position: "fixed",
			top: Math.round(top),
			left: Math.round(left),
			maxWidth: "min(390px, calc(100vw - 32px))",
			zIndex: 1050,
		};
	}

	const renderArrowIndicator = (dir: QuestArrowDirection) => {
		switch (dir) {
			case "down": return <ArrowDown size={14} className="text-teal-500 animate-bounce" />;
			case "up": return <ArrowUp size={14} className="text-teal-500 animate-bounce" />;
			case "left": return <ArrowLeft size={14} className="text-teal-500 animate-pulse" />;
			case "right": return <ArrowRight size={14} className="text-teal-500 animate-pulse" />;
		}
	};

	const progressPercentage = Math.round(
		((currentStepIndex + 1) / activeTrack.steps.length) * 100,
	);

	const isTrackCompleted = Boolean(progress.tracksProgress[activeTrack.id]?.completed && !progress.isTourActive);
	const nextTrackId = getNextTrackId(activeTrack.id);
	const nextTrack = nextTrackId ? CLINICAL_QUEST_TRACKS.find((t) => t.id === nextTrackId) : null;

	// Completely disable desktop training tour on mobile screens (<= 768px) per Apple HIG & mobile mandate
	if (typeof window !== "undefined" && window.innerWidth <= 768 && !forceOpen) {
		return null;
	}

	if (!isOpen) {
		return null;
	}

	return (
		<>
			{/* 1. Cinematic Spotlight Overlay with Non-blocking SVG Mask Cutout */}
			<SpotlightOverlay
				isOpen={isOpen}
				targetRect={targetRect}
				padding={8}
				borderRadius={12}
				onBackdropClick={handleBackdropNudge}
			/>

			{/* 2. Concentric Pulsing Halo Ripple Rings & Animated Pointer Badge */}
			<PulsingHaloAnchor
				isOpen={isOpen}
				targetRect={targetRect}
				colorTheme={isActionSuccessFlash ? "emerald" : "cyan"}
				badgeText="Кликните сюда"
				showPointerBadge={true}
			/>

			{/* 3. Non-blocking target element beacon outline with pulse animation */}
			{targetRect && (
				<div
					data-testid="coach-mark-target-beacon"
					style={{
						position: "fixed",
						top: targetRect.top - 6,
						left: targetRect.left - 6,
						width: targetRect.width + 12,
						height: targetRect.height + 12,
						borderRadius: 12,
						border: isActionSuccessFlash
							? "3px solid var(--success, #10b981)"
							: isActionNudge
								? "3px solid var(--teal, #0d9488)"
								: "2.5px solid var(--teal, #0d9488)",
						boxShadow: isActionSuccessFlash
							? "0 0 24px rgba(16, 185, 129, 0.75)"
							: isActionNudge
								? "0 0 30px rgba(13, 148, 136, 0.9), 0 0 0 6px rgba(13, 148, 136, 0.3)"
								: "0 0 20px rgba(13, 148, 136, 0.5)",
						pointerEvents: "none",
						zIndex: 1049,
						transition: "all 0.2s ease-out",
					}}
					aria-hidden="true"
				>
					{/* Interactive Target Label Banner */}
					<div
						style={{
							position: "absolute",
							top: currentStep.arrowDirection === "down" ? -28 : "auto",
							bottom: currentStep.arrowDirection === "up" ? -28 : "auto",
							left: "50%",
							transform: "translateX(-50%)",
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							padding: "2px 8px",
							borderRadius: 6,
							fontSize: 10,
							fontWeight: 700,
							display: "flex",
							alignItems: "center",
							gap: 4,
							boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
							whiteSpace: "nowrap",
						}}
					>
						{renderArrowIndicator(currentStep.arrowDirection)}
						<span>Кликните сюда</span>
					</div>
				</div>
			)}

			{/* Interactive Quest Card */}
			<aside
				ref={cardRef}
				style={cardPositionStyle}
				className="w-full max-w-[390px] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-xl border border-[var(--line,#e2e8f0)] shadow-2xl overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
				role="region"
				aria-label="Интерактивное обучение врача и квесты клиники"
				data-testid="doctor-training-coach-mark-card"
			>
				{/* Top Track Selector Header */}
				<div className="px-3 py-2 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-1.5">
					<div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
						{CLINICAL_QUEST_TRACKS.map((t) => {
							const isActive = t.id === progress.activeTrackId;
							const isDone = progress.tracksProgress[t.id]?.completed;
							return (
								<button
									key={t.id}
									type="button"
									onClick={() => handleTrackChange(t.id)}
									className={`px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
										isActive
											? "bg-[var(--teal,#0d9488)] text-white shadow-2xs"
											: "bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)]"
									}`}
								>
									{isDone && <CheckCircle2 size={10} className="text-emerald-400" />}
									<span>{t.shortTitle}</span>
								</button>
							);
						})}
					</div>

					<button
						type="button"
						onClick={handleClose}
						className="min-h-[26px] min-w-[26px] flex items-center justify-center rounded-md text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer shrink-0"
						aria-label="Закрыть обучение"
						title="Закрыть (Esc)"
					>
						<X size={14} aria-hidden="true" />
					</button>
				</div>

				{/* Step Progress Bar */}
				<div className="w-full bg-[var(--line,#e2e8f0)] h-1">
					<div
						className="bg-[var(--teal,#0d9488)] h-1 transition-all duration-300"
						style={{ width: `${progressPercentage}%` }}
					/>
				</div>

				{isTrackCompleted ? (
					<div className="px-3.5 py-3 space-y-2.5 text-xs">
						<div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
							<CheckCircle2 size={18} className="shrink-0" />
							<h3 className="text-sm font-bold m-0 text-[var(--ink,#0f172a)]">
								Квест «{activeTrack.shortTitle}» пройден!
							</h3>
						</div>
						<p className="text-[11px] text-[var(--muted,#64748b)] m-0 leading-relaxed">
							Все {activeTrack.steps.length} ключевых шага направления успешно выполнены.
						</p>
						<div className="p-2 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center gap-1.5 flex-wrap">
							{CLINICAL_QUEST_TRACKS.map((t) => (
								<span
									key={t.id}
									className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1 ${
										progress.tracksProgress[t.id]?.completed
											? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
											: "bg-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]"
									}`}
								>
									{progress.tracksProgress[t.id]?.completed && <CheckCircle2 size={9} />}
									<span>{t.shortTitle}</span>
								</span>
							))}
						</div>
						<div className="pt-2 flex items-center justify-between gap-2 border-t border-[var(--line,#e2e8f0)]">
							<button
								type="button"
								onClick={() => handleResetTrack(activeTrack.id)}
								className="h-7 px-2 rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] text-xs font-medium cursor-pointer shadow-2xs"
							>
								Пройти заново
							</button>
							{nextTrack ? (
								<button
									type="button"
									onClick={() => handleTrackChange(nextTrack.id)}
									className="h-7 px-2.5 rounded-md bg-[var(--teal,#0d9488)] text-white text-xs font-semibold inline-flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-2xs"
									data-testid="coach-mark-next-track-btn"
								>
									<span>К треку: {nextTrack.shortTitle}</span>
									<ChevronRight size={13} aria-hidden="true" />
								</button>
							) : (
								<button
									type="button"
									onClick={handleClose}
									className="h-7 px-2.5 rounded-md bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer shadow-2xs"
									data-testid="coach-mark-complete-all-btn"
								>
									<span>Завершить обучение</span>
								</button>
							)}
						</div>
					</div>
				) : (
					<>
						{/* Step Header */}
						<div className="px-3.5 pt-3 pb-1 flex items-center justify-between gap-2">
							<div className="flex items-center gap-1.5">
								<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--teal,#0d9488)]">
									Шаг {currentStep.stepNumber} из {activeTrack.steps.length}
								</span>
								<span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--paper-subtle,#e2e8f0)] text-[var(--muted,#64748b)]">
									{currentStep.badge}
								</span>
							</div>

							{currentStep.rewardBadge && (
								<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
									<Award size={10} />
									<span>{currentStep.rewardBadge}</span>
								</span>
							)}
						</div>

						{/* Step Body */}
						<div className="px-3.5 py-2 space-y-2.5 text-xs">
							<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">
								{currentStep.title}
							</h3>

							<p className="text-[11px] text-[var(--ink-2,var(--ink,#0f172a))] leading-relaxed m-0">
								{currentStep.description}
							</p>

							{/* Clinical Tip Box */}
							<div className="p-2 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.06))] border border-[var(--teal-surface,rgba(13,148,136,0.2))] flex items-start gap-2">
								<Zap size={13} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" aria-hidden="true" />
								<p className="text-[10px] text-[var(--muted,#64748b)] leading-normal m-0">
									{currentStep.clinicalTip}
								</p>
							</div>

							{/* Action Guidance & Target Pointer */}
							<div className="flex items-center justify-between gap-2 text-[10px] text-[var(--muted,#64748b)] pt-0.5">
								<span className="font-medium truncate">{currentStep.shortcutBadge}</span>
								<button
									type="button"
									onClick={handleFocusTarget}
									className="text-[var(--teal,#0d9488)] hover:underline font-semibold shrink-0 cursor-pointer inline-flex items-center gap-1"
									title="Показать элемент на экране"
								>
									<Crosshair size={11} />
									<span>{currentStep.actionLabel}</span>
								</button>
							</div>
						</div>

						{/* Step Navigation & Action Footer */}
						<div className="px-3.5 py-2.5 bg-[var(--paper-soft,#f8fafc)] border-t border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2">
							<button
								type="button"
								onClick={handleNeverShowAgain}
								className="text-[10px] text-[var(--muted,#64748b)] hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
								title="Запомнить выбор навсегда и больше не показывать обучение"
								data-testid="coach-mark-never-show-btn"
							>
								Больше не показывать
							</button>

							<div className="flex items-center gap-1.5 flex-shrink-0">
								{currentStepIndex > 0 && (
									<button
										type="button"
										onClick={handlePrev}
										className="h-7 px-2 rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-semibold inline-flex items-center gap-0.5 hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
										aria-label="Предыдущий шаг"
									>
										<ChevronLeft size={13} aria-hidden="true" />
										<span>Назад</span>
									</button>
								)}

								<button
									type="button"
									onClick={handleSkip}
									className="h-7 px-2 rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] text-xs font-medium inline-flex items-center gap-0.5 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
									title="Пропустить текущий шаг без выполнения действия"
								>
									<span>Пропустить</span>
								</button>

								{currentStepIndex < activeTrack.steps.length - 1 ? (
									<button
										type="button"
										onClick={handleStepAccomplished}
										className="h-7 px-2.5 rounded-md bg-[var(--teal,#0d9488)] text-white text-xs font-semibold inline-flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
										aria-label="Следующий шаг"
										data-testid="coach-mark-next-btn"
									>
										<span>Далее</span>
										<ChevronRight size={13} aria-hidden="true" />
									</button>
								) : (
									<button
										type="button"
										onClick={handleStepAccomplished}
										className="h-7 px-2.5 rounded-md bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer shadow-2xs"
										aria-label="Завершить квест"
										data-testid="coach-mark-finish-btn"
									>
										<CheckCircle2 size={13} aria-hidden="true" />
										<span>Квест завершён!</span>
									</button>
								)}
							</div>
						</div>
					</>
				)}
			</aside>
		</>
	);
});

DoctorClinicalTrainingTour.displayName = "DoctorClinicalTrainingTour";
