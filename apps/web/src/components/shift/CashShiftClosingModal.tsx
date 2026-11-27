/**
 * apps/web/src/components/shift/CashShiftClosingModal.tsx
 *
 * Canonical SSOT Cash Register Shift Close & Z-Report Modal.
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, soft-focus defaults).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN).
 * - Mandate 8am: Exactly ONE Primary CTA button in var(--teal) per visible context.
 * - Mandate 8x & 8ap: Clean clinical and cashier language without Soviet law codes.
 * - Apple HIG: Native Mobile Bottom Sheet, touch targets >= 44x44px, safe-area protection.
 * - Integer Kopeck Math: Strict rubToKopecks/kopecksToRub without floating-point errors.
 * - Sweet Spot size: 300-380 lines.
 */

import React, { useState, useEffect, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import {
	Banknote,
	CreditCard,
	QrCode,
	Wallet,
	CheckCircle2,
	AlertTriangle,
	Printer,
	ShieldCheck,
	X,
	RefreshCw,
	ArrowDownToLine,
} from "lucide-react";
import { generateUuidV7, kopecksToRub, rubToKopecks } from "@dental/shared";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../../lib/denteRequestHeaders";
import { clientLogger } from "../../services/logging/clientLogger";
import {
	reconcileAcquiringWithKkt,
	type AcquiringTerminalTransaction,
	type KktFiscalElectronicRecord,
} from "./acquiringReconciliation.js";

export interface ZReportData {
	readonly shiftNumber: number;
	readonly cashierFullName: string;
	readonly countedCashRub: number;
	readonly expectedCashInDrawerRub: number;
	readonly incomeCashRub: number;
	readonly incomeElectronicRub: number;
	readonly incomeSbpRub: number;
	readonly advanceOffsetRub: number;
	readonly netRevenueRub: number;
	readonly differenceRub: number;
	readonly isBalanced: boolean;
	readonly encashmentAmountRub: number;
	readonly force: boolean;
	readonly allowUnfinishedVisits: boolean;
	readonly idempotencyKey: string;
	readonly fiscalDocNumber?: string | number | null | undefined;
	readonly fiscalSign?: string | null | undefined;
	readonly qrString?: string | null | undefined;
	readonly [key: string]: unknown;
}

export interface CashShiftClosingModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly shiftNumber?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly initialChangeFundRub?: number | undefined;
	readonly cashInDrawerRub?: number | undefined;
	readonly incomeCashRub?: number | undefined;
	readonly incomeElectronicRub?: number | undefined;
	readonly incomeSbpRub?: number | undefined;
	readonly advanceOffsetRub?: number | undefined;
	readonly returnTotalRub?: number | undefined;
	readonly insuranceTotalRub?: number | undefined;
	readonly netRevenueRub?: number | undefined;
	readonly acquiringTransactions?: readonly AcquiringTerminalTransaction[] | undefined;
	readonly kktElectronicRecords?: readonly KktFiscalElectronicRecord[] | undefined;
	readonly onShiftClosed?: ((zReportData: ZReportData) => void) | undefined;
}

export const CashShiftClosingModal: React.FC<CashShiftClosingModalProps> = ({
	isOpen,
	onClose,
	shiftNumber: shiftNumberProp,
	cashierFullName: cashierFullNameProp,
	cashierName,
	clinicLegalName = "Стоматологическая клиника",
	initialChangeFundRub: initialChangeFundRubProp,
	cashInDrawerRub: cashInDrawerRubProp,
	incomeCashRub: incomeCashRubProp,
	incomeElectronicRub: incomeElectronicRubProp,
	incomeSbpRub: incomeSbpRubProp,
	advanceOffsetRub: advanceOffsetRubProp,
	returnTotalRub: returnTotalRubProp,
	insuranceTotalRub: insuranceTotalRubProp,
	netRevenueRub: netRevenueRubProp,
	acquiringTransactions,
	kktElectronicRecords,
	onShiftClosed,
}) => {
	const cashierFullName = cashierFullNameProp || cashierName || "Администратор / Кассир";
	const titleId = useId();

	// Auto-hydration from real database API if values are not explicitly supplied
	const [autoFetchedData, setAutoFetchedData] = useState<{
		hasOpenShift?: boolean | undefined;
		incomeCashRub?: number | undefined;
		incomeElectronicRub?: number | undefined;
		incomeSbpRub?: number | undefined;
		advanceOffsetRub?: number | undefined;
		returnTotalRub?: number | undefined;
		insuranceTotalRub?: number | undefined;
		netRevenueRub?: number | undefined;
		initialChangeFundRub?: number | undefined;
		cashInDrawerRub?: number | undefined;
		shiftNumber?: number | undefined;
	} | null>(null);

	const needsAutoFetch = incomeCashRubProp === undefined;

	useEffect(() => {
		if (!isOpen || !needsAutoFetch) return;
		let isMounted = true;
		fetch("/api/cashbox/shift", {
			headers: denteClinicalReadHeaders(),
		})
			.then(async (res) => {
				if (!res.ok) {
					clientLogger.warn("[CashShiftClosingModal] Ошибка ответа сервера при загрузке смены", { status: res.status }, { module: "Shift" });
					return null;
				}
				return res.json();
			})
			.then((rawJson: unknown) => {
				const rawObj = rawJson && typeof rawJson === "object" && "data" in rawJson ? (rawJson as { data?: unknown }).data ?? rawJson : rawJson;
				const data = rawObj as Record<string, unknown> | null;
				if (isMounted && data && typeof data === "object") {
					const hasOpenShift = data.hasOpenShift !== false;
					if (!hasOpenShift) {
						setAutoFetchedData({
							hasOpenShift: false,
							incomeCashRub: 0,
							incomeElectronicRub: 0,
							incomeSbpRub: 0,
							advanceOffsetRub: 0,
							returnTotalRub: 0,
							insuranceTotalRub: 0,
							netRevenueRub: 0,
							initialChangeFundRub: 0,
							cashInDrawerRub: 0,
							shiftNumber: typeof data.shiftNumber === "number" ? data.shiftNumber : undefined,
						});
						return;
					}
					setAutoFetchedData({
						hasOpenShift: true,
						incomeCashRub: typeof data.incomeCashRub === "number" ? data.incomeCashRub : 0,
						incomeElectronicRub: typeof data.incomeElectronicRub === "number" ? data.incomeElectronicRub : 0,
						incomeSbpRub: typeof data.incomeSbpRub === "number" ? data.incomeSbpRub : 0,
						advanceOffsetRub: typeof data.advanceOffsetRub === "number" ? data.advanceOffsetRub : 0,
						returnTotalRub: typeof data.returnTotalRub === "number" ? data.returnTotalRub : 0,
						insuranceTotalRub: typeof data.insuranceTotalRub === "number" ? data.insuranceTotalRub : 0,
						netRevenueRub: typeof data.netRevenueRub === "number" ? data.netRevenueRub : undefined,
						initialChangeFundRub: typeof data.startingBalanceRub === "number" ? data.startingBalanceRub : 0,
						cashInDrawerRub: typeof data.expectedCashInDrawerRub === "number" ? data.expectedCashInDrawerRub : undefined,
						shiftNumber: typeof data.shiftNumber === "number" ? data.shiftNumber : undefined,
					});
				}
			})
			.catch((err) => {
				clientLogger.warn("[CashShiftClosingModal] Не удалось загрузить данные кассовой смены", err, { module: "Shift" });
			});
		return () => {
			isMounted = false;
		};
	}, [isOpen, needsAutoFetch]);

	const shiftNumber = autoFetchedData?.shiftNumber ?? shiftNumberProp ?? 1;
	const initialChangeFundRub = initialChangeFundRubProp ?? autoFetchedData?.initialChangeFundRub ?? 0;
	const cashInDrawerRub = cashInDrawerRubProp ?? autoFetchedData?.cashInDrawerRub;

	// Revenue numbers in integer kopecks
	const totalCashRevenue = Math.max(0, incomeCashRubProp ?? autoFetchedData?.incomeCashRub ?? 0);
	const totalCardRevenue = Math.max(0, incomeElectronicRubProp ?? autoFetchedData?.incomeElectronicRub ?? 0);
	const totalSbpRevenue = Math.max(0, incomeSbpRubProp ?? autoFetchedData?.incomeSbpRub ?? 0);
	const totalAdvanceOffset = Math.max(0, advanceOffsetRubProp ?? autoFetchedData?.advanceOffsetRub ?? 0);
	const totalReturnRub = Math.max(0, returnTotalRubProp ?? autoFetchedData?.returnTotalRub ?? 0);
	const totalInsuranceRub = Math.max(0, insuranceTotalRubProp ?? autoFetchedData?.insuranceTotalRub ?? 0);

	const computedNetRevenueRub = kopecksToRub(
		rubToKopecks(totalCashRevenue) +
			rubToKopecks(totalCardRevenue) +
			rubToKopecks(totalSbpRevenue) +
			rubToKopecks(totalAdvanceOffset) +
			rubToKopecks(totalInsuranceRub) -
			rubToKopecks(totalReturnRub),
	);
	const netRevenueRub =
		netRevenueRubProp ??
		autoFetchedData?.netRevenueRub ??
		computedNetRevenueRub;
	const expectedCashInDrawer =
		cashInDrawerRub !== undefined
			? cashInDrawerRub
			: kopecksToRub(rubToKopecks(initialChangeFundRub) + rubToKopecks(totalCashRevenue));

	// Acquiring & KKT reconciliation engine (real POS / OFD records only, no synthetic card metadata)
	const hasRealAcquiringData = Boolean(
		(acquiringTransactions && acquiringTransactions.length > 0) ||
			(kktElectronicRecords && kktElectronicRecords.length > 0),
	);
	const acquiringReport = useMemo(() => {
		const termTxs: AcquiringTerminalTransaction[] = acquiringTransactions ? [...acquiringTransactions] : [];
		const kktTxs: KktFiscalElectronicRecord[] = kktElectronicRecords ? [...kktElectronicRecords] : [];
		return reconcileAcquiringWithKkt(termTxs, kktTxs);
	}, [acquiringTransactions, kktElectronicRecords]);

	// Form state
	const [countedCashRub, setCountedCashRub] = useState<number>(expectedCashInDrawer);
	const [isTerminalReconciled, setIsTerminalReconciled] = useState<boolean>(true);
	const [encashmentOption, setEncashmentOption] = useState<"full" | "retain_change">(
		"retain_change",
	);
	const [changeFundRetainRub, setChangeFundRetainRub] = useState<number>(initialChangeFundRub);
	const [printZReport, setPrintZReport] = useState<boolean>(true);

	// Execution state
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [closedSuccessData, setClosedSuccessData] = useState<ZReportData | null>(null);

	useEffect(() => {
		if (!isOpen) {
			setAutoFetchedData(null);
			setIsTerminalReconciled(true);
			setEncashmentOption("retain_change");
			setPrintZReport(true);
		}
		setCountedCashRub(expectedCashInDrawer);
		setChangeFundRetainRub(initialChangeFundRub);
		setErrorMessage(null);
		setClosedSuccessData(null);
	}, [expectedCashInDrawer, initialChangeFundRub, isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isSubmitting) onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, isSubmitting]);

	useEffect(() => {
		if (!closedSuccessData || !isOpen) return;
		const timer = setTimeout(() => {
			onClose();
		}, 900);
		return () => clearTimeout(timer);
	}, [closedSuccessData, isOpen, onClose]);

	if (!isOpen) return null;

	const diffKop = rubToKopecks(countedCashRub) - rubToKopecks(expectedCashInDrawer);
	const discrepancyRub = kopecksToRub(diffKop);
	const isCashMatched = diffKop === 0;

	const handleExecuteCloseShift = async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage(null);

		const encashmentKop =
			encashmentOption === "full"
				? rubToKopecks(countedCashRub)
				: Math.max(0, rubToKopecks(countedCashRub) - rubToKopecks(changeFundRetainRub));
		const encashmentAmountRub = kopecksToRub(encashmentKop);

		const idempotencyKey = generateUuidV7();

		const payload = {
			shiftNumber,
			cashierFullName,
			countedCashRub,
			incomeCashRub: totalCashRevenue,
			incomeElectronicRub: totalCardRevenue,
			incomeSbpRub: totalSbpRevenue,
			advanceOffsetRub: totalAdvanceOffset,
			netRevenueRub,
			differenceRub: discrepancyRub,
			isBalanced: isCashMatched,
			force: true, // Cashier autonomy: soft-close does not block
			allowUnfinishedVisits: true,
			idempotencyKey,
		};

		try {
			const res = await fetch("/api/cashbox/shift/close", {
				method: "POST",
				headers: {
					...denteClinicalMutationHeaders(),
					"Content-Type": "application/json",
					"Idempotency-Key": idempotencyKey,
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errJson = await res.json().catch(() => null);
				throw new Error(errJson?.error || errJson?.message || `Ошибка закрытия смены (HTTP ${res.status})`);
			}

			const json = await res.json().catch(() => null);
			const jsonData = json && typeof json === "object" && "data" in json ? json.data : json;
			const rawReport = (jsonData?.zReportData || jsonData?.reconciliation || json?.zReportData || json?.reconciliation || payload) as Record<string, unknown>;
			const zReport: ZReportData = {
				...payload,
				expectedCashInDrawerRub: expectedCashInDrawer,
				encashmentAmountRub,
				...rawReport,
				fiscalDocNumber: (rawReport.fiscalDocNumber ?? jsonData?.reconciliation?.fiscalDocNumber ?? jsonData?.zReportData?.fiscalDocNumber) as string | number | undefined,
				fiscalSign: (rawReport.fiscalSign ?? jsonData?.reconciliation?.fiscalSign ?? jsonData?.zReportData?.fiscalSign) as string | undefined,
				qrString: (rawReport.qrString ?? jsonData?.reconciliation?.qrString ?? jsonData?.zReportData?.qrString) as string | undefined,
			};

			setClosedSuccessData(zReport);
			setIsSubmitting(false);
			onShiftClosed?.(zReport);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка соединения с сервером";
			setErrorMessage(`Сбой закрытия смены: ${message}. Проверьте подключение и повторите попытку.`);
			setIsSubmitting(false);
		}
	};

	const modalNode = (
		<div
			className="fixed inset-0 z-[100] flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			data-testid="cash-shift-closing-modal"
		>
			<div className="w-full max-w-full md:max-w-xl lg:max-w-2xl rounded-t-[24px] md:rounded-2xl bg-[var(--paper,#ffffff)] border-t md:border border-[var(--line)] text-[var(--ink)] shadow-2xl overflow-hidden overflow-x-clip flex flex-col max-h-[92dvh] md:max-h-[90vh]">
				{/* Apple HIG Drag Handle for Mobile */}
				<div className="md:hidden flex justify-center pt-2.5 pb-1" aria-hidden="true">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line)]" />
				</div>

				{/* Header */}
				<div className="h-14 px-6 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div>
						<h2 id={titleId} className="text-base font-semibold text-[var(--ink)] tracking-tight">
							Закрытие смены и Z-отчёт
						</h2>
						<p className="text-xs text-[var(--ink-muted)]">
							{`Смена №${shiftNumber} • ${cashierFullName} • ${clinicLegalName}`}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="h-11 w-11 md:h-9 md:w-9 inline-flex items-center justify-center rounded-lg bg-transparent hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors shrink-0 cursor-pointer"
						aria-label="Закрыть окно"
					>
						<X className="w-4 h-4 shrink-0" />
					</button>
				</div>

				{/* Body Content */}
				<div className="p-6 overflow-y-auto space-y-4 max-w-full">
					{autoFetchedData?.hasOpenShift === false && (
						<div className="p-3 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning-soft)] text-xs text-[var(--warning-ink,var(--warning))] flex items-center gap-2">
							<AlertTriangle className="w-4 h-4 shrink-0" />
							<span>Активная кассовая смена на сервере не открыта. Отображены данные нулевой смены.</span>
						</div>
					)}

					{/* Total Shift Revenue Hero Display */}
					<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col items-center justify-center text-center gap-1">
						<span className="text-xs font-medium text-[var(--ink-muted)]">
							Итоговая выручка смены
						</span>
						<span className="text-[32px] font-semibold font-mono text-[var(--ink)] tracking-tight tabular-nums leading-none" data-testid="shift-closing-net-revenue">
							{netRevenueRub.toLocaleString("ru-RU")} ₽
						</span>
						<span className="text-xs text-[var(--ink-muted)] mt-1 font-mono tabular-nums tracking-tight">
							Разменный фонд на начало: {initialChangeFundRub.toLocaleString("ru-RU")} ₽
							{(totalReturnRub > 0 || totalInsuranceRub > 0) &&
								` • Возвраты: -${totalReturnRub.toLocaleString("ru-RU")} ₽ • ДМС: ${totalInsuranceRub.toLocaleString("ru-RU")} ₽`}
						</span>
					</div>

					{/* 4 Tenders Revenue Grid */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-1">
							<div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
								<Banknote className="w-3.5 h-3.5 shrink-0 text-[var(--primary)]" />
								<span>Наличные</span>
							</div>
							<span className="text-sm font-medium font-mono tracking-tight text-right tabular-nums text-[var(--ink)]">
								{totalCashRevenue.toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-1">
							<div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
								<CreditCard className="w-3.5 h-3.5 shrink-0 text-[var(--primary)]" />
								<span>Безнал / карта</span>
							</div>
							<span className="text-sm font-medium font-mono tracking-tight text-right tabular-nums text-[var(--ink)]">
								{totalCardRevenue.toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-1">
							<div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
								<QrCode className="w-3.5 h-3.5 shrink-0 text-[var(--primary)]" />
								<span>QR СБП</span>
							</div>
							<span className="text-sm font-medium font-mono tracking-tight text-right tabular-nums text-[var(--ink)]">
								{totalSbpRevenue.toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-1">
							<div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
								<Wallet className="w-3.5 h-3.5 shrink-0 text-[var(--primary)]" />
								<span>Зачёт аванса</span>
							</div>
							<span className="text-sm font-medium font-mono tracking-tight text-right tabular-nums text-[var(--ink)]">
								{totalAdvanceOffset.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>

					{/* Physical Cash Reconciliation Section */}
					<div className="p-4 rounded-xl border border-[var(--line)] space-y-3 bg-[var(--paper)]">
						<div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[var(--ink)]">
							<span className="flex items-center gap-1.5">
								<Banknote className="w-4 h-4 shrink-0 text-[var(--primary)]" />
								Сверка фактической наличности
							</span>
							<span className="text-xs text-[var(--ink-muted)] font-mono tabular-nums tracking-tight">
								В ящике должно быть: <b>{expectedCashInDrawer.toLocaleString("ru-RU")} ₽</b>
							</span>
						</div>

						<div className="flex items-center gap-3">
							<div className="flex-1">
								<label className="block text-xs text-[var(--ink-muted)] mb-1">
									Фактическая наличность в кассе (₽)
								</label>
								<input
									type="number"
									min={0}
									value={countedCashRub || ""}
									onChange={(e) => setCountedCashRub(Number(e.target.value) || 0)}
									className="w-full h-11 md:h-9 px-3 rounded-xl md:rounded-lg border border-[var(--line)] bg-[var(--paper)] text-base md:text-sm font-mono font-medium tracking-tight tabular-nums text-[var(--ink)]"
								/>
							</div>

							<div className="pt-5 shrink-0">
								{isCashMatched ? (
									<span className="h-6 px-2 rounded-full bg-[var(--success-soft)] border border-[var(--success-line)] text-[var(--success-ink)] text-xs font-medium inline-flex items-center gap-1 shrink-0">
										<CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
										Сходится
									</span>
								) : (
									<span className="h-6 px-2 rounded-full bg-[var(--warning-soft)] border border-[var(--warning)]/30 text-[var(--warning-ink,var(--warning))] text-xs font-medium inline-flex items-center gap-1 shrink-0 font-mono tabular-nums">
										<AlertTriangle className="w-3.5 h-3.5 shrink-0" />
										{discrepancyRub > 0 ? `+${discrepancyRub}` : discrepancyRub} ₽
									</span>
								)}
							</div>
						</div>

						{/* Acquiring Terminal Reconciliation Checkbox & Engine */}
						<div className="pt-2 border-t border-[var(--line)] space-y-2">
							<div className="flex items-center justify-between gap-2">
								<span className="text-xs text-[var(--ink)] flex items-center gap-1.5 font-medium">
									<CreditCard className="w-3.5 h-3.5 shrink-0 text-[var(--primary)]" />
									Сверка терминала эквайринга ({totalCardRevenue.toLocaleString("ru-RU")} ₽)
								</span>
								<button
									type="button"
									onClick={() => setIsTerminalReconciled(!isTerminalReconciled)}
									className={`h-8 px-2.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
										isTerminalReconciled
											? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
											: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)]"
									}`}
								>
									<CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
									{isTerminalReconciled ? "Терминал сверен" : "Подтвердить сверку"}
								</button>
							</div>
							<div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
								<span className="text-[var(--ink-muted)]">
									Сверка эквайринга с ОФД:{" "}
									<strong className="font-mono tabular-nums text-[var(--ink)]">
										{hasRealAcquiringData
											? `${acquiringReport.totalTerminalRub.toLocaleString("ru-RU")} ₽`
											: `${totalCardRevenue.toLocaleString("ru-RU")} ₽`}
									</strong>
								</span>
								<span
									className={`font-medium ${
										!hasRealAcquiringData
											? "text-[var(--ink-muted)]"
											: acquiringReport.isExactMatch
												? "text-[var(--success-ink)]"
												: "text-[var(--warning-ink,var(--warning))]"
									}`}
								>
									{!hasRealAcquiringData
										? "Ожидает выгрузки POS / ОФД"
										: acquiringReport.isExactMatch
											? "100% совпадение с чеками"
											: `Разница: ${acquiringReport.totalDiffRub.toFixed(2)} ₽`}
								</span>
							</div>
						</div>
					</div>

					{/* Revenue Encashment / Withdrawal Options */}
					<div className="p-4 rounded-xl border border-[var(--line)] space-y-2.5 bg-[var(--paper)]">
						<span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
							<ArrowDownToLine className="w-4 h-4 shrink-0 text-[var(--primary)]" />
							Инкассация наличной выручки
						</span>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
							<button
								type="button"
								onClick={() => setEncashmentOption("retain_change")}
								className={`min-h-[44px] p-2.5 rounded-xl border text-left flex flex-col justify-center transition-colors cursor-pointer ${
									encashmentOption === "retain_change"
										? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-medium"
										: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								<span>Оставить размен на утро</span>
								<span className="text-xs font-normal opacity-80">Инкассировать только прибыль</span>
							</button>

							<button
								type="button"
								onClick={() => setEncashmentOption("full")}
								className={`min-h-[44px] p-2.5 rounded-xl border text-left flex flex-col justify-center transition-colors cursor-pointer ${
									encashmentOption === "full"
										? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-medium"
										: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								<span>Полная инкассация в сейф</span>
								<span className="text-xs font-normal opacity-80">Изъять всю наличность</span>
							</button>
						</div>

						{encashmentOption === "retain_change" && (
							<div className="flex items-center gap-2 pt-1">
								<span className="text-xs text-[var(--ink-muted)] shrink-0">Сумма размена:</span>
								<input
									type="number"
									min={0}
									value={changeFundRetainRub || ""}
									onChange={(e) => setChangeFundRetainRub(Number(e.target.value) || 0)}
									className="h-9 w-28 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm font-mono font-medium tracking-tight tabular-nums text-[var(--ink)]"
								/>
								<span className="text-xs text-[var(--ink)]">₽</span>
							</div>
						)}
					</div>

					{/* Print Z-Report Toggle */}
					<div className="flex items-center justify-between p-3 rounded-xl border border-[var(--line)]">
						<span className="text-xs sm:text-sm font-medium text-[var(--ink)] flex items-center gap-2">
							<Printer className="w-4 h-4 shrink-0 text-[var(--primary)]" />
							Печать бумажного Z-отчёта на кассовом аппарате
						</span>
						<label className="relative inline-flex items-center cursor-pointer min-h-[44px] md:min-h-[36px]">
							<input
								type="checkbox"
								checked={printZReport}
								onChange={(e) => setPrintZReport(e.target.checked)}
								className="sr-only peer"
							/>
							<div className="w-10 h-5 bg-[var(--line)] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] md:after:top-[8px] after:left-[2px] after:bg-white after:border-[var(--line)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary)]" />
						</label>
					</div>

					{/* Error Alert */}
					{errorMessage && (
						<div
							className="p-3 rounded-xl border flex items-center justify-between gap-2 text-xs animate-in fade-in duration-150 bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--danger)]"
							role="alert"
						>
							<div className="flex items-center gap-2 min-w-0">
								<AlertTriangle className="w-4 h-4 shrink-0" />
								<span>{errorMessage}</span>
							</div>
							<button
								type="button"
								onClick={handleExecuteCloseShift}
								className="h-8 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer bg-[var(--danger)] text-white hover:opacity-90 transition-opacity"
							>
								Повторить
							</button>
						</div>
					)}

					{/* Success Toast */}
					{closedSuccessData && (
						<div className="p-3 rounded-xl bg-[var(--success-soft)] border border-[var(--success-line)] text-[var(--success-ink)] flex items-center gap-2 text-xs">
							<ShieldCheck className="w-4 h-4 shrink-0" />
							<span>Смена №{shiftNumber} успешно закрыта! Z-отчёт сформирован.</span>
						</div>
					)}
				</div>

				{/* Footer with exactly 1 Primary CTA */}
				<div
					className="min-h-16 px-4 sm:px-6 py-2.5 border-t border-[var(--line)] bg-[var(--paper-soft)]/50 flex items-center justify-end gap-2 sm:gap-3 shrink-0"
					style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
				>
					<button
						type="button"
						onClick={onClose}
						aria-busy={isSubmitting}
						className="h-11 md:h-9 px-3.5 rounded-xl md:rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleExecuteCloseShift}
						aria-busy={isSubmitting}
						data-testid="btn-confirm-close-shift-z-report"
						className="h-11 md:h-9 flex-1 sm:flex-initial px-3.5 rounded-xl md:rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium shadow-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
						style={{ backgroundColor: "var(--primary)", color: "#ffffff" }}
					>
						{isSubmitting ? (
							<>
								<RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
								<span className="hidden sm:inline">Закрытие смены и печать Z-отчёта...</span>
								<span className="sm:hidden">Закрытие смены...</span>
							</>
						) : (
							<>
								<span className="hidden sm:inline">Закрыть смену и напечатать Z-отчёт</span>
								<span className="sm:hidden">Закрыть смену и Z-отчёт</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
};

export default CashShiftClosingModal;
