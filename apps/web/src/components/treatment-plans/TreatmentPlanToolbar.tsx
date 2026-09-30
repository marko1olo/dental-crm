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
import {
	COPILOT_PRESET_ACTIONS,
	type CopilotCommandType,
} from "../../services/ai/treatmentPlanCopilot";
import {
	CLINICAL_BUNDLES,
	type ClinicalBundleId,
} from "./treatmentPlanBundlesEngine";
import { ClinicalBundlesPanel } from "./ClinicalBundlesPanel";

export interface TreatmentPlanToolbarProps {
	readonly planAgeDays: number;
	readonly planStatus: "draft" | "agreed" | "in_progress" | "completed";
	readonly onStatusTransition: (newStatus: "draft" | "agreed" | "in_progress" | "completed") => void;
	readonly patientName: string;
	readonly totalItemsCount: number;
	readonly activeViewTab: "3tier" | "stages" | "phased4";
	readonly setActiveViewTab: (tab: "3tier" | "stages" | "phased4") => void;
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
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--line,var(--border,#cbd5e1))]">
				<div className="flex items-center gap-3 min-w-0 max-w-full">
					<div className="p-3 rounded-2xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal,var(--brand-primary))]/20 shrink-0">
						<Layers size={22} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap">
							<h2 className="text-lg font-black text-[var(--ink,#0f172a)] truncate">
								Комплексный план лечения
							</h2>
							<span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-mono font-bold border border-cyan-500/20 shrink-0">
								Клинический протокол
							</span>
							<span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold border border-emerald-500/20 shrink-0">
								СтАР
							</span>
							{planAgeDays > 30 && (
								<span
									className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-200 font-bold border border-amber-500/30 inline-flex items-center gap-1 shadow-2xs shrink-0"
									title="План составлен более 30 дней назад, цены могут быть скорректированы. Создание нарядов ЗТЛ, оказание услуг и оплата не блокируются (Мандат 8e)."
								>
									<Clock size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
									План составлен более 30 дней назад, цены могут быть скорректированы
								</span>
							)}

							{/* 1-Click Status Transitions (Mandates 8e, 8c — Doctor Autonomy & Zero Barriers) */}
							<div
								className="inline-flex items-center p-0.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))] shadow-2xs text-xs shrink-0"
								role="group"
								aria-label="Статус плана лечения"
								data-testid="treatment-plan-status-control"
							>
								<button
									type="button"
									onClick={() => onStatusTransition("draft")}
									data-testid="tp-status-btn-draft"
									className={`min-h-[26px] h-[26px] px-2.5 py-0 rounded-lg text-xs font-bold transition-all cursor-pointer ${
										planStatus === "draft"
											? "bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
									title="Черновик плана лечения"
								>
									Черновик
								</button>
								<button
									type="button"
									onClick={() => onStatusTransition("agreed")}
									data-testid="tp-status-btn-agreed"
									className={`min-h-[26px] h-[26px] px-2.5 py-0 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
										planStatus === "agreed"
											? "bg-emerald-600 text-white shadow-2xs"
											: "text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
									}`}
									title="План согласован с пациентом (1 клик)"
								>
									<Check size={12} />
									<span>Согласован</span>
								</button>
								<button
									type="button"
									onClick={() => onStatusTransition("in_progress")}
									data-testid="tp-status-btn-in-progress"
									className={`min-h-[26px] h-[26px] px-2.5 py-0 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
										planStatus === "in_progress"
											? "bg-teal-600 text-white shadow-2xs"
											: "text-teal-700 dark:text-teal-400 hover:text-teal-800"
									}`}
									title="План переведен в работу (1 клик)"
								>
									<Zap size={12} />
									<span>В работе</span>
								</button>
								<button
									type="button"
									onClick={() => onStatusTransition("completed")}
									data-testid="tp-status-btn-completed"
									className={`min-h-[26px] h-[26px] px-2.5 py-0 rounded-lg text-xs font-bold transition-all cursor-pointer ${
										planStatus === "completed"
											? "bg-blue-600 text-white shadow-2xs"
											: "text-blue-700 dark:text-blue-400 hover:text-blue-800"
									}`}
									title="Лечение по плану завершено"
								>
									Завершен
								</button>
							</div>
						</div>
						<p
							className="text-xs text-[var(--muted,#64748b)] truncate"
							title={`Пациент: ${patientName} · ${totalItemsCount} процедур · 3 клинических этапа`}
						>
							Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong> ·{" "}
							{totalItemsCount} процедур · 3 клинических этапа
						</p>
					</div>
				</div>

				{/* Global Buttons: View Toggles, Clean Hick's/Miller's Toolbar & Actions */}
				<div className="flex flex-wrap items-center gap-2">
					{/* Tab Switcher: 3 Tiers vs Stages vs 4 Phases */}
					<div className="inline-flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] max-w-full overflow-x-auto">
						<button
							type="button"
							onClick={() => setActiveViewTab("3tier")}
							className={`min-h-[44px] sm:min-h-[38px] sm:h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
								activeViewTab === "3tier"
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							3 Варианта
						</button>
						<button
							type="button"
							onClick={() => setActiveViewTab("stages")}
							className={`min-h-[44px] sm:min-h-[38px] sm:h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
								activeViewTab === "stages"
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Поэтапный (I, II, III)
						</button>
						<button
							type="button"
							onClick={() => setActiveViewTab("phased4")}
							data-testid="tp-tab-phased4"
							className={`min-h-[44px] sm:min-h-[38px] sm:h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
								activeViewTab === "phased4"
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							4 Фазы
						</button>
					</div>

					{/* Secondary 1: Digital Signature Indicator / Button */}
					{signedAgreement ? (
						<div
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold min-h-[44px] sm:min-h-[38px] sm:h-[38px] touch-manipulation"
							data-testid="tp-signed-badge"
						>
							<ShieldCheck size={16} />
							<span>ПОДПИСАНО</span>
						</div>
					) : (
						<button
							type="button"
							onClick={onOpenSignModal}
							className="min-h-[44px] sm:min-h-[38px] sm:h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] cursor-pointer transition-colors touch-manipulation shadow-xs"
							title="Открыть окно цифровой подписи согласия"
							data-testid="tp-sign-btn"
						>
							<PenTool size={14} />
							<span>Подписать</span>
						</button>
					)}

					{/* Secondary 2: Quick Export to Cashier (1 click) */}
					<button
						type="button"
						onClick={onExportCashier}
						className="min-h-[44px] sm:min-h-[38px] sm:h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 shadow-xs cursor-pointer transition-colors touch-manipulation"
						title="Мгновенно отправить счет кассиру в 1 клик (StomX / DentalPRO Parity)"
						data-testid="tp-quick-cashier-btn"
					>
						<Send size={15} />
						<span>В кассу</span>
					</button>

					{/* Secondary 3: 1-Click CBCT Auto-Plan (Findings to 3-Tier Estimate) */}
					<button
						type="button"
						onClick={onGenerateCbctAutoPlan}
						className="min-h-[44px] sm:min-h-[38px] sm:h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 shadow-xs cursor-pointer transition-colors touch-manipulation"
						title="Сформировать 3 сценария плана лечения на основе находок 3D КЛКТ (имплантация, синус-лифтинг, санация, ортопедия)"
						data-testid="generate-cbct-auto-plan-btn"
					>
						<Sparkles size={15} className="text-amber-600 dark:text-amber-400" />
						<span>Автоплан по КЛКТ</span>
					</button>

					{/* Secondary 4: Overflow Dropdown Menu [⋮ Опции] */}
					<div className="relative inline-flex items-center" ref={optionsMenuRef}>
						<button
							type="button"
							onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
							className="min-h-[44px] sm:min-h-[38px] sm:h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)] cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs transition-colors touch-manipulation"
							title="Дополнительные студии, валидация и печать"
							aria-label="Опции плана лечения"
							aria-expanded={isOptionsMenuOpen}
							data-testid="treatment-plan-options-menu-btn"
						>
							<MoreVertical size={15} className="text-[var(--teal,var(--brand-primary))]" />
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
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
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
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
								role="menuitem"
								data-testid="options-menu-export-cashier-btn"
							>
								<Send size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span>Отправить счет кассиру (1 клик)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onOpenInvoiceModal();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
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
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
								role="menuitem"
								data-testid="tp-fiscal-btn"
								title="Принять оплату (карты, СБП QR, наличные) и пробить кассовый чек"
							>
								<ShieldCheck size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Кассовый чек & Оплата</span>
							</button>

							<div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
								Специализированные студии
							</div>
							<button
								type="button"
								onClick={() => {
									onOpenCuratorModal();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
								role="menuitem"
								data-testid="options-menu-curator-btn"
							>
								<div className="flex items-center gap-2">
									<UserCheck size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
									<span className="font-semibold">Куратор лечения (воронка и комиссия)</span>
								</div>
								{curatorFullName ? (
									<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shrink-0 border border-indigo-500/20">
										{curatorFullName.split(" ")[0]}
									</span>
								) : (
									<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0">
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
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
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
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
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
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
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
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
								role="menuitem"
							>
								<FileCheck size={14} className="text-emerald-600" />
								<span>Клинический валидатор СтАР</span>
							</button>

							<div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1.5">
								Документы и производство
							</div>
							<button
								type="button"
								onClick={() => {
									onOpenContractPrint();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
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
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
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
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
								role="menuitem"
								data-testid="lab-work-order-one-click-btn"
							>
								<Zap size={14} className="text-amber-600 dark:text-amber-400" />
								<span>Наряд ЗТЛ в 1 клик (Цирконий A2)</span>
							</button>
						</div>
					</div>

					{/* STRICTLY 1 DOMINANT PRIMARY ACTION: Save to DB */}
					<button
						type="button"
						onClick={onSavePlanToDatabase}
						className="min-h-[44px] sm:min-h-[38px] sm:h-[38px] flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-[var(--teal-dark,var(--brand-primary))] hover:bg-[var(--teal,var(--brand-primary))] cursor-pointer transition-all shadow-md shadow-[var(--teal)]/20 active:scale-98 ml-auto touch-manipulation"
						data-testid="treatment-plan-save-btn"
					>
						<Save size={15} className={isSaving ? "animate-spin" : ""} />
						<span>{isSaving ? "Сохранение..." : "Сохранить"}</span>
					</button>
				</div>
			</div>

			{/* Service Area: Collapsible Toolbars (Mandates 8p, 8d — Screen Height Budget <= 160-180px) */}
			<div className="flex flex-col gap-2">
				{/* Financial Adjustments Bar: Discounts & Loyalty Bonus Points */}
				<details className="group rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))] text-xs overflow-hidden transition-all">
					<summary className="cursor-pointer text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] py-2 px-3.5 flex items-center justify-between gap-2 select-none list-none [&::-webkit-details-marker]:hidden">
						<div className="flex items-center gap-2 flex-wrap">
							<Percent size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
							<span>Скидки и бонусы пациента</span>
							{discountPercent > 0 && (
								<span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
									-{discountPercent}%
								</span>
							)}
							{bonusPointsToUseRub > 0 && (
								<span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
									-{bonusPointsToUseRub.toLocaleString("ru-RU")} ₽
								</span>
							)}
						</div>
						<div className="flex items-center gap-2 text-[11px] text-[var(--muted,#64748b)]">
							<Coins size={13} className="text-amber-500 shrink-0" />
							<span className="font-mono">{patientBalanceRub.toLocaleString("ru-RU")} ₽</span>
							<ChevronDown size={14} className="transition-transform group-open:rotate-180" />
						</div>
					</summary>
					<div className="p-3.5 pt-1.5 border-t border-[var(--line,var(--border,#cbd5e1))] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						{/* Quick Discounts */}
						<div className="flex items-center gap-2">
							<span className="font-semibold text-[var(--muted,#64748b)]">Скидка:</span>
							<div className="flex items-center gap-1 flex-wrap">
								{[0, 5, 10, 15, 20, 50, 100].map((pct) => (
									<button
										key={pct}
										type="button"
										onClick={() => setDiscountPercent(pct)}
										title={
											pct === 100
												? "100% скидка: гарантийные переделки и персонал (без паролей и согласований)"
												: `Применить скидку ${pct}%`
										}
										className={`px-2.5 py-1 min-h-[44px] sm:min-h-[32px] inline-flex items-center justify-center rounded-lg font-mono font-bold text-xs cursor-pointer transition-all ${
											discountPercent === pct
												? pct === 100
													? "bg-emerald-600 text-white shadow-xs"
													: "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
												: pct === 100
													? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 border border-emerald-500/30"
													: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))]"
										}`}
									>
										{pct === 100 ? "100% (Гарантия)" : `${pct}%`}
									</button>
								))}
								{discountPercent === 100 && (
									<span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 ml-1">
										0 ₽ (Гарантия / Персонал)
									</span>
								)}
								<div className="inline-flex items-center gap-1 ml-1.5" title="Произвольная скидка врача (0-100%) без мастер-паролей (Мандат 8e)">
									<input
										type="number"
										min="0"
										max="100"
										value={discountPercent}
										onChange={(e) => {
											const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
											setDiscountPercent(val);
										}}
										className="w-14 min-h-[32px] h-8 px-1.5 text-xs font-mono font-bold rounded-lg border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-center focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
										placeholder="%"
									/>
									<span className="text-xs text-[var(--muted,#64748b)] font-bold">%</span>
								</div>
							</div>
						</div>

						{/* Loyalty Points / Patient Deposit */}
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-1.5">
								<Coins size={14} className="text-amber-500" />
								<span className="text-[var(--muted,#64748b)]">
									Баланс/Бонусы:{" "}
									<strong className="font-mono text-[var(--ink,#0f172a)]">
										{patientBalanceRub.toLocaleString("ru-RU")} ₽
									</strong>
								</span>
							</div>

							{patientBalanceRub > 0 && (
								<div className="flex items-center gap-1.5">
									<input
										type="number"
										min={0}
										max={patientBalanceRub}
										value={bonusPointsToUseRub || ""}
										onChange={(e) => {
											const val = Math.max(0, Math.min(patientBalanceRub, Number(e.target.value) || 0));
											setBonusPointsToUseRub(val);
										}}
										placeholder="Списать ₽"
										className="w-24 min-h-[44px] sm:min-h-[32px] px-2 py-1 text-xs font-mono rounded-lg border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
									/>
									{bonusPointsToUseRub > 0 && (
										<button
											type="button"
											onClick={() => setBonusPointsToUseRub(0)}
											className="min-h-[44px] sm:min-h-0 px-2 py-1 text-[11px] text-rose-500 hover:underline cursor-pointer inline-flex items-center"
										>
											Сбросить
										</button>
									)}
								</div>
							)}
						</div>
					</div>
				</details>

				{/* AI Copilot Clinical Assistant Bar */}
				<details className="group rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] text-xs shadow-xs overflow-hidden transition-all">
					<summary className="cursor-pointer text-xs font-bold text-[var(--teal-dark,var(--teal))] hover:text-[var(--ink,#0f172a)] py-2 px-3.5 flex items-center justify-between gap-2 select-none list-none [&::-webkit-details-marker]:hidden">
						<div className="flex items-center gap-2 flex-wrap">
							<Sparkles size={15} className="text-amber-500 shrink-0" />
							<span>AI Copilot (Ассистент врача & Аудит)</span>
							{customStages && (
								<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
									AI-модификации
								</span>
							)}
							{copilotFeedback && (
								<span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 border border-indigo-500/20 truncate max-w-[240px]">
									{copilotFeedback}
								</span>
							)}
						</div>
						<div className="flex items-center gap-2 text-[11px] text-[var(--muted,#64748b)]">
							<span className="hidden sm:inline">Пресеты СтАР, Оптимизация, Аудит</span>
							<ChevronDown size={14} className="transition-transform group-open:rotate-180 text-[var(--ink,#0f172a)]" />
						</div>
					</summary>
					<div className="p-3.5 pt-1.5 border-t border-[var(--line,var(--border,#cbd5e1))] flex flex-col gap-2.5">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
							<div className="flex items-center gap-2 flex-wrap">
								{COPILOT_PRESET_ACTIONS.map((action) => (
									<button
										key={action.id}
										type="button"
										disabled={isCopilotExecuting}
										onClick={() => onExecuteCopilot(action.id)}
										className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-xl font-bold bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--teal-soft,var(--paper-soft))] hover:text-[var(--teal-dark,var(--teal))] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-all disabled:opacity-50 shadow-2xs text-[11px] inline-flex items-center justify-center touch-manipulation"
										title={action.description}
										data-testid={`module-copilot-btn-${action.id}`}
									>
										{action.title}
									</button>
								))}

								<button
									type="button"
									onClick={onOpenPresenterModal}
									className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-xl font-bold bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer transition-all shadow-2xs text-[11px] inline-flex items-center justify-center gap-1.5 touch-manipulation"
									title="Запустить клиническую валидацию СтАР, проверку анатомии FDI и генерацию объяснения для пациента"
									data-testid="module-copilot-ai-audit-btn"
								>
									<Bot size={13} className="text-amber-600 dark:text-amber-400" />
									<span>ИИ-Аудит & Презентация</span>
								</button>
							</div>

							<div className="flex items-center gap-2 shrink-0">
								{(customStages || cbctAutoPlanTiers) && (
									<button
										type="button"
										onClick={onResetPlan}
										className="min-h-[44px] sm:min-h-0 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 cursor-pointer inline-flex items-center justify-center touch-manipulation"
										title="Сбросить все ручные правки и AI модификации"
										data-testid="copilot-reset-plan-btn"
									>
										Сбросить к исходному
									</button>
								)}
							</div>
						</div>

						{copilotFeedback && (
							<div
								className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-950 dark:text-indigo-100 text-xs mt-1"
								data-testid="module-copilot-feedback"
							>
								<div className="flex items-center gap-2">
									<Bot size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
									<span>{copilotFeedback}</span>
								</div>
								<button
									type="button"
									onClick={() => setCopilotFeedback(null)}
									className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-4 shrink-0"
								>
									Скрыть
								</button>
							</div>
						)}
					</div>
				</details>

				{/* Turnkey Clinical Packages 1-Click Panel (Mandate 8e, 8p) */}
				<div className="flex items-center justify-between gap-2 p-1">
					<button
						type="button"
						onClick={onOpenChairsideBundlesModal}
						className="h-8 px-3.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
						title="Открыть клинические пакеты услуг у кресла («Все включено»)"
						data-testid="open-chairside-bundles-modal-btn"
					>
						<PackageCheck size={15} />
						<span>Клинические пакеты («Все включено»)</span>
						<span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-white/20 text-white ml-1">
							{CLINICAL_BUNDLES.length} пакетов
						</span>
					</button>
				</div>
				<details className="group rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))] text-xs overflow-hidden transition-all">
					<summary className="cursor-pointer text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] py-2 px-3.5 flex items-center justify-between gap-2 select-none list-none [&::-webkit-details-marker]:hidden">
						<div className="flex items-center gap-2">
							<Layers size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
							<span>Готовые клинические пакеты «под ключ» ({CLINICAL_BUNDLES.length} пакетов)</span>
							<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
								1 клик
							</span>
						</div>
						<div className="flex items-center gap-2 text-[11px] text-[var(--muted,#64748b)]">
							<span className="hidden sm:inline font-mono">Прейскурант услуг</span>
							<ChevronDown size={14} className="transition-transform group-open:rotate-180" />
						</div>
					</summary>
					<div className="p-2 border-t border-[var(--line,var(--border,#cbd5e1))]">
						<ClinicalBundlesPanel
							compact={true}
							onApplyBundle={onApplyClinicalBundle}
							initialToothNumber={orthopedicTeeth[0] || 16}
							className="border-0 shadow-none p-2"
						/>
					</div>
				</details>
			</div>
		</>
	);
};
