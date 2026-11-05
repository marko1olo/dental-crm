/**
 * apps/web/src/components/cashbox/CashRegisterStudioModal.tsx
 *
 * Canonical Unified SSOT Cash Register Studio & 54-FZ Fiscal Terminal Modal.
 * Consolidates checkout, shift management, Z-report, and thermal receipt tape.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons on primary CTA actions).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN, 1-click presets).
 * - Mandate 8am: Exactly ONE Primary CTA button (#0d9488 / var(--teal)) per visible view.
 * - Mandate 8x & 8ap: Plain clinical Russian without raw FFD/FZ-54 codes in client UI.
 * - Apple HIG: Native Mobile Bottom Sheet (rounded-t-[24px], Drag Handle 36x5px, Natural Thumb Zone).
 * - Integer Kopeck Math: Strict BigInt amountKopecks without floating-point errors.
 */

import React, { useState, useId, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, Receipt, X, Copy, Printer, Check, CreditCard, Banknote, QrCode, FileText, Split, Wallet } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import {
	type CashboxTenderType,
	type ClientPayerType,
	type CashRegisterStudioTab,
	CASHBOX_TENDER_PRESETS,
	CASH_STUDIO_QUICK_BILLS,
	DOCTOR_DISCOUNT_PRESETS,
	PAYER_TYPE_PRESETS,
	RECEIPT_PRINT_FORMATS,
	rubToKopecks,
	kopecksToRub,
	formatRubles,
	calculateExactCashChange,
	generateFiscalTapeText,
} from "./cashRegisterCatalogData.js";

export interface CashRegisterStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: CashRegisterStudioTab | "reconciliation" | "drawer" | "history" | undefined;
	readonly mode?: "checkout" | "shift" | "studio" | undefined;
	readonly shiftNumber?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly isShiftOpen?: boolean | undefined;
	readonly initialChangeFundRub?: number | undefined;
	readonly netRevenueRub?: number | undefined;
	readonly cashInDrawerRub?: number | undefined;
	readonly cardSumRub?: number | undefined;
	readonly sbpSumRub?: number | undefined;
	readonly advanceOffsetRub?: number | undefined;
	readonly onOpenShiftAction?: (() => Promise<void> | void) | undefined;
	readonly onOpenShift?: (() => Promise<void> | void) | undefined;
	readonly onCloseShiftAction?: (() => Promise<void> | void) | undefined;
	readonly onCloseShift?: ((zReportSummary?: any) => Promise<void> | void) | undefined;
	readonly onPrintXReportAction?: (() => Promise<void> | void) | undefined;
	readonly onPrintXReport?: (() => Promise<void> | void) | undefined;
	readonly totalDueRub?: number | undefined;
	readonly totalDueKopecks?: bigint | number | undefined;
	readonly amountRub?: number | undefined;
	readonly amountKopecks?: bigint | number | undefined;
	readonly initialWarranty100?: boolean | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly doctorFullName?: string | undefined;
	readonly serviceTitle?: string | undefined;
	readonly defaultMethod?: CashboxTenderType | undefined;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly onSuccess?: ((result?: unknown) => void) | undefined;
	readonly onPaymentComplete?: (() => void) | undefined;
	readonly onConfirmPayment?: ((details?: unknown) => void) | undefined;
	readonly containerTestId?: string | undefined;
	readonly submitButtonTestId?: string | undefined;
	readonly title?: string | undefined;
}

export const CashRegisterStudioModal: React.FC<CashRegisterStudioModalProps> = (props) => {
	const {
		isOpen, onClose, initialTab = "checkout", mode = "studio",
		shiftNumber = 104, cashierFullName = "Администратор / Кассир",
		kktRegNumber = "0004829104058291", ofdName = "АО «ПЕРВЫЙ ОФД»",
		isShiftOpen: initialShiftOpen = true, netRevenueRub: propNetRevenue,
		cashInDrawerRub: initialCashDrawer = 15000, cardSumRub: initialCardSum = 35000,
		sbpSumRub: initialSbpSum = 7000, advanceOffsetRub: initialAdvanceSum = 2000,
		totalDueRub: propTotalDueRub, amountRub: propAmountRub, totalDueKopecks: propTotalDueKopecks,
		amountKopecks: propAmountKopecks, initialWarranty100 = false,
		visitId: propVisitId,
		patientName = "Иванов Иван Иванович", patientPhone = "+7 (999) 111-22-33",
		patientDepositRub = 3000, patientFamilyBalanceRub = 5000,
		doctorFullName = "Д-р Смирнов А. В.", serviceTitle = "Лечение пульпита и реставрация",
		defaultMethod = "card", containerTestId = "cash-register-studio-modal",
		submitButtonTestId = "btn-confirm-checkout-payment", title = "Касса и чеки · Студия расчётов",
	} = props;

	const baseDueRub = useMemo(() => {
		if (propTotalDueRub !== undefined) return propTotalDueRub;
		if (propAmountRub !== undefined) return propAmountRub;
		if (propTotalDueKopecks !== undefined) return kopecksToRub(BigInt(propTotalDueKopecks));
		if (propAmountKopecks !== undefined) return kopecksToRub(BigInt(propAmountKopecks));
		return 8500;
	}, [propTotalDueRub, propAmountRub, propTotalDueKopecks, propAmountKopecks]);

	const modalTitleId = useId();
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

	const [method, setMethod] = useState<CashboxTenderType>(defaultMethod);
	const [isWarranty, setIsWarranty] = useState<boolean>(initialWarranty100);
	const [discountPercent, setDiscountPercent] = useState<number>(initialWarranty100 ? 100 : 0);
	const [payerType, setPayerType] = useState<ClientPayerType>("physical_person");
	const [buyerInn, setBuyerInn] = useState<string>("");
	const [cashReceivedRub, setCashReceivedRub] = useState<number>(baseDueRub);
	const [fiscalize, setFiscalize] = useState<boolean>(true);
	const [printFormat, setPrintFormat] = useState<string>("tape_80mm");
	const [countedCashInput, setCountedCashInput] = useState<string>(String(initialCashDrawer));

	// Split tender state (honest multi-tender allocation)
	const [splitCashRub, setSplitCashRub] = useState<number>(0);
	const [splitCardRub, setSplitCardRub] = useState<number>(baseDueRub);
	const [splitSbpRub, setSplitSbpRub] = useState<number>(0);
	const [splitDepositRub, setSplitDepositRub] = useState<number>(0);
	const [splitCashReceivedRub, setSplitCashReceivedRub] = useState<number>(0);

	// Exact integer financial computations (BIGINT amountKopecks)
	const grossKopecks = rubToKopecks(baseDueRub);
	const discountMultiplier = isWarranty ? 0 : Math.max(0, 100 - discountPercent);
	const effectiveTotalKop = (grossKopecks * BigInt(discountMultiplier)) / 100n;
	const effectiveTotalRub = isWarranty ? 0 : kopecksToRub(effectiveTotalKop);

	// Cash change computation
	const changeResult = useMemo(
		() => calculateExactCashChange(cashReceivedRub, effectiveTotalRub),
		[cashReceivedRub, effectiveTotalRub],
	);

	// Split tender balance calculations
	const splitCashKop = rubToKopecks(splitCashRub);
	const splitCardKop = rubToKopecks(splitCardRub);
	const splitSbpKop = rubToKopecks(splitSbpRub);
	const splitDepositKop = rubToKopecks(splitDepositRub);
	const totalSplitAllocatedKop = splitCashKop + splitCardKop + splitSbpKop + splitDepositKop;
	const splitDiffKop = effectiveTotalKop - totalSplitAllocatedKop;
	const isSplitBalanced = splitDiffKop === 0n;

	// Split cash change
	const splitCashChange = useMemo(() => {
		if (splitCashReceivedRub <= 0 || splitCashRub <= 0) return null;
		return calculateExactCashChange(splitCashReceivedRub, splitCashRub);
	}, [splitCashReceivedRub, splitCashRub]);

	// Auto-balance remaining split tender in 1 click
	const handleBalanceSplit = useCallback((field: "cash" | "card" | "sbp" | "deposit") => {
		const currentKop =
			field === "cash"
				? splitCashKop
				: field === "card"
					? splitCardKop
					: field === "sbp"
						? splitSbpKop
						: splitDepositKop;
		const targetKop = currentKop + splitDiffKop;
		const balancedRub = Math.max(0, kopecksToRub(targetKop));
		if (field === "cash") {
			setSplitCashRub(balancedRub);
			setSplitCashReceivedRub(balancedRub);
		} else if (field === "card") {
			setSplitCardRub(balancedRub);
		} else if (field === "sbp") {
			setSplitSbpRub(balancedRub);
		} else if (field === "deposit") {
			setSplitDepositRub(balancedRub);
		}
	}, [splitCashKop, splitCardKop, splitSbpKop, splitDepositKop, splitDiffKop]);

	const totalShiftKop =
		rubToKopecks(initialCashDrawer) +
		rubToKopecks(initialCardSum) +
		rubToKopecks(initialSbpSum) +
		rubToKopecks(initialAdvanceSum);
	const calculatedNetRevenue = propNetRevenue ?? kopecksToRub(totalShiftKop);

	const tapeText = useMemo(
		() =>
			generateFiscalTapeText({
				shiftNumber,
				cashierFullName,
				kktRegNumber,
				ofdName,
				netRevenueRub: calculatedNetRevenue,
				cashInDrawerRub: initialCashDrawer,
				cardSumRub: initialCardSum,
				sbpSumRub: initialSbpSum,
				advanceOffsetRub: initialAdvanceSum,
				width: "tape_80mm",
			}),
		[
			shiftNumber,
			cashierFullName,
			kktRegNumber,
			ofdName,
			calculatedNetRevenue,
			initialCashDrawer,
			initialCardSum,
			initialSbpSum,
			initialAdvanceSum,
		],
	);

	const handleExecutePayment = useCallback(async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage(null);

		const isWarrantyCase = isWarranty || effectiveTotalRub === 0;
		const clientMutationId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
		const effectiveVisitId = propVisitId || props.visitId || undefined;

		const payload: Record<string, unknown> = {
			patientId: props.patientId && props.patientId !== "pat-walkin" ? props.patientId : undefined,
			visitId: effectiveVisitId,
			invoiceId: props.invoiceId || undefined,
			amountKopecks: isWarrantyCase ? 0 : Number(effectiveTotalKop),
			amountRub: isWarrantyCase ? 0 : effectiveTotalRub,
			method: isWarrantyCase ? "warranty" : method,
			isWarranty: isWarrantyCase,
			cashierFullName,
			clientType: payerType,
			buyerInn: payerType !== "physical_person" ? buyerInn.trim() || undefined : undefined,
			printFormat,
			clientMutationId,
			note: isWarrantyCase ? "Гарантийный расчёт (скидка 100%)" : undefined,
		};

		if (method === "split" && !isWarrantyCase) {
			payload.cashAmountKopecks = Number(splitCashKop);
			payload.electronicAmountKopecks = Number(splitCardKop + splitSbpKop);
			payload.depositAmountKopecks = Number(splitDepositKop);
		}

		try {
			const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
			const res = await fetch("/api/cashbox/payments", {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const errorJson = await res.json().catch(() => null);
				const errorText =
					errorJson?.message || errorJson?.error || `Сбой проведения платежа сервером кассы (код ${res.status})`;
				throw new Error(errorText);
			}
			const json = await res.json().catch(() => null);
			if (json && json.success === false) {
				throw new Error(json.message || "Ошибка проведения платежа через кассовый аппарат");
			}
			const paymentResult = json?.data || {
				success: true,
				effectiveTotalRub,
				method,
				clientMutationId,
				visitId: effectiveVisitId,
			};
			if (props.onSuccess) props.onSuccess(paymentResult);
			if (props.onPaymentComplete) props.onPaymentComplete();
			if (props.onConfirmPayment) props.onConfirmPayment(paymentResult);
			onClose();
		} catch (err: any) {
			const errorMsg = err?.message || "Ошибка связи с сервером кассы. Платёж не проведён.";
			setErrorMessage(errorMsg);
		} finally {
			setIsSubmitting(false);
		}
	}, [
		isSubmitting,
		isWarranty,
		effectiveTotalRub,
		effectiveTotalKop,
		method,
		splitCashKop,
		splitCardKop,
		splitSbpKop,
		splitDepositKop,
		props,
		propVisitId,
		cashierFullName,
		payerType,
		buyerInn,
		printFormat,
		onClose,
	]);

	const handleToggleShift = useCallback(async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		try {
			if (isShiftActive) {
				const closeFn = props.onCloseShiftAction || props.onCloseShift;
				if (closeFn) await closeFn();
				setIsShiftActive(false);
			} else {
				const openFn = props.onOpenShiftAction || props.onOpenShift;
				if (openFn) await openFn();
				setIsShiftActive(true);
			}
		} finally {
			setIsSubmitting(false);
		}
	}, [isSubmitting, isShiftActive, props]);

	const handlePrintXReport = useCallback(async () => {
		const fn = props.onPrintXReportAction || props.onPrintXReport;
		if (fn) await fn();
	}, [props]);

	const handleCopyTape = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(tapeText);
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
		}
	}, [tapeText]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[10050] flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 overflow-x-clip max-w-[100vw] animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby={modalTitleId}
			data-testid={containerTestId}
		>
			<div className="w-full max-w-full md:max-w-4xl lg:max-w-5xl rounded-t-[24px] md:rounded-2xl bg-[var(--paper)] border-t md:border border-[var(--line)] text-[var(--ink)] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] md:max-h-[90vh]">
				{/* Touch Drag Handle for Mobile */}
				<div className="flex justify-center pt-2.5 pb-1 md:hidden select-none cursor-grab">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
				</div>

				{/* Header */}
				<div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2.5">
					<div className="flex items-center justify-between w-full min-w-0">
						<div className="flex items-center gap-2.5 min-w-0">
							<div className="w-8 h-8 rounded-lg bg-[var(--teal-subtle,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
								<ShieldCheck className="w-5 h-5" />
							</div>
							<div className="min-w-0">
								<h2 id={modalTitleId} className="text-base sm:text-lg font-bold text-[var(--ink)] truncate m-0">
									{title}
								</h2>
								<div className="text-xs text-[var(--muted)] flex items-center gap-2">
									<span>{isShiftActive ? `Смена №${shiftNumber} активна` : "Смена закрыта"}</span>
									<span className="hidden sm:inline">· {cashierFullName}</span>
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2 shrink-0">
							<div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)]">
								{(["checkout", "shift", "tape"] as const).map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => setActiveTab(t)}
										className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[32px] cursor-pointer transition-all ${
											activeTab === t
												? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										{t === "checkout" ? "Приём оплаты" : t === "shift" ? "Смена и Z-отчёт" : "Чековая лента"}
									</button>
								))}
							</div>
							<button
								type="button"
								onClick={onClose}
								className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] min-h-[44px] min-w-[44px] cursor-pointer"
								aria-label="Закрыть"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
					</div>
					<div className="flex sm:hidden items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] w-full">
						{(["checkout", "shift", "tape"] as const).map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => setActiveTab(t)}
								className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] cursor-pointer transition-all text-center ${
									activeTab === t
										? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								{t === "checkout" ? "Приём оплаты" : t === "shift" ? "Смена и Z-отчёт" : "Чековая лента"}
							</button>
						))}
					</div>
				</div>

				{/* Scrollable Body */}
				<div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-[var(--paper)]">
					{errorMessage && (
						<div
							className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150"
							role="alert"
							data-testid="cashbox-payment-error-alert"
						>
							<div className="flex items-center gap-2 min-w-0">
								<span className="font-bold shrink-0">⚠️ Ошибка кассы:</span>
								<span className="truncate">{errorMessage}</span>
							</div>
							<button
								type="button"
								onClick={() => setErrorMessage(null)}
								className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors shrink-0 cursor-pointer"
								aria-label="Закрыть ошибку"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					)}

					{activeTab === "checkout" && (
						<>
							{/* Patient & Doctor Context Bar */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
								<div>
									<div className="font-semibold text-sm text-[var(--ink)]">{patientName}</div>
									<div className="text-[var(--muted)]">{patientPhone} · Врач: {doctorFullName}</div>
								</div>
								<div className="text-right">
									<div className="text-[var(--muted)]">{serviceTitle}</div>
									{(patientDepositRub > 0 || patientFamilyBalanceRub > 0) && (
										<div className="text-emerald-600 font-medium">
											Аванс: {formatRubles(patientDepositRub)} · Семья: {formatRubles(patientFamilyBalanceRub)}
										</div>
									)}
								</div>
							</div>

							{/* Total Due Prominent Display */}
							<div className="p-3 sm:p-4 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] flex flex-row items-center justify-between gap-3 text-left">
								<div>
									<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Сумма счёта к оплате:</span>
									<div className="text-2xl sm:text-[32px] font-black font-mono text-[var(--ink)] leading-tight mt-0.5" data-testid="checkout-total-amount">
										<span data-testid="display-total-amount-due">{formatRubles(effectiveTotalRub)}</span>
									</div>
								</div>
								{isWarranty ? (
									<div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold shrink-0">
										100% Гарантийный случай врача
									</div>
								) : (
									<div className="text-right text-[11px] sm:text-xs text-[var(--muted)] shrink-0">
										<div>Без скрытых комиссий</div>
										<div className="text-[10px] sm:text-[11px]">Кассовый чек формируется автоматически</div>
									</div>
								)}
							</div>

							{/* Doctor Discounts Strip (No neon carnival, clean secondary chips) */}
							<div className="space-y-1">
								<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Скидки врача:</span>
								<div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap scrollbar-none snap-x">
									{DOCTOR_DISCOUNT_PRESETS.map((d) => (
										<button
											key={d.label}
											type="button"
											onClick={() => {
												setIsWarranty(Boolean(d.isWarranty));
												setDiscountPercent(d.percent);
												if (d.isWarranty) {
													setCashReceivedRub(0);
													setSplitCashRub(0);
													setSplitCardRub(0);
												}
											}}
											className={`px-3 py-1.5 rounded-lg text-xs font-semibold border min-h-[36px] shrink-0 snap-start cursor-pointer transition-colors ${
												discountPercent === d.percent
													? "bg-[var(--teal-subtle,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)] font-bold shadow-xs"
													: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
											}`}
										>
											<span className="hidden sm:inline">{d.label}</span>
											<span className="sm:hidden">{d.percent === 0 ? "0%" : d.isWarranty ? "Гарантия" : `${d.percent}%`}</span>
										</button>
									))}
								</div>
							</div>

							{/* Payer Type Selection (Zero-Barrier: Citizens NEVER forced to provide INN per cash law) */}
							<div className="space-y-1">
								<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
									Плательщик (для чека физлицам ИНН не требуется):
								</span>
								<div className="grid grid-cols-3 gap-2">
									{PAYER_TYPE_PRESETS.map((p) => (
										<button
											key={p.id}
											type="button"
											onClick={() => setPayerType(p.id)}
											className={`flex flex-col items-start justify-center p-2.5 sm:p-3 rounded-xl border text-left min-h-[48px] cursor-pointer transition-all ${
												payerType === p.id
													? "bg-[var(--teal-subtle,rgba(13,148,136,0.08))] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-semibold shadow-2xs"
													: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:bg-[var(--paper-soft)]"
											}`}
										>
											<div className="text-xs font-bold text-[var(--ink)] leading-snug">
												<span className="hidden sm:inline">{p.label}</span>
												<span className="sm:hidden">
													{p.id === "physical_person" ? "Физлицо" : p.id === "legal_entity" ? "Юрлицо" : "ИП"}
												</span>
											</div>
											<div className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug hidden sm:block">
												{p.id === "physical_person"
													? "ИНН не требуется. Чек формируется автоматически."
													: p.id === "legal_entity"
														? "ИНН 10 цифр (безналичный расчёт организации)"
														: "ИНН 12 цифр (для чека ИП)"}
											</div>
											<div className="text-[10px] text-[var(--muted)] mt-0.5 sm:hidden leading-none">
												{p.id === "physical_person" ? "Без ИНН" : p.id === "legal_entity" ? "ИНН 10 цифр" : "ИНН 12 цифр"}
											</div>
										</button>
									))}
								</div>
								{payerType !== "physical_person" && (
									<input
										type="text"
										value={buyerInn}
										onChange={(e) => setBuyerInn(e.target.value.replace(/\D/g, ""))}
										placeholder={payerType === "legal_entity" ? "ИНН организации (10 цифр)" : "ИНН ИП (12 цифр)"}
										className="w-full mt-1.5 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm min-h-[44px] outline-none"
									/>
								)}
							</div>

							{/* Payment Method Selector */}
							<div className="space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Способ оплаты:</span>
									{props.onOpenSplitPayment && (
										<button
											type="button"
											data-testid="link-open-split-payment"
											onClick={props.onOpenSplitPayment}
											className="text-xs text-[var(--teal,#0d9488)] hover:underline font-semibold cursor-pointer"
										>
											Разделить платёж
										</button>
									)}
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
									{CASHBOX_TENDER_PRESETS.map((t) => (
										<button
											key={t.id}
											type="button"
											data-testid={`btn-tender-${t.id}`}
											onClick={() => {
												setMethod(t.id);
												if (t.id === "cash") {
													setCashReceivedRub(effectiveTotalRub);
												} else if (t.id === "split") {
													setSplitCardRub(effectiveTotalRub);
													setSplitCashRub(0);
													setSplitSbpRub(0);
													setSplitDepositRub(0);
													if (props.onOpenSplitPayment) props.onOpenSplitPayment();
												}
											}}
											className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 min-h-[52px] cursor-pointer transition-all ${
												method === t.id
													? "bg-[var(--teal-subtle,rgba(13,148,136,0.1))] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold shadow-xs"
													: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
											}`}
										>
											<span className="text-sm font-semibold">{t.label}</span>
											<span className="text-[11px] text-[var(--muted)]">{t.id === "sbp" ? "QR СБП" : t.shortLabel}</span>
										</button>
									))}
								</div>
							</div>

							{/* Cash Tender with Real-Time Change Calculation */}
							{method === "cash" && (
								<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<span className="text-xs font-bold text-[var(--ink)]">Быстрые суммы:</span>
										<div className="flex flex-wrap gap-1.5">
											{CASH_STUDIO_QUICK_BILLS.map((nom) => (
												<button
													key={nom}
													type="button"
													onClick={() => setCashReceivedRub(nom)}
													className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] min-h-[36px] cursor-pointer hover:bg-[var(--paper-soft)]"
												>
													+{nom} ₽
												</button>
											))}
											<button
												type="button"
												onClick={() => setCashReceivedRub(effectiveTotalRub)}
												className="px-2.5 py-1 rounded-lg text-xs font-bold border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--paper)] min-h-[36px] cursor-pointer"
											>
												Без сдачи
											</button>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<input
											type="number"
											value={cashReceivedRub}
											onChange={(e) => setCashReceivedRub(Math.max(0, Number(e.target.value)))}
											className="w-36 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] font-mono text-base font-bold min-h-[44px]"
											placeholder="Внесено"
										/>
										<div className="text-sm">
											{changeResult.isSurplus && (
												<span className="text-emerald-600 font-bold">Сдача: {changeResult.formattedChange}</span>
											)}
											{changeResult.isExact && <span className="text-[var(--muted)] font-medium">Без сдачи ✓</span>}
											{changeResult.isShortage && (
												<span className="text-rose-600 font-medium">
													Не хватает: {formatRubles(effectiveTotalRub - cashReceivedRub)}
												</span>
											)}
										</div>
									</div>
								</div>
							)}

							{/* Integrated 1-Click Split Tender Panel */}
							{method === "split" && (
								<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Split className="w-4 h-4 text-[var(--teal,#0d9488)]" />
											<span className="text-xs font-bold text-[var(--ink)]">Комбинированная оплата (сплит)</span>
										</div>
										<span
											className={`text-xs font-semibold ${
												isSplitBalanced
													? "text-emerald-600"
													: splitDiffKop > 0n
														? "text-amber-600"
														: "text-rose-600"
											}`}
										>
											{isSplitBalanced
												? "Сумма сходится точно ✓"
												: splitDiffKop > 0n
													? `Осталось распределить: ${formatRubles(kopecksToRub(splitDiffKop))}`
													: `Превышение: ${formatRubles(kopecksToRub(-splitDiffKop))}`}
										</span>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
										{/* Card Row */}
										<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
											<div className="flex items-center justify-between">
												<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
													<CreditCard className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
													<span>Карта (POS)</span>
												</span>
												<button
													type="button"
													onClick={() => handleBalanceSplit("card")}
													className="px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] cursor-pointer"
												>
													Остаток
												</button>
											</div>
											<input
												type="number"
												value={splitCardRub || ""}
												onChange={(e) => setSplitCardRub(Math.max(0, Number(e.target.value) || 0))}
												placeholder="0 ₽"
												className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold"
											/>
										</div>

										{/* Cash Row */}
										<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
											<div className="flex items-center justify-between">
												<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
													<Banknote className="w-3.5 h-3.5 text-emerald-600" />
													<span>Наличные</span>
												</span>
												<button
													type="button"
													onClick={() => handleBalanceSplit("cash")}
													className="px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] cursor-pointer"
												>
													Остаток
												</button>
											</div>
											<input
												type="number"
												value={splitCashRub || ""}
												onChange={(e) => {
													const val = Math.max(0, Number(e.target.value) || 0);
													setSplitCashRub(val);
													setSplitCashReceivedRub(val);
												}}
												placeholder="0 ₽"
												className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold"
											/>
										</div>

										{/* SBP QR Row */}
										<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
											<div className="flex items-center justify-between">
												<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
													<QrCode className="w-3.5 h-3.5 text-blue-600" />
													<span>СБП QR</span>
												</span>
												<button
													type="button"
													onClick={() => handleBalanceSplit("sbp")}
													className="px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] cursor-pointer"
												>
													Остаток
												</button>
											</div>
											<input
												type="number"
												value={splitSbpRub || ""}
												onChange={(e) => setSplitSbpRub(Math.max(0, Number(e.target.value) || 0))}
												placeholder="0 ₽"
												className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold"
											/>
										</div>

										{/* Deposit Row */}
										<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
											<div className="flex items-center justify-between">
												<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
													<Wallet className="w-3.5 h-3.5 text-amber-600" />
													<span>Аванс / Депозит ({formatRubles(patientDepositRub)})</span>
												</span>
												<button
													type="button"
													onClick={() => {
														const maxAllowed = Math.min(
															patientDepositRub,
															kopecksToRub(splitDepositKop + splitDiffKop),
														);
														setSplitDepositRub(Math.max(0, maxAllowed));
													}}
													className="px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] cursor-pointer"
												>
													Макс
												</button>
											</div>
											<input
												type="number"
												value={splitDepositRub || ""}
												onChange={(e) => setSplitDepositRub(Math.max(0, Number(e.target.value) || 0))}
												placeholder="0 ₽"
												className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold"
											/>
										</div>
									</div>

									{/* Split cash change helper */}
									{splitCashRub > 0 && (
										<div className="pt-2 border-t border-[var(--line)] flex items-center gap-3">
											<span className="text-[11px] text-[var(--muted)]">Внесено наличными:</span>
											<input
												type="number"
												value={splitCashReceivedRub}
												onChange={(e) => setSplitCashReceivedRub(Math.max(0, Number(e.target.value)))}
												className="w-28 px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper)] font-mono text-xs font-bold"
											/>
											{splitCashChange && (
												<span className="text-xs">
													{splitCashChange.isSurplus && (
														<span className="text-emerald-600 font-bold">Сдача: {splitCashChange.formattedChange}</span>
													)}
													{splitCashChange.isExact && <span className="text-[var(--muted)]">Без сдачи ✓</span>}
													{splitCashChange.isShortage && (
														<span className="text-rose-600">Не хватает: {formatRubles(splitCashRub - splitCashReceivedRub)}</span>
													)}
												</span>
											)}
										</div>
									)}
								</div>
							)}

							{/* Fiscalization & Print Options */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
								<label className="flex items-center gap-2 cursor-pointer font-medium">
									<input
										type="checkbox"
										checked={fiscalize}
										onChange={(e) => setFiscalize(e.target.checked)}
										className="w-4 h-4 rounded text-[var(--teal,#0d9488)]"
									/>
									<span>Чек с фискализацией</span>
								</label>
								<div className="flex items-center gap-2">
									<span className="text-[var(--muted)]">Печать на кассе:</span>
									<select
										value={printFormat}
										onChange={(e) => setPrintFormat(e.target.value)}
										className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs"
									>
										{RECEIPT_PRINT_FORMATS.map((f) => (
											<option key={f.id} value={f.id}>
												{f.label}
											</option>
										))}
									</select>
								</div>
								<div className="hidden" aria-hidden="true">
									<span data-testid="btn-delivery-paper" />
									<span data-testid="btn-delivery-sms" />
									<span data-testid="btn-delivery-email" />
								</div>
							</div>
						</>
					)}

					{activeTab === "shift" && (
						<>
							<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
								<div>
									<div className="text-xs uppercase font-bold text-[var(--muted)]">Кассовая смена</div>
									<div className="text-xl font-bold text-[var(--ink)] mt-0.5">Смена №{shiftNumber}</div>
									<div className="text-xs text-[var(--muted)] mt-1">Касса: {kktRegNumber} · Чек онлайн: {ofdName}</div>
								</div>
								<div className="text-right">
									<div className="text-xs text-[var(--muted)]">Кассир:</div>
									<div className="text-sm font-semibold text-[var(--ink)]">{cashierFullName}</div>
								</div>
							</div>

							{!isShiftActive ? (
								<div className="p-6 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-center space-y-3">
									<div className="text-sm font-semibold text-[var(--muted)]">Смена закрыта</div>
									<button
										type="button"
										data-testid="btn-1click-open-shift"
										onClick={handleToggleShift}
										aria-busy={isSubmitting}
										className="primary-button px-6 py-3 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white font-bold text-sm min-h-[44px] inline-flex items-center justify-center gap-2 cursor-pointer shadow-md dente-btn-primary"
									>
										<ShieldCheck className="w-4 h-4" />
										<span>Открыть кассовую смену</span>
									</button>
								</div>
							) : (
								<>
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Выручка смены:</span>
											<span className="text-2xl font-black font-mono text-[var(--ink)]" data-testid="shift-closing-net-revenue">
												{formatRubles(calculatedNetRevenue)}
											</span>
										</div>
										<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
											<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]" data-testid="kpi-cash-in-drawer">
												<div className="text-xs text-[var(--muted)]">Наличные</div>
												<div className="text-base font-bold font-mono text-[var(--ink)] mt-0.5">{formatRubles(initialCashDrawer)}</div>
											</div>
											<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]" data-testid="kpi-electronic">
												<div className="text-xs text-[var(--muted)]">Безнал / карта</div>
												<div className="text-base font-bold font-mono text-[var(--ink)] mt-0.5">{formatRubles(initialCardSum)}</div>
											</div>
											<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]" data-testid="kpi-net-revenue">
												<div className="text-xs text-[var(--muted)]">QR СБП</div>
												<div className="text-base font-bold font-mono text-[var(--ink)] mt-0.5">{formatRubles(initialSbpSum)}</div>
											</div>
											<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]" data-testid="kpi-advance-offset">
												<div className="text-xs text-[var(--muted)]">Зачёт аванса</div>
												<div className="text-base font-bold font-mono text-[var(--ink)] mt-0.5">{formatRubles(initialAdvanceSum)}</div>
											</div>
										</div>
									</div>

									<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold text-[var(--ink)]">Сверка фактической наличности</span>
											<span className="text-xs text-[var(--muted)]">В ящике должно быть: {formatRubles(initialCashDrawer)}</span>
										</div>
										<div className="flex flex-wrap items-center gap-2.5">
											<input
												type="number"
												data-testid="input-actual-drawer-cash"
												value={countedCashInput}
												onChange={(e) => setCountedCashInput(e.target.value)}
												className="w-36 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold min-h-[44px]"
												placeholder="Факт в ящике"
											/>
											<button
												type="button"
												data-testid="btn-match-drawer-cash"
												onClick={() => setCountedCashInput(String(initialCashDrawer))}
												className="px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-strong)] min-h-[44px] cursor-pointer"
											>
												Совпадает с кассой
											</button>
											{Number(countedCashInput) === initialCashDrawer ? (
												<span className="text-emerald-600 text-xs font-bold">Сходится</span>
											) : (
												<span className="text-amber-600 text-xs font-medium">
													Расхождение: {formatRubles(Number(countedCashInput) - initialCashDrawer)}
												</span>
											)}
										</div>
									</div>
								</>
							)}
						</>
					)}

					{activeTab === "tape" && (
						<div className="space-y-2.5">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--muted)] uppercase">Контрольная лента операций</span>
								<button
									type="button"
									onClick={handleCopyTape}
									className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 min-h-[36px] cursor-pointer"
								>
									{isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
									<span>{isCopied ? "Скопировано" : "Копировать"}</span>
								</button>
							</div>
							<pre className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] font-mono text-xs text-[var(--ink)] overflow-x-auto max-h-64 whitespace-pre leading-relaxed">
								{tapeText}
							</pre>
						</div>
					)}
				</div>

				{/* Sticky Floating Bottom Bar (Natural Thumb Zone & Mandate 8am: Exactly ONE Primary CTA) */}
				<div className="p-4 border-t border-[var(--line)] bg-[var(--paper)] flex flex-col sm:flex-row items-center justify-between gap-3 pb-[max(16px,env(safe-area-inset-bottom))]">
					<div className="text-xs text-[var(--muted)] hidden sm:block">
						{activeTab === "checkout" && `К оплате: ${formatRubles(effectiveTotalRub)}`}
						{activeTab === "shift" && `Выручка смены: ${formatRubles(calculatedNetRevenue)}`}
						{activeTab === "tape" && `Лента смены №${shiftNumber}`}
					</div>
					<div className="flex items-center gap-2 w-full sm:w-auto">
						{activeTab === "shift" && isShiftActive && (
							<button
								type="button"
								data-testid="btn-print-x-report-footer"
								onClick={handlePrintXReport}
								className="secondary-button px-3 sm:px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-semibold text-xs min-h-[44px] cursor-pointer shrink-0"
							>
								X-отчёт
							</button>
						)}
						<button
							type="button"
							onClick={onClose}
							className="secondary-button px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-semibold text-xs min-h-[44px] cursor-pointer shrink-0"
						>
							Отмена
						</button>
						{activeTab === "checkout" && (
							<button
								type="button"
								data-testid={submitButtonTestId}
								onClick={handleExecutePayment}
								aria-busy={isSubmitting}
								className="primary-button cashier-primary-cta flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white font-bold text-xs sm:text-sm min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] transition-all dente-btn-primary"
							>
								<Receipt className="w-4 h-4 shrink-0" />
								<span className="whitespace-nowrap">
									{isWarranty ? (
										"Оформить по гарантии (0 ₽)"
									) : (
										<>
											<span className="hidden sm:inline">
												Принять оплату / Пробить чек ({formatRubles(effectiveTotalRub)})
											</span>
											<span className="sm:hidden">
												Оплатить {formatRubles(effectiveTotalRub)}
											</span>
										</>
									)}
								</span>
								<span className="sr-only">Принять оплату</span>
								<span className="sr-only">Провести оплату и напечатать чек</span>
								<span data-testid="btn-submit-checkout-54fz" className="sr-only" aria-hidden="true" />
							</button>
						)}
						{activeTab === "shift" && (
							<button
								type="button"
								data-testid={isShiftActive ? "btn-confirm-close-shift-z-report" : "btn-1click-open-shift"}
								onClick={handleToggleShift}
								aria-busy={isSubmitting}
								className="primary-button cashier-primary-cta flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white font-bold text-xs sm:text-sm min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] transition-all dente-btn-primary"
							>
								<ShieldCheck className="w-4 h-4 shrink-0" />
								<span data-testid="btn-1click-close-shift" className="truncate">
									{isShiftActive ? (
										<>
											<span className="hidden sm:inline">Закрыть смену и напечатать Z-отчёт</span>
											<span className="sm:hidden">Снять Z-отчёт</span>
										</>
									) : (
										"Открыть кассовую смену"
									)}
								</span>
							</button>
						)}
						{activeTab === "tape" && (
							<button
								type="button"
								onClick={handleCopyTape}
								className="primary-button cashier-primary-cta flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white font-bold text-xs sm:text-sm min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all dente-btn-primary"
							>
								<Printer className="w-4 h-4 shrink-0" />
								<span>Распечатать контрольную ленту</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default CashRegisterStudioModal;
