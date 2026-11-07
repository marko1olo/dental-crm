import type { Dashboard, Payment, PaymentMethod } from "@dental/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { money as formatMoney } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { motionSafeScrollIntoView } from "../../motionPreference";
import { rubAmountForInput } from "../../components/payments/cashDeskAmounts.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import {
	type FinanceViewComponentProps, type PendingCheckout, type TreatmentPlanItem,
	type TreatmentPlanScenario, EMPTY_CLINICAL_RULE_SUMMARY, noLabels,
} from "./types.js";
import { useFinanceModalsNavigation } from "./hooks/useFinanceModalsNavigation.js";
import { useFinanceCashShift } from "./hooks/useFinanceCashShift.js";
import { useFinanceTransactionsData } from "./hooks/useFinanceTransactionsData.js";

export function resolveEffectiveBillingSummary({ pendingCheckout, billingSummary }: { pendingCheckout?: PendingCheckout | null | undefined; billingSummary?: any }) {
	if (pendingCheckout?.totalDueRub && pendingCheckout.totalDueRub > 0) {
		return {
			totalDueRub: pendingCheckout.totalDueRub,
			totalPlannedRub: pendingCheckout.totalDueRub + (billingSummary?.totalPaidRub ?? 0),
			totalPaidRub: billingSummary?.totalPaidRub ?? 0,
			totalInvoicedRub: pendingCheckout.totalDueRub,
			taxDeductionEligibleRub: billingSummary?.taxDeductionEligibleRub || pendingCheckout.totalDueRub,
			openTreatmentItems: (pendingCheckout.services || []).length || 1,
			unpaidDocuments: 1,
			unpaidInvoicesCount: 1,
		};
	}
	return billingSummary ?? null;
}

export function resolveEffectivePatient({ pendingCheckout, dashboard, documentPatient, activePatient, selectedPatientId }: { pendingCheckout?: PendingCheckout | null | undefined; dashboard?: any; documentPatient?: any; activePatient?: any; selectedPatientId?: string | null | undefined }) {
	if (pendingCheckout?.patientId) {
		const found = dashboard?.patients?.find((p: any) => p.id === pendingCheckout.patientId);
		if (found) return found;
		if (documentPatient?.id === pendingCheckout.patientId) return documentPatient;
		return { id: pendingCheckout.patientId, fullName: pendingCheckout.patientName || "Пациент", name: pendingCheckout.patientName || "Пациент", phone: (pendingCheckout as any).patientPhone };
	}
	if (documentPatient) return documentPatient;
	if (activePatient) return activePatient;
	if (selectedPatientId && dashboard?.patients) {
		const found = dashboard.patients.find((p: any) => p.id === selectedPatientId);
		if (found) return found;
	}
	return (dashboard as any)?.patient ?? (dashboard?.patients?.[0] ?? null);
}

/**
 * useFinanceView — Тонкий фасад экрана финансов клиники (Мандат 8b: лимит строк <=300).
 */
export function useFinanceView(rawProps?: FinanceViewComponentProps) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as ReturnType<typeof useAppLogicContext> & FinanceViewComponentProps;

	const {
		activePayments = (props.activePayments ?? props.dashboard?.payments ?? []) as Payment[],
		activeTreatmentPlanItems = (props.activeTreatmentPlanItems ?? props.dashboard?.treatmentPlanItems ?? []) as TreatmentPlanItem[],
		activeTreatmentPlanScenarios = (props.activeTreatmentPlanScenarios ?? props.dashboard?.treatmentPlanScenarios ?? []) as TreatmentPlanScenario[],
		billingSummary = props.billingSummary ?? (props as any).patientBillingSummary ?? null,
		clinicalRuleEvaluations = props.clinicalRuleEvaluations ?? (props as any).patientClinicalRuleEvaluations ?? [],
		clinicalRuleActionLabels = props.clinicalRuleActionLabels ?? noLabels(),
		clinicalRuleSeverityLabels = props.clinicalRuleSeverityLabels ?? noLabels(),
		clinicalRuleSummary = props.clinicalRuleSummary ?? (props as any).patientClinicalRuleSummary ?? EMPTY_CLINICAL_RULE_SUMMARY,
		dashboard = props.dashboard,
		documentPatient = props.documentPatient ?? null,
		formatDateTime = props.formatDateTime ?? ((val: string) => val || ""),
		isPaymentSaving = props.isPaymentSaving ?? false,
		money = props.money ?? formatMoney,
		onRecordPayment = props.onRecordPayment ?? (props as any).recordPayment ?? (() => {}),
		paymentAmount = props.paymentAmount ?? "",
	} = props;

	const loadDashboard = logicContext?.loadDashboard;
	const reloadAfterFamilyPayment = useCallback(() => { void loadDashboard?.(); }, [loadDashboard]);
	const createDocumentProp = props.onCreateDocument ? { onCreateDocument: props.onCreateDocument } : {};
	const modals = useFinanceModalsNavigation();

	const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(() => {
		if (typeof window === "undefined") return null;
		try {
			const raw = sessionStorage.getItem("dente_pending_checkout") || localStorage.getItem("dente_pending_checkout");
			return raw ? JSON.parse(raw) : null;
		} catch { return null; }
	});

	useEffect(() => {
		const syncPendingCheckout = () => {
			try {
				const raw = sessionStorage.getItem("dente_pending_checkout") || localStorage.getItem("dente_pending_checkout");
				if (raw) {
					const parsed = JSON.parse(raw);
					setPendingCheckout(parsed);
					if (parsed?.autoOpen) modals.setIsSplitPaymentOpen(true);
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
	}, [modals.setIsSplitPaymentOpen]);

	const effectiveBillingSummary = useMemo(
		() => resolveEffectiveBillingSummary({ pendingCheckout, billingSummary }),
		[billingSummary, pendingCheckout],
	);

	const effectivePatient = useMemo(
		() =>
			resolveEffectivePatient({
				pendingCheckout,
				dashboard,
				documentPatient,
				activePatient: (props as any).activePatient || logicContext?.activePatient,
				selectedPatientId: (props as any).selectedPatientId || logicContext?.selectedPatientId,
			}),
		[documentPatient, pendingCheckout, props, logicContext, dashboard],
	);

	useEffect(() => {
		let isMounted = true;
		const loadUnpaidInvoicesFromDb = async () => {
			try {
				const res = await fetch("/api/invoices/pending", {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (!isMounted) return;
				const invoices = Array.isArray(data.invoices) ? data.invoices : [];
				if (invoices.length === 0) return;

				const targetPatientId = effectivePatient?.id;
				const matchedInvoice = targetPatientId
					? invoices.find((inv: any) => inv.patientId === targetPatientId)
					: invoices[0];

				if (matchedInvoice) {
					setPendingCheckout((current) => {
						if (current?.totalDueRub && current.totalDueRub > 0 && current.patientId === matchedInvoice.patientId) {
							return current.invoiceId ? current : { ...current, invoiceId: matchedInvoice.id };
						}
						return {
							patientId: matchedInvoice.patientId,
							patientName: matchedInvoice.patientName || "Пациент",
							visitId: matchedInvoice.visitId || undefined,
							invoiceId: matchedInvoice.id,
							services: [
								{
									name: `Стоматологические услуги (${matchedInvoice.invoiceNumber || matchedInvoice.number})`,
									priceRub: matchedInvoice.totalAmountRub,
									quantity: 1,
								},
							],
							totalDueRub: matchedInvoice.totalAmountRub,
							receiptNumber: matchedInvoice.invoiceNumber || matchedInvoice.number,
							timestamp: Date.now(),
						};
					});
				}
			} catch {
				// Soft network resilience
			}
		};

		void loadUnpaidInvoicesFromDb();

		const handleRefresh = () => void loadUnpaidInvoicesFromDb();
		window.addEventListener("dente-invoice-created", handleRefresh);
		window.addEventListener("dente-cashbox-refresh", handleRefresh);
		window.addEventListener("dente-invoices-updated", handleRefresh);

		return () => {
			isMounted = false;
			window.removeEventListener("dente-invoice-created", handleRefresh);
			window.removeEventListener("dente-cashbox-refresh", handleRefresh);
			window.removeEventListener("dente-invoices-updated", handleRefresh);
		};
	}, [effectivePatient?.id]);

	const [localPaymentAmount, setLocalPaymentAmount] = useState<string>(() => {
		if (pendingCheckout?.totalDueRub && pendingCheckout.totalDueRub > 0) return rubAmountForInput(pendingCheckout.totalDueRub);
		if (effectiveBillingSummary?.totalDueRub && effectiveBillingSummary.totalDueRub > 0) return rubAmountForInput(effectiveBillingSummary.totalDueRub);
		return "";
	});

	const effectivePaymentAmount = paymentAmount || localPaymentAmount;
	const handleAmountChange = useCallback((val: string) => {
		setLocalPaymentAmount(val);
		props.setPaymentAmount?.(val);
	}, [props.setPaymentAmount]);

	useEffect(() => {
		if (pendingCheckout?.totalDueRub && pendingCheckout.totalDueRub > 0) {
			const target = rubAmountForInput(pendingCheckout.totalDueRub);
			if (paymentAmount !== target && localPaymentAmount !== target) {
				setLocalPaymentAmount(target);
				props.setPaymentAmount?.(target);
			}
		} else if (effectiveBillingSummary?.totalDueRub && effectiveBillingSummary.totalDueRub > 0) {
			const target = rubAmountForInput(effectiveBillingSummary.totalDueRub);
			if (!paymentAmount && !localPaymentAmount) {
				setLocalPaymentAmount(target);
				props.setPaymentAmount?.(target);
			}
		}
	}, [pendingCheckout, effectiveBillingSummary, paymentAmount, localPaymentAmount, props.setPaymentAmount]);

	useEffect(() => {
		if (effectivePatient?.id && logicContext?.selectedPatientId !== effectivePatient.id) {
			((props as any).setSelectedPatientId ?? logicContext?.setSelectedPatientId)?.(effectivePatient.id);
		}
	}, [effectivePatient, logicContext, props]);

	const handleRecordPayment = useCallback(async () => {
		await onRecordPayment();
		if (typeof window !== "undefined") {
			sessionStorage.removeItem("dente_pending_checkout");
			localStorage.removeItem("dente_pending_checkout");
		}
		setPendingCheckout(null);
		setLocalPaymentAmount("");
	}, [onRecordPayment]);

	const cashShift = useFinanceCashShift({
		activePayments,
		dashboard,
		paymentFiscalCashierName: props.paymentFiscalCashierName,
		onCashIn: props.onCashIn,
		onCashOut: props.onCashOut,
		onCloseShift: props.onCloseShift,
		onOpenShift: props.onOpenShift,
		loadDashboard,
	});

	const txData = useFinanceTransactionsData({
		activePayments,
		activeTreatmentPlanItems,
		activeTreatmentPlanScenarios,
		clinicalRuleEvaluations,
		clinicalRuleSummary,
	});

	const remainingDebtProp = effectiveBillingSummary ? { remainingDebt: effectiveBillingSummary.totalDueRub } : {};
	const focusPaymentCapture = () => {
		const amountInput = document.getElementById("payment-amount-input") as HTMLInputElement | null;
		const paymentCapture = document.getElementById("payment-capture");
		motionSafeScrollIntoView(amountInput ?? paymentCapture, { block: "center" });
		amountInput?.focus({ preventScroll: true });
	};

	return {
		activePatient: effectivePatient,
		activePayments: txData.activePayments,
		activeTreatmentPlanItems: txData.activeTreatmentPlanItems,
		activeTreatmentPlanScenarios: txData.activeTreatmentPlanScenarios,
		advanceOffsetRub: cashShift.advanceOffsetRub,
		billingSummary,
		cardSumRub: cashShift.cardSumRub,
		cashDayTotals: cashShift.cashDayTotals,
		cashInDrawerRub: cashShift.cashInDrawerRub,
		clinicalRuleActionLabels,
		clinicalRuleEvaluations,
		clinicalRuleSeverityLabels,
		clinicalRuleSummary,
		createDocumentProp,
		dashboard,
		documentPatient,
		effectiveBillingSummary,
		effectivePatient,
		focusPaymentCapture,
		formatDateTime,
		handleCashIn: cashShift.handleCashIn,
		handleCashOut: cashShift.handleCashOut,
		handleCloseShift: cashShift.handleCloseShift,
		handleOpenShift: cashShift.handleOpenShift,
		handlePrintXReport: cashShift.handlePrintXReport,
		hasActiveClinicalRules: txData.hasActiveClinicalRules,
		isBillingActOpen: modals.isBillingActOpen,
		isCashShiftOpen: modals.isCashShiftOpen,
		isCashboxOpen: modals.isCashboxOpen,
		isFamilyBillingOpen: modals.isFamilyBillingOpen,
		isFinanceOptionsOpen: modals.isFinanceOptionsOpen,
		isInvoicesOpen: modals.isInvoicesOpen,
		isPaymentSaving,
		isPnlOpen: modals.isPnlOpen,
		isQuickExpenseOpen: modals.isQuickExpenseOpen,
		isShiftOpen: cashShift.isShiftOpen,
		isSplitPaymentOpen: modals.isSplitPaymentOpen,
		isTaxModalOpen: modals.isTaxModalOpen,
		isAccountingExportOpen: modals.isAccountingExportOpen,
		setIsAccountingExportOpen: modals.setIsAccountingExportOpen,
		isTimesheetT13Open: modals.isTimesheetT13Open,
		loadDashboard,
		money,
		onGoToDocuments: props.onGoToDocuments ?? (() => { window.location.hash = "documents"; }),
		onGoToPrices: props.onGoToPrices ?? (() => { (props as any).setSettingsTab?.("prices"); window.location.hash = "settings/prices"; }),
		onGoToVisit: props.onGoToVisit ?? (() => { window.location.hash = "visit"; }),
		onRecordPayment: handleRecordPayment,
		paymentAmount: effectivePaymentAmount,
		paymentFeedback: props.paymentFeedback ?? "",
		paymentFiscalCashierName: props.paymentFiscalCashierName ?? "",
		paymentFiscalFd: props.paymentFiscalFd ?? "",
		paymentFiscalFn: props.paymentFiscalFn ?? "",
		paymentFiscalFpd: props.paymentFiscalFpd ?? "",
		paymentFiscalReceiptIssuedAt: props.paymentFiscalReceiptIssuedAt ?? "",
		paymentFiscalReceiptLabel: props.paymentFiscalReceiptLabel ?? (props as any).paymentFiscalReceiptLabelForUi ?? (() => ""),
		paymentFiscalReceiptNumber: props.paymentFiscalReceiptNumber ?? "",
		paymentFiscalReceiptUrl: props.paymentFiscalReceiptUrl ?? "",
		paymentMethod: props.paymentMethod ?? "cash",
		paymentMethodLabels: props.paymentMethodLabels ?? noLabels(),
		paymentPatientContextMessage: props.paymentPatientContextMessage ?? "",
		paymentPatientContextReady: props.paymentPatientContextReady ?? true,
		paymentPayerBirthDate: props.paymentPayerBirthDate ?? "",
		paymentPayerFullName: props.paymentPayerFullName ?? "",
		paymentPayerIdentityDocument: props.paymentPayerIdentityDocument ?? "",
		paymentPayerInn: props.paymentPayerInn ?? "",
		paymentPayerRelationship: props.paymentPayerRelationship ?? "",
		paymentTaxDeductionCode: props.paymentTaxDeductionCode ?? "",
		pendingCheckout,
		reloadAfterFamilyPayment,
		remainingDebtProp,
		sbpSumRub: cashShift.sbpSumRub,
		scenarioPriorityLabels: props.scenarioPriorityLabels ?? noLabels(),
		scenarioStrategyLabels: props.scenarioStrategyLabels ?? noLabels(),
		serviceCategoryLabels: props.serviceCategoryLabels ?? noLabels(),
		serviceTitle: props.serviceTitle ?? ((id: string) => id),
		setIsBillingActOpen: modals.setIsBillingActOpen, setIsCashShiftOpen: modals.setIsCashShiftOpen,
		setIsCashboxOpen: modals.setIsCashboxOpen, setIsFamilyBillingOpen: modals.setIsFamilyBillingOpen,
		setIsFinanceOptionsOpen: modals.setIsFinanceOptionsOpen, setIsInvoicesOpen: modals.setIsInvoicesOpen,
		setIsPnlOpen: modals.setIsPnlOpen, setIsQuickExpenseOpen: modals.setIsQuickExpenseOpen,
		setIsSplitPaymentOpen: modals.setIsSplitPaymentOpen, setIsTaxModalOpen: modals.setIsTaxModalOpen,
		setIsTimesheetT13Open: modals.setIsTimesheetT13Open,
		setPaymentAmount: handleAmountChange,
		setPaymentFiscalCashierName: props.setPaymentFiscalCashierName ?? (() => {}),
		setPaymentFiscalFd: props.setPaymentFiscalFd ?? (() => {}),
		setPaymentFiscalFn: props.setPaymentFiscalFn ?? (() => {}),
		setPaymentFiscalFpd: props.setPaymentFiscalFpd ?? (() => {}),
		setPaymentFiscalReceiptIssuedAt: props.setPaymentFiscalReceiptIssuedAt ?? (() => {}),
		setPaymentFiscalReceiptNumber: props.setPaymentFiscalReceiptNumber ?? (() => {}),
		setPaymentFiscalReceiptUrl: props.setPaymentFiscalReceiptUrl ?? (() => {}),
		setPaymentMethod: props.setPaymentMethod ?? (() => {}),
		setPaymentPayerBirthDate: props.setPaymentPayerBirthDate ?? (() => {}),
		setPaymentPayerFullName: props.setPaymentPayerFullName ?? (() => {}),
		setPaymentPayerIdentityDocument: props.setPaymentPayerIdentityDocument ?? (() => {}),
		setPaymentPayerInn: props.setPaymentPayerInn ?? (() => {}),
		setPaymentPayerRelationship: props.setPaymentPayerRelationship ?? (() => {}),
		setPaymentTaxDeductionCode: props.setPaymentTaxDeductionCode ?? (() => {}),
		setPendingCheckout,
		shiftNumber: cashShift.shiftNumber,
		staffRoleLabels: props.staffRoleLabels ?? noLabels(),
		taxDeductionPayments: txData.taxDeductionPayments,
		treatmentStatusLabels: props.treatmentStatusLabels ?? noLabels(),
	};
}
