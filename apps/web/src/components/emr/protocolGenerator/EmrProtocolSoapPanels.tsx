import React from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import type { VisitDiaryEntry043, Statutory043ComplianceReport } from "./emrProtocolEngine";

export interface EmrProtocolSoapPanelsProps {
	readonly activeTab: "preview" | "soap_cards" | "compliance";
	readonly formattedSoapText: string;
	readonly synthesizedDiary: VisitDiaryEntry043;
	readonly complianceReport: Statutory043ComplianceReport;
}

export const EmrProtocolSoapPanels: React.FC<EmrProtocolSoapPanelsProps> = React.memo(
	function EmrProtocolSoapPanels({
		activeTab,
		formattedSoapText,
		synthesizedDiary,
		complianceReport,
	}) {
		return (
			<div className="flex-1 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-4 overflow-y-auto text-xs space-y-4">
				{/* Вкладка 1: Текстовый предварительный просмотр */}
				{activeTab === "preview" && (
					<pre className="font-mono text-xs text-[var(--ink,#0f172a)] whitespace-pre-wrap leading-relaxed select-text bg-[var(--paper,#ffffff)] p-4 rounded-xl border border-[var(--line,#e2e8f0)]">
						{formattedSoapText}
					</pre>
				)}

				{/* Вкладка 2: Карточки разделов SOAP */}
				{activeTab === "soap_cards" && (
					<div className="space-y-3">
						{/* S */}
						<div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1">
							<div className="font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider text-[11px]">
								S (Subjective) — Жалобы и анамнез
							</div>
							<p className="text-sm text-[var(--ink,#0f172a)] leading-relaxed">
								{synthesizedDiary.subjectiveComplaints}
							</p>
						</div>

						{/* O */}
						<div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1.5">
							<div className="font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider text-[11px]">
								O (Objective) — Status Localis и диагностические тесты
							</div>
							<p className="text-sm text-[var(--ink,#0f172a)] leading-relaxed">
								{synthesizedDiary.objectiveStatusLocalis}
							</p>
							<div className="flex flex-wrap gap-2 pt-1 text-[11px] text-[var(--muted,#64748b)]">
								<span className="px-2 py-0.5 rounded bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)]">
									Перкуссия верт.: {synthesizedDiary.percussionVertical === "negative" ? "отриц." : "положит."}
								</span>
								<span className="px-2 py-0.5 rounded bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)]">
									Зондирование: {synthesizedDiary.probingTenderness || "безболезненно"}
								</span>
								{synthesizedDiary.eodMicroamperes !== null && synthesizedDiary.eodMicroamperes !== undefined && (
									<span className="px-2 py-0.5 rounded bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] font-bold text-[var(--teal,#0d9488)]">
										ЭОД: {synthesizedDiary.eodMicroamperes} мкА
									</span>
								)}
							</div>
						</div>

						{/* A */}
						<div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
							<div className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider text-[11px]">
								A (Assessment) — Клинический диагноз
							</div>
							<div className="text-sm font-bold text-[var(--ink,#0f172a)]">
								<span className="font-mono text-amber-600 mr-2">
									{synthesizedDiary.assessmentIcd10Code}
								</span>
								{synthesizedDiary.assessmentDiagnosisText}
							</div>
						</div>

						{/* P */}
						<div className="p-3.5 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,#f0fdfa)] space-y-2">
							<div className="font-bold text-[var(--teal,#0d9488)] uppercase tracking-wider text-[11px]">
								P (Plan & Procedure) — Протокол вмешательства
							</div>
							<p className="text-xs text-[var(--ink,#0f172a)] whitespace-pre-wrap leading-relaxed font-mono bg-[var(--paper,#ffffff)] p-3 rounded-lg border border-[var(--line,#e2e8f0)]">
								{synthesizedDiary.procedureProtocol}
							</p>
							{synthesizedDiary.anesthesiaDetails && (
								<div className="text-[11px] text-[var(--muted,#64748b)]">
									<strong>Анестезия:</strong> {synthesizedDiary.anesthesiaDetails}
								</div>
							)}
							{synthesizedDiary.appliedMaterials && (
								<div className="text-[11px] text-[var(--muted,#64748b)]">
									<strong>Материалы:</strong> {synthesizedDiary.appliedMaterials}
								</div>
							)}
							{synthesizedDiary.homeCareRecommendations && (
								<div className="text-[11px] text-[var(--muted,#64748b)]">
									<strong>Рекомендации на дом:</strong> {synthesizedDiary.homeCareRecommendations}
								</div>
							)}
						</div>
					</div>
				)}

				{/* Вкладка 3: Аудит соответствия */}
				{activeTab === "compliance" && (
					<div className="space-y-3">
						<div className="p-4 rounded-xl bg-[var(--ok-bg,#f0fdf4)] border border-[var(--ok-fg,#059669)]/30 text-[var(--ok-fg,#059669)]">
							<div className="font-bold text-sm flex items-center gap-2">
								<CheckCircle2 className="w-5 h-5 text-[var(--ok-fg,#059669)]" />
								<span>Оценка нормативного соответствия: {complianceReport.complianceScore} / 100 баллов</span>
							</div>
							<p className="text-xs mt-1 leading-relaxed">
								{complianceReport.statutorySummaryText}
							</p>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
								<div className="font-semibold text-[var(--ink,#0f172a)]">Клинический диагноз (МКБ-10)</div>
								<div className="text-xs text-[var(--ok-fg,#059669)] font-medium flex items-center">
									<CheckCircle2 size={13} className="inline mr-1 shrink-0" />
									<span>Валидный код ({synthesizedDiary.assessmentIcd10Code})</span>
								</div>
							</div>
							<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
								<div className="font-semibold text-[var(--ink,#0f172a)]">Зубная формула FDI</div>
								<div className="text-xs text-[var(--ok-fg,#059669)] font-medium flex items-center">
									<CheckCircle2 size={13} className="inline mr-1 shrink-0" />
									<span>Валидный номер ({synthesizedDiary.toothNumber})</span>
								</div>
							</div>
							<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
								<div className="font-semibold text-[var(--ink,#0f172a)]">Дозировка анестетика</div>
								<div className="text-xs text-[var(--ok-fg,#059669)] font-medium flex items-center">
									<CheckCircle2 size={13} className="inline mr-1 shrink-0" />
									<span>Безопасная терапевтическая доза</span>
								</div>
							</div>
							<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
								<div className="font-semibold text-[var(--ink,#0f172a)]">Подпись и реквизиты</div>
								<div className="text-xs text-[var(--ok-fg,#059669)] font-medium flex items-center">
									<ShieldCheck size={13} className="inline mr-1 shrink-0" />
									<span>{synthesizedDiary.doctorFullName}</span>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	}
);
