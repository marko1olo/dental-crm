import type React from "react";
import { Activity, Calendar, FileText, Sparkles } from "lucide-react";
import type { DiaryState } from "../diaryLogic/diaryLogicTypes";
import { TOOTH_STATE_LABELS, type ToothState } from "../../odontogram/ToothChart";
import type { VisitSummaryToothItem } from "./types";

export interface VisitRecommendationsSectionProps {
	diary: DiaryState;
	abnormalTeeth: readonly VisitSummaryToothItem[];
	onScheduleNextStage: () => void;
	onOpenProtocolGenerator: () => void;
	onOpenMemoModal: () => void;
}

export const VisitRecommendationsSection: React.FC<VisitRecommendationsSectionProps> = ({
	diary,
	abnormalTeeth,
	onScheduleNextStage,
	onOpenProtocolGenerator,
	onOpenMemoModal,
}) => {
	const hasPerioProtocol =
		diary.statusLocalis?.includes("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО") ||
		diary.diagnosisIcd10?.startsWith("K05");
	const hasPediatricProtocol =
		diary.statusLocalis?.includes("ПРОТОКОЛ ДЕТСКОГО") ||
		diary.statusLocalis?.includes("Кариограмм");

	return (
		<div className="space-y-4">
			{/* Clinical Protocols Badges */}
			{(hasPerioProtocol || hasPediatricProtocol) && (
				<div className="flex flex-wrap gap-2 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
					{hasPerioProtocol && (
						<span
							className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--ok-fg)]/30 text-xs font-semibold min-w-0 break-words"
							data-testid="summary-badge-perio"
						>
							<Activity className="w-3.5 h-3.5 text-[var(--ok-fg)] shrink-0" />
							<span className="min-w-0 break-words">
								Пародонтологический протокол (PSR + AAP/EFP 2018)
							</span>
						</span>
					)}
					{hasPediatricProtocol && (
						<span
							className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-semibold min-w-0 break-words"
							data-testid="summary-badge-pediatric"
						>
							<Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
							<span className="min-w-0 break-words">
								Сменный прикус & Кариограмма Bratthall
							</span>
						</span>
					)}
				</div>
			)}

			{/* Odontogram Abnormalities Summary */}
			{abnormalTeeth.length > 0 && (
				<div className="space-y-2">
					<h4 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
						<Activity className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" /> Зубная формула ({abnormalTeeth.length}{" "}
						{abnormalTeeth.length === 1 ? "зуб" : "зубов"} с отметками)
					</h4>
					<div className="flex flex-wrap gap-2">
						{abnormalTeeth.map((t) => (
							<div
								key={t.toothNumber}
								className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs min-w-0 break-words"
							>
								<span className="font-bold text-[var(--ink)] shrink-0">
									Зуб {t.toothNumber}:
								</span>
								<span className="text-[var(--teal-dark)] font-medium min-w-0 break-words">
									{TOOTH_STATE_LABELS[t.state as ToothState] || t.state}
								</span>
								{t.surfaces && t.surfaces.length > 0 ? (
									<span className="text-[var(--muted)] min-w-0 break-words">
										({t.surfaces.join(", ")})
									</span>
								) : null}
							</div>
						))}
					</div>
				</div>
			)}

			{/* 1-Click EMR Clinical Diary Synthesis Quick Banner */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-[var(--teal,var(--line))]/30 bg-[var(--teal-surface)]">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] shadow-sm shrink-0">
						<Sparkles className="w-5 h-5" />
					</div>
					<div>
						<div className="font-bold text-sm text-[var(--ink)]">
							Заполнение дневника по диагнозу и формуле
						</div>
						<div className="text-xs text-[var(--muted)]">
							Автозаполнение жалоб, осмотра, диагноза и плана лечения по клиническим стандартам
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2 flex-wrap shrink-0">
					<button
						type="button"
						onClick={onScheduleNextStage}
						className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
						title="Записать пациента на следующий этап лечения через 5-7 дней"
						data-testid="summary-schedule-next-stage-btn"
					>
						<Calendar className="w-4 h-4" />
						<span>След. этап (+5 дней)</span>
					</button>
					<button
						type="button"
						onClick={onOpenProtocolGenerator}
						className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer whitespace-nowrap"
						data-testid="summary-synthesize-protocol-btn"
					>
						<Sparkles className="w-4 h-4" />
						<span>Заполнить дневник</span>
					</button>
					<button
						type="button"
						onClick={onOpenMemoModal}
						className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer whitespace-nowrap"
						data-testid="summary-quick-memo-btn"
						title="Открыть памятку пациенту с рекомендациями после приёма"
					>
						<FileText className="w-4 h-4" />
						<span>Памятка пациенту</span>
					</button>
				</div>
			</div>
		</div>
	);
};
