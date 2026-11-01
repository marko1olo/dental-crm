/**
 * TreatmentPlanStageEditor.tsx — Редактор и просмотр клинических этапов плана лечения.
 * Представляет этапы и процедуры по стандарту Apple HIG (Grouped List):
 * - Интерактивные карточки этапов (min-h-[52px]) с номерами визитов и недель
 * - Привязка процедур к зубам по формуле FDI (11–48)
 * - Чистый клинический язык без советского канцелярита (Мандат 8ap)
 * - 0 disabled блокировок (Мандат 8e)
 */

import React from "react";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import type { TreatmentPlanStage } from "../treatmentPlanTypes";
import { formatRubles } from "../treatmentPlanTypes";

export interface TreatmentPlanStageEditorProps {
	readonly stages: readonly TreatmentPlanStage[];
	readonly activeTierTitle: string;
	readonly totalRub: number;
	readonly expandedStageId: string | null;
	readonly onToggleStage: (stageId: string) => void;
}

export const TreatmentPlanStageEditor: React.FC<TreatmentPlanStageEditorProps> = ({
	stages,
	activeTierTitle,
	totalRub,
	expandedStageId,
	onToggleStage,
}) => {
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h4 className="text-xs sm:text-sm font-bold tracking-wider text-[var(--muted)] m-0">
					Этапы выбранного плана: «{activeTierTitle.replace("★ ", "")}»
				</h4>
				<span className="text-xs text-[var(--muted)]">
					{stages.length} этапа · Итого {formatRubles(totalRub)}
				</span>
			</div>

			<div className="space-y-2.5">
				{stages.map((stage) => {
					const stageKey = stage.id || `stage-${stage.stageNumber}`;
					const isExpanded = Boolean(stage.id && expandedStageId === stage.id);
					return (
						<div
							key={stageKey}
							className="tp-stage-card rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-xs"
						>
							<button
								type="button"
								onClick={() => stage.id && onToggleStage(stage.id)}
								className="tp-stage-header-btn w-full min-h-[52px] p-3 sm:p-4 flex items-center justify-between text-left hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
							>
								<div className="flex items-center gap-3 min-w-0">
									<div className="tp-stage-badge w-7 h-7 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] font-black text-xs flex items-center justify-center shrink-0">
										{stage.stageNumber}
									</div>
									<div className="min-w-0">
										<div className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">
											{stage.title}
										</div>
										<div className="text-[11px] text-[var(--muted)] truncate">
											{stage.subtitle}
										</div>
									</div>
								</div>

								<div className="flex items-center gap-3 shrink-0">
									<div className="text-right">
										<div className="text-xs sm:text-sm font-black text-[var(--ink)]">
											{formatRubles(stage.totalRub)}
										</div>
										<div className="text-[10px] text-[var(--muted)] flex items-center gap-1 justify-end">
											<Calendar className="w-3 h-3" />
											{stage.estimatedVisits} визит · {stage.estimatedWeeks} нед.
										</div>
									</div>
									{isExpanded ? (
										<ChevronUp className="w-4 h-4 text-[var(--muted)]" />
									) : (
										<ChevronDown className="w-4 h-4 text-[var(--muted)]" />
									)}
								</div>
							</button>

							{/* Раскрывающийся состав услуг этапа */}
							{isExpanded && (
								<div className="px-3 sm:px-4 pb-3 pt-1 border-t border-[var(--line)] bg-[var(--paper-soft)] space-y-2">
									{stage.items.map((item) => (
										<div
											key={item.id}
											className="flex items-center justify-between gap-2 py-1.5 border-b border-[var(--line-subtle)] last:border-0 text-xs"
										>
											<div className="flex items-center gap-2 min-w-0">
												{item.toothNumber && (
													<span className="font-bold text-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] px-1.5 py-0.5 rounded text-[10px] shrink-0">
														№{item.toothNumber}
													</span>
												)}
												<span className="text-[var(--ink)] truncate">{item.name}</span>
											</div>
											<span className="font-bold text-[var(--ink)] shrink-0">
												{formatRubles(item.priceRub)}
											</span>
										</div>
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default TreatmentPlanStageEditor;
