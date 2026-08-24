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
	readonly clinicLicense?: string;
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
	readonly isPaidStampVisible?: boolean;
}

export const FiscalReceiptPrintView: React.FC<FiscalReceiptPrintViewProps> = ({
	clinicName,
	clinicInn,
	clinicAddress = "г. Москва, ул. Медицинская, д. 10",
	clinicLicense = "Лицензия на мед. деятельность № ЛО41-01137-77/00368421 от 12.10.2021 г.",
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
	isPaidStampVisible = true,
}) => {
	const totalElectronic = tenders.cardRub + tenders.sbpRub;
	const receivedCash = tenders.receivedCashRub ?? tenders.cashRub;
	const changeRub = Math.max(0, receivedCash - tenders.cashRub);

	const distinctPatients = React.useMemo(() => {
		const names = new Set<string>();
		for (const it of items) {
			if (it.patientFullName) names.add(it.patientFullName);
		}
		return Array.from(names);
	}, [items]);

	const paymentMethodLabels: Record<string, string> = {
		full_prepayment: "Предоплата 100% (Тег 1214 = 1)",
		prepayment: "Предоплата (Тег 1214 = 2)",
		advance: "Аванс (Тег 1214 = 3)",
		full_payment: "Полный расчет (Тег 1214 = 4)",
		partial_payment_and_credit: "Частичный расчет и кредит (Тег 1214 = 5)",
		credit_handover: "Передача в кредит (Тег 1214 = 6)",
		credit_payment: "Оплата кредита (Тег 1214 = 7)",
	};

	return (
		<div
			className="fiscal-receipt-view font-mono text-[11px] leading-tight bg-white text-slate-950 p-6 rounded-2xl border border-slate-300 shadow-md max-w-sm mx-auto select-text"
			data-testid="fiscal-receipt-print-view"
		>
			{/* Clinic Header */}
			<div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
				<h3 className="font-black text-xs uppercase tracking-wider">{clinicName}</h3>
				<p className="text-[10px] text-slate-600">ИНН: {clinicInn} · СНО: УСН Доходы (Тег 1055 = 2)</p>
				<p className="text-[10px] text-slate-600">{clinicAddress}</p>
				{clinicLicense && (
					<p className="text-[9px] text-slate-500 font-sans leading-tight pt-0.5">
						{clinicLicense}
					</p>
				)}
			</div>

			{/* Document Info */}
			<div className="py-2.5 space-y-1 border-b border-dashed border-slate-400 text-[10px]">
				<div className="flex justify-between font-bold">
					<span>{isIncomeReturn ? "КАССОВЫЙ ЧЕК / ВОЗВРАТ ПРИХОДА (Тег 1054 = 2)" : "КАССОВЫЙ ЧЕК / ПРИХОД (Тег 1054 = 1)"}</span>
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
					<span>{distinctPatients.length > 1 ? "ПЛАТЕЛЬЩИК (РОДИТЕЛЬ/ПРЕДСТАВИТЕЛЬ):" : "ПАЦИЕНТ:"}</span>
					<span className="font-semibold truncate max-w-[180px]">{patientName}</span>
				</div>
				{distinctPatients.length > 1 && (
					<div className="flex justify-between text-[9px] text-slate-800 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
						<span>ПАЦИЕНТЫ В ЧЕКЕ:</span>
						<span className="truncate max-w-[180px]">{distinctPatients.join(", ")}</span>
					</div>
				)}
				<div className="flex justify-between">
					<span>КОНТАКТ (Тег 1008):</span>
					<span>{customerContact}</span>
				</div>
			</div>

			{/* Itemized Nomenclature Positions */}
			<div className="py-3 space-y-2 border-b border-dashed border-slate-400">
				<div className="text-[10px] font-bold text-slate-600 uppercase">
					Предмет расчета (Номенклатура 804н / Тег 1030):
				</div>

				<div className="space-y-2">
					{items.map((it, idx) => {
						const methodLabel = paymentMethodLabels[it.method] || "Полный расчет (Тег 1214 = 4)";
						const codeSuffix = it.code804n ? ` [${it.code804n}]` : "";
						const patientPrefix = it.patientFullName && distinctPatients.length > 1
							? `[${it.patientFullName}${it.familyMemberRole ? ` (${it.familyMemberRole})` : ""}] `
							: "";
						return (
							<div key={it.id || idx} className="space-y-0.5">
								<div className="font-bold text-[11px] text-slate-900 leading-snug">
									{idx + 1}. {patientPrefix}{it.name}{codeSuffix}
								</div>
								{it.markingCode && (
									<div className="flex items-center gap-1 text-[9px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
										<Tag className="w-2.5 h-2.5" />
										<span>[М] Честный ЗНАК (Тег 1163): {it.markingCode.slice(0, 24)}...</span>
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
									<span>НДС: Без НДС (ст. 149 НК РФ / Тег 1199 = 6)</span>
									<span>{methodLabel}</span>
								</div>
							</div>
						);
					})}
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
						<>
							<div className="flex justify-between">
								<span>НАЛИЧНЫМИ (Тег 1031):</span>
								<span className="font-bold">{tenders.cashRub.toFixed(2)} ₽</span>
							</div>
							{receivedCash > tenders.cashRub && (
								<>
									<div className="flex justify-between text-slate-500">
										<span>ПОЛУЧЕНО НАЛИЧНЫМИ:</span>
										<span>{receivedCash.toFixed(2)} ₽</span>
									</div>
									<div className="flex justify-between text-emerald-800 font-bold">
										<span>СДАЧА:</span>
										<span>{changeRub.toFixed(2)} ₽</span>
									</div>
								</>
							)}
						</>
					)}
					{tenders.cardRub > 0 && (
						<div className="flex justify-between">
							<span>БАНКОВСКОЙ КАРТОЙ (Тег 1081):</span>
							<span className="font-semibold">{tenders.cardRub.toFixed(2)} ₽</span>
						</div>
					)}
					{tenders.sbpRub > 0 && (
						<div className="flex justify-between text-purple-900">
							<span>СБП QR / SBERPAY (Тег 1081):</span>
							<span className="font-semibold">{tenders.sbpRub.toFixed(2)} ₽</span>
						</div>
					)}
					{tenders.advanceOffsetRub > 0 && (
						<div className="flex justify-between text-blue-900 font-medium">
							<span>ЗАЧЕТ АВАНСА / ДЕПОЗИТА (Тег 1215):</span>
							<span className="font-semibold">{tenders.advanceOffsetRub.toFixed(2)} ₽</span>
						</div>
					)}
					{tenders.familyWalletRub && tenders.familyWalletRub > 0 ? (
						<div className="flex justify-between text-pink-900 font-medium">
							<span>СЕМЕЙНЫЙ БАЛАНС (Тег 1215):</span>
							<span className="font-semibold">{tenders.familyWalletRub.toFixed(2)} ₽</span>
						</div>
					) : null}
					{tenders.certificateRub > 0 && (
						<div className="flex justify-between text-amber-900 font-medium">
							<span>СЕРТИФИКАТ (Тег 1215):</span>
							<span className="font-semibold">{tenders.certificateRub.toFixed(2)} ₽</span>
						</div>
					)}
				</div>
			</div>

			{/* Paid Stamp & Signatures Section */}
			<div className="py-3 border-b border-dashed border-slate-400 space-y-3">
				<div className="flex items-center justify-between">
					{/* Paid Stamp */}
					{isPaidStampVisible && (
						<div
							className="border-2 border-emerald-600 text-emerald-700 font-black text-[12px] uppercase px-3 py-1 rounded-lg transform -rotate-3 tracking-widest flex items-center gap-1.5 shadow-sm bg-emerald-50/70"
							data-testid="receipt-paid-stamp"
						>
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
							<span>ОПЛАЧЕНО</span>
						</div>
					)}

					{/* Clinic Stamp / Seal Placeholder */}
					<div className="text-right">
						<span className="text-[9px] text-slate-400 border border-dashed border-slate-300 rounded-full px-2.5 py-1 uppercase font-bold tracking-wider">
							М.П. Клиники
						</span>
					</div>
				</div>

				{/* Cashier Signature Line */}
				<div className="pt-2 flex justify-between items-end text-[10px] text-slate-700">
					<div>
						<span className="text-slate-500">Подпись кассира:</span>
						<div className="w-28 border-b border-slate-900 mt-4"></div>
					</div>
					<div className="text-right">
						<span className="font-semibold text-slate-900">{cashierFullName}</span>
						<div className="text-[8px] text-slate-400">(расшифровка подписи)</div>
					</div>
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

				<div className="text-center pt-2 space-y-1.5">
					<div className="inline-block p-2 bg-white border border-slate-300 rounded-xl shadow-sm">
						<div className="w-24 h-24 mx-auto flex items-center justify-center bg-slate-50 rounded-lg text-slate-900 border border-slate-100">
							<QrCode className="w-20 h-20 text-slate-950" />
						</div>
					</div>
					<div className="space-y-0.5">
						<p className="text-[9px] font-bold text-slate-800">
							QR-код проверки чека в ФНС России
						</p>
						<p className="text-[8px] text-slate-500">
							Официальный сервис: www.nalog.gov.ru
						</p>
						{ofdVerificationUrl && (
							<p className="text-[8px] text-blue-700 truncate max-w-[220px] mx-auto font-mono">
								{ofdVerificationUrl}
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
