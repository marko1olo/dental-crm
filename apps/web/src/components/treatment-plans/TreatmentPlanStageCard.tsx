import React, { useMemo, useState } from "react";
import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Coins,
	FileText,
	Layers,
	Package,
	Shield,
	Sparkles,
	Stethoscope,
	TrendingUp,
	UserCheck,
} from "lucide-react";
import {
	type InventoryItemLookup,
	calculateStageMaterialRequirements,
} from "./treatmentPlanMaterialEngine";
import type { TreatmentPlanStage } from "./types";

interface TreatmentPlanStageCardProps {
	readonly stage: TreatmentPlanStage;
	readonly defaultExpanded?: boolean;
	readonly inventoryItems?: readonly InventoryItemLookup[] | undefined;
	readonly onUpdateItemQuantity?: (itemId: string, newQty: number) => void;
	readonly onRemoveItem?: (itemId: string) => void;
	readonly onExecuteWriteOffStage?: (stage: TreatmentPlanStage) => void;
	readonly className?: string;
}

export const TreatmentPlanStageCard: React.FC<TreatmentPlanStageCardProps> = ({
	stage,
	defaultExpanded = true,
	inventoryItems,
	onUpdateItemQuantity,
	onRemoveItem,
	onExecuteWriteOffStage,
	className = "",
}) => {
	const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
	const [showMaterials, setShowMaterials] = useState<boolean>(false);

	const materialSummary = useMemo(() => {
		return calculateStageMaterialRequirements(stage, inventoryItems);
	}, [stage, inventoryItems]);

	const stageColorMap = {
		1: {
			badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
			iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
			headerBg: "bg-blue-500/5",
			accentBorder: "border-blue-500/30",
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
			className={`treatment-stage-card flex flex-col rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-sm overflow-hidden transition-all duration-200 ${className}`.trim()}
			data-testid={`treatment-stage-${stage.stageNumber}`}
		>
			{/* Stage Header */}
			<div
				onClick={() => setIsExpanded((prev) => !prev)}
				className={`flex items-center justify-between p-4 cursor-pointer select-none transition-colors hover:bg-[var(--paper-soft,#f8fafc)] border-b ${
					isExpanded ? "border-[var(--border,#cbd5e1)]" : "border-transparent"
				} ${theme.headerBg}`}
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
					<div className="text-right hidden sm:flex flex-col">
						<span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
							{stage.totalRub.toLocaleString("ru-RU")} ₽
						</span>
						<span className="text-[10px] text-[var(--muted,#64748b)] flex items-center justify-end gap-1">
							<Clock size={11} /> {stage.estimatedVisits} виз. · {stage.estimatedWeeks} нед.
						</span>
					</div>

					<div className="p-1 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]">
						{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
					</div>
				</div>
			</div>

			{/* Stage Body */}
			{isExpanded && (
				<div className="p-4 space-y-3 bg-[var(--paper-soft,var(--paper,#ffffff))]">
					{/* Clinical Goal Banner */}
					<div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-xs text-[var(--muted,#64748b)]">
						<Activity size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="font-medium">
							<strong>Клиническая цель:</strong> {stage.clinicalGoal}
						</span>
					</div>

					{/* Procedure Items List */}
					<div className="space-y-2">
						{stage.items.length === 0 ? (
							<div className="p-6 text-center text-xs text-[var(--muted,#64748b)]">
								В данном этапе нет запланированных процедур.
							</div>
						) : (
							stage.items.map((item, idx) => (
								<div
									key={item.id || idx}
									className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] hover:border-teal-500/40 transition-all"
								>
									<div className="flex flex-col gap-1 min-w-0 flex-1">
										<div className="flex items-center gap-1.5 flex-wrap">
											{item.toothNumber && (
												<span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
													#{item.toothNumber}
												</span>
											)}
											<span className="text-[10px] font-mono text-[var(--muted,#64748b)] px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)]">
												{item.code804n}
											</span>
											<span className="text-[10px] text-[var(--muted,#64748b)] font-medium">
												{item.category}
											</span>
										</div>

										<span className="text-xs font-semibold text-[var(--ink,#0f172a)] leading-snug">
											{item.name}
										</span>

										{item.materials && (
											<p className="text-[11px] text-[var(--muted,#64748b)] italic">
												Материал: {item.materials}
											</p>
										)}
									</div>

									<div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border,#cbd5e1)]">
										<div className="text-right">
											<span className="text-xs font-bold text-[var(--ink,#0f172a)] font-mono">
												{item.priceRub.toLocaleString("ru-RU")} ₽
											</span>
											{item.discountRub > 0 && (
												<div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
													Скидка: −{item.discountRub.toLocaleString("ru-RU")} ₽
												</div>
											)}
										</div>
									</div>
								</div>
							))
						)}
					</div>

					{/* Materials & Profitability Expandable Section */}
					<div className="rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] overflow-hidden">
						<button
							type="button"
							onClick={() => setShowMaterials((prev) => !prev)}
							className="w-full flex items-center justify-between p-3 text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer"
						>
							<div className="flex items-center gap-2">
								<Package size={15} className="text-teal-600 dark:text-teal-400" />
								<span>
									Нормы расхода ТМЦ и себестоимость этапа ({materialSummary.items.length} поз.)
								</span>
							</div>

							<div className="flex items-center gap-3">
								<span className="font-mono text-slate-500">
									Себестоимость:{" "}
									<strong className="text-slate-800 dark:text-slate-200">
										{materialSummary.totalMaterialsCostRub.toLocaleString("ru-RU")} ₽
									</strong>
								</span>
								<span className="font-mono text-emerald-600 dark:text-emerald-400">
									Маржа: <strong>{materialSummary.marginPercent}%</strong>
								</span>
								{showMaterials ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
							</div>
						</button>

						{showMaterials && (
							<div className="p-3 border-t border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-3 text-xs">
								<div className="overflow-x-auto">
									<table className="w-full border-collapse text-[11px]">
										<thead>
											<tr className="border-b border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)] text-left">
												<th className="pb-1 font-semibold">Материал (Норма 804н)</th>
												<th className="pb-1 font-semibold text-center">Расход</th>
												<th className="pb-1 font-semibold text-right">Уч. цена</th>
												<th className="pb-1 font-semibold text-right">Сумма</th>
												<th className="pb-1 font-semibold text-center">Склад</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--border,#cbd5e1)]">
											{materialSummary.items.map((mat) => (
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
														{mat.unitCostRub.toLocaleString("ru-RU")} ₽
													</td>
													<td className="py-1.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
														{mat.totalCostRub.toLocaleString("ru-RU")} ₽
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

								{/* Margins breakdown */}
								<div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[11px]">
									<div>
										<span className="text-[var(--muted,#64748b)]">Выручка за этап: </span>
										<strong className="font-mono text-[var(--ink,#0f172a)]">
											{materialSummary.serviceRevenueRub.toLocaleString("ru-RU")} ₽
										</strong>
									</div>
									<div>
										<span className="text-[var(--muted,#64748b)]">Себестоимость ТМЦ: </span>
										<strong className="font-mono text-slate-700 dark:text-slate-300">
											{materialSummary.totalMaterialsCostRub.toLocaleString("ru-RU")} ₽
										</strong>
									</div>
									<div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
										<TrendingUp size={13} />
										<span>
											Валовая маржа: {materialSummary.grossMarginRub.toLocaleString("ru-RU")} ₽ ({materialSummary.marginPercent}%)
										</span>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Stage Subtotal & Action Footer */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-semibold text-[var(--muted,#64748b)] border-t border-[var(--border,#cbd5e1)]">
						<div className="flex items-center gap-2">
							<span>Итого за этап:</span>
							<span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
								{stage.totalRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>

						{onExecuteWriteOffStage && stage.items.length > 0 && (
							<button
								type="button"
								onClick={() => onExecuteWriteOffStage(stage)}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 cursor-pointer transition-colors"
								title="Сформировать Акт выполненных работ и провести списание ТМЦ со склада"
							>
								<Package size={13} />
								<span>Акт и списание ТМЦ</span>
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

