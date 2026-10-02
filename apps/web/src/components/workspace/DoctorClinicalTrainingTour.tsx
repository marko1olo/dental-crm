/**
 * DoctorClinicalTrainingTour.tsx
 *
 * DENTE CRM — Interactive Doctor Clinical Training & Guided Coach Marks
 *
 * Mandates:
 * - Mandate 8e: Doctor Autonomy (Zero obstacles, no forced wizards).
 * - Mandate 8d: 7 Deadly Sins of UI (Zero visual landfill, zero cartoon emojis).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (1-click workflows).
 * - Mandate 8p: The Elephant in the Room (No permanent blocking clutter).
 * - Mandate 8l: Guided Interactive Onboarding & Game Tour Inquisitor.
 *
 * Teaches 3 Clinical Tracks:
 * 1. Solo Doctor: Schedule 1-click -> FDI Odontogram / Autonorm (Shift+N) -> EMK 043/u -> 54-FZ Cashier (F9).
 * 2. Reception Admin: Patient Search (Ctrl+K) -> Chair Slot -> Contract Print -> QR Cashier.
 * 3. Imaging & Diagnostics: Visiograph / CT (F7) -> MPR 3D Slices -> Bone Ridge Caliper.
 *
 * Non-Blocking Game Tour Ergonomics:
 * - Target beacon with pulse ring and directional arrow (pointer-events: none).
 * - Reactive Action Tracking: automatically advances on real user clicks or keyboard shortcuts.
 * - Skip Step ("Пропустить шаг") & Permanent Dismissal ("Больше не показывать").
 * - Multi-track selector tabs with progress indicators.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	Award,
	Calendar,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	CreditCard,
	Crosshair,
	Eye,
	FileText,
	HelpCircle,
	Sparkles,
	UserCheck,
	X,
	Zap,
} from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { PulsingHaloAnchor, SpotlightOverlay } from "../tutorial";
import {
	CLINICAL_QUEST_TRACKS,
	DENTE_TOUR_STORAGE_KEY,
	type QuestArrowDirection,
	type QuestProgressState,
	type QuestStep,
	type QuestTrack,
	type QuestTrackId,
	SOLO_DOCTOR_TRACK_STEPS,
	advanceQuestStep,
	dismissQuestTourPermanently,
	isActionTriggerSatisfied,
	loadQuestProgress,
	resetQuestProgress,
	saveQuestProgress,
	skipQuestStep,
	startQuestTrack,
} from "./ClinicalQuestTourEngine";

export { DENTE_TOUR_STORAGE_KEY };

export interface ClinicalTourStep {
	readonly id: string;
	readonly stepNumber: number;
	readonly title: string;
	readonly badge: string;
	readonly description: string;
	readonly clinicalTip: string;
	readonly shortcutBadge: string;
	readonly targetSelector: string;
	readonly fallbackTargetSelector?: string;
	readonly viewTarget?: string;
	readonly actionLabel: string;
	readonly rewardBadge?: string;
}

export const CLINICAL_TRAINING_STEPS: readonly ClinicalTourStep[] = SOLO_DOCTOR_TRACK_STEPS;

export function isTourCompleted(): boolean {
	const progress = loadQuestProgress();
	return progress.isDismissedPermanently || progress.tracksProgress.solo_doctor.completed;
}

export function completeTourPermanently(): void {
	dismissQuestTourPermanently();
}

export function resetDoctorTour(): void {
	resetQuestProgress();
}

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
		return !isTourCompleted();
	});

	const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
	const [isActionSuccessFlash, setIsActionSuccessFlash] = useState<boolean>(false);
	const cardRef = useRef<HTMLDivElement | null>(null);

	const setCurrentView = useAppStore((s) => s.setCurrentView);

	// Get active track and active step
	const activeTrack: QuestTrack =
		CLINICAL_QUEST_TRACKS.find((t) => t.id === progress.activeTrackId) ||
		CLINICAL_QUEST_TRACKS[0]!;

	const currentStepIndex = Math.min(progress.currentStepIndex, activeTrack.steps.length - 1);
	const currentStep: QuestStep = activeTrack.steps[currentStepIndex] || activeTrack.steps[0]!;

	// Sync controlled forceOpen prop
	useEffect(() => {
		if (typeof forceOpen === "boolean") {
			setIsOpen(forceOpen);
		}
	}, [forceOpen]);

	// Listen for global custom event to launch tour anytime
	useEffect(() => {
		const handleStartTour = (e: Event) => {
			const detail = (e as CustomEvent<{ trackId?: QuestTrackId }>).detail;
			const targetTrack = detail?.trackId || "solo_doctor";
			const updated = startQuestTrack(targetTrack);
			setProgress(updated);
			setIsOpen(true);
		};

		window.addEventListener("dente:start-doctor-tour", handleStartTour);
		return () => {
			window.removeEventListener("dente:start-doctor-tour", handleStartTour);
		};
	}, []);

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

	// Smooth measurement tracking with requestAnimationFrame throttling (prevents layout thrashing)
	useEffect(() => {
		let rafId: number | null = null;
		const scheduleUpdate = () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				updateTargetMeasurement();
			});
		};

		scheduleUpdate();
		window.addEventListener("resize", scheduleUpdate, { passive: true });
		window.addEventListener("scroll", scheduleUpdate, true);

		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			window.removeEventListener("resize", scheduleUpdate);
			window.removeEventListener("scroll", scheduleUpdate, true);
		};
	}, [updateTargetMeasurement]);

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

	// Close on outside click (click outside coach card and not on target beacon)
	useEffect(() => {
		if (!isOpen) return;

		const handlePointerDown = (e: MouseEvent | TouchEvent) => {
			if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
				handleClose();
			}
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
	}, [isOpen]);

	const handleClose = () => {
		setIsOpen(false);
		onClose?.();
	};

	const handleStepAccomplished = () => {
		setIsActionSuccessFlash(true);
		setTimeout(() => {
			setIsActionSuccessFlash(false);
			const updated = advanceQuestStep(progress);
			setProgress(updated);
			if (!updated.isTourActive) {
				onComplete?.();
			}
		}, 450);
	};

	const handleSkip = () => {
		const updated = skipQuestStep(progress);
		setProgress(updated);
		if (!updated.isTourActive) {
			onComplete?.();
		}
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
			const nextState = {
				...progress,
				currentStepIndex: currentStepIndex - 1,
			};
			saveQuestProgress(nextState);
			setProgress(nextState);
		}
	};

	const handleTrackChange = (trackId: QuestTrackId) => {
		const updated = startQuestTrack(trackId);
		setProgress(updated);
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
		const cardEstimatedWidth = 390;
		const cardEstimatedHeight = 280;
		const viewportW = typeof window !== "undefined" ? window.innerWidth : 1366;
		const viewportH = typeof window !== "undefined" ? window.innerHeight : 768;

		let top: number;
		let left: number;

		if (targetRect.bottom + cardEstimatedHeight + margin <= viewportH) {
			top = targetRect.bottom + margin;
		} else if (targetRect.top - cardEstimatedHeight - margin >= 0) {
			top = targetRect.top - cardEstimatedHeight - margin;
		} else {
			top = Math.max(16, viewportH - cardEstimatedHeight - 16);
		}

		if (targetRect.left + cardEstimatedWidth <= viewportW - 16) {
			left = Math.max(16, targetRect.left);
		} else {
			left = Math.max(16, viewportW - cardEstimatedWidth - 16);
		}

		cardPositionStyle = {
			position: "fixed",
			top: Math.round(top),
			left: Math.round(left),
			zIndex: 1050,
		};
	}

	const renderArrowIndicator = (dir: QuestArrowDirection) => {
		switch (dir) {
			case "down":
				return <ArrowDown size={14} className="text-teal-500 animate-bounce" />;
			case "up":
				return <ArrowUp size={14} className="text-teal-500 animate-bounce" />;
			case "left":
				return <ArrowLeft size={14} className="text-teal-500 animate-pulse" />;
			case "right":
				return <ArrowRight size={14} className="text-teal-500 animate-pulse" />;
		}
	};

	const progressPercentage = Math.round(
		((currentStepIndex + 1) / activeTrack.steps.length) * 100,
	);

	return (
		<>
			{/* 1. Cinematic Spotlight Overlay with Non-blocking SVG Mask Cutout */}
			<SpotlightOverlay
				isOpen={isOpen}
				targetRect={targetRect}
				padding={8}
				borderRadius={12}
				onBackdropClick={handleClose}
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
							: "2.5px solid var(--teal, #0d9488)",
						boxShadow: isActionSuccessFlash
							? "0 0 24px rgba(16, 185, 129, 0.75)"
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

					<div className="flex items-center gap-1.5">
						{currentStepIndex > 0 && (
							<button
								type="button"
								onClick={handlePrev}
								className="h-7 px-2 rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-semibold inline-flex items-center gap-0.5 hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer shadow-2xs"
								aria-label="Предыдущий шаг"
							>
								<ChevronLeft size={13} aria-hidden="true" />
								<span>Назад</span>
							</button>
						)}

						<button
							type="button"
							onClick={handleSkip}
							className="h-7 px-2 rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] text-xs font-medium inline-flex items-center gap-0.5 transition-all cursor-pointer shadow-2xs"
							title="Пропустить текущий шаг без выполнения действия"
						>
							<span>Пропустить</span>
						</button>

						{currentStepIndex < activeTrack.steps.length - 1 ? (
							<button
								type="button"
								onClick={handleStepAccomplished}
								className="h-7 px-2.5 rounded-md bg-[var(--teal,#0d9488)] text-white text-xs font-semibold inline-flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-2xs"
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
			</aside>
		</>
	);
});

DoctorClinicalTrainingTour.displayName = "DoctorClinicalTrainingTour";
