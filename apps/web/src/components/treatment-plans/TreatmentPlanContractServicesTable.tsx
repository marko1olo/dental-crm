import React from "react";
import type { TreatmentPlanStage } from "./types";
import { isMicroConsumable } from "./TreatmentPlanPresenterModal";

export interface TreatmentPlanContractServicesTableProps {
	readonly activeStages: readonly TreatmentPlanStage[];
	readonly allItemsCount: number;
	readonly viewMode: "patient_friendly" | "official_appendix";
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables: React.Dispatch<React.SetStateAction<boolean>>;
}

export const TreatmentPlanContractServicesTable: React.FC<TreatmentPlanContractServicesTableProps> = ({
	activeStages, allItemsCount, viewMode, showMicroConsumables, setShowMicroConsumables,
}) => {
	let globalItemIndex = 1;

	return (
		<div className="space-y-2">
			<h3 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] flex items-center justify-between flex-wrap gap-2">
				<span>2. Приложение № 1: Спецификация и этапы лечения (Клинический протокол)</span>
				<div className="flex items-center gap-2">
					<button type="button" onClick={() => setShowMicroConsumables(!showMicroConsumables)} className="print:hidden text-[10px] font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer">
						{showMicroConsumables ? "Скрыть микро-расходники" : "Детализировать микро-расходники"}
					</button>
					<span className="text-[10px] text-slate-500 font-normal">Всего позиций: {allItemsCount}</span>
				</div>
			</h3>

			<div className="overflow-x-auto">
				<table className="w-full border-collapse border border-slate-300 text-[10px]">
					<thead>
						<tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[9px]">
							<th className="border border-slate-300 p-1.5 text-center w-8">№</th>
							{viewMode === "official_appendix" && <th className="border border-slate-300 p-1.5 text-center w-20">Код услуги</th>}
							<th className="border border-slate-300 p-1.5 text-center w-12">Зуб</th>
							<th className="border border-slate-300 p-1.5 text-left">{viewMode === "patient_friendly" ? "Медицинская услуга и применяемые материалы" : "Наименование медицинской услуги"}</th>
							<th className="border border-slate-300 p-1.5 text-center w-10">Кол.</th>
							<th className="border border-slate-300 p-1.5 text-right w-20">Цена, ₽</th>
							<th className="border border-slate-300 p-1.5 text-right w-16">Скидка</th>
							<th className="border border-slate-300 p-1.5 text-right w-20">Сумма, ₽</th>
						</tr>
					</thead>
					<tbody>
						{activeStages.map((stage) => {
							const displayItems = showMicroConsumables ? stage.items : stage.items.filter((it) => !isMicroConsumable(it));
							const microCount = stage.items.length - displayItems.length;
							return (
								<React.Fragment key={stage.stageNumber}>
									<tr className="bg-slate-50/90 font-bold text-slate-800 border-t border-b border-slate-300">
										<td colSpan={viewMode === "official_appendix" ? 7 : 6} className="border border-slate-300 p-1.5">
											<div className="flex items-baseline justify-between gap-3">
												<span className="font-extrabold text-[11px] text-slate-900">{stage.title}</span>
												<span className="text-[10px] text-slate-500 font-normal italic">{stage.clinicalGoal} · ~{stage.estimatedWeeks} нед. · ~{stage.estimatedVisits} виз.</span>
											</div>
										</td>
										<td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{stage.totalRub.toLocaleString("ru-RU")} ₽</td>
									</tr>
									{displayItems.map((it) => (
										<tr key={it.id} className="hover:bg-slate-50">
											<td className="border border-slate-300 p-1 text-center font-mono text-[9px] text-slate-500">{globalItemIndex++}</td>
											{viewMode === "official_appendix" && <td className="border border-slate-300 p-1 text-center font-mono text-[9px] text-slate-600"><span className="bg-slate-100 px-1 py-0.5 rounded">{it.serviceCode || it.code804n}</span></td>}
											<td className="border border-slate-300 p-1 text-center font-bold">{it.toothNumber ? `№${it.toothNumber}` : <span className="text-slate-400 font-normal">—</span>}</td>
											<td className="border border-slate-300 p-1 text-slate-800"><div className="font-medium text-slate-900">{it.name}</div>{it.materials && <div className="text-[9px] text-slate-500 mt-0.5">Материал: {it.materials}</div>}</td>
											<td className="border border-slate-300 p-1 text-center font-mono">{it.quantity}</td>
											<td className="border border-slate-300 p-1 text-right font-mono">{it.unitPriceRub.toLocaleString("ru-RU")}</td>
											<td className="border border-slate-300 p-1 text-right font-mono text-slate-500">{it.discountRub > 0 ? <span className="text-emerald-700">-{it.discountRub.toLocaleString("ru-RU")}</span> : <span className="text-slate-400">—</span>}</td>
											<td className="border border-slate-300 p-1 text-right font-mono font-semibold text-slate-900">{it.priceRub.toLocaleString("ru-RU")}</td>
										</tr>
									))}
									{!showMicroConsumables && microCount > 0 && (
										<tr className="bg-slate-50/40 text-[9px] text-slate-500 italic">
											<td className="border border-slate-300 p-1 text-center">•</td>
											<td colSpan={viewMode === "official_appendix" ? 6 : 5} className="border border-slate-300 p-1">
												Индивидуальный гигиенический и асептический комплект (салфетки, валики, слюноотсос, перчатки — {microCount} наим., включено в смету этапа)
											</td>
											<td className="border border-slate-300 p-1 text-right font-mono">Включено</td>
										</tr>
									)}
								</React.Fragment>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
};
