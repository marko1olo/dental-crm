/**
 * apps/web/src/components/billing/receiptPreview/ReceiptTapeItems.tsx
 *
 * Line items on 80mm thermal tape.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import type { ReceiptItem } from "./receiptPreviewTypes.js";

interface ReceiptTapeItemsProps {
	readonly items: readonly ReceiptItem[];
}

export const ReceiptTapeItems: React.FC<ReceiptTapeItemsProps> = ({ items }) => {
	return (
		<div className="py-2 space-y-2 font-mono text-xs text-slate-900 border-b border-dashed border-slate-400">
			{items.map((item, idx) => {
				const lineTotal = item.amountRub ?? (item.priceRub * item.quantity - (item.discountRub || 0));
				return (
					<div key={item.id || idx} className="space-y-0.5 text-[11px] leading-snug">
						<div className="flex justify-between items-baseline gap-2">
							<span className="font-semibold text-slate-950 truncate max-w-[210px]">
								{idx + 1}. {item.name}
							</span>
							<span className="font-black text-slate-950 shrink-0">
								{lineTotal.toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<div className="flex justify-between text-[10px] text-slate-600 pl-3">
							<span>
								{item.quantity} шт × {item.priceRub.toLocaleString("ru-RU")} ₽
								{item.discountRub ? ` (скидка -${item.discountRub.toLocaleString("ru-RU")} ₽)` : ""}
							</span>
							<span>
								{item.vatRate === "vat_20"
									? "НДС 20% (ст. 164 НК РФ)"
									: "БЕЗ НДС (пп. 2 п. 2 ст. 149 НК РФ)"}
							</span>
						</div>

						<div className="text-[9px] text-slate-500 pl-3 flex justify-between items-center">
							<div className="flex gap-2">
								{item.code804n && <span>Код: {item.code804n}</span>}
								{item.toothNumber && <span>Зуб: {item.toothNumber}</span>}
							</div>
							<span className="font-semibold text-teal-700">
								{`ВЫЧЕТ: КОД 0${item.taxDeductionCategory || "1"}`}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
};
