import React from "react";
import type { TreatmentPlanStage } from "../types";

export interface PrintViewStagesTableProps {
	readonly displayedStages: readonly TreatmentPlanStage[];
}

export const PrintViewStagesTable: React.FC<PrintViewStagesTableProps> = ({ displayedStages }) => {
	return (
		<div className="relative z-10 space-y-5">
			{displayedStages.map((stage, stageIdx) => (
				<div key={stage.id || stageIdx} className="space-y-1.5">
					<div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-300 pb-1">
						<span>
							Этап {stage.stageNumber || stageIdx + 1}: {stage.title}
							{stage.estimatedWeeks ? ` (~${stage.estimatedWeeks} нед.)` : ""}
						</span>
						<span className="text-teal-700 font-mono">
							{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
						</span>
					</div>

					<table className="w-full text-[11px] text-left border-collapse">
						<thead>
							<tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
								<th className="py-1 px-2 w-8 text-center">№</th>
								<th className="py-1 px-2">Наименование медицинской услуги</th>
								<th className="py-1 px-2 w-16 text-center">Зуб</th>
								<th className="py-1 px-2 w-12 text-center">Кол-во</th>
								<th className="py-1 px-2 w-24 text-right">Цена</th>
								<th className="py-1 px-2 w-24 text-right">Сумма</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{stage.items.map((item, itemIdx) => {
								const unitPrice = item.unitPriceRub || item.priceRub || 0;
								const qty = item.quantity || 1;
								const lineTotal = unitPrice * qty;

								return (
									<tr key={item.id || itemIdx} className="hover:bg-slate-50/50">
										<td className="py-1 px-2 text-center text-slate-400 font-mono text-[10px]">
											{itemIdx + 1}
										</td>
										<td className="py-1 px-2 text-slate-800">{item.name}</td>
										<td className="py-1 px-2 text-center text-slate-600 font-mono">
											{item.toothNumber ? `#${item.toothNumber}` : "—"}
										</td>
										<td className="py-1 px-2 text-center text-slate-600">{qty}</td>
										<td className="py-1 px-2 text-right text-slate-600 font-mono">
											{unitPrice.toLocaleString("ru-RU")} ₽
										</td>
										<td className="py-1 px-2 text-right font-semibold text-slate-800 font-mono">
											{lineTotal.toLocaleString("ru-RU")} ₽
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			))}
		</div>
	);
};
