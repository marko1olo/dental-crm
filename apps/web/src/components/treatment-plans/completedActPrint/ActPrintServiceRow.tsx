import React from "react";
import { formatMoneyExact } from "../treatmentPlanActFormatters.js";
import type { CompletedActProcedureItem, ActPalette } from "./types.js";

export interface ActPrintServiceRowProps {
	readonly item: CompletedActProcedureItem;
	readonly index: number;
	readonly palette: ActPalette;
}

export const ActPrintServiceRow: React.FC<ActPrintServiceRowProps> = ({ item, index, palette }) => {
	return (
		<tr className="hover:bg-slate-50 transition-colors border-b border-slate-300 text-xs">
			<td className="border border-slate-300 p-2 text-center text-slate-500 font-mono text-[11px]">
				{index + 1}
			</td>
			<td className="border border-slate-300 p-2 text-center">
				{item.toothNumber ? (
					<span
						className="px-2 py-0.5 rounded-md font-mono font-extrabold text-xs inline-block border"
						style={{
							backgroundColor: palette.softBg,
							borderColor: palette.accentBorder,
							color: palette.primaryDark,
						}}
					>
						№{item.toothNumber}
					</span>
				) : (
					<span className="text-slate-400 font-mono">—</span>
				)}
			</td>
			<td className="border border-slate-300 p-2 font-medium text-slate-900 leading-snug">
				<div className="flex items-baseline gap-1.5 flex-wrap">
					{item.code804n && (
						<span className="font-mono font-bold text-slate-700 shrink-0 text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">
							{item.code804n}
						</span>
					)}
					<span className="font-semibold text-slate-900">{item.name}</span>
				</div>
				{item.clinicalRationale && (
					<div className="text-[11px] text-slate-500 italic mt-0.5">
						Клиническое показание: {item.clinicalRationale}
					</div>
				)}
			</td>
			<td className="border border-slate-300 p-2 text-center font-mono font-bold">
				{item.quantity}
			</td>
			<td className="border border-slate-300 p-2 text-right font-mono text-slate-700">
				{formatMoneyExact(item.unitPriceRub)}
			</td>
			<td className="border border-slate-300 p-2 text-right font-mono text-slate-500">
				{item.discountRub > 0 ? `-${formatMoneyExact(item.discountRub)}` : "0,00 ₽"}
			</td>
			<td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-950">
				{formatMoneyExact(item.priceRub)}
			</td>
		</tr>
	);
};
