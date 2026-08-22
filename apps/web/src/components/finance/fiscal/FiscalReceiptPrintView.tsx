/**
 * FiscalReceiptPrintView.tsx — Visual & Thermal Print View for 54-FZ (FFD 1.2) Fiscal Receipts.
 */

import React from "react";
import { CheckCircle2, FileText, Printer, QrCode, ShieldCheck, Tag } from "lucide-react";
import type { FiscalItemDraft, SplitTenderState } from "./fiscal54fzEngine";

export interface FiscalReceiptPrintViewProps {
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly clinicAddress?: string;
	readonly cashierFullName: string;
	readonly customerContact: string;
	readonly patientName: string;
	readonly items: readonly FiscalItemDraft[];
	readonly tenders: SplitTenderState;
	readonly totalRub: number;
	readonly totalRubFormatted: string;
	readonly fnSerial?: string;
	readonly fiscalDocNumber?: string;
	readonly fiscalSign?: string;
	readonly qrString?: string;
	readonly ofdVerificationUrl?: string;
	readonly issuedAt?: string;
	readonly isIncomeReturn?: boolean;
}

export const FiscalReceiptPrintView: React.FC<FiscalReceiptPrintViewProps> = ({
	clinicName,
	clinicInn,
	clinicAddress = "г. Москва, ул. Медицинская, д. 10",
	cashierFullName,
	customerContact,
	patientName,
	items,
	tenders,
	totalRub,
	totalRubFormatted,
	fnSerial = "9960440302145896",
	fiscalDocNumber = "48291",
	fiscalSign = "3920194821",
	qrString,
	ofdVerificationUrl,
	issuedAt = new Date().toLocaleString("ru-RU"),
	isIncomeReturn = false,
}) => {
	const totalElectronic = tenders.cardRub + tenders.sbpRub;

	return (
		<div
			className="fiscal-receipt-view font-mono text-[11px] leading-tight bg-white text-slate-950 p-6 rounded-2xl border border-slate-300 shadow-md max-w-sm mx-auto select-text"
			data-testid="fiscal-receipt-print-view"
		>
			{/* Clinic Header */}
			<div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
				<h3 className="font-black text-xs uppercase tracking-wider">{clinicName}</h3>
				<p className="text-[10px] text-slate-600">ИНН: {clinicInn} · СНО: УСН Доходы</p>
				<p className="text-[10px] text-slate-600">{clinicAddress}</p>
			</div>

			{/* Document Info */}
			<div className="py-2.5 space-y-1 border-b border-dashed border-slate-400 text-[10px]">
				<div className="flex justify-between font-bold">
					<span>{isIncomeReturn ? "КАССОВЫЙ ЧЕК / ВОЗВРАТ ПРИХОДА" : "КАССОВЫЙ ЧЕК / ПРИХОД"}</span>
					<span>ФФД 1.2</span>
				</div>
				<div className="flex justify-between">
					<span>ДАТА / ВРЕМЯ:</span>
					<span>{issuedAt}</span>
				</div>
				<div className="flex justify-between">
					<span>КАССИР:</span>
					<span>{cashierFullName}</span>
				</div>
				<div className="flex justify-between">
					<span>ПАЦИЕНТ:</span>
					<span className="font-semibold truncate max-w-[180px]">{patientName}</span>
				</div>
				<div className="flex justify-between">
					<span>КОНТАКТ:</span>
					<span>{customerContact}</span>
				</div>
			</div>

			{/* Itemized Nomenclature Positions */}
			<div className="py-3 space-y-2 border-b border-dashed border-slate-400">
				<div className="text-[10px] font-bold text-slate-600 uppercase">
					Предмет расчета (Номенклатура / 54-ФЗ):
				</div>

				<div className="space-y-2">
					{items.map((it, idx) => (
						<div key={it.id || idx} className="space-y-0.5">
							<div className="font-bold text-[11px] text-slate-900 leading-snug">
								{idx + 1}. {it.name}
							</div>
							{it.markingCode && (
								<div className="flex items-center gap-1 text-[9px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
									<Tag className="w-2.5 h-2.5" />
									<span>[М] Честный ЗНАК: {it.markingCode.slice(0, 24)}...</span>
								</div>
							)}
							<div className="flex justify-between text-[10px] text-slate-600">
								<span>
									{it.quantity} шт. × {it.priceRub.toFixed(2)} ₽
									{it.discountRub && it.discountRub > 0 ? ` (-${it.discountRub.toFixed(2)} ₽)` : ""}
								</span>
								<span className="font-bold text-slate-950">
									={(it.priceRub * it.quantity - (it.discountRub || 0)).toFixed(2)} ₽
								</span>
							</div>
							<div className="flex justify-between text-[9px] text-slate-500">
								<span>НДС: Без НДС (ст. 149 НК РФ)</span>
								<span>Способ: {it.method === "advance" ? "Аванс" : "Полный расчет"}</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Total and Split Payments */}
			<div className="py-3 space-y-1.5 border-b border-dashed border-slate-400">
				<div className="flex justify-between items-baseline font-black text-sm text-slate-950 pt-1">
					<span>ИТОГО К ОПЛАТЕ:</span>
					<span className="text-base font-extrabold">{totalRubFormatted} ₽</span>
				</div>

				<div className="pt-2 space-y-1 text-[10px] text-slate-700">
					{tenders.cashRub > 0 && (
						<div className="flex justify-between">
							<span>НАЛИЧНЫМИ (Тег 1031):</span>
							<span className="font-semibold">{tenders.cashRub.toFixed(2)} ₽</span>
						</div>
					)}
					{totalElectronic > 0 && (
						<div className="flex justify-between">
							<span>БЕЗНАЛИЧНЫМИ / ЭЛЕКТРОННЫМИ (Тег 1081):</span>
							<span className="font-semibold">{totalElectronic.toFixed(2)} ₽</span>
						</div>
					)}
					{tenders.advanceOffsetRub > 0 && (
						<div className="flex justify-between text-blue-900 font-medium">
							<span>ЗАЧЕТ АВАНСА / ПРЕДОПЛАТЫ (Тег 1215):</span>
							<span className="font-semibold">{tenders.advanceOffsetRub.toFixed(2)} ₽</span>
						</div>
					)}
				</div>
			</div>

			{/* Fiscal Hardware Attributes & QR */}
			<div className="pt-3 space-y-2 text-[9px] text-slate-600">
				<div className="grid grid-cols-2 gap-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
					<div>ЗН ККТ: 0489100021</div>
					<div>ФН: {fnSerial}</div>
					<div>ФД: {fiscalDocNumber}</div>
					<div>ФПД: {fiscalSign}</div>
				</div>

				<div className="text-center pt-2 space-y-1">
					<div className="inline-block p-2 bg-white border border-slate-300 rounded-lg shadow-sm">
						<div className="w-24 h-24 mx-auto flex items-center justify-center bg-slate-100 rounded text-slate-400">
							<QrCode className="w-16 h-16 text-slate-900" />
						</div>
					</div>
					<p className="text-[8px] text-slate-500">
						Проверка чека в ФНС: www.nalog.gov.ru
					</p>
					{ofdVerificationUrl && (
						<p className="text-[8px] text-blue-700 truncate max-w-[220px] mx-auto">
							{ofdVerificationUrl}
						</p>
					)}
				</div>
			</div>
		</div>
	);
};
