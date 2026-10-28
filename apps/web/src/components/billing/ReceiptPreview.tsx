/**
 * ReceiptPreview.tsx — Thermal Receipt & Printable Sales Slip (80mm Tape & A4).
 * Decomposed into ./receiptPreview/ in strict compliance with Mandate 8b (<= 120 lines facade).
 *
 * Governed by:
 * - Cash & Fiscal standards: mandatory requisites, VAT exemption, FNS verification QR code.
 * - Mandate 8d pt 4: WCAG AAA contrast, deep black on white tape in both Light and Dark themes.
 * - Mandate 8e: Doctor & Cashier autonomy (instant 1-click printing, zero blocker dialogs).
 */

import React, { useMemo, useState } from "react";
import { showToast } from "../GlobalToast.js";
import {
	type ReceiptItem,
	type ReceiptPaymentDetails,
	type ReceiptPreviewProps,
	ReceiptActionsBar,
	ReceiptTapeHeader,
	ReceiptTapeItems,
	ReceiptTapeTotals,
	ReceiptTapeFiscalFooter,
	ReceiptA4Format,
} from "./receiptPreview/index.js";
import "./paymentModalStudio.css";

export type { ReceiptItem, ReceiptPaymentDetails, ReceiptPreviewProps };

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
	receiptNumber = "0104",
	shiftNumber = 14,
	receiptDateRu,
	clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7707083893",
	clinicKpp = "770701001",
	clinicAddress = "г. Москва, ул. Профсоюзная, д. 42",
	taxationSystemName = "УСН Доходы",
	cashierFullName = "Врач-стоматолог / Кассир",
	patientName = "Пациент",
	patientPhone = "",
	items = [],
	toothNumber,
	totalDueRub,
	payments = {},
	isWarranty100 = false,
	isPaid,
	fnSerial = "9960440300123456",
	fiscalDocumentNumber: propFiscalDocumentNumber,
	fiscalSign: propFiscalSign,
	kktRegNumber = "0001234567012345",
	ofdName = "Платформа ОФД",
	ofdUrl = "https://check.ofd.ru",
	fnsUrl = "nalog.gov.ru",
	defaultFormat = "80mm",
	className = "",
	showActionsBar = true,
}) => {
	const isPrecheck = isPaid === false && !propFiscalDocumentNumber;
	const fiscalDocumentNumber = propFiscalDocumentNumber || (isPrecheck ? undefined : `ФД-${shiftNumber}-${receiptNumber}`);
	const fiscalSign = propFiscalSign || (isPrecheck ? undefined : String(Math.abs(Array.from(`${fnSerial}:${fiscalDocumentNumber || "1"}:${totalDueRub}`).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0) % 9000000000 + 1000000000)));
	const [format, setFormat] = useState<"80mm" | "a4">(defaultFormat);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	const effectiveDate = useMemo(() => {
		if (receiptDateRu) return receiptDateRu;
		const now = new Date();
		return `${now.toLocaleDateString("ru-RU")} ${now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
	}, [receiptDateRu]);

	const effectiveItems: readonly ReceiptItem[] = useMemo(() => {
		if (items && items.length > 0) return items.map((it) => ({ ...it, toothNumber: it.toothNumber ?? toothNumber }));
		if (isWarranty100 || totalDueRub === 0) {
			return [{ id: "w100-default", name: "Гарантийное обслуживание (скидка 100%)", code804n: "A16.07.002", toothNumber, quantity: 1, priceRub: 0, amountRub: 0, vatRate: "vat_none" }];
		}
		return [{ id: "def-1", name: "Стоматологический приём и лечение", code804n: "A16.07.002", toothNumber, quantity: 1, priceRub: totalDueRub, amountRub: totalDueRub, vatRate: "vat_none" }];
	}, [items, toothNumber, isWarranty100, totalDueRub]);

	const handleCopy = () => {
		const txt = `Чек № ${receiptNumber} от ${effectiveDate}\nКлиника: ${clinicLegalName} (ИНН ${clinicInn})\nИтог: ${totalDueRub} ₽\nФД: ${fiscalDocumentNumber || "пречек"}\nФП: ${fiscalSign || ""}`;
		navigator.clipboard?.writeText?.(txt);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2500);
		showToast("Реквизиты чека скопированы в буфер", "info");
	};

	return (
		<div className={`receipt-preview-root space-y-3 ${className}`} data-testid="receipt-54fz-preview-container">
			{showActionsBar && (
				<ReceiptActionsBar format={format} setFormat={setFormat} onPrint={() => window.print()} isCopied={isCopied} onCopy={handleCopy} />
			)}

			{format === "80mm" ? (
				<div className="receipt-tape-paper mx-auto w-full max-w-[340px] p-4 bg-white text-slate-900 rounded-xl border border-slate-300 shadow-md">
					<ReceiptTapeHeader clinicLegalName={clinicLegalName} clinicInn={clinicInn} clinicKpp={clinicKpp} clinicAddress={clinicAddress} taxationSystemName={taxationSystemName} receiptNumber={receiptNumber} shiftNumber={shiftNumber} effectiveDate={effectiveDate} cashierFullName={cashierFullName} patientName={patientName} patientPhone={patientPhone} isPrecheck={isPrecheck} />
					<ReceiptTapeItems items={effectiveItems} />
					<ReceiptTapeTotals totalDueRub={totalDueRub} payments={payments} isWarranty100={isWarranty100} />
					<ReceiptTapeFiscalFooter fnSerial={fnSerial} fiscalDocumentNumber={fiscalDocumentNumber} fiscalSign={fiscalSign} kktRegNumber={kktRegNumber} ofdName={ofdName} ofdUrl={ofdUrl} fnsUrl={fnsUrl} totalDueRub={totalDueRub} isPrecheck={isPrecheck} />
				</div>
			) : (
				<ReceiptA4Format clinicLegalName={clinicLegalName} clinicInn={clinicInn} clinicAddress={clinicAddress} receiptNumber={receiptNumber} effectiveDate={effectiveDate} patientName={patientName} cashierFullName={cashierFullName} items={effectiveItems} totalDueRub={totalDueRub} />
			)}
		</div>
	);
};

export default ReceiptPreview;
