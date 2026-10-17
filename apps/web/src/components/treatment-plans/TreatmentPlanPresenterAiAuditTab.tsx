/**
 * TreatmentPlanPresenterAiAuditTab.tsx — клинический аудит плана лечения и комментарий для пациента.
 * Декомпозирован строго по Мандату 8b (лимит строк <= 120).
 * Без фейковых синтетических вероятностей и симуляций.
 */

import React, { useMemo, useState } from "react";
import { AlertCircle, Bot, Check, Coins, Copy, Sparkles, User } from "lucide-react";
import type { TreatmentPlanValidateAndCommentResponse } from "@dental/shared";
import type { TreatmentPlanTier } from "./types";
import { buildChairsidePatientCasePresentation, type CopilotCommandType } from "../../services/ai/treatmentPlanCopilot";

export interface TreatmentPlanPresenterAiAuditTabProps {
	readonly aiAuditResult: TreatmentPlanValidateAndCommentResponse | null;
	readonly isAiAuditing: boolean;
	readonly aiAuditError: string | null;
	readonly onRunAiAudit: () => void;
	readonly onExecuteCopilot: (cmdOrText: CopilotCommandType | string) => void;
	readonly selectedTier: TreatmentPlanTier;
}

export const TreatmentPlanPresenterAiAuditTab: React.FC<TreatmentPlanPresenterAiAuditTabProps> = ({
	aiAuditResult, isAiAuditing, aiAuditError, onRunAiAudit, selectedTier,
}) => {
	const [copiedField, setCopiedField] = useState<string | null>(null);
	const casePresentation = useMemo(() => buildChairsidePatientCasePresentation(selectedTier.stages, { selectedTierTitle: selectedTier.title }), [selectedTier]);

	const copyText = (text: string | undefined, key: string) => {
		if (!text) return;
		navigator.clipboard.writeText(text);
		setCopiedField(key);
		setTimeout(() => setCopiedField(null), 2000);
	};

	return (
		<div className="flex flex-col gap-5" data-testid="ai-audit-view">
			<div className="p-4 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 shrink-0">
						<Bot size={20} />
					</div>
					<div>
						<h3 className="text-sm font-bold text-[var(--tp-text-main)] m-0">Клинический аудит и пояснение к плану</h3>
						<p className="text-xs text-[var(--tp-text-muted)] m-0 mt-0.5">Проверка этапов лечения и тезисы для презентации пациенту</p>
					</div>
				</div>
				<button
					type="button" onClick={onRunAiAudit} aria-busy={isAiAuditing}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--tp-primary)] text-white hover:opacity-90 transition-opacity cursor-pointer shrink-0"
					data-testid="refresh-ai-audit-btn"
				>
					<Sparkles size={14} />
					<span>{isAiAuditing ? "Проверка..." : (aiAuditResult ? "Обновить аудит" : "Проверить план")}</span>
				</button>
			</div>

			{aiAuditError && (
				<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
					<AlertCircle size={15} className="shrink-0 text-amber-600" />
					<span>{aiAuditError}</span>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-3 gap-3.5" data-testid="patient-case-presenter-slides">
				<div className="p-3.5 rounded-xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex flex-col gap-2">
					<div className="text-[11px] font-bold uppercase text-teal-600 dark:text-teal-400">1. Диагностика</div>
					<div className="text-xs font-bold text-[var(--tp-text-main)]">{casePresentation.slides.diagnosis.headlineRu}</div>
					<p className="text-xs text-[var(--tp-text-muted)] m-0">{casePresentation.slides.diagnosis.summaryRu}</p>
				</div>
				<div className="p-3.5 rounded-xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex flex-col gap-2">
					<div className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400">2. Последствия без лечения</div>
					<div className="text-xs font-bold text-[var(--tp-text-main)]">{casePresentation.slides.risks.costOfInactionHeadlineRu}</div>
					<div className="text-xs text-[var(--tp-text-muted)]">{casePresentation.slides.risks.timelineProgression[0]?.clinicalConsequenceRu || "Риск прогрессирования патологии"}</div>
				</div>
				<div className="p-3.5 rounded-xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex flex-col gap-2">
					<div className="text-[11px] font-bold uppercase text-indigo-600 dark:text-indigo-400">3. План этапов</div>
					<div className="text-xs font-bold text-[var(--tp-text-main)]">{casePresentation.slides.roadmap.headlineRu}</div>
					<div className="text-xs text-[var(--tp-text-muted)]">{selectedTier.stages.length} этапа(ов) · Итого: {selectedTier.totalRub.toLocaleString("ru-RU")} ₽</div>
				</div>
			</div>

			{aiAuditResult?.chairsideCommentary && (
				<div className="p-4 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex flex-col gap-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-xs font-bold text-[var(--tp-text-main)]">
							<User size={15} className="text-teal-600" />
							<span>Понятное объяснение плана для пациента</span>
						</div>
						<button
							type="button" onClick={() => copyText(aiAuditResult.chairsideCommentary.patientFriendlySummary, "summary")}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--tp-border)] hover:bg-[var(--tp-surface-soft)] cursor-pointer"
						>
							{copiedField === "summary" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
							<span>{copiedField === "summary" ? "Скопировано" : "Копировать"}</span>
						</button>
					</div>
					<p className="text-xs text-[var(--tp-text-muted)] leading-relaxed m-0 whitespace-pre-wrap">{aiAuditResult.chairsideCommentary.patientFriendlySummary}</p>
				</div>
			)}
		</div>
	);
};

export default TreatmentPlanPresenterAiAuditTab;
