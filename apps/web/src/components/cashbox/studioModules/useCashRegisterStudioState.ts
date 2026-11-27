/**
 * useCashRegisterStudioState.ts — Состояние кассовой студии (DENTE CRM).
 * Строгий расчёт в целых копейках BigInt, реальные настройки ККТ/ОФД, Zero-Leak Draft (Мандаты 8e, 8bm, 8zq).
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { generateUuidV7, formatKopecksToRub, kopecksToRubles, calculatePercentDiscountKopecks } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import {
	type CashboxTenderType,
	type ClientPayerType,
	type CashRegisterStudioTab,
	type FiscalTapeOperationItem,
	OFD_UNCONFIGURED_LABEL,
	KKT_UNCONFIGURED_LABEL,
	resolveOfdDisplayName,
	toKopecksBigInt,
	rubToKopecks,
	calculateExactCashChangeKopecks,
	generateFiscalTapeText,
} from "../cashRegisterCatalogData.js";
import type { CashRegisterStudioModalProps } from "../CashRegisterStudioModal.js";
import {
	CashRegisterNetworkError,
	isCashRegisterNetworkFailure,
	fetchClinicFiscalMeta,
	fetchCashRecentOperations,
	queuePaymentOfflineFallback,
	submitInstallmentContractApi,
	submitCashboxPaymentApi,
	toggleCashboxShiftApi,
	printFiscalXReportApi,
	buildPaymentPayload,
} from "./cashRegisterApi.js";

export interface AppliedDmsSplitKopecks {
	readonly totalDueKopecks: bigint;
	readonly dmsKopecks: bigint;
	readonly patientKopecks: bigint;
	readonly insurerName?: string | undefined;
	readonly letterNumber?: string | undefined;
	readonly letterId?: string | undefined;
}

export function useCashRegisterStudioState(props: CashRegisterStudioModalProps) {
	const {
		isOpen, initialTab = "checkout", mode = "studio", shiftNumber = 1,
		cashierFullName = "Кассир", clinicLegalName, kktRegNumber: propKktRegNumber,
		ofdName: propOfdName, isShiftOpen: initialShiftOpen = true,
		netRevenueKopecks: propNetRevenueKopecks,
		cashInDrawerKopecks: propCashDrawerKopecks,
		cardSumKopecks: propCardSumKopecks,
		sbpSumKopecks: propSbpSumKopecks,
		advanceOffsetKopecks: propAdvanceSumKopecks,
		patientDepositKopecks: propPatientDepositKopecks,
		patientFamilyBalanceKopecks: propPatientFamilyBalanceKopecks,
		totalDueKopecks: propTotalDueKopecks, amountKopecks: propAmountKopecks,
		initialWarranty100 = false, visitId: propVisitId, patientId: propPatientId,
		invoiceId: propInvoiceId, defaultMethod = "card", initialPaymentMethod,
		printFormat: initialPrintFormat = "tape_80mm", onClose,
	} = props;

	const rawBaseDueKopecks = useMemo(() => {
		if (propTotalDueKopecks !== undefined) return toKopecksBigInt(propTotalDueKopecks);
		if (propAmountKopecks !== undefined) return toKopecksBigInt(propAmountKopecks);
		return 0n;
	}, [propTotalDueKopecks, propAmountKopecks]);

	const initialCashDrawerKopecks = useMemo(() => toKopecksBigInt(propCashDrawerKopecks), [propCashDrawerKopecks]);
	const initialCardSumKopecks = useMemo(() => toKopecksBigInt(propCardSumKopecks), [propCardSumKopecks]);
	const initialSbpSumKopecks = useMemo(() => toKopecksBigInt(propSbpSumKopecks), [propSbpSumKopecks]);
	const initialAdvanceSumKopecks = useMemo(() => toKopecksBigInt(propAdvanceSumKopecks), [propAdvanceSumKopecks]);
	const patientDepositKopecks = useMemo(() => toKopecksBigInt(propPatientDepositKopecks), [propPatientDepositKopecks]);
	const patientFamilyBalanceKopecks = useMemo(() => toKopecksBigInt(propPatientFamilyBalanceKopecks), [propPatientFamilyBalanceKopecks]);

	const [clinicFiscalMeta, setClinicFiscalMeta] = useState<{ kktRegNumber: string; ofdName: string } | null>(null);
	useEffect(() => {
		if (!isOpen || typeof fetch !== "function" || (propKktRegNumber?.trim() && propOfdName?.trim())) return;
		let isCancelled = false;
		void fetchClinicFiscalMeta()
			.then((meta) => { if (!isCancelled && meta) setClinicFiscalMeta(meta); })
			.catch((err) => { clientLogger.warn("[useCashRegisterStudioState] Ошибка чтения настроек ККТ", err, { module: "Cashbox" }); });
		return () => { isCancelled = true; };
	}, [isOpen, propKktRegNumber, propOfdName]);

	const effectiveKktRegNumber = propKktRegNumber?.trim() || clinicFiscalMeta?.kktRegNumber || KKT_UNCONFIGURED_LABEL;
	const effectiveOfdName = propOfdName?.trim()
		? resolveOfdDisplayName(propOfdName)
		: (clinicFiscalMeta?.ofdName || OFD_UNCONFIGURED_LABEL);

	const [customBaseDueKopecks, setCustomBaseDueKopecks] = useState<bigint | null>(null);
	const [appliedDmsSplit, setAppliedDmsSplit] = useState<AppliedDmsSplitKopecks | null>(null);
	const baseDueKopecks = customBaseDueKopecks ?? rawBaseDueKopecks;

	const normalizedTab: CashRegisterStudioTab =
		mode === "shift" || initialTab === "reconciliation" || initialTab === "drawer"
			? "shift"
			: initialTab === "tape" || initialTab === "history"
				? "tape"
				: "checkout";

	const [activeTab, setActiveTab] = useState<CashRegisterStudioTab>(normalizedTab);
	const [isShiftActive, setIsShiftActive] = useState<boolean>(initialShiftOpen);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	const initialMethod = initialPaymentMethod ?? defaultMethod;
	const [method, setMethod] = useState<CashboxTenderType>(initialMethod);
	const [isWarranty, setIsWarranty] = useState<boolean>(initialWarranty100);
	const [discountPercent, setDiscountPercent] = useState<number>(initialWarranty100 ? 100 : 0);
	const [payerType, setPayerType] = useState<ClientPayerType>("physical_person");
	const [buyerInn, setBuyerInn] = useState<string>("");
	const [cashReceivedKopecks, setCashReceivedKopecks] = useState<bigint>(baseDueKopecks);
	const [fiscalize, setFiscalize] = useState<boolean>(true);
	const [printFormat, setPrintFormat] = useState<string>(initialPrintFormat);
	const [countedCashInput, setCountedCashInput] = useState<string>(String(kopecksToRubles(Number(initialCashDrawerKopecks))));
	const [installmentMonths, setInstallmentMonths] = useState<3 | 6 | 12>(6);
	const [certificateNumber, setCertificateNumber] = useState<string>("");

	const [splitCashKopecks, setSplitCashKopecks] = useState<bigint>(0n);
	const [splitCardKopecks, setSplitCardKopecks] = useState<bigint>(baseDueKopecks);
	const [splitSbpKopecks, setSplitSbpKopecks] = useState<bigint>(0n);
	const [splitDepositKopecks, setSplitDepositKopecks] = useState<bigint>(0n);
	const [splitBonusKopecks, setSplitBonusKopecks] = useState<bigint>(0n);
	const [splitCertKopecks, setSplitCertKopecks] = useState<bigint>(0n);
	const [splitCashReceivedKopecks, setSplitCashReceivedKopecks] = useState<bigint>(0n);

	const resetCheckoutDraft = useCallback(() => {
		setActiveTab(normalizedTab);
		setErrorMessage(null);
		setCustomBaseDueKopecks(null);
		setAppliedDmsSplit(null);
		setMethod(initialMethod);
		setIsWarranty(initialWarranty100);
		setDiscountPercent(initialWarranty100 ? 100 : 0);
		setPayerType("physical_person");
		setBuyerInn("");
		setCashReceivedKopecks(rawBaseDueKopecks);
		setFiscalize(true);
		setPrintFormat(initialPrintFormat);
		setCountedCashInput(String(kopecksToRubles(Number(initialCashDrawerKopecks))));
		setInstallmentMonths(6);
		setCertificateNumber("");
		setSplitCashKopecks(0n);
		setSplitCardKopecks(rawBaseDueKopecks);
		setSplitSbpKopecks(0n);
		setSplitDepositKopecks(0n);
		setSplitBonusKopecks(0n);
		setSplitCertKopecks(0n);
		setSplitCashReceivedKopecks(0n);
	}, [normalizedTab, initialMethod, initialWarranty100, rawBaseDueKopecks, initialPrintFormat, initialCashDrawerKopecks]);

	const handleClose = useCallback(() => {
		resetCheckoutDraft();
		onClose();
	}, [resetCheckoutDraft, onClose]);

	const prevContextKeyRef = useRef(`${propPatientId ?? ""}:${propInvoiceId ?? ""}`);
	useEffect(() => {
		const nextKey = `${propPatientId ?? ""}:${propInvoiceId ?? ""}`;
		if (prevContextKeyRef.current !== nextKey) {
			prevContextKeyRef.current = nextKey;
			resetCheckoutDraft();
		}
	}, [propPatientId, propInvoiceId, resetCheckoutDraft]);

	const wasOpenRef = useRef(isOpen);
	useEffect(() => {
		if (wasOpenRef.current && !isOpen) resetCheckoutDraft();
		wasOpenRef.current = isOpen;
	}, [isOpen, resetCheckoutDraft]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape" && isOpen) handleClose(); };
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, handleClose]);

	const isWarrantyCase = isWarranty || method === "warranty";
	const discountKopecks = isWarrantyCase ? baseDueKopecks : BigInt(calculatePercentDiscountKopecks(baseDueKopecks, discountPercent));
	const effectiveTotalKopecks = isWarrantyCase ? 0n : baseDueKopecks - discountKopecks;

	const changeResult = useMemo(
		() => calculateExactCashChangeKopecks(cashReceivedKopecks, effectiveTotalKopecks),
		[cashReceivedKopecks, effectiveTotalKopecks],
	);

	const appliedDmsKopecks = appliedDmsSplit ? appliedDmsSplit.dmsKopecks : 0n;
	const totalSplitAllocatedKopecks = splitCashKopecks + splitCardKopecks + splitSbpKopecks + splitDepositKopecks + splitBonusKopecks + splitCertKopecks + (method === "split" ? appliedDmsKopecks : 0n);
	const splitDiffKopecks = effectiveTotalKopecks - totalSplitAllocatedKopecks;
	const isSplitBalanced = splitDiffKopecks === 0n;

	useEffect(() => {
		const handleApplySplit = (e: Event) => {
			if (!("detail" in e) || typeof e.detail !== "object" || e.detail === null) return;
			const d = e.detail as {
				totalDueKopecks?: bigint | number | string | undefined;
				dmsKopecks?: bigint | number | string | undefined;
				patientKopecks?: bigint | number | string | undefined;
				totalDueRub?: number | undefined;
				dmsRub?: number | undefined;
				patientRub?: number | undefined;
				patientCopayRub?: number | undefined;
				patientMethod?: CashboxTenderType | undefined;
				patientCashRub?: number | undefined;
				patientCardRub?: number | undefined;
				letterId?: string | undefined;
				letterNumber?: string | undefined;
				insurerName?: string | undefined;
			};
			const copayKop = d.patientKopecks !== undefined ? toKopecksBigInt(d.patientKopecks) : toKopecksBigInt(null, d.patientRub ?? d.patientCopayRub ?? 0);
			const dmsKop = d.dmsKopecks !== undefined ? toKopecksBigInt(d.dmsKopecks) : toKopecksBigInt(null, d.dmsRub ?? 0);
			const totalKop = d.totalDueKopecks !== undefined ? toKopecksBigInt(d.totalDueKopecks) : d.totalDueRub !== undefined ? toKopecksBigInt(null, d.totalDueRub) : copayKop + dmsKop;

			setCustomBaseDueKopecks(totalKop);
			setAppliedDmsSplit({ totalDueKopecks: totalKop, dmsKopecks: dmsKop, patientKopecks: copayKop, insurerName: d.insurerName, letterNumber: d.letterNumber, letterId: d.letterId });

			if (copayKop > 0n && dmsKop > 0n) {
				setMethod("split");
				if (d.patientCashRub !== undefined && d.patientCardRub !== undefined && (d.patientCashRub > 0 || d.patientCardRub > 0)) {
					const patCashKop = rubToKopecks(d.patientCashRub);
					setSplitCashKopecks(patCashKop);
					setSplitCardKopecks(rubToKopecks(d.patientCardRub));
					setCashReceivedKopecks(patCashKop);
				} else if (d.patientMethod === "cash") {
					setSplitCashKopecks(copayKop);
					setSplitCardKopecks(0n);
					setCashReceivedKopecks(copayKop);
				} else {
					setSplitCardKopecks(copayKop);
					setSplitCashKopecks(0n);
					setCashReceivedKopecks(0n);
				}
			} else if (copayKop === 0n && dmsKop > 0n) {
				setMethod("insurance");
				setSplitCashKopecks(0n);
				setSplitCardKopecks(0n);
				setCashReceivedKopecks(0n);
			} else if (d.patientMethod === "cash") {
				setMethod("cash");
				setCashReceivedKopecks(copayKop);
				setSplitCashKopecks(copayKop);
				setSplitCardKopecks(0n);
			} else {
				setMethod("card");
				setSplitCardKopecks(copayKop);
				setSplitCashKopecks(0n);
				setCashReceivedKopecks(0n);
			}
			setSplitSbpKopecks(0n);
			setSplitDepositKopecks(0n);
			setActiveTab("checkout");
			showToast(`Применен сплит ДМС: страховая ${formatKopecksToRub(dmsKop)}, к доплате ${formatKopecksToRub(copayKop)}`, "success");
		};
		window.addEventListener("dente:cashbox-apply-split", handleApplySplit);
		return () => { window.removeEventListener("dente:cashbox-apply-split", handleApplySplit); };
	}, []);

	const splitCashChange = useMemo(() => {
		if (splitCashReceivedKopecks <= 0n || splitCashKopecks <= 0n) return null;
		return calculateExactCashChangeKopecks(splitCashReceivedKopecks, splitCashKopecks);
	}, [splitCashReceivedKopecks, splitCashKopecks]);

	const handleBalanceSplit = useCallback((field: "cash" | "card" | "sbp" | "deposit" | "bonus" | "certificate") => {
		const map = { cash: splitCashKopecks, card: splitCardKopecks, sbp: splitSbpKopecks, deposit: splitDepositKopecks, bonus: splitBonusKopecks, certificate: splitCertKopecks };
		const target = map[field] + splitDiffKopecks;
		const safeTarget = target > 0n ? target : 0n;
		if (field === "cash") { setSplitCashKopecks(safeTarget); setSplitCashReceivedKopecks(safeTarget); }
		else if (field === "card") setSplitCardKopecks(safeTarget);
		else if (field === "sbp") setSplitSbpKopecks(safeTarget);
		else if (field === "deposit") setSplitDepositKopecks(safeTarget);
		else if (field === "bonus") setSplitBonusKopecks(safeTarget);
		else setSplitCertKopecks(safeTarget);
	}, [splitCashKopecks, splitCardKopecks, splitSbpKopecks, splitDepositKopecks, splitBonusKopecks, splitCertKopecks, splitDiffKopecks]);

	const [recentOperations, setRecentOperations] = useState<FiscalTapeOperationItem[]>([]);
	useEffect(() => {
		if (!isOpen || typeof fetch !== "function") return;
		let isCancelled = false;
		void fetchCashRecentOperations()
			.then((ops) => { if (!isCancelled) setRecentOperations(ops); })
			.catch((err) => { clientLogger.warn("[useCashRegisterStudioState] Ошибка чтения операций кассы", err, { module: "Cashbox" }); });
		return () => { isCancelled = true; };
	}, [isOpen, isShiftActive]);

	const totalShiftKopecks = initialCashDrawerKopecks + initialCardSumKopecks + initialSbpSumKopecks + initialAdvanceSumKopecks;
	const calculatedNetRevenueKopecks = useMemo(
		() => propNetRevenueKopecks !== undefined
			? toKopecksBigInt(propNetRevenueKopecks)
			: totalShiftKopecks,
		[propNetRevenueKopecks, totalShiftKopecks],
	);

	const tapeText = useMemo(() => generateFiscalTapeText({
		shiftNumber, cashierFullName, clinicLegalName, kktRegNumber: effectiveKktRegNumber,
		ofdName: effectiveOfdName, netRevenueKopecks: calculatedNetRevenueKopecks,
		cashInDrawerKopecks: initialCashDrawerKopecks, cardSumKopecks: initialCardSumKopecks,
		sbpSumKopecks: initialSbpSumKopecks, advanceOffsetKopecks: initialAdvanceSumKopecks,
		operations: recentOperations, width: printFormat === "tape_58mm" ? "tape_58mm" : "tape_80mm",
	}), [shiftNumber, cashierFullName, clinicLegalName, effectiveKktRegNumber, effectiveOfdName, calculatedNetRevenueKopecks, initialCashDrawerKopecks, initialCardSumKopecks, initialSbpSumKopecks, initialAdvanceSumKopecks, recentOperations, printFormat]);

	const notifyPaymentSuccess = useCallback((result: Record<string, unknown>) => {
		if (props.onSuccess) {
			props.onSuccess(result);
		} else {
			props.onPaymentComplete?.();
		}
		props.onConfirmPayment?.(result);
		handleClose();
	}, [props, handleClose]);

	const handleExecutePayment = useCallback(async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage(null);

		const isWarrantyCaseFinal = isWarranty || effectiveTotalKopecks === 0n;
		const clientMutationId = generateUuidV7();
		const effectiveVisitId = propVisitId || props.visitId || undefined;
		const isRetailSale = !props.patientId || props.patientId === "pat-walkin";

		const offlineArgs = {
			patientId: props.patientId, patientName: props.patientName, visitId: effectiveVisitId, invoiceId: props.invoiceId,
			effectiveTotalKopecks, isWarrantyCaseFinal, method, splitCashKopecks, splitCardKopecks, splitSbpKopecks,
			splitDepositKopecks, splitBonusKopecks, splitCertKopecks, certificateNumber, serviceTitle: props.serviceTitle,
			cashierFullName, doctorFullName: props.doctorFullName, patientPhone: props.patientPhone, fiscalize, clientMutationId,
		};

		if (typeof navigator !== "undefined" && !navigator.onLine) {
			try {
				const offlineResult = await queuePaymentOfflineFallback(offlineArgs);
				showToast("Платёж сохранён в локальной очереди кассы. Будет синхронизирован с сервером при восстановлении связи", "info", 7000);
				notifyPaymentSuccess(offlineResult);
				return;
			} catch (err) {
				clientLogger.warn("[useCashRegisterStudioState] Офлайн-очередь недоступна", err, { module: "Cashbox" });
			}
		}

		if (method === "installment" && !isWarrantyCaseFinal) {
			if (isRetailSale || !props.patientId) {
				setIsSubmitting(false);
				showToast("Оформление рассрочки возможно только для зарегистрированного пациента клиники.", "error");
				return;
			}
			try {
				const { contract } = await submitInstallmentContractApi({
					patientId: props.patientId, invoiceId: props.invoiceId, visitId: effectiveVisitId,
					effectiveTotalKopecks, installmentMonths, clientMutationId,
				});
				showToast(`Договор рассрочки ${contract?.contractNumber || ""} на ${installmentMonths} мес. успешно оформлен`, "success");
				notifyPaymentSuccess({
					success: true, amountKopecks: Number(effectiveTotalKopecks),
					effectiveTotalRub: kopecksToRubles(Number(effectiveTotalKopecks)),
					method: "installment", clientMutationId, visitId: effectiveVisitId, contract,
				});
				return;
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Не удалось оформить договор рассрочки";
				setErrorMessage(msg);
				showToast(msg, "error");
				return;
			} finally {
				setIsSubmitting(false);
			}
		}

		const payload = buildPaymentPayload({
			patientId: props.patientId, visitId: effectiveVisitId, invoiceId: props.invoiceId, isRetailSale,
			isWarrantyCaseFinal, effectiveTotalKopecks, method, cashierFullName, payerType, buyerInn, printFormat,
			clientMutationId, splitCashKopecks, splitCardKopecks, splitSbpKopecks, splitDepositKopecks,
			splitBonusKopecks, splitCertKopecks, certificateNumber,
			dmsKopecks: appliedDmsSplit?.dmsKopecks, dmsLetterId: appliedDmsSplit?.letterId,
		});

		try {
			const paymentResult = await submitCashboxPaymentApi({
				payload, clientMutationId,
				fallbackResult: {
					success: true, amountKopecks: isWarrantyCaseFinal ? 0 : Number(effectiveTotalKopecks),
					effectiveTotalRub: isWarrantyCaseFinal ? 0 : kopecksToRubles(Number(effectiveTotalKopecks)),
					method, clientMutationId, visitId: effectiveVisitId,
				},
			});
			showToast(
				isWarrantyCaseFinal ? "Гарантийный расчёт оформлен (0 ₽)" : `Оплата успешно принята: ${formatKopecksToRub(effectiveTotalKopecks)}`,
				"success",
			);
			notifyPaymentSuccess(paymentResult);
		} catch (err: unknown) {
			const status = err instanceof CashRegisterNetworkError ? err.status : (typeof err === "object" && err !== null && "status" in err && typeof err.status === "number" ? err.status : undefined);
			if (isCashRegisterNetworkFailure(err, status)) {
				try {
					const offlineResult = await queuePaymentOfflineFallback(offlineArgs);
					showToast("Платёж сохранён в локальной очереди кассы. Будет синхронизирован с сервером при восстановлении связи", "info", 7000);
					notifyPaymentSuccess(offlineResult);
					return;
				} catch (queueErr) {
					clientLogger.warn("[useCashRegisterStudioState] Ошибка записи офлайн-платежа", queueErr, { module: "Cashbox" });
				}
			}
			const errorMsg = err instanceof Error ? err.message : "Ошибка связи с сервером кассы. Платёж не проведён.";
			setErrorMessage(errorMsg);
			showToast(errorMsg, "error", 5000);
		} finally {
			setIsSubmitting(false);
		}
	}, [isSubmitting, isWarranty, effectiveTotalKopecks, method, certificateNumber, splitCashKopecks, splitCardKopecks, splitSbpKopecks, splitDepositKopecks, splitBonusKopecks, splitCertKopecks, props, propVisitId, cashierFullName, payerType, buyerInn, printFormat, appliedDmsSplit, installmentMonths, fiscalize, notifyPaymentSuccess]);

	const handleToggleShift = useCallback(async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		try {
			if (isShiftActive) {
				const closeFn = props.onCloseShiftAction || props.onCloseShift;
				if (closeFn) await closeFn();
				else await toggleCashboxShiftApi("close", cashierFullName);
				setIsShiftActive(false);
				showToast(`Кассовая смена №${shiftNumber} закрыта, Z-отчёт сформирован`, "success");
			} else {
				const openFn = props.onOpenShiftAction || props.onOpenShift;
				if (openFn) await openFn();
				else await toggleCashboxShiftApi("open", cashierFullName);
				setIsShiftActive(true);
				showToast(`Кассовая смена №${shiftNumber} успешно открыта`, "success");
			}
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Ошибка при изменении статуса кассовой смены", "error");
		} finally {
			setIsSubmitting(false);
		}
	}, [isSubmitting, isShiftActive, props, cashierFullName, shiftNumber]);

	const handlePrintXReport = useCallback(async () => {
		try {
			const fn = props.onPrintXReportAction || props.onPrintXReport;
			if (fn) {
				await fn();
			} else {
				await printFiscalXReportApi(cashierFullName);
			}
			showToast(`X-отчёт смены №${shiftNumber} сформирован`, "info");
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Не удалось сформировать X-отчёт", "error");
		}
	}, [props, cashierFullName, shiftNumber]);

	const handleCopyTape = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(tapeText);
			setIsCopied(true);
			showToast("Чековая лента скопирована в буфер обмена", "info");
			setTimeout(() => setIsCopied(false), 2000);
		}
	}, [tapeText]);

	return {
		baseDueKopecks, effectiveTotalKopecks, patientDepositKopecks, patientFamilyBalanceKopecks,
		initialCashDrawerKopecks, initialCardSumKopecks, initialSbpSumKopecks, initialAdvanceSumKopecks,
		calculatedNetRevenueKopecks, effectiveKktRegNumber, effectiveOfdName, activeTab, setActiveTab,
		isShiftActive, isSubmitting, errorMessage, setErrorMessage, isCopied, method, setMethod,
		isWarranty, setIsWarranty, discountPercent, setDiscountPercent, payerType, setPayerType,
		buyerInn, setBuyerInn, cashReceivedKopecks, setCashReceivedKopecks, fiscalize, setFiscalize,
		printFormat, setPrintFormat, countedCashInput, setCountedCashInput, installmentMonths, setInstallmentMonths,
		certificateNumber, setCertificateNumber, splitCashKopecks, setSplitCashKopecks, splitCardKopecks, setSplitCardKopecks,
		splitSbpKopecks, setSplitSbpKopecks, splitDepositKopecks, setSplitDepositKopecks, splitBonusKopecks, setSplitBonusKopecks,
		splitCertKopecks, setSplitCertKopecks, splitCashReceivedKopecks, setSplitCashReceivedKopecks,
		changeResult, isSplitBalanced, splitDiffKopecks, splitCashChange, tapeText, appliedDmsSplit,
		handleBalanceSplit, handleExecutePayment, handleToggleShift, handlePrintXReport, handleCopyTape, handleClose,
	};
}
