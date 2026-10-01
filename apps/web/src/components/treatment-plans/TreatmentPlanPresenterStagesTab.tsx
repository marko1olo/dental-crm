/**
 * TreatmentPlanPresenterStagesTab.tsx — детальный просмотр клинических этапов
 * выбранного варианта плана лечения.
 */

import React from "react";
import { Package } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "./types";
import { isMicroConsumable } from "./treatmentPlanConsumables";
import { MissingPriceAlert } from "./MissingPriceAlert";

export interface TreatmentPlanPresenterStagesTabProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly selectedTierId: TreatmentPlanTierId;
	readonly allTiers: readonly TreatmentPlanTier[];
	readonly onSelectTier: (tier: TreatmentPlanTier) => void;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables?: (React.Dispatch<React.SetStateAction<boolean>> | ((fn: (prev: boolean) => boolean) => void)) | undefined;
	readonly onUpdateItemPrice: (itemId: string, newPriceRub: number) => void;
}

export const TreatmentPlanPresenterStagesTab: React.FC<TreatmentPlanPresenterStagesTabProps> = ({
	selectedTier,
	selectedTierId,
	allTiers,
	onSelectTier,
	showMicroConsumables,
	setShowMicroConsumables,
	onUpdateItemPrice,
}) => {
	return (
						<div className="flex flex-col gap-4" data-testid="stages-detailed-view">
							<div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex-wrap gap-3">
								<div>
									<h3 className="text-base font-bold text-[var(--tp-text-main)] m-0">
										Развернутая смета клинических этапов лечения
									</h3>
									<p className="text-xs text-[var(--tp-text-muted)] m-0">
										Выбранный вариант: <strong>{selectedTier.title}</strong> · Итого по смете:{" "}
										<strong className="text-[var(--tp-primary)]">{selectedTier.totalRub.toLocaleString("ru-RU")} ₽</strong>
									</p>
								</div>
								<div className="flex items-center gap-2">
									{allTiers.map((t) => (
										<button
											key={t.tierId}
											type="button"
											onClick={() => onSelectTier(t)}
											className={"px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer " + (selectedTierId === t.tierId ? "bg-[var(--tp-primary)] text-white border-[var(--tp-primary)] shadow-sm" : "bg-[var(--tp-bg)] text-[var(--tp-text-muted)] border-[var(--tp-border)] hover:text-[var(--tp-text-main)]")}
										>
											{t.badge}
										</button>
									))}
								</div>
							</div>

							<div className="flex flex-col gap-4">
								{selectedTier.stages.length === 0 ? (
									<div className="p-8 text-center rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] text-xs text-[var(--tp-text-muted)] flex flex-col items-center justify-center gap-2">
										<Package size={28} className="text-[var(--tp-primary)] opacity-50" />
										<span className="font-bold text-sm text-[var(--tp-text-main)]">
											В смете пока нет клинических этапов
										</span>
										<span>
											Назначьте медицинские процедуры или примените готовые клинические пакеты
										</span>
									</div>
								) : (
									selectedTier.stages.map((st) => (
										<div key={st.stageNumber} className="p-5 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)]">
											<div className="flex items-center justify-between pb-3 border-b border-[var(--tp-border)] mb-3">
												<div className="flex items-center gap-3 min-w-0 flex-1">
													<div className="treatment-stage-num-badge shrink-0">{st.stageNumber}</div>
													<div className="min-w-0 flex-1">
														<h4 className="text-sm font-black text-[var(--tp-text-main)] m-0 truncate">{st.title}</h4>
														<p className="text-xs text-[var(--tp-text-muted)] m-0 truncate">{st.clinicalGoal}</p>
													</div>
												</div>
												<div className="text-right shrink-0">
													<div className="text-sm font-black text-[var(--tp-text-main)] font-mono">
														{(st.totalRub || 0).toLocaleString("ru-RU")} ₽
													</div>
													<div className="text-[11px] text-[var(--tp-text-muted)]">
														{st.estimatedWeeks} нед. · {st.estimatedVisits} визитов
													</div>
												</div>
											</div>

											<div className="treatment-stage-table-wrap p-0">
												<table className="treatment-stage-table">
													<thead>
														<tr>
															<th className="w-10">№</th>
															<th className="w-28">Код услуги</th>
															<th className="w-16">Зуб FDI</th>
															<th>Наименование медицинской услуги</th>
															<th className="w-16 text-center">Кол-во</th>
															<th className="w-24 text-right">Цена</th>
															<th className="w-24 text-right">Стоимость</th>
														</tr>
													</thead>
													<tbody>
														{(() => {
															const microConsumables = st.items.filter(isMicroConsumable);
															const displayList = showMicroConsumables
																? st.items
																: st.items.filter((it) => !isMicroConsumable(it));
															return (
																<>
																	{displayList.length === 0 ? (
																		<tr>
																			<td colSpan={7} className="py-6 text-center text-xs text-[var(--tp-text-muted)]">
																				В данном этапе пока нет назначенных процедур
																			</td>
																		</tr>
																	) : (
																		displayList.map((it, idx) => (
																			<tr key={it.id || idx}>
																				<td className="text-center font-mono text-[var(--tp-text-muted)]">{idx + 1}</td>
																				<td>
																					<span className="code-804n-badge">{it.code804n}</span>
																				</td>
																				<td className="text-center">
																					{it.toothNumber ? (
																						<span className="tooth-fdi-badge">{it.toothNumber}</span>
																					) : (
																						<span className="text-[var(--tp-text-muted)]">—</span>
																					)}
																				</td>
																				<td>
																					<div className="font-semibold text-[var(--tp-text-main)] break-words min-w-0">{it.name}</div>
																					{it.materials && (
																						<div className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5">
																							Материал: {it.materials}
																						</div>
																					)}
																					{(it.requiresManualPricing || it.priceRub === 0) && (
																						<div className="mt-1">
																							<MissingPriceAlert
																								item={it}
																								onUpdatePrice={onUpdateItemPrice}
																								variant="inline"
																							/>
																						</div>
																					)}
																				</td>
																				<td className="text-center font-semibold">{it.quantity}</td>
																				<td className="text-right text-[var(--tp-text-muted)] font-mono">
																					{(it.unitPriceRub || 0).toLocaleString("ru-RU")} ₽
																				</td>
																				<td className={`text-right font-bold font-mono ${
																					it.requiresManualPricing || it.priceRub === 0
																						? "text-amber-600 dark:text-amber-400"
																						: "text-[var(--tp-text-main)]"
																				}`}>
																					{(it.priceRub || 0).toLocaleString("ru-RU")} ₽
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
										</div>
									))
								)}
							</div>
						</div>
	);
};

