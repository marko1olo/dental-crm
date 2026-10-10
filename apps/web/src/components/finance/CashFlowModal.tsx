/**
 * CashFlowModal.tsx — Модальное окно кассовых операций (Внесение / Изъятие ДС по 54-ФЗ / StomX).
 */

import React, { useState } from "react";
import {
	Check,
	MinusCircle,
	PlusCircle,
	X,
} from "lucide-react";
import {
	STOMX_CASH_EXPENSE_CATALOG,
	STOMX_CASH_RECEIPT_CATALOG,
	getFfd1054Label,
} from "@dental/shared";
import { showToast } from "../GlobalToast";

export interface CashFlowModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialMode?: "cash_in" | "cash_out" | undefined;
	readonly cashInDrawerRub?: number | undefined;
	readonly onCashIn?: ((amountRub: number, basis: string, typeAlias?: string) => void | Promise<void>) | undefined;
	readonly onCashOut?: ((amountRub: number, basis: string, recipientFio?: string, typeAlias?: string) => void | Promise<void>) | undefined;
}

function formatMoneyRu(value: number): string {
	return (
		value.toLocaleString("ru-RU", {
			minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
			maximumFractionDigits: 2,
		}) + " ₽"
	);
}

export const CashFlowModal: React.FC<CashFlowModalProps> = ({
	isOpen,
	onClose,
	initialMode = "cash_in",
	cashInDrawerRub = 0,
	onCashIn,
	onCashOut,
}) => {
	const [cashFlowMode, setCashFlowMode] = useState<"cash_in" | "cash_out">(initialMode);
	const [selectedTypeAlias, setSelectedTypeAlias] = useState<string>(
		initialMode === "cash_in" ? "cash_deposit" : "collection",
	);
	const [cashFlowAmount, setCashFlowAmount] = useState<string>("");
	const [cashFlowBasis, setCashFlowBasis] = useState<string>(
		initialMode === "cash_in" ? "Внесение разменной монеты" : "Инкассация выручки в банк",
	);
	const [cashFlowPerson, setCashFlowPerson] = useState<string>("");
	const [isProcessing, setIsProcessing] = useState<boolean>(false);

	if (!isOpen) return null;

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
			onClose();
		} catch {
			showToast("Ошибка при фиксации кассовой операции", "error");
		} finally {
			setIsProcessing(false);
		}
	};

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
						onClick={onClose}
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
							<span className="text-[11px] text-[var(--muted,#64748b)]">Быстрый выбор</span>
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
															{`54-ФЗ: ${receipt.ffdTag1054}`}
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
															{`54-ФЗ: ${expense.ffdTag1054}`}
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
						onClick={onClose}
						data-testid="btn-cancel-cash-operation"
						className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line,rgba(0,0,0,0.15))] text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--glass-hover)] transition-all cursor-pointer"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleSubmitCashOperation}
						disabled={isProcessing}
						data-testid="btn-confirm-cash-operation"
						className={`min-h-[44px] px-6 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${
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
