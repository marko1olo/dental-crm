import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dashboard, Patient } from "@dental/shared";
import { rubAmountForInput } from "../../../components/payments/cashDeskAmounts.js";
import type { PendingCheckout } from "../types.js";

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

	const effectiveBillingSummary = useMemo(() => {
		if (pendingCheckout?.totalDueRub && pendingCheckout.totalDueRub > 0) {
			return {
				totalDueRub: pendingCheckout.totalDueRub,
				totalPlannedRub: pendingCheckout.totalDueRub + (billingSummary?.totalPaidRub ?? 0),
				totalPaidRub: billingSummary?.totalPaidRub ?? 0,
				totalInvoicedRub: pendingCheckout.totalDueRub,
				taxDeductionEligibleRub:
					billingSummary?.taxDeductionEligibleRub || pendingCheckout.totalDueRub,
				openTreatmentItems: (pendingCheckout.services || []).length || 1,
				unpaidDocuments: 1,
				unpaidInvoicesCount: 1,
			};
		}
		if (billingSummary && billingSummary.totalDueRub > 0) return billingSummary;
		if (billingSummary) return billingSummary;
		return null;
	}, [billingSummary, pendingCheckout]);

	const effectivePatient = useMemo(() => {
		if (pendingCheckout?.patientId) {
			if (dashboard?.patients) {
				const found = dashboard.patients.find((p: any) => p.id === pendingCheckout.patientId);
				if (found) return found;
			}
			if (documentPatient?.id === pendingCheckout.patientId) {
				return documentPatient;
			}
			return {
				id: pendingCheckout.patientId,
				fullName: pendingCheckout.patientName || "Пациент",
				name: pendingCheckout.patientName || "Пациент",
				phone: (pendingCheckout as any).patientPhone,
			};
		}
		if (documentPatient) return documentPatient;
		if (propsActivePatient) return propsActivePatient;
		const selId = propsSelectedPatientId;
		if (selId && dashboard?.patients) {
			const found = dashboard.patients.find((p: any) => p.id === selId);
			if (found) return found;
		}
		if ((dashboard as any)?.patient) return (dashboard as any).patient;
		if (dashboard?.patients && dashboard.patients.length > 0) {
			return dashboard.patients[0];
		}
		return null;
	}, [documentPatient, pendingCheckout, propsActivePatient, propsSelectedPatientId, dashboard]);

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
