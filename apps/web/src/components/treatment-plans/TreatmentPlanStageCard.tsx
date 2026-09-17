import React, { useMemo, useState, useRef, useEffect } from "react";
import {
	Activity,
	AlertTriangle,
	ChevronDown,
	ChevronUp,
	Clock,
	CreditCard,
	FlaskConical,
	MoreVertical,
	Package,
	Percent,
	Play,
	Printer,
	Trash2,
	TrendingUp,
	Zap,
} from "lucide-react";
import {
	type InventoryItemLookup,
	calculateStageMaterialRequirements,
} from "./treatmentPlanMaterialEngine";
import type { TreatmentPlanItem, TreatmentPlanStage } from "./types";
import { MissingPriceAlert } from "./MissingPriceAlert";
import { isMicroConsumable } from "./TreatmentPlanPresenterModal";

interface TreatmentPlanStageCardProps {
	readonly stage: TreatmentPlanStage;
	readonly defaultExpanded?: boolean | undefined;
	readonly inventoryItems?: readonly InventoryItemLookup[] | undefined;
	readonly onUpdateItemQuantity?: ((itemId: string, newQty: number) => void) | undefined;
	readonly onUpdateItemPrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
	readonly onRemoveItem?: ((itemId: string) => void) | undefined;
	readonly onStartStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExecuteWriteOffStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onOpenLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onOpenInstallment?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onApplyStageDiscount?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExportStageEstimate?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onDeleteStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly className?: string | undefined;
}

export const TreatmentPlanStageCard: React.FC<TreatmentPlanStageCardProps> = ({
	stage,
	defaultExpanded = true,
	inventoryItems,
	onUpdateItemQuantity,
	onUpdateItemPrice,
	onUpdateItem,
	onRemoveItem,
	onStartStage,
	onExecuteWriteOffStage,
	onPayStage,
	onOpenLabOrder,
	onOneClickLabOrder,
	onOpenInstallment,
	onApplyStageDiscount,
	onExportStageEstimate,
	onDeleteStage,
	className = "",
}) => {
	const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
	const [showMaterials, setShowMaterials] = useState<boolean>(false);
	const [showMicroConsumables, setShowMicroConsumables] = useState<boolean>(false);
	const [isStageMenuOpen, setIsStageMenuOpen] = useState<boolean>(false);
	const stageMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isStageMenuOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsStageMenuOpen(false);
			}
		};
		const handleClickOutside = (e: MouseEvent) => {
			if (stageMenuRef.current && !stageMenuRef.current.contains(e.target as Node)) {
				setIsStageMenuOpen(false);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isStageMenuOpen]);

	const isLabOrderEligible =
		stage.stageKind === "stage_3_orthopedics" ||
		stage.stageNumber === 3 ||
		stage.items.some(
			(it) =>
				it.category === "Ортопедия" ||
				it.category === "Детская ортопедия" ||
				/коронк|мост|протез|винир|вкладк|абатмент|бюгел/i.test(it.name),
		);

	const isAction1Start = Boolean(onStartStage);
	const isAction1WriteOff = !isAction1Start && Boolean(onExecuteWriteOffStage && stage.items.length > 0);

	const isAction2Estimate = Boolean(onExportStageEstimate);
	const isAction2Pay = !isAction2Estimate && Boolean(onPayStage && (stage.totalRub || 0) > 0);
	const isAction2WriteOff =
		!isAction2Estimate &&
		!isAction2Pay &&
		!isAction1WriteOff &&
		Boolean(onExecuteWriteOffStage && stage.items.length > 0);

	const showWriteOffInMenu = Boolean(
		onExecuteWriteOffStage && stage.items.length > 0 && !isAction1WriteOff && !isAction2WriteOff,
	);
	const showPayInMenu = Boolean(onPayStage && (stage.totalRub || 0) > 0 && !isAction2Pay);
	const showEstimateInMenu = Boolean(onExportStageEstimate && !isAction2Estimate);

	const hasSecondaryActions = Boolean(
		showWriteOffInMenu ||
		showPayInMenu ||
		showEstimateInMenu ||
		(onOpenLabOrder && isLabOrderEligible) ||
		(onOneClickLabOrder && isLabOrderEligible) ||
		(onOpenInstallment && stage.totalRub > 0) ||
		onApplyStageDiscount ||
		onDeleteStage,
	);

	const materialSummary = useMemo(() => {
		return calculateStageMaterialRequirements(stage, inventoryItems);
	}, [stage, inventoryItems]);

	const presentationMaterials = useMemo(() => {
		return materialSummary.items.filter((mat) => !mat.hideInPatientPresentation);
	}, [materialSummary.items]);

	const stageColorMap = {
		1: {
			badge: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/20",
			iconBg: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))]",
			headerBg: "bg-[var(--teal)]/5",
			accentBorder: "border-[var(--teal,var(--brand-primary))]/30",
		},
		2: {
			badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
			iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
			headerBg: "bg-rose-500/5",
			accentBorder: "border-rose-500/30",
		},
		3: {
			badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
			iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
			headerBg: "bg-purple-500/5",
			accentBorder: "border-purple-500/30",
		},
	};

	const theme = stageColorMap[stage.stageNumber as 1 | 2 | 3] ?? stageColorMap[1];

	return (
		<div
			className={`treatment-stage-card flex flex-col rounded-2xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-xs transition-all duration-200 ${className}`.trim()}
			data-testid={`treatment-stage-${stage.stageNumber}`}
		>
			{/* Stage Header */}
			<div
				onClick={() => setIsExpanded((prev) => !prev)}
				className={`flex items-center justify-between p-3.5 sm:p-4 cursor-pointer select-none transition-colors hover:bg-[var(--paper-soft,#f8fafc)] border-b ${
					isExpanded ? "border-[var(--line,var(--border,#cbd5e1))]" : "border-transparent"
				} ${theme.headerBg} ${isExpanded ? "rounded-t-2xl" : "rounded-2xl"}`}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						setIsExpanded((prev) => !prev);
					}
				}}
				aria-expanded={isExpanded}
				aria-label={stage.title}
			>
				<div className="flex items-center gap-3 min-w-0">
					<div
						className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold font-mono text-sm shrink-0 border ${theme.iconBg} ${theme.accentBorder}`}
					>
						{stage.stageNumber === 1 && "I"}
						{stage.stageNumber === 2 && "II"}
						{stage.stageNumber === 3 && "III"}
					</div>

					<div className="flex flex-col min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] truncate">
								{stage.title}
							</h4>
							<span
								className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${theme.badge}`}
							>
								{stage.items.length} {stage.items.length === 1 ? "процедура" : "процедур"}
							</span>
							{materialSummary.hasDeficit && (
								<span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
									<AlertTriangle size={11} /> Дефицит ТМЦ ({materialSummary.deficitCount})
								</span>
							)}
						</div>
						<p className="text-xs text-[var(--muted,#64748b)] truncate max-w-xl">
							{stage.subtitle}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-4 shrink-0">
					<div className="text-right flex flex-col">
						<span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
							{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
						</span>
						<span className="text-[10px] text-[var(--muted,#64748b)] hidden sm:flex items-center justify-end gap-1">
							<Clock size={11} /> {stage.estimatedVisits} виз. · {stage.estimatedWeeks} нед.
						</span>
					</div>

					<div className="p-1 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]">
						{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
					</div>
				</div>
			</div>

			{/* Stage Body — Monolithic Flat Panel (Anti-Matryoshka) */}
			{isExpanded && (
				<div className="flex flex-col bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-b-2xl">
					{/* Clinical Goal Strip */}
					{stage.clinicalGoal && (
						<div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,var(--border,#cbd5e1))]/60 text-xs text-[var(--muted,#64748b)]">
							<Activity size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
							<span className="font-medium">
								<strong>Клиническая цель:</strong> {stage.clinicalGoal}
							</span>
						</div>
					)}

					{/* Procedure Items Flat Monolithic List */}
					<div className="divide-y divide-[var(--line,#e2e8f0)]">
						{stage.items.length === 0 ? (
							<div className="py-8 px-4 text-center text-xs text-[var(--muted,#64748b)] flex flex-col items-center justify-center gap-2">
								<Package size={24} className="text-[var(--muted,#64748b)] opacity-40" />
								<span className="font-semibold text-[var(--ink,#0f172a)]">
									В данном этапе нет запланированных процедур
								</span>
								<span className="text-[11px] text-[var(--muted,#64748b)] max-w-sm">
									Назначьте процедуры из каталога 804н или примените готовый клинический пакет СтАР
								</span>
							</div>
						) : (
							(() => {
								const microConsumables = stage.items.filter(isMicroConsumable);
								const displayItems = showMicroConsumables
									? stage.items
									: stage.items.filter((it) => !isMicroConsumable(it));
								return (
									<>
										{displayItems.map((item, idx) => (
											<div
												key={item.id || idx}
												className="flex flex-col gap-2 px-4 py-3 hover:bg-[var(--paper-soft,#f8fafc)] transition-colors"
											>
												<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
													<div className="flex flex-col gap-0.5 min-w-0 flex-1">
														<div className="flex items-center gap-1.5 flex-wrap">
															{item.toothNumber && (
																<span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 whitespace-nowrap">
																	#{item.toothNumber}
																</span>
															)}
															<span className="text-[10px] font-mono text-[var(--muted,#64748b)] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-[var(--line,#e2e8f0)] whitespace-nowrap">
																{item.code804n}
															</span>
															<span className="text-[10px] text-[var(--muted,#64748b)] font-medium">
																{item.category}
															</span>
														</div>

														<span
															className="text-xs font-semibold text-[var(--ink,#0f172a)] leading-snug truncate min-w-0 block"
															title={item.name}
														>
															{item.name}
														</span>

														{item.materials && (
															<p
																className="text-[11px] text-[var(--muted,#64748b)] italic m-0 truncate min-w-0"
																title={item.materials}
															>
																Материал: {item.materials}
															</p>
														)}
													</div>

													<div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0">
														{onOpenLabOrder &&
															(item.category === "Ортопедия" ||
																item.category === "Детская ортопедия" ||
																item.stageKind === "stage_3_orthopedics" ||
																/коронк|мост|протез|винир|вкладк|абатмент|бюгел|all-on|onlay|inlay/i.test(
																	item.name,
																) ||
																item.code804n.startsWith("A16.07.003") ||
																item.code804n.startsWith("A16.07.004") ||
																item.code804n.startsWith("A16.07.005") ||
																item.code804n.startsWith("A16.07.006")) && (
																<div className="flex items-center gap-1.5">
																	<button
																		type="button"
																		onClick={() =>
																			onOpenLabOrder(
																				item.toothNumber ? [item.toothNumber] : undefined,
																			)
																		}
																		className="min-h-[44px] sm:min-h-[28px] sm:min-w-0 sm:py-1 sm:px-2.5 sm:text-[11px] px-3 py-2 rounded-lg text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer transition-colors shrink-0 touch-manipulation flex items-center gap-1.5"
																		title={`Оформить наряд-заказ в зуботехническую лабораторию для ${item.name}`}
																		data-testid={`item-lab-order-btn-${item.id}`}
																	>
																		<FlaskConical size={13} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
																		<span>Наряд в ЗТЛ</span>
																	</button>
																	{onOneClickLabOrder && (
																		<button
																			type="button"
																			onClick={() =>
																				onOneClickLabOrder(
																					item.toothNumber ? [item.toothNumber] : undefined,
																				)
																			}
																			className="min-h-[44px] sm:min-h-[28px] sm:min-w-0 sm:py-1 sm:px-2 sm:text-[11px] px-2.5 py-2 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer transition-colors shrink-0 touch-manipulation shadow-2xs flex items-center gap-1"
																			title={`1-клик наряд ЗТЛ: Коронка цирконий VITA A2 (+7 раб. дн.) для ${item.name}`}
																			data-testid={`item-lab-order-one-click-btn-${item.id}`}
																		>
																			<Zap size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
																			<span>1-клик</span>
																		</button>
																	)}
																</div>
															)}

														<div className="text-right">
															<span className={`text-xs font-bold font-mono ${
																item.requiresManualPricing || (item.priceRub || 0) === 0
																	? "text-amber-600 dark:text-amber-400"
																	: "text-[var(--ink,#0f172a)]"
															}`}>
																{(item.priceRub || 0).toLocaleString("ru-RU")} ₽
															</span>
															{(item.discountRub || 0) > 0 && (
																<div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
																	Скидка: −{(item.discountRub || 0).toLocaleString("ru-RU")} ₽
																</div>
															)}
														</div>
													</div>
												</div>

												{/* Missing Price Alert Banner */}
												{(item.requiresManualPricing || item.priceRub === 0) && (
													<MissingPriceAlert
														item={item}
														onUpdatePrice={onUpdateItemPrice}
														onUpdateItem={onUpdateItem}
														variant="full"
														className="mt-1"
													/>
												)}
											</div>
										))}
										{microConsumables.length > 0 && (
											<div className="px-4 py-2 bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between text-xs text-[var(--muted,#64748b)] border-t border-[var(--line,#e2e8f0)]">
												<span>
													Сопутствующие микро-расходники ({microConsumables.length} поз.: валики, салфетки, перчатки, слюноотсосы) включены в процедуры
												</span>
												<button
													type="button"
													onClick={() => setShowMicroConsumables((prev) => !prev)}
													className="h-7 px-2 flex items-center text-[var(--teal,#0d9488)] hover:underline font-bold text-xs cursor-pointer ml-auto"
												>
													{showMicroConsumables ? "Скрыть" : "Показать"}
												</button>
											</div>
										)}
									</>
								);
							})()
						)}
					</div>

					{/* Materials & Profitability Monolithic Accordion */}
					<div className="border-t border-[var(--line,var(--border,#cbd5e1))]">
						<button
							type="button"
							onClick={() => setShowMaterials((prev) => !prev)}
							className="w-full min-h-[44px] sm:min-h-[32px] sm:py-1.5 flex items-center justify-between px-4 py-3 text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong)] transition-colors cursor-pointer"
						>
							<div className="flex items-center gap-2">
								<Package size={15} className="text-[var(--teal,var(--brand-primary))]" />
								<span>
									Нормы расхода ТМЦ и себестоимость этапа ({presentationMaterials.length} поз.)
								</span>
							</div>

							<div className="flex items-center gap-3">
								<span className="font-mono text-slate-500 text-[11px] hidden sm:inline">
									Себестоимость:{" "}
									<strong className="text-slate-800 dark:text-slate-200">
										{(materialSummary.totalMaterialsCostRub || 0).toLocaleString("ru-RU")} ₽
									</strong>
								</span>
								<span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px]">
									Маржа: <strong>{materialSummary.marginPercent || 0}%</strong>
								</span>
								{showMaterials ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
							</div>
						</button>

						{showMaterials && (
							<div className="p-4 border-t border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] space-y-3 text-xs">
								<div className="overflow-x-auto">
									<table className="w-full border-collapse text-[11px]">
										<thead>
											<tr className="border-b border-[var(--line,var(--border,#cbd5e1))] text-[var(--muted,#64748b)] text-left">
												<th className="pb-1 font-semibold">Материал (Норма 804н)</th>
												<th className="pb-1 font-semibold text-center">Расход</th>
												<th className="pb-1 font-semibold text-right">Уч. цена</th>
												<th className="pb-1 font-semibold text-right">Сумма</th>
												<th className="pb-1 font-semibold text-center">Склад</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--line,var(--border,#cbd5e1))]">
											{presentationMaterials.map((mat) => (
												<tr key={mat.id} className="text-[var(--ink,#0f172a)]">
													<td className="py-1.5 pr-2">
														<span className="font-medium">{mat.materialName}</span>
														<span className="block text-[9px] text-[var(--muted,#64748b)]">
															{mat.procedureName} {mat.toothNumber ? `(№${mat.toothNumber})` : ""}
														</span>
													</td>
													<td className="py-1.5 text-center font-mono font-bold">
														{mat.quantityRequired} {mat.unitOfMeasure}
													</td>
													<td className="py-1.5 text-right font-mono text-[var(--muted,#64748b)]">
														{(mat.unitCostRub || 0).toLocaleString("ru-RU")} ₽
													</td>
													<td className="py-1.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
														{(mat.totalCostRub || 0).toLocaleString("ru-RU")} ₽
													</td>
													<td className="py-1.5 text-center font-mono">
														{mat.inStockQuantity !== undefined ? (
															mat.isDeficit ? (
																<span className="text-rose-600 font-bold">
																	Дефицит ({mat.inStockQuantity} в наличии)
																</span>
															) : (
																<span className="text-emerald-600 dark:text-emerald-400">
																	{mat.inStockQuantity} {mat.unitOfMeasure}
																</span>
															)
														) : (
															<span className="text-slate-400">—</span>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>

								{/* Margins breakdown strip without nested card */}
								<div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[var(--paper-strong,var(--paper,#ffffff))] border-t border-[var(--line,var(--border,#cbd5e1))] text-[11px] rounded-lg">
									<div>
										<span className="text-[var(--muted,#64748b)]">Выручка: </span>
										<strong className="font-mono text-[var(--ink,#0f172a)]">
											{(materialSummary.serviceRevenueRub || 0).toLocaleString("ru-RU")} ₽
										</strong>
									</div>
									<div>
										<span className="text-[var(--muted,#64748b)]">Себестоимость ТМЦ: </span>
										<strong className="font-mono text-slate-700 dark:text-slate-300">
											{(materialSummary.totalMaterialsCostRub || 0).toLocaleString("ru-RU")} ₽
										</strong>
									</div>
									<div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
										<TrendingUp size={13} />
										<span>
											Валовая маржа: {(materialSummary.grossMarginRub || 0).toLocaleString("ru-RU")} ₽ ({materialSummary.marginPercent || 0}%)
										</span>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Stage Subtotal & Action Footer */}
					<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 text-xs font-semibold text-[var(--muted,#64748b)] border-t border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] rounded-b-2xl">
						<div className="flex items-center gap-2">
							<span>Итого за этап:</span>
							<span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
								{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
							</span>
						</div>

						{/* Action Buttons: Max 1-2 Direct Actions + More Menu '...' (Mandate 8d Sin 3, Miller's Law) */}
						<div className="flex items-center justify-end gap-2 flex-wrap">
							{/* Primary Direct Action 1: 'В работу' or 'Акт и списание' */}
							{isAction1Start ? (
								<button
									type="button"
									onClick={() => onStartStage!(stage)}
									className="h-8 px-3 rounded-lg text-xs font-bold text-sky-800 dark:text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
									title={`Взять этап №${stage.stageNumber} «${stage.title}» в работу`}
									data-testid={`stage-${stage.stageNumber}-start-btn`}
								>
									<Play size={13} className="text-sky-600 dark:text-sky-400 shrink-0 fill-current" />
									<span>В работу</span>
								</button>
							) : isAction1WriteOff ? (
								<button
									type="button"
									onClick={() => onExecuteWriteOffStage!(stage)}
									className="h-8 px-3 rounded-lg text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
									title="Сформировать Акт выполненных работ и провести списание ТМЦ со склада"
									data-testid={`stage-${stage.stageNumber}-writeoff-btn`}
								>
									<Package size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
									<span>Акт и списание</span>
								</button>
							) : null}

							{/* Primary Direct Action 2: 'Смета' or 'Оплатить этап' or 'Акт и списание' */}
							{isAction2Estimate ? (
								<button
									type="button"
									onClick={() => onExportStageEstimate!(stage)}
									className="h-8 px-3 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
									title={`Печать сметы и спецификации по этапу №${stage.stageNumber}`}
									data-testid={`stage-${stage.stageNumber}-estimate-btn`}
								>
									<Printer size={14} className="text-[var(--muted,#64748b)] shrink-0" />
									<span>Смета</span>
								</button>
							) : isAction2Pay ? (
								<button
									type="button"
									onClick={() => onPayStage!(stage)}
									className="h-8 px-3 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
									title={`Принять оплату за этап №${stage.stageNumber} (${(stage.totalRub || 0).toLocaleString("ru-RU")} ₽)`}
									data-testid={`stage-${stage.stageNumber}-pay-btn`}
								>
									<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
									<span>Оплатить этап</span>
								</button>
							) : isAction2WriteOff ? (
								<button
									type="button"
									onClick={() => onExecuteWriteOffStage!(stage)}
									className="h-8 px-3 rounded-lg text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
									title="Сформировать Акт выполненных работ и провести списание ТМЦ со склада"
									data-testid={`stage-${stage.stageNumber}-writeoff-btn`}
								>
									<Package size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
									<span>Акт и списание</span>
								</button>
							) : null}

							{/* Secondary Stage Operations Overflow Popover Menu [...] (Miller's Law, Mandate 8d Sin 3) */}
							{hasSecondaryActions && (
								<div className="relative inline-flex items-center" ref={stageMenuRef}>
									<button
										type="button"
										onClick={() => setIsStageMenuOpen((prev) => !prev)}
										className="h-8 w-8 rounded-lg border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer flex items-center justify-center shrink-0 shadow-2xs transition-colors touch-manipulation"
										title="Дополнительные действия этапа"
										aria-label="Дополнительные действия этапа"
										aria-expanded={isStageMenuOpen}
										data-testid={`stage-${stage.stageNumber}-menu-btn`}
									>
										<MoreVertical size={14} className="text-[var(--muted,#64748b)]" />
									</button>

									{isStageMenuOpen && (
										<div
											className="absolute right-0 bottom-full mb-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] rounded-xl shadow-xl min-w-[220px] text-xs animate-in fade-in zoom-in-95 duration-100"
											role="menu"
										>
											{/* 1. Акт и списание (если не вынесен на карточку) */}
											{showWriteOffInMenu && (
												<button
													type="button"
													onClick={() => {
														setIsStageMenuOpen(false);
														onExecuteWriteOffStage!(stage);
													}}
													className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-soft,var(--paper-soft))] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
													title="Сформировать Акт выполненных работ и провести списание ТМЦ со склада"
													data-testid={`stage-${stage.stageNumber}-writeoff-menu-btn`}
													role="menuitem"
												>
													<Package size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
													<span>Акт и списание</span>
												</button>
											)}

											{/* 2. Оплатить этап (если не вынесен на карточку) */}
											{showPayInMenu && (
												<button
													type="button"
													onClick={() => {
														setIsStageMenuOpen(false);
														onPayStage!(stage);
													}}
													className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/10 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
													title={`Принять оплату за этап №${stage.stageNumber} (${(stage.totalRub || 0).toLocaleString("ru-RU")} ₽)`}
													data-testid={`stage-${stage.stageNumber}-pay-menu-btn`}
													role="menuitem"
												>
													<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
													<span>Оплатить этап</span>
												</button>
											)}

											{/* 3. Экспорт сметы этапа (если не вынесен на карточку) */}
											{showEstimateInMenu && (
												<button
													type="button"
													onClick={() => {
														setIsStageMenuOpen(false);
														onExportStageEstimate!(stage);
													}}
													className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
													title="Печать или экспорт сметы по данному этапу"
													data-testid={`stage-${stage.stageNumber}-export-btn`}
													role="menuitem"
												>
													<Printer size={14} className="text-[var(--muted,#64748b)] shrink-0" />
													<span>Экспорт сметы этапа</span>
												</button>
											)}

											{/* 4. Наряд-заказ в ЗТЛ */}
											{onOpenLabOrder && isLabOrderEligible && (
												<button
													type="button"
													onClick={() => {
														setIsStageMenuOpen(false);
														const stageTeeth = stage.items
															.map((it) => it.toothNumber)
															.filter((t): t is number => typeof t === "number" && t > 0);
														onOpenLabOrder(stageTeeth.length > 0 ? stageTeeth : undefined);
													}}
													className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
													title="Оформить наряд-заказ в зуботехническую лабораторию"
													data-testid={`stage-${stage.stageNumber}-lab-order-btn`}
													role="menuitem"
												>
													<FlaskConical size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
													<span>Наряд-заказ в ЗТЛ</span>
												</button>
											)}

											{/* 5. 1-клик ЗТЛ */}
											{onOneClickLabOrder && isLabOrderEligible && (
												<button
													type="button"
													onClick={() => {
														setIsStageMenuOpen(false);
														const stageTeeth = stage.items
															.map((it) => it.toothNumber)
															.filter((t): t is number => typeof t === "number" && t > 0);
														onOneClickLabOrder(stageTeeth.length > 0 ? stageTeeth : undefined);
													}}
													className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-500/15 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
													title="Оформить наряд в ЗТЛ в 1 клик (Диоксид циркония / E.max, цвет VITA A2, +7 раб. дней)"
													data-testid={`stage-${stage.stageNumber}-lab-order-one-click-btn`}
													role="menuitem"
												>
													<Zap size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
													<span>1-клик ЗТЛ (Цирконий A2)</span>
												</button>
											)}

											{/* 6. Скидка на этап */}
											{onApplyStageDiscount && (
												<button
													type="button"
													onClick={() => {
														setIsStageMenuOpen(false);
														onApplyStageDiscount(stage);
													}}
													className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
													title="Применить скидку к этапу лечения"
													data-testid={`stage-${stage.stageNumber}-discount-btn`}
													role="menuitem"
												>
													<Percent size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
													<span>Скидка на этап</span>
												</button>
											)}

											{/* 7. Рассрочка на этап */}
											{onOpenInstallment && stage.totalRub > 0 && (
												<button
													type="button"
													onClick={() => {
														setIsStageMenuOpen(false);
														onOpenInstallment(stage);
													}}
													className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/10 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
													title={`Оформить беспроцентную банковскую рассрочку (Сбер / Т-Банк / Подели) на этап №${stage.stageNumber}`}
													data-testid={`stage-${stage.stageNumber}-installment-btn`}
													role="menuitem"
												>
													<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
													<span>Рассрочка на этап</span>
												</button>
											)}

											{/* 8. Удалить этап */}
											{onDeleteStage && (
												<>
													<div className="my-1 border-t border-[var(--line,var(--border,#cbd5e1))]" />
													<button
														type="button"
														onClick={() => {
															setIsStageMenuOpen(false);
															onDeleteStage(stage);
														}}
														className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
														title="Удалить данный этап из плана лечения"
														data-testid={`stage-${stage.stageNumber}-delete-btn`}
														role="menuitem"
													>
														<Trash2 size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
														<span>Удалить этап</span>
													</button>
												</>
											)}
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

