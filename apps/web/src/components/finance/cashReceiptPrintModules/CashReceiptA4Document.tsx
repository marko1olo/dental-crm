import React from "react";
import type { FiscalReceipt54FzResult } from "../fiscalReceiptEngine.js";

export interface CashReceiptA4DocumentProps {
	readonly effectiveReceipt: FiscalReceipt54FzResult;
	readonly attendingDoctorName: string;
}

export const CashReceiptA4Document: React.FC<CashReceiptA4DocumentProps> = ({
	effectiveReceipt,
	attendingDoctorName,
}) => {
	return (
		<div
			className="w-full max-w-xl bg-[var(--paper)] border border-[var(--line)] rounded-xl p-6 text-xs space-y-4 shadow-sm"
			data-testid="a4-receipt-document"
		>
			<div className="border-b border-[var(--line)] pb-4 space-y-1">
				<div className="flex justify-between items-start">
					<div>
						<h2 className="text-base font-extrabold text-[var(--ink)] uppercase tracking-wide">
							{effectiveReceipt.clinicLegalName}
						</h2>
						<p className="text-[11px] text-[var(--muted)]">
							{effectiveReceipt.clinicInn ? `ИНН: ${effectiveReceipt.clinicInn} · ` : ""}
							{effectiveReceipt.clinicAddress}
						</p>
					</div>
					<div className="text-right">
						<span className="font-mono font-bold text-sm text-teal-700 dark:text-teal-400">
							{effectiveReceipt.isWarrantyZeroAct
								? `АКТ ГАРАНТИИ № ${effectiveReceipt.receiptNumber}`
								: `КВИТАНЦИЯ № ${effectiveReceipt.receiptNumber}`}
						</span>
						<p className="text-[11px] text-[var(--muted)]">{effectiveReceipt.receiptDateRu}</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 py-1 border-b border-[var(--line)] text-xs">
				<div>
					<span className="text-[var(--muted)] block">Пациент:</span>
					<strong className="text-[var(--ink)] text-sm">{effectiveReceipt.patientName}</strong>
				</div>
				<div>
					<span className="text-[var(--muted)] block">Лечащий врач / Кассир:</span>
					<strong className="text-[var(--ink)]">
						{attendingDoctorName} / {effectiveReceipt.cashierFullName}
					</strong>
				</div>
			</div>

			<table className="w-full text-left border-collapse">
				<thead>
					<tr className="border-b border-[var(--line)] text-[11px] text-[var(--muted)] font-bold">
						<th className="py-1.5 pr-2">№</th>
						<th className="py-1.5 pr-2">Код услуги</th>
						<th className="py-1.5 pr-2">Наименование услуги</th>
						<th className="py-1.5 text-center pr-2">Кол-во</th>
						<th className="py-1.5 text-right pr-2">Цена</th>
						<th className="py-1.5 text-right">Сумма</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-[var(--line)]">
					{effectiveReceipt.items.map((item, idx) => (
						<tr key={item.id || idx}>
							<td className="py-2 text-[var(--muted)]">{idx + 1}</td>
							<td className="py-2 font-mono text-[11px] text-teal-700 dark:text-teal-400">
								{item.code804n}
							</td>
							<td className="py-2 font-medium text-[var(--ink)]">{item.name}</td>
							<td className="py-2 text-center text-[var(--ink)]">{item.quantity}</td>
							<td className="py-2 text-right font-mono">{item.unitPriceRub.toLocaleString("ru-RU")} ₽</td>
							<td className="py-2 text-right font-mono font-bold">{item.amountRub.toLocaleString("ru-RU")} ₽</td>
						</tr>
					))}
				</tbody>
			</table>

			<div className="border-t-2 border-[var(--line)] pt-3 space-y-1.5">
				<div className="flex justify-between items-baseline text-base font-extrabold text-[var(--ink)]">
					<span>ИТОГО К ОПЛАТЕ:</span>
					<span className="font-mono text-lg text-emerald-700 dark:text-emerald-400">
						{effectiveReceipt.totalRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
				<div className="flex justify-between text-xs text-[var(--muted)]">
					<span>Способ расчета:</span>
					<span className="font-semibold text-[var(--ink)]">
						{effectiveReceipt.isWarrantyZeroAct
							? "Безвозмездное гарантийное обслуживание (скидка 100%)"
							: effectiveReceipt.payments.cardRub > 0
								? `Банковская карта (${effectiveReceipt.payments.cardRub.toLocaleString("ru-RU")} ₽)`
								: effectiveReceipt.payments.cashRub > 0
									? `Наличные (${effectiveReceipt.payments.cashRub.toLocaleString("ru-RU")} ₽)`
									: effectiveReceipt.payments.sbpRub > 0
										? `СБП QR (${effectiveReceipt.payments.sbpRub.toLocaleString("ru-RU")} ₽)`
										: "Безналичный расчет"}
					</span>
				</div>
			</div>
		</div>
	);
};
