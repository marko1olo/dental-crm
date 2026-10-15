/**
 * TreatmentPlanPresenterToolsStrip.tsx — кресельная панель инструментов врача
 * (ИИ Копилот, клинические пакеты, врачебная скидка, управление микро-расходниками).
 */

import React, { useState } from "react";
import {
	Bot,
	CheckCircle2,
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
	readonly onApplyDoctorDiscount: (pct: number, stageNum?: number) => void;
	readonly doctorDiscountRub?: number | undefined;
	readonly setDoctorDiscountRub?: ((val: number) => void) | undefined;
	readonly doctorDiscountMode?: ("percent" | "fixed") | undefined;
	readonly setDoctorDiscountMode?: ((mode: "percent" | "fixed") => void) | undefined;
	readonly doctorDiscountTargetStage?: number | undefined;
	readonly setDoctorDiscountTargetStage?: ((stageNum: number) => void) | undefined;
	readonly onApplyDoctorFixedDiscount?: ((rub: number, stageNum?: number) => void) | undefined;
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
	doctorDiscountRub = 0,
	setDoctorDiscountRub,
	doctorDiscountMode = "percent",
	setDoctorDiscountMode,
	doctorDiscountTargetStage = 0,
	setDoctorDiscountTargetStage,
	onApplyDoctorFixedDiscount,
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
	const [customRubInput, setCustomRubInput] = useState<string>(doctorDiscountRub > 0 ? String(doctorDiscountRub) : "");

	const isDiscountActive = (doctorDiscountMode === "fixed" && doctorDiscountRub > 0) || doctorDiscountPercent > 0;
	const discountLabel =
		doctorDiscountMode === "fixed" && doctorDiscountRub > 0
			? `Скидка: ${doctorDiscountRub.toLocaleString("ru-RU")} ₽`
			: doctorDiscountPercent > 0
				? `Скидка: ${doctorDiscountPercent}%`
				: "Скидка врача";

	return (
		<>
				<div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-1.5 bg-[var(--tp-surface)] border-b border-[var(--tp-border)] no-print text-xs overflow-x-auto scrollbar-none">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[11px] font-bold text-[var(--tp-text-muted)] mr-1 hidden sm:inline">Инструменты врача:</span>

						{/* Toggle AI Copilot */}
						<button
							type="button"
							onClick={() => setActiveToolsPanel((prev) => (prev === "copilot" ? null : "copilot"))}
							className={`min-h-[40px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg text-[13px] font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer touch-manipulation shadow-2xs ${
								activeToolsPanel === "copilot"
									? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
									: "bg-[var(--paper,var(--paper-strong,#ffffff))] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] border-[var(--line,var(--border,#cbd5e1))]"
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
							className={`min-h-[40px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg text-[13px] font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer touch-manipulation shadow-2xs ${
								activeToolsPanel === "bundles"
									? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
									: "bg-[var(--paper,var(--paper-strong,#ffffff))] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] border-[var(--line,var(--border,#cbd5e1))]"
							}`}
							data-testid="toggle-bundles-panel-btn"
							title="Готовые клинические пакеты услуг"
						>
							<Package size={13} />
							<span>Клинические пакеты</span>
							<ChevronDown size={12} className={`transition-transform duration-150 ${activeToolsPanel === "bundles" ? "rotate-180" : ""}`} />
						</button>

						{/* Toggle Doctor Discount */}
						<button
							type="button"
							onClick={() => setActiveToolsPanel((prev) => (prev === "doctorDiscount" ? null : "doctorDiscount"))}
							className={`min-h-[40px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg text-[13px] font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer touch-manipulation shadow-2xs ${
								activeToolsPanel === "doctorDiscount" || isDiscountActive
									? "bg-emerald-600 text-white border-emerald-600"
									: "bg-[var(--paper,var(--paper-strong,#ffffff))] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] border-[var(--line,var(--border,#cbd5e1))]"
							}`}
							data-testid="toggle-discount-panel-btn"
							title="Скидка врача (% или ₽ на этапы, гарантийные переделки и персонал)"
						>
							<Percent size={13} />
							<span>{discountLabel}</span>
							<ChevronDown size={12} className={`transition-transform duration-150 ${activeToolsPanel === "doctorDiscount" ? "rotate-180" : ""}`} />
						</button>
					</div>

					<div className="flex items-center gap-2">
						{doctorDiscountPercent === 100 && (
							<span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
								100% гарантия / персонал
							</span>
						)}
						<span className="text-[11px] text-[var(--tp-text-muted)] hidden lg:inline">
							Инструменты врача: скидки и клинические пакеты
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
								className="h-7 px-2.5 rounded-lg text-[12.5px] font-medium bg-[var(--tp-surface)] text-[var(--tp-text-main)] hover:bg-[var(--tp-primary-light)] hover:text-[var(--tp-primary)] border border-[var(--tp-border)] cursor-pointer transition-colors"
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
							className="flex-1 px-2.5 py-1 text-[13px] rounded-lg border border-[var(--tp-border)] bg-[var(--tp-bg)] text-[var(--tp-text-main)] outline-none min-h-[32px] sm:min-h-[32px] sm:h-8"
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
							className="p-1.5 min-h-[36px] min-w-[36px] sm:h-9 sm:w-9 flex items-center justify-center rounded-lg bg-[var(--tp-primary)] text-white hover:bg-[var(--tp-primary-hover)] cursor-pointer touch-manipulation"
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

				{/* Collapsible Panel 3: Doctor Discount Freedom Quick Bar (Mandate 8e / Doctor Autonomy) */}
				<div className={`flex flex-col gap-2.5 px-4 sm:px-6 py-2.5 bg-[var(--tp-surface-soft)] border-b border-[var(--tp-border)] no-print text-xs ${activeToolsPanel === "doctorDiscount" ? "" : "hidden"}`}>
					<div className="flex items-center justify-between gap-2 flex-wrap">
						{/* Mode Switcher & Target Stage */}
						<div className="flex items-center gap-2 flex-wrap">
							<div className="inline-flex items-center gap-1 font-bold text-[var(--tp-primary)] mr-1">
								<Percent size={13} className="text-emerald-600 dark:text-emerald-400" />
								<span>Скидка врача:</span>
							</div>

							{/* % or ₽ mode */}
							<div className="inline-flex rounded-lg border border-[var(--tp-border)] bg-[var(--tp-bg)] p-0.5">
								<button
									type="button"
									onClick={() => setDoctorDiscountMode?.("percent")}
									className={`px-2.5 py-1 text-[12px] font-bold rounded-md transition-colors cursor-pointer ${
										doctorDiscountMode === "percent"
											? "bg-[var(--tp-primary)] text-white shadow-2xs"
											: "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)]"
									}`}
									data-testid="discount-mode-percent-btn"
								>
									% Процент
								</button>
								<button
									type="button"
									onClick={() => setDoctorDiscountMode?.("fixed")}
									className={`px-2.5 py-1 text-[12px] font-bold rounded-md transition-colors cursor-pointer ${
										doctorDiscountMode === "fixed"
											? "bg-emerald-600 text-white shadow-2xs"
											: "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)]"
									}`}
									data-testid="discount-mode-fixed-btn"
								>
									₽ Рубли
								</button>
							</div>

							{/* Stage Selector */}
							<div className="flex items-center gap-1 ml-1">
								<span className="text-[11px] text-[var(--tp-text-muted)] font-medium">Область:</span>
								<select
									value={doctorDiscountTargetStage}
									onChange={(e) => setDoctorDiscountTargetStage?.(Number(e.target.value))}
									className="px-2 py-1 text-[12px] font-medium rounded-lg border border-[var(--tp-border)] bg-[var(--tp-bg)] text-[var(--tp-text-main)] outline-none"
									data-testid="discount-target-stage-select"
								>
									<option value={0}>Весь план лечения</option>
									{selectedTier.stages.map((st) => (
										<option key={st.stageNumber} value={st.stageNumber}>
											Этап {st.stageNumber}: {st.title.slice(0, 24)}...
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="text-[11px] text-[var(--tp-text-muted)] hidden lg:block">
							Мандат 8e: Свобода скидок врача до 100% без пароля администратора
						</div>
					</div>

					{/* Presets and Custom Inputs */}
					<div className="flex items-center gap-1.5 flex-wrap">
						{doctorDiscountMode === "percent" ? (
							<>
								{[0, 5, 10, 15, 20, 50, 100].map((pct) => (
									<button
										key={pct}
										type="button"
										onClick={() => onApplyDoctorDiscount(pct, doctorDiscountTargetStage)}
										title={
											pct === 100
												? "100% скидка: гарантийные переделки и персонал без мастер-паролей администратора"
												: `Применить скидку ${pct}%`
										}
										className={`min-h-[32px] sm:min-h-[28px] sm:h-7 px-2.5 rounded-lg font-mono font-medium text-[12px] cursor-pointer transition-all ${
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
									<span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 ml-1">
										0 ₽ (Гарантийная переделка / Персонал)
									</span>
								)}
								<div className="inline-flex items-center gap-1 ml-1" title="Свободная скидка врача (0-100%)">
									<input
										type="number"
										min="0"
										max="100"
										value={doctorDiscountPercent}
										onChange={(e) => {
											const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
											onApplyDoctorDiscount(val, doctorDiscountTargetStage);
										}}
										className="w-14 min-h-[32px] sm:min-h-[28px] sm:h-7 px-1.5 text-[12px] font-mono font-bold rounded-lg border border-[var(--tp-border)] bg-[var(--tp-surface)] text-[var(--tp-text-main)] text-center focus:outline-none focus:ring-1 focus:ring-[var(--tp-primary)]"
										placeholder="%"
										data-testid="presenter-custom-discount-input"
									/>
									<span className="text-[12px] text-[var(--tp-text-muted)] font-bold">%</span>
								</div>
							</>
						) : (
							<>
								{[0, 5000, 10000, 15000, 25000, 50000].map((rub) => (
									<button
										key={rub}
										type="button"
										onClick={() => {
											setCustomRubInput(rub > 0 ? String(rub) : "");
											onApplyDoctorFixedDiscount?.(rub, doctorDiscountTargetStage);
										}}
										title={rub === 0 ? "Сбросить скидку" : `Применить фиксированную скидку ${rub.toLocaleString("ru-RU")} ₽`}
										className={`min-h-[32px] sm:min-h-[28px] sm:h-7 px-2.5 rounded-lg font-mono font-medium text-[12px] cursor-pointer transition-all ${
											doctorDiscountRub === rub
												? "bg-emerald-600 text-white shadow-xs"
												: "bg-[var(--tp-surface)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)] border border-[var(--tp-border)]"
										}`}
										data-testid={`presenter-discount-rub-btn-${rub}`}
									>
										{rub === 0 ? "0 ₽" : `${rub.toLocaleString("ru-RU")} ₽`}
									</button>
								))}
								<div className="inline-flex items-center gap-1 ml-1" title="Фиксированная скидка в рублях">
									<input
										type="number"
										min="0"
										value={customRubInput}
										onChange={(e) => {
											const valStr = e.target.value;
											setCustomRubInput(valStr);
											const val = Math.max(0, Number(valStr) || 0);
											onApplyDoctorFixedDiscount?.(val, doctorDiscountTargetStage);
										}}
										className="w-24 min-h-[32px] sm:min-h-[28px] sm:h-7 px-2 text-[12px] font-mono font-bold rounded-lg border border-[var(--tp-border)] bg-[var(--tp-surface)] text-[var(--tp-text-main)] text-center focus:outline-none focus:ring-1 focus:ring-[var(--tp-primary)]"
										placeholder="Сумма ₽"
										data-testid="presenter-custom-discount-rub-input"
									/>
									<span className="text-[12px] text-[var(--tp-text-muted)] font-bold">₽</span>
								</div>
							</>
						)}
					</div>
				</div>

		</>
	);
};
