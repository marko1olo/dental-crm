/**
 * Order804nFiscalReceiptPrint.tsx — Печатная форма и визуализация фискального кассового чека 54-ФЗ (ФФД 1.2).
 */

import React from "react";
import { CheckCircle2, FileText, Printer, QrCode, ShieldCheck } from "lucide-react";
import type { FiscalReceipt54FzResult } from "./order804nFiscalEngine";

export interface Order804nFiscalReceiptPrintProps {
	readonly receipt: FiscalReceipt54FzResult;
	readonly className?: string;
}

export const Order804nFiscalReceiptPrint: React.FC<Order804nFiscalReceiptPrintProps> = ({
	receipt,
	className = "",
}) => {
	return (
		<div
			className={`fiscal-receipt-print font-mono text-[11px] leading-tight bg-white text-slate-950 p-6 rounded-2xl border border-slate-300 shadow-inner max-w-sm mx-auto select-text ${className}`.trim()}
			data-testid="order804n-fiscal-receipt-view"
		>
			{/* Clinic Header */}
			<div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
				<h3 className="font-black text-xs uppercase tracking-wider">
					{receipt.clinicLegalName}
				</h3>
				<p className="text-[10px] text-slate-600">
					ИНН: {receipt.clinicInn} · СНО: {receipt.taxationSystemName}
				</p>
				<p className="text-[10px] text-slate-600">
					{receipt.clinicAddress}
				</p>
			</div>

			{/* Document Info */}
			<div className="py-2.5 space-y-1 border-b border-dashed border-slate-400 text-[10px]">
				<div className="flex justify-between">
					<span>КАССОВЫЙ ЧЕК / ПРИХОД</span>
					<span className="font-bold">№ {receipt.receiptNumber}</span>
				</div>
				<div className="flex justify-between">
					<span>ДАТА / ВРЕМЯ:</span>
					<span>{receipt.receiptDateRu}</span>
				</div>
				<div className="flex justify-between">
					<span>СМЕНА: №{receipt.shiftNumber}</span>
					<span>КАССИР: {receipt.cashierFullName}</span>
				</div>
				<div className="flex justify-between">
					<span>ПАЦИЕНТ:</span>
					<span className="font-semibold truncate max-w-[180px]">{receipt.patientName}</span>
				</div>
				<div className="flex justify-between">
					<span>КОНТАКТ:</span>
					<span>{receipt.customerContact}</span>
				</div>
			</div>

			{/* Itemized Services (Order 804n) */}
			<div className="py-3 space-y-2 border-b border-dashed border-slate-400">
				<div className="text-[10px] font-bold text-slate-600 uppercase">
					Предмет расчета (Услуги по Номенклатуре 804н):
				</div>

				<div className="space-y-2">
					{receipt.items.map((it, idx) => (
						<div key={it.id || idx} className="space-y-0.5">
							<div className="font-bold text-[11px] text-slate-900 leading-snug">
								{idx + 1}. {it.name}
							</div>
							<div className="flex justify-between text-[10px] text-slate-600">
								<span>
									{it.quantity} шт. × {it.unitPriceRub.toLocaleString("ru-RU")} ₽
									{it.discountRub > 0 ? ` (- скидка ${it.discountRub} ₽)` : ""}
								</span>
								<span className="font-bold text-slate-950">
									={it.amountRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>
							<div className="flex justify-between text-[9px] text-slate-500">
								<span>НДС: БЕЗ НДС (ст. 149 НК РФ)</span>
								<span>ВЫЧЕТ: КОД 0{it.taxDeductionCategory}</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Total and Split Payments Breakdown */}
			<div className="py-3 space-y-1.5 border-b border-dashed border-slate-400">
				<div className="flex justify-between items-baseline font-black text-sm text-slate-950 pt-1">
					<span>ИТОГО К ОПЛАТЕ:</span>
					<span className="text-base font-extrabold">
						={receipt.totalRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>

				<div className="pt-2 space-y-1 text-[10px] text-slate-700">
					{receipt.payments.cashRub > 0 && (
						<>
							<div className="flex justify-between">
								<span>НАЛИЧНЫМИ (Тег 1031):</span>
								<span className="font-bold">{receipt.payments.cashRub.toLocaleString("ru-RU")} ₽</span>
							</div>
							{receipt.payments.receivedCashRub > receipt.payments.cashRub && (
								<>
									<div className="flex justify-between text-slate-500">
										<span>ПОЛУЧЕНО НАЛИЧНЫМИ:</span>
										<span>{receipt.payments.receivedCashRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between text-emerald-800 font-bold">
										<span>СДАЧА:</span>
										<span>{receipt.payments.changeRub.toLocaleString("ru-RU")} ₽</span>
									</div>
								</>
							)}
						</>
					)}
					{receipt.payments.cardRub > 0 && (
						<div className="flex justify-between">
							<span>БЕЗНАЛИЧНЫМИ / КАРТА (Тег 1081):</span>
							<span className="font-bold">{receipt.payments.cardRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					)}
					{receipt.payments.sbpRub > 0 && (
						<div className="flex justify-between">
							<span>СБП / ПЛАТИ QR (Тег 1081):</span>
							<span className="font-bold text-teal-800">{receipt.payments.sbpRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					)}
					{receipt.payments.depositRub > 0 && (
						<div className="flex justify-between">
							<span>ПРЕДОПЛАТА / АВАНС (Тег 1215):</span>
							<span className="font-bold text-amber-800">{receipt.payments.depositRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					)}
					{receipt.payments.familyWalletRub > 0 && (
						<div className="flex justify-between text-pink-900">
							<span>СЕМЕЙНЫЙ БАЛАНС (Тег 1215):</span>
							<span className="font-bold text-pink-800">{receipt.payments.familyWalletRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					)}
					{receipt.payments.certificateRub > 0 && (
						<div className="flex justify-between text-amber-900">
							<span>СЕРТИФИКАТ (Тег 1215):</span>
							<span className="font-bold text-amber-800">{receipt.payments.certificateRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					)}
				</div>
			</div>

			{/* Fiscal Requisites (54-FZ mandatory tags) */}
			<div className="py-3 space-y-1 text-[10px] text-slate-600 border-b border-dashed border-slate-400">
				<div className="flex justify-between">
					<span>ФН:</span>
					<span className="font-bold">{receipt.fnSerial}</span>
				</div>
				<div className="flex justify-between">
					<span>ФД:</span>
					<span className="font-bold">{receipt.fiscalDocumentNumber}</span>
				</div>
				<div className="flex justify-between">
					<span>ФПД:</span>
					<span className="font-bold">{receipt.fiscalSign}</span>
				</div>
				<div className="flex justify-between">
					<span>СНО:</span>
					<span>{receipt.taxationSystemName}</span>
				</div>
				<div className="flex justify-between">
					<span>СПРАВКА ДЛЯ ФНС (КНД 1151156):</span>
					<span className="font-bold text-slate-900">
						{receipt.taxDeductionCategory === "2"
							? "КОД 02 (Дорогостоящее)"
							: "КОД 01 (Стандартное)"}
					</span>
				</div>
			</div>

			{/* OFD QR and Verification Footer */}
			<div className="pt-3 text-center space-y-2">
				<div className="flex items-center justify-center p-2 rounded-xl bg-slate-100 border border-slate-200">
					<div className="space-y-1">
						<div className="text-[9px] text-slate-500 uppercase">
							Проверка чека в ФНС / ОФД:
						</div>
						<a
							href={receipt.ofdUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-[9px] text-teal-700 hover:underline break-all block"
						>
							{receipt.ofdUrl}
						</a>
					</div>
				</div>

				<p className="text-[9px] text-slate-400 uppercase tracking-wider">
					СПАСИБО ЗА ДОВЕРИЕ КЛИНИКЕ ДЕНТЕ!
				</p>
			</div>
		</div>
	);
};
