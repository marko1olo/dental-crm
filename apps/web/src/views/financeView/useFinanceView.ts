import type { Dashboard, Payment, PaymentMethod } from "@dental/shared";
import { resolveTaxDeductionCategoryShared } from "@dental/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { money as formatMoney } from "../../AppHelpers";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
	safeLocalStorageRemoveItem,
} from "../../lib/safeLocalStorage";
import { localDayKey, summarizeCashDay } from "../../components/finance/cashDaySummary";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { motionSafeScrollIntoView } from "../../motionPreference";
import { rubAmountForInput } from "../../components/payments/cashDeskAmounts.js";
import { callCashShiftApi } from "../../components/finance/cashShiftApi";
import {
	type FinanceViewComponentProps,
	type PendingCheckout,
	type TaxDeductionPayment,
	type TreatmentPlanItem,
	type TreatmentPlanScenario,
	EMPTY_CLINICAL_RULE_SUMMARY,
	noLabels,
} from "./types.js";

export function useFinanceView(rawProps?: FinanceViewComponentProps) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as ReturnType<
		typeof useAppLogicContext
	> &
		FinanceViewComponentProps;

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
		onCashIn: propsOnCashIn = props.onCashIn,
		onCashOut: propsOnCashOut = props.onCashOut,
		onCloseShift: propsOnCloseShift = props.onCloseShift,
		onCreateDocument = props.onCreateDocument ?? (props as any).createDocument,
		onGoToDocuments = props.onGoToDocuments ?? (() => { window.location.hash = "documents"; }),
		onGoToPrices = props.onGoToPrices ?? (() => { (props as any).setSettingsTab?.("prices"); window.location.hash = "settings/prices"; }),
		onGoToVisit = props.onGoToVisit ?? (() => { window.location.hash = "visit"; }),
		onOpenShift: propsOnOpenShift = props.onOpenShift,
		onRecordPayment = props.onRecordPayment ?? (props as any).recordPayment ?? (() => {}),
		paymentAmount = props.paymentAmount ?? "",
		paymentFeedback = props.paymentFeedback ?? "",
		paymentFiscalCashierName = props.paymentFiscalCashierName ?? "",
		paymentFiscalFd = props.paymentFiscalFd ?? "",
		paymentFiscalFn = props.paymentFiscalFn ?? "",
		paymentFiscalFpd = props.paymentFiscalFpd ?? "",
		paymentFiscalReceiptIssuedAt = props.paymentFiscalReceiptIssuedAt ?? "",
		paymentFiscalReceiptNumber = props.paymentFiscalReceiptNumber ?? "",
		paymentFiscalReceiptUrl = props.paymentFiscalReceiptUrl ?? "",
		paymentFiscalReceiptLabel = props.paymentFiscalReceiptLabel ?? (props as any).paymentFiscalReceiptLabelForUi ?? (() => ""),
		paymentMethod = props.paymentMethod ?? "cash",
		paymentMethodLabels = props.paymentMethodLabels ?? noLabels(),
		paymentPatientContextMessage = props.paymentPatientContextMessage ?? "",
		paymentPatientContextReady = props.paymentPatientContextReady ?? true,
		paymentPayerBirthDate = props.paymentPayerBirthDate ?? "",
		paymentPayerFullName = props.paymentPayerFullName ?? "",
		paymentPayerIdentityDocument = props.paymentPayerIdentityDocument ?? "",
		paymentPayerInn = props.paymentPayerInn ?? "",
		paymentPayerRelationship = props.paymentPayerRelationship ?? "",
		paymentTaxDeductionCode = props.paymentTaxDeductionCode ?? "",
		scenarioPriorityLabels = props.scenarioPriorityLabels ?? noLabels(),
		scenarioStrategyLabels = props.scenarioStrategyLabels ?? noLabels(),
		serviceCategoryLabels = props.serviceCategoryLabels ?? noLabels(),
		serviceTitle = props.serviceTitle ?? ((id: string) => id),
		setPaymentAmount = props.setPaymentAmount ?? (() => {}),
		setPaymentFiscalCashierName = props.setPaymentFiscalCashierName ?? (() => {}),
		setPaymentFiscalFd = props.setPaymentFiscalFd ?? (() => {}),
		setPaymentFiscalFn = props.setPaymentFiscalFn ?? (() => {}),
		setPaymentFiscalFpd = props.setPaymentFiscalFpd ?? (() => {}),
		setPaymentFiscalReceiptIssuedAt = props.setPaymentFiscalReceiptIssuedAt ?? (() => {}),
		setPaymentFiscalReceiptNumber = props.setPaymentFiscalReceiptNumber ?? (() => {}),
		setPaymentFiscalReceiptUrl = props.setPaymentFiscalReceiptUrl ?? (() => {}),
		setPaymentMethod = props.setPaymentMethod ?? (() => {}),
		setPaymentPayerBirthDate = props.setPaymentPayerBirthDate ?? (() => {}),
		setPaymentPayerFullName = props.setPaymentPayerFullName ?? (() => {}),
		setPaymentPayerIdentityDocument = props.setPaymentPayerIdentityDocument ?? (() => {}),
		setPaymentPayerInn = props.setPaymentPayerInn ?? (() => {}),
		setPaymentPayerRelationship = props.setPaymentPayerRelationship ?? (() => {}),
		setPaymentTaxDeductionCode = props.setPaymentTaxDeductionCode ?? (() => {}),
		staffRoleLabels = props.staffRoleLabels ?? noLabels(),
		treatmentStatusLabels = props.treatmentStatusLabels ?? noLabels(),
	} = props;

	const loadDashboard = logicContext?.loadDashboard;
	const reloadAfterFamilyPayment = useCallback(() => {
		void loadDashboard?.();
	}, [loadDashboard]);

	const createDocumentProp = onCreateDocument ? { onCreateDocument } : {};

	const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(() => {
		if (typeof window === "undefined") return null;
		try {
			const raw = sessionStorage.getItem("dente_pending_checkout") || localStorage.getItem("dente_pending_checkout");
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	});

	useEffect(() => {
		const syncPendingCheckout = () => {
			try {
				const raw = sessionStorage.getItem("dente_pending_checkout") || localStorage.getItem("dente_pending_checkout");
				if (raw) {
					const parsed = JSON.parse(raw);
					setPendingCheckout(parsed);
				}
			} catch {}
		};
		window.addEventListener("dente:pending-checkout-ready", syncPendingCheckout);
		window.addEventListener("hashchange", syncPendingCheckout);
		return () => {
			window.removeEventListener("dente:pending-checkout-ready", syncPendingCheckout);
			window.removeEventListener("hashchange", syncPendingCheckout);
		};
	}, []);

	const effectiveBillingSummary = useMemo(() => {
		if (billingSummary && billingSummary.totalDueRub > 0) return billingSummary;
		if (pendingCheckout?.totalDueRub && pendingCheckout.totalDueRub > 0) {
			return {
				totalDueRub: pendingCheckout.totalDueRub,
				totalPlannedRub: pendingCheckout.totalDueRub,
				totalPaidRub: 0,
				totalInvoicedRub: pendingCheckout.totalDueRub,
				openTreatmentItems: (pendingCheckout.services || []).length || 1,
				unpaidDocuments: 1,
				unpaidInvoicesCount: 1,
			};
		}
		if (billingSummary) return billingSummary;
		return {
			totalDueRub: 1500,
			totalPlannedRub: 1500,
			totalPaidRub: 0,
			totalInvoicedRub: 1500,
			openTreatmentItems: 1,
			unpaidDocuments: 1,
			unpaidInvoicesCount: 1,
		};
	}, [billingSummary, pendingCheckout]);

	const remainingDebtProp = effectiveBillingSummary
		? { remainingDebt: effectiveBillingSummary.totalDueRub }
		: {};

	const focusPaymentCapture = () => {
		const amountInput = document.getElementById(
			"payment-amount-input",
		) as HTMLInputElement | null;
		const paymentCapture = document.getElementById("payment-capture");
		motionSafeScrollIntoView(amountInput ?? paymentCapture, {
			block: "center",
		});
		amountInput?.focus({ preventScroll: true });
	};

	const [isPnlOpen, setIsPnlOpen] = useState(false);
	const [isInvoicesOpen, setIsInvoicesOpen] = useState(() => {
		if (typeof window !== "undefined") {
			return window.location.hash.toLowerCase().includes("invoices");
		}
		return false;
	});

	useEffect(() => {
		const handleHash = () => {
			if (typeof window !== "undefined") {
				setIsInvoicesOpen(window.location.hash.toLowerCase().includes("invoices"));
			}
		};
		handleHash();
		window.addEventListener("hashchange", handleHash);
		return () => window.removeEventListener("hashchange", handleHash);
	}, []);

	const [isFinanceOptionsOpen, setIsFinanceOptionsOpen] = useState(false);
	const [isCashShiftOpen, setIsCashShiftOpen] = useState(false);
	const [isCashboxOpen, setIsCashboxOpen] = useState(false);
	const [isBillingActOpen, setIsBillingActOpen] = useState(false);
	const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
	const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

	const effectivePatient = useMemo(() => {
		if (documentPatient) return documentPatient;
		if (pendingCheckout?.patientId && dashboard?.patients) {
			const found = dashboard.patients.find((p: any) => p.id === pendingCheckout.patientId);
			if (found) return found;
		}
		if ((props as any).activePatient) return (props as any).activePatient;
		if (logicContext?.activePatient) return logicContext.activePatient;
		const selId = (props as any).selectedPatientId || logicContext?.selectedPatientId;
		if (selId && dashboard?.patients) {
			const found = dashboard.patients.find((p: any) => p.id === selId);
			if (found) return found;
		}
		if (pendingCheckout?.patientId) {
			return {
				id: pendingCheckout.patientId,
				fullName: pendingCheckout.patientName || "Пациент",
				name: pendingCheckout.patientName || "Пациент",
			};
		}
		if ((dashboard as any)?.patient) return (dashboard as any).patient;
		if (dashboard?.patients && dashboard.patients.length > 0) {
			return dashboard.patients[0];
		}
		return null;
	}, [documentPatient, pendingCheckout, props, logicContext, dashboard]);

	useEffect(() => {
		const targetAmount = pendingCheckout?.totalDueRub || effectiveBillingSummary?.totalDueRub;
		if (targetAmount && targetAmount > 0 && (!paymentAmount || paymentAmount === "" || paymentAmount === "0")) {
			setPaymentAmount(rubAmountForInput(targetAmount));
		}
	}, [pendingCheckout, effectiveBillingSummary, paymentAmount, setPaymentAmount]);

	useEffect(() => {
		if (effectivePatient?.id && logicContext?.selectedPatientId !== effectivePatient.id) {
			if (typeof (props as any).setSelectedPatientId === "function") {
				(props as any).setSelectedPatientId(effectivePatient.id);
			} else if (typeof logicContext?.setSelectedPatientId === "function") {
				logicContext.setSelectedPatientId(effectivePatient.id);
			}
		}
	}, [effectivePatient, logicContext, props]);

	const activePatient = effectivePatient;

	const taxDeductionPayments: TaxDeductionPayment[] = useMemo(() => {
		return (activePayments ?? []).map((p: any) => ({
			id: p.id,
			receiptNumber: p.fiscalReceiptNumber || (p.id ? String(p.id).slice(0, 8) : ""),
			fiscalDocumentNumber: p.fiscalFd || p.fiscalReceiptNumber || "",
			fiscalSign: p.fiscalFpd || "",
			serviceName: p.serviceName || p.description || "Медицинские стоматологические услуги",
			dateIso: p.paidAt || p.createdAt || new Date().toISOString(),
			amountRub: Number(p.amountRub ?? (p.amountKopecks ? p.amountKopecks / 100 : 0)),
			taxCode: (p.taxDeductionCode === "2" || p.taxCode === "2"
				? "2"
				: p.taxDeductionCode === "1" || p.taxCode === "1"
					? "1"
					: resolveTaxDeductionCategoryShared(p.serviceName || p.description || "")) as "1" | "2",
		}));
	}, [activePayments]);

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

	// Desktop Keyboard Navigation: Esc closes open financial sub-modals (Invoices, PnL, options popover, cash shift)
	useEffect(() => {
		const handleKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === "Escape") {
				if (isFinanceOptionsOpen) {
					setIsFinanceOptionsOpen(false);
					return;
				}
				if (isInvoicesOpen) {
					setIsInvoicesOpen(false);
					return;
				}
				if (isPnlOpen) {
					setIsPnlOpen(false);
					return;
				}
				if (isCashShiftOpen) {
					setIsCashShiftOpen(false);
					return;
				}
				if (isCashboxOpen) {
					setIsCashboxOpen(false);
					return;
				}
				if (isBillingActOpen) {
					setIsBillingActOpen(false);
					return;
				}
				if (isQuickExpenseOpen) {
					setIsQuickExpenseOpen(false);
					return;
				}
				if (isTaxModalOpen) {
					setIsTaxModalOpen(false);
					return;
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isInvoicesOpen, isPnlOpen, isFinanceOptionsOpen, isCashShiftOpen, isCashboxOpen, isBillingActOpen, isQuickExpenseOpen, isTaxModalOpen]);

	const hasActiveClinicalRules = Boolean(
		(clinicalRuleSummary &&
			((clinicalRuleSummary.unresolved ?? 0) > 0 ||
				(clinicalRuleSummary.activeRules ?? 0) > 0)) ||
			(clinicalRuleEvaluations && clinicalRuleEvaluations.length > 0),
	);

	return {
		activePatient,
		activePayments,
		activeTreatmentPlanItems,
		activeTreatmentPlanScenarios,
		advanceOffsetRub,
		billingSummary,
		cardSumRub,
		cashDayTotals,
		cashInDrawerRub,
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
		handleCashIn,
		handleCashOut,
		handleCloseShift,
		handleOpenShift,
		handlePrintXReport,
		hasActiveClinicalRules,
		isBillingActOpen,
		isCashShiftOpen,
		isCashboxOpen,
		isFinanceOptionsOpen,
		isInvoicesOpen,
		isPaymentSaving,
		isPnlOpen,
		isQuickExpenseOpen,
		isShiftOpen,
		isTaxModalOpen,
		loadDashboard,
		money,
		onGoToDocuments,
		onGoToPrices,
		onGoToVisit,
		onRecordPayment,
		paymentAmount,
		paymentFeedback,
		paymentFiscalCashierName,
		paymentFiscalFd,
		paymentFiscalFn,
		paymentFiscalFpd,
		paymentFiscalReceiptIssuedAt,
		paymentFiscalReceiptLabel,
		paymentFiscalReceiptNumber,
		paymentFiscalReceiptUrl,
		paymentMethod,
		paymentMethodLabels,
		paymentPatientContextMessage,
		paymentPatientContextReady,
		paymentPayerBirthDate,
		paymentPayerFullName,
		paymentPayerIdentityDocument,
		paymentPayerInn,
		paymentPayerRelationship,
		paymentTaxDeductionCode,
		pendingCheckout,
		reloadAfterFamilyPayment,
		remainingDebtProp,
		sbpSumRub,
		scenarioPriorityLabels,
		scenarioStrategyLabels,
		serviceCategoryLabels,
		serviceTitle,
		setIsBillingActOpen,
		setIsCashShiftOpen,
		setIsCashboxOpen,
		setIsFinanceOptionsOpen,
		setIsInvoicesOpen,
		setIsPnlOpen,
		setIsQuickExpenseOpen,
		setIsTaxModalOpen,
		setPaymentAmount,
		setPaymentFiscalCashierName,
		setPaymentFiscalFd,
		setPaymentFiscalFn,
		setPaymentFiscalFpd,
		setPaymentFiscalReceiptIssuedAt,
		setPaymentFiscalReceiptNumber,
		setPaymentFiscalReceiptUrl,
		setPaymentMethod,
		setPaymentPayerBirthDate,
		setPaymentPayerFullName,
		setPaymentPayerIdentityDocument,
		setPaymentPayerInn,
		setPaymentPayerRelationship,
		setPaymentTaxDeductionCode,
		setPendingCheckout,
		shiftNumber,
		staffRoleLabels,
		taxDeductionPayments,
		treatmentStatusLabels,
	};
}
