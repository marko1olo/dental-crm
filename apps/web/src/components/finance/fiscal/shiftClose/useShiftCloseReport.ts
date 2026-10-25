/**
 * useShiftCloseReport.ts — Fiscal Calculations & Action Handlers for Shift Close & Z-Report.
 * Mandate 8b & Mandate 8e: Doctor & Cashier Autonomy, integer kopeck-exact arithmetic.
 */

import { useMemo, useState } from "react";
import { showToast } from "../../../GlobalToast";
import {
	type FiscalTapeWidth,
	generate54FzZReportReceiptTapeText,
} from "../fiscal54fzEngine";
import type { ShiftCloseZReportModalProps } from "./types";
import {
	calculateReceiptsSbpRub,
	compileShiftCloseReportSummary,
} from "./shiftCloseReportCompiler";

export function useShiftCloseReport(props: ShiftCloseZReportModalProps) {
	const {
		shiftNumber = 42,
		cashierFullName = "Сидорова Анна Павловна",
		cashierInn = "",
		clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicInn = "",
		clinicKpp = "",
		clinicAddress = "г. Москва, ул. Клиническая, д. 10",
		kktRegNumber = "0004829104058291",
		kktSerialNumber = "019482019482",
		fnSerial = "9960440302145896",
		fiscalDocNumber = "00042",
		fiscalSign = "3920194821",
		ofdName = "АО «ПЕРВЫЙ ОФД»",
		receipts,
		summary: initialSummary,
		onConfirmCloseShift,
		onClose,
	} = props;

	const [tapeWidth, setTapeWidth] = useState<FiscalTapeWidth>("58mm");
	const [countedCashInput, setCountedCashInput] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isCopied, setIsCopied] = useState(false);

	const reportSummary = useMemo(
		() => compileShiftCloseReportSummary(receipts, initialSummary, shiftNumber),
		[receipts, initialSummary, shiftNumber],
	);

	const calculatedSbpRub = useMemo(() => calculateReceiptsSbpRub(receipts), [receipts]);
	const cardSumRub = Math.max(0, reportSummary.incomeElectronicRub - calculatedSbpRub);

	const countedCash = countedCashInput.trim() !== "" ? parseFloat(countedCashInput.replace(/\s/g, "").replace(",", ".")) : null;
	const differenceRub = countedCash !== null && !Number.isNaN(countedCash)
		? Math.round((countedCash - reportSummary.cashInDrawerRub) * 100) / 100
		: null;

	const receiptTapeText = useMemo(() => {
		return generate54FzZReportReceiptTapeText({
			summary: reportSummary, clinicLegalName, clinicInn, clinicKpp, clinicAddress,
			cashierFullName, cashierInn, kktRegNumber, kktSerialNumber, fnSerial,
			fiscalDocNumber, fiscalSign, ofdName, tapeWidth,
		});
	}, [
		reportSummary, clinicLegalName, clinicInn, clinicKpp, clinicAddress,
		cashierFullName, cashierInn, kktRegNumber, kktSerialNumber, fnSerial,
		fiscalDocNumber, fiscalSign, ofdName, tapeWidth,
	]);

	const handleCopyTapeText = async () => {
		await navigator.clipboard.writeText(receiptTapeText);
		setIsCopied(true);
		showToast("Текст Z-отчета скопирован в буфер обмена", "success");
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handlePrintZReport = () => {
		window.print();
		showToast("Отправлено на печать чековой ленты", "info");
	};

	const handleConfirmClose = async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		try {
			if (onConfirmCloseShift) await onConfirmCloseShift(reportSummary);
			showToast(`Смена №${reportSummary.shiftNumber} успешно закрыта! Z-отчет отправлен в ОФД`, "success", 4000);
			onClose();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Ошибка закрытия смены";
			showToast(`Не удалось закрыть смену: ${msg}`, "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		reportSummary, calculatedSbpRub, cardSumRub, tapeWidth, setTapeWidth,
		countedCashInput, setCountedCashInput, differenceRub, receiptTapeText,
		isSubmitting, isCopied, handleCopyTapeText, handlePrintZReport, handleConfirmClose,
	};
}
