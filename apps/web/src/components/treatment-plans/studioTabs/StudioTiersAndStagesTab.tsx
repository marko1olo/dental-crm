/**
 * StudioTiersAndStagesTab.tsx — Вкладка 3 тарифов и клинических этапов в студии планов лечения.
 * Мандаты 8b, 8al: Десктопная сетка + Apple HIG Segmented Control для смартфонов (390x844).
 * Мандат 8e: Автономия врача — скидки до 100%, кнопки никогда не disabled, 0 блокировок.
 * Мандат 8x: Чистый клинический язык без канцелярита («Варианты и тарифы», «Этапы и стоимость»).
 */

import React, { useState } from "react";
import { Check, ShieldCheck, Sparkles, Calendar, ChevronDown, ChevronUp, Plus, Trash2, Clock, Landmark, FileText } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId, TreatmentPlanItem } from "../treatmentPlanTypes";
import { formatRubles } from "../treatmentPlanTypes";
import { isMicroConsumable } from "../treatmentPlanConsumables";

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
	readonly onAddItemToStage?: (stageId: string, item: TreatmentPlanItem) => void;
	readonly onRemoveItemFromStage?: (stageId: string, itemId: string) => void;
	readonly onGenerateFromTeeth?: () => void;
	readonly onAddCustomStage?: () => void;
}

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
		<div className="space-y-6" data-testid="studio-tiers-stages-tab">
			{/* Быстрые шаблоны по диагнозам в 1 клик (Мандат 8n) */}
			<div className="flex items-center gap-2 overflow-x-auto text-xs no-scrollbar pb-1 snap-x">
				<span className="text-[var(--muted)] font-medium shrink-0 flex items-center gap-1">
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
					Типовые сметы:
				</span>
				{[
					{ label: "Кариес (K02)", code: "K02" },
					{ label: "Пульпит (K04)", code: "K04" },
					{ label: "Имплантация (K08)", code: "K08" },
				].map((p) => (
					<button
						key={p.code}
						type="button"
						onClick={() => onSelectDiagnosisPreset(p.code)}
						className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] font-medium shrink-0 snap-start cursor-pointer transition-colors"
					>
						{p.label}
					</button>
				))}
				<button
					type="button"
					onClick={onResetToCanonical}
					className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] font-medium shrink-0 snap-start cursor-pointer transition-colors"
				>
					Полный комплекс (4 этапа)
				</button>
			</div>

			{/* Мобильный Segmented Control (Apple HIG 390x844: без 2500px скролла и без сжатия в 3 узкие колонки) */}
			<div className="sm:hidden w-full space-y-3">
				<div className="tp-segmented-control grid grid-cols-3 gap-1 p-1 bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl" role="tablist">
					{computedTiers.map((tier) => {
						const isSelected = tier.tierId === selectedTierId;
						return (
							<button
								key={tier.tierId}
								type="button"
								role="tab"
								aria-selected={isSelected}
								onClick={() => onSelectTierId(tier.tierId)}
								className={`tp-segmented-btn min-h-[44px] py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
									isSelected ? "is-selected bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
								data-testid={`segmented-tab-${tier.tierId}`}
							>
								<span className="truncate w-full text-center">{tier.tierId === "economy" ? "Эконом" : tier.tierId === "optimum" ? "Оптимум" : "Премиум"}</span>
								<span className="text-[10px] opacity-90 truncate w-full text-center">{formatRubles(tier.totalRub)}</span>
							</button>
						);
					})}
				</div>

				{/* Карточка выбранного тарифа на смартфонах (на всю ширину экрана) */}
				<div className="tp-mobile-selected-tier-card p-4 rounded-xl border-2 border-[var(--teal,#0d9488)] bg-[var(--paper-soft)] shadow-xs space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--teal,#0d9488)] text-white">{activeTier.badge}</span>
						<span className="text-xs text-[var(--muted)] flex items-center gap-1">
							<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							{activeTier.warrantyYears} {activeTier.warrantyYears === 1 ? "год" : activeTier.warrantyYears === 3 ? "года" : "лет"} гарантии
						</span>
					</div>

					<div className="flex items-baseline justify-between gap-2">
						<h3 className="text-base font-black text-[var(--ink)] m-0 flex items-center gap-1.5">
							{activeTier.isRecommended && <ShieldCheck className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />}
							<span>{sanitizedActiveTitle}</span>
						</h3>
						<div className="text-xl font-black text-[var(--ink)] tracking-tight">{formatRubles(activeTier.totalRub)}</div>
					</div>

					<div className="grid grid-cols-2 gap-2 text-xs py-1.5 border-y border-[var(--line)]">
						<div className="flex items-center gap-1.5 text-[var(--muted)]">
							<Clock className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
							<span>0% рассрочка от {formatRubles(Math.round(activeTier.totalRub / 12))}/мес</span>
						</div>
						<div className="flex items-center gap-1.5 text-[var(--muted)]">
							<Landmark className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
							<span>Вычет 13%: +{formatRubles(Math.round(activeTier.totalRub * 0.13))}</span>
						</div>
					</div>

					<p className="text-xs text-[var(--muted)] m-0 leading-relaxed">{activeTier.subtitle}</p>

					<ul className="space-y-1.5 text-xs text-[var(--muted)] pt-1 border-t border-[var(--line)]">
						{(activeTier.keyAdvantages ?? []).slice(0, 4).map((adv, idx) => (
							<li key={idx} className="flex items-start gap-1.5">
								<Check className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
								<span className="leading-tight">{adv}</span>
							</li>
						))}
					</ul>
				</div>
			</div>

			{/* Десктопная 3-тарифная сетка (Эконом / Оптимум / Премиум) */}
			<div className="tp-tiers-grid hidden sm:grid sm:grid-cols-3 gap-4">
				{computedTiers.map((tier) => {
					const isSelected = tier.tierId === selectedTierId;
					const tierTitleClean = tier.title.replace(/^[^a-zA-Zа-яА-Я0-9]+/, "");
					const monthlyInstallment = Math.round(tier.totalRub / 12);
					const ndflRefund = Math.round(tier.totalRub * 0.13);

					return (
						<div
							key={tier.tierId}
							onClick={() => onSelectTierId(tier.tierId)}
							className={`tp-tier-card flex flex-col p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
								isSelected
									? "is-selected border-[var(--teal,#0d9488)] bg-[var(--paper-soft)] shadow-md ring-2 ring-[var(--teal,#0d9488)]/20"
									: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line-strong,#94a3b8)]"
							}`}
							data-testid={`tier-card-${tier.tierId}`}
						>
							<div className="flex items-center justify-between mb-2">
								<span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${tier.isRecommended ? "bg-[var(--teal,#0d9488)] text-white" : "bg-[var(--line-subtle)] text-[var(--muted)]"}`}>
									{tier.badge}
								</span>
								<span className="text-xs text-[var(--muted)] flex items-center gap-1">
									<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									{tier.warrantyYears} {tier.warrantyYears === 1 ? "год" : tier.warrantyYears === 3 ? "года" : "лет"} гарантии
								</span>
							</div>

							<h3 className="text-base font-black text-[var(--ink)] m-0 flex items-center gap-1.5">
								{tier.isRecommended && <ShieldCheck className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />}
								<span>{tierTitleClean}</span>
							</h3>

							<p className="text-xs text-[var(--muted)] mt-1 mb-3 line-clamp-2">{tier.subtitle}</p>

							<div className="mt-auto pt-2 border-t border-[var(--line)] space-y-2.5">
								<div className="tp-tier-price text-2xl sm:text-[30px] font-black text-[var(--ink)] tracking-tight">
									{formatRubles(tier.totalRub)}
								</div>

								{/* Финансовые преференции тарифа: рассрочка и налоговый вычет */}
								<div className="space-y-1 text-[11px] text-[var(--muted)]">
									<div className="flex items-center justify-between">
										<span>Рассрочка 0% клиники:</span>
										<strong className="text-[var(--ink)]">от {formatRubles(monthlyInstallment)}/мес</strong>
									</div>
									<div className="flex items-center justify-between">
										<span>Возврат 13% НДФЛ:</span>
										<strong className="text-emerald-600 dark:text-emerald-400">+{formatRubles(ndflRefund)}</strong>
									</div>
								</div>

								<ul className="mt-2 space-y-1.5 text-xs text-[var(--muted)] pt-2 border-t border-[var(--line-subtle)]">
									{(tier.keyAdvantages ?? []).slice(0, 4).map((adv, idx) => (
										<li key={idx} className="flex items-start gap-1.5">
											<Check className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
											<span className="leading-tight text-xs">{adv}</span>
										</li>
									))}
								</ul>
							</div>
						</div>
					);
				})}
			</div>

			{/* Клинические этапы лечения и процедуры FDI 11–48 */}
			<div className="space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<h4 className="text-xs sm:text-sm font-bold tracking-wider text-[var(--muted)] m-0">
						{isExpressMode ? "Краткая структура выбранного плана:" : "Клинические этапы и процедуры плана:"} «{sanitizedActiveTitle}»
					</h4>
					<span className="text-xs text-[var(--muted)] font-medium">
						{activeTier.stages.length} этапа · Итого {formatRubles(activeTier.totalRub)}
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
								className="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
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
										const cleanItems = isExpressMode ? rawItems.filter((item) => !isMicroConsumable(item)) : rawItems;
										const itemsToRender = isExpressMode && cleanItems.length > 0 ? cleanItems : rawItems;
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
																	className="p-1 rounded text-[var(--muted)] hover:text-rose-500 cursor-pointer"
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
																		className="px-3 py-1 rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs font-bold cursor-pointer"
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
