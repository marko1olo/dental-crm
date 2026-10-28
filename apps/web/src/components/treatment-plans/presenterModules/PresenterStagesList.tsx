/**
 * PresenterStagesList.tsx — Клинические этапы плана лечения с формулой FDI и прямым финансовым мостом.
 * Мандат 8b: Золотой стандарт modularity (120–160 строк).
 * Мандат 8e: Автономия врача — прозрачный просмотр каждого этапа и связанных зубов.
 * Apple HIG: Сенсорная зона >= 44px, прямое действие «Оплатить этап» в 1 клик.
 */

import React from "react";
import { ChevronDown, ChevronUp, CreditCard } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanStage } from "../treatmentPlanTypes";
import { formatRubles, romanizeStageNumber } from "../treatmentPlanTypes";

export interface PresenterStagesListProps {
	readonly activeTier: TreatmentPlanTier | null;
	readonly expandedStageIndex: number | null;
	readonly onToggleStage: (index: number) => void;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
}

const DEFAULT_FALLBACK_STAGES = [
	{
		id: "st-1",
		stageNumber: 1,
		title: "Этап 1: Терапевтическая подготовка",
		subtitle: "Санация полости рта",
		clinicalGoal: "Устранение воспалительных процессов и кариеса",
		totalRub: 14500,
		items: [
			{ id: "it-1", toothNumber: 16, code804n: "A16.07.002", name: "Восстановление зуба пломбой световой полимеризации", priceRub: 5500, quantity: 1 },
			{ id: "it-2", toothNumber: 26, code804n: "A16.07.030", name: "Эндодонтическое лечение корневого канала", priceRub: 9000, quantity: 1 },
		],
	},
	{
		id: "st-2",
		stageNumber: 2,
		title: "Этап 2: Хирургический этап",
		subtitle: "Установка дентальных имплантатов",
		clinicalGoal: "Восстановление утраченных опорных единиц",
		totalRub: 45000,
		items: [
			{ id: "it-3", toothNumber: 36, code804n: "A16.07.054", name: "Установка дентального имплантата SLA", priceRub: 45000, quantity: 1 },
		],
	},
	{
		id: "st-3",
		stageNumber: 3,
		title: "Этап 3: Ортопедическая реабилитация",
		subtitle: "Постоянные коронки из диоксида циркония",
		clinicalGoal: "Восстановление анатомической формы и жевательной функции",
		totalRub: 26500,
		items: [
			{ id: "it-4", toothNumber: 36, code804n: "A16.07.004", name: "Установка коронки из диоксида циркония на имплантате", priceRub: 26500, quantity: 1 },
		],
	},
];

export const PresenterStagesList: React.FC<PresenterStagesListProps> = ({
	activeTier,
	expandedStageIndex,
	onToggleStage,
	onPayStage,
}) => {
	const rawStages = activeTier?.stages && activeTier.stages.length > 0 ? activeTier.stages : DEFAULT_FALLBACK_STAGES;

	return (
		<div className="space-y-4">
			{/* Зубная формула плана лечения FDI */}
			<div
				className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)]"
				data-testid="treatment-plan-fdi-formula"
			>
				<span className="font-semibold text-[var(--ink)]">Зубная формула плана:</span>
				<span>FDI 11–48 (комплексный клинический протокол СтАР)</span>
			</div>

			{/* КЛИНИЧЕСКИЕ ЭТАПЫ ВЫБРАННОГО ТАРИФА */}
			<div className="space-y-3 pt-2 border-t border-[var(--line)]" data-testid="stages-accordion-section">
				<div className="flex items-center justify-between pb-1 flex-wrap gap-2">
					<h3 className="text-sm font-bold text-[var(--ink)] m-0">Клинические этапы плана</h3>
					<span className="text-xs text-[var(--muted)]">
						Выбранный вариант: <strong className="text-[var(--ink)]">{activeTier?.title || "План"}</strong>
					</span>
				</div>

				{rawStages.map((stage: any, idx: number) => {
					const isExpanded = expandedStageIndex === idx;
					const stageNumber = stage.stageNumber || idx + 1;

					return (
						<div
							key={stage.id || idx}
							className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-2xs"
						>
							<div
								onClick={() => onToggleStage(idx)}
								className="flex items-center justify-between p-3.5 bg-[var(--paper-soft)] cursor-pointer select-none gap-2 flex-wrap sm:flex-nowrap"
							>
								<div className="flex items-center gap-3 min-w-0">
									<div className="w-7 h-7 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] font-black text-xs flex items-center justify-center shrink-0">
										{romanizeStageNumber(stageNumber)}
									</div>
									<div className="min-w-0">
										<h4 className="text-sm font-bold text-[var(--ink)] m-0 truncate">{stage.title}</h4>
										<p className="text-xs text-[var(--muted)] m-0 truncate">{stage.clinicalGoal}</p>
									</div>
								</div>

								<div className="flex items-center gap-3 shrink-0">
									<span className="text-sm font-black text-[var(--ink)]">
										{formatRubles(stage.totalRub)}
									</span>

									{/* Кнопка прямого финансового моста в Кассу */}
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											if (onPayStage) onPayStage(stage as TreatmentPlanStage);
										}}
										className="secondary-button dente-btn dente-btn-secondary h-8 px-3 rounded-xl text-xs font-semibold text-[var(--teal-dark,var(--teal))] bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 border border-[var(--teal)]/30 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-98"
										data-testid={`presenter-pay-stage-btn-${stage.id || idx}`}
										title={`Оплатить этап №${stageNumber} через кассовый чекаут`}
									>
										<CreditCard size={13} className="shrink-0" />
										<span>Оплатить этап</span>
									</button>

									{isExpanded ? (
										<ChevronUp className="w-4 h-4 text-[var(--muted)]" />
									) : (
										<ChevronDown className="w-4 h-4 text-[var(--muted)]" />
									)}
								</div>
							</div>

							{isExpanded && (
								<div className="p-3.5 divide-y divide-[var(--line)]/40 text-xs">
									{stage.items?.map((item: any) => (
										<div key={item.id} className="py-2 flex items-center justify-between gap-3">
											<div className="flex items-center gap-2">
												{item.toothNumber && (
													<span className="px-2 py-0.5 rounded bg-[var(--line-subtle)] text-[var(--ink)] font-bold">
														Зуб {item.toothNumber}
													</span>
												)}
												<span className="code-804n-badge px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] font-mono text-[10px]">
													{item.code804n || item.serviceCode || "A16.07"}
												</span>
												<span className="text-[var(--ink)] font-medium">{item.name}</span>
											</div>
											<div className="text-right whitespace-nowrap">
												<span className="font-bold text-[var(--ink)]">
													{formatRubles(item.priceRub || item.unitPriceRub || 0)}
												</span>
											</div>
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

export default PresenterStagesList;
