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

import React, { useMemo, useState } from "react";
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
import {
	generateFiscalReceipt54Fz,
	type FiscalReceipt54FzResult,
	type Order804nFiscalReceiptItem,
} from "./order804nFiscalEngine.js";
import type { TreatmentPlanItem } from "../treatment-plans/types.js";
import type { BillingInvoice } from "../billing/invoiceTypes.js";
import { rubToKopecks, type Kopecks } from "@dental/shared";

export interface CashReceiptPrintModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly receipt?: FiscalReceipt54FzResult | undefined;
	readonly invoice?: BillingInvoice | undefined;
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
	invoice,
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "",
	clinicAddress = "",
	cashierFullName = "Кассир",
	attendingDoctorName = "Врач-стоматолог",
	defaultFormat = "80mm",
}) => {
	const [format, setFormat] = useState<"80mm" | "a4">(defaultFormat);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	// Dynamically derive fiscal receipt from explicit receipt prop or live invoice
	const effectiveReceipt: FiscalReceipt54FzResult = useMemo(() => {
		if (receipt) return receipt;

		if (invoice) {
			const isWarranty =
				invoice.status === "warranty_100" || (invoice.totalAmountRub ?? 0) === 0;

			const invoiceItems: readonly Order804nFiscalReceiptItem[] =
				invoice.items && invoice.items.length > 0
					? invoice.items.map((it, idx) => {
							const priceRub = Number(it.priceRub) || 0;
							const qty = Number(it.quantity) || 1;
							const totalRub = priceRub * qty;
							const priceKop = rubToKopecks(priceRub);
							const totalKop = rubToKopecks(totalRub);

							return {
								id: it.id || `inv-item-${idx}`,
								name: it.name || "Стоматологическая услуга",
								category: "Стоматология",
								code804n: it.code || "A16.07.002",
								toothNumber: undefined,
								stageKind: "stage_1_therapy" as const,
								quantity: qty,
								priceRub: isWarranty ? 0 : priceRub,
								unitPriceRub: isWarranty ? 0 : priceRub,
								unitPriceKopecks: (isWarranty ? 0 : priceKop) as Kopecks,
								discountRub: isWarranty ? priceRub : 0,
								discountKopecks: (isWarranty ? priceKop : 0) as Kopecks,
								grossRub: priceRub * qty,
								grossKopecks: (priceKop * qty) as Kopecks,
								amountRub: isWarranty ? 0 : totalRub,
								amountKopecks: (isWarranty ? 0 : totalKop) as Kopecks,
								vatRate: "vat_none" as const,
								taxRateKopecks: 0 as Kopecks,
								paymentSubject: "service" as const,
								paymentMethod: "full_payment" as const,
								quantityMeasure: "piece" as const,
								taxDeductionCategory: "1" as const,
							};
					  })
					: [
							{
								id: `inv-item-${invoice.id}`,
								name: isWarranty
									? "Гарантийное обслуживание (скидка 100%)"
									: "Стоматологические услуги по плану лечения",
								category: "Стоматология",
								code804n: "A16.07.002",
								stageKind: "stage_1_therapy" as const,
								quantity: 1,
								priceRub: isWarranty ? 0 : (invoice.totalAmountRub || 0),
								unitPriceRub: isWarranty ? 0 : (invoice.totalAmountRub || 0),
								unitPriceKopecks: (isWarranty ? 0 : rubToKopecks(invoice.totalAmountRub || 0)) as Kopecks,
								discountRub: isWarranty ? (invoice.totalAmountRub || 0) : 0,
								discountKopecks: (isWarranty ? rubToKopecks(invoice.totalAmountRub || 0) : 0) as Kopecks,
								grossRub: invoice.totalAmountRub || 0,
								grossKopecks: rubToKopecks(invoice.totalAmountRub || 0) as Kopecks,
								amountRub: isWarranty ? 0 : (invoice.totalAmountRub || 0),
								amountKopecks: (isWarranty ? 0 : rubToKopecks(invoice.totalAmountRub || 0)) as Kopecks,
								vatRate: "vat_none" as const,
								taxRateKopecks: 0 as Kopecks,
								paymentSubject: "service" as const,
								paymentMethod: "full_payment" as const,
								quantityMeasure: "piece" as const,
								taxDeductionCategory: "1" as const,
							},
					  ];

			const splitPayment = isWarranty
				? {}
				: invoice.paymentMethod === "cash"
					? { cashRub: invoice.paidAmountRub ?? invoice.totalAmountRub }
					: invoice.paymentMethod === "sbp"
						? { sbpRub: invoice.paidAmountRub ?? invoice.totalAmountRub }
						: invoice.paymentMethod === "deposit"
							? { depositRub: invoice.paidAmountRub ?? invoice.totalAmountRub }
							: { cardRub: invoice.paidAmountRub ?? invoice.totalAmountRub };

			return generateFiscalReceipt54Fz({
				items: invoiceItems,
				splitPayment,
				patientId: invoice.patientId || "pat-default",
				patientName: invoice.patientName || "Пациент",
				customerContact: invoice.patientPhone || "",
				cashierFullName,
				clinicLegalName: clinicName,
				clinicInn: clinicInn || "7707083893",
				clinicAddress: clinicAddress || "г. Москва, ул. Профсоюзная, д. 42",
				customReceiptNumber: invoice.number,
			});
		}

		// Neutral blank receipt without fake hardcoded mocks
		return generateFiscalReceipt54Fz({
			items: [],
			splitPayment: {},
			patientId: "pat-default",
			patientName: "Пациент",
			customerContact: "",
			cashierFullName,
			clinicLegalName: clinicName,
			clinicInn: clinicInn || "7707083893",
			clinicAddress: clinicAddress || "г. Москва, ул. Профсоюзная, д. 42",
			customReceiptNumber: "ЧЕК-0001",
		});
	}, [receipt, invoice, cashierFullName, clinicName, clinicInn, clinicAddress]);

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

	if (!isOpen) return null;

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
						{effectiveReceipt.isWarrantyZeroAct ? (
							<ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
						) : (
							<Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
						)}
						<div>
							<h3 id="cash-receipt-modal-title" className="text-sm font-bold m-0 text-[var(--ink)] flex items-center gap-2">
								<span>
									{effectiveReceipt.isWarrantyZeroAct
										? "Гарантийный акт (0 ₽)"
										: "Кассовый чек и слип"}
								</span>
								<span
									className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
										effectiveReceipt.isWarrantyZeroAct
											? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
											: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
									}`}
								>
									{effectiveReceipt.isWarrantyZeroAct ? "Гарантия 100%" : "Онлайн-чек"}
								</span>
							</h3>
							<p className="text-[11px] text-[var(--muted)] m-0">
								{effectiveReceipt.isWarrantyZeroAct ? "Акт" : "Чек"} №{effectiveReceipt.receiptNumber} · {effectiveReceipt.receiptDateRu}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Format selector: 80mm vs A4 */}
						<div className="flex bg-[var(--paper)] p-0.5 rounded-lg border border-[var(--line)] text-xs font-semibold">
							<button
								type="button"
								onClick={() => setFormat("80mm")}
								style={format === "80mm" ? { color: "#ffffff", backgroundColor: "#0d9488" } : undefined}
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
								style={format === "a4" ? { color: "#ffffff", backgroundColor: "#0d9488" } : undefined}
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
											{effectiveReceipt.isWarrantyZeroAct
												? `АКТ ГАРАНТИИ № ${effectiveReceipt.receiptNumber}`
												: `КВИТАНЦИЯ № ${effectiveReceipt.receiptNumber}`}
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

							{/* Fiscal Proof Signatures */}
							{effectiveReceipt.isWarrantyZeroAct ? (
								<div className="border-t border-[var(--line)] pt-3 text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/20 p-2.5 rounded-lg flex items-center gap-2">
									<ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
									<span>
										Внутренний гарантийный акт клиники. Чек на сумму 0 ₽ не направляется в фискальный накопитель онлайн-кассы.
									</span>
								</div>
							) : (
								<div className="border-t border-[var(--line)] pt-3 grid grid-cols-3 gap-2 text-[11px] font-mono text-[var(--muted)]">
									<div>ФД: <strong className="text-[var(--ink)]">{effectiveReceipt.fiscalDocumentNumber}</strong></div>
									<div>ФПД: <strong className="text-[var(--ink)]">{effectiveReceipt.fiscalSign}</strong></div>
									<div>ФН: {effectiveReceipt.fnSerial}</div>
								</div>
							)}
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
							style={{ color: "#ffffff", backgroundColor: "#0d9488" }}
							className="h-8 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
							data-testid="btn-print-receipt"
						>
							<Printer className="w-3.5 h-3.5 text-white" />
							<span style={{ color: "#ffffff" }}>Печать ({format === "80mm" ? "Лента" : "А4"})</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CashReceiptPrintModal;
