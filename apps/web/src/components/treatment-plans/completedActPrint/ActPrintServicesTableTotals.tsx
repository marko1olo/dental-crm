import React from "react";
import { formatMoneyExact } from "../treatmentPlanActFormatters.js";
import type { ActPalette } from "./types.js";

export interface ActPrintServicesTableTotalsProps {
	readonly grossServicesRub: number;
	readonly discountTotalRub: number;
	readonly netServicesRub: number;
	readonly netServicesKopecks?: number;
	readonly palette: ActPalette;
}

export const ActPrintServicesTableTotals: React.FC<ActPrintServicesTableTotalsProps> = ({
	grossServicesRub,
	discountTotalRub,
	netServicesRub,
	netServicesKopecks,
	palette,
}) => {
	return (
		<>
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
					<td colSpan={6} className="border border-slate-300 p-2 text-right text-emerald-700">
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
				<td colSpan={6} className="border border-slate-300 p-2.5 text-right text-xs uppercase tracking-wide">
					ИТОГО СТОИМОСТЬ ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ (НДС НЕ ОБЛАГАЕТСЯ):
				</td>
				<td
					className="border border-slate-300 p-2.5 text-right font-mono text-sm font-black"
					style={{ color: palette.primaryDark }}
				>
					{formatMoneyExact(netServicesRub, netServicesKopecks)}
				</td>
			</tr>
		</>
	);
};
