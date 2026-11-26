import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dashboard, Payment } from "@dental/shared";
import { generateUuidV7, rublesToKopecks, kopecksToRubles } from "@dental/shared";
import { denteClinicalMutationHeaders, denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../../components/GlobalToast";
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

async function extractShiftMutationErrorMessage(res: Response, fallbackMsg: string): Promise<string> {
	const raw = (await res.json().catch(() => null)) as {
		data?: { message?: string; error?: string } | null;
		message?: string;
		error?: string;
	} | null;
	const payload = raw?.data ?? raw;
	return payload?.message || payload?.error || raw?.message || raw?.error || `${fallbackMsg} (HTTP ${res.status})`;
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
		return saved === "true";
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
	const [serverShiftSnapshot, setServerShiftSnapshot] = useState<{
		hasOpenShift: boolean;
		startingBalanceRub: number;
		expectedCashInDrawerRub: number;
		incomeCashRub: number;
		incomeElectronicRub: number;
		incomeSbpRub: number;
		advanceOffsetRub: number;
		returnTotalRub: number;
		insuranceTotalRub: number;
		netRevenueRub: number;
	} | null>(null);
	const [isLocalBalanceFallback, setIsLocalBalanceFallback] = useState<boolean>(false);

	const fetchServerCashBoxBalance = useCallback(async () => {
		try {
			const [boxRes, shiftRes] = await Promise.allSettled([
				fetch("/api/cash/cash-box", { headers: denteClinicalReadHeaders() }),
				fetch("/api/cashbox/shift", { headers: denteClinicalReadHeaders() }),
			]);

			if (boxRes.status === "fulfilled" && boxRes.value.ok) {
				const json = await boxRes.value.json();
				const payload = json && typeof json === "object" && "data" in json ? json.data : json;
				const rawList = Array.isArray(payload) ? payload : [];
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
				clientLogger.warn("[useFinanceCashShift] Server cashbox returned non-ok status", {
					status: boxRes.status === "fulfilled" ? boxRes.value.status : "network_error",
				}, { module: "Finance" });
				setIsLocalBalanceFallback(true);
			}

			if (shiftRes.status === "fulfilled" && shiftRes.value.ok) {
				const rawShiftJson = await shiftRes.value.json();
				const shiftPayload =
					rawShiftJson && typeof rawShiftJson === "object" && "data" in rawShiftJson
						? ((rawShiftJson as { data?: unknown }).data ?? rawShiftJson)
						: rawShiftJson;
				const shiftRec =
					shiftPayload && typeof shiftPayload === "object"
						? (shiftPayload as Record<string, unknown>)
						: null;
				if (shiftRec) {
					const openOnServer = shiftRec.hasOpenShift === true;
					setIsShiftOpen(openOnServer);
					safeLocalStorageSetItem("dente_cash_shift_open", openOnServer ? "true" : "false");
					if (openOnServer) {
						if (typeof shiftRec.shiftNumber === "number" && shiftRec.shiftNumber > 0) {
							setShiftNumber(shiftRec.shiftNumber);
							safeLocalStorageSetItem("dente_cash_shift_number", String(shiftRec.shiftNumber));
						}
						setServerShiftSnapshot({
							hasOpenShift: true,
							startingBalanceRub: typeof shiftRec.startingBalanceRub === "number" ? shiftRec.startingBalanceRub : 0,
							expectedCashInDrawerRub: typeof shiftRec.expectedCashInDrawerRub === "number" ? shiftRec.expectedCashInDrawerRub : 0,
							incomeCashRub: typeof shiftRec.incomeCashRub === "number" ? shiftRec.incomeCashRub : 0,
							incomeElectronicRub: typeof shiftRec.incomeElectronicRub === "number" ? shiftRec.incomeElectronicRub : 0,
							incomeSbpRub: typeof shiftRec.incomeSbpRub === "number" ? shiftRec.incomeSbpRub : 0,
							advanceOffsetRub: typeof shiftRec.advanceOffsetRub === "number" ? shiftRec.advanceOffsetRub : 0,
							returnTotalRub: typeof shiftRec.returnTotalRub === "number" ? shiftRec.returnTotalRub : 0,
							insuranceTotalRub: typeof shiftRec.insuranceTotalRub === "number" ? shiftRec.insuranceTotalRub : 0,
							netRevenueRub: typeof shiftRec.netRevenueRub === "number" ? shiftRec.netRevenueRub : 0,
						});
					} else {
						setServerShiftSnapshot({
							hasOpenShift: false,
							startingBalanceRub: 0,
							expectedCashInDrawerRub: 0,
							incomeCashRub: 0,
							incomeElectronicRub: 0,
							incomeSbpRub: 0,
							advanceOffsetRub: 0,
							returnTotalRub: 0,
							insuranceTotalRub: 0,
							netRevenueRub: 0,
						});
					}
				}
			}
		} catch (err) {
			clientLogger.warn("[useFinanceCashShift] Failed to fetch server cashbox balance, falling back to local calculation", err, { module: "Finance" });
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
		if (serverShiftSnapshot?.hasOpenShift) {
			return Math.max(0, serverShiftSnapshot.expectedCashInDrawerRub);
		}
		if (serverCashBoxBalanceRub !== null && Number.isFinite(serverCashBoxBalanceRub)) {
			return Math.max(0, serverCashBoxBalanceRub);
		}
		return Math.max(
			0,
			kopecksToRubles(rublesToKopecks(cashDayTotals?.cashRub ?? 0) + rublesToKopecks(manualCashDeltaRub)),
		);
	}, [serverShiftSnapshot, serverCashBoxBalanceRub, cashDayTotals?.cashRub, manualCashDeltaRub]);
	const cardSumRub = serverShiftSnapshot?.hasOpenShift ? serverShiftSnapshot.incomeElectronicRub : (cashDayTotals?.cardRub ?? 0);
	const sbpSumRub = serverShiftSnapshot?.hasOpenShift ? serverShiftSnapshot.incomeSbpRub : (cashDayTotals?.sbpRub ?? 0);
	const advanceOffsetRub = serverShiftSnapshot?.hasOpenShift ? serverShiftSnapshot.advanceOffsetRub : (cashDayTotals?.advanceRub ?? 0);
	const returnTotalRub = serverShiftSnapshot?.returnTotalRub ?? 0;
	const insuranceTotalRub = serverShiftSnapshot?.insuranceTotalRub ?? 0;
	const netRevenueRub = serverShiftSnapshot?.netRevenueRub;
	const startingBalanceRub = serverShiftSnapshot?.startingBalanceRub ?? 0;

	const handleOpenShift = useCallback(async () => {
		if (propsOnOpenShift) {
			await propsOnOpenShift();
		} else {
			try {
				const res = await fetch("/api/cashbox/shift/open", {
					method: "POST",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({
						cashierFullName: paymentFiscalCashierName || undefined,
						openedAt: new Date().toISOString(),
					}),
				});
				if (!res.ok) {
					const errMsg = await extractShiftMutationErrorMessage(res, "Не удалось открыть смену");
					clientLogger.warn("[useFinanceCashShift] Failed to open shift", { status: res.status, errMsg }, { module: "Finance" });
					showToast(errMsg, "error");
					return;
				}
			} catch (err: unknown) {
				clientLogger.warn("[useFinanceCashShift] Network error opening shift", err, { module: "Finance" });
				showToast("Сетевая ошибка при открытии кассовой смены", "error");
				return;
			}
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
			try {
				const zNumber = `Z-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${shiftNumber}`;
				const res = await fetch("/api/cashbox/shift/close", {
					method: "POST",
					headers: denteClinicalMutationHeaders({
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
				if (!res.ok) {
					const errMsg = await extractShiftMutationErrorMessage(res, "Не удалось закрыть смену");
					clientLogger.warn("[useFinanceCashShift] Failed to close shift", { status: res.status, errMsg }, { module: "Finance" });
					showToast(errMsg, "error");
					return;
				}
			} catch (err: unknown) {
				clientLogger.warn("[useFinanceCashShift] Network error closing shift", err, { module: "Finance" });
				showToast("Сетевая ошибка при закрытии кассовой смены", "error");
				return;
			}
		}
		setIsShiftOpen(false);
		safeLocalStorageSetItem("dente_cash_shift_open", "false");
		setManualCashDeltaRub(0);
		setServerCashBoxBalanceRub(null);
		setServerShiftSnapshot(null);
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
				const res = await fetch("/api/cash/cash-introduction", {
					method: "POST",
					headers: denteClinicalMutationHeaders({
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
				if (!res.ok) {
					const errMsg = await extractShiftMutationErrorMessage(res, "Ошибка внесения наличных");
					clientLogger.warn("[useFinanceCashShift] cash-introduction failed", { status: res.status, errMsg }, { module: "Finance" });
					throw new Error(errMsg);
				}
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
				const res = await fetch("/api/cash/cash-withdrawal", {
					method: "POST",
					headers: denteClinicalMutationHeaders({
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
				if (!res.ok) {
					const errMsg = await extractShiftMutationErrorMessage(res, "Ошибка изъятия наличных");
					clientLogger.warn("[useFinanceCashShift] cash-withdrawal failed", { status: res.status, errMsg }, { module: "Finance" });
					throw new Error(errMsg);
				}
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
		try {
			const res = await fetch("/api/fiscal/x-report", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					cashierFullName: paymentFiscalCashierName || undefined,
					shiftNumber,
				}),
			});
			if (!res.ok) {
				const errMsg = await extractShiftMutationErrorMessage(res, "Ошибка формирования X-отчёта");
				clientLogger.warn("[useFinanceCashShift] x-report failed", { status: res.status, errMsg }, { module: "Finance" });
				showToast(errMsg, "error");
			}
		} catch (err: unknown) {
			clientLogger.warn("[useFinanceCashShift] Network error generating X-report", err, { module: "Finance" });
			showToast("Сетевая ошибка при печати X-отчёта", "error");
		}
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
		insuranceTotalRub,
		isLocalBalanceFallback,
		isServerBalanceOffline: isLocalBalanceFallback,
		isShiftOpen,
		netRevenueRub,
		returnTotalRub,
		sbpSumRub,
		shiftNumber,
		startingBalanceRub,
	};
}
