import React from "react";
import { ChevronDown, ChevronUp, Package, TrendingUp } from "lucide-react";

export interface TreatmentPlanStageMaterialsAccordionProps {
	readonly showMaterials: boolean;
	readonly setShowMaterials: React.Dispatch<React.SetStateAction<boolean>>;
	readonly presentationMaterials: readonly any[];
	readonly materialSummary: any;
}

export const TreatmentPlanStageMaterialsAccordion: React.FC<TreatmentPlanStageMaterialsAccordionProps> = ({
	showMaterials,
	setShowMaterials,
	presentationMaterials,
	materialSummary,
}) => {
	return (
		<div className="border-t border-[var(--line,var(--border,#cbd5e1))]">
			<button
				type="button"
				onClick={() => setShowMaterials((prev) => !prev)}
				className="w-full h-8 min-h-[32px] max-h-[34px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-h-[44px] flex items-center justify-between px-4 py-1.5 text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] transition-colors cursor-pointer"
			>
				<div className="flex items-center gap-2 min-w-0">
					<Package size={15} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span className="truncate">Нормы расхода ТМЦ и себестоимость этапа ({presentationMaterials.length} поз.)</span>
				</div>
				<div className="flex items-center gap-2 sm:gap-3 shrink-0">
					<span className="font-mono text-[var(--muted,#64748b)] text-[11px] hidden sm:inline">
						Себестоимость: <strong className="text-[var(--ink,#0f172a)]">{(materialSummary.totalMaterialsCostRub || 0).toLocaleString("ru-RU")} ₽</strong>
					</span>
					<span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px]">
						Маржа: <strong>{materialSummary.marginPercent || 0}%</strong>
					</span>
					{showMaterials ? <ChevronUp size={15} className="shrink-0" /> : <ChevronDown size={15} className="shrink-0" />}
				</div>
			</button>

			{showMaterials && (
				<div className="p-4 border-t border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] space-y-3 text-xs">
					<div className="overflow-x-auto">
						<table className="w-full border-collapse text-[11px]">
							<thead>
								<tr className="border-b border-[var(--line,var(--border,#cbd5e1))] text-[var(--muted,#64748b)] text-left">
									<th className="pb-1 font-semibold">Материал (Клиническая норма)</th>
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
											<span className="font-medium truncate block max-w-xs">{mat.materialName}</span>
											<span className="block text-[9px] text-[var(--muted,#64748b)] truncate max-w-xs">{mat.procedureName} {mat.toothNumber ? `(№${mat.toothNumber})` : ""}</span>
										</td>
										<td className="py-1.5 text-center font-mono font-bold">{mat.quantityRequired} {mat.unitOfMeasure}</td>
										<td className="py-1.5 text-right font-mono text-[var(--muted,#64748b)]">{(mat.unitCostRub || 0).toLocaleString("ru-RU")} ₽</td>
										<td className="py-1.5 text-right font-mono font-bold text-[var(--ink,#0f172a)]">{(mat.totalCostRub || 0).toLocaleString("ru-RU")} ₽</td>
										<td className="py-1.5 text-center font-mono">
											{mat.inStockQuantity !== undefined ? (
												mat.isDeficit ? <span className="text-rose-600 font-bold">Дефицит ({mat.inStockQuantity} в наличии)</span> : <span className="text-emerald-600 dark:text-emerald-400">{mat.inStockQuantity} {mat.unitOfMeasure}</span>
											) : <span className="text-[var(--muted,#94a3b8)]">—</span>}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[var(--paper-strong,var(--paper,#ffffff))] border-t border-[var(--line,var(--border,#cbd5e1))] text-[11px] rounded-lg">
						<div><span className="text-[var(--muted,#64748b)]">Выручка: </span><strong className="font-mono text-[var(--ink,#0f172a)]">{(materialSummary.serviceRevenueRub || 0).toLocaleString("ru-RU")} ₽</strong></div>
						<div><span className="text-[var(--muted,#64748b)]">Себестоимость ТМЦ: </span><strong className="font-mono text-[var(--ink,#0f172a)]">{(materialSummary.totalMaterialsCostRub || 0).toLocaleString("ru-RU")} ₽</strong></div>
						<div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
							<TrendingUp size={13} />
							<span>Валовая маржа: {(materialSummary.grossMarginRub || 0).toLocaleString("ru-RU")} ₽ ({materialSummary.marginPercent || 0}%)</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
