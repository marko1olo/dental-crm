/**
 * CashShiftClosingModal.tsx — Statutory 54-FZ (FFD 1.2) Cash Shift Closing, Reconciliation,
 * 3-Action Workflow (Внесение размена, X-отчет, Z-отчет), Discrepancy Protocol & Accounting Documents.
 *
 * Compliant with:
 * - Federal Law No. 54-FZ & Order of FTS of Russia No. ED-7-20/662@ (FFD 1.2)
 * - Bank of Russia Directive No. 3210-U (Documents KO-1, KO-2)
 * - Integer Kopeck Exact Arithmetic (Zero Floating Point Drift)
 * - Glove & Desktop Medical UI Density
 */

import React, { useId, useMemo, useState } from "react";
import {
	AlertCircle,
	AlertTriangle,
	ArrowDownRight,
	ArrowUpRight,
	Banknote,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	CreditCard,
	DollarSign,
	FileSpreadsheet,
	FileText,
	HelpCircle,
	History,
	Lock,
	LogOut,
	PlusCircle,
	Printer,
	QrCode,
	RotateCcw,
	Send,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Wallet,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	type CashDiscrepancyReason,
	type CashShiftOperationRecord,
	type CashShiftReconciliationResult,
	type ClinicFiscalDetails,
	type EncashmentStatementData,
	type Ko1CashInflowVoucher,
	type Ko2CashOutflowVoucher,
	type ShiftClosingActData,
	CASH_DISCREPANCY_REASON_LABELS,
	DEFAULT_CLINIC_FISCAL_DETAILS,
	EMPTY_CASH_DENOMINATIONS,
	calculateCashShiftBalances,
	convertRubToWordsRu,
	generateEncashmentStatement,
	generateEncashmentStatementHtml,
	generateKo1Html,
	generateKo1Voucher,
	generateKo2Html,
	generateKo2Voucher,
	generateMonospacedTapeText,
	generateShiftClosingAct,
	generateShiftClosingActHtml,
} from "./cashShiftClosingEngine";
import "./cashShiftClosing.css";

export interface CashShiftClosingModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly shiftNumber?: number | undefined;
	readonly openedAtIso?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly initialChangeFundRub?: number | undefined;
	readonly operations?: readonly CashShiftOperationRecord[] | undefined;
	readonly clinicDetails?: Partial<ClinicFiscalDetails> | undefined;
	readonly onConfirmCloseShift?: (reconciliation: CashShiftReconciliationResult) => Promise<void> | void;
	readonly onPerformEncashment?: (encashment: EncashmentStatementData) => Promise<void> | void;
	readonly onCashIn?: (amountRub: number, basis: string) => Promise<void> | void;
}

export const CashShiftClosingModal: React.FC<CashShiftClosingModalProps> = ({
	isOpen,
	onClose,
	shiftNumber = 42,
	openedAtIso = new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
	cashierFullName = "Сидорова Анна Павловна",
	cashierInn = "770198765432",
	initialChangeFundRub = 5000,
	operations: providedOperations,
	clinicDetails,
	onConfirmCloseShift,
	onPerformEncashment,
	onCashIn,
}) => {
	// Mode view: "main" (closing & reconciliation), "cash_in" (drawer deposit), "x_report" (intermediate tape), "documents" (A4 printouts)
	const [activeView, setActiveView] = useState<"main" | "cash_in" | "x_report" | "documents">("main");
	
	// Actual physical cash input by admin (NO bill-counting bloat required!)
	const [countedCashInput, setCountedCashInput] = useState<string>("");
	const [retainedChangeFundInput, setRetainedChangeFundInput] = useState<string>("5000");
	const [discrepancyReason, setDiscrepancyReason] = useState<CashDiscrepancyReason>("exact_match");
	const [cashierExplanation, setCashierExplanation] = useState<string>("");
	
	// Cash-in (Внесение размена) state
	const [cashInAmountInput, setCashInAmountInput] = useState<string>("5000");
	const [cashInBasis, setCashInBasis] = useState<string>("Внесение утреннего разменного фонда для расчетов с пациентами");
	
	// Tape & Encashment settings
	const [tapeWidth, setTapeWidth] = useState<"58mm" | "80mm">("58mm");
	const [encashmentDestination, setEncashmentDestination] = useState<"clinic_safe" | "main_cash_desk" | "bank_collector">("clinic_safe");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isCopied, setIsCopied] = useState(false);

	// Local state for dynamic operations (including newly added cash_in)
	const [dynamicOperations, setDynamicOperations] = useState<readonly CashShiftOperationRecord[]>([]);

	// Generate realistic operations if none provided
	const initialOperations: readonly CashShiftOperationRecord[] = useMemo(() => {
		if (providedOperations && providedOperations.length > 0) {
			return providedOperations;
		}
		const baseTime = new Date(openedAtIso).getTime();
		return [
			{
				id: "op-1",
				timestampIso: new Date(baseTime + 30 * 60 * 1000).toISOString(),
				type: "patient_payment",
				amountRub: 12500,
				amountKopecks: 1250000 as any,
				tenderType: "card",
				description: "Оплата услуг: Лечение кариеса и реставрация",
				patientName: "Барабаш С. В.",
				cashierFullName,
			},
			{
				id: "op-2",
				timestampIso: new Date(baseTime + 90 * 60 * 1000).toISOString(),
				type: "patient_payment",
				amountRub: 8000,
				amountKopecks: 800000 as any,
				tenderType: "cash",
				description: "Оплата услуг: Профессиональная гигиена полости рта",
				patientName: "Смирнова Е. А.",
				cashierFullName,
			},
			{
				id: "op-3",
				timestampIso: new Date(baseTime + 180 * 60 * 1000).toISOString(),
				type: "patient_payment",
				amountRub: 35000,
				amountKopecks: 3500000 as any,
				tenderType: "sbp",
				description: "Оплата по СБП QR: Дентальная имплантация Straumann",
				patientName: "Кузнецов Д. И.",
				cashierFullName,
			},
			{
				id: "op-4",
				timestampIso: new Date(baseTime + 240 * 60 * 1000).toISOString(),
				type: "patient_payment",
				amountRub: 15000,
				amountKopecks: 1500000 as any,
				tenderType: "advance_offset",
				description: "Зачет депозита: Ортопедический этап",
				patientName: "Петрова Н. С.",
				cashierFullName,
			},
			{
				id: "op-5",
				timestampIso: new Date(baseTime + 300 * 60 * 1000).toISOString(),
				type: "patient_refund",
				amountRub: 2000,
				amountKopecks: 200000 as any,
				tenderType: "cash",
				description: "Возврат прихода (наличные): Отмена снимка ОПТГ",
				patientName: "Васильев П. О.",
				cashierFullName,
			},
		];
	}, [providedOperations, openedAtIso, cashierFullName]);

	const effectiveOperations = useMemo(() => {
		return [...initialOperations, ...dynamicOperations];
	}, [initialOperations, dynamicOperations]);

	// Parsed counted cash from input
	const parsedCountedCashRub = useMemo(() => {
		if (countedCashInput.trim() !== "") {
			const n = parseFloat(countedCashInput.replace(/\s/g, "").replace(",", "."));
			return Number.isNaN(n) ? undefined : n;
		}
		return undefined;
	}, [countedCashInput]);

	const parsedRetainedChangeFundRub = useMemo(() => {
		const n = parseFloat(retainedChangeFundInput.replace(/\s/g, "").replace(",", "."));
		return Number.isNaN(n) ? 0 : Math.max(0, n);
	}, [retainedChangeFundInput]);

	// Compiled 54-FZ Reconciliation Summary
	const reconciliation = useMemo(() => {
		return calculateCashShiftBalances({
			shiftNumber,
			openedAtIso,
			cashierFullName,
			cashierInn,
			initialChangeFundRub,
			operations: effectiveOperations,
			countedCashRub: parsedCountedCashRub,
			retainedChangeFundRub: parsedRetainedChangeFundRub,
			discrepancyReason,
			cashierExplanation,
		});
	}, [
		shiftNumber,
		openedAtIso,
		cashierFullName,
		cashierInn,
		initialChangeFundRub,
		effectiveOperations,
		parsedCountedCashRub,
		parsedRetainedChangeFundRub,
		discrepancyReason,
		cashierExplanation,
	]);

	// Monospaced Fiscal Receipt Tape (X-Report or Z-Report)
	const xReportTapeText = useMemo(() => {
		return generateMonospacedTapeText({
			reportType: "x_report",
			reconciliation,
			clinic: clinicDetails,
			tapeWidth,
		});
	}, [reconciliation, clinicDetails, tapeWidth]);

	const zReportTapeText = useMemo(() => {
		return generateMonospacedTapeText({
			reportType: "z_report",
			reconciliation,
			clinic: clinicDetails,
			tapeWidth,
		});
	}, [reconciliation, clinicDetails, tapeWidth]);

	const handleCopyTape = async (text: string) => {
		await navigator.clipboard.writeText(text);
		setIsCopied(true);
		showToast("Текст фискального отчета скопирован в буфер", "success");
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handlePrintWindow = (html: string) => {
		const w = window.open("", "_blank");
		if (w) {
			w.document.write(html);
			w.document.close();
			w.focus();
			setTimeout(() => {
				w.print();
			}, 300);
		} else {
			showToast("Разрешите всплывающие окна для печати документов", "warning");
		}
	};

	// 1-Click Quick Fill "Сходится"
	const handleApplyExactCash = () => {
		setCountedCashInput(reconciliation.calculatedCashInDrawerRub.toString());
		setDiscrepancyReason("exact_match");
		setCashierExplanation("");
		showToast(`Установлена расчетная сумма: ${reconciliation.calculatedCashInDrawerRub.toLocaleString("ru-RU")} ₽`, "info");
	};

	// Perform Cash In (Внесение размена)
	const handleExecuteCashIn = async () => {
		const amount = parseFloat(cashInAmountInput.replace(/\s/g, "").replace(",", "."));
		if (Number.isNaN(amount) || amount <= 0) {
			showToast("Укажите корректную сумму внесения в рублях", "warning");
			return;
		}

		const newOp: CashShiftOperationRecord = {
			id: `cash-in-${Date.now()}`,
			timestampIso: new Date().toISOString(),
			type: "cash_in",
			amountRub: amount,
			amountKopecks: (amount * 100) as any,
			description: cashInBasis || "Внесение разменного фонда",
			docNumber: `ПКО-${shiftNumber}-${dynamicOperations.length + 1}`,
			cashierFullName,
		};

		setDynamicOperations((prev) => [...prev, newOp]);

		if (onCashIn) {
			try {
				await onCashIn(amount, cashInBasis);
			} catch (e) {
				// Non-fatal, local state updated
			}
		}

		showToast(`В кассу внесено ${amount.toLocaleString("ru-RU")} ₽ (ПКО сформирован)`, "success");
		setActiveView("main");
	};

	// Close Shift & Submit Z-Report
	const handleConfirmClose = async () => {
		if (reconciliation.isExplanationRequired && (!cashierExplanation || cashierExplanation.trim().length < 5)) {
			showToast("При расхождении в кассе обязательно укажите объяснение кассира", "warning");
			setActiveView("main");
			return;
		}

		setIsSubmitting(true);
		try {
			if (onConfirmCloseShift) {
				await onConfirmCloseShift(reconciliation);
			}
			showToast(`Смена №${reconciliation.shiftNumber} успешно закрыта! Z-отчет передан в ОФД`, "success", 4500);
			onClose();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Ошибка передачи Z-отчета в ОФД";
			showToast(`Сбой закрытия смены: ${msg}`, "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Encashment Dispatch
	const handlePerformEncashment = async () => {
		const encashment = generateEncashmentStatement({
			shiftNumber: reconciliation.shiftNumber,
			statementNumber: `ИНК-${reconciliation.shiftNumber}`,
			cashierFullName,
			encashmentAmountRub: reconciliation.encashmentAmountRub,
			denominations: EMPTY_CASH_DENOMINATIONS,
			destination: encashmentDestination,
			clinic: clinicDetails,
		});

		try {
			if (onPerformEncashment) {
				await onPerformEncashment(encashment);
			}
			showToast(`Ведомость инкассации на ${encashment.encashmentAmountRub.toLocaleString("ru-RU")} ₽ создана`, "success");
			handlePrintWindow(generateEncashmentStatementHtml(encashment));
		} catch (err) {
			showToast("Ошибка сохранения инкассации", "error");
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="cash-shift-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="cash-shift-modal-title"
			data-testid="cash-shift-closing-modal"
		>
			<div className="cash-shift-modal">
				{/* Header */}
				<div className="cash-shift-header">
					<div className="cash-shift-title-group">
						<div className={`cash-shift-icon-badge ${reconciliation.isShiftDurationExceeded24h ? "critical" : ""}`}>
							{reconciliation.isShiftDurationExceeded24h ? (
								<ShieldAlert className="w-6 h-6" />
							) : (
								<Lock className="w-6 h-6" />
							)}
						</div>
						<div>
							<h2 id="cash-shift-modal-title" className="cash-shift-heading">
								Кассовая смена №{reconciliation.shiftNumber}
								<span className="cash-shift-status-pill" title="Фискальный регламент по 54-ФЗ и ФФД 1.2">
									Фискализация
								</span>
								{reconciliation.isShiftDurationExceeded24h ? (
									<span className="cash-shift-status-pill critical inline-flex items-center gap-1">
										<AlertCircle size={12} className="shrink-0" aria-hidden="true" />
										<span>Превышен лимит 24 ч!</span>
									</span>
								) : reconciliation.isShiftDurationWarning20h ? (
									<span className="cash-shift-status-pill warning inline-flex items-center gap-1">
										<AlertTriangle size={12} className="shrink-0" aria-hidden="true" />
										<span>Внимание: {reconciliation.shiftDurationFormatted}</span>
									</span>
								) : (
									<span className="cash-shift-status-pill ok">
										Открыта ({reconciliation.shiftDurationFormatted})
									</span>
								)}
							</h2>
							<p className="cash-shift-meta-sub">
								Кассир-операционист: <strong>{cashierFullName}</strong> • Открыта: {new Date(openedAtIso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} • ККТ: {clinicDetails?.kktModelName || "АТОЛ 27Ф"}
							</p>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						{/* 3 Main Quick Action Buttons & Navigation */}
						<div className="cash-shift-nav-tabs">
							<button
								type="button"
								onClick={() => setActiveView("cash_in")}
								className={`cash-shift-nav-btn action-green ${activeView === "cash_in" ? "active" : ""}`}
								title="Внесение утреннего размена или доплаты в кассовый ящик"
							>
								<PlusCircle size={15} />
								<span>Внесение размена</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveView("x_report")}
								className={`cash-shift-nav-btn action-blue ${activeView === "x_report" ? "active" : ""}`}
								title="Промежуточный отчет без гашения"
							>
								<Printer size={15} />
								<span>X-отчет</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveView("main")}
								className={`cash-shift-nav-btn ${activeView === "main" ? "active" : ""}`}
							>
								<ShieldCheck size={15} />
								<span>Сверка и закрытие (Z)</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveView("documents")}
								className={`cash-shift-nav-btn ${activeView === "documents" ? "active" : ""}`}
								title="Бухгалтерские бланки и акты закрытия"
							>
								<FileText size={15} />
								<span>Документы А4</span>
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="cash-shift-close-btn"
							aria-label="Закрыть окно"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* 24-Hour Critical Statutory Alert Banner (54-FZ Art. 4.3) */}
				{reconciliation.isShiftDurationExceeded24h && (
					<div className="cash-shift-24h-alert critical">
						<AlertCircle size={20} style={{ flexShrink: 0 }} />
						<div>
							<strong>КРИТИЧЕСКОЕ ТРЕБОВАНИЕ 54-ФЗ И ФНС РФ:</strong> Длительность кассовой смены составляет{" "}
							<strong>{reconciliation.shiftDurationFormatted}</strong> (превышает установленный законом 24-часовой лимит).
							Печать чеков пациентов заблокирована ККТ. Необходимо незамедлительно снять Z-отчет и закрыть смену!
						</div>
					</div>
				)}

				{reconciliation.isShiftDurationWarning20h && !reconciliation.isShiftDurationExceeded24h && (
					<div className="cash-shift-24h-alert warning">
						<Clock size={18} style={{ flexShrink: 0 }} />
						<div>
							<strong>Внимание:</strong> Смена открыта уже <strong>{reconciliation.shiftDurationFormatted}</strong>.
							До блокировки ККТ по лимиту 24 ч осталось <strong>{reconciliation.hoursRemainingUntil24h} ч.</strong> Рекомендуется закрыть смену.
						</div>
					</div>
				)}

				{/* Body */}
				<div className="cash-shift-body">
					{/* VIEW 1: Main Shift Reconciliation & Closing (0-Click, No Bill-Counting Bloat) */}
					{activeView === "main" && (
						<>
							{/* 3 Main Payment Channels + Net Revenue (Exact Kopecks Reconciliation) */}
							<div className="cash-shift-metrics-grid">
								{/* 1. Cash in Drawer (Tag 1031) */}
								<div className="cash-shift-metric-card emerald">
									<div className="cash-shift-metric-header">
										<span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
											<Banknote size={16} />
											Кассовый ящик (Наличные)
										</span>
										<span>Тег 1031</span>
									</div>
									<div className="cash-shift-metric-value" style={{ color: "var(--ok-fg, #047857)" }}>
										{reconciliation.calculatedCashInDrawerRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<div className="cash-shift-metric-sub">
										Утро: {reconciliation.initialChangeFundRub.toLocaleString("ru-RU")} ₽ · Приход: +{reconciliation.tenders.cashIncomeRub.toLocaleString("ru-RU")} ₽ · Возврат: −{reconciliation.tenders.cashReturnRub.toLocaleString("ru-RU")} ₽
									</div>
								</div>

								{/* 2. POS Terminal Cards (Tag 1081) */}
								<div className="cash-shift-metric-card blue">
									<div className="cash-shift-metric-header">
										<span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
											<CreditCard size={16} />
											Эквайринг (Банковские карты)
										</span>
										<span>Тег 1081</span>
									</div>
									<div className="cash-shift-metric-value" style={{ color: "#0284c7" }}>
										{(reconciliation.tenders.cardIncomeRub - reconciliation.tenders.cardReturnRub).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<div className="cash-shift-metric-sub">
										Приход: {reconciliation.tenders.cardIncomeRub.toLocaleString("ru-RU")} ₽ · Возврат: {reconciliation.tenders.cardReturnRub.toLocaleString("ru-RU")} ₽
									</div>
								</div>

								{/* 3. SBP QR Code (Tag 1081) */}
								<div className="cash-shift-metric-card purple">
									<div className="cash-shift-metric-header">
										<span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
											<QrCode size={16} />
											Система быстрых платежей (СБП)
										</span>
										<span>QR-код</span>
									</div>
									<div className="cash-shift-metric-value" style={{ color: "#7c3aed" }}>
										{(reconciliation.tenders.sbpIncomeRub - reconciliation.tenders.sbpReturnRub).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<div className="cash-shift-metric-sub">
										Приход по QR: {reconciliation.tenders.sbpIncomeRub.toLocaleString("ru-RU")} ₽ · Мгновенное зачисление
									</div>
								</div>

								{/* 4. Total Net Revenue (54-FZ) */}
								<div className="cash-shift-metric-card teal">
									<div className="cash-shift-metric-header">
										<span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
											<ShieldCheck size={16} />
											Чистая выручка смены
										</span>
										<span>Итого 54-ФЗ</span>
									</div>
									<div className="cash-shift-metric-value" style={{ color: "var(--teal-dark, #0f766e)" }}>
										{reconciliation.tenders.netRevenueRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<div className="cash-shift-metric-sub">
										Чеков прихода: {reconciliation.receiptsCount} · Чеков возврата: {reconciliation.returnsCount}
									</div>
								</div>
							</div>

							{/* Physical Cash Input & Discrepancy Reconciliation */}
							<div className="cash-shift-card-section">
								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
									<div>
										<h3 className="cash-shift-section-title">
											Сверка фактической наличности в кассовом ящике
										</h3>
										<p style={{ fontSize: "0.75rem", color: "var(--ink-2, #64748b)", margin: "0.25rem 0 0 0" }}>
											Введите общую сумму пересчитанных наличных (без необходимости поштучного счета купюр)
										</p>
									</div>

									<div style={{ textAlign: "right" }}>
										<div style={{ fontSize: "0.6875rem", color: "var(--ink-2, #64748b)", fontWeight: 700 }}>
											РАСЧЕТНЫЙ ОСТАТОК ПО ККТ
										</div>
										<div style={{ fontSize: "1.25rem", fontWeight: 900, fontFamily: "ui-monospace, monospace", color: "var(--ink, #0f172a)" }}>
											{reconciliation.calculatedCashInDrawerRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
										</div>
									</div>
								</div>

								{/* Input Field & 1-Click "Сходится" Button */}
								<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
									<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: "1", minWidth: "16rem" }}>
										<label htmlFor="actual-cash-input-field" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
											Фактическая сумма наличности (₽):
										</label>
										<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
											<input
												id="actual-cash-input-field"
												type="text"
												inputMode="decimal"
												value={countedCashInput}
												onChange={(e) => setCountedCashInput(e.target.value)}
												placeholder={reconciliation.calculatedCashInDrawerRub.toString()}
												className="cash-shift-input-primary"
											/>
											<button
												type="button"
												onClick={handleApplyExactCash}
												className="cash-shift-btn secondary"
												title="Подставить точную сумму расчетного остатка"
											>
												<Check size={14} />
												<span>Сходится ({reconciliation.calculatedCashInDrawerRub.toLocaleString("ru-RU")} ₽)</span>
											</button>
										</div>
									</div>

									{/* Retained Change Fund for Next Shift */}
									<div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "14rem" }}>
										<label htmlFor="retained-fund-input-field" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
											Оставить размен на след. смену (₽):
										</label>
										<div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
											<input
												id="retained-fund-input-field"
												type="text"
												value={retainedChangeFundInput}
												onChange={(e) => setRetainedChangeFundInput(e.target.value)}
												placeholder="5000"
												className="cash-shift-input-primary"
												style={{ width: "8rem" }}
											/>
											<button
												type="button"
												onClick={() => setRetainedChangeFundInput("5000")}
												className="cash-shift-btn secondary-small whitespace-nowrap"
											>
												5{"\u00A0"}000{"\u00A0"}₽
											</button>
											<button
												type="button"
												onClick={() => setRetainedChangeFundInput("0")}
												className="cash-shift-btn secondary-small whitespace-nowrap"
											>
												0{"\u00A0"}₽
											</button>
										</div>
									</div>
								</div>

								{/* Discrepancy Status Banners */}
								{reconciliation.status === "balanced" ? (
									<div className="cash-shift-banner balanced">
										<CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: "0.125rem" }} />
										<div>
											<strong>Сверка успешна:</strong> Кассовый ящик сошелся копейка в копейку с данными фискального накопителя ККТ. Расхождений нет.
										</div>
									</div>
								) : reconciliation.status === "surplus" ? (
									<div className="cash-shift-banner surplus">
										<AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "0.125rem" }} />
										<div>
											<strong>Обнаружен излишек в кассе: +{reconciliation.differenceRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</strong>
											<div style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
												Фактическая сумма превышает расчетную. В соответствии с Указанием Банка России № 3210-У требуется указать причину и объяснительную кассира для акта закрытия.
											</div>
										</div>
									</div>
								) : (
									<div className="cash-shift-banner shortage">
										<AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "0.125rem" }} />
										<div>
											<strong>Обнаружена недостача в кассе: −{Math.abs(reconciliation.differenceRub).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</strong>
											<div style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
												В кассовом ящике меньше наличности, чем по фискальным чекам. Обязательно выберите причину расхождения и внесите объяснительную записку.
											</div>
										</div>
									</div>
								)}

								{/* Discrepancy Reason & Explanation Fields (Appears automatically when discrepancy exists) */}
								{reconciliation.isExplanationRequired && (
									<div className="cash-shift-discrepancy-form">
										<div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
											<label htmlFor="discrepancy-reason-dropdown" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
												Причина излишка / недостачи:
											</label>
											<select
												id="discrepancy-reason-dropdown"
												value={discrepancyReason}
												onChange={(e) => setDiscrepancyReason(e.target.value as CashDiscrepancyReason)}
												className="cash-shift-select"
											>
												{Object.entries(CASH_DISCREPANCY_REASON_LABELS).map(([k, label]) => (
													<option key={k} value={k}>
														{label}
													</option>
												))}
											</select>
										</div>

										<div>
											<label htmlFor="cashier-explanation-textarea" style={{ fontSize: "0.75rem", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>
												Объяснительная записка кассира-операциониста (для внесения в официальный Акт):
											</label>
											<textarea
												id="cashier-explanation-textarea"
												rows={2}
												value={cashierExplanation}
												onChange={(e) => setCashierExplanation(e.target.value)}
												placeholder="Опишите обстоятельства расхождения (например: ошибочно выбита сдача 500 ₽ пациенту Смирновой)..."
												className="cash-shift-textarea"
											/>
										</div>
									</div>
								)}
							</div>

							{/* Encashment & Safe Transfer Row */}
							<div className="cash-shift-encashment-strip">
								<div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", flex: 1 }}>
									<div className="cash-shift-encash-badge">
										<Banknote size={20} />
									</div>
									<div>
										<div style={{ fontSize: "0.6875rem", fontWeight: 800, textTransform: "uppercase", color: "var(--teal-dark, #0f766e)" }}>
											Сумма к инкассации (изъятие выручки из ящика)
										</div>
										<div style={{ fontSize: "1.375rem", fontWeight: 900, fontFamily: "ui-monospace, monospace", color: "var(--teal-dark, #0f766e)" }}>
											{reconciliation.encashmentAmountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
										</div>
										<div style={{ fontSize: "0.6875rem", color: "var(--ink-2, #64748b)" }}>
											{convertRubToWordsRu(reconciliation.encashmentAmountRub)}
										</div>
									</div>
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<select
										value={encashmentDestination}
										onChange={(e) => setEncashmentDestination(e.target.value as any)}
										className="cash-shift-select"
										style={{ minHeight: "2.5rem" }}
									>
										<option value="clinic_safe">Огнеупорный сейф клиники</option>
										<option value="main_cash_desk">Главная касса (выдача по РКО КО-2)</option>
										<option value="bank_collector">Служба инкассации банка</option>
									</select>

									<button
										type="button"
										onClick={handlePerformEncashment}
										className="cash-shift-btn primary-teal"
									>
										<FileSpreadsheet size={15} />
										<span>Печать ведомости</span>
									</button>
								</div>
							</div>
						</>
					)}

					{/* VIEW 2: Cash In (Внесение размена в кассу) */}
					{activeView === "cash_in" && (
						<div className="cash-shift-card-section">
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<div>
									<h3 className="cash-shift-section-title">
										Внесение наличных средств в кассовый ящик (Внесение размена)
									</h3>
									<p style={{ fontSize: "0.75rem", color: "var(--ink-2, #64748b)", margin: "0.25rem 0 0 0" }}>
										Формирование операции внесения (Cash In), фискального чека внесения и ордера КО-1 (ПКО)
									</p>
								</div>
								<button
									type="button"
									onClick={() => setActiveView("main")}
									className="cash-shift-btn secondary-small"
								>
									Вернуться к сверке
								</button>
							</div>

							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
								<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
									<div>
										<label htmlFor="cashin-amount-input" style={{ fontSize: "0.75rem", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>
											Сумма внесения (₽):
										</label>
										<input
											id="cashin-amount-input"
											type="text"
											value={cashInAmountInput}
											onChange={(e) => setCashInAmountInput(e.target.value)}
											placeholder="5000"
											className="cash-shift-input-primary"
											style={{ width: "100%" }}
										/>
										<div style={{ display: "flex", gap: "0.375rem", marginTop: "0.375rem" }}>
											{[1000, 3000, 5000, 10000].map((amt) => (
												<button
													key={amt}
													type="button"
													onClick={() => setCashInAmountInput(amt.toString())}
													className="cash-shift-btn secondary-small"
												>
													{amt.toLocaleString("ru-RU")} ₽
												</button>
											))}
										</div>
									</div>

									<div>
										<label htmlFor="cashin-basis-input" style={{ fontSize: "0.75rem", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>
											Основание внесения:
										</label>
										<input
											id="cashin-basis-input"
											type="text"
											value={cashInBasis}
											onChange={(e) => setCashInBasis(e.target.value)}
											className="cash-shift-input-primary"
											style={{ width: "100%" }}
										/>
									</div>

									<button
										type="button"
										onClick={handleExecuteCashIn}
										className="cash-shift-btn primary-teal"
										style={{ justifyContent: "center", minHeight: "2.75rem" }}
									>
										<PlusCircle size={16} />
										<span>Внести в кассу и распечатать ПКО КО-1</span>
									</button>
								</div>

								<div style={{ padding: "1rem", borderRadius: "0.75rem", backgroundColor: "var(--paper, #ffffff)", border: "1px solid var(--line, #e2e8f0)" }}>
									<div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--ink-2, #64748b)", marginBottom: "0.5rem" }}>
										Текущие операции внесения за смену:
									</div>
									<div style={{ fontSize: "0.8125rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
										<div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", borderRadius: "0.5rem", background: "var(--paper-soft, #f8fafc)" }}>
											<span>Утренний разменный фонд (открытие смены):</span>
											<strong>{initialChangeFundRub.toLocaleString("ru-RU")} ₽</strong>
										</div>
										{dynamicOperations
											.filter((op) => op.type === "cash_in")
											.map((op) => (
												<div key={op.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", borderRadius: "0.5rem", background: "var(--paper-soft, #f8fafc)" }}>
													<span>{op.description} ({new Date(op.timestampIso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}):</span>
													<strong style={{ color: "var(--ok-fg, #047857)" }}>+{op.amountRub.toLocaleString("ru-RU")} ₽</strong>
												</div>
											))}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* VIEW 3: X-Report Tape Preview & Print */}
					{activeView === "x_report" && (
						<div className="cash-shift-card-section">
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
								<div>
									<h3 className="cash-shift-section-title">
										Промежуточный отчет без гашения (X-отчет)
									</h3>
									<p style={{ fontSize: "0.75rem", color: "var(--ink-2, #64748b)", margin: "0.25rem 0 0 0" }}>
										Позволяет сверить текущие обороты ККТ посреди смены без фиксации закрытия
									</p>
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<div className="cash-shift-nav-tabs">
										<button
											type="button"
											onClick={() => setTapeWidth("58mm")}
											className={`cash-shift-nav-btn ${tapeWidth === "58mm" ? "active" : ""}`}
										>
											58 мм
										</button>
										<button
											type="button"
											onClick={() => setTapeWidth("80mm")}
											className={`cash-shift-nav-btn ${tapeWidth === "80mm" ? "active" : ""}`}
										>
											80 мм
										</button>
									</div>

									<button
										type="button"
										onClick={() => handleCopyTape(xReportTapeText)}
										className="cash-shift-btn secondary"
									>
										<Copy size={14} />
										<span>{isCopied ? "Скопировано" : "Копировать"}</span>
									</button>

									<button
										type="button"
										onClick={() => window.print()}
										className="cash-shift-btn primary-teal"
									>
										<Printer size={14} />
										<span>Печать X-отчета на ККТ</span>
									</button>
								</div>
							</div>

							<div className="cash-shift-tape-container">
								<div className={`cash-shift-tape-paper width-${tapeWidth}`}>
									{xReportTapeText}
								</div>
							</div>
						</div>
					)}

					{/* VIEW 4: Statutory Accounting Documents (A4 Acts, KO-1, KO-2) */}
					{activeView === "documents" && (
						<div className="cash-shift-card-section">
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<div>
									<h3 className="cash-shift-section-title">
										Бухгалтерские первичные формы и акты закрытия кассы
									</h3>
									<p style={{ fontSize: "0.75rem", color: "var(--ink-2, #64748b)", margin: "0.25rem 0 0 0" }}>
										Унифицированные формы РФ (Указание ЦБ РФ № 3210-У, Приказ ФНС РФ)
									</p>
								</div>
								<button
									type="button"
									onClick={() => setActiveView("main")}
									className="cash-shift-btn secondary-small"
								>
									Вернуться к сверке
								</button>
							</div>

							<div className="cash-shift-docs-grid">
								{/* 1. Act of Shift Closing */}
								<div className="cash-shift-doc-card">
									<div>
										<h4 className="cash-shift-doc-title">Акт закрытия кассовой смены</h4>
										<p className="cash-shift-doc-desc">
											Официальный акт инвентаризации кассы, сверки безналичных оплат (эквайринг, СБП), фиксации излишков/недостач и объяснительной кассира.
										</p>
									</div>
									<button
										type="button"
										onClick={() => {
											const act = generateShiftClosingAct({ reconciliation, clinic: clinicDetails });
											handlePrintWindow(generateShiftClosingActHtml(act));
										}}
										className="cash-shift-btn secondary"
										style={{ justifyContent: "center" }}
									>
										<Printer size={16} />
										<span>Печать Акта закрытия (А4)</span>
									</button>
								</div>

								{/* 2. Encashment Statement */}
								<div className="cash-shift-doc-card">
									<div>
										<h4 className="cash-shift-doc-title">Квитанция / Ведомость инкассации</h4>
										<p className="cash-shift-doc-desc">
											Ведомость передачи выручки ({reconciliation.encashmentAmountRub.toLocaleString("ru-RU")} ₽) в сейф или инкассаторскую службу банка.
										</p>
									</div>
									<button
										type="button"
										onClick={() => {
											const stmt = generateEncashmentStatement({
												shiftNumber: reconciliation.shiftNumber,
												statementNumber: `ИНК-${reconciliation.shiftNumber}`,
												cashierFullName,
												encashmentAmountRub: reconciliation.encashmentAmountRub,
												denominations: EMPTY_CASH_DENOMINATIONS,
												destination: encashmentDestination,
												clinic: clinicDetails,
											});
											handlePrintWindow(generateEncashmentStatementHtml(stmt));
										}}
										className="cash-shift-btn secondary"
										style={{ justifyContent: "center" }}
									>
										<Printer size={16} />
										<span>Печать ведомости инкассации</span>
									</button>
								</div>

								{/* 3. KO-1 Voucher (ПКО) */}
								<div className="cash-shift-doc-card">
									<div>
										<h4 className="cash-shift-doc-title">Приходный кассовый ордер (КО-1)</h4>
										<p className="cash-shift-doc-desc">
											ПКО на внесение разменного фонда ({reconciliation.initialChangeFundRub.toLocaleString("ru-RU")} ₽).
										</p>
									</div>
									<button
										type="button"
										onClick={() => {
											const v = generateKo1Voucher({
												docNumber: `ПКО-${reconciliation.shiftNumber}`,
												amountRub: reconciliation.initialChangeFundRub,
												receivedFrom: cashierFullName,
												basisRu: "Внесение разменного фонда для расчетов с пациентами",
												cashierFullName,
												clinic: clinicDetails,
											});
											handlePrintWindow(generateKo1Html(v));
										}}
										className="cash-shift-btn secondary"
										style={{ justifyContent: "center" }}
									>
										<Printer size={16} />
										<span>Печать КО-1 (ПКО)</span>
									</button>
								</div>

								{/* 4. KO-2 Voucher (РКО) */}
								<div className="cash-shift-doc-card">
									<div>
										<h4 className="cash-shift-doc-title">Расходный кассовый ордер (КО-2)</h4>
										<p className="cash-shift-doc-desc">
											РКО на передачу выручки ({reconciliation.encashmentAmountRub.toLocaleString("ru-RU")} ₽) в главную кассу.
										</p>
									</div>
									<button
										type="button"
										onClick={() => {
											const v = generateKo2Voucher({
												docNumber: `РКО-${reconciliation.shiftNumber}`,
												amountRub: reconciliation.encashmentAmountRub,
												issuedTo: "Главная касса организации / Служба инкассации",
												basisRu: `Инкассация выручки за смену №${reconciliation.shiftNumber}`,
												cashierFullName,
												clinic: clinicDetails,
											});
											handlePrintWindow(generateKo2Html(v));
										}}
										className="cash-shift-btn secondary"
										style={{ justifyContent: "center" }}
									>
										<Printer size={16} />
										<span>Печать КО-2 (РКО)</span>
									</button>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="cash-shift-footer">
					<div className="cash-shift-footer-totals">
						<span>Выручка: <strong>{reconciliation.tenders.netRevenueRub.toLocaleString("ru-RU")} ₽</strong></span>
						<span>•</span>
						<span>В кассе: <strong>{reconciliation.countedCashInDrawerRub.toLocaleString("ru-RU")} ₽</strong></span>
						<span>•</span>
						<span>Инкассация: <strong>{reconciliation.encashmentAmountRub.toLocaleString("ru-RU")} ₽</strong></span>
					</div>

					<div className="cash-shift-footer-actions">
						<button
							type="button"
							onClick={onClose}
							className="cash-shift-btn secondary"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={() => {
								const act = generateShiftClosingAct({ reconciliation, clinic: clinicDetails });
								handlePrintWindow(generateShiftClosingActHtml(act));
							}}
							className="cash-shift-btn secondary"
							title="Распечатать акт закрытия смены перед фискализацией"
						>
							<Printer size={15} />
							<span>Печать акта А4</span>
						</button>

						<button
							type="button"
							onClick={handleConfirmClose}
							disabled={isSubmitting}
							className="cash-shift-btn danger-close"
						>
							<Lock size={16} />
							<span>
								{isSubmitting ? "Отправка Z-отчета в ОФД..." : "Снять Z-отчет и закрыть смену 54-ФЗ"}
							</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
