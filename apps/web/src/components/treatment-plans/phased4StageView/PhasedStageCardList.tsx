/**
 * PhasedStageCardList.tsx — Карточки 4 клинических фаз плана лечения
 * с манипуляциями, номерами зубов FDI, скрытием микро-расходников и кнопками этапа.
 */

import React from "react";
import type { TreatmentPlanStageCategory } from "@dental/shared";
import { DentalCrown } from "../../icons/DentalIcons.js";
import { isMicroConsumable } from "../TreatmentPlanPresenterModal";
import { showToast } from "../../GlobalToast";
import {
	CATEGORY_ORDER,
	STAGE_STATUS_META,
	STAGE_SUBTITLES,
	STAGE_TIMELINE_LABELS,
	STAGE_TITLES,
	type CategorizedPhasedPlanData,
	type PhasedStageItem,
	type PhasedStageStatus,
} from "./types";

export interface PhasedStageCardListProps {
	readonly categorized: CategorizedPhasedPlanData;
	readonly expandedStages: Readonly<Record<TreatmentPlanStageCategory, boolean>>;
	readonly expandedConsumables: Readonly<Record<TreatmentPlanStageCategory, boolean>>;
	readonly stageStatuses: Readonly<Record<TreatmentPlanStageCategory, PhasedStageStatus>>;
	readonly onToggleExpandStage: (category: TreatmentPlanStageCategory) => void;
	readonly onToggleStageConsumables: (
		category: TreatmentPlanStageCategory,
		e: React.MouseEvent,
	) => void;
	readonly onCycleStageStatus: (
		category: TreatmentPlanStageCategory,
		e: React.MouseEvent,
	) => void;
	readonly onSetStageAgreed: (category: TreatmentPlanStageCategory) => void;
	readonly onBookStageToVisit?:
		| ((category: TreatmentPlanStageCategory, items: readonly PhasedStageItem[]) => void)
		| undefined;
	readonly onExecuteStage?: ((category: TreatmentPlanStageCategory) => void) | undefined;
	readonly onOpenStagePayment?:
		| ((category: TreatmentPlanStageCategory, amountRub: number) => void)
		| undefined;
}

const renderStageIcon = (cat: TreatmentPlanStageCategory): React.ReactNode => {
	switch (cat) {
		case "hygiene_sanitation":
			return (
				<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
					/>
				</svg>
			);
		case "endo_therapy":
			return (
				<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
					/>
				</svg>
			);
		case "surgery_implant":
			return (
				<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
				</svg>
			);
		case "ortho_prosthetics":
			return <DentalCrown size={18} />;
	}
};

export const PhasedStageCardList: React.FC<PhasedStageCardListProps> = ({
	categorized,
	expandedStages,
	expandedConsumables,
	stageStatuses,
	onToggleExpandStage,
	onToggleStageConsumables,
	onCycleStageStatus,
	onSetStageAgreed,
	onBookStageToVisit,
	onExecuteStage,
	onOpenStagePayment,
}) => {
	return (
		<>
			{categorized.totalItemsCount === 0 && (
				<div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)] p-6 text-center">
					<div className="text-sm font-bold text-[var(--ink)]">
						В плане пока нет назначенных клинических позиций
					</div>
					<p className="mt-1 text-xs text-[var(--ink-muted)] max-w-md mx-auto">
						Отметьте патологии на зубной формуле или выберите готовый клинический протокол, чтобы автоматически сформировать 4-этапный план лечения с расчетом по кодам 804н.
					</p>
					<div className="mt-3 flex justify-center gap-2">
						<button
							type="button"
							onClick={() => {
								if (typeof window !== "undefined") {
									window.dispatchEvent(new CustomEvent("dente-focus-odontogram"));
								}
							}}
							className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer min-h-[36px]"
						>
							Сформировать из зубной формулы
						</button>
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 gap-4">
				{CATEGORY_ORDER.map((cat, idx) => {
					const stageData = categorized.map[cat];
					const meta = stageData.meta;
					const isExpanded = expandedStages[cat];
					const hasItems = stageData.items.length > 0;
					const stageSharePercent =
						categorized.grandTotalRub > 0
							? Math.round((stageData.subtotalRub / categorized.grandTotalRub) * 100)
							: 0;
					const currentStatus = stageStatuses[cat];
					const statusBadge = STAGE_STATUS_META[currentStatus];
					const showConsumablesForStage = expandedConsumables[cat];
					const primaryItems = stageData.items.filter(
						(it) => !isMicroConsumable(it.name, it.priceRub),
					);
					const microConsumables = stageData.items.filter((it) =>
						isMicroConsumable(it.name, it.priceRub),
					);
					const visibleItems =
						showConsumablesForStage || primaryItems.length === 0
							? stageData.items
							: primaryItems;
					const microConsumablesTotalRub = microConsumables.reduce(
						(sum, it) => sum + it.priceRub,
						0,
					);

					return (
						<div
							key={cat}
							data-testid={`phased-stage-card-${cat}`}
							className={`rounded-xl border transition-all ${
								hasItems
									? "border-[var(--line)] bg-[var(--paper)] shadow-sm"
									: "border-dashed border-[var(--line)] bg-[var(--paper-soft)]"
							}`}
						>
							<div
								role="button"
								tabIndex={0}
								aria-expanded={isExpanded}
								onClick={() => onToggleExpandStage(cat)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onToggleExpandStage(cat);
									}
								}}
								className="w-full flex flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-[var(--paper-soft)] transition-colors rounded-t-xl cursor-pointer"
							>
								<div className="flex items-center gap-3 min-w-0 flex-1">
									<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--teal)_28%,transparent)] bg-[color-mix(in_srgb,var(--teal)_10%,var(--paper))] text-[var(--teal)]">
										{renderStageIcon(cat)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--teal)] border border-[var(--line)]">
												Этап {idx + 1} из 4
											</span>
											<h4 className="text-sm font-bold text-[var(--ink)]">
												{STAGE_TITLES[cat] || meta.labelRu}
											</h4>
											<span className="inline-flex items-center gap-1 rounded-md bg-[var(--paper-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-muted)] border border-[var(--line)]">
												<svg
													className="w-3 h-3 text-[var(--ink-muted)]"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
												Срок: {STAGE_TIMELINE_LABELS[cat]}
											</span>
											<button
												type="button"
												data-testid={`phased-stage-status-${cat}`}
												onClick={(e) => onCycleStageStatus(cat, e)}
												title="Нажмите для переключения статуса этапа (Черновик -> Согласован -> В работе -> Завершён)"
												className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border transition-colors cursor-pointer ${statusBadge.badgeClass}`}
											>
												<span
													className="w-1.5 h-1.5 rounded-full"
													style={{ backgroundColor: statusBadge.dotColor }}
												/>
												{statusBadge.label}
											</button>
										</div>
										<p className="text-xs text-[var(--ink-muted)] mt-0.5">
											{STAGE_SUBTITLES[cat]}
										</p>
									</div>
								</div>

								<div className="flex items-center gap-4">
									<div className="text-right">
										<div className="text-sm font-bold text-[var(--ink)] tabular-nums">
											{stageData.subtotalRub.toLocaleString("ru-RU")} ₽
										</div>
										<div className="text-[11px] text-[var(--ink-muted)] tabular-nums">
											{hasItems
												? `${stageData.items.length} услуг (${stageSharePercent}% от сметы)`
												: "Не требуется по показаниям"}
										</div>
									</div>

									<span
										className={`text-[var(--ink-muted)] transition-transform duration-200 ${
											isExpanded ? "rotate-180" : ""
										}`}
									>
										<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</span>
								</div>
							</div>

							{isExpanded && (
								<div className="border-t border-[var(--line)] px-4 py-3 space-y-2">
									{hasItems ? (
										<div className="divide-y divide-[var(--line)]">
											{visibleItems.map((item, itemIdx) => (
												<div
													key={`${item.id}-${itemIdx}`}
													className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
												>
													<div className="flex items-start gap-2.5 min-w-0 flex-1">
														<span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--paper-soft)] text-[10px] font-bold text-[var(--ink-muted)] border border-[var(--line)]">
															{itemIdx + 1}
														</span>
														<div className="min-w-0 flex-1">
															<div className="font-semibold text-[var(--ink)] flex items-center gap-2 flex-wrap">
																<span>{item.name}</span>
																{item.toothNumber && (
																	<span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-[color-mix(in_srgb,var(--teal)_12%,var(--paper))] text-[var(--teal)] border border-[color-mix(in_srgb,var(--teal)_28%,transparent)]">
																		Зуб {item.toothNumber}
																	</span>
																)}
																<span className="font-mono text-[10px] text-[var(--ink-muted)] bg-[var(--paper-soft)] px-1.5 py-0.5 rounded border border-[var(--line)]">
																	804н: {item.code804n}
																</span>
															</div>
															{item.clinicalJustification && (
																<div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
																	Клиническая цель: {item.clinicalJustification}
																</div>
															)}
														</div>
													</div>

													<div className="text-right font-bold text-[var(--ink)] tabular-nums shrink-0">
														{item.priceRub.toLocaleString("ru-RU")} ₽
													</div>
												</div>
											))}

											{microConsumables.length > 0 && primaryItems.length > 0 && (
												<div className="pt-2.5 pb-1 flex items-center justify-between gap-2">
													<button
														type="button"
														onClick={(e) => onToggleStageConsumables(cat, e)}
														className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
													>
														<span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[10px] font-bold">
															{showConsumablesForStage ? "−" : "+"}
														</span>
														<span>
															{showConsumablesForStage
																? `Скрыть расходные материалы и анестезию (${microConsumables.length} поз.)`
																: `Включено в протокол: Коффердам, карпульная анестезия и микро-расходники (${microConsumables.length} поз.)`}
														</span>
													</button>
													{!showConsumablesForStage && (
														<span className="text-[11px] font-semibold text-[var(--ink-muted)] tabular-nums">
															{microConsumablesTotalRub.toLocaleString("ru-RU")} ₽
														</span>
													)}
												</div>
											)}
										</div>
									) : (
										<div className="py-3 text-xs text-[var(--ink-muted)] flex items-center justify-between flex-wrap gap-2">
											<span>
												На данном этапе манипуляции не назначены — этап не блокирует согласование остальных фаз лечения.
											</span>
											<span className="text-[11px] font-semibold text-[var(--ink)] tabular-nums">
												0 ₽
											</span>
										</div>
									)}

									<div className="pt-2 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-xs">
										<div className="flex items-center gap-3 flex-wrap">
											<span className="font-medium text-[var(--ink-muted)]">
												Итог по этапу #{idx + 1} ({STAGE_TITLES[cat]}):{" "}
												<strong className="text-[var(--ink)] tabular-nums">
													{stageData.subtotalRub.toLocaleString("ru-RU")} ₽
												</strong>
											</span>
											<span className="text-[11px] text-[var(--ink-muted)]">
												Позиций: {stageData.items.length} | Коды 804н:{" "}
												{hasItems
													? Array.from(new Set(stageData.items.map((i) => i.code804n))).join(", ")
													: "—"}
											</span>
										</div>

										<div className="flex items-center gap-2 flex-wrap">
											<button
												type="button"
												data-testid={`phased-approve-stage-${cat}`}
												onClick={(e) => {
													e.stopPropagation();
													onSetStageAgreed(cat);
													showToast(
														`Этап «${STAGE_TITLES[cat]}» (${stageData.subtotalRub.toLocaleString("ru-RU")} ₽) согласован с пациентом`,
														"success",
														3000,
													);
												}}
												className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer min-h-[36px]"
											>
												<svg
													className="w-3.5 h-3.5 text-[var(--teal)]"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
													strokeWidth={2}
												>
													<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
												</svg>
												{currentStatus === "agreed" ? "Этап согласован" : "Согласовать этап"}
											</button>

											<button
												type="button"
												data-testid={`phased-book-stage-${cat}`}
												onClick={(e) => {
													e.stopPropagation();
													if (onBookStageToVisit) {
														onBookStageToVisit(cat, stageData.items);
													} else if (typeof window !== "undefined") {
														window.dispatchEvent(
															new CustomEvent("dente-book-stage-appointment", {
																detail: {
																	category: cat,
																	title: STAGE_TITLES[cat],
																	items: stageData.items,
																	subtotalRub: stageData.subtotalRub,
																},
															}),
														);
													}
												}}
												className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer min-h-[36px]"
											>
												<svg
													className="w-3.5 h-3.5 text-[var(--teal)]"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
													strokeWidth={2}
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
													/>
												</svg>
												Записать на приём
											</button>

											{onExecuteStage && (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														onExecuteStage(cat);
													}}
													className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--teal)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity cursor-pointer min-h-[36px]"
												>
													<svg
														className="w-3.5 h-3.5"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
														strokeWidth={2}
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
														/>
													</svg>
													Приступить к этапу
												</button>
											)}

											{onOpenStagePayment && (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														onOpenStagePayment(cat, stageData.subtotalRub);
													}}
													className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer min-h-[36px]"
												>
													<svg
														className="w-3.5 h-3.5 text-[var(--teal)]"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
														strokeWidth={2}
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
														/>
													</svg>
													Оплатить этап ({stageData.subtotalRub.toLocaleString("ru-RU")} ₽)
												</button>
											)}
										</div>
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</>
	);
};
