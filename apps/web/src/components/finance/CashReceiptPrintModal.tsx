/**
 * CashReceiptPrintModal.tsx — 54-FZ Cash Receipt & Sales Slip Print Modal (80mm Tape & A4).
 *
 * Compliance:
 * - Mandate 8d pt 5: Premium typography of printable documents.
 * - Mandate 8d pt 4: WCAG AAA contrast, no gray dirty patches.
 * - Mandate 8d pt 6: Modal depth strictly 1.
 * - Mandate 8d pt 7: Exclusively vector Lucide icons, zero cartoon emojis.
 * - Mandate 8e: Doctor & cashier autonomy, instant 1-click printing.
 */

import React, { useState } from "react";
import {
	Printer,
	Copy,
	Check,
	X,
	FileText,
	Receipt,
	QrCode,
	ShieldCheck,
} from "lucide-react";
import { showToast } from "../GlobalToast.js";
import { Order804nFiscalReceiptPrint } from "./Order804nFiscalReceiptPrint.js";
import type { FiscalReceipt54FzResult } from "./order804nFiscalEngine.js";

export interface CashReceiptPrintModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly receipt?: FiscalReceipt54FzResult | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly attendingDoctorName?: string | undefined;
	readonly defaultFormat?: "80mm" | "a4" | undefined;
}

export const CashReceiptPrintModal: React.FC<CashReceiptPrintModalProps> = ({
	isOpen,
	onClose,
	receipt,
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7701234567",
	clinicAddress = "г. Москва, ул. Клиническая, д. 10",
	cashierFullName = "Кассир",
	attendingDoctorName = "Врач-стоматолог",
	defaultFormat = "80mm",
}) => {
	const [format, setFormat] = useState<"80mm" | "a4">(defaultFormat);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	if (!isOpen) return null;

	// Fallback receipt data for pure standalone preview
	const effectiveReceipt: FiscalReceipt54FzResult = receipt || {
		receiptNumber: "00142",
		receiptDateIso: new Date().toISOString(),
		receiptDateRu: new Date().toLocaleString("ru-RU"),
		fnSerial: "9960440302145896",
		fiscalDocumentNumber: "0042",
		fiscalSign: "3920194821",
		shiftNumber: 1,
		cashierFullName,
		clinicLegalName: clinicName,
		clinicInn,
		clinicAddress,
		taxationSystem: "usn_income_expense",
		taxationSystemName: "УСН (доходы минус расходы)",
		customerContact: "+7 (999) 000-00-00",
		patientName: "Пациент",
		patientId: "pat-default",
		items: [
			{
				id: "item-1",
				name: "Прием (осмотр, консультация) врача-стоматолога первичный",
				code804n: "B01.065.001",
				quantity: 1,
				unitPriceRub: 2500,
				unitPriceKopecks: 250000,
				discountRub: 0,
				discountKopecks: 0,
				grossRub: 2500,
				grossKopecks: 250000,
				amountRub: 2500,
				amountKopecks: 250000,
				vatRate: "vat_none" as const,
				taxRateKopecks: 0,
				paymentSubject: "service",
				paymentMethod: "full_payment",
				quantityMeasure: "piece",
				taxDeductionCategory: "1",
			},
		],
		payments: {
			cashRub: 0,
			cashKopecks: 0,
			receivedCashRub: 0,
			receivedCashKopecks: 0,
			changeRub: 0,
			changeKopecks: 0,
			isCashShortage: false,
			cashShortageRub: 0,
			cardRub: 2500,
			cardKopecks: 250000,
			sbpRub: 0,
			sbpKopecks: 0,
			depositRub: 0,
			depositKopecks: 0,
			advanceOffsetRub: 0,
			advanceOffsetKopecks: 0,
			familyWalletRub: 0,
			familyWalletKopecks: 0,
			certificateRub: 0,
			certificateKopecks: 0,
			insuranceRub: 0,
			insuranceKopecks: 0,
			patientCoPayRub: 2500,
			patientCoPayKopecks: 250000,
			totalRub: 2500,
			totalKopecks: 250000,
			allocatedKopecks: 250000,
			remainingKopecks: 0,
			isFullyAllocated: true,
			isOverallocated: false,
		},
		totalRub: 2500,
		totalKopecks: 250000,
		grossRub: 2500,
		grossKopecks: 250000,
		taxRateKopecks: 0,
		taxDeductionCategory: "1",
		ofdUrl: "https://consumer.ofd.ru/check",
		operationType: "income",
		operationTypeName: "Приход",
	};

	const handlePrint = () => {
		window.print();
		showToast("Документ отправлен на печать", "info");
	};

	const handleCopyText = async () => {
		const textLines = [
			`=== ${effectiveReceipt.clinicLegalName} ===`,
			`ИНН: ${effectiveReceipt.clinicInn}`,
			`КАССОВЫЙ ЧЕК № ${effectiveReceipt.receiptNumber}`,
			`Дата: ${effectiveReceipt.receiptDateRu}`,
			`Кассир: ${effectiveReceipt.cashierFullName}`,
			`Врач: ${attendingDoctorName}`,
			`Пациент: ${effectiveReceipt.patientName}`,
			"----------------------------------------",
			...effectiveReceipt.items.map(
				(it, i) => `${i + 1}. [${it.code804n}] ${it.name} - ${it.amountRub} руб.`,
			),
			"----------------------------------------",
			`ИТОГО: ${effectiveReceipt.totalRub} руб.`,
			`ФД: ${effectiveReceipt.fiscalDocumentNumber}  ФПД: ${effectiveReceipt.fiscalSign}`,
			`ФН: ${effectiveReceipt.fnSerial}`,
			`Сайт ОФД: ${effectiveReceipt.ofdUrl}`,
		];

		await navigator.clipboard.writeText(textLines.join("\n"));
		setIsCopied(true);
		showToast("Реквизиты чека скопированы в буфер обмена", "success");
		setTimeout(() => setIsCopied(false), 2000);
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="cash-receipt-modal-title"
			data-testid="cash-receipt-print-modal"
		>
			<div className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2.5">
						<Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
						<div>
							<h3 id="cash-receipt-modal-title" className="text-sm font-bold m-0 text-[var(--ink)] flex items-center gap-2">
								<span>Кассовый чек и слип</span>
								<span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
									54-ФЗ / ФФД 1.2
								</span>
							</h3>
							<p className="text-[11px] text-[var(--muted)] m-0">
								Чек №{effectiveReceipt.receiptNumber} · {effectiveReceipt.receiptDateRu}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Format selector: 80mm vs A4 */}
						<div className="flex bg-[var(--paper)] p-0.5 rounded-lg border border-[var(--line)] text-xs font-semibold">
							<button
								type="button"
								onClick={() => setFormat("80mm")}
								className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
									format === "80mm"
										? "bg-teal-600 text-white shadow-2xs font-bold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid="format-80mm-btn"
							>
								Лента 80мм
							</button>
							<button
								type="button"
								onClick={() => setFormat("a4")}
								className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
									format === "a4"
										? "bg-teal-600 text-white shadow-2xs font-bold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid="format-a4-btn"
							>
								А4 Товарный чек
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="w-8 h-8 rounded-lg border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shrink-0"
							aria-label="Закрыть окно чека"
							data-testid="btn-close-receipt-modal"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Body Content */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--paper-soft)] flex justify-center">
					{format === "80mm" ? (
						<div className="w-full max-w-sm">
							<Order804nFiscalReceiptPrint receipt={effectiveReceipt} />
						</div>
					) : (
						<div
							className="w-full max-w-xl bg-[var(--paper)] border border-[var(--line)] rounded-xl p-6 text-xs space-y-4 shadow-sm"
							data-testid="a4-receipt-document"
						>
							{/* A4 Header */}
							<div className="border-b border-[var(--line)] pb-4 space-y-1">
								<div className="flex justify-between items-start">
									<div>
										<h2 className="text-base font-extrabold text-[var(--ink)] uppercase tracking-wide">
											{effectiveReceipt.clinicLegalName}
										</h2>
										<p className="text-[11px] text-[var(--muted)]">
											ИНН: {effectiveReceipt.clinicInn} · {effectiveReceipt.clinicAddress}
										</p>
									</div>
									<div className="text-right">
										<span className="font-mono font-bold text-sm text-teal-700 dark:text-teal-400">
											КВИТАНЦИЯ № {effectiveReceipt.receiptNumber}
										</span>
										<p className="text-[11px] text-[var(--muted)]">{effectiveReceipt.receiptDateRu}</p>
									</div>
								</div>
							</div>

							{/* Doctor & Patient */}
							<div className="grid grid-cols-2 gap-3 py-1 border-b border-[var(--line)] text-xs">
								<div>
									<span className="text-[var(--muted)] block">Пациент:</span>
									<strong className="text-[var(--ink)] text-sm">{effectiveReceipt.patientName}</strong>
								</div>
								<div>
									<span className="text-[var(--muted)] block">Лечащий врач / Кассир:</span>
									<strong className="text-[var(--ink)]">{attendingDoctorName} / {effectiveReceipt.cashierFullName}</strong>
								</div>
							</div>

							{/* Items Table */}
							<table className="w-full text-left border-collapse">
								<thead>
									<tr className="border-b border-[var(--line)] text-[11px] text-[var(--muted)] font-bold">
										<th className="py-1.5 pr-2">№</th>
										<th className="py-1.5 pr-2">Код 804н</th>
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
											<td className="py-2 font-mono text-[11px] text-teal-700 dark:text-teal-400">{item.code804n}</td>
											<td className="py-2 font-medium text-[var(--ink)]">{item.name}</td>
											<td className="py-2 text-center text-[var(--ink)]">{item.quantity}</td>
											<td className="py-2 text-right font-mono">{item.unitPriceRub.toLocaleString("ru-RU")} ₽</td>
											<td className="py-2 text-right font-mono font-bold">{item.amountRub.toLocaleString("ru-RU")} ₽</td>
										</tr>
									))}
								</tbody>
							</table>

							{/* A4 Totals & Tenders */}
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
										{effectiveReceipt.payments.cardRub > 0
											? `Банковская карта (${effectiveReceipt.payments.cardRub.toLocaleString("ru-RU")} ₽)`
											: effectiveReceipt.payments.cashRub > 0
												? `Наличные (${effectiveReceipt.payments.cashRub.toLocaleString("ru-RU")} ₽)`
												: effectiveReceipt.payments.sbpRub > 0
													? `СБП QR (${effectiveReceipt.payments.sbpRub.toLocaleString("ru-RU")} ₽)`
													: "Безналичный расчет"}
									</span>
								</div>
							</div>

							{/* Fiscal Proof Signatures */}
							<div className="border-t border-[var(--line)] pt-3 grid grid-cols-3 gap-2 text-[11px] font-mono text-[var(--muted)]">
								<div>ФД: <strong className="text-[var(--ink)]">{effectiveReceipt.fiscalDocumentNumber}</strong></div>
								<div>ФПД: <strong className="text-[var(--ink)]">{effectiveReceipt.fiscalSign}</strong></div>
								<div>ФН: {effectiveReceipt.fnSerial}</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer Actions */}
				<div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper)] flex items-center justify-between flex-wrap gap-2 shrink-0">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopyText}
							className="h-8 px-3 rounded-lg border border-[var(--line)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-[var(--paper-soft)] transition-colors text-[var(--ink)]"
							data-testid="btn-copy-receipt"
						>
							{isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />}
							<span>{isCopied ? "Скопировано" : "Скопировать текст"}</span>
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="h-8 px-4 rounded-lg border border-[var(--line)] text-xs font-semibold hover:bg-[var(--paper-soft)] cursor-pointer transition-colors text-[var(--ink)]"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="h-8 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
							data-testid="btn-print-receipt"
						>
							<Printer className="w-3.5 h-3.5" />
							<span>Печать ({format === "80mm" ? "Лента" : "А4"})</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CashReceiptPrintModal;
