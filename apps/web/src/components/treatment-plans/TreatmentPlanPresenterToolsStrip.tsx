/**
 * TreatmentPlanPresenterToolsStrip.tsx — кресельная панель инструментов врача
 * (ИИ Копилот, клинические пакеты, врачебная скидка, управление микро-расходниками).
 */

import React, { useState } from "react";
import {
	Bot,
	ChevronDown,
	ChevronUp,
	FileSignature,
	Layers,
	Package,
	Percent,
	Send,
	Sparkles,
} from "lucide-react";
import type { TreatmentPlanTier } from "./types";
import type { ToothData } from "../odontogram/ToothChart";
import {
	COPILOT_PRESET_ACTIONS,
	type CopilotCommandType,
} from "../../services/ai/treatmentPlanCopilot";
import { ClinicalBundlesPanel } from "./ClinicalBundlesPanel";
import type { ClinicalBundleId } from "./treatmentPlanBundlesEngine";

export interface TreatmentPlanPresenterToolsStripProps {
	readonly activeToolsPanel: "copilot" | "bundles" | "doctorDiscount" | null;
	readonly setActiveToolsPanel: React.Dispatch<
		React.SetStateAction<"copilot" | "bundles" | "doctorDiscount" | null>
	>;
	readonly isCopilotExecuting: boolean;
	readonly onExecuteCopilot: (cmdOrText: CopilotCommandType | string) => void;
	readonly onApplyClinicalBundle: (bundleId: ClinicalBundleId, toothNumber?: number) => void;
	readonly copilotFeedback: string | null;
	readonly setCopilotFeedback: (feedback: string | null) => void;
	readonly doctorDiscountPercent: number;
	readonly setDoctorDiscountPercent: (val: number) => void;
	readonly onApplyDoctorDiscount: (pct: number) => void;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables: (val: boolean) => void;
	readonly selectedTier: TreatmentPlanTier;
	readonly allTiers: readonly TreatmentPlanTier[];
	readonly onSelectPlan?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly teeth?: readonly ToothData[] | undefined;
	readonly patientChoiceBtnText: string;
	readonly choiceConfirmedBtnText: string;
	readonly isChoiceConfirmed: boolean;
	readonly confirmedNotice?: string | null;
	readonly onConfirmPatientChoice: () => void;
	readonly onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
}

export const TreatmentPlanPresenterToolsStrip: React.FC<TreatmentPlanPresenterToolsStripProps> = ({
	activeToolsPanel,
	setActiveToolsPanel,
	isCopilotExecuting,
	onExecuteCopilot,
	onApplyClinicalBundle,
	copilotFeedback,
	setCopilotFeedback,
	doctorDiscountPercent,
	setDoctorDiscountPercent,
	onApplyDoctorDiscount,
	showMicroConsumables,
	setShowMicroConsumables,
	selectedTier,
	allTiers,
	onSelectPlan,
	teeth,
	patientChoiceBtnText,
	choiceConfirmedBtnText,
	isChoiceConfirmed,
	confirmedNotice,
	onConfirmPatientChoice,
	onApproveAndSign,
}) => {
	const [customPrompt, setCustomPrompt] = useState("");

	return (
		<>
				<div className="flex items-center justify-between gap-2 px-6 py-1.5 bg-[var(--tp-surface)] border-b border-[var(--tp-border)] no-print text-xs">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[11px] font-bold text-[var(--tp-text-muted)] mr-1 hidden sm:inline">Инструменты врача:</span>

						{/* Toggle AI Copilot */}
						<button
							type="button"
							onClick={() => setActiveToolsPanel((prev) => (prev === "copilot" ? null : "copilot"))}
							className={`h-7 px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
								activeToolsPanel === "copilot"
									? "bg-[var(--tp-primary)] text-white border-[var(--tp-primary)] shadow-2xs"
									: "bg-[var(--tp-surface-soft)] text-[var(--tp-text-main)] hover:bg-[var(--tp-primary-light)] border-[var(--tp-border)]"
							}`}
							data-testid="toggle-copilot-panel-btn"
							title="AI Copilot у кресла: готовые сценарии и оптимизация бюджета"
						>
							<Sparkles size={13} className={activeToolsPanel === "copilot" ? "text-amber-300" : "text-amber-500"} />
							<span>AI Copilot</span>
							<ChevronDown size={12} className={`transition-transform duration-150 ${activeToolsPanel === "copilot" ? "rotate-180" : ""}`} />
						</button>

						{/* Toggle Clinical Bundles */}
						<button
							type="button"
							onClick={() => setActiveToolsPanel((prev) => (prev === "bundles" ? null : "bundles"))}
							className={`h-7 px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
								activeToolsPanel === "bundles"
									? "bg-[var(--tp-primary)] text-white border-[var(--tp-primary)] shadow-2xs"
									: "bg-[var(--tp-surface-soft)] text-[var(--tp-text-main)] hover:bg-[var(--tp-primary-light)] border-[var(--tp-border)]"
							}`}
							data-testid="toggle-bundles-panel-btn"
							title="Готовые клинические пакеты услуг (Мандат 8e)"
						>
							<Package size={13} />
							<span>Клинические пакеты</span>
							<ChevronDown size={12} className={`transition-transform duration-150 ${activeToolsPanel === "bundles" ? "rotate-180" : ""}`} />
						</button>

						{/* Toggle Doctor Discount */}
						<button
							type="button"
							onClick={() => setActiveToolsPanel((prev) => (prev === "discount" ? null : "discount"))}
							className={`h-7 px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
								activeToolsPanel === "discount" || doctorDiscountPercent > 0
									? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
									: "bg-[var(--tp-surface-soft)] text-[var(--tp-text-main)] hover:bg-[var(--tp-primary-light)] border-[var(--tp-border)]"
							}`}
							data-testid="toggle-discount-panel-btn"
							title="Скидка врача (0-100% на гарантийные переделки и персонал)"
						>
							<Percent size={13} />
							<span>{doctorDiscountPercent > 0 ? `Скидка: ${doctorDiscountPercent}%` : "Скидка врача"}</span>
							<ChevronDown size={12} className={`transition-transform duration-150 ${activeToolsPanel === "discount" ? "rotate-180" : ""}`} />
						</button>
					</div>

					<div className="flex items-center gap-2">
						{doctorDiscountPercent === 100 && (
							<span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
								100% гарантия / персонал
							</span>
						)}
						<span className="text-[11px] text-[var(--tp-text-muted)] hidden lg:inline">
							Автономия врача: скидки и пакеты в 1 клик
						</span>
					</div>
				</div>

				{/* Collapsible Panel 1: AI Copilot Chairside Quick Toolbar */}
				<div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-2.5 bg-[var(--tp-surface-soft)] border-b border-[var(--tp-border)] no-print ${activeToolsPanel === "copilot" ? "" : "hidden"}`}>
					<div className="flex items-center gap-2 flex-wrap">
						<div className="inline-flex items-center gap-1 text-xs font-bold text-[var(--tp-primary)] mr-1">
							<Sparkles size={14} className="text-amber-500" />
							<span>AI Copilot у кресла:</span>
						</div>
						{COPILOT_PRESET_ACTIONS.map((act) => (
							<button
								key={act.id}
								type="button"
								aria-busy={isCopilotExecuting}
								onClick={() => onExecuteCopilot(act.id)}
								className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--tp-surface)] text-[var(--tp-text-main)] hover:bg-[var(--tp-primary-light)] hover:text-[var(--tp-primary)] border border-[var(--tp-border)] cursor-pointer transition-colors"
								title={isCopilotExecuting ? "AI Copilot выполняет команду..." : act.description}
								data-testid={`presenter-copilot-btn-${act.id}`}
							>
								{act.title}
							</button>
						))}
					</div>

					<div className="flex items-center gap-1.5 min-w-[200px] max-w-sm">
						<input
							type="text"
							value={customPrompt}
							onChange={(e) => setCustomPrompt(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									if (customPrompt.trim()) {
										onExecuteCopilot(customPrompt.trim());
										setCustomPrompt("");
									} else {
										setCopilotFeedback("Введите команду или выберите готовый сценарий презентации («бюджет 120к», «без имплантации»)");
									}
								}
							}}
							placeholder="Команда ассистенту (напр. 'бюджет 120к')"
							className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-[var(--tp-border)] bg-[var(--tp-bg)] text-[var(--tp-text-main)] outline-none min-h-[32px] sm:min-h-[28px] sm:h-7"
							data-testid="presenter-copilot-input"
						/>
						<button
							type="button"
							aria-busy={isCopilotExecuting}
							onClick={() => {
								if (customPrompt.trim()) {
									onExecuteCopilot(customPrompt.trim());
									setCustomPrompt("");
								} else {
									setCopilotFeedback("Введите команду или выберите готовый сценарий презентации («бюджет 120к», «без имплантации»)");
								}
							}}
							className="p-2 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg bg-[var(--tp-primary)] text-white hover:bg-[var(--tp-primary-hover)] cursor-pointer touch-manipulation"
							title={isCopilotExecuting ? "Выполняется команда ассистента..." : "Отправить команду"}
							data-testid="presenter-copilot-send-btn"
						>
							<Send size={14} />
						</button>
					</div>
				</div>

				{/* AI Copilot Feedback Alert */}
				{copilotFeedback && (
					<div
						className="px-6 py-2 bg-indigo-500/10 border-b border-indigo-500/30 text-indigo-950 dark:text-indigo-200 text-xs flex items-center justify-between no-print"
						data-testid="presenter-copilot-feedback-banner"
					>
						<div className="flex items-center gap-2">
							<Bot size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
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

				{/* Confirmation Notice Banner */}
				{confirmedNotice && (
					<div
						className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between no-print"
						data-testid="choice-confirmed-banner"
					>
						<div className="flex items-center gap-2">
							<CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
							<span>{confirmedNotice}</span>
						</div>
						<span className="text-[11px] font-normal opacity-80">Готово к печати Приложения №1</span>
					</div>
				)}

				{/* Collapsible Panel 2: Turnkey Clinical Packages 1-Click Bar (Mandate 8e) */}
				<div className={`px-6 py-2.5 bg-[var(--tp-surface-soft)] border-b border-[var(--tp-border)] no-print ${activeToolsPanel === "bundles" ? "" : "hidden"}`}>
					<ClinicalBundlesPanel
						compact
						onApplyBundle={onApplyClinicalBundle}
						initialToothNumber={teeth && teeth.length > 0 ? (teeth[0]?.toothNumber || 16) : 16}
					/>
				</div>

				{/* Collapsible Panel 3: Doctor Discount Freedom Quick Bar (Mandate 8e / Section VII.2) */}
				<div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-2 bg-[var(--tp-surface-soft)] border-b border-[var(--tp-border)] no-print text-xs ${activeToolsPanel === "discount" ? "" : "hidden"}`}>
					<div className="flex items-center gap-2 flex-wrap">
						<div className="inline-flex items-center gap-1 font-bold text-[var(--tp-primary)]">
							<Percent size={13} className="text-emerald-600 dark:text-emerald-400" />
							<span>Скидка врача:</span>
						</div>
						{[0, 5, 10, 15, 20, 50, 100].map((pct) => (
							<button
								key={pct}
								type="button"
								onClick={() => onApplyDoctorDiscount(pct)}
								title={
									pct === 100
										? "100% скидка: гарантийные переделки и персонал без мастер-паролей администратора"
										: `Применить скидку ${pct}%`
								}
								className={`min-h-[36px] px-2.5 py-1 rounded-lg font-mono font-bold text-xs cursor-pointer transition-all ${
									doctorDiscountPercent === pct
										? pct === 100
											? "bg-emerald-600 text-white shadow-xs"
											: "bg-[var(--tp-primary)] text-white shadow-xs"
										: pct === 100
											? "bg-[var(--tp-surface)] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 border border-emerald-500/30"
											: "bg-[var(--tp-surface)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)] border border-[var(--tp-border)]"
								}`}
								data-testid={`presenter-discount-btn-${pct}`}
							>
								{pct === 100 ? "100% (Гарантия)" : `${pct}%`}
							</button>
						))}
						{doctorDiscountPercent === 100 && (
							<span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">
								0 ₽ (Гарантийная переделка / Персонал)
							</span>
						)}
						<div className="inline-flex items-center gap-1 ml-1" title="Свободная скидка врача (0-100%) без мастер-паролей (Мандат 8e)">
							<input
								type="number"
								min="0"
								max="100"
								value={doctorDiscountPercent}
								onChange={(e) => {
									const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
									onApplyDoctorDiscount(val);
								}}
								className="w-14 min-h-[32px] h-8 px-1.5 text-xs font-mono font-bold rounded-lg border border-[var(--tp-border)] bg-[var(--tp-surface)] text-[var(--tp-text-main)] text-center focus:outline-none focus:ring-1 focus:ring-[var(--tp-primary)]"
								placeholder="%"
								data-testid="presenter-custom-discount-input"
							/>
							<span className="text-xs text-[var(--tp-text-muted)] font-bold">%</span>
						</div>
					</div>
					<div className="text-[11px] text-[var(--tp-text-muted)] hidden lg:block">
						Автономия врача: свободные скидки и переделки без согласований с администратором
					</div>
				</div>

		</>
	);
};
