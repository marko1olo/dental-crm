import { useCallback, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import type { FiscalTapeWidth } from "../fiscal/fiscal54fzEngine.js";
import type { CashRegisterModalProps } from "./types.js";
import { useCashRegisterReceiptTape } from "./useCashRegisterReceiptTape.js";
import { useCashRegisterShiftActions } from "./useCashRegisterShiftActions.js";
import { useCashRegisterSummary } from "./useCashRegisterSummary.js";

export function useCashRegisterModalLogic(props: CashRegisterModalProps) {
	const {
		isShiftOpen: externalIsShiftOpen = false,
		shiftNumber = 1,
		cashInDrawerRub = 8000,
		cardSumRub = 25000,
		sbpSumRub = 12000,
		advanceOffsetRub = 5000,
		initialTab = "reconciliation",
	} = props;

	const [activeTab, setActiveTab] = useState<
		"reconciliation" | "drawer" | "tape"
	>(initialTab);
	const [localIsShiftOpen, setLocalIsShiftOpen] =
		useState<boolean>(externalIsShiftOpen);
	const [tapeWidth, setTapeWidth] = useState<FiscalTapeWidth>("58mm");
	const [countedCashInput, setCountedCashInput] = useState<string>("");
	const [isCopied, setIsCopied] = useState<boolean>(false);

	const summaryData = useCashRegisterSummary({
		shiftNumber,
		cashInDrawerRub,
		cardSumRub,
		sbpSumRub,
		advanceOffsetRub,
	});

	const shiftActions = useCashRegisterShiftActions({
		shiftNumber,
		cashierFullName: props.cashierFullName,
		cashInDrawerKopecks: summaryData.cashInDrawerKopecks,
		netRevenueKopecks: summaryData.netRevenueKopecks,
		reportSummary: summaryData.reportSummary,
		onOpenShift: props.onOpenShift,
		onCloseShift: props.onCloseShift,
		onPrintXReport: props.onPrintXReport,
		onCloseModal: props.onClose,
		setLocalIsShiftOpen,
	});

	const countedCash =
		countedCashInput.trim() !== ""
			? Number.parseFloat(countedCashInput.replace(/\s/g, "").replace(",", "."))
			: null;
	const differenceRub =
		countedCash !== null && !Number.isNaN(countedCash)
			? Math.round((countedCash - cashInDrawerRub) * 100) / 100
			: null;

	const receiptTapeText = useCashRegisterReceiptTape({
		summary: summaryData.reportSummary,
		clinicLegalName: props.clinicLegalName,
		clinicInn: props.clinicInn,
		clinicKpp: props.clinicKpp,
		clinicAddress: props.clinicAddress,
		cashierFullName: props.cashierFullName,
		cashierInn: props.cashierInn,
		kktRegNumber: props.kktRegNumber,
		kktSerialNumber: props.kktSerialNumber,
		fnSerial: props.fnSerial,
		fiscalDocNumber: props.fiscalDocNumber,
		fiscalSign: props.fiscalSign,
		ofdName: props.ofdName,
		tapeWidth,
	});

	const handleCopyTape = useCallback(() => {
		navigator.clipboard?.writeText(receiptTapeText);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
		showToast("Текст Z-отчёта скопирован в буфер обмена", "info");
	}, [receiptTapeText]);

	const handlePrintTape = useCallback(() => {
		window.print();
		showToast("Команда печати чековой ленты отправлена", "info");
	}, []);

	return {
		activeTab,
		setActiveTab,
		isShiftActive: localIsShiftOpen,
		tapeWidth,
		setTapeWidth,
		countedCashInput,
		setCountedCashInput,
		isCopied,
		cashInDrawerRub,
		cardSumRub,
		sbpSumRub,
		advanceOffsetRub,
		differenceRub,
		receiptTapeText,
		handleCopyTape,
		handlePrintTape,
		...summaryData,
		...shiftActions,
	};
}
