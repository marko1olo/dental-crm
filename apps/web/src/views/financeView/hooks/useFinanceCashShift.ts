import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dashboard, Payment } from "@dental/shared";
import { generateUuidV7, rublesToKopecks, kopecksToRubles } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
	safeLocalStorageRemoveItem,
} from "../../../lib/safeLocalStorage";
import { localDayKey, summarizeCashDay } from "../../../components/finance/cashDaySummary";

interface ServerCashBoxItem {
	readonly id: string;
	readonly type: string;
	readonly balanceRub?: number | string | null | undefined;
	readonly balanceKopecks?: number | string | bigint | null | undefined;
}

export interface UseFinanceCashShiftParams {
	readonly activePayments: Payment[];
	readonly dashboard?: Dashboard | undefined;
	readonly paymentFiscalCashierName?: string | undefined;
	readonly onCashIn?: ((amountRub: number, basis: string, typeAlias?: string) => void | Promise<void>) | undefined;
	readonly onCashOut?: ((amountRub: number, basis: string, recipientFio?: string, typeAlias?: string) => void | Promise<void>) | undefined;
	readonly onCloseShift?: (() => void | Promise<void>) | undefined;
	readonly onOpenShift?: (() => void | Promise<void>) | undefined;
	readonly loadDashboard?: (() => Promise<unknown> | void) | undefined;
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
		const savedKop = safeLocalStorageGetItem("dente_cash_shift_delta_kop");
		if (savedKop) {
			const parsed = Number.parseInt(savedKop, 10);
			if (Number.isFinite(parsed)) return kopecksToRubles(parsed);
		}
		const saved = safeLocalStorageGetItem("dente_cash_shift_delta");
		return saved ? kopecksToRubles(rublesToKopecks(Number(saved) || 0)) : 0;
	});
	const [serverCashBoxBalanceRub, setServerCashBoxBalanceRub] = useState<number | null>(null);
	const [isLocalBalanceFallback, setIsLocalBalanceFallback] = useState<boolean>(false);

	const fetchServerCashBoxBalance = useCallback(async () => {
		try {
			const res = await fetch("/api/cash/cash-box", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const json = await res.json();
				const rawList = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
				const boxes = rawList as readonly ServerCashBoxItem[];
				const deskBox = boxes.find((b) => b.type === "main" || b.type === "cash_desk");
				if (deskBox && deskBox.balanceRub !== undefined && deskBox.balanceRub !== null) {
					const parsed = Number(deskBox.balanceRub);
					if (Number.isFinite(parsed)) {
						setServerCashBoxBalanceRub(parsed);
						setIsLocalBalanceFallback(false);
					}
				}
			} else {
				console.warn("[useFinanceCashShift] Server cashbox returned non-ok status:", res.status);
				setIsLocalBalanceFallback(true);
			}
		} catch (err) {
			console.warn("[useFinanceCashShift] Failed to fetch server cashbox balance, falling back to local calculation:", err);
			setIsLocalBalanceFallback(true);
		}
	}, []);

	useEffect(() => {
		void fetchServerCashBoxBalance();
		const handleRefresh = () => {
			void fetchServerCashBoxBalance();
		};
		window.addEventListener("dente-cashbox-refresh", handleRefresh);
		return () => {
			window.removeEventListener("dente-cashbox-refresh", handleRefresh);
		};
	}, [fetchServerCashBoxBalance]);

	const todayKey = useMemo(() => localDayKey(new Date()) ?? "", []);
	const cashDayTotals = useMemo(() => {
		const sourcePayments =
			dashboard?.payments && dashboard.payments.length > 0
				? dashboard.payments
				: activePayments ?? [];
		return summarizeCashDay(sourcePayments, todayKey);
	}, [dashboard?.payments, activePayments, todayKey]);

	const cashInDrawerRub = useMemo(() => {
		if (serverCashBoxBalanceRub !== null && Number.isFinite(serverCashBoxBalanceRub)) {
			return Math.max(0, serverCashBoxBalanceRub);
		}
		return Math.max(
			0,
			kopecksToRubles(rublesToKopecks(cashDayTotals?.cashRub ?? 0) + rublesToKopecks(manualCashDeltaRub)),
		);
	}, [serverCashBoxBalanceRub, cashDayTotals?.cashRub, manualCashDeltaRub]);
	const cardSumRub = cashDayTotals?.cardRub ?? 0;
	const sbpSumRub = cashDayTotals?.sbpRub ?? 0;
	const advanceOffsetRub = cashDayTotals?.advanceRub ?? 0;

	const handleOpenShift = useCallback(async () => {
		if (propsOnOpenShift) {
			await propsOnOpenShift();
		} else {
			await fetch("/api/cashbox/shift/open", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					cashierFullName: paymentFiscalCashierName || undefined,
					openedAt: new Date().toISOString(),
				}),
			});
		}
		setIsShiftOpen(true);
		safeLocalStorageSetItem("dente_cash_shift_open", "true");
		const nextShift = shiftNumber + 1;
		setShiftNumber(nextShift);
		safeLocalStorageSetItem("dente_cash_shift_number", String(nextShift));
		void loadDashboard?.();
		void fetchServerCashBoxBalance();
	}, [propsOnOpenShift, paymentFiscalCashierName, shiftNumber, loadDashboard, fetchServerCashBoxBalance]);

	const handleCloseShift = useCallback(async () => {
		if (propsOnCloseShift) {
			await propsOnCloseShift();
		} else {
			const zNumber = `Z-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${shiftNumber}`;
			await fetch("/api/cashbox/shift/close", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					cashierFullName: paymentFiscalCashierName || undefined,
					zReportNumber: zNumber,
					shiftNumber,
					closedAt: new Date().toISOString(),
				}),
			});
		}
		setIsShiftOpen(false);
		safeLocalStorageSetItem("dente_cash_shift_open", "false");
		setManualCashDeltaRub(0);
		setServerCashBoxBalanceRub(0);
		safeLocalStorageRemoveItem("dente_cash_shift_delta");
		safeLocalStorageRemoveItem("dente_cash_shift_delta_kop");
		void loadDashboard?.();
		void fetchServerCashBoxBalance();
	}, [propsOnCloseShift, paymentFiscalCashierName, shiftNumber, loadDashboard, fetchServerCashBoxBalance]);

	const handleCashIn = useCallback(
		async (amountRub: number, basis: string, typeAlias?: string) => {
			if (propsOnCashIn) {
				await propsOnCashIn(amountRub, basis, typeAlias);
			} else {
				await fetch("/api/cash/cash-introduction", {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({
						amountRub,
						reasonText: basis || "Служебное внесение разменного фонда",
						typeAlias,
						cashierFullName: paymentFiscalCashierName || undefined,
					}),
				});
			}
			setManualCashDeltaRub((prev) => {
				const nextKop = rublesToKopecks(prev) + rublesToKopecks(amountRub);
				const next = kopecksToRubles(nextKop);
				safeLocalStorageSetItem("dente_cash_shift_delta_kop", String(nextKop));
				return next;
			});
			void loadDashboard?.();
			void fetchServerCashBoxBalance();
		},
		[propsOnCashIn, paymentFiscalCashierName, loadDashboard, fetchServerCashBoxBalance],
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
				await fetch("/api/cash/cash-withdrawal", {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({
						amountRub,
						reasonText:
							basis ||
							(recipientFio
								? `Инкассация: ${recipientFio}`
								: "Служебное изъятие наличных средств"),
						recipientFio,
						typeAlias,
						cashierFullName: paymentFiscalCashierName || undefined,
					}),
				});
			}
			setManualCashDeltaRub((prev) => {
				const nextKop = rublesToKopecks(prev) - rublesToKopecks(amountRub);
				const next = kopecksToRubles(nextKop);
				safeLocalStorageSetItem("dente_cash_shift_delta_kop", String(nextKop));
				return next;
			});
			void loadDashboard?.();
			void fetchServerCashBoxBalance();
		},
		[propsOnCashOut, paymentFiscalCashierName, loadDashboard, fetchServerCashBoxBalance],
	);

	const handlePrintXReport = useCallback(async () => {
		await fetch("/api/fiscal/x-report", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify({
				cashierFullName: paymentFiscalCashierName || undefined,
				shiftNumber,
			}),
		});
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
		isLocalBalanceFallback,
		isServerBalanceOffline: isLocalBalanceFallback,
		isShiftOpen,
		sbpSumRub,
		shiftNumber,
	};
}
