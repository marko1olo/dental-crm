/**
 * TreatmentPlanToolbar.tsx — эргономичная однострочная командная панель плана лечения DENTE CRM:
 * - Ровно 1 строка высотой 32–36px (Закон Хика и Закон Миллера, Mandate 8d).
 * - Слева: статусы в 1 клик (Черновик / Согласован / В работе / Завершен).
 * - По центру: переключатель вкладок представления (3 сценария / Этапы / 4 Фазы / Дорожная карта).
 * - Справа: 1 главная кнопка (Primary CTA: «Согласовать и подписать») + экспорт в кассу + компактное меню опций `...`.
 */

import React, { useState, useRef, useEffect } from "react";
import {
	Bot,
	Check,
	Clock,
	CreditCard,
	FileText,
	Layers,
	MoreVertical,
	PackageCheck,
	PenTool,
	Percent,
	Receipt,
	Save,
	Send,
	ShieldCheck,
	Sparkles,
	UserCheck,
	Zap,
} from "lucide-react";
import { DentalLabOrder } from "../icons/DentalIcons.js";
import type { CopilotCommandType } from "../../services/ai/treatmentPlanCopilot";
import type { ClinicalBundleId } from "./treatmentPlanBundlesEngine";
import type { TreatmentPlanStatus } from "./types";
import { TreatmentPlanDiscountsModal } from "./TreatmentPlanDiscountsModal";
import { TreatmentPlanCopilotModal } from "./TreatmentPlanCopilotModal";

export interface TreatmentPlanToolbarProps {
	readonly planAgeDays: number;
	readonly planStatus: TreatmentPlanStatus;
	readonly onStatusTransition: (newStatus: TreatmentPlanStatus) => void;
	readonly patientName: string;
	readonly totalItemsCount: number;
	readonly activeViewTab: "3tier" | "stages" | "phased4" | "roadmap";
	readonly setActiveViewTab: (tab: "3tier" | "stages" | "phased4" | "roadmap") => void;
	readonly signedAgreement: unknown;
	readonly onOpenSignModal: () => void;
	readonly onExportCashier: () => void;
	readonly onGenerateCbctAutoPlan: () => void;
	readonly initialOptionsMenuOpen?: boolean;
	readonly onOpenInvoiceModal: () => void;
	readonly onOpenFiscalModal: () => void;
	readonly onOpenCuratorModal: () => void;
	readonly curatorFullName?: string;
	readonly onOpenPresenterModal: () => void;
	readonly onOpenComparatorModal?: (() => void) | undefined;
	readonly onOpenStagePaymentModal?: (() => void) | undefined;
	readonly onOpenPriceValidatorModal?: (() => void) | undefined;
	readonly onOpenContractPrint: () => void;
	readonly onOpenLabOrder: () => void;
	readonly onOneClickLabOrder: () => void;
	readonly isSaving: boolean;
	readonly onSavePlanToDatabase: () => void;
	readonly discountPercent: number;
	readonly setDiscountPercent: (pct: number) => void;
	readonly bonusPointsToUseRub: number;
	readonly setBonusPointsToUseRub: (val: number) => void;
	readonly patientBalanceRub: number;
	readonly customStages: readonly unknown[] | null;
	readonly cbctAutoPlanTiers: unknown | null;
	readonly copilotFeedback: string | null;
	readonly setCopilotFeedback: (feedback: string | null) => void;
	readonly isCopilotExecuting: boolean;
	readonly onExecuteCopilot: (actionId: CopilotCommandType | string) => void;
	readonly onResetPlan: () => void;
	readonly onOpenChairsideBundlesModal: () => void;
	readonly onApplyClinicalBundle: (bundleId: ClinicalBundleId) => void;
	readonly orthopedicTeeth: readonly number[];
	readonly planGrossKopecks?: number | undefined;
}

export const TreatmentPlanToolbar: React.FC<TreatmentPlanToolbarProps> = ({
	planAgeDays,
	planStatus,
	onStatusTransition,
	patientName,
	totalItemsCount,
	activeViewTab,
	setActiveViewTab,
	signedAgreement,
	onOpenSignModal,
	onExportCashier,
	onGenerateCbctAutoPlan,
	initialOptionsMenuOpen = false,
	onOpenInvoiceModal,
	onOpenFiscalModal,
	onOpenCuratorModal,
	curatorFullName,
	onOpenPresenterModal,
	onOpenComparatorModal,
	onOpenStagePaymentModal,
	onOpenPriceValidatorModal,
	onOpenContractPrint,
	onOpenLabOrder,
	onOneClickLabOrder,
	isSaving,
	onSavePlanToDatabase,
	discountPercent,
	setDiscountPercent,
	bonusPointsToUseRub,
	setBonusPointsToUseRub,
	patientBalanceRub,
	customStages,
	cbctAutoPlanTiers,
	copilotFeedback,
	setCopilotFeedback,
	isCopilotExecuting,
	onExecuteCopilot,
	onResetPlan,
	onOpenChairsideBundlesModal,
	onApplyClinicalBundle,
	orthopedicTeeth,
	planGrossKopecks,
}) => {
	const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState<boolean>(initialOptionsMenuOpen);
	const [isDiscountsModalOpen, setIsDiscountsModalOpen] = useState<boolean>(false);
	const [isCopilotModalOpen, setIsCopilotModalOpen] = useState<boolean>(false);
	const optionsMenuRef = useRef<HTMLDivElement>(null);

	// Закрытие выпадающего меню опций при клике снаружи
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
				setIsOptionsMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<>
			{/* Информационная полоса контекста: пациент и протокол (тонкий разделитель) */}
			<div className="flex items-center justify-between gap-2 px-1 text-xs text-[var(--muted,#64748b)] pb-1 border-b border-[var(--line,var(--border,#cbd5e1))]/40">
				<div className="flex items-center gap-2 min-w-0 flex-wrap">
					<div className="p-1 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] shrink-0">
						<Layers size={13} />
					</div>
					<span className="font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
						Комплексный план лечения
					</span>
					<span className="hidden sm:inline text-[var(--line-subtle)]">·</span>
					<span className="truncate">
						Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong>
					</span>
				</div>
				<div className="flex items-center gap-1.5 shrink-0 text-[11px] font-medium">
					<span className="px-2 py-0.2 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-mono font-bold border border-cyan-500/20">
						СтАР
					</span>
					<span className="hidden sm:inline">
						{totalItemsCount} процедур · 3 этапа
					</span>
				</div>
			</div>

			{/* Ровно 1 строка тулбара высотой 32–36px (Закон Хика и Миллера) */}
			<div
				className="treatment-plan-toolbar flex items-center justify-between gap-2 min-h-[36px] h-9 px-0.5 border-b border-[var(--line,var(--border,#cbd5e1))] flex-nowrap overflow-x-auto max-w-full"
				data-testid="treatment-plan-toolbar"
			>
				{/* 1. Слева: Статусы в 1 клик (Мандат 8e / 8c) */}
				<div className="flex items-center gap-1.5 shrink-0">
					<div
						className="inline-flex items-center p-[2px] rounded-[9px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] shadow-2xs shrink-0 gap-0.5"
						role="group"
						aria-label="Статус плана лечения"
						data-testid="treatment-plan-status-control"
					>
						<button
							type="button"
							onClick={() => onStatusTransition("draft")}
							data-testid="tp-status-btn-draft"
							className={`h-7 px-2.5 rounded-[6px] text-xs font-medium transition-all cursor-pointer whitespace-nowrap touch-manipulation ${
								planStatus === "draft"
									? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
							}`}
							title="Черновик плана лечения"
						>
							Черновик
						</button>
						<button
							type="button"
							onClick={() => onStatusTransition("agreed")}
							data-testid="tp-status-btn-agreed"
							className={`h-7 px-2.5 rounded-[6px] text-xs font-medium transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap touch-manipulation ${
								planStatus === "agreed"
									? "bg-emerald-600 text-white font-semibold shadow-2xs"
									: "text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-[var(--paper)]/50"
							}`}
							title="План согласован с пациентом"
						>
							<Check size={12} />
							<span>Согласован</span>
						</button>
						<button
							type="button"
							onClick={() => onStatusTransition("in_progress")}
							data-testid="tp-status-btn-in-progress"
							className={`h-7 px-2.5 rounded-[6px] text-xs font-medium transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap touch-manipulation ${
								planStatus === "in_progress"
									? "bg-teal-600 text-white font-semibold shadow-2xs"
									: "text-teal-700 dark:text-teal-400 hover:text-teal-800 hover:bg-[var(--paper)]/50"
							}`}
							title="План переведен в работу"
						>
							<Zap size={12} />
							<span>В работе</span>
						</button>
						<button
							type="button"
							onClick={() => onStatusTransition("completed")}
							data-testid="tp-status-btn-completed"
							className={`h-7 px-2.5 rounded-[6px] text-xs font-medium transition-all cursor-pointer whitespace-nowrap touch-manipulation ${
								planStatus === "completed"
									? "bg-blue-600 text-white font-semibold shadow-2xs"
									: "text-blue-700 dark:text-blue-400 hover:text-blue-800 hover:bg-[var(--paper)]/50"
							}`}
							title="Лечение по плану завершено"
						>
							Завершен
						</button>
					</div>

					{planAgeDays > 30 && (
						<span
							className="h-7 px-2 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-200 text-[11px] font-bold border border-amber-500/30 inline-flex items-center gap-1 shadow-2xs shrink-0"
							title="План составлен более 30 дней назад, цены могут быть скорректированы."
						>
							<Clock size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span className="hidden md:inline">&gt;30 дней</span>
						</span>
					)}
				</div>

				{/* 2. По центру: Переключатель вкладок представления (3 сценария / Этапы / Дорожная карта) */}
				<div className="inline-flex items-center p-[2px] rounded-[9px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] shrink-0 gap-0.5">
					<button
						type="button"
						onClick={() => setActiveViewTab("3tier")}
						data-testid="tp-tab-3tier"
						className={`h-7 px-2.5 sm:px-3 rounded-[6px] text-xs font-medium transition-all cursor-pointer touch-manipulation whitespace-nowrap shrink-0 ${
							activeViewTab === "3tier"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						title="3 сценария комплексного лечения (Эконом, Оптимум, Премиум)"
					>
						3 Сценария
					</button>
					<button
						type="button"
						onClick={() => setActiveViewTab("stages")}
						data-testid="tp-tab-stages"
						className={`h-7 px-2.5 sm:px-3 rounded-[6px] text-xs font-medium transition-all cursor-pointer touch-manipulation whitespace-nowrap shrink-0 ${
							activeViewTab === "stages"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						title="Поэтапный план (Этапы I, II, III)"
					>
						Этапы
					</button>
					<button
						type="button"
						onClick={() => setActiveViewTab("phased4")}
						data-testid="tp-tab-phased4"
						className={`h-7 px-2 sm:px-2.5 rounded-[6px] text-xs font-medium transition-all cursor-pointer touch-manipulation whitespace-nowrap shrink-0 ${
							activeViewTab === "phased4"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						title="4 клинические фазы лечения"
					>
						4 Фазы
					</button>
					<button
						type="button"
						onClick={() => setActiveViewTab("roadmap")}
						data-testid="tp-tab-roadmap"
						className={`h-7 px-2.5 sm:px-3 rounded-[6px] text-xs font-medium transition-all cursor-pointer touch-manipulation whitespace-nowrap shrink-0 ${
							activeViewTab === "roadmap"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						title="Дорожная карта и таймлайн визитов"
					>
						Дорожная карта
					</button>
				</div>

				{/* 3. Справа: 1 главная кнопка (Primary CTA) + экспорт в кассу + меню опций `...` */}
				<div className="flex items-center gap-1.5 shrink-0">
					{/* Primary Action: «Согласовать и подписать» либо бейдж «ПОДПИСАНО» */}
					{signedAgreement ? (
						<div
							className="flex items-center gap-1 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold h-8 touch-manipulation whitespace-nowrap shrink-0"
							data-testid="tp-signed-badge"
						>
							<ShieldCheck size={13} />
							<span>ПОДПИСАНО</span>
						</div>
					) : (
						<button
							type="button"
							onClick={onOpenSignModal}
							className="primary-button h-8 flex items-center gap-1 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-xs active:scale-98 shrink-0 whitespace-nowrap touch-manipulation"
							title="Согласовать и подписать смету с пациентом"
							data-testid="tp-sign-btn"
						>
							<PenTool size={13} />
							<span>Согласовать и подписать</span>
						</button>
					)}

					{/* 1-Click экспорт счета в кассу */}
					<button
						type="button"
						onClick={onExportCashier}
						className={
							signedAgreement
								? "primary-button h-8 flex items-center gap-1 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-xs active:scale-98 shrink-0 whitespace-nowrap touch-manipulation"
								: "h-8 flex items-center gap-1 px-2.5 rounded-lg text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 shadow-2xs cursor-pointer transition-colors touch-manipulation whitespace-nowrap shrink-0"
						}
						title="Мгновенно отправить счет кассиру"
						data-testid="tp-quick-cashier-btn"
					>
						<Send size={13} />
						<span className="hidden sm:inline">В кассу</span>
					</button>

					{/* Компактное меню опций `...` (MoreVertical) для всех вторичных действий */}
					<div className="relative inline-flex items-center" ref={optionsMenuRef}>
						<button
							type="button"
							onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
							className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)] cursor-pointer flex items-center justify-center shrink-0 shadow-2xs transition-colors touch-manipulation"
							title="Дополнительные студии, печать и опции"
							aria-label="Опции плана лечения"
							aria-expanded={isOptionsMenuOpen}
							data-testid="treatment-plan-options-menu-btn"
						>
							<MoreVertical size={14} className="text-[var(--teal,var(--brand-primary))]" />
						</button>

						<div
							className={`absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl shadow-2xl min-w-[270px] text-xs ${
								isOptionsMenuOpen ? "animate-in fade-in zoom-in-95 duration-100" : "hidden"
							}`}
							role="menu"
							aria-hidden={!isOptionsMenuOpen}
						>
							{/* Быстрые действия */}
							<button
								type="button"
								onClick={() => {
									onExportCashier();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="options-menu-export-cashier-btn"
							>
								<Send size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span>Отправить счет кассиру</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onOpenInvoiceModal();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="tp-invoice-btn"
								title="Сформировать наряд / счет на оплату с контролем цен и защитой сметы"
							>
								<Receipt size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Счет / Наряд на оплату</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onOpenFiscalModal();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="tp-fiscal-btn"
								title="Принять оплату (карты, СБП QR, наличные) и пробить кассовый чек"
							>
								<ShieldCheck size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Кассовый чек & Оплата</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onSavePlanToDatabase();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="treatment-plan-save-btn"
								title="Сохранить план лечения в базе данных"
							>
								<Save size={14} className={`text-[var(--teal,var(--brand-primary))] shrink-0 ${isSaving ? "animate-spin" : ""}`} />
								<span>{isSaving ? "Сохранение..." : "Сохранить план в базу"}</span>
							</button>

							<div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1.5">
								Финансы и рассрочка
							</div>

							<button
								type="button"
								onClick={() => {
									onOpenStagePaymentModal?.();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="options-menu-installment-btn"
								title="Калькулятор банковской рассрочки 0% и графика платежей"
							>
								<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span>Калькулятор рассрочки 0%</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsDiscountsModalOpen(true);
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="options-menu-discount-btn"
							>
								<div className="flex items-center gap-2">
									<Percent size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
									<span>Скидки и бонусы пациента</span>
								</div>
								{discountPercent > 0 && (
									<span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
										-{discountPercent}%
									</span>
								)}
							</button>

							<button
								type="button"
								onClick={() => {
									onOpenCuratorModal();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="options-menu-curator-btn"
							>
								<div className="flex items-center gap-2">
									<UserCheck size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
									<span className="font-semibold">Куратор лечения</span>
								</div>
								{curatorFullName ? (
									<span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shrink-0 border border-indigo-500/20">
										{curatorFullName.split(" ")[0]}
									</span>
								) : (
									<span className="text-[11px] px-1 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0">
										Назначить
									</span>
								)}
							</button>

							<div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1.5">
								Клинические инструменты и ИИ
							</div>

							<button
								type="button"
								onClick={() => {
									onGenerateCbctAutoPlan();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="options-menu-cbct-autoplan-btn"
							>
								<Sparkles size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
								<span>Автоплан по КЛКТ (3 сценария)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsCopilotModalOpen(true);
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="module-copilot-ai-audit-btn"
								title="Открыть ИИ-Ассистент врача, пресеты СтАР и аудит"
							>
								<Bot size={14} className="text-amber-500 shrink-0" />
								<span>AI Copilot & Клинический аудит</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onOpenChairsideBundlesModal();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="open-chairside-bundles-modal-btn"
								title="Открыть клинические пакеты услуг у кресла («Все включено»)"
							>
								<PackageCheck size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Клинические пакеты («Все включено»)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onOpenPresenterModal();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="options-menu-presenter-btn"
							>
								<Bot size={14} className="text-amber-500 shrink-0" />
								<span>Презентация пациенту (2-й экран)</span>
							</button>

							{onOpenComparatorModal && (
								<button
									type="button"
									onClick={() => {
										onOpenComparatorModal();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
									role="menuitem"
									data-testid="options-menu-comparator-btn"
								>
									<Layers size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
									<span>Сравнение 3 вариантов (Смета)</span>
								</button>
							)}

							<div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1.5">
								Документы и производство
							</div>

							<button
								type="button"
								onClick={() => {
									onOpenContractPrint();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="options-menu-contract-print-btn"
							>
								<FileText size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Договор и смета (QR)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onOpenLabOrder();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="lab-work-order-btn"
							>
								<DentalLabOrder size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Наряд-заказ в ЗТЛ</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onOneClickLabOrder();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="lab-work-order-one-click-btn"
							>
								<Zap size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
								<span>Наряд ЗТЛ (Цирконий A2)</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Модальные окна скидок и ИИ-копайлота */}
			<TreatmentPlanDiscountsModal
				isOpen={isDiscountsModalOpen}
				onClose={() => setIsDiscountsModalOpen(false)}
				discountPercent={discountPercent}
				setDiscountPercent={setDiscountPercent}
				bonusPointsToUseRub={bonusPointsToUseRub}
				setBonusPointsToUseRub={setBonusPointsToUseRub}
				patientBalanceRub={patientBalanceRub}
				planGrossKopecks={planGrossKopecks ?? 0}
			/>

			<TreatmentPlanCopilotModal
				isOpen={isCopilotModalOpen}
				onClose={() => setIsCopilotModalOpen(false)}
				isCopilotExecuting={isCopilotExecuting}
				onExecuteCopilot={onExecuteCopilot}
				onOpenPresenterModal={onOpenPresenterModal}
				onResetPlan={onResetPlan}
				hasCustomModifications={Boolean(customStages || cbctAutoPlanTiers)}
				copilotFeedback={copilotFeedback}
				setCopilotFeedback={setCopilotFeedback}
				stages={customStages as any}
			/>
		</>
	);
};

export default TreatmentPlanToolbar;
