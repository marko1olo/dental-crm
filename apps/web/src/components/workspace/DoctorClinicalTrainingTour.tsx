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
 *
 * Teaches 4 Core Clinical Operations:
 * 1. Schedule 1-Click: Instant booking in 5 seconds without mandatory assistant.
 * 2. Odontogram Formula: FDI teeth, 1-Click Autonorm (Shift+N), quick conditions (C, P, K, X).
 * 3. EMK Diary & Protocol 043/u: Ready clinical presets, debounced autosave (Ctrl+S), print (F12).
 * 4. Fast Cashier & Split 54-FZ: F9 checkout, cash/card/SBP QR/family split, no physical person INN.
 *
 * Non-Blocking Ergonomics (Zero Visual Landfill):
 * - Target buttons remain 100% visible, unobscured and clickable (pointer-events: none on overlay).
 * - Closes on: [X] button, outside click, or Escape key.
 * - "Понятно, больше не показывать": permanently writes localStorage.setItem("dente_tour_completed", "true").
 * - Re-openable on demand via window event "dente:start-doctor-tour" or startDoctorTour().
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	Calendar,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	CreditCard,
	FileText,
	HelpCircle,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import { useAppStore } from "../../store/appStore";

export const DENTE_TOUR_STORAGE_KEY = "dente_tour_completed";

export interface ClinicalTourStep {
	readonly id: "schedule_1click" | "odontogram_formula" | "visit_diary_043" | "fast_cashier_54fz";
	readonly stepNumber: number;
	readonly title: string;
	readonly badge: string;
	readonly description: string;
	readonly clinicalTip: string;
	readonly shortcutBadge: string;
	readonly targetSelector: string;
	readonly viewTarget?: string;
	readonly actionLabel: string;
}

export const CLINICAL_TRAINING_STEPS: readonly ClinicalTourStep[] = [
	{
		id: "schedule_1click",
		stepNumber: 1,
		title: "Запись в расписании за 1 клик",
		badge: "Расписание",
		description:
			"Кликните в любое свободное время на сетке или нажмите кнопку «+ Запись». Карточка приёма бронируется за 5 секунд: пациент, время и кабинет без принудительного выбора ассистента.",
		clinicalTip:
			"0-клик старт: соло-врач не тратит время на лишние поля и бюрократические согласования.",
		shortcutBadge: "Space / Enter — старт и финиш приёма",
		targetSelector: '[data-tour="schedule-booking"], #topbar-booking-action-btn, .top-actions .primary-button',
		viewTarget: "schedule",
		actionLabel: "Открыть расписание",
	},
	{
		id: "odontogram_formula",
		stepNumber: 2,
		title: "Зубная формула и одонтограмма",
		badge: "Зубная формула",
		description:
			"Нажмите клавиши 1..8 для выбора квадранта или кликните по зубу в дуге FDI. Для здоровых зубов нажмите «Норма» (Shift+N) — вся формула заполнится в 1 клик. Патологии отмечаются клавишами: C (кариес), P (пульпит), K (коронка), X (удален).",
		clinicalTip:
			"Физиологическая норма по умолчанию: врач отмечает только реальную клиническую патологию.",
		shortcutBadge: "Shift+N — норма в 1 клик • C, P, K, X — патологии",
		targetSelector: '[data-tour="odontogram-formula"], a[href="#visit"]',
		viewTarget: "visit",
		actionLabel: "Открыть одонтограмму",
	},
	{
		id: "visit_diary_043",
		stepNumber: 3,
		title: "Протокол приёма и карта 043/у",
		badge: "Дневник приёма",
		description:
			"Используйте готовые клинические протоколы (терапия, ортопедия, хирургия) или диктуйте голосом. Черновик сохраняется на лету (Ctrl+S). Печать карты 043/у, согласий и смет доступна в любой момент без ожидания (F12).",
		clinicalTip:
			"Никаких запретов на черновики и согласований начмедов: врач автономен в заполнении карты.",
		shortcutBadge: "Ctrl+S — автосохранение • F12 — печать 043/у",
		targetSelector: '[data-tour="visit-diary"], a[href="#visit"]',
		viewTarget: "visit",
		actionLabel: "Открыть дневник приёма",
	},
	{
		id: "fast_cashier_54fz",
		stepNumber: 4,
		title: "Касса и сплит-оплата 54-ФЗ",
		badge: "Касса и чеки",
		description:
			"Нажмите F9 для мгновенного чекаута. Оплата принимается в 3 клика: наличные, банковская карта, СБП QR или баланс семьи. По 54-ФЗ ИНН с физических лиц не требуется. Чек формируется с точностью до копейки.",
		clinicalTip:
			"Свобода скидок врача (вплоть до 100% на гарантийные переделки) без мастер-паролей.",
		shortcutBadge: "F9 — быстрый чек • Сплит: нал + карта + семья",
		targetSelector: '[data-tour="fast-cashier"], a[href="#finance"]',
		viewTarget: "finance",
		actionLabel: "Открыть кассу",
	},
];

export function isTourCompleted(): boolean {
	if (typeof window === "undefined" || !window.localStorage) return true;
	try {
		return window.localStorage.getItem(DENTE_TOUR_STORAGE_KEY) === "true";
	} catch {
		return false;
	}
}

export function completeTourPermanently(): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		window.localStorage.setItem(DENTE_TOUR_STORAGE_KEY, "true");
	} catch (e) {
		console.warn("DENTE Coach Marks: failed to persist tour completed state", e);
	}
}

export function resetDoctorTour(): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		window.localStorage.removeItem(DENTE_TOUR_STORAGE_KEY);
	} catch (e) {
		console.warn("DENTE Coach Marks: failed to reset tour state", e);
	}
}

export function startDoctorTour(): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent("dente:start-doctor-tour"));
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
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof forceOpen === "boolean") return forceOpen;
		return !isTourCompleted();
	});

	const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
	const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
	const cardRef = useRef<HTMLDivElement | null>(null);

	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const currentStep: ClinicalTourStep =
		CLINICAL_TRAINING_STEPS[currentStepIndex] ?? CLINICAL_TRAINING_STEPS[0]!;

	// Sync controlled prop
	useEffect(() => {
		if (typeof forceOpen === "boolean") {
			setIsOpen(forceOpen);
		}
	}, [forceOpen]);

	// Listen for global custom event to launch tour anytime
	useEffect(() => {
		const handleStartTour = () => {
			setCurrentStepIndex(0);
			setIsOpen(true);
		};

		window.addEventListener("dente:start-doctor-tour", handleStartTour);
		return () => {
			window.removeEventListener("dente:start-doctor-tour", handleStartTour);
		};
	}, []);

	// Locate and measure active target element
	const updateTargetMeasurement = useCallback(() => {
		if (!isOpen || !currentStep) {
			setTargetRect(null);
			return;
		}

		try {
			const targetEl = document.querySelector<HTMLElement>(currentStep.targetSelector);
			if (targetEl) {
				const rect = targetEl.getBoundingClientRect();
				// Only use rect if visible in viewport
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

	useEffect(() => {
		updateTargetMeasurement();
		window.addEventListener("resize", updateTargetMeasurement);
		window.addEventListener("scroll", updateTargetMeasurement, true);

		return () => {
			window.removeEventListener("resize", updateTargetMeasurement);
			window.removeEventListener("scroll", updateTargetMeasurement, true);
		};
	}, [updateTargetMeasurement]);

	// Close on Escape key (Doctor Autonomy Mandate 8e)
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				handleClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen]);

	// Close on outside click (click outside coach card)
	useEffect(() => {
		if (!isOpen) return;

		const handlePointerDown = (e: MouseEvent | TouchEvent) => {
			if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
				// Clicked outside the coach card — dismiss cleanly without blocking
				handleClose();
			}
		};

		// Slight delay to avoid capturing the triggering click
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

	const handleNeverShowAgain = () => {
		completeTourPermanently();
		setIsOpen(false);
		onComplete?.();
		onClose?.();
	};

	const handleNext = () => {
		if (currentStepIndex < CLINICAL_TRAINING_STEPS.length - 1) {
			setCurrentStepIndex((prev) => prev + 1);
		} else {
			handleNeverShowAgain();
		}
	};

	const handlePrev = () => {
		if (currentStepIndex > 0) {
			setCurrentStepIndex((prev) => prev - 1);
		}
	};

	const handleActionTry = () => {
		if (currentStep.viewTarget) {
			setCurrentView(currentStep.viewTarget);
			window.location.hash = `#${currentStep.viewTarget}`;
		}
	};

	if (!isOpen) return null;

	// Calculate smart positioning so the card NEVER covers the active button
	let cardPositionStyle: React.CSSProperties = {
		position: "fixed",
		bottom: 24,
		right: 24,
		zIndex: 1050,
	};

	if (targetRect) {
		const margin = 12;
		const cardEstimatedWidth = 380;
		const cardEstimatedHeight = 260;
		const viewportW = typeof window !== "undefined" ? window.innerWidth : 1366;
		const viewportH = typeof window !== "undefined" ? window.innerHeight : 768;

		let top: number;
		let left: number;

		// Place vertically below target if space permits, otherwise above
		if (targetRect.bottom + cardEstimatedHeight + margin <= viewportH) {
			top = targetRect.bottom + margin;
		} else if (targetRect.top - cardEstimatedHeight - margin >= 0) {
			top = targetRect.top - cardEstimatedHeight - margin;
		} else {
			top = Math.max(16, viewportH - cardEstimatedHeight - 16);
		}

		// Place horizontally near target or clamp
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

	return (
		<>
			{/* Non-blocking target element beacon outline */}
			{targetRect && (
				<div
					data-testid="coach-mark-target-beacon"
					style={{
						position: "fixed",
						top: targetRect.top - 4,
						left: targetRect.left - 4,
						width: targetRect.width + 8,
						height: targetRect.height + 8,
						borderRadius: 10,
						border: "2px solid var(--teal, #0d9488)",
						boxShadow: "0 0 16px rgba(13, 148, 136, 0.45)",
						pointerEvents: "none",
						zIndex: 1049,
						animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
					}}
					aria-hidden="true"
				/>
			)}

			{/* Interactive Coach Mark Floating Card (Zero Visual Landfill) */}
			<aside
				ref={cardRef}
				style={cardPositionStyle}
				className="w-full max-w-[380px] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-xl border border-[var(--line,#e2e8f0)] shadow-2xl overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
				role="region"
				aria-label="Интерактивное обучение врача"
				data-testid="doctor-training-coach-mark-card"
			>
				{/* Header */}
				<div className="px-3.5 py-2.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<div className="w-6 h-6 rounded-md bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<Sparkles size={14} aria-hidden="true" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-1.5">
								<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--teal,#0d9488)]">
									Шаг {currentStep.stepNumber} из {CLINICAL_TRAINING_STEPS.length}
								</span>
								<span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--paper-subtle,#e2e8f0)] text-[var(--muted,#64748b)]">
									{currentStep.badge}
								</span>
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={handleClose}
						className="min-h-[28px] min-w-[28px] flex items-center justify-center rounded-md text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer"
						aria-label="Закрыть подсказку"
						title="Закрыть (Esc)"
					>
						<X size={15} aria-hidden="true" />
					</button>
				</div>

				{/* Body Content */}
				<div className="p-3.5 space-y-2.5 text-xs">
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

					{/* Shortcut pill */}
					<div className="flex items-center justify-between gap-2 text-[10px] text-[var(--muted,#64748b)] pt-0.5">
						<span className="font-medium truncate">{currentStep.shortcutBadge}</span>
						{currentStep.viewTarget && (
							<button
								type="button"
								onClick={handleActionTry}
								className="text-[var(--teal,#0d9488)] hover:underline font-semibold shrink-0 cursor-pointer"
								title={`Перейти: ${currentStep.actionLabel}`}
							>
								{currentStep.actionLabel} →
							</button>
						)}
					</div>
				</div>

				{/* Step Navigation Dots & Actions Footer */}
				<div className="px-3.5 py-2.5 bg-[var(--paper-soft,#f8fafc)] border-t border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2">
					{/* Never Show Again Button (Doctor Sovereignty Mandate 8e) */}
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

						{currentStepIndex < CLINICAL_TRAINING_STEPS.length - 1 ? (
							<button
								type="button"
								onClick={handleNext}
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
								onClick={handleNeverShowAgain}
								className="h-7 px-2.5 rounded-md bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer shadow-2xs"
								aria-label="Завершить обучение"
								data-testid="coach-mark-finish-btn"
							>
								<CheckCircle2 size={13} aria-hidden="true" />
								<span>Понятно!</span>
							</button>
						)}
					</div>
				</div>
			</aside>
		</>
	);
});

DoctorClinicalTrainingTour.displayName = "DoctorClinicalTrainingTour";
