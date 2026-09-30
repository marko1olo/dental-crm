/**
 * TreatmentPlanPresenterAiAuditTab.tsx — вкладка клинического ИИ-аудита и студии кресельного ассистента.
 */

import React, { useState } from "react";
import {
	AlertCircle,
	Bot,
	Check,
	Coins,
	Copy,
	Percent,
	Send,
	Sparkles,
	User,
} from "lucide-react";
import type { TreatmentPlanValidateAndCommentResponse } from "@dental/shared";
import type { TreatmentPlanTier } from "./types";
import {
	COPILOT_PRESET_ACTIONS,
	type CopilotCommandType,
} from "../../services/ai/treatmentPlanCopilot";

export interface TreatmentPlanPresenterAiAuditTabProps {
	readonly aiAuditResult: TreatmentPlanValidateAndCommentResponse | null;
	readonly isAiAuditing: boolean;
	readonly aiAuditError: string | null;
	readonly onRunAiAudit: () => void;
	readonly onExecuteCopilot: (cmdOrText: CopilotCommandType | string) => void;
	readonly selectedTier: TreatmentPlanTier;
}

export const TreatmentPlanPresenterAiAuditTab: React.FC<TreatmentPlanPresenterAiAuditTabProps> = ({
	aiAuditResult,
	isAiAuditing,
	aiAuditError,
	onRunAiAudit,
	onExecuteCopilot,
	selectedTier,
}) => {
	const [activePromptTone, setActivePromptTone] = useState<"chairside" | "formal" | "concise">("chairside");
	const [customAiQuery, setCustomAiQuery] = useState("");
	const [copiedField, setCopiedField] = useState<string | null>(null);

	const handleCopyText = (text: string | undefined, fieldKey: string) => {
		if (!text) return;
		navigator.clipboard.writeText(text);
		setCopiedField(fieldKey);
		setTimeout(() => setCopiedField(null), 2000);
	};

	return (
		<div className="flex flex-col gap-6" data-testid="ai-audit-view">
			{/* AI Status & Header Bar */}
			<div className="p-4 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
						<Bot size={22} />
					</div>
					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<h3 className="text-sm font-bold text-[var(--tp-text-main)] m-0">
								Клинический ИИ-Аудитор и Ассистент DENTE
							</h3>
							<span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
								{aiAuditResult?.modelUsed ? `Модель: ${aiAuditResult.modelUsed}` : "Omni-Gateway (Qwen 3.8 27B / Gemini)"}
							</span>
						</div>
						<p className="text-xs text-[var(--tp-text-muted)] m-0 mt-0.5">
							Валидация анатомии зубов FDI, клинических протоколов СтАР и перевод для пациента
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{aiAuditResult && (
						<div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-[var(--tp-bg)]">
							<span className="text-xs text-[var(--tp-text-muted)]">Соответствие:</span>
							<span className={`text-sm font-black ${
								aiAuditResult.clinicalValidation.complianceScorePercent >= 90
									? "text-emerald-600 dark:text-emerald-400"
									: aiAuditResult.clinicalValidation.complianceScorePercent >= 70
										? "text-amber-600 dark:text-amber-400"
										: "text-rose-600 dark:text-rose-400"
							}`}>
								{aiAuditResult.clinicalValidation.complianceScorePercent}%
							</span>
						</div>
					)}

					<button
						type="button"
						onClick={onRunAiAudit}
						aria-busy={isAiAuditing}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--tp-primary)] text-white hover:opacity-90 transition-opacity cursor-pointer"
						title={isAiAuditing ? "Идёт клинический анализ плана лечения..." : (aiAuditResult ? "Обновить анализ" : "Запустить ИИ-аудит")}
						data-testid="refresh-ai-audit-btn"
					>
						{isAiAuditing ? (
							<>
								<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								<span>Анализ...</span>
							</>
						) : (
							<>
								<Sparkles size={14} />
								<span>{aiAuditResult ? "Обновить анализ" : "Запустить ИИ-аудит"}</span>
							</>
						)}
					</button>
				</div>
			</div>

			{aiAuditError && (
				<div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
					<AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
					<div>{aiAuditError}</div>
				</div>
			)}

			{!aiAuditResult && !isAiAuditing && (
				<div className="p-8 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] text-center flex flex-col items-center justify-center gap-3">
					<Bot size={36} className="text-[var(--tp-primary)] opacity-40" />
					<div className="max-w-md">
						<h4 className="text-sm font-bold text-[var(--tp-text-main)] mb-1">
							ИИ-анализ готов к запуску
						</h4>
						<p className="text-xs text-[var(--tp-text-muted)] leading-relaxed">
							Нажмите «Запустить ИИ-аудит», чтобы автоматически проверить клиническую корректность этапов по протоколам СтАР и получить понятные метафоры для пациента.
						</p>
					</div>
					<button
						type="button"
						onClick={onRunAiAudit}
						className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--tp-primary)] text-white hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
					>
						<Sparkles size={14} />
						<span>Запустить анализ плана</span>
					</button>
				</div>
			)}

			{aiAuditResult && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* LEFT COLUMN: Clinical Validation & Rule Checks */}
					<div className="flex flex-col gap-4">
						<div className="p-5 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex flex-col gap-3">
							<h4 className="text-sm font-bold text-[var(--tp-text-main)] m-0 flex items-center justify-between">
								<span>Клиническая экспертиза СтАР:</span>
								<span className="text-xs font-normal text-[var(--tp-text-muted)]">
									{aiAuditResult.clinicalValidation.rulesCheckedCount} правил проверено
								</span>
							</h4>

							<div className="flex flex-col gap-2">
								{aiAuditResult.clinicalValidation.findings.length === 0 ? (
									<div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
										<Check size={16} className="text-emerald-600 shrink-0" />
										<span>Клинических нарушений и конфликтов этапов не выявлено. План соответствует стандартам Минздрава.</span>
									</div>
								) : (
									aiAuditResult.clinicalValidation.findings.map((f, idx) => (
										<div
											key={idx}
											className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
												f.severity === "error"
													? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
													: f.severity === "warning"
														? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
														: "bg-indigo-500/10 border-indigo-500/30 text-indigo-900 dark:text-indigo-200"
											}`}
										>
											<AlertCircle size={15} className="shrink-0 mt-0.5" />
											<div className="flex-1 min-w-0">
												<div className="font-bold flex items-center justify-between gap-2">
													<span>{f.title}</span>
													{f.toothNumber && (
														<span className="px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 font-mono text-[10px]">
															Зуб {f.toothNumber}
														</span>
													)}
												</div>
												<div className="mt-1 opacity-90 leading-relaxed">{f.message}</div>
												{f.suggestedAction && (
													<div className="mt-1.5 pt-1.5 border-t border-current/20 font-medium">
														💡 Рекомендация: {f.suggestedAction}
													</div>
												)}
											</div>
										</div>
									))
								)}
							</div>
						</div>

						{/* Doctor Recommendations Card */}
						{aiAuditResult.clinicalValidation.doctorRecommendations.length > 0 && (
							<div className="p-4 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] text-xs text-[var(--tp-text-main)]">
								<h5 className="text-xs font-bold text-[var(--tp-text-muted)] uppercase tracking-wider mb-2">
									Клинические акценты для врача:
								</h5>
								<ul className="m-0 pl-4 space-y-1.5">
									{aiAuditResult.clinicalValidation.doctorRecommendations.map((rec, idx) => (
										<li key={idx} className="flex items-start gap-2">
											<span className="text-amber-500 font-bold">•</span>
											<span>{rec}</span>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>

					{/* RIGHT COLUMN: Chairside Patient Commentary & Metaphors */}
					<div className="flex flex-col gap-4">
						{/* Patient Explanation Card */}
						<div className="p-5 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-bold text-[var(--tp-text-main)] m-0 flex items-center gap-2">
									<User size={16} className="text-[var(--tp-primary)]" />
									<span>Перевод плана для пациента (Chairside):</span>
								</h4>
								<button
									type="button"
									onClick={() => handleCopyText(aiAuditResult.chairsideCommentary.patientFriendlySummary, "summary")}
									className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-[var(--tp-surface-soft)] hover:bg-[var(--tp-primary-light)] text-[var(--tp-text-main)] border border-[var(--tp-border)] cursor-pointer transition-colors"
								>
									{copiedField === "summary" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
									<span>{copiedField === "summary" ? "Скопировано" : "Копировать"}</span>
								</button>
							</div>

							<div className="p-4 rounded-xl bg-[var(--tp-bg)] border border-[var(--tp-border)] text-xs text-[var(--tp-text-main)] leading-relaxed whitespace-pre-wrap">
								{aiAuditResult.chairsideCommentary.patientFriendlySummary}
							</div>
						</div>

						{/* Urgency & Health Math Card */}
						<div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-bold text-amber-950 dark:text-amber-200 m-0 flex items-center gap-2">
									<Coins size={16} className="text-amber-600 dark:text-amber-400" />
									<span>Математика здоровья (Экономический аргумент):</span>
								</h4>
								<button
									type="button"
									onClick={() => handleCopyText(aiAuditResult.chairsideCommentary.urgencyArgument, "urgency")}
									className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30 cursor-pointer transition-colors"
								>
									{copiedField === "urgency" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
									<span>{copiedField === "urgency" ? "Скопировано" : "Копировать"}</span>
								</button>
							</div>

							<div className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed whitespace-pre-wrap">
								{aiAuditResult.chairsideCommentary.urgencyArgument}
							</div>
						</div>

						{/* Hygiene & Care Instructions */}
						<div className="p-5 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex flex-col gap-3">
							<h4 className="text-sm font-bold text-[var(--tp-text-main)] m-0 flex items-center gap-2">
								<Sparkles size={16} className="text-teal-600 dark:text-teal-400" />
								<span>Индивидуальные советы по домашней гигиене:</span>
							</h4>
							<div className="p-4 rounded-xl bg-[var(--tp-bg)] border border-[var(--tp-border)] text-xs text-[var(--tp-text-main)] leading-relaxed whitespace-pre-wrap">
								{aiAuditResult.chairsideCommentary.hygieneAndCareAdvice}
							</div>
						</div>

						{/* Financial & Tax Strategy Pitch */}
						<div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col gap-3">
							<h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200 m-0 flex items-center gap-2">
								<Percent size={16} className="text-emerald-600 dark:text-emerald-400" />
								<span>Финансовая аргументация и вычет 13% НДФЛ:</span>
							</h4>
							<div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
								{aiAuditResult.financialArgumentation.ndflDeduction.explanation}
							</div>
							<div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-500/20">
								<div className="p-2.5 rounded-xl bg-[var(--tp-bg)] text-xs">
									<div className="text-[10px] text-[var(--tp-text-muted)]">К возврату от ФНС:</div>
									<div className="text-base font-black text-emerald-600 dark:text-emerald-400">
										+{aiAuditResult.financialArgumentation.ndflDeduction.totalRefundRub.toLocaleString("ru-RU")} ₽
									</div>
								</div>
								<div className="p-2.5 rounded-xl bg-[var(--tp-bg)] text-xs">
									<div className="text-[10px] text-[var(--tp-text-muted)]">Чистая стоимость:</div>
									<div className="text-base font-black text-[var(--tp-text-main)]">
										{aiAuditResult.financialArgumentation.ndflDeduction.netPriceWithRefundRub.toLocaleString("ru-RU")} ₽
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
