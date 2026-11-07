import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dashboard, Patient } from "@dental/shared";
import { rubAmountForInput } from "../../../components/payments/cashDeskAmounts.js";
import type { PendingCheckout } from "../types.js";
import {
	resolveEffectiveBillingSummary,
	resolveEffectivePatient,
} from "../useFinanceView.js";

export interface UseFinancePendingCheckoutAndPaymentParams {
	readonly billingSummary: Dashboard["billingSummary"] | null;
	readonly dashboard?: Dashboard | undefined;
	readonly documentPatient: Patient | null;
	readonly paymentAmount?: string | undefined;
	readonly onRecordPayment: () => void | Promise<void>;
	readonly setPaymentAmount?: ((val: string) => void) | undefined;
	readonly setSelectedPatientId?: ((id: string) => void) | undefined;
	readonly activePatient?: Patient | null | undefined;
	readonly selectedPatientId?: string | undefined;
	readonly onOpenSplitPayment?: (() => void) | undefined;
}

/**
 * useFinancePendingCheckoutAndPayment — Синхронизация отложенного чека из визита,
 * авто-расчет эффективной суммы долга и привязка активного пациента.
 * Делегирует вычисления каноническим резолверам useFinanceView (устранение 150 строк дублирования).
 */
export function useFinancePendingCheckoutAndPayment(params: UseFinancePendingCheckoutAndPaymentParams) {
	const {
		billingSummary,
		dashboard,
		documentPatient,
		paymentAmount = "",
		onRecordPayment,
		setPaymentAmount,
		setSelectedPatientId,
		activePatient: propsActivePatient,
		selectedPatientId: propsSelectedPatientId,
		onOpenSplitPayment,
	} = params;

	const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(() => {
		if (typeof window === "undefined") return null;
		try {
			const raw =
				sessionStorage.getItem("dente_pending_checkout") ||
				localStorage.getItem("dente_pending_checkout");
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	});

	useEffect(() => {
		const syncPendingCheckout = () => {
			try {
				const raw =
					sessionStorage.getItem("dente_pending_checkout") ||
					localStorage.getItem("dente_pending_checkout");
				if (raw) {
					const parsed = JSON.parse(raw);
					setPendingCheckout(parsed);
					if (parsed?.autoOpen && onOpenSplitPayment) {
						onOpenSplitPayment();
					}
				}
			} catch {}
		};
		syncPendingCheckout();
		window.addEventListener("dente:pending-checkout-ready", syncPendingCheckout);
		window.addEventListener("hashchange", syncPendingCheckout);
		return () => {
			window.removeEventListener("dente:pending-checkout-ready", syncPendingCheckout);
			window.removeEventListener("hashchange", syncPendingCheckout);
		};
	}, [onOpenSplitPayment]);

	const effectiveBillingSummary = useMemo(
		() => resolveEffectiveBillingSummary({ pendingCheckout, billingSummary }),
		[pendingCheckout, billingSummary],
	);

	const effectivePatient = useMemo(
		() =>
			resolveEffectivePatient({
				pendingCheckout,
				documentPatient,
				activePatient: propsActivePatient,
				selectedPatientId: propsSelectedPatientId,
				dashboard,
			}),
		[pendingCheckout, documentPatient, propsActivePatient, propsSelectedPatientId, dashboard],
	);

	const [localPaymentAmount, setLocalPaymentAmount] = useState<string>(() => {
		if (pendingCheckout?.totalDueRub && pendingCheckout.totalDueRub > 0) {
			return rubAmountForInput(pendingCheckout.totalDueRub);
		}
		if (effectiveBillingSummary?.totalDueRub && effectiveBillingSummary.totalDueRub > 0) {
			return rubAmountForInput(effectiveBillingSummary.totalDueRub);
		}
		return "";
	});

	const effectivePaymentAmount = paymentAmount || localPaymentAmount;

	const handleAmountChange = useCallback(
		(val: string) => {
			setLocalPaymentAmount(val);
			if (typeof setPaymentAmount === "function") {
				setPaymentAmount(val);
			}
		},
		[setPaymentAmount],
	);

	useEffect(() => {
		if (
			pendingCheckout &&
			typeof pendingCheckout.totalDueRub === "number" &&
			pendingCheckout.totalDueRub > 0
		) {
			const target = rubAmountForInput(pendingCheckout.totalDueRub);
			if (paymentAmount !== target && localPaymentAmount !== target) {
				setLocalPaymentAmount(target);
				if (typeof setPaymentAmount === "function") {
					setPaymentAmount(target);
				}
			}
		} else if (
			effectiveBillingSummary?.totalDueRub &&
			effectiveBillingSummary.totalDueRub > 0
		) {
			const target = rubAmountForInput(effectiveBillingSummary.totalDueRub);
			if (!paymentAmount && !localPaymentAmount) {
				setLocalPaymentAmount(target);
				if (typeof setPaymentAmount === "function") {
					setPaymentAmount(target);
				}
			}
		}
	}, [
		pendingCheckout,
		effectiveBillingSummary,
		paymentAmount,
		localPaymentAmount,
		setPaymentAmount,
	]);

	useEffect(() => {
		if (effectivePatient?.id && propsSelectedPatientId !== effectivePatient.id) {
			if (typeof setSelectedPatientId === "function") {
				setSelectedPatientId(effectivePatient.id);
			}
		}
	}, [effectivePatient, propsSelectedPatientId, setSelectedPatientId]);

	const handleRecordPayment = useCallback(async () => {
		await onRecordPayment();
		if (typeof window !== "undefined") {
			sessionStorage.removeItem("dente_pending_checkout");
			localStorage.removeItem("dente_pending_checkout");
		}
		setPendingCheckout(null);
		setLocalPaymentAmount("");
	}, [onRecordPayment]);

	return {
		effectiveBillingSummary,
		effectivePatient,
		effectivePaymentAmount,
		handleAmountChange,
		handleRecordPayment,
		pendingCheckout,
		setPendingCheckout,
	};
}
