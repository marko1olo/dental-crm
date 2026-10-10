/**
 * ActPrintFinancialSummary.tsx — Сводный финансово-экономический блок Акта выполненных работ:
 * стоимость услуг (выручка этапа), себестоимость списанных ТМЦ по учетным ценам склада,
 * валовая маржинальность этапа, рентабельность и финансовая прозрачность (ACID).
 */

import { TrendingUp } from "lucide-react";
import React from "react";
import { formatMoneyExact } from "../treatmentPlanActFormatters";
import type { ActPrintFinancialSummaryProps } from "./types";

export const ActPrintFinancialSummary: React.FC<ActPrintFinancialSummaryProps> = ({
	netServicesRub,
	netServicesKopecks,
	netMaterialRub,
	netMaterialKopecks,
	marginRub,
	marginPercent,
	palette,
}) => {
	return (
		<div
			className="p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-6 print:mb-4 shadow-xs"
			style={{
				backgroundColor: palette.softBg,
				borderColor: palette.accentBorder,
			}}
		>
			<div className="space-y-1">
				<span className="text-slate-600 block font-semibold text-[11px] uppercase tracking-wide">
					Стоимость услуг (Выручка этапа):
				</span>
				<strong
					className="text-base font-mono block"
					style={{ color: palette.primaryDark }}
				>
					{formatMoneyExact(netServicesRub, netServicesKopecks)}
				</strong>
				<span className="text-[10px] text-slate-500 block">
					Без НДС (ст. 149 НК РФ)
				</span>
			</div>

			<div className="space-y-1">
				<span className="text-slate-600 block font-semibold text-[11px] uppercase tracking-wide">
					Себестоимость ТМЦ этапа:
				</span>
				<strong className="text-base font-mono text-slate-900 block">
					{formatMoneyExact(netMaterialRub, netMaterialKopecks)}
				</strong>
				<span className="text-[10px] text-slate-500 block">
					По учетным ценам склада
				</span>
			</div>

			<div className="space-y-1">
				<span className="text-slate-600 block font-semibold text-[11px] uppercase tracking-wide">
					Валовая маржинальность этапа:
				</span>
				<strong className="text-base font-mono text-emerald-700 flex items-center gap-1.5">
					<TrendingUp className="w-5 h-5 shrink-0" />
					<span>
						{formatMoneyExact(marginRub)} ({marginPercent}%)
					</span>
				</strong>
				<span className="text-[10px] text-slate-500 block">
					Рентабельность медицинского этапа
				</span>
			</div>
		</div>
	);
};
