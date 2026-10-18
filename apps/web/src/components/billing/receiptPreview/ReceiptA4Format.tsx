/**
 * apps/web/src/components/billing/receiptPreview/ReceiptA4Format.tsx
 *
 * A4 Printable Sales Slip / Товарный чек / Справка об оплате медуслуг.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import type { ReceiptItem } from "./receiptPreviewTypes.js";

interface ReceiptA4FormatProps {
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicAddress: string;
	readonly receiptNumber: string;
	readonly effectiveDate: string;
	readonly patientName: string;
	readonly cashierFullName: string;
	readonly items: readonly ReceiptItem[];
	readonly totalDueRub: number;
}

export const ReceiptA4Format: React.FC<ReceiptA4FormatProps> = ({
	clinicLegalName,
	clinicInn,
	clinicAddress,
	receiptNumber,
	effectiveDate,
	patientName,
	cashierFullName,
	items,
	totalDueRub,
}) => {
	return (
		<div className="p-6 bg-white text-slate-900 font-sans space-y-4 rounded-xl border border-slate-300 shadow-sm text-xs" data-testid="receipt-a4-preview">
			<div className="flex justify-between items-start border-b pb-3">
				<div>
					<h3 className="text-base font-extrabold text-slate-950 m-0">{clinicLegalName}</h3>
					<div className="text-[11px] text-slate-600">{clinicAddress} • ИНН {clinicInn}</div>
				</div>
				<div className="text-right">
					<div className="font-extrabold text-sm text-slate-950">ТОВАРНЫЙ ЧЕК / СПРАВКА ОБ ОПЛАТЕ МЕДУСЛУГ № {receiptNumber}</div>
					<div className="text-[11px] text-slate-600">от {effectiveDate}</div>
				</div>
			</div>

			<div className="text-[11px]">
				Покупатель (пациент): <strong>{patientName || "Физическое лицо"}</strong>
			</div>

			<table className="w-full border-collapse border border-slate-300 text-[11px]">
				<thead>
					<tr className="bg-slate-100 text-slate-700">
						<th className="border border-slate-300 p-1.5 text-center w-8">№</th>
						<th className="border border-slate-300 p-1.5 text-center w-24">Код услуги</th>
						<th className="border border-slate-300 p-1.5 text-left">Наименование медицинской услуги</th>
						<th className="border border-slate-300 p-1.5 text-center w-12">Кол-во</th>
						<th className="border border-slate-300 p-1.5 text-right w-20">Цена, ₽</th>
						<th className="border border-slate-300 p-1.5 text-right w-24">Сумма, ₽</th>
					</tr>
				</thead>
				<tbody>
					{items.map((it, idx) => (
						<tr key={it.id || idx}>
							<td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
							<td className="border border-slate-300 p-1.5 text-center font-mono text-[10px]">{it.code804n || "—"}</td>
							<td className="border border-slate-300 p-1.5 font-medium">{it.name}</td>
							<td className="border border-slate-300 p-1.5 text-center">{it.quantity}</td>
							<td className="border border-slate-300 p-1.5 text-right font-mono">{it.priceRub.toLocaleString("ru-RU")}</td>
							<td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{it.amountRub.toLocaleString("ru-RU")}</td>
						</tr>
					))}
				</tbody>
				<tfoot>
					<tr className="font-bold bg-slate-50">
						<td colSpan={5} className="border border-slate-300 p-2 text-right">ИТОГО К ОПЛАТЕ:</td>
						<td className="border border-slate-300 p-2 text-right font-mono text-sm">{totalDueRub.toLocaleString("ru-RU")} ₽</td>
					</tr>
				</tfoot>
			</table>

			<div className="pt-4 flex justify-between items-end text-[11px] text-slate-700">
				<div>
					Отпустил: __________________ / {cashierFullName} /
				</div>
				<div className="text-right">
					М.П.
				</div>
			</div>
		</div>
	);
};
