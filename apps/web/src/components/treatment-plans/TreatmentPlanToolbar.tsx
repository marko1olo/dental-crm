/**
 * TreatmentPlanToolbar.tsx — верхняя командная панель плана лечения DENTE CRM:
 * статус (1 клик), вкладки отображения (3 сценария / этапы / 4 фазы), экспорт в кассу,
 * автоплан по КЛКТ, меню опций, сохранение, скидки/бонусы, AI Copilot и клинические пакеты «под ключ».
 */

import React, { useState, useRef, useEffect } from "react";
import {
	Bot,
	Check,
	ChevronDown,
	Clock,
	Coins,
	FileCheck,
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
	readonly onOpenComparatorModal: () => void;
	readonly onOpenStagePaymentModal: () => void;
	readonly onOpenPriceValidatorModal: () => void;
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
	readonly onExecuteCopilot: (actionId: CopilotCommandType) => void;
	readonly onResetPlan: () => void;
	readonly onOpenChairsideBundlesModal: () => void;
	readonly onApplyClinicalBundle: (bundleId: ClinicalBundleId) => void;
	readonly orthopedicTeeth: readonly number[];
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
}) => {
	const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState<boolean>(initialOptionsMenuOpen);
	const [isDiscountsModalOpen, setIsDiscountsModalOpen] = useState<boolean>(false);
	const [isCopilotModalOpen, setIsCopilotModalOpen] = useState<boolean>(false);
	const optionsMenuRef = useRef<HTMLDivElement>(null);

	// Close options dropdown on outside click
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
			{/* Top Bar: Title & Global Quick Actions */}
			<div className="flex flex-col gap-2 pb-2 border-b border-[var(--line,var(--border,#cbd5e1))]">
				{/* Row 1: Clinical Header, Protocol Status & Patient Info */}
				<div className="flex flex-wrap items-center justify-between gap-2.5">
					<div className="flex items-center gap-2.5 min-w-0 flex-wrap">
						<div className="p-2 sm:p-2.5 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal,var(--brand-primary))]/20 shrink-0">
							<Layers size={18} />
						</div>
						<div className="flex items-center gap-2 flex-wrap min-w-0">
							<h2 className="text-base sm:text-lg font-black text-[var(--ink,#0f172a)] whitespace-nowrap m-0">
								Комплексный план лечения
							</h2>
							<span className="text-[12px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-mono font-bold border border-cyan-500/20 shrink-0">
								Клинический протокол
							</span>
							<span className="text-[12px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold border border-emerald-500/20 shrink-0">
								СтАР
							</span>
							{planAgeDays > 30 && (
								<span
									className="text-[12px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-200 font-bold border border-amber-500/30 inline-flex items-center gap-1 shadow-2xs shrink-0"
									title="План составлен более 30 дней назад, цены могут быть скорректированы."
								>
									<Clock size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
									<span>План составлен более 30 дней назад</span>
								</span>
							)}
						</div>

						{/* 1-Click Status Transitions (Mandates 8e, 8c — Doctor Autonomy & Zero Barriers) */}
						<div
							className="inline-flex items-center p-[3px] rounded-[10px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] shadow-2xs shrink-0 gap-1 overflow-x-auto max-w-full"
							role="group"
							aria-label="Статус плана лечения"
							data-testid="treatment-plan-status-control"
						>
							<button
								type="button"
								onClick={() => onStatusTransition("draft")}
								data-testid="tp-status-btn-draft"
								className={`h-7 px-3 rounded-[7px] text-[12.5px] font-medium transition-all cursor-pointer whitespace-nowrap touch-manipulation ${
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
								className={`h-7 px-3 rounded-[7px] text-[12.5px] font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap touch-manipulation ${
									planStatus === "agreed"
										? "bg-emerald-600 text-white font-semibold shadow-2xs"
										: "text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-[var(--paper)]/50"
								}`}
								title="План согласован с пациентом"
							>
								<Check size={13} />
								<span>Согласован</span>
							</button>
							<button
								type="button"
								onClick={() => onStatusTransition("in_progress")}
								data-testid="tp-status-btn-in-progress"
								className={`h-7 px-3 rounded-[7px] text-[12.5px] font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap touch-manipulation ${
									planStatus === "in_progress"
										? "bg-teal-600 text-white font-semibold shadow-2xs"
										: "text-teal-700 dark:text-teal-400 hover:text-teal-800 hover:bg-[var(--paper)]/50"
								}`}
								title="План переведен в работу"
							>
								<Zap size={13} />
								<span>В работе</span>
							</button>
							<button
								type="button"
								onClick={() => onStatusTransition("completed")}
								data-testid="tp-status-btn-completed"
								className={`h-7 px-3 rounded-[7px] text-[12.5px] font-medium transition-all cursor-pointer whitespace-nowrap touch-manipulation ${
									planStatus === "completed"
										? "bg-blue-600 text-white font-semibold shadow-2xs"
										: "text-blue-700 dark:text-blue-400 hover:text-blue-800 hover:bg-[var(--paper)]/50"
								}`}
								title="Лечение по плану завершено"
							>
								Завершен
							</button>
						</div>
					</div>

					<p
						className="text-xs text-[var(--muted,#64748b)] truncate m-0 shrink-0"
						title={`Пациент: ${patientName} · ${totalItemsCount} процедур · 3 клинических этапа`}
					>
						Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong> ·{" "}
						{totalItemsCount} процедур · 3 этапа
					</p>
				</div>

				{/* Row 2: Clean 32px Command Bar — Tab Switcher (Left) & Actions (Right) */}
				<div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[var(--line,var(--border,#cbd5e1))]/50">
					{/* Tab Switcher: 3 Tiers vs Stages vs 4 Phases */}
					<div className="inline-flex items-center p-[3px] rounded-[10px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] shrink-0 gap-1">
						<button
							type="button"
							onClick={() => setActiveViewTab("3tier")}
							className={`h-7 px-3 rounded-[7px] text-[12.5px] font-medium transition-all cursor-pointer touch-manipulation whitespace-nowrap shrink-0 ${
								activeViewTab === "3tier"
									? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							3 Варианта
						</button>
						<button
							type="button"
							onClick={() => setActiveViewTab("stages")}
							className={`h-7 px-3 rounded-[7px] text-[12.5px] font-medium transition-all cursor-pointer touch-manipulation whitespace-nowrap shrink-0 ${
								activeViewTab === "stages"
									? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Поэтапный (I, II, III)
						</button>
						<button
							type="button"
							onClick={() => setActiveViewTab("phased4")}
							data-testid="tp-tab-phased4"
							className={`h-7 px-3 rounded-[7px] text-[12.5px] font-medium transition-all cursor-pointer touch-manipulation whitespace-nowrap shrink-0 ${
								activeViewTab === "phased4"
									? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							4 Фазы
						</button>
						<button
							type="button"
							onClick={() => setActiveViewTab("roadmap")}
							data-testid="tp-tab-roadmap"
							className={`h-7 px-3 rounded-[7px] text-[12.5px] font-medium transition-all cursor-pointer touch-manipulation whitespace-nowrap shrink-0 ${
								activeViewTab === "roadmap"
									? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Дорожная карта
						</button>
					</div>

					{/* Action Buttons Right Group */}
					<div className="flex flex-wrap items-center gap-2 shrink-0">
						{/* Secondary 1: Digital Signature Indicator / Button */}
						{signedAgreement ? (
							<div
								className="flex items-center gap-1.5 px-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[12.5px] font-semibold h-8 touch-manipulation whitespace-nowrap shrink-0"
								data-testid="tp-signed-badge"
							>
								<ShieldCheck size={14} />
								<span>ПОДПИСАНО</span>
							</div>
						) : (
							<button
								type="button"
								onClick={onOpenSignModal}
								className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-[13px] font-medium bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] cursor-pointer transition-colors touch-manipulation shadow-2xs whitespace-nowrap shrink-0"
								title="Открыть окно цифровой подписи согласия"
								data-testid="tp-sign-btn"
							>
								<PenTool size={14} />
								<span>Подписать</span>
							</button>
						)}

						{/* Secondary 2: Quick Export to Cashier */}
						<button
							type="button"
							onClick={onExportCashier}
							className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-[13px] font-medium text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 shadow-2xs cursor-pointer transition-colors touch-manipulation whitespace-nowrap shrink-0"
							title="Мгновенно отправить счет кассиру"
							data-testid="tp-quick-cashier-btn"
						>
							<Send size={14} />
							<span>В кассу</span>
						</button>

						{/* Secondary 3: 1-Click CBCT Auto-Plan (Findings to 3-Tier Estimate) */}
						<button
							type="button"
							onClick={onGenerateCbctAutoPlan}
							className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-[13px] font-medium text-amber-900 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 shadow-2xs cursor-pointer transition-colors touch-manipulation whitespace-nowrap shrink-0"
							title="Сформировать 3 сценария плана лечения на основе находок 3D КЛКТ (имплантация, синус-лифтинг, санация, ортопедия)"
							data-testid="generate-cbct-auto-plan-btn"
						>
							<Sparkles size={14} className="text-amber-600 dark:text-amber-400" />
							<span>Автоплан по КЛКТ</span>
						</button>

						{/* Secondary 4: Overflow Dropdown Menu [⋮ Опции] */}
						<div className="relative inline-flex items-center" ref={optionsMenuRef}>
							<button
								type="button"
								onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
								className="h-8 px-3 rounded-lg text-[13px] font-medium border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)] cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs transition-colors touch-manipulation whitespace-nowrap"
								title="Дополнительные студии, валидация и печать"
								aria-label="Опции плана лечения"
								aria-expanded={isOptionsMenuOpen}
								data-testid="treatment-plan-options-menu-btn"
							>
								<MoreVertical size={14} className="text-[var(--teal,var(--brand-primary))]" />
								<span className="hidden sm:inline">Опции</span>
							</button>

						<div
							className={`absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl shadow-2xl min-w-[260px] text-xs ${
								isOptionsMenuOpen ? "animate-in fade-in zoom-in-95 duration-100" : "hidden"
							}`}
							role="menu"
							aria-hidden={!isOptionsMenuOpen}
						>
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

							<div className="px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
								Специализированные студии
							</div>
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
									<span className="text-[12px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
										-{discountPercent}%
									</span>
								)}
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
									onOpenCuratorModal();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
								data-testid="options-menu-curator-btn"
							>
								<div className="flex items-center gap-2">
									<UserCheck size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
									<span className="font-semibold">Куратор лечения (воронка и комиссия)</span>
								</div>
								{curatorFullName ? (
									<span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shrink-0 border border-indigo-500/20">
										{curatorFullName.split(" ")[0]}
									</span>
								) : (
									<span className="text-[12px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0">
										Назначить
									</span>
								)}
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
								<span>Презентация пациенту (2-й экран & ИИ)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onOpenComparatorModal();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
							>
								<Sparkles size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Студия 3-Tier сравнения</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onOpenStagePaymentModal();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
							>
								<Coins size={14} className="text-amber-500" />
								<span>Эскроу & Поэтапная оплата</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onOpenPriceValidatorModal();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]"
								role="menuitem"
							>
								<FileCheck size={14} className="text-emerald-600" />
								<span>Клинический валидатор СтАР</span>
							</button>

							<div className="px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1.5">
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
								<Zap size={14} className="text-amber-600 dark:text-amber-400" />
								<span>Наряд ЗТЛ (Цирконий A2)</span>
							</button>
						</div>
					</div>

					{/* STRICTLY 1 DOMINANT PRIMARY ACTION: Save to DB with High-Contrast Teal in Light and Dark mode */}
					<button
						type="button"
						onClick={onSavePlanToDatabase}
						className="primary-button h-8 flex items-center gap-1.5 px-4 rounded-lg text-[13px] font-semibold cursor-pointer transition-all shadow-xs active:scale-98 shrink-0 whitespace-nowrap touch-manipulation"
						data-testid="treatment-plan-save-btn"
					>
						<Save size={14} className={isSaving ? "animate-spin" : ""} />
						<span>{isSaving ? "Сохранение..." : "Сохранить"}</span>
					</button>
				</div>
			</div>
		</div>

			{/* Decoupled Modals for Discounts and AI Copilot (Mandates 8p, 8d — Screen Height Budget <= 160-180px) */}
			<TreatmentPlanDiscountsModal
				isOpen={isDiscountsModalOpen}
				onClose={() => setIsDiscountsModalOpen(false)}
				discountPercent={discountPercent}
				setDiscountPercent={setDiscountPercent}
				bonusPointsToUseRub={bonusPointsToUseRub}
				setBonusPointsToUseRub={setBonusPointsToUseRub}
				patientBalanceRub={patientBalanceRub}
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
			/>
		</>
	);
};
