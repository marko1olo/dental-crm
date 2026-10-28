/**
 * PresenterStagesSection.tsx — Клинические этапы и зубная формула презентера (Мандат 8b, 8e).
 * Поэтапная оплата через кассовый чекаут без блокировки врача.
 */

import React from "react";
import { ChevronDown, ChevronUp, CreditCard } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanStage } from "../treatmentPlanTypes";
import { formatRubles, romanizeStageNumber } from "../treatmentPlanTypes";
import { DEFAULT_PRESENTER_STAGES } from "./TreatmentPlanPresenterDefaultStages";

export interface PresenterStagesSectionProps {
	readonly activeTier: TreatmentPlanTier | undefined;
	readonly expandedStageIndex: number | null;
	readonly onToggleStage: (idx: number) => void;
	readonly onPayStageClick: (stage: TreatmentPlanStage) => void;
}

export const PresenterStagesSection: React.FC<PresenterStagesSectionProps> = ({
	activeTier,
	expandedStageIndex,
	onToggleStage,
	onPayStageClick,
}) => {
	const stages = activeTier?.stages && activeTier.stages.length > 0 ? activeTier.stages : DEFAULT_PRESENTER_STAGES;

	return (
		<div className="space-y-4 pt-2">
			{/* Зубная формула плана */}
			<div
				className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-2xs gap-3 flex-wrap"
				data-testid="treatment-plan-fdi-formula"
			>
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-xl bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center shrink-0 font-bold text-xs">
						FDI
					</div>
					<div>
						<div className="text-xs font-bold text-[var(--ink)]">Зубная формула плана: FDI 11–48</div>
						<div className="text-[11px] text-[var(--muted)]">Комплексный протокол санации и реабилитации зубочелюстной системы</div>
					</div>
				</div>
				<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
					<span className="font-semibold text-[var(--ink)]">Гарантия клиники: {activeTier?.warrantyYears ?? 1} года</span>
				</div>
			</div>

			{/* Аккордеон клинических этапов */}
			<div className="space-y-3" data-testid="stages-accordion-section">
				<div className="flex items-center justify-between pb-1 flex-wrap gap-2">
					<div>
						<h3 className="text-sm font-bold text-[var(--ink)] m-0">Клинические этапы плана</h3>
						<p className="text-xs text-[var(--muted)] m-0">Поэтапная реализация и расчет стоимости каждого визита</p>
					</div>
					<span className="text-xs px-3 py-1 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
						Выбранный вариант: <strong className="text-[var(--ink)]">{activeTier?.title || "План"}</strong>
					</span>
				</div>

				{stages.map((stage, idx) => {
					const isExpanded = expandedStageIndex === idx;
					const stageNumber = stage.stageNumber || idx + 1;

					return (
						<div
							key={stage.id || idx}
							className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-xs hover:border-[var(--teal)]/40 transition-all"
						>
							<div
								onClick={() => onToggleStage(idx)}
								className="flex items-center justify-between p-3.5 sm:p-4 bg-[var(--paper-soft)] border-b border-[var(--line)] cursor-pointer select-none gap-3 flex-wrap sm:flex-nowrap"
							>
								<div className="flex items-center gap-3.5 min-w-0">
									<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--teal)]/10 border border-[var(--teal)]/20 text-[var(--teal)] font-black text-xs sm:text-sm flex items-center justify-center shrink-0">
										{romanizeStageNumber(stageNumber)}
									</div>
									<div className="min-w-0">
										<div className="flex items-center gap-2">
											<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0 truncate">
												Этап {stageNumber}: {stage.title}
											</h4>
											{stage.estimatedWeeks && (
												<span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hidden sm:inline-block">
													~{stage.estimatedWeeks} нед.
												</span>
											)}
										</div>
										<p className="text-xs text-[var(--muted)] m-0 truncate mt-0.5">{stage.clinicalGoal}</p>
									</div>
								</div>

								<div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto sm:ml-0">
									<span className="text-xs sm:text-sm font-black text-[var(--ink)]">{formatRubles(stage.totalRub)}</span>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onPayStageClick(stage as TreatmentPlanStage);
										}}
										className="secondary-button dente-btn dente-btn-secondary min-h-[38px] px-3 sm:px-3.5 rounded-xl text-xs font-semibold text-[var(--teal)] bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 border border-[var(--teal)]/30 inline-flex items-center gap-1.5 cursor-pointer transition-all"
										data-testid={`presenter-pay-stage-btn-${stage.id || idx}`}
										title={`Оплатить этап №${stageNumber} через кассовый чек`}
									>
										<CreditCard size={14} className="shrink-0" />
										<span className="hidden sm:inline">Оплатить этап</span>
										<span className="sm:hidden">Оплата</span>
									</button>
									<div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[var(--muted)] bg-[var(--paper)] border border-[var(--line)] shrink-0">
										{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
									</div>
								</div>
							</div>

							{isExpanded && (
								<div className="p-3 sm:p-4 bg-[var(--paper)]">
									<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] divide-y divide-[var(--line)] overflow-hidden">
										{stage.items?.map((item) => (
											<div
												key={item.id}
												className="p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 text-xs min-h-[48px]"
											>
												<div className="flex items-center gap-2.5 min-w-0">
													{item.toothNumber && (
														<span className="px-2 py-0.5 rounded-md bg-[var(--teal)]/10 border border-[var(--teal)]/20 text-[var(--teal)] font-bold text-[11px] shrink-0">
															Зуб {item.toothNumber}
														</span>
													)}
													<span className="code-804n-badge px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] font-mono text-[10px] shrink-0">
														{item.code804n || item.serviceCode || "A16.07"}
													</span>
													<span className="text-[var(--ink)] font-semibold truncate">{item.name}</span>
												</div>
												<span className="font-bold text-[var(--ink)] whitespace-nowrap text-xs sm:text-sm shrink-0">
													{formatRubles(item.priceRub || item.unitPriceRub || 0)}
												</span>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};
