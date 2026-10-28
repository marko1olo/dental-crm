import { useCallback, useMemo, useState } from "react";
import type { Dashboard, Payment } from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
	safeLocalStorageRemoveItem,
} from "../../../lib/safeLocalStorage";
import { localDayKey, summarizeCashDay } from "../../../components/finance/cashDaySummary";
import { callCashShiftApi } from "../../../components/finance/cashShiftApi";

export interface UseFinanceCashShiftParams {
	readonly activePayments: Payment[];
	readonly dashboard?: Dashboard | undefined;
	readonly paymentFiscalCashierName?: string | undefined;
	readonly onCashIn?: ((amountRub: number, basis: string, typeAlias?: string) => void | Promise<void>) | undefined;
	readonly onCashOut?: ((amountRub: number, basis: string, recipientFio?: string, typeAlias?: string) => void | Promise<void>) | undefined;
	readonly onCloseShift?: (() => void | Promise<void>) | undefined;
	readonly onOpenShift?: (() => void | Promise<void>) | undefined;
	readonly loadDashboard?: (() => Promise<any> | void) | undefined;
}

/**
 * useFinanceCashShift — Управление кассовой сменой, разменным фондом и сводкой кассы дня.
 */
export function useFinanceCashShift(params: UseFinanceCashShiftParams) {
	const {
		activePayments,
		dashboard,
		paymentFiscalCashierName,
		onCashIn: propsOnCashIn,
		onCashOut: propsOnCashOut,
		onCloseShift: propsOnCloseShift,
		onOpenShift: propsOnOpenShift,
		loadDashboard,
	} = params;

	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(() => {
		const saved = safeLocalStorageGetItem("dente_cash_shift_open");
		return saved !== null ? saved === "true" : true;
	});
	const [shiftNumber, setShiftNumber] = useState<number>(() => {
		const saved = safeLocalStorageGetItem("dente_cash_shift_number");
		const parsed = saved ? Number.parseInt(saved, 10) : 1;
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
	});
	const [manualCashDeltaRub, setManualCashDeltaRub] = useState<number>(() => {
		const saved = safeLocalStorageGetItem("dente_cash_shift_delta");
		return saved ? Number.parseFloat(saved) || 0 : 0;
	});

	const todayKey = useMemo(() => localDayKey(new Date()) ?? "", []);
	const cashDayTotals = useMemo(() => {
		const sourcePayments =
			dashboard?.payments && dashboard.payments.length > 0
				? dashboard.payments
				: activePayments ?? [];
		return summarizeCashDay(sourcePayments, todayKey);
	}, [dashboard?.payments, activePayments, todayKey]);

	const cashInDrawerRub = Math.max(
		0,
		(Math.round((cashDayTotals?.cashRub ?? 0) * 100) + Math.round(manualCashDeltaRub * 100)) / 100,
	);
	const cardSumRub = cashDayTotals?.cardRub ?? 0;
	const sbpSumRub = cashDayTotals?.sbpRub ?? 0;
	const advanceOffsetRub = cashDayTotals?.advanceRub ?? 0;

	const handleOpenShift = useCallback(async () => {
		if (propsOnOpenShift) {
			await propsOnOpenShift();
		} else {
			await callCashShiftApi(
				"/api/cash/cash-box-all-open",
				"/api/fiscal/shift/open",
				{
					cashierFullName: paymentFiscalCashierName || undefined,
					openedAt: new Date().toISOString(),
				},
			);
		}
		setIsShiftOpen(true);
		safeLocalStorageSetItem("dente_cash_shift_open", "true");
		const nextShift = shiftNumber + 1;
		setShiftNumber(nextShift);
		safeLocalStorageSetItem("dente_cash_shift_number", String(nextShift));
		void loadDashboard?.();
	}, [propsOnOpenShift, paymentFiscalCashierName, shiftNumber, loadDashboard]);

	const handleCloseShift = useCallback(async () => {
		if (propsOnCloseShift) {
			await propsOnCloseShift();
		} else {
			const zNumber = `Z-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${shiftNumber}`;
			await callCashShiftApi(
				"/api/cash/cash-box-all-closing",
				"/api/fiscal/shift/close",
				{
					cashierFullName: paymentFiscalCashierName || undefined,
					zReportNumber: zNumber,
					shiftNumber,
					closedAt: new Date().toISOString(),
				},
			);
		}
		setIsShiftOpen(false);
		safeLocalStorageSetItem("dente_cash_shift_open", "false");
		setManualCashDeltaRub(0);
		safeLocalStorageRemoveItem("dente_cash_shift_delta");
		void loadDashboard?.();
	}, [propsOnCloseShift, paymentFiscalCashierName, shiftNumber, loadDashboard]);

	const handleCashIn = useCallback(
		async (amountRub: number, basis: string, typeAlias?: string) => {
			if (propsOnCashIn) {
				await propsOnCashIn(amountRub, basis, typeAlias);
			} else {
				await callCashShiftApi(
					"/api/cash/cash-introduction",
					"/api/fiscal/cash-in",
					{
						amountRub,
						reasonText: basis || "Служебное внесение разменного фонда",
						typeAlias,
						cashierFullName: paymentFiscalCashierName || undefined,
					},
				);
			}
			setManualCashDeltaRub((prev) => {
				const nextKop = Math.round(prev * 100) + Math.round(amountRub * 100);
				const next = nextKop / 100;
				safeLocalStorageSetItem("dente_cash_shift_delta", String(next));
				return next;
			});
			void loadDashboard?.();
		},
		[propsOnCashIn, paymentFiscalCashierName, loadDashboard],
	);

	const handleCashOut = useCallback(
		async (
			amountRub: number,
			basis: string,
			recipientFio?: string,
			typeAlias?: string,
		) => {
			if (propsOnCashOut) {
				await propsOnCashOut(amountRub, basis, recipientFio, typeAlias);
			} else {
				await callCashShiftApi(
					"/api/cash/cash-withdrawal",
					"/api/fiscal/cash-out",
					{
						amountRub,
						reasonText:
							basis ||
							(recipientFio
								? `Инкассация: ${recipientFio}`
								: "Служебное изъятие наличных средств"),
						recipientFio,
						typeAlias,
						cashierFullName: paymentFiscalCashierName || undefined,
					},
				);
			}
			setManualCashDeltaRub((prev) => {
				const nextKop = Math.round(prev * 100) - Math.round(amountRub * 100);
				const next = nextKop / 100;
				safeLocalStorageSetItem("dente_cash_shift_delta", String(next));
				return next;
			});
			void loadDashboard?.();
		},
		[propsOnCashOut, paymentFiscalCashierName, loadDashboard],
	);

	const handlePrintXReport = useCallback(async () => {
		await callCashShiftApi(
			"/api/fiscal/x-report",
			"/api/cash/x-report",
			{
				cashierFullName: paymentFiscalCashierName || undefined,
				shiftNumber,
			},
		);
	}, [paymentFiscalCashierName, shiftNumber]);

	return {
		advanceOffsetRub,
		cardSumRub,
		cashDayTotals,
		cashInDrawerRub,
		handleCashIn,
		handleCashOut,
		handleCloseShift,
		handleOpenShift,
		handlePrintXReport,
		isShiftOpen,
		sbpSumRub,
		shiftNumber,
	};
}
