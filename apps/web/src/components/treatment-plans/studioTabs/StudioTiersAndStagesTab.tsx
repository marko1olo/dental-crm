/**
 * StudioTiersAndStagesTab.tsx — Вкладка 3 тарифов и клинических этапов в студии планов лечения.
 * Мандаты 8b, 8al: Десктопная сетка + Apple HIG Segmented Control для смартфонов (390x844).
 * Мандат 8e: Автономия врача — скидки до 100%, кнопки никогда не disabled, 0 блокировок.
 * Мандат 8x: Чистый клинический язык без канцелярита («Варианты и тарифы», «Этапы и стоимость»).
 */

import React, { useState } from "react";
import { Check, Sparkles, Calendar, ChevronDown, ChevronUp, Plus, Trash2, FileText } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId, TreatmentPlanItem } from "../treatmentPlanTypes";
import { formatRubles } from "../treatmentPlanTypes";
import { isMicroConsumable } from "../treatmentPlanConsumables";
import { TreatmentPlan3TierComparison } from "../TreatmentPlan3TierComparison";

export interface StudioTiersAndStagesTabProps {
	readonly computedTiers: readonly TreatmentPlanTier[];
	readonly activeTier: TreatmentPlanTier;
	readonly selectedTierId: TreatmentPlanTierId;
	readonly onSelectTierId: (id: TreatmentPlanTierId) => void;
	readonly expandedStageId: string | null;
	readonly onToggleExpandStage: (id: string) => void;
	readonly onSelectDiagnosisPreset: (diagCode: string) => void;
	readonly onResetToCanonical: () => void;
	readonly isExpressMode?: boolean;
	readonly hideMicroConsumablesForPatient?: boolean;
	readonly onAddItemToStage?: (stageId: string, item: TreatmentPlanItem) => void;
	readonly onRemoveItemFromStage?: (stageId: string, itemId: string) => void;
	readonly onGenerateFromTeeth?: () => void;
	readonly onAddCustomStage?: () => void;
}

const formatStagesCount = (count: number): string => {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod100 >= 11 && mod100 <= 19) return `${count} этапов`;
	if (mod10 === 1) return `${count} этап`;
	if (mod10 >= 2 && mod10 <= 4) return `${count} этапа`;
	return `${count} этапов`;
};

export const StudioTiersAndStagesTab: React.FC<StudioTiersAndStagesTabProps> = ({
	computedTiers,
	activeTier,
	selectedTierId,
	onSelectTierId,
	expandedStageId,
	onToggleExpandStage,
	onSelectDiagnosisPreset,
	onResetToCanonical,
	isExpressMode = false,
	hideMicroConsumablesForPatient = true,
	onAddItemToStage,
	onRemoveItemFromStage,
	onGenerateFromTeeth,
	onAddCustomStage,
}) => {
	const sanitizedActiveTitle = activeTier.title.replace(/^[^a-zA-Zа-яА-Я0-9]+/, "");
	const [addingToStageId, setAddingToStageId] = useState<string | null>(null);
	const [newItemName, setNewItemName] = useState<string>("");
	const [newItemPriceRub, setNewItemPriceRub] = useState<number>(3500);
	const [newItemTooth, setNewItemTooth] = useState<string>("");

	const handleAddCustomProcedure = (stageId: string) => {
		if (!newItemName.trim()) return;
		if (onAddItemToStage) {
			const newItem: TreatmentPlanItem = {
				id: `item-custom-${Date.now()}`,
				name: newItemName.trim(),
				priceRub: newItemPriceRub,
				unitPriceRub: newItemPriceRub,
				discountRub: 0,
				quantity: 1,
				toothNumber: newItemTooth ? Number(newItemTooth) : undefined,
				stageKind: "stage_custom",
				isCompleted: false,
			};
			onAddItemToStage(stageId, newItem);
		}
		setNewItemName("");
		setAddingToStageId(null);
	};

	return (
		<div className="space-y-4" data-testid="studio-tiers-stages-tab">
			{/* Быстрые шаблоны по диагнозам МКБ-10 (Мандат 8n) */}
			<div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs pb-1">
				<span className="text-[var(--muted)] font-medium shrink-0 flex items-center gap-1">
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
					Типовые сметы:
				</span>
				<div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
					{[
						{ label: "Кариес (K02)", code: "K02" },
						{ label: "Пульпит (K04)", code: "K04" },
						{ label: "Имплантация (K08)", code: "K08" },
					].map((p) => (
						<button
							key={p.code}
							type="button"
							onClick={() => onSelectDiagnosisPreset(p.code)}
							className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] font-medium text-center cursor-pointer transition-colors"
						>
							{p.label}
						</button>
					))}
					<button
						type="button"
						onClick={onResetToCanonical}
						className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] font-medium text-center cursor-pointer transition-colors"
					>
						Полный комплекс
					</button>
				</div>
			</div>

			{/* Канонический 3-тарифный презентер (TreatmentPlan3TierComparison SSOT) */}
			<TreatmentPlan3TierComparison
				tiers={computedTiers}
				selectedTierId={selectedTierId}
				onSelectTier={(tier) => onSelectTierId(tier.tierId)}
			/>

			{/* Клинические этапы лечения и процедуры FDI 11–48 */}
			<div className="space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<h4 className="text-xs sm:text-sm font-bold tracking-wider text-[var(--muted)] m-0">
						{isExpressMode ? "Краткая структура выбранного плана:" : "Клинические этапы и процедуры плана:"} «{sanitizedActiveTitle}»
					</h4>
					<span className="text-xs text-[var(--muted)] font-medium">
						{formatStagesCount(activeTier.stages.length)} · Итого {formatRubles(activeTier.totalRub)}
					</span>
				</div>

				{activeTier.stages.length === 0 ? (
					<div
						className="tp-empty-plan-card p-4 sm:p-5 rounded-2xl border-2 border-dashed border-[var(--line-strong,#94a3b8)] bg-[var(--paper-soft)] text-center space-y-3"
						data-testid="treatment-plan-empty-state"
					>
						<div className="w-12 h-12 rounded-2xl bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center mx-auto">
							<FileText className="w-6 h-6" />
						</div>
						<div className="space-y-1">
							<h4 className="text-base font-bold text-[var(--ink)] m-0">План лечения ещё не сформирован</h4>
							<p className="text-xs text-[var(--muted)] max-w-md mx-auto m-0 leading-relaxed">
								Выберите вариант формирования плана для быстрого старта или добавьте клинические этапы вручную
							</p>
						</div>
						<div className="flex flex-wrap items-center justify-center gap-3 pt-2">
							<button
								type="button"
								onClick={() => {
									if (onGenerateFromTeeth) {
										onGenerateFromTeeth();
									} else {
										onSelectDiagnosisPreset("K02");
									}
								}}
								className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--teal,#0d9488)] bg-[var(--paper)] hover:bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer"
								data-testid="btn-generate-from-formula"
							>
								<Sparkles className="w-4 h-4" />
								<span>Сформировать из зубной формулы</span>
							</button>

							<button
								type="button"
								onClick={onResetToCanonical}
								className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-[var(--ink)] text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer"
								data-testid="btn-canonical-protocol"
							>
								<Check className="w-4 h-4 text-[var(--teal,#0d9488)]" />
								<span>Полный клинический протокол</span>
							</button>

							<button
								type="button"
								onClick={() => {
									if (onAddCustomStage) {
										onAddCustomStage();
									} else {
										onResetToCanonical();
									}
								}}
								className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-[var(--ink)] text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer"
								data-testid="btn-add-procedure-empty"
							>
								<Plus className="w-4 h-4 text-[var(--muted)]" />
								<span>Добавить процедуру</span>
							</button>
						</div>
					</div>
				) : (
					<div className="space-y-2.5">
						{activeTier.stages.map((stage) => {
							const stageKey = stage.id || `stage-${stage.stageNumber}`;
							const isExpanded = Boolean(stage.id && expandedStageId === stage.id);
							const isAddingToThis = addingToStageId === stage.id;

							return (
								<div key={stageKey} className="tp-stage-card rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-xs">
									<button
										type="button"
										onClick={() => stage.id && onToggleExpandStage(stage.id)}
										className="tp-stage-header-btn w-full min-h-[52px] p-3 sm:p-4 flex items-center justify-between text-left hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
									>
										<div className="flex items-center gap-3 min-w-0">
											<div className="tp-stage-badge w-7 h-7 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] font-black text-xs flex items-center justify-center shrink-0">
												{stage.stageNumber}
											</div>
											<div className="min-w-0">
												<div className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">{stage.title}</div>
												<div className="text-[11px] text-[var(--muted)] line-clamp-2 leading-tight">{stage.subtitle}</div>
											</div>
										</div>

										<div className="flex items-center gap-3 shrink-0">
											<div className="text-right">
												<div className="text-xs sm:text-sm font-black text-[var(--ink)]">{formatRubles(stage.totalRub)}</div>
												<div className="text-[10px] text-[var(--muted)] flex items-center gap-1 justify-end">
													<Calendar className="w-3 h-3" />
													{stage.estimatedVisits} визит · {stage.estimatedWeeks} нед.
												</div>
											</div>
											{isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted)]" />}
										</div>
									</button>

									{/* Состав процедур этапа */}
									{isExpanded && (() => {
										const rawItems = stage.items || [];
										const cleanItems = hideMicroConsumablesForPatient ? rawItems.filter((item) => !isMicroConsumable(item)) : rawItems;
										const itemsToRender = hideMicroConsumablesForPatient && cleanItems.length > 0 ? cleanItems : rawItems;
										const hiddenMicroCount = rawItems.length - itemsToRender.length;

										return (
											<div className="px-3 sm:px-4 pb-3 pt-1 border-t border-[var(--line)] bg-[var(--paper-soft)] space-y-2">
												{itemsToRender.map((item) => (
													<div key={item.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-[var(--line-subtle)] last:border-0 text-xs">
														<div className="flex items-center gap-2 min-w-0">
															{item.toothNumber && (
																<span className="font-bold text-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] px-1.5 py-0.5 rounded text-[10px] shrink-0">
																	№{item.toothNumber}
																</span>
															)}
															<span className="text-[var(--ink)] line-clamp-2 leading-snug">{item.name}</span>
														</div>
														<div className="flex items-center gap-2 shrink-0">
															<span className="font-bold text-[var(--ink)]">{formatRubles(item.priceRub)}</span>
															{!isExpressMode && onRemoveItemFromStage && stage.id && (
																<button
																	type="button"
																	onClick={() => onRemoveItemFromStage(stage.id!, item.id)}
																	className="p-1 rounded text-[var(--muted)] hover:text-[var(--rust,#b91c1c)] cursor-pointer"
																	title="Удалить услугу из этапа"
																>
																	<Trash2 className="w-3.5 h-3.5" />
																</button>
															)}
														</div>
													</div>
												))}

												{hiddenMicroCount > 0 && (
													<div className="px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] text-[11px] text-[var(--muted)] flex items-center gap-1.5">
														<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
														<span>Сопутствующие микро-расходники ({hiddenMicroCount} поз.) включены в стоимость процедур</span>
													</div>
												)}

												{/* Инлайн добавление процедуры в экспертном режиме */}
												{!isExpressMode && onAddItemToStage && stage.id && (
													<div className="pt-2">
														{isAddingToThis ? (
															<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-2 text-xs">
																<div className="font-bold text-[var(--ink)]">Добавление процедуры в этап:</div>
																<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
																	<input
																		type="text"
																		placeholder="Название процедуры"
																		value={newItemName}
																		onChange={(e) => setNewItemName(e.target.value)}
																		className="sm:col-span-2 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
																	/>
																	<div className="flex items-center gap-1.5">
																		<input
																			type="number"
																			placeholder="Зуб №"
																			value={newItemTooth}
																			onChange={(e) => setNewItemTooth(e.target.value)}
																			className="w-16 px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
																		/>
																		<input
																			type="number"
																			step="100"
																			placeholder="Цена ₽"
																			value={newItemPriceRub}
																			onChange={(e) => setNewItemPriceRub(Number(e.target.value))}
																			className="w-24 px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-bold"
																		/>
																	</div>
																</div>
																<div className="flex justify-end gap-2 pt-1">
																	<button
																		type="button"
																		onClick={() => setAddingToStageId(null)}
																		className="px-3 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--muted)] cursor-pointer"
																	>
																		Отмена
																	</button>
																	<button
																		type="button"
																		onClick={() => handleAddCustomProcedure(stage.id!)}
																		className="px-3 py-1 rounded-lg border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft)] text-[var(--teal,#0d9488)] hover:bg-[var(--teal,#0d9488)] hover:text-white text-xs font-bold cursor-pointer transition-colors"
																	>
																		Добавить
																	</button>
																</div>
															</div>
														) : (
															<button
																type="button"
																onClick={() => setAddingToStageId(stage.id || null)}
																className="text-xs font-semibold text-[var(--teal,#0d9488)] hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
															>
																<Plus className="w-3.5 h-3.5" />
																<span>Добавить процедуру в этап</span>
															</button>
														)}
													</div>
												)}
											</div>
										);
									})()}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default StudioTiersAndStagesTab;
