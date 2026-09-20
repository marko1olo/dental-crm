/**
 * CashShiftWidget.tsx — Компонент управления кассовой сменой ККТ 54-ФЗ (Открытие/Закрытие, X/Z-отчеты, Офлайн-очередь, Сверка эквайринга).
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	AlertTriangle,
	Banknote,
	Check,
	CheckCircle2,
	Clock,
	CreditCard,
	FileSpreadsheet,
	FileText,
	Layers,
	Lock,
	MinusCircle,
	MoreHorizontal,
	PlusCircle,
	Printer,
	QrCode,
	RefreshCw,
	ShieldCheck,
	Unlock,
	Wallet,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { FiscalReceiptQueueManager } from "../../services/hardware/fiscalReceiptQueueManager";
import type { QueuedFiscalReceiptItem } from "../../services/hardware/hardwareTypes";
import {
	type ClinicFiscalRequisites,
	type OfflineQueueFiscalItem,
	DEFAULT_CLINIC_FISCAL_REQUISITES,
	exportFiscalPeriodStatementToCsv,
	generateFiscalPeriodStatementHtml,
	STOMX_CASH_EXPENSE_CATALOG,
	STOMX_CASH_RECEIPT_CATALOG,
	getFfd1054Label,
	isFiscal54FzOperation,
} from "@dental/shared";
import { OfflineFiscalBatchModal } from "./fiscal/OfflineFiscalBatchModal";
import { ShiftCloseZReportModal } from "./fiscal/ShiftCloseZReportModal";
import "./CashShiftWidget.css";

export interface CashShiftWidgetProps {
	readonly initialIsOpen?: boolean | undefined;
	readonly shiftNumber?: number | undefined;
	readonly cashierName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly cashInDrawerRub?: number | undefined;
	readonly cardSumRub?: number | undefined;
	readonly sbpSumRub?: number | undefined;
	readonly advanceOffsetRub?: number | undefined;
	readonly openedAt?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicRequisites?: Partial<ClinicFiscalRequisites> | undefined;
	readonly queuedReceipts?: readonly OfflineQueueFiscalItem[] | undefined;
	readonly onOpenShift?: () => void | Promise<void>;
	readonly onCloseShift?: () => void | Promise<void>;
	readonly onPrintXReport?: () => void | Promise<void>;
	readonly onPrintZReport?: () => void | Promise<void>;
	readonly onCashIn?: (amountRub: number, basis: string, typeAlias?: string) => void | Promise<void>;
	readonly onCashOut?: (amountRub: number, basis: string, recipientFio?: string, typeAlias?: string) => void | Promise<void>;
	readonly initialCashFlowModalOpen?: boolean | undefined;
	readonly initialCashFlowMode?: "cash_in" | "cash_out" | undefined;
	readonly compact?: boolean | undefined;
}

function formatMoneyRu(value: number): string {
	return (
		value.toLocaleString("ru-RU", {
			minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
			maximumFractionDigits: 2,
		}) + " ₽"
	);
}

export const CashShiftWidget: React.FC<CashShiftWidgetProps> = ({
	initialIsOpen = false,
	shiftNumber = 1,
	cashierName = "Дежурный администратор",
	cashierInn = "",
	cashInDrawerRub = 0,
	cardSumRub = 0,
	sbpSumRub = 0,
	advanceOffsetRub = 0,
	openedAt = "08:00",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "",
	clinicRequisites = DEFAULT_CLINIC_FISCAL_REQUISITES,
	queuedReceipts: externalQueuedReceipts,
	onOpenShift,
	onCloseShift,
	onPrintXReport,
	onPrintZReport,
	onCashIn,
	onCashOut,
	initialCashFlowModalOpen = false,
	initialCashFlowMode = "cash_in",
	compact = false,
}) => {
	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(initialIsOpen);
	const [isProcessing, setIsProcessing] = useState<boolean>(false);
	const [isZReportModalOpen, setIsZReportModalOpen] = useState<boolean>(false);
	const [isOfflineBatchModalOpen, setIsOfflineBatchModalOpen] = useState<boolean>(false);
	const [queuedItems, setQueuedItems] = useState<QueuedFiscalReceiptItem[]>([]);
	const [isReportsMenuOpen, setIsReportsMenuOpen] = useState<boolean>(false);
	const [isBottomActionsMenuOpen, setIsBottomActionsMenuOpen] = useState<boolean>(false);

	// StomX Cash Flow State (Wave 118: 54-FZ Tag 1054 cash in/out presets)
	const [isCashFlowModalOpen, setIsCashFlowModalOpen] = useState<boolean>(initialCashFlowModalOpen);
	const [cashFlowMode, setCashFlowMode] = useState<"cash_in" | "cash_out">(initialCashFlowMode);
	const [selectedTypeAlias, setSelectedTypeAlias] = useState<string>("");
	const [cashFlowAmount, setCashFlowAmount] = useState<string>("");
	const [cashFlowBasis, setCashFlowBasis] = useState<string>("");
	const [cashFlowPerson, setCashFlowPerson] = useState<string>("");

	const handleOpenCashInModal = () => {
		setCashFlowMode("cash_in");
		setSelectedTypeAlias("cash_deposit");
		setCashFlowBasis("Внесение разменной монеты");
		setCashFlowPerson("");
		setCashFlowAmount("");
		setIsCashFlowModalOpen(true);
	};

	const handleOpenCashOutModal = () => {
		setCashFlowMode("cash_out");
		setSelectedTypeAlias("collection");
		setCashFlowBasis("Инкассация выручки в банк");
		setCashFlowPerson("");
		setCashFlowAmount("");
		setIsCashFlowModalOpen(true);
	};

	const handleSelectReceiptPreset = (alias: string) => {
		setSelectedTypeAlias(alias);
		const preset = STOMX_CASH_RECEIPT_CATALOG.find((r) => r.alias === alias);
		if (preset) {
			setCashFlowBasis(preset.name);
		}
	};

	const handleSelectExpensePreset = (alias: string) => {
		setSelectedTypeAlias(alias);
		const preset = STOMX_CASH_EXPENSE_CATALOG.find((e) => e.alias === alias);
		if (preset) {
			setCashFlowBasis(preset.name);
		}
	};

	const handleSubmitCashOperation = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		const amount = Number.parseFloat(cashFlowAmount.replace(",", "."));
		if (!amount || Number.isNaN(amount) || amount <= 0) {
			showToast("Укажите корректную сумму операции (больше 0 ₽)", "warning");
			return;
		}

		setIsProcessing(true);
		try {
			if (cashFlowMode === "cash_in") {
				if (onCashIn) {
					await onCashIn(amount, cashFlowBasis || "Внесение наличных", selectedTypeAlias);
				}
				const item = STOMX_CASH_RECEIPT_CATALOG.find((r) => r.alias === selectedTypeAlias);
				const ffdLabel = item?.ffdTag1054 != null ? ` (54-ФЗ: ${getFfd1054Label(item.ffdTag1054)})` : " (Нефискально)";
				showToast(
					`Внесение ${formatMoneyRu(amount)} успешно зафиксировано${ffdLabel}`,
					"success",
					3500,
				);
			} else {
				if (onCashOut) {
					await onCashOut(amount, cashFlowBasis || "Изъятие наличных", cashFlowPerson || undefined, selectedTypeAlias);
				}
				const item = STOMX_CASH_EXPENSE_CATALOG.find((e) => e.alias === selectedTypeAlias);
				const ffdLabel = item?.ffdTag1054 != null ? ` (54-ФЗ: ${getFfd1054Label(item.ffdTag1054)})` : " (Нефискально)";
				showToast(
					`Изъятие ${formatMoneyRu(amount)} успешно зафиксировано${ffdLabel}`,
					"success",
					3500,
				);
			}
			setIsCashFlowModalOpen(false);
		} catch {
			showToast("Ошибка при фиксации кассовой операции", "error");
		} finally {
			setIsProcessing(false);
		}
	};

	const renderCashFlowModal = () => {
		if (!isCashFlowModalOpen) return null;

		return (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
				data-testid="cash-flow-modal"
				role="dialog"
				aria-modal="true"
			>
				<div className="bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,rgba(0,0,0,0.1))] w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
					{/* Modal Header */}
					<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line,rgba(0,0,0,0.1))] bg-[var(--paper-soft,#f8fafc)] shrink-0">
						<div className="flex items-center gap-2.5">
							<div
								className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
									cashFlowMode === "cash_in"
										? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
										: "bg-rose-500/15 text-rose-600 dark:text-rose-400"
								}`}
							>
								{cashFlowMode === "cash_in" ? <PlusCircle size={20} /> : <MinusCircle size={20} />}
							</div>
							<div>
								<h3 className="text-base font-extrabold text-[var(--ink,#0f172a)]">
									{cashFlowMode === "cash_in" ? "Кассовое внесение наличных (Приход)" : "Кассовое изъятие наличных (Расход)"}
								</h3>
								<p className="text-xs text-[var(--muted,#64748b)]">
									Классификация операций ККТ 54-ФЗ и кассы клиники
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={() => setIsCashFlowModalOpen(false)}
							data-testid="btn-close-cash-flow-modal"
							className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--glass-hover)] transition-colors cursor-pointer"
							title="Закрыть"
						>
							<X size={20} />
						</button>
					</div>

					{/* Modal Body */}
					<div className="p-6 overflow-y-auto flex-1 space-y-5">
						{/* Mode Tabs */}
						<div className="grid grid-cols-2 gap-2 p-1 bg-[var(--paper-soft,#f1f5f9)] rounded-xl border border-[var(--line,rgba(0,0,0,0.06))]">
							<button
								type="button"
								onClick={() => {
									setCashFlowMode("cash_in");
									setSelectedTypeAlias("cash_deposit");
									setCashFlowBasis("Внесение разменной монеты");
								}}
								data-testid="tab-cash-in-mode"
								className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
									cashFlowMode === "cash_in"
										? "bg-[var(--paper,#ffffff)] text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-500/30"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								<PlusCircle size={16} />
								<span>Внесение ДС (Приход)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setCashFlowMode("cash_out");
									setSelectedTypeAlias("collection");
									setCashFlowBasis("Инкассация выручки в банк");
								}}
								data-testid="tab-cash-out-mode"
								className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
									cashFlowMode === "cash_out"
										? "bg-[var(--paper,#ffffff)] text-rose-700 dark:text-rose-400 shadow-xs border border-rose-500/30"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								<MinusCircle size={16} />
								<span>Изъятие ДС (Расход)</span>
							</button>
						</div>

						{/* 1-Click Catalog Presets */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<label className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
									Тип операции ({cashFlowMode === "cash_in" ? "Каталог приходов клиники" : "Каталог расходов клиники"}):
								</label>
								<span className="text-[11px] text-[var(--muted,#64748b)]">1 клик для выбора</span>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-[var(--line,rgba(0,0,0,0.06))] rounded-xl bg-[var(--paper-soft,#f8fafc)]">
								{cashFlowMode === "cash_in"
									? STOMX_CASH_RECEIPT_CATALOG.map((receipt) => {
											const isSelected = selectedTypeAlias === receipt.alias;
											return (
												<button
													key={receipt.alias}
													type="button"
													onClick={() => handleSelectReceiptPreset(receipt.alias)}
													data-testid={`preset-receipt-${receipt.alias}`}
													className={`min-h-[44px] p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
														isSelected
															? "bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs"
															: "bg-[var(--paper,#ffffff)] border-[var(--line,rgba(0,0,0,0.06))] hover:border-emerald-500/40 text-[var(--ink,#0f172a)]"
													}`}
												>
													<div className="flex items-center justify-between gap-2">
														<span className="text-xs font-semibold truncate">{receipt.name}</span>
														{isSelected && <Check size={14} className="text-emerald-600 shrink-0" />}
													</div>
													<div className="flex items-center gap-1.5 flex-wrap">
														{receipt.ffdTag1054 !== null ? (
															<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold">
																{`54-ФЗ: Тег 1054 = ${receipt.ffdTag1054Code} (${receipt.ffdTag1054})`}
															</span>
														) : (
															<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 font-medium">
																Нефискально
															</span>
														)}
													</div>
												</button>
											);
									  })
									: STOMX_CASH_EXPENSE_CATALOG.map((expense) => {
											const isSelected = selectedTypeAlias === expense.alias;
											return (
												<button
													key={expense.alias}
													type="button"
													onClick={() => handleSelectExpensePreset(expense.alias)}
													data-testid={`preset-expense-${expense.alias}`}
													className={`min-h-[44px] p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
														isSelected
															? "bg-rose-500/15 border-rose-500 text-rose-800 dark:text-rose-300 font-bold shadow-xs"
															: "bg-[var(--paper,#ffffff)] border-[var(--line,rgba(0,0,0,0.06))] hover:border-rose-500/40 text-[var(--ink,#0f172a)]"
													}`}
												>
													<div className="flex items-center justify-between gap-2">
														<span className="text-xs font-semibold truncate">{expense.name}</span>
														{isSelected && <Check size={14} className="text-rose-600 shrink-0" />}
													</div>
													<div className="flex items-center gap-1.5 flex-wrap">
														{expense.ffdTag1054 !== null ? (
															<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold">
																{`54-ФЗ: Тег 1054 = ${expense.ffdTag1054Code} (${expense.ffdTag1054})`}
															</span>
														) : (
															<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 font-medium">
																Нефискально
															</span>
														)}
													</div>
												</button>
											);
									  })}
							</div>
						</div>

						{/* Amount Input and Quick Chips */}
						<div>
							<label className="block text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider mb-1.5">
								Сумма операции (₽):
							</label>
							<div className="relative">
								<input
									type="number"
									step="0.01"
									min="0"
									placeholder="0.00"
									value={cashFlowAmount}
									onChange={(e) => setCashFlowAmount(e.target.value)}
									data-testid="input-cash-flow-amount"
									className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line,rgba(0,0,0,0.15))] bg-[var(--paper,#ffffff)] text-lg font-black font-mono text-[var(--ink,#0f172a)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
								/>
								<span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--muted,#64748b)] pointer-events-none">
									₽
								</span>
							</div>

							{/* Quick amount chips */}
							<div className="flex items-center gap-1.5 mt-2 flex-wrap">
								{[500, 1000, 5000, 10000].map((amt) => (
									<button
										key={amt}
										type="button"
										onClick={() => setCashFlowAmount(String(amt))}
										className="min-h-[44px] px-3 py-1 text-xs font-bold rounded-lg border border-[var(--line,rgba(0,0,0,0.1))] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--glass-hover)] transition-all cursor-pointer"
									>
										+{amt.toLocaleString("ru-RU")} ₽
									</button>
								))}
								{cashFlowMode === "cash_out" && cashInDrawerRub > 0 && (
									<button
										type="button"
										onClick={() => setCashFlowAmount(String(cashInDrawerRub))}
										className="min-h-[44px] px-3 py-1 text-xs font-bold rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
									>
										Вся наличность ({formatMoneyRu(cashInDrawerRub)})
									</button>
								)}
							</div>
						</div>

						{/* Basis / Reason Input */}
						<div>
							<label className="block text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider mb-1.5">
								Основание операции / Назначение платежа:
							</label>
							<input
								type="text"
								placeholder="Например: Внесение разменной монеты на начало смены"
								value={cashFlowBasis}
								onChange={(e) => setCashFlowBasis(e.target.value)}
								data-testid="input-cash-flow-basis"
								className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line,rgba(0,0,0,0.15))] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
							/>
						</div>

						{/* Person / Recipient Input */}
						<div>
							<label className="block text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider mb-1.5">
								{cashFlowMode === "cash_in" ? "ФИО плательщика / сотрудника (опционально):" : "ФИО получателя / инкассатора (опционально):"}
							</label>
							<input
								type="text"
								placeholder={cashFlowMode === "cash_in" ? "ФИО вносителя" : "ФИО получателя"}
								value={cashFlowPerson}
								onChange={(e) => setCashFlowPerson(e.target.value)}
								data-testid="input-cash-flow-person"
								className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line,rgba(0,0,0,0.15))] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
							/>
							<p className="text-[11px] text-[var(--muted,#64748b)] mt-1">
								По 54-ФЗ ИНН для физических лиц не требуется.
							</p>
						</div>
					</div>

					{/* Modal Footer */}
					<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--line,rgba(0,0,0,0.1))] bg-[var(--paper-soft,#f8fafc)] shrink-0">
						<button
							type="button"
							onClick={() => setIsCashFlowModalOpen(false)}
							data-testid="btn-cancel-cash-operation"
							className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line,rgba(0,0,0,0.15))] text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--glass-hover)] transition-all cursor-pointer"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={handleSubmitCashOperation}
							data-testid="btn-confirm-cash-operation"
							className={`min-h-[44px] px-6 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
								cashFlowMode === "cash_in"
									? "bg-emerald-600 hover:bg-emerald-700"
									: "bg-rose-600 hover:bg-rose-700"
							}`}
						>
							{cashFlowMode === "cash_in" ? <PlusCircle size={16} /> : <MinusCircle size={16} />}
							<span>{cashFlowMode === "cash_in" ? "Подтвердить внесение в кассу" : "Подтвердить изъятие из кассы"}</span>
						</button>
					</div>
				</div>
			</div>
		);
	};

	// Subscribe to live hardware offline queue manager
	useEffect(() => {
		const unsubscribe = FiscalReceiptQueueManager.subscribe((items) => {
			setQueuedItems(items);
		});
		return () => {
			unsubscribe();
		};
	}, []);

	const pendingOfflineCount = useMemo(() => {
		if (externalQueuedReceipts && externalQueuedReceipts.length > 0) {
			return externalQueuedReceipts.length;
		}
		return queuedItems.filter(
			(i) => i.status === "pending_print" || i.status === "hardware_offline",
		).length;
	}, [externalQueuedReceipts, queuedItems]);

	const pendingOfflineAmountRub = useMemo(() => {
		if (externalQueuedReceipts && externalQueuedReceipts.length > 0) {
			return externalQueuedReceipts.reduce((sum, r) => {
				const tendersSum =
					(r.tenders.cashRub || 0) +
					(r.tenders.cardRub || 0) +
					(r.tenders.sbpRub || 0) +
					(r.tenders.advanceOffsetRub || 0);
				const itemsSum = r.items.reduce(
					(iSum, it) => iSum + (it.priceRub * (it.quantity ?? 1) - (it.discountRub ?? 0)),
					0,
				);
				return sum + (tendersSum > 0 ? tendersSum : itemsSum);
			}, 0);
		}
		return queuedItems
			.filter((i) => i.status === "pending_print" || i.status === "hardware_offline")
			.reduce((sum, i) => sum + (i.payload?.totalRub || 0), 0);
	}, [externalQueuedReceipts, queuedItems]);

	// Total turnover across all fiscal tenders
	const totalTurnoverRub = cashInDrawerRub + cardSumRub + sbpSumRub + advanceOffsetRub;

	// Acquiring fee calculation (standard 1.5% commission rate)
	const acquiringFeeRub = Math.round((cardSumRub + sbpSumRub) * 0.015 * 100) / 100;
	const netBankDepositRub = Math.max(0, cardSumRub + sbpSumRub - acquiringFeeRub);

	const handleToggleShift = async () => {
		setIsProcessing(true);
		try {
			if (isShiftOpen) {
				if (onCloseShift) await onCloseShift();
				setIsShiftOpen(false);
				showToast(
					`Смена №${shiftNumber} успешно закрыта (Z-отчет снят). Выручка: ${formatMoneyRu(totalTurnoverRub)}`,
					"success",
					4000,
				);
			} else {
				if (onOpenShift) await onOpenShift();
				setIsShiftOpen(true);
				showToast(`Смена №${shiftNumber + 1} открыта на ККТ`, "success", 3000);
			}
		} catch {
			showToast("Ошибка связи с фискальным регистратором", "error");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleXReport = async () => {
		if (!isShiftOpen) {
			showToast("Смена закрыта. Для снятия промежуточного отчета откройте смену", "info", 4000);
			return;
		}
		setIsProcessing(true);
		try {
			if (onPrintXReport) await onPrintXReport();
			showToast(
				`X-отчет (промежуточный) напечатан: ${formatMoneyRu(totalTurnoverRub)}`,
				"info",
				3000,
			);
		} catch {
			showToast("Не удалось распечатать X-отчет", "error");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleOpenZReportModal = () => {
		if (!isShiftOpen) {
			showToast("Смена уже закрыта", "warning");
			return;
		}
		setIsZReportModalOpen(true);
	};

	const handlePrintAccountingStatement = () => {
		const html = generateFiscalPeriodStatementHtml({
			clinicRequisites: clinicRequisites
				? { ...DEFAULT_CLINIC_FISCAL_REQUISITES, ...clinicRequisites }
				: DEFAULT_CLINIC_FISCAL_REQUISITES,
			statementNumber: `СМЕНА-${shiftNumber}`,
			periodStart: new Date().toISOString().slice(0, 10),
			periodEnd: new Date().toISOString().slice(0, 10),
			periodLabelRu: `Кассовая смена №${shiftNumber} (${new Date().toLocaleDateString("ru-RU")})`,
			shifts: [
				{
					shiftNumber,
					date: new Date().toISOString().slice(0, 10),
					cashierFullName: cashierName,
					receiptsCount: 12,
					cashIncomeRub: cashInDrawerRub,
					cashIncomeKopecks: Math.round(cashInDrawerRub * 100),
					cardIncomeRub: cardSumRub,
					cardIncomeKopecks: Math.round(cardSumRub * 100),
					sbpIncomeRub: sbpSumRub,
					sbpIncomeKopecks: Math.round(sbpSumRub * 100),
					advanceOffsetIncomeRub: advanceOffsetRub,
					advanceOffsetIncomeKopecks: Math.round(advanceOffsetRub * 100),
					returnsTotalRub: 0,
					returnsTotalKopecks: 0,
					shiftRevenueTotalRub: totalTurnoverRub,
					shiftRevenueTotalKopecks: Math.round(totalTurnoverRub * 100),
				},
			],
			bankStatementTotalRub: cardSumRub + sbpSumRub,
			bankAcquiringFeeRub: acquiringFeeRub,
			cashierFullName: cashierName,
		});

		const w = window.open("", "_blank");
		if (w) {
			w.document.write(html);
			w.document.close();
			w.focus();
			setTimeout(() => w.print(), 250);
		}
	};

	const handleExport1cCsv = () => {
		const csv = exportFiscalPeriodStatementToCsv({
			clinicRequisites: clinicRequisites
				? { ...DEFAULT_CLINIC_FISCAL_REQUISITES, ...clinicRequisites }
				: DEFAULT_CLINIC_FISCAL_REQUISITES,
			statementNumber: `СМЕНА-${shiftNumber}`,
			periodStart: new Date().toISOString().slice(0, 10),
			periodEnd: new Date().toISOString().slice(0, 10),
			periodLabelRu: `Кассовая смена №${shiftNumber} (${new Date().toLocaleDateString("ru-RU")})`,
			shifts: [
				{
					shiftNumber,
					date: new Date().toISOString().slice(0, 10),
					cashierFullName: cashierName,
					receiptsCount: 12,
					cashIncomeRub: cashInDrawerRub,
					cashIncomeKopecks: Math.round(cashInDrawerRub * 100),
					cardIncomeRub: cardSumRub,
					cardIncomeKopecks: Math.round(cardSumRub * 100),
					sbpIncomeRub: sbpSumRub,
					sbpIncomeKopecks: Math.round(sbpSumRub * 100),
					advanceOffsetIncomeRub: advanceOffsetRub,
					advanceOffsetIncomeKopecks: Math.round(advanceOffsetRub * 100),
					returnsTotalRub: 0,
					returnsTotalKopecks: 0,
					shiftRevenueTotalRub: totalTurnoverRub,
					shiftRevenueTotalKopecks: Math.round(totalTurnoverRub * 100),
				},
			],
			bankStatementTotalRub: cardSumRub + sbpSumRub,
			bankAcquiringFeeRub: acquiringFeeRub,
			cashierFullName: cashierName,
		});

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Fiscal_Shift_${shiftNumber}_1C_Export_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Ведомость смены успешно выгружена для 1С:Бухгалтерии (UTF-8 BOM)", "success");
	};

	if (compact) {
		return (
			<div
				className="cash-shift-container cash-shift-compact flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 sm:px-3 sm:py-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xs text-xs min-h-[44px] h-auto mb-3"
				data-testid="cash-shift-widget"
			>
				{/* Левая часть: статус смены, номер, кассир, выручка, очередь */}
				<div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap flex-1">
					<div
						className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
							isShiftOpen
								? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
								: "bg-rose-500/15 text-rose-600 dark:text-rose-400"
						}`}
						title={isShiftOpen ? "Смена открыта" : "Смена закрыта"}
					>
						{isShiftOpen ? <Unlock size={14} /> : <Lock size={14} />}
					</div>

					<span className="font-bold text-[var(--ink)] whitespace-nowrap">
						{`Смена №${shiftNumber}:`}
					</span>

					<span
						className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
							isShiftOpen
								? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
								: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
						}`}
					>
						{isShiftOpen ? "Открыта" : "Закрыта"}
					</span>

					<span className="text-[var(--muted)] hidden 2xl:inline whitespace-nowrap shrink-0">
						Кассир: <strong className="text-[var(--ink)] font-semibold">{cashierName}</strong>
					</span>

					<span className="text-[var(--muted)] hidden sm:inline">•</span>

					<span className="font-mono font-bold text-[var(--ink)] whitespace-nowrap shrink-0 min-w-max">
						Выручка: {formatMoneyRu(totalTurnoverRub)}
					</span>

					{pendingOfflineCount > 0 && (
						<button
							type="button"
							onClick={() => setIsOfflineBatchModalOpen(true)}
							className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0 cursor-pointer animate-pulse hover:bg-amber-500/25 transition-colors"
							title="В офлайн-очереди есть чеки"
						>
							<Layers size={12} />
							<span>Очередь: {pendingOfflineCount}</span>
						</button>
					)}
				</div>

				{/* Правая часть: кнопки внесения/изъятия, кнопка смены, меню отчетов (...) по Мандату 8p */}
				<div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-start sm:justify-end shrink-0 relative">
					<button
						type="button"
						onClick={handleOpenCashInModal}
						data-testid="btn-compact-cash-in"
						className="secondary-button min-h-[44px] px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 text-emerald-700 dark:text-emerald-300"
						title="Внесение наличных в кассу (размен / приход)"
					>
						<PlusCircle size={13} className="shrink-0 text-emerald-600" />
						<span className="hidden sm:inline">Внесение</span>
					</button>

					<button
						type="button"
						onClick={handleOpenCashOutModal}
						data-testid="btn-compact-cash-out"
						className="secondary-button min-h-[44px] px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 text-rose-700 dark:text-rose-300"
						title="Изъятие / инкассация наличных из кассы"
					>
						<MinusCircle size={13} className="shrink-0 text-rose-600" />
						<span className="hidden sm:inline">Изъятие</span>
					</button>

					<button
						type="button"
						onClick={isShiftOpen ? handleOpenZReportModal : handleToggleShift}
						disabled={isProcessing}
						data-testid="cash-shift-toggle-btn"
						className={`min-h-[44px] px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 cursor-pointer transition-all ${
							isShiftOpen
								? "bg-rose-600 hover:bg-rose-700 text-white"
								: "bg-emerald-600 hover:bg-emerald-700 text-white"
						}`}
						title={isShiftOpen ? "Сформировать Z-отчет и закрыть смену" : "Открыть кассовую смену"}
					>
						{isShiftOpen ? (
							<>
								<Lock size={13} />
								<span>Закрыть смену (Z-отчет)</span>
							</>
						) : (
							<>
								<Unlock size={13} />
								<span>Открыть смену</span>
							</>
						)}
					</button>

					{/* Выпадающее меню отчетов и выгрузки (...) по Мандату 8p */}
					<div className="relative inline-block">
						<button
							type="button"
							onClick={() => setIsReportsMenuOpen((prev) => !prev)}
							data-testid="btn-shift-reports-menu"
							className="secondary-button min-h-[44px] px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
							title="Отчёты и экспорт (X-отчет, Ведомость А4, 1С)"
						>
							<MoreHorizontal size={14} className="shrink-0" />
							<span className="hidden md:inline">Отчёты</span>
						</button>

						<div
							className={`absolute right-0 top-full mt-1 z-30 min-w-[170px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg p-1 flex flex-col gap-0.5 ${
								isReportsMenuOpen ? "block" : "hidden"
							}`}
						>
							<button
								type="button"
								onClick={() => {
									setIsReportsMenuOpen(false);
									handleXReport();
								}}
								disabled={isProcessing}
								data-testid="btn-print-x-report"
								className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer text-neutral-800 dark:text-neutral-200"
								title="Печать X-отчета (без гашения)"
							>
								<Printer size={13} className="shrink-0 text-neutral-500" />
								<span>X-отчет (промежуточный)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsReportsMenuOpen(false);
									handlePrintAccountingStatement();
								}}
								data-testid="btn-print-accounting-statement"
								className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer text-neutral-800 dark:text-neutral-200"
								title="Печать сводной бухгалтерской ведомости А4"
							>
								<FileText size={13} className="shrink-0 text-teal-600" />
								<span>Ведомость А4</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsReportsMenuOpen(false);
									handleExport1cCsv();
								}}
								data-testid="btn-export-1c-csv"
								className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer text-neutral-800 dark:text-neutral-200"
								title="Выгрузить данные смены для 1С:Бухгалтерии"
							>
								<FileSpreadsheet size={13} className="shrink-0 text-blue-600" />
								<span>Экспорт в 1С (CSV)</span>
							</button>
						</div>
					</div>
				</div>

				{/* Модальное окно закрытия смены Z-отчетом */}
				<ShiftCloseZReportModal
					isOpen={isZReportModalOpen}
					onClose={() => setIsZReportModalOpen(false)}
					shiftNumber={shiftNumber}
					cashierFullName={cashierName}
					cashierInn={cashierInn}
					clinicLegalName={clinicName}
					clinicInn={clinicInn}
					clinicAddress={clinicRequisites.address}
					kktRegNumber={clinicRequisites.kktRegNumber}
					kktSerialNumber={clinicRequisites.kktSerialNumber}
					fnSerial={clinicRequisites.fnSerialNumber}
					ofdName={clinicRequisites.ofdName}
					onConfirmCloseShift={async () => {
						if (onCloseShift) await onCloseShift();
						setIsShiftOpen(false);
						setIsZReportModalOpen(false);
						showToast(`Смена №${shiftNumber} закрыта на ККТ и Z-отчет отправлен в ОФД`, "success");
					}}
				/>

				{/* Модальное окно пакетной фискализации офлайн-очереди */}
				<OfflineFiscalBatchModal
					isOpen={isOfflineBatchModalOpen}
					onClose={() => setIsOfflineBatchModalOpen(false)}
					clinicName={clinicName}
					cashierFullName={cashierName}
					shiftNumber={shiftNumber}
					clinicRequisites={clinicRequisites}
					onBatchProcessed={() => {
						FiscalReceiptQueueManager.flushAllPending();
						showToast("Офлайн-очередь успешно обработана и фискализирована!", "success");
					}}
				/>

				{/* Модальное окно кассовых операций (Внесение/Изъятие StomX) */}
				{renderCashFlowModal()}
			</div>
		);
	}

	return (
		<div className="cash-shift-container" data-testid="cash-shift-widget">
			{/* Верхний заголовок и статус смены */}
			<div className="cash-shift-header">
				<div className="flex items-center gap-3">
					<div
						className={`cash-shift-status-icon ${
							isShiftOpen ? "cash-shift-status-open" : "cash-shift-status-closed"
						}`}
					>
						{isShiftOpen ? (
							<Unlock className="text-emerald-500" size={24} />
						) : (
							<Lock className="text-rose-500" size={24} />
						)}
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="font-extrabold text-base sm:text-lg text-[var(--ink,#0f172a)]">
								Кассовая смена №{shiftNumber}
							</h3>
							<span
								className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
									isShiftOpen
										? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
										: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
								}`}
							>
								{isShiftOpen ? "Смена открыта" : "Смена закрыта"}
							</span>
							{pendingOfflineCount > 0 && (
								<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse flex items-center gap-1">
									<Layers size={12} />
									Очередь: {pendingOfflineCount}
								</span>
							)}
						</div>
						<p className="text-xs text-[var(--muted,#64748b)] flex items-center gap-2 mt-0.5">
							<span>
								Кассир: <strong className="text-[var(--ink,#0f172a)]">{cashierName}</strong>
							</span>
							{isShiftOpen && (
								<>
									<span>·</span>
									<span className="flex items-center gap-1">
										<Clock size={12} /> Открыта с {openedAt}
									</span>
								</>
							)}
						</p>
					</div>
				</div>

				{/* Кнопка Открыть/Закрыть смену (Единая точка действия по Закону Хика) */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={isShiftOpen ? handleOpenZReportModal : handleToggleShift}
						disabled={isProcessing}
						className={`cash-shift-btn min-h-[48px] px-5 text-sm font-bold shadow-md cursor-pointer ${
							isShiftOpen ? "cash-shift-btn-open" : "cash-shift-btn-closed"
						}`}
						data-testid="cash-shift-toggle-btn"
					>
						{isShiftOpen ? (
							<>
								<Lock size={16} />
								<span>Сформировать Z-отчет и закрыть смену</span>
							</>
						) : (
							<>
								<Unlock size={16} />
								<span>{shiftNumber === 1 && totalTurnoverRub === 0 ? "+ Открыть первую смену" : "Открыть смену"}</span>
							</>
						)}
					</button>
				</div>
			</div>

			{/* Аварийный баннер офлайн-очереди при обрыве связи с ККТ/ОФД */}
			{pendingOfflineCount > 0 && (
				<div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-3">
					<div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 font-semibold">
						<AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
						<div>
							<span>В офлайн-очереди накопилось <strong>{pendingOfflineCount} неотправленных чеков</strong> на сумму <strong>{formatMoneyRu(pendingOfflineAmountRub)}</strong> (обрыв связи с ККТ/ОФД).</span>
							<div className="text-[11px] text-[var(--muted,#64748b)] font-normal">
								Все оплаты зафиксированы в программе без блокировки кассира. Пробейте очередь в 1 клик после восстановления связи.
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={() => setIsOfflineBatchModalOpen(true)}
						className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-amber-600 to-teal-600 hover:from-amber-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
						data-testid="btn-flush-offline-queue-1click"
					>
						<Zap size={14} className="shrink-0" />
						<span>Пробить всю очередь в 1 клик</span>
					</button>
				</div>
			)}

			{/* Сетка финансовых показателей смены (54-ФЗ) */}
			<div className="cash-shift-grid">
				<div className="cash-shift-card">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
						<span className="flex items-center gap-1.5">
							<Banknote size={16} className="text-emerald-500" />
							Наличные в ящике
						</span>
						<span className="font-mono text-[10px]">Тег 1031</span>
					</div>
					<div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
						{formatMoneyRu(cashInDrawerRub)}
					</div>
				</div>

				<div className="cash-shift-card">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
						<span className="flex items-center gap-1.5">
							<CreditCard size={16} className="text-blue-500" />
							Эквайринг и Терминал
						</span>
						<span className="font-mono text-[10px]">Тег 1081</span>
					</div>
					<div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
						{formatMoneyRu(cardSumRub)}
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
						Комиссия эквайринга: ~{formatMoneyRu(Math.round(cardSumRub * 0.015 * 100) / 100)}
					</div>
				</div>

				<div className="cash-shift-card">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
						<span className="flex items-center gap-1.5">
							<QrCode size={16} className="text-teal-500" />
							СБП / Плати QR
						</span>
						<span className="font-mono text-[10px]">НСПК</span>
					</div>
					<div className="text-xl sm:text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
						{formatMoneyRu(sbpSumRub)}
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
						Низкая комиссия: ~{formatMoneyRu(Math.round(sbpSumRub * 0.007 * 100) / 100)}
					</div>
				</div>

				<div className="cash-shift-card">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
						<span className="flex items-center gap-1.5">
							<ShieldCheck size={16} className="text-purple-500" />
							Общий оборот смены
						</span>
						<span className="font-mono text-[10px]">ОФД 54-ФЗ</span>
					</div>
					<div className="text-xl sm:text-2xl font-black font-mono text-[var(--ink,#0f172a)]">
						{formatMoneyRu(totalTurnoverRub)}
					</div>
					<div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
						Чистое зачисление на р/с: {formatMoneyRu(netBankDepositRub)}
					</div>
				</div>
			</div>

			{/* Быстрые фискальные действия и отчеты ККТ (Мандат 8d п. 3: не более 1-2 кнопок прямого действия) */}
			<div className="cash-shift-actions flex-wrap items-center">
				<button
					type="button"
					onClick={handleOpenCashInModal}
					data-testid="btn-open-cash-in-modal"
					className="min-h-[44px] px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
					title="Внесение наличных (разменная монета, прочий приход)"
				>
					<PlusCircle size={16} className="text-emerald-600" />
					<span>Внесение ДС</span>
				</button>

				<button
					type="button"
					onClick={handleOpenCashOutModal}
					data-testid="btn-open-cash-out-modal"
					className="min-h-[44px] px-4 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
					title="Изъятие наличных (инкассация, хоз. расходы, возврат)"
				>
					<MinusCircle size={16} className="text-rose-600" />
					<span>Изъятие / Инкассация</span>
				</button>

				{/* Вторичные действия и отчеты ККТ (Меню ... по Мандату 8d п. 3) */}
				<div className="relative inline-block">
					<button
						type="button"
						onClick={() => setIsBottomActionsMenuOpen((prev) => !prev)}
						data-testid="btn-shift-bottom-actions-menu"
						className="min-h-[44px] px-3.5 rounded-xl border border-[var(--line,rgba(255,255,255,0.1))] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--glass-hover)] transition-all cursor-pointer text-[var(--ink)]"
						title="Дополнительные отчеты и фискальные действия (X-отчет, Ведомость А4, 1С, Очередь чеков)"
					>
						<MoreHorizontal size={16} />
						<span>Отчеты и действия</span>
					</button>

					<div
						className={`absolute left-0 sm:left-auto sm:right-0 bottom-full mb-2 z-30 min-w-[230px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-1.5 flex flex-col gap-1 ${
							isBottomActionsMenuOpen ? "block" : "hidden"
						}`}
					>
						<button
							type="button"
							onClick={() => {
								setIsBottomActionsMenuOpen(false);
								handleXReport();
							}}
							disabled={isProcessing}
							className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 cursor-pointer text-neutral-800 dark:text-neutral-200 transition-colors"
							title="Распечатать промежуточный X-отчет без гашения"
							data-testid="btn-print-x-report"
						>
							<Printer size={15} className="shrink-0 text-neutral-500" />
							<span>Печать X-отчета (без гашения)</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsBottomActionsMenuOpen(false);
								handlePrintAccountingStatement();
							}}
							className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 cursor-pointer text-neutral-800 dark:text-neutral-200 transition-colors"
							title="Печать сводной бухгалтерской ведомости А4"
							data-testid="btn-print-accounting-statement"
						>
							<FileText size={15} className="shrink-0 text-teal-600" />
							<span>Ведомость А4</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsBottomActionsMenuOpen(false);
								handleExport1cCsv();
							}}
							className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 cursor-pointer text-neutral-800 dark:text-neutral-200 transition-colors"
							title="Выгрузить данные смены в CSV (UTF-8 BOM) для 1С:Бухгалтерии"
							data-testid="btn-export-1c-csv"
						>
							<FileSpreadsheet size={15} className="shrink-0 text-blue-600" />
							<span>Экспорт в 1С</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsBottomActionsMenuOpen(false);
								setIsOfflineBatchModalOpen(true);
							}}
							className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 cursor-pointer text-neutral-800 dark:text-neutral-200 transition-colors"
							title="Очередь фискализации и сверка с эквайрингом"
							data-testid="btn-open-offline-fiscal-queue"
						>
							<Layers size={15} className="shrink-0 text-amber-600" />
							<span>Очередь чеков и сверка {pendingOfflineCount > 0 ? `(${pendingOfflineCount})` : ""}</span>
						</button>
					</div>
				</div>

				{pendingOfflineCount > 0 && (
					<button
						type="button"
						onClick={() => setIsOfflineBatchModalOpen(true)}
						className="min-h-[44px] px-3 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer animate-pulse hover:bg-amber-500/25 transition-all"
						title="Внимание: в офлайн-очереди есть неотправленные чеки"
					>
						<Layers size={14} />
						<span>Очередь: {pendingOfflineCount}</span>
					</button>
				)}
			</div>

			{/* Модальное окно закрытия смены Z-отчетом */}
			<ShiftCloseZReportModal
				isOpen={isZReportModalOpen}
				onClose={() => setIsZReportModalOpen(false)}
				shiftNumber={shiftNumber}
				cashierFullName={cashierName}
				cashierInn={cashierInn}
				clinicLegalName={clinicName}
				clinicInn={clinicInn}
				clinicAddress={clinicRequisites.address}
				kktRegNumber={clinicRequisites.kktRegNumber}
				kktSerialNumber={clinicRequisites.kktSerialNumber}
				fnSerial={clinicRequisites.fnSerialNumber}
				ofdName={clinicRequisites.ofdName}
				onConfirmCloseShift={async () => {
					if (onCloseShift) await onCloseShift();
					setIsShiftOpen(false);
					setIsZReportModalOpen(false);
					showToast(`Смена №${shiftNumber} закрыта на ККТ и Z-отчет отправлен в ОФД`, "success");
				}}
			/>

			{/* Модальное окно пакетной фискализации офлайн-очереди */}
			<OfflineFiscalBatchModal
				isOpen={isOfflineBatchModalOpen}
				onClose={() => setIsOfflineBatchModalOpen(false)}
				clinicName={clinicName}
				cashierFullName={cashierName}
				shiftNumber={shiftNumber}
				clinicRequisites={clinicRequisites}
				onBatchProcessed={() => {
					FiscalReceiptQueueManager.flushAllPending();
					showToast("Офлайн-очередь успешно обработана и фискализирована!", "success");
				}}
			/>

			{/* Модальное окно кассовых операций (Внесение/Изъятие StomX) */}
			{renderCashFlowModal()}
		</div>
	);
};

