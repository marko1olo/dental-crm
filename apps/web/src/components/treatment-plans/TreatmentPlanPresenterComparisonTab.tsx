/**
 * TreatmentPlanPresenterComparisonTab.tsx — вкладка 3-Tier сравнения вариантов плана лечения
 * («Эконом», «Оптимум», «Премиум») для презентации пациенту у кресла.
 */

import React from "react";
import {
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Package,
	Percent,
	ShieldCheck,
	Sparkles,
	Star,
} from "lucide-react";
import {
	formatWarrantyYearsText,
	type TreatmentPlanTier,
	type TreatmentPlanTierId,
} from "./types";
import { isMicroConsumable } from "./treatmentPlanConsumables";
import { MissingPriceAlert } from "./MissingPriceAlert";

export interface TreatmentPlanPresenterComparisonTabProps {
	readonly allTiers: readonly TreatmentPlanTier[];
	readonly selectedTierId: TreatmentPlanTierId;
	readonly onSelectTier: (tier: TreatmentPlanTier) => void;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly formatRubles: (amount: number | undefined | null) => string;
	readonly expandedStages: Record<number, boolean>;
	readonly onToggleStage: (stageNum: number) => void;
	readonly onToggleAllStages: (expand: boolean) => void;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables?: (React.Dispatch<React.SetStateAction<boolean>> | ((fn: (prev: boolean) => boolean) => void)) | undefined;
	readonly setActiveTab?: ((tab: "comparison" | "stages" | "finance" | "print" | "aiAudit") => void) | undefined;
	readonly onUpdateItemPrice: (itemId: string, newPriceRub: number) => void;
	readonly onConfirmPatientChoice: (tier?: TreatmentPlanTier) => void;
	readonly isChoiceConfirmed: boolean;
	readonly confirmedTierId: TreatmentPlanTierId | null;
	readonly onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
}

export const TreatmentPlanPresenterComparisonTab: React.FC<TreatmentPlanPresenterComparisonTabProps> = ({
	allTiers,
	selectedTierId,
	onSelectTier,
	getTierLetter,
	formatRubles,
	expandedStages,
	onToggleStage,
	onToggleAllStages,
	showMicroConsumables,
	setShowMicroConsumables,
	setActiveTab,
	onUpdateItemPrice,
	onConfirmPatientChoice,
	isChoiceConfirmed,
	confirmedTierId,
	onApproveAndSign,
}) => {
	const selectedTier = allTiers.find((t) => t.tierId === selectedTierId) || allTiers[0]!;

	return (
						<div className="flex flex-col gap-6" data-testid="comparison-view">
							{/* Mobile & iPad Segmented Control (Adaptive switcher for <= 1024px screens) */}
							<div className="treatment-mobile-tier-bar" data-testid="mobile-tier-tabs">
								{allTiers.map((t) => {
									const isCurrent = selectedTierId === t.tierId;
									return (
										<button
											key={t.tierId}
											type="button"
											onClick={() => onSelectTier(t)}
											className={"treatment-mobile-tier-btn " + (isCurrent ? "active " : "") + t.tierId}
											data-testid={"mobile-tier-btn-" + t.tierId}
											aria-pressed={isCurrent}
										>
											<div className="flex items-center gap-1.5 font-extrabold text-[13px]">
												{t.tierId === "standard" && <Star size={13} className="text-amber-400 fill-amber-400 shrink-0" />}
												<span>
													{t.tierId === "economy"
														? "Эконом"
														: t.tierId === "standard"
															? "Оптимум"
															: "Премиум"}
												</span>
												{t.tierId === "standard" && <Sparkles size={12} className="text-amber-400 shrink-0" />}
											</div>
											<div className="text-[11px] font-mono opacity-90 font-bold">
												{t.totalRub.toLocaleString("ru-RU")} ₽
											</div>
										</button>
									);
								})}
							</div>

							{/* Chairside Presentation Grid */}
							<div className="treatment-3tier-grid">
								{allTiers.map((tier) => {
									const isSelected = selectedTierId === tier.tierId;
									const isRecommended = tier.tierId === "standard";
									const variantLetter = getTierLetter(tier.tierId);

									return (
										<div
											key={tier.tierId}
											onClick={() => onSelectTier(tier)}
											className={"treatment-tier-card " + (isSelected ? "selected " : "") + (isRecommended ? "recommended " : "") + "cursor-pointer"}
											data-testid={"tier-card-" + tier.tierId}
										>
											{/* Doctor Recommendation Ribbon */}
											{isRecommended && (
												<div className="treatment-doctor-ribbon" data-testid="doctor-recommendation-badge">
													<Sparkles size={13} />
													<span>Рекомендация врача</span>
												</div>
											)}

											{/* Card Header */}
											<div className="treatment-tier-header">
												<div className="treatment-tier-badge-row">
													<span className={"treatment-tier-badge " + tier.tierId}>{variantLetter}</span>
													{isSelected && (
														<span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400">
															<CheckCircle2 size={14} />
															<span>Выбран</span>
														</span>
													)}
												</div>
												<h3 className="treatment-tier-name break-words leading-snug">{tier.title}</h3>
												<p className="treatment-tier-desc line-clamp-2">{tier.subtitle}</p>

												{/* Price Box */}
												<div className="treatment-tier-price-box">
													<div className="text-[11px] font-bold text-[var(--tp-text-muted)] uppercase tracking-wider">
														Итоговая стоимость
													</div>
													<div className="treatment-tier-total-amount">
														<span>{(tier.totalRub || 0).toLocaleString("ru-RU")}</span>
														<span className="treatment-tier-rub-sign">₽</span>
													</div>
													<div className="treatment-tier-finance-chips">
														<div className="treatment-tier-chip-row">
															<span>Рассрочка 0% (12 мес):</span>
															<span className="treatment-tier-chip-highlight">
																{(tier.monthlyInstallment12Rub || 0).toLocaleString("ru-RU")} ₽/мес
															</span>
														</div>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																setActiveTab?.("finance");
															}}
															className="treatment-tier-ndfl-calc-btn cursor-pointer"
															title="1-клик детальный расчет вычета 13% НДФЛ и справка ФНС"
															data-testid={"calc-ndfl-btn-" + tier.tierId}
														>
															<div className="flex items-center justify-between w-full">
																<span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300">
																	<Percent size={12} />
																	<span>Вычет 13% НДФЛ:</span>
																</span>
																<span className="font-black text-emerald-700 dark:text-emerald-300">
																	−{(tier.ndflRefundRub || 0).toLocaleString("ru-RU")} ₽
																</span>
															</div>
															<div className="text-[10px] text-emerald-600/90 dark:text-emerald-400/90 text-left mt-0.5">
																Итого с вычетом: {(tier.priceWithNdflRefundRub || 0).toLocaleString("ru-RU")} ₽ ({tier.ndflDetails.code === "02" ? "Код 02 без лимита" : "Код 01 лимит 150к"})
															</div>
														</button>
													</div>
												</div>
											</div>

											{/* Metrics Strip */}
											<div className="treatment-tier-metrics">
												<div className="treatment-metric-item">
													<Clock size={13} />
													<span>Срок:</span>
													<span className="treatment-metric-val">{tier.durationWeeks} нед. ({tier.durationVisits} виз.)</span>
												</div>
												<div className="treatment-metric-item">
													<ShieldCheck size={13} />
													<span>Гарантия:</span>
													<span className="treatment-metric-val">
														{formatWarrantyYearsText(tier.warrantyYears)}
													</span>
												</div>
											</div>

											{/* Advantages & Materials */}
											<div className="treatment-tier-advantages">
												<div className="text-[11px] font-bold text-[var(--tp-text-muted)] uppercase tracking-wider">
													Материалы и преимущества:
												</div>
												<p className="text-xs font-semibold text-[var(--tp-text-main)] m-0 leading-snug line-clamp-2">
													{tier.materialsHeadline}
												</p>
												<ul className="list-none p-0 m-0 space-y-1.5 mt-1">
													{tier.keyAdvantages.slice(0, 4).map((adv, idx) => (
														<li key={idx} className="treatment-advantage-item">
															<Check size={14} className="treatment-advantage-icon" />
															<span className="text-xs">{adv}</span>
														</li>
													))}
												</ul>
											</div>

											{/* Stages Mini Breakdown */}
											<div className="treatment-tier-stages-strip">
												<div className="text-[10px] font-bold text-[var(--tp-text-muted)] uppercase">
													Смета по этапам лечения:
												</div>
												{tier.stages.map((st) => (
													<div key={st.stageNumber} className="treatment-tier-stage-line">
														<span className="truncate max-w-[170px]">Этап {st.stageNumber}: {st.title.split(":")[1] || st.title}</span>
														<span className="treatment-tier-stage-sum">{(st.totalRub || 0).toLocaleString("ru-RU")} ₽</span>
													</div>
												))}
											</div>

											{/* Single Primary Action Button (Miller's Law: strictly 1 primary action) */}
											<div className="p-3.5 pt-0">
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														onSelectTier(tier);
														onConfirmPatientChoice(tier);
													}}
													className="treatment-tier-select-btn w-full cursor-pointer m-0"
													data-testid={"apply-tier-btn-" + tier.tierId}
													aria-pressed={isSelected}
												>
													{isSelected ? (
														<>
															<Check size={14} />
															<span>Выбранный вариант</span>
														</>
													) : (
														<>
															<CheckCircle2 size={14} />
															<span>Применить: выбрать этот план ({(tier.totalRub || 0).toLocaleString("ru-RU")} ₽)</span>
														</>
													)}
												</button>
											</div>
										</div>
									);
								})}
							</div>

							{/* Collapsible Stages Accordion for Active Selected Tier */}
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

														<div className="treatment-stage-right-meta shrink-0">
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
																	{(() => {
																		const microConsumables = stage.items.filter(isMicroConsumable);
																		const displayList = showMicroConsumables
																			? stage.items
																			: stage.items.filter((it) => !isMicroConsumable(it));
																		return (
																			<>
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
																			</>
																		);
																	})()}
																</tbody>
															</table>
														</div>
													)}
												</div>
											);
										})
									)}
								</div>
							</section>
						</div>
	);
};
