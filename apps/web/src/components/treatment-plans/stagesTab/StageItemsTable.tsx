import React from "react";
import { MissingPriceAlert } from "../MissingPriceAlert.js";
import { isMicroConsumable } from "../treatmentPlanConsumables.js";
import type { TreatmentPlanStageItem } from "../types.js";

interface StageItemsTableProps {
	readonly items: readonly TreatmentPlanStageItem[];
	readonly showMicroConsumables: boolean;
	readonly onToggleMicroConsumables?: () => void;
	readonly onUpdateItemPrice: (itemId: string, newPriceRub: number) => void;
}

export const StageItemsTable: React.FC<StageItemsTableProps> = ({
	items,
	showMicroConsumables,
	onToggleMicroConsumables,
	onUpdateItemPrice,
}) => {
	const microConsumables = items.filter(isMicroConsumable);
	const displayList = showMicroConsumables ? items : items.filter((it) => !isMicroConsumable(it));

	return (
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
								<td><span className="code-804n-badge">{it.serviceCode || it.code804n}</span></td>
								<td className="text-center">
									{it.toothNumber ? (
										<span className="tooth-fdi-badge">{it.toothNumber}</span>
									) : (
										<span className="text-[var(--tp-text-muted)]">—</span>
									)}
								</td>
								<td>
									<div className="font-semibold text-[var(--tp-text-main)] break-words min-w-0">
										{it.name}
									</div>
									{it.materials && (
										<div className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5">
											Материал: {it.materials}
										</div>
									)}
									{(it.requiresManualPricing || it.priceRub === 0) && (
										<div className="mt-1">
											<MissingPriceAlert item={it} onUpdatePrice={onUpdateItemPrice} variant="inline" />
										</div>
									)}
								</td>
								<td className="text-center font-semibold">{it.quantity}</td>
								<td className="text-right text-[var(--tp-text-muted)] font-mono">
									{(it.unitPriceRub || 0).toLocaleString("ru-RU")} ₽
								</td>
								<td
									className={`text-right font-bold font-mono ${
										it.requiresManualPricing || it.priceRub === 0
											? "text-amber-600 dark:text-amber-400"
											: "text-[var(--tp-text-main)]"
									}`}
								>
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
										Сопутствующие микро-расходники ({microConsumables.length} поз.: валики, салфетки, перчатки, слюноотсосы) включены в стоимость процедур.
									</span>
									<button
										type="button"
										onClick={onToggleMicroConsumables}
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
	);
};
