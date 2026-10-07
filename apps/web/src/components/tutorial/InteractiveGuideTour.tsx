/**
 * apps/web/src/components/tutorial/InteractiveGuideTour.tsx
 *
 * Lightweight, non-intrusive role-based interactive walkthrough & spotlights.
 * Roles:
 * 1. Administrator (Schedule booking, Quick patient search, 54-FZ cashier checkout)
 * 2. Doctor (Quadrant formula, 1-click norm button 52px, SmartMicrophone, 1-tap finish)
 * 3. Director (Revenue dashboard, Chair occupancy KPI, Warehouse consumption & stock)
 *
 * Authorities:
 * - Mandate 8e: Doctor Autonomy (Underlying controls remain 100% clickable; instant skip).
 * - Mandate 8d: 7 Deadly Sins of UI (Zero cartoon emojis; strictly Lucide SVG icons).
 * - Mandate 8b: File line limit <= 800 lines.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	ArrowLeft,
	ArrowRight,
	Award,
	Building2,
	CheckCircle2,
	Eye,
	HelpCircle,
	Sparkles,
	Stethoscope,
	User,
	Users,
	X,
	Zap,
} from "lucide-react";
import { SpotlightOverlay } from "./SpotlightOverlay";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../../lib/safeLocalStorage";
import { showToast } from "../GlobalToast";

export type TourRole = "admin" | "doctor" | "director";

export interface TourStepDefinition {
	id: string;
	title: string;
	targetSelector: string;
	fallbackSelector?: string;
	viewTarget: string;
	description: string;
	clinicalTip: string;
	actionBadge: string;
}

export interface RoleTourCatalog {
	role: TourRole;
	roleTitle: string;
	roleBadge: string;
	steps: TourStepDefinition[];
}

export const ROLE_TOUR_CATALOGS: Record<TourRole, RoleTourCatalog> = {
	admin: {
		role: "admin",
		roleTitle: "Администратор (Ресепшен)",
		roleBadge: "Регистратура",
		steps: [
			{
				id: "admin_schedule_grid",
				title: "Сетка расписания и быстрая запись",
				targetSelector: '[data-tour="schedule-booking"], #topbar-booking-action-btn, [data-tour="schedule-slot"]',
				fallbackSelector: '.top-actions .primary-button',
				viewTarget: "schedule",
				description:
					"Запись бронируется за 5 секунд. Кликните свободную ячейку в кресле или кнопку «+ Запись». Позволяет вести плотный приём без наездов.",
				clinicalTip: "Шаг сетки (15/30/45/60 мин) автоматически адаптируется под длительность выбранной процедуры.",
				actionBadge: "1 клик до брони",
			},
			{
				id: "admin_patient_search",
				title: "Быстрый поиск пациента по телефону или ФИО",
				targetSelector: '[data-tour="global-search-input"], #omnibar-input, [data-tour="reception-search"]',
				fallbackSelector: '#topbar-booking-action-btn',
				viewTarget: "patients",
				description:
					"Нажмите Ctrl+K или кликните в поле поиска. Находит пациента по любой части ФИО или номеру телефона за 50 миллисекунд.",
				clinicalTip: "В результатах мгновенно виден общий баланс семьи и дата последнего визита.",
				actionBadge: "Ctrl+K поиск",
			},
			{
				id: "admin_cashier_checkout",
				title: "Касса и фискальный чек 54-ФЗ",
				targetSelector: '[data-tour="cashier-pay"], [data-tour="fast-cashier"], #cashier-tender-action-btn, [data-testid="payment-submit-button"]',
				fallbackSelector: 'a[href="#finance"], [data-testid="btn-finance-open-cashbox"]',
				viewTarget: "finance",
				description:
					"Нажмите F9 для мгновенного чекаута. Оплата картой, наличными или по динамическому QR-коду СБП с 0% эквайринговой комиссии.",
				clinicalTip: "ИНН физлица по 54-ФЗ не требуется — чек формируется за 2 секунды без очередей.",
				actionBadge: "F9 быстрый чек",
			},
		],
	},
	doctor: {
		role: "doctor",
		roleTitle: "Врач-стоматолог",
		roleBadge: "Клинический приём",
		steps: [
			{
				id: "doctor_odontogram_formula",
				title: "Квадрантная зубная формула FDI",
				targetSelector: '[data-tour="tooth-card"], [data-tour="odontogram-formula"], #odontogram-canvas-container',
				fallbackSelector: 'a[href="#visit"]',
				viewTarget: "visit",
				description:
					"Анатомическая зубная формула взрослого и детского приёма. Клавиши 1..8 переключают квадранты, клик по зубу открывает поверхности.",
				clinicalTip: "Цветовая дифференциация: кариес (чёрный), пульпит (красный), пломба (синий), коронка (золото).",
				actionBadge: "FDI 11..48",
			},
			{
				id: "doctor_instant_norm_button",
				title: "Кнопка нормы осмотра «✓ Соматически здоров»",
				targetSelector: '[data-tour="autonorm-btn"], [data-testid="btn-autonorm-visit"], .autonorm-btn',
				fallbackSelector: 'a[href="#visit"]',
				viewTarget: "visit",
				description:
					"Физиологическая норма в 1 тап (52px). Протокол осмотра и анамнез заполняются автоматически. Врач отмечает только реальную патологию.",
				clinicalTip: "Врачебная автономия: система освобождает от заполнения десятков очевидных пунктов нормы.",
				actionBadge: "1 тап — норма",
			},
			{
				id: "doctor_smart_microphone",
				title: "Диктовка протокола SmartMicrophone",
				targetSelector: '[data-tour="smart-mic-btn"], [data-testid="smart-mic-btn"], #smart-mic-toolbar-btn',
				fallbackSelector: 'a[href="#visit"]',
				viewTarget: "visit",
				description:
					"Нажмите микрофон и диктуйте жалобы, объективный статус и ход вмешательства. Термины и номера зубов распознаются на лету.",
				clinicalTip: "Работает у кресла прямо в стерильных перчатках без касания клавиатуры и мыши.",
				actionBadge: "Голосовой ввод",
			},
			{
				id: "doctor_finish_visit_one_tap",
				title: "Завершение приёма в 1 тап",
				targetSelector: '[data-tour="finish-visit-btn"], [data-testid="btn-finish-visit-primary"], [data-tour="visit-diary"]',
				fallbackSelector: 'a[href="#visit"]',
				viewTarget: "visit",
				description:
					"Кнопка «Завершить приём» сохраняет дневник карты 043/у и моментально отправляет сформированный счёт на стойку администратора.",
				clinicalTip: "Офлайн-сохранение: все данные сохраняются локально и прозрачно синхронизируются при появлении сети.",
				actionBadge: "Завершить и счёт",
			},
		],
	},
	director: {
		role: "director",
		roleTitle: "Руководитель клиники / Главврач",
		roleBadge: "Управление и аудит",
		steps: [
			{
				id: "director_revenue_dashboard",
				title: "Дашборд выручки и финансов",
				targetSelector: '[data-tour="revenue-dashboard"], [data-testid="dashboard-revenue-card"], #analytics-revenue-panel',
				fallbackSelector: 'a[href="#analytics"], a[href="#reporting"]',
				viewTarget: "analytics",
				description:
					"Выручка дня, средний чек, маржинальность услуг и структура платежей в реальном времени без задержек.",
				clinicalTip: "Прозрачная зарплатная ведомость Т-51 с автоматическим вычетом себестоимости материалов и лаборатории.",
				actionBadge: "Финансы онлайн",
			},
			{
				id: "director_chair_occupancy",
				title: "Контроль загрузки кресел и врачей",
				targetSelector: '[data-tour="chair-occupancy"], [data-testid="chair-occupancy-kpi"], [data-tour="schedule-booking"]',
				fallbackSelector: 'a[href="#schedule"]',
				viewTarget: "schedule",
				description:
					"Мониторинг коэффициента загрузки установок (KPI) и пробелов в расписании для оптимизации сменности персонала.",
				clinicalTip: "Позволяет выявить «дыры» в графике и вовремя направить пациентов с листа ожидания.",
				actionBadge: "Загрузка кресел",
			},
			{
				id: "director_warehouse_consumption",
				title: "Склад и отчет по списанию материалов",
				targetSelector: '[data-tour="warehouse-consumption"], [data-testid="warehouse-consumption-btn"], a[href="#inventory"]',
				fallbackSelector: 'a[href="#inventory"]',
				viewTarget: "inventory",
				description:
					"Автоматическое списание медикаментов по техкартам процедур (804н), партии FEFO, контроль сроков годности и критических остатков.",
				clinicalTip: "Мягкий учет: приём пациента никогда не блокируется из-за задержки приходной накладной.",
				actionBadge: "FEFO склад",
			},
		],
	},
};

const STORAGE_KEY_SEEN = "dente_guide_tour_seen_roles_v2";
const STORAGE_KEY_DISMISSED = "dente_guide_tour_dismissed_v2";

export function hasSeenGuideTour(role: TourRole): boolean {
	const raw = safeLocalStorageGetItem(STORAGE_KEY_SEEN);
	if (!raw) return false;
	try {
		const list = JSON.parse(raw);
		return Array.isArray(list) && list.includes(role);
	} catch {
		return false;
	}
}

export function markGuideTourSeen(role: TourRole): void {
	const raw = safeLocalStorageGetItem(STORAGE_KEY_SEEN);
	let list: string[] = [];
	try {
		list = raw ? JSON.parse(raw) : [];
	} catch {
		list = [];
	}
	if (!list.includes(role)) {
		list.push(role);
		safeLocalStorageSetItem(STORAGE_KEY_SEEN, JSON.stringify(list));
	}
}

export function isGuideTourDismissed(): boolean {
	return safeLocalStorageGetItem(STORAGE_KEY_DISMISSED) === "true";
}

export function dismissGuideTourPermanently(): void {
	safeLocalStorageSetItem(STORAGE_KEY_DISMISSED, "true");
}

export function resetGuideTourProgress(): void {
	safeLocalStorageSetItem(STORAGE_KEY_SEEN, "[]");
	safeLocalStorageSetItem(STORAGE_KEY_DISMISSED, "false");
}

export function startInteractiveTour(role: TourRole = "doctor"): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent("dente:start-interactive-tour", { detail: { role } }));
}

export interface InteractiveGuideTourProps {
	userRole?: string;
	onTourFinished?: () => void;
}

export function InteractiveGuideTour({
	userRole = "doctor",
	onTourFinished,
}: InteractiveGuideTourProps) {
	const detectedRole: TourRole =
		userRole === "admin" || userRole === "receptionist"
			? "admin"
			: userRole === "director" || userRole === "owner"
				? "director"
				: "doctor";

	const [activeRole, setActiveRole] = useState<TourRole>(detectedRole);
	const [isOpen, setIsOpen] = useState(false);
	const [currentStepIndex, setCurrentStepIndex] = useState(0);
	const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

	// Context invitation banner state
	const [showInviteBanner, setShowInviteBanner] = useState(false);

	const catalog = ROLE_TOUR_CATALOGS[activeRole];
	const currentStep = catalog.steps[currentStepIndex] || catalog.steps[0];

	// Listen for global custom events to start tour
	useEffect(() => {
		const handleStart = (e: Event) => {
			const detail = (e as CustomEvent<{ role?: TourRole }>).detail;
			const r = detail?.role || detectedRole;
			setActiveRole(r);
			setCurrentStepIndex(0);
			setShowInviteBanner(false);
			setIsOpen(true);
		};

		window.addEventListener("dente:start-interactive-tour", handleStart);
		return () => {
			window.removeEventListener("dente:start-interactive-tour", handleStart);
		};
	}, [detectedRole]);

	// Tour is launched on explicit trigger via dente:start-interactive-tour, zero intrusive auto-popups
	useEffect(() => {
		// Do not auto-display banner unprompted to prevent layout hijack
	}, [detectedRole, isOpen]);

	// Locate target element and calculate bounding rect
	const measureTarget = useCallback(() => {
		if (!isOpen || !currentStep) {
			setTargetRect(null);
			return;
		}

		try {
			let el = document.querySelector<HTMLElement>(currentStep.targetSelector);
			if (!el && currentStep.fallbackSelector) {
				el = document.querySelector<HTMLElement>(currentStep.fallbackSelector);
			}

			if (el) {
				const r = el.getBoundingClientRect();
				if (r.width > 0 && r.height > 0) {
					setTargetRect(r);
					// Scroll into view if offscreen
					if (
						r.top < 20 ||
						r.bottom > window.innerHeight - 20 ||
						r.left < 20 ||
						r.right > window.innerWidth - 20
					) {
						el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
					}
					return;
				}
			}
		} catch {
			// Non-blocking fallback
		}
		setTargetRect(null);
	}, [isOpen, currentStep]);

	useEffect(() => {
		if (!isOpen) return;

		measureTarget();
		const t1 = setTimeout(measureTarget, 80);
		const t2 = setTimeout(measureTarget, 250);
		const t3 = setTimeout(measureTarget, 600);

		window.addEventListener("resize", measureTarget);
		window.addEventListener("scroll", measureTarget, true);

		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
			clearTimeout(t3);
			window.removeEventListener("resize", measureTarget);
			window.removeEventListener("scroll", measureTarget, true);
		};
	}, [isOpen, currentStepIndex, measureTarget]);

	const handleNext = () => {
		if (currentStepIndex < catalog.steps.length - 1) {
			setCurrentStepIndex((prev) => prev + 1);
		} else {
			// Completed tour
			markGuideTourSeen(activeRole);
			setIsOpen(false);
			showToast(`Обучающий тур «${catalog.roleTitle}» завершён!`, "success");
			onTourFinished?.();
		}
	};

	const handlePrev = () => {
		if (currentStepIndex > 0) {
			setCurrentStepIndex((prev) => prev - 1);
		}
	};

	const handleSkip = () => {
		markGuideTourSeen(activeRole);
		setIsOpen(false);
		setShowInviteBanner(false);
		showToast("Тур пропущен. Вы всегда можете запустить его из меню помощи", "info");
	};

	const handleDismissPermanently = () => {
		dismissGuideTourPermanently();
		setIsOpen(false);
		setShowInviteBanner(false);
		showToast("Подсказки отключены", "info");
	};

	const handleStartFromBanner = () => {
		setShowInviteBanner(false);
		setCurrentStepIndex(0);
		setIsOpen(true);
	};

	return (
		<>
			{/* 1. Polite Gentle Context Invite Banner */}
			{showInviteBanner && !isOpen && (
				<aside
					className="hidden md:block fixed bottom-5 right-5 z-40 max-w-sm p-4 rounded-2xl bg-[var(--paper)]/95 backdrop-blur-md border border-teal-500/30 shadow-2xl animate-fade-in-up"
					style={{
						boxShadow: "0 20px 40px -10px rgba(0,0,0,0.25)",
					}}
					aria-label="Приглашение в обучающий тур"
					data-testid="interactive-tour-invite-banner"
				>
					<div className="flex items-start justify-between gap-2.5 mb-2">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
								<Sparkles size={18} aria-hidden="true" />
							</div>
							<div>
								<span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
									30-секундный экспресс-тур
								</span>
								<h4 className="m-0 text-xs font-bold text-[var(--ink)]">
									Освойте возможности: {catalog.roleBadge}
								</h4>
							</div>
						</div>
						<button
							type="button"
							onClick={() => setShowInviteBanner(false)}
							className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors p-1"
							aria-label="Закрыть уведомление"
						>
							<X size={16} aria-hidden="true" />
						</button>
					</div>

					<p className="text-[11px] text-[var(--muted)] mb-3 leading-relaxed">
						Короткий интерактивный обзор из 3 ключевых операций для роли «{catalog.roleTitle}». Без лишней теории.
					</p>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleStartFromBanner}
							className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
							data-testid="tour-banner-start-btn"
						>
							<Zap size={14} aria-hidden="true" />
							<span>Начать тур (30 сек)</span>
						</button>
						<button
							type="button"
							onClick={handleSkip}
							className="py-2 px-2.5 text-xs font-medium rounded-xl border border-[var(--line)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-all cursor-pointer whitespace-nowrap"
							data-testid="tour-banner-skip-btn"
						>
							Понятно, я сам
						</button>
					</div>
				</aside>
			)}

			{/* 2. Full Interactive Walkthrough Spotlight & Tooltip Modal */}
			{isOpen && currentStep && (
				<>
					<SpotlightOverlay
						isOpen={isOpen}
						targetRect={targetRect}
						padding={10}
						borderRadius={12}
						onBackdropClick={handleSkip}
					/>

					{/* Floating Coach Mark Card */}
					<div
						className="fixed z-50 transition-all duration-200 pointer-events-auto"
						style={{
							bottom: "32px",
							right: "32px",
							maxWidth: "420px",
							width: "calc(100vw - 48px)",
						}}
						role="dialog"
						aria-modal="false"
						aria-label={`Обучающий шаг: ${currentStep.title}`}
						data-testid="interactive-guide-tour-card"
					>
						<div
							className="p-5 rounded-2xl bg-[var(--paper)]/95 backdrop-blur-xl border border-teal-500/40 shadow-2xl text-[var(--ink)] animate-in fade-in zoom-in-95"
							style={{
								boxShadow: "0 24px 50px -12px rgba(0,0,0,0.35)",
							}}
						>
							{/* Header: Track role & step progress */}
							<div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[var(--line)]">
								<div className="flex items-center gap-2">
									<div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-bold">
										{currentStepIndex + 1}
									</div>
									<div>
										<div className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
											<span>{catalog.roleTitle}</span>
											<span>•</span>
											<span>Шаг {currentStepIndex + 1} из {catalog.steps.length}</span>
										</div>
									</div>
								</div>

								<div className="flex items-center gap-1">
									<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300">
										{currentStep.actionBadge}
									</span>
									<button
										type="button"
										onClick={handleSkip}
										className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
										title="Закрыть тур"
										aria-label="Закрыть тур"
										data-testid="tour-close-btn"
									>
										<X size={16} aria-hidden="true" />
									</button>
								</div>
							</div>

							{/* Step Content */}
							<h3 className="text-sm font-bold text-[var(--ink)] mb-2 flex items-center gap-2">
								{currentStep.title}
							</h3>
							<p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">
								{currentStep.description}
							</p>

							{/* Clinical Tip Banner */}
							<div className="p-2.5 mb-4 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-start gap-2">
								<CheckCircle2 size={15} className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
								<p className="m-0 text-[11px] text-teal-900 dark:text-teal-200 leading-snug">
									{currentStep.clinicalTip}
								</p>
							</div>

							{/* Action Footer */}
							<div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={handleSkip}
										className="text-[11px] text-[var(--muted)] hover:text-[var(--ink)] px-2 py-1 rounded-lg transition-colors cursor-pointer"
										data-testid="tour-skip-btn"
									>
										Понятно, я сам
									</button>
								</div>

								<div className="flex items-center gap-2">
									{currentStepIndex > 0 && (
										<button
											type="button"
											onClick={handlePrev}
											className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] flex items-center gap-1 transition-all cursor-pointer"
										>
											<ArrowLeft size={14} aria-hidden="true" />
											Назад
										</button>
									)}

									<button
										type="button"
										onClick={handleNext}
										className="py-1.5 px-4 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
										data-testid="tour-next-btn"
									>
										<span>
											{currentStepIndex < catalog.steps.length - 1 ? "Далее" : "Завершить тур"}
										</span>
										<ArrowRight size={14} aria-hidden="true" />
									</button>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</>
	);
}
