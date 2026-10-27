/**
 * apps/web/src/components/finance/FiscalReceiptPrintView.tsx
 *
 * Печатная форма и визуализация фискального кассового чека,
 * включая чеки возврата прихода и чеки коррекции.
 * Decomposed into ./receiptPrintModules/ per Mandate 8b (<= 80 lines).
 */

import React, { useMemo } from "react";
import { generateQrCodeSvg } from "@dental/shared";
import type { FiscalReceipt54FzResult } from "./fiscalReceiptEngine.js";
import {
	ReceiptPrintHeader,
	ReceiptPrintItems,
	ReceiptPrintPayments,
	ReceiptPrintFiscalFooter,
} from "./receiptPrintModules/index.js";

export interface FiscalReceiptPrintViewProps {
	readonly receipt: FiscalReceipt54FzResult;
	readonly className?: string | undefined;
}

export const FiscalReceiptPrintView: React.FC<FiscalReceiptPrintViewProps> = ({
	receipt,
	className = "",
}) => {
	const receiptTitle = receipt.isWarrantyZeroAct
		? "АКТ ГАРАНТИЙНОГО ОБСЛУЖИВАНИЯ (0 ₽)"
		: receipt.isCorrection
			? receipt.operationType === "income_return"
				? "КАССОВЫЙ ЧЕК КОРРЕКЦИИ / ВОЗВРАТ ПРИХОДА"
				: "КАССОВЫЙ ЧЕК КОРРЕКЦИИ / ПРИХОД"
			: receipt.operationType === "income_return"
				? "КАССОВЫЙ ЧЕК / ВОЗВРАТ ПРИХОДА"
				: "КАССОВЫЙ ЧЕК / ПРИХОД";

	const fnsQrSvg = useMemo(() => {
		if (receipt.isWarrantyZeroAct || !receipt.ofdUrl) return null;
		try {
			return generateQrCodeSvg(receipt.ofdUrl, {
				size: 130,
				margin: 1,
				foregroundColor: "#0f172a",
				backgroundColor: "#ffffff",
				title: `ФНС Чек №${receipt.receiptNumber}`,
			});
		} catch {
			return null;
		}
	}, [receipt.isWarrantyZeroAct, receipt.ofdUrl, receipt.receiptNumber]);

	return (
		<div
			className={`fiscal-receipt-print font-mono text-xs leading-normal bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] p-6 rounded-2xl border border-[var(--border,#cbd5e1)] shadow-sm max-w-md mx-auto select-text ${className}`.trim()}
			data-testid="fiscal-receipt-print-view"
			data-legacy-testid="order804n-fiscal-receipt-view"
		>
			<ReceiptPrintHeader receipt={receipt} receiptTitle={receiptTitle} />
			<ReceiptPrintItems items={receipt.items} />
			<ReceiptPrintPayments receipt={receipt} />
			<ReceiptPrintFiscalFooter receipt={receipt} fnsQrSvg={fnsQrSvg} />
		</div>
	);
};

export type Order804nFiscalReceiptPrintProps = FiscalReceiptPrintViewProps;
export const Order804nFiscalReceiptPrint = FiscalReceiptPrintView;
export default FiscalReceiptPrintView;
