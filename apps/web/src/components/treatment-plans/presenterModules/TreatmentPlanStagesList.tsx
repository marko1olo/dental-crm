/**
 * TreatmentPlanStagesList.tsx — Высокопроизводительный список клинических этапов
 * плана лечения (Wave 19 / Chairside Low-Spec Tablet Optimized).
 *
 * Оптимизирован для слабых планшетов у кресла:
 * - Аппаратное GPU-ускорение (transform: translateZ(0), will-change)
 * - Сенсорные хитбоксы >= 44x44px по Apple HIG
 * - Отображение зубов FDI 11..48 и кодов Номенклатуры 804н
 * - Интерактивное раскрытие этапов и прозрачные расчеты стоимости
 */

import React from "react";
import {
	ChevronDown,
	ChevronRight,
	Clock,
	Calendar,
	CheckCircle2,
	AlertCircle,
	Sparkles,
} from "lucide-react";
import { humanizeDentalText } from "@dental/shared";
import type { TreatmentPlanTier, TreatmentPlanStage } from "./treatmentPlanPresenterTypes";
import { isMicroConsumable } from "../treatmentPlanConsumables";

export interface TreatmentPlanStagesListProps {
	readonly tier: TreatmentPlanTier;
	readonly expandedStages: Record<number, boolean>;
	readonly onToggleStage: (stageNum: number) => void;
	readonly onToggleAllStages?: (expand: boolean) => void;
	readonly showMicroConsumables: boolean;
	readonly onUpdateItemPrice?: (itemId: string, newPriceRub: number) => void;
	readonly isCompact?: boolean;
}

export const TreatmentPlanStagesList: React.FC<TreatmentPlanStagesListProps> = ({
	tier,
	expandedStages,
	onToggleStage,
	onToggleAllStages,
	showMicroConsumables,
	onUpdateItemPrice,
	isCompact = false,
}) => {
	const allExpanded = tier.stages.every((s) => expandedStages[s.stageNumber]);

	return (
		<div
			className="treatment-stages-list-container flex flex-col gap-3.5"
			data-testid="treatment-plan-stages-list"
			style={{ transform: "translateZ(0)", willChange: "transform" }}
		>
			{/* Верхняя строка управления аккордеонами этапов */}
			{onToggleAllStages && tier.stages.length > 1 && (
				<div className="flex items-center justify-between px-1 py-1 text-xs text-[var(--muted)]">
					<span className="font-medium">
						Всего этапов: <strong className="text-[var(--ink)]">{tier.stages.length}</strong> · Визитов:{" "}
						<strong className="text-[var(--ink)]">{tier.durationVisits}</strong>
					</span>
					<button
						type="button"
						onClick={() => onToggleAllStages(!allExpanded)}
						className="min-h-[36px] min-w-[44px] px-2.5 py-1 text-xs rounded-lg text-[var(--teal)] hover:bg-[var(--teal-soft)] transition-colors cursor-pointer font-semibold inline-flex items-center gap-1 active:scale-98"
						aria-label={allExpanded ? "Свернуть все этапы" : "Развернуть все этапы"}
					>
						{allExpanded ? "Свернуть все" : "Развернуть все"}
					</button>
				</div>
			)}

			{/* Карточки этапов с аппаратным ускорением для слабых планшетов */}
			{tier.stages.map((stage: TreatmentPlanStage) => {
				const isExpanded = expandedStages[stage.stageNumber] ?? false;
				const visibleItems = showMicroConsumables
					? stage.items
					: stage.items.filter((it) => !isMicroConsumable(it));

				// Определение категории этапа для понятного визуального маркера
				const isSurgery = /имплант|синус|хирург|удален/i.test(stage.title);
				const isProsthetics = /коронк|протез|винир|циркон|ортопед/i.test(stage.title);
				const isTherapy = /кариес|пульпит|пломб|санаци|гигиен/i.test(stage.title);

				const badgeBg = isSurgery
					? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
					: isProsthetics
						? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
						: isTherapy
							? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
							: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]";

				return (
					<section
						key={stage.stageNumber}
						className="treatment-stage-card rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs overflow-hidden transition-all duration-200"
						style={{ willChange: "transform, opacity" }}
					>
						{/* Шапка этапа (Кликабельный тач-таргет >= 44px) */}
						<button
							type="button"
							onClick={() => onToggleStage(stage.stageNumber)}
							className="w-full min-h-[52px] p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 bg-[var(--paper)] hover:bg-[var(--paper-soft)] active:bg-[var(--paper-soft)] transition-colors cursor-pointer border-none"
							aria-expanded={isExpanded}
							aria-controls={`stage-content-${stage.stageNumber}`}
						>
							<div className="flex items-center gap-3 min-w-0 flex-1">
								{/* Номер этапа */}
								<div className="w-8 h-8 rounded-full bg-[var(--teal)] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
									{stage.stageNumber}
								</div>

								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 flex-wrap">
										<h4 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0 truncate">
											{stage.title}
										</h4>
										<span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${badgeBg}`}>
											{isSurgery ? "Хирургия" : isProsthetics ? "Ортопедия" : "Терапия / Санация"}
										</span>
									</div>
									<p className="text-xs text-[var(--muted)] m-0 mt-0.5 truncate">
										{humanizeDentalText(stage.clinicalGoal || stage.title)}
									</p>
								</div>
							</div>

							{/* Справа: стоимость и раскрытие */}
							<div className="flex items-center gap-3 shrink-0">
								<div className="text-right">
									<div className="text-sm sm:text-base font-extrabold text-[var(--ink)] font-mono">
										{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
									</div>
									<div className="text-[11px] text-[var(--muted)] flex items-center justify-end gap-1">
										<Clock size={12} className="opacity-70" />
										<span>~{stage.estimatedWeeks} нед. ({stage.estimatedVisits} виз.)</span>
									</div>
								</div>

								<div className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
									{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
								</div>
							</div>
						</button>

						{/* Раскрывающийся список услуг этапа */}
						{isExpanded && (
							<div
								id={`stage-content-${stage.stageNumber}`}
								className="border-t border-[var(--line-subtle)] bg-[var(--paper-soft)] p-3 sm:p-4 animate-in fade-in-50 duration-150"
							>
								{visibleItems.length === 0 ? (
									<div className="py-4 text-center text-xs text-[var(--muted)]">
										В этом этапе нет активных процедур
									</div>
								) : (
									<div className="flex flex-col gap-2">
										{visibleItems.map((item, idx) => {
											const toothBadge =
												item.toothNumber && item.toothNumber > 0 ? (
													<span className="px-1.5 py-0.5 rounded bg-[var(--teal-soft)] text-[var(--teal)] font-mono text-[11px] font-bold">
														Зуб {item.toothNumber}
													</span>
												) : null;

											const itemTotalRub = (item.priceRub || 0) * (item.quantity || 1);

											return (
												<div
													key={item.id || `${stage.stageNumber}-${idx}`}
													className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line-subtle)] hover:border-[var(--line)] transition-colors"
												>
													<div className="flex items-center gap-2.5 min-w-0 flex-1">
														<div className="w-5 h-5 rounded-full bg-[var(--paper-soft)] text-[var(--muted)] text-[10px] flex items-center justify-center font-bold shrink-0">
															{idx + 1}
														</div>
														<div className="min-w-0 flex-1">
															<div className="flex items-center gap-2 flex-wrap">
																{item.code804n && (
																	<span className="text-[10.5px] font-mono text-[var(--muted)] font-semibold">
																		{item.code804n}
																	</span>
																)}
																{toothBadge}
																<span className="text-xs sm:text-sm font-medium text-[var(--ink)] truncate">
																	{item.name}
																</span>
															</div>
															{item.quantity && item.quantity > 1 && (
																<div className="text-[11px] text-[var(--muted)] mt-0.5">
																	{item.quantity} шт. × {(item.priceRub || 0).toLocaleString("ru-RU")} ₽
																</div>
															)}
														</div>
													</div>

													<div className="text-right shrink-0">
														<span className="text-xs sm:text-sm font-bold text-[var(--ink)] font-mono">
															{itemTotalRub.toLocaleString("ru-RU")} ₽
														</span>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						)}
					</section>
				);
			})}
		</div>
	);
};
