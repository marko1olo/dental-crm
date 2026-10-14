/**
 * TreatmentPlanPresenterStagesAccordion.tsx — аккордеон клинических этапов
 * с поддержкой быстрой записи в расписание, заказа ЗТЛ и 7-колоночной таблицы/мобильных карточек.
 */

import React from "react";
import {
	Calendar,
	ChevronDown,
	ChevronUp,
	Clock,
	Layers,
	Package,
} from "lucide-react";
import type {
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "../types";
import { isMicroConsumable } from "../treatmentPlanConsumables";
import { MissingPriceAlert } from "../MissingPriceAlert";

export interface TreatmentPlanPresenterStagesAccordionProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly expandedStages: Record<number, boolean>;
	readonly onToggleStage: (stageNum: number) => void;
	readonly onToggleAllStages: (expand: boolean) => void;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables?: ((fn: (prev: boolean) => boolean) => void) | React.Dispatch<React.SetStateAction<boolean>> | undefined;
	readonly onUpdateItemPrice: (itemId: string, newPriceRub: number) => void;
	readonly handleStageBooking: (stage: TreatmentPlanStage, e?: React.MouseEvent) => void;
	readonly handleOpenLabOrder: (stage: TreatmentPlanStage, e?: React.MouseEvent) => void;
	readonly isStageProsthetic: (stage: TreatmentPlanStage) => boolean;
}

export const TreatmentPlanPresenterStagesAccordion: React.FC<TreatmentPlanPresenterStagesAccordionProps> = ({
	selectedTier,
	getTierLetter,
	expandedStages,
	onToggleStage,
	onToggleAllStages,
	showMicroConsumables,
	setShowMicroConsumables,
	onUpdateItemPrice,
	handleStageBooking,
	handleOpenLabOrder,
	isStageProsthetic,
}) => {
	return (
		<section className="treatment-stages-accordion-wrap" data-testid="stages-accordion-section">
			<div className="treatment-stages-accordion-header">
				<div className="flex items-center gap-2">
					<Clock className="text-[var(--tp-primary)] w-5 h-5" />
					<div>
						<h4 className="text-sm font-bold text-[var(--tp-text-main)] m-0">
							Клинические этапы плана: {selectedTier.title} ({getTierLetter(selectedTier.tierId)})
						</h4>
						<p className="text-xs text-[var(--tp-text-muted)] m-0">
							Клинический протокол медицинских услуг и анатомические зоны FDI (11–48)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onToggleAllStages(true)}
						className="min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--tp-surface-soft)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)] border border-[var(--tp-border)] cursor-pointer inline-flex items-center justify-center"
						data-testid="expand-all-stages-btn"
					>
						Развернуть все
					</button>
					<button
						type="button"
						onClick={() => onToggleAllStages(false)}
						className="min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--tp-surface-soft)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)] border border-[var(--tp-border)] cursor-pointer inline-flex items-center justify-center"
						data-testid="collapse-all-stages-btn"
					>
						Свернуть все
					</button>
				</div>
			</div>

			{/* Stages Accordion List */}
			<div className="flex flex-col gap-3">
				{selectedTier.stages.length === 0 ? (
					<div className="p-8 text-center rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] text-xs text-[var(--tp-text-muted)] flex flex-col items-center justify-center gap-2">
						<Package size={28} className="text-[var(--tp-primary)] opacity-50" />
						<span className="font-bold text-sm text-[var(--tp-text-main)]">
							В данном варианте пока нет клинических этапов
						</span>
						<span>
							Добавьте этапы лечения или выберите готовый клинический пакет СтАР
						</span>
					</div>
				) : (
					selectedTier.stages.map((stage) => {
						const isExpanded = Boolean(expandedStages[stage.stageNumber]);

						return (
							<div
								key={stage.stageNumber}
								className="treatment-stage-item"
								data-testid={"stage-item-" + stage.stageNumber}
							>
								{/* Stage Header */}
								<div
									onClick={() => onToggleStage(stage.stageNumber)}
									className="treatment-stage-header"
									data-testid={"stage-toggle-" + stage.stageNumber}
								>
									<div className="treatment-stage-title-wrap min-w-0 flex-1">
										<div className="treatment-stage-num-badge shrink-0">{stage.stageNumber}</div>
										<div className="min-w-0 flex-1">
											<h5 className="treatment-stage-name truncate">{stage.title}</h5>
											<p className="treatment-stage-subtitle truncate">{stage.subtitle}</p>
										</div>
									</div>

									<div className="treatment-stage-right-meta shrink-0 flex items-center gap-2">
										{/* 1-Click Stage-to-Schedule Booking & Lab Order Buttons */}
										<div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
											<button
												type="button"
												onClick={(e) => handleStageBooking(stage, e)}
												className="min-h-[36px] sm:min-h-[28px] sm:h-7 px-2 sm:px-2.5 rounded-lg text-xs font-semibold bg-teal-500/15 text-teal-700 dark:text-teal-300 hover:bg-teal-500/25 border border-teal-500/30 transition-colors inline-flex items-center gap-1 cursor-pointer touch-manipulation shadow-2xs"
												title={`Записать Этап ${stage.stageNumber} в расписание визитов`}
												data-testid={`stage-book-btn-${stage.stageNumber}`}
											>
												<Calendar size={13} />
												<span>{stage.stageNumber === 1 ? "Записать 1-й этап" : "В расписание"}</span>
											</button>
											{isStageProsthetic(stage) && (
												<button
													type="button"
													onClick={(e) => handleOpenLabOrder(stage, e)}
													className="min-h-[36px] sm:min-h-[28px] sm:h-7 px-2 sm:px-2.5 rounded-lg text-xs font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 transition-colors inline-flex items-center gap-1 cursor-pointer touch-manipulation shadow-2xs"
													title={`Создать заказ-наряд в зуботехническую лабораторию для Этапа ${stage.stageNumber}`}
													data-testid={`stage-lab-order-btn-${stage.stageNumber}`}
												>
													<Layers size={13} />
													<span>Заказ ЗТЛ</span>
												</button>
											)}
										</div>

										<div className="treatment-stage-pill hidden sm:flex">
											<Clock size={13} />
											<span>{stage.estimatedWeeks} нед. ({stage.estimatedVisits} виз.)</span>
										</div>
										<div className="treatment-stage-total-badge font-mono">
											{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
										</div>
										<div className="text-[var(--tp-text-muted)]">
											{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
										</div>
									</div>
								</div>

								{/* Stage Content */}
								{isExpanded && (
									<div className="treatment-stage-table-wrap">
										{(() => {
											const microConsumables = stage.items.filter(isMicroConsumable);
											const displayList = showMicroConsumables
												? stage.items
												: stage.items.filter((it) => !isMicroConsumable(it));
											return (
												<>
													{/* Mobile Card List (< 768px) */}
													<div className="md:hidden space-y-2 py-2" data-testid={"stage-mobile-cards-" + stage.stageNumber}>
														{displayList.length === 0 ? (
															<div className="py-4 text-center text-xs text-[var(--tp-text-muted)]">
																В данном этапе пока нет назначенных медицинских услуг.
															</div>
														) : (
															displayList.map((item, idx) => (
																<div
																	key={item.id || idx}
																	className="p-3 rounded-xl bg-[var(--tp-surface-soft)] border border-[var(--tp-border)] space-y-1.5"
																	data-testid={`stage-item-mobile-${idx}`}
																>
																	<div className="flex items-center justify-between gap-2">
																		<div className="flex items-center gap-1.5 min-w-0">
																			<span className="code-804n-badge text-[10px]">{item.code804n}</span>
																			{item.toothNumber && (
																				<span className="tooth-fdi-badge text-[11px] w-6 h-6">{item.toothNumber}</span>
																			)}
																		</div>
																		<span
																			className={`font-bold font-mono text-xs whitespace-nowrap ${
																				item.requiresManualPricing || item.priceRub === 0
																					? "text-amber-600 dark:text-amber-400"
																					: "text-[var(--tp-text-main)]"
																			}`}
																		>
																			{(item.priceRub || 0).toLocaleString("ru-RU")} ₽
																		</span>
																	</div>

																	<div className="text-xs font-semibold text-[var(--tp-text-main)] leading-snug break-words">
																		{item.name}
																	</div>

																	{item.clinicalRationale && (
																		<div className="text-[11px] text-[var(--tp-text-muted)] leading-tight">
																			{item.clinicalRationale}
																		</div>
																	)}

																	<div className="flex items-center justify-between text-[11px] text-[var(--tp-text-muted)] pt-1 border-t border-[var(--tp-border)]/50">
																		<span>Кол-во: {item.quantity} шт.</span>
																		<span>{(item.unitPriceRub || 0).toLocaleString("ru-RU")} ₽/ед.</span>
																	</div>

																	{(item.requiresManualPricing || item.priceRub === 0) && (
																		<div className="mt-1">
																			<MissingPriceAlert
																				item={item}
																				onUpdatePrice={onUpdateItemPrice}
																				variant="inline"
																			/>
																		</div>
																	)}
																</div>
															))
														)}
														{microConsumables.length > 0 && (
															<div className="p-2.5 rounded-xl bg-[var(--tp-surface-soft)] border border-[var(--tp-border)] text-xs text-[var(--tp-text-muted)] space-y-1">
																<div className="leading-snug">
																	Сопутствующие микро-расходники ({microConsumables.length} поз.) включены в стоимость процедур.
																</div>
																<button
																	type="button"
																	onClick={() => setShowMicroConsumables?.((prev) => !prev)}
																	className="text-[var(--tp-primary)] hover:underline font-bold text-xs cursor-pointer"
																>
																	{showMicroConsumables ? "Скрыть микро-расходники" : "Показать список"}
																</button>
															</div>
														)}
													</div>

													{/* Desktop 7-Column Table (>= 768px) */}
													<div className="hidden md:block">
														<table className="treatment-stage-table">
															<thead>
																<tr>
																	<th className="w-10">№</th>
																	<th className="w-28">Код услуги</th>
																	<th className="w-16">Зуб FDI</th>
																	<th>Наименование услуги</th>
																	<th className="w-16 text-center">Кол-во</th>
																	<th className="w-24 text-right">Цена</th>
																	<th className="w-24 text-right">Итого</th>
																</tr>
															</thead>
															<tbody>
																{displayList.length === 0 ? (
																	<tr>
																		<td colSpan={7} className="py-6 text-center text-xs text-[var(--tp-text-muted)]">
																			В данном этапе пока нет назначенных медицинских услуг.
																		</td>
																	</tr>
																) : (
																	displayList.map((item, idx) => (
																		<tr key={item.id || idx}>
																			<td className="text-center font-mono text-[var(--tp-text-muted)]">
																				{idx + 1}
																			</td>
																			<td>
																				<span className="code-804n-badge">{item.code804n}</span>
																			</td>
																			<td className="text-center">
																				{item.toothNumber ? (
																					<span className="tooth-fdi-badge">{item.toothNumber}</span>
																				) : (
																					<span className="text-[var(--tp-text-muted)]">—</span>
																				)}
																			</td>
																			<td>
																				<div className="font-semibold text-[var(--tp-text-main)] break-words min-w-0">
																					{item.name}
																				</div>
																				{item.clinicalRationale && (
																					<div className="text-[11px] text-[var(--tp-text-muted)] mt-0.5">
																						{item.clinicalRationale}
																					</div>
																				)}
																				{(item.requiresManualPricing || item.priceRub === 0) && (
																					<div className="mt-1">
																						<MissingPriceAlert
																							item={item}
																							onUpdatePrice={onUpdateItemPrice}
																							variant="inline"
																						/>
																					</div>
																				)}
																			</td>
																			<td className="text-center font-semibold">{item.quantity}</td>
																			<td className="text-right text-[var(--tp-text-muted)] font-mono">
																				{(item.unitPriceRub || 0).toLocaleString("ru-RU")} ₽
																			</td>
																			<td className={`text-right font-bold font-mono ${
																				item.requiresManualPricing || item.priceRub === 0
																					? "text-amber-600 dark:text-amber-400"
																					: "text-[var(--tp-text-main)]"
																			}`}>
																				{(item.priceRub || 0).toLocaleString("ru-RU")} ₽
																			</td>
																		</tr>
																	))
																)}
																{microConsumables.length > 0 && (
																	<tr className="bg-[var(--paper-soft)] border-t border-[var(--border)]">
																		<td colSpan={7} className="py-2.5 px-3 text-xs text-[var(--tp-text-muted)]">
																			<div className="flex items-center justify-between flex-wrap gap-2">
																				<span className="flex items-center gap-1.5 font-medium">
																					<span>Сопутствующие микро-расходники ({microConsumables.length} поз.: валики, салфетки, перчатки, слюноотсосы) включены в стоимость процедур.</span>
																				</span>
																				<button
																					type="button"
																					onClick={() => setShowMicroConsumables?.((prev) => !prev)}
																					className="text-[var(--teal)] hover:underline font-bold text-xs cursor-pointer ml-auto"
																				>
																					{showMicroConsumables ? "Скрыть микро-расходники" : "Показать список"}
																				</button>
																			</div>
																		</td>
																	</tr>
																)}
															</tbody>
														</table>
													</div>
												</>
											);
										})()}
									</div>
								)}
							</div>
						);
					})
				)}
			</div>
		</section>
	);
};
