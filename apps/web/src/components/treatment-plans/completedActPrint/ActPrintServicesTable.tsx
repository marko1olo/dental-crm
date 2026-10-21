/**
 * ActPrintServicesTable.tsx — Строгая таблица оказанных стоматологических услуг
 * согласно номенклатуре Минздрава РФ (Приказ 804н), клиническим рекомендациям СтАР
 * и гарантийным обязательствам по Закону о защите прав потребителей РФ № 2300-1.
 */

import React from "react";
import { Award } from "lucide-react";
import type { ActPrintServicesTableProps } from "./types.js";
import { ActPrintServiceRow } from "./ActPrintServiceRow.js";
import { ActPrintServicesTableTotals } from "./ActPrintServicesTableTotals.js";
import { ActPrintServicesTableWordsBanner } from "./ActPrintServicesTableWordsBanner.js";

export const ActPrintServicesTable: React.FC<ActPrintServicesTableProps> = ({
	visibleProcedures,
	microConsumables,
	showMicroConsumables,
	palette,
	grossServicesRub,
	discountTotalRub,
	netServicesRub,
	netServicesKopecks,
	servicesInWords,
}) => {
	const totalItemCount =
		visibleProcedures.length +
		(!showMicroConsumables && microConsumables.length > 0 ? 1 : 0);

	return (
		<div className="doc-soap-section mb-6 print:mb-4">
			<div
				className="doc-soap-heading flex items-center justify-between p-2 rounded-t-lg font-black text-xs uppercase tracking-wider text-slate-900 border-b-2"
				style={{
					backgroundColor: palette.softBg,
					borderColor: palette.primary,
					color: palette.primaryDark,
				}}
			>
				<div className="flex items-center gap-2">
					<Award className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
					<span>1. Оказанные медицинские услуги (Клинический протокол)</span>
				</div>
				<span className="text-[11px] font-semibold lowercase opacity-90">
					Позиций: {totalItemCount}
				</span>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full border-collapse border border-slate-300 text-xs">
					<thead>
						<tr className="bg-slate-100 text-slate-800 font-bold text-[11px]">
							<th className="border border-slate-300 p-2 text-center w-10">№</th>
							<th className="border border-slate-300 p-2 text-center w-24">Зуб / Область</th>
							<th className="border border-slate-300 p-2 text-left">Наименование медицинской услуги</th>
							<th className="border border-slate-300 p-2 text-center w-14">Кол-во</th>
							<th className="border border-slate-300 p-2 text-right w-24">Цена, ₽</th>
							<th className="border border-slate-300 p-2 text-right w-20">Скидка, ₽</th>
							<th className="border border-slate-300 p-2 text-right w-28">Итого, ₽</th>
						</tr>
					</thead>
					<tbody>
						{visibleProcedures.map((it, idx) => (
							<ActPrintServiceRow key={it.id || idx} item={it} index={idx} palette={palette} />
						))}

						{!showMicroConsumables && microConsumables.length > 0 && (
							<tr className="bg-slate-50/80 transition-colors border-b border-slate-300 text-xs italic text-slate-600">
								<td className="border border-slate-300 p-2 text-center text-slate-400 font-mono text-[11px]">
									{visibleProcedures.length + 1}
								</td>
								<td className="border border-slate-300 p-2 text-center text-slate-400 font-mono">—</td>
								<td className="border border-slate-300 p-2 font-medium text-slate-800 leading-snug">
									<div className="flex items-baseline gap-1.5 flex-wrap">
										<span className="font-mono font-bold text-slate-500 shrink-0 text-[11px] bg-slate-100 px-1 py-0.5 rounded border border-slate-200 not-italic">
											A26.07.001
										</span>
										<span className="font-semibold text-slate-900 not-italic">
											Индивидуальный гигиенический и асептический комплект
										</span>
									</div>
									<div className="text-[11px] text-slate-500 not-italic mt-0.5">
										(валики, салфетки, перчатки, слюноотсосы, маски — {microConsumables.length} наим., включено в базовую стоимость оказанных услуг)
									</div>
								</td>
								<td className="border border-slate-300 p-2 text-center font-mono font-bold">1 компл.</td>
								<td className="border border-slate-300 p-2 text-right font-mono text-slate-600">0,00 ₽</td>
								<td className="border border-slate-300 p-2 text-right font-mono text-slate-500">0,00 ₽</td>
								<td className="border border-slate-300 p-2 text-right font-mono font-bold text-emerald-700 not-italic">
									Включено
								</td>
							</tr>
						)}

						<ActPrintServicesTableTotals
							grossServicesRub={grossServicesRub}
							discountTotalRub={discountTotalRub}
							netServicesRub={netServicesRub}
							netServicesKopecks={netServicesKopecks}
							palette={palette}
						/>
					</tbody>
				</table>
			</div>

			<ActPrintServicesTableWordsBanner servicesInWords={servicesInWords} />
		</div>
	);
};
