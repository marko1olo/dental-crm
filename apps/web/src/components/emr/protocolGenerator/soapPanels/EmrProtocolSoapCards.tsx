import React from "react";
import type { VisitDiaryEntry043 } from "../emrProtocolEngine";

export interface EmrProtocolSoapCardsProps {
	readonly synthesizedDiary: VisitDiaryEntry043;
}

export const EmrProtocolSoapCards: React.FC<EmrProtocolSoapCardsProps> = React.memo(
	function EmrProtocolSoapCards({ synthesizedDiary }) {
		return (
			<div className="space-y-3">
				<div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1">
					<div className="font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider text-[11px]">
						Жалобы и анамнез
					</div>
					<p className="text-sm text-[var(--ink,#0f172a)] leading-relaxed">
						{synthesizedDiary.subjectiveComplaints}
					</p>
				</div>

				<div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1.5">
					<div className="font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider text-[11px]">
						Осмотр и диагностические тесты
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

				<div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
					<div className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider text-[11px]">
						Диагноз
					</div>
					<div className="text-sm font-bold text-[var(--ink,#0f172a)]">
						<span className="font-mono text-amber-600 mr-2">
							{synthesizedDiary.assessmentIcd10Code}
						</span>
						{synthesizedDiary.assessmentDiagnosisText}
					</div>
				</div>

				<div className="p-3.5 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,#f0fdfa)] space-y-2">
					<div className="font-bold text-[var(--teal,#0d9488)] uppercase tracking-wider text-[11px]">
						Протокол лечения
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
		);
	},
);
