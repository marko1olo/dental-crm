/**
 * ActPrintServicesTable.tsx — Строгая таблица оказанных стоматологических услуг
 * согласно номенклатуре Минздрава РФ (Приказ 804н), клиническим рекомендациям СтАР
 * и гарантийным обязательствам по Закону о защите прав потребителей РФ № 2300-1.
 */

import { Award, ShieldCheck } from "lucide-react";
import React from "react";
import { formatMoneyExact } from "../treatmentPlanActFormatters";
import type { ActPrintServicesTableProps } from "./types";

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
							<th className="border border-slate-300 p-2 text-center w-24">
								Зуб / Область
							</th>
							<th className="border border-slate-300 p-2 text-left">
								Наименование медицинской услуги
							</th>
							<th className="border border-slate-300 p-2 text-center w-14">
								Кол-во
							</th>
							<th className="border border-slate-300 p-2 text-right w-24">
								Цена, ₽
							</th>
							<th className="border border-slate-300 p-2 text-right w-20">
								Скидка, ₽
							</th>
							<th className="border border-slate-300 p-2 text-right w-28">
								Итого, ₽
							</th>
						</tr>
					</thead>
					<tbody>
						{visibleProcedures.map((it, idx) => (
							<tr
								key={it.id || idx}
								className="hover:bg-slate-50 transition-colors border-b border-slate-300 text-xs"
							>
								<td className="border border-slate-300 p-2 text-center text-slate-500 font-mono text-[11px]">
									{idx + 1}
								</td>
								<td className="border border-slate-300 p-2 text-center">
									{it.toothNumber ? (
										<span
											className="px-2 py-0.5 rounded-md font-mono font-extrabold text-xs inline-block border"
											style={{
												backgroundColor: palette.softBg,
												borderColor: palette.accentBorder,
												color: palette.primaryDark,
											}}
										>
											№{it.toothNumber}
										</span>
									) : (
										<span className="text-slate-400 font-mono">—</span>
									)}
								</td>
								<td className="border border-slate-300 p-2 font-medium text-slate-900 leading-snug">
									<div className="flex items-baseline gap-1.5 flex-wrap">
										{it.code804n && (
											<span className="font-mono font-bold text-slate-700 shrink-0 text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">
												{it.code804n}
											</span>
										)}
										<span className="font-semibold text-slate-900">
											{it.name}
										</span>
									</div>
									{it.clinicalRationale && (
										<div className="text-[11px] text-slate-500 italic mt-0.5">
											Клиническое показание: {it.clinicalRationale}
										</div>
									)}
								</td>
								<td className="border border-slate-300 p-2 text-center font-mono font-bold">
									{it.quantity}
								</td>
								<td className="border border-slate-300 p-2 text-right font-mono text-slate-700">
									{formatMoneyExact(it.unitPriceRub)}
								</td>
								<td className="border border-slate-300 p-2 text-right font-mono text-slate-500">
									{it.discountRub > 0
										? `-${formatMoneyExact(it.discountRub)}`
										: "0,00 ₽"}
								</td>
								<td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-950">
									{formatMoneyExact(it.priceRub)}
								</td>
							</tr>
						))}

						{!showMicroConsumables && microConsumables.length > 0 && (
							<tr className="bg-slate-50/80 transition-colors border-b border-slate-300 text-xs italic text-slate-600">
								<td className="border border-slate-300 p-2 text-center text-slate-400 font-mono text-[11px]">
									{visibleProcedures.length + 1}
								</td>
								<td className="border border-slate-300 p-2 text-center text-slate-400 font-mono">
									—
								</td>
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
										(валики, салфетки, перчатки, слюноотсосы, маски —{" "}
										{microConsumables.length} наим., включено в базовую
										стоимость оказанных услуг)
									</div>
								</td>
								<td className="border border-slate-300 p-2 text-center font-mono font-bold">
									1 компл.
								</td>
								<td className="border border-slate-300 p-2 text-right font-mono text-slate-600">
									0,00 ₽
								</td>
								<td className="border border-slate-300 p-2 text-right font-mono text-slate-500">
									0,00 ₽
								</td>
								<td className="border border-slate-300 p-2 text-right font-mono font-bold text-emerald-700 not-italic">
									Включено
								</td>
							</tr>
						)}

						{/* Subtotals & Breakdown */}
						<tr className="bg-slate-50 text-slate-700 text-xs font-semibold">
							<td colSpan={6} className="border border-slate-300 p-2 text-right">
								Стоимость оказанных услуг без учета скидки:
							</td>
							<td className="border border-slate-300 p-2 text-right font-mono">
								{formatMoneyExact(grossServicesRub)}
							</td>
						</tr>
						{discountTotalRub > 0 && (
							<tr className="bg-slate-50 text-slate-700 text-xs font-semibold">
								<td
									colSpan={6}
									className="border border-slate-300 p-2 text-right text-emerald-700"
								>
									Сумма предоставленной скидки:
								</td>
								<td className="border border-slate-300 p-2 text-right font-mono text-emerald-700">
									-{formatMoneyExact(discountTotalRub)}
								</td>
							</tr>
						)}
						<tr
							className="font-extrabold text-xs"
							style={{
								backgroundColor: palette.softBg,
								color: palette.primaryDark,
							}}
						>
							<td
								colSpan={6}
								className="border border-slate-300 p-2.5 text-right text-xs uppercase tracking-wide"
							>
								ИТОГО СТОИМОСТЬ ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ (НДС НЕ ОБЛАГАЕТСЯ):
							</td>
							<td
								className="border border-slate-300 p-2.5 text-right font-mono text-sm font-black"
								style={{ color: palette.primaryDark }}
							>
								{formatMoneyExact(netServicesRub, netServicesKopecks)}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			{/* Amount in words banner (Official Russian Accounting Standard) */}
			<div className="p-2.5 bg-slate-50 border-x border-b border-slate-300 text-xs text-slate-800 rounded-b-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<div>
					<strong>Сумма прописью:</strong> <em>{servicesInWords}</em>.{" "}
					<span className="text-[11px] text-slate-500">
						НДС не облагается в соответствии с пп. 2 п. 2 ст. 149 НК РФ
						(медицинские услуги).
					</span>
				</div>
				<div className="flex items-center gap-1.5 shrink-0 text-[11px] text-slate-600 font-medium">
					<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
					<span>Гарантийный срок: до 12 мес. (ЗоЗПП РФ)</span>
				</div>
			</div>
		</div>
	);
};
