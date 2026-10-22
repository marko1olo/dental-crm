import React from "react";
import type { ShiftCloseZReport54FzResult } from "../fiscalReceiptEngine";

interface CashDayTallyZReportReceiptProps {
	readonly zReportData: ShiftCloseZReport54FzResult;
}

export function CashDayTallyZReportReceipt({ zReportData }: CashDayTallyZReportReceiptProps) {
	return (
		<div className="p-4 rounded-xl bg-[var(--paper)] dark:bg-[var(--paper-strong)] border border-[var(--line,#cbd5e1)] font-mono text-xs text-[var(--ink,#0f172a)] space-y-2.5 shadow-xs">
			<div className="text-center pb-2 border-b border-dashed border-[var(--line,#cbd5e1)]">
				<h4 className="text-sm font-bold m-0">{zReportData.clinicLegalName}</h4>
				<p className="m-0 text-[11px] text-[var(--muted,#64748b)]">{zReportData.clinicAddress}</p>
				<p className="m-0 text-[11px] text-[var(--muted,#64748b)]">ИНН {zReportData.clinicInn} КПП {zReportData.clinicKpp}</p>
			</div>

			<div className="text-center font-bold text-sm tracking-wide">ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ</div>

			<div className="space-y-1 text-xs border-b border-dashed border-[var(--line,#cbd5e1)] pb-2">
				<div className="flex justify-between">
					<span>СМЕНА:</span>
					<strong className="font-bold">№ {zReportData.shiftNumber}</strong>
				</div>
				<div className="flex justify-between">
					<span>ДАТА/ВРЕМЯ:</span>
					<span>{zReportData.closeDateRu}</span>
				</div>
				<div className="flex justify-between">
					<span>КАССИР:</span>
					<span>{zReportData.cashierFullName} (ИНН: {zReportData.cashierInn})</span>
				</div>
			</div>

			{/* Итоги смены */}
			<div className="space-y-1.5 border-b border-dashed border-[var(--line,#cbd5e1)] pb-2.5">
				<div className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
					1. ПРИХОД (ЧЕКОВ: {zReportData.incomeCount})
				</div>
				<div className="flex justify-between pl-2">
					<span>- Наличными:</span>
					<span className="font-bold">{zReportData.incomeCashRub.toLocaleString("ru-RU")} ₽</span>
				</div>
				<div className="flex justify-between pl-2">
					<span>- Эквайринг / Безнал:</span>
					<span className="font-bold">{zReportData.incomeCardRub.toLocaleString("ru-RU")} ₽</span>
				</div>
				<div className="flex justify-between pl-2">
					<span>- СБП QR:</span>
					<span className="font-bold">{zReportData.incomeSbpRub.toLocaleString("ru-RU")} ₽</span>
				</div>
				<div className="flex justify-between pl-2">
					<span>- Зачет аванса / Семья:</span>
					<span className="font-bold">{zReportData.incomeAdvanceOffsetRub.toLocaleString("ru-RU")} ₽</span>
				</div>
				<div className="flex justify-between font-bold pt-1 border-t border-dotted border-[var(--line,#e2e8f0)]">
					<span>ВСЕГО ПРИХОД:</span>
					<span className="text-teal-700 dark:text-teal-300">{zReportData.incomeTotalRub.toLocaleString("ru-RU")} ₽</span>
				</div>
			</div>

			{/* Возвраты */}
			<div className="space-y-1.5 border-b border-dashed border-[var(--line,#cbd5e1)] pb-2.5">
				<div className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
					2. ВОЗВРАТ ПРИХОДА (ЧЕКОВ: {zReportData.incomeReturnCount})
				</div>
				<div className="flex justify-between pl-2">
					<span>- Возврат на карту:</span>
					<span>{zReportData.incomeReturnCardRub.toLocaleString("ru-RU")} ₽</span>
				</div>
				<div className="flex justify-between font-bold pt-1 border-t border-dotted border-[var(--line,#e2e8f0)]">
					<span>ВСЕГО ВОЗВРАТОВ:</span>
					<span className="text-rose-700 dark:text-rose-300">−{zReportData.incomeReturnTotalRub.toLocaleString("ru-RU")} ₽</span>
				</div>
			</div>

			{/* Итоговая выручка */}
			<div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 flex justify-between items-center text-sm font-bold">
				<span>ИТОГОВАЯ ВЫРУЧКА:</span>
				<span className="text-base text-teal-700 dark:text-teal-300">{zReportData.totalRevenueRub.toLocaleString("ru-RU")} ₽</span>
			</div>

			{/* Служебные реквизиты ККТ */}
			<div className="space-y-1 text-[11px] text-[var(--muted,#64748b)] pt-1">
				<div className="flex justify-between">
					<span>НЕПЕРЕДАННЫХ ФД В ОФД:</span>
					<span className="font-bold text-emerald-600">0</span>
				</div>
				<div className="flex justify-between">
					<span>РЕСУРС КЛЮЧЕЙ ФН:</span>
					<span>{zReportData.fnResourceDaysRemaining} дней</span>
				</div>
				<div className="flex justify-between">
					<span>Касса / ФН / ФД / ФПД:</span>
					<span className="font-bold">{zReportData.kktRegNumber} / {zReportData.fiscalDocumentNumber} / {zReportData.fiscalSign}</span>
				</div>
				<div className="flex justify-between">
					<span>ОФД:</span>
					<span>{zReportData.ofdName}</span>
				</div>
			</div>
		</div>
	);
}
