/**
 * CashShiftReconciliationComponents.tsx — Shared 54-FZ Cash Shift & Drawer Reconciliation Components.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, non-blocking 1-click actions).
 * - Mandate 8b: Strict integer kopeck-exact arithmetic.
 * - Mandate 8d pt 6: Anti-Matryoshka (Modal depth <= 1).
 * - Mandate 8d pt 7: Zero cartoon emojis (strictly vector Lucide icons).
 * - Mandate 8n: Solo Doctor & Small Clinic Ergonomics.
 */

import React, { useMemo, useState, useCallback } from "react";
import {
	AlertTriangle,
	Banknote,
	Check,
	CheckCheck,
	CheckCircle2,
	Copy,
	CreditCard,
	Printer,
	ShieldCheck,
	Wallet,
} from "lucide-react";
import type { FiscalTapeWidth } from "./fiscal54fzEngine";

// ============================================================================
// 1. RECONCILIATION KPI CARDS
// ============================================================================

export interface CashShiftKpiCardsProps {
	readonly netRevenueRub: number;
	readonly cashInDrawerRub: number;
	readonly cardSumRub: number;
	readonly sbpSumRub: number;
	readonly advanceOffsetRub: number;
	readonly incomeTotalRub?: number | undefined;
	readonly incomeReturnTotalRub?: number | undefined;
}

export const CashShiftKpiCards: React.FC<CashShiftKpiCardsProps> = ({
	netRevenueRub,
	cashInDrawerRub,
	cardSumRub,
	sbpSumRub,
	advanceOffsetRub,
	incomeTotalRub,
	incomeReturnTotalRub,
}) => {
	const electronicSumRub = cardSumRub + sbpSumRub;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
			{/* Card 1: Net Revenue */}
			<div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex flex-col justify-between space-y-1">
				<div className="flex items-center justify-between text-xs text-teal-800 dark:text-teal-300 font-bold uppercase tracking-wider">
					<span className="flex items-center gap-1.5">
						<ShieldCheck className="w-4 h-4 text-teal-600" />
						Чистая выручка
					</span>
					<span className="font-mono text-[10px]">54-ФЗ</span>
				</div>
				<div
					className="text-2xl font-black font-mono text-teal-700 dark:text-teal-300"
					data-testid="kpi-net-revenue"
				>
					{netRevenueRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</div>
				<div className="text-[11px] text-[var(--muted)]">
					{incomeTotalRub !== undefined && incomeReturnTotalRub !== undefined
						? `Приход (${incomeTotalRub.toLocaleString("ru-RU")} ₽) − Возврат (${incomeReturnTotalRub.toLocaleString("ru-RU")} ₽)`
						: "Все типы оплат за смену"}
				</div>
			</div>

			{/* Card 2: Cash in Drawer */}
			<div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between space-y-1">
				<div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider">
					<span className="flex items-center gap-1.5">
						<Banknote className="w-4 h-4 text-emerald-600" />
						Наличные (Ящик)
					</span>
					<span className="font-mono text-[10px]">Тег 1031</span>
				</div>
				<div
					className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300"
					data-testid="kpi-cash-in-drawer"
				>
					{cashInDrawerRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</div>
				<div className="text-[11px] text-[var(--muted)]">
					В кассовом ящике
				</div>
			</div>

			{/* Card 3: POS & SBP */}
			<div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex flex-col justify-between space-y-1">
				<div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 font-bold uppercase tracking-wider">
					<span className="flex items-center gap-1.5">
						<CreditCard className="w-4 h-4 text-blue-600" />
						Безналичные & СБП
					</span>
					<span className="font-mono text-[10px]">Тег 1081</span>
				</div>
				<div
					className="text-2xl font-black font-mono text-blue-700 dark:text-blue-300"
					data-testid="kpi-electronic"
				>
					{electronicSumRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</div>
				<div className="text-[11px] text-[var(--muted)]">
					Терминал: {cardSumRub.toLocaleString("ru-RU")} ₽ · СБП: {sbpSumRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>

			{/* Card 4: Advance Offset */}
			<div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between space-y-1">
				<div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider">
					<span className="flex items-center gap-1.5">
						<Wallet className="w-4 h-4 text-amber-600" />
						Зачет авансов
					</span>
					<span className="font-mono text-[10px]">Тег 1215</span>
				</div>
				<div
					className="text-2xl font-black font-mono text-amber-700 dark:text-amber-300"
					data-testid="kpi-advance-offset"
				>
					{advanceOffsetRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</div>
				<div className="text-[11px] text-[var(--muted)]">
					Депозиты пациентов
				</div>
			</div>
		</div>
	);
};

// ============================================================================
// 2. CASH DRAWER MATCHER HOOK & PANEL
// ============================================================================

export interface UseCashDrawerMatcherResult {
	countedCashInput: string;
	setCountedCashInput: React.Dispatch<React.SetStateAction<string>>;
	countedCash: number | null;
	differenceRub: number | null;
	handleMatchWithExpected: () => void;
}

export function useCashDrawerMatcher(expectedCashRub: number): UseCashDrawerMatcherResult {
	const [countedCashInput, setCountedCashInput] = useState<string>("");

	const countedCash = useMemo(() => {
		if (countedCashInput.trim() === "") return null;
		const parsed = Number.parseFloat(countedCashInput.replace(/\s/g, "").replace(",", "."));
		return Number.isNaN(parsed) ? null : parsed;
	}, [countedCashInput]);

	const differenceRub = useMemo(() => {
		if (countedCash === null) return null;
		return Math.round((countedCash - expectedCashRub) * 100) / 100;
	}, [countedCash, expectedCashRub]);

	const handleMatchWithExpected = useCallback(() => {
		setCountedCashInput(expectedCashRub.toString());
	}, [expectedCashRub]);

	return {
		countedCashInput,
		setCountedCashInput,
		countedCash,
		differenceRub,
		handleMatchWithExpected,
	};
}

export interface CashDrawerReconciliationPanelProps {
	readonly shiftNumber: number;
	readonly expectedCashRub: number;
	readonly countedCashInput: string;
	readonly onCountedCashChange: (value: string) => void;
	readonly differenceRub: number | null;
	readonly onMatchClick: () => void;
	readonly variant?: "standard" | "zreport" | undefined;
	readonly inputTestId?: string | undefined;
}

export const CashDrawerReconciliationPanel: React.FC<CashDrawerReconciliationPanelProps> = ({
	shiftNumber,
	expectedCashRub,
	countedCashInput,
	onCountedCashChange,
	differenceRub,
	onMatchClick,
	variant = "standard",
	inputTestId,
}) => {
	const resolvedInputTestId =
		inputTestId ||
		(variant === "zreport" ? "input-drawer-actual-cash" : "input-actual-drawer-cash");

	const matchTestId =
		variant === "zreport" ? "msg-reconciliation-match" : "msg-drawer-match";
	const surplusTestId =
		variant === "zreport" ? "msg-reconciliation-surplus" : "msg-drawer-surplus";
	const deficitTestId =
		variant === "zreport" ? "msg-reconciliation-deficit" : "msg-drawer-deficit";

	return (
		<div className="space-y-5">
			{/* Cash in Drawer Overview Banner */}
			<div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-3">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
						<Banknote className="w-5 h-5" />
					</div>
					<div>
						<h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 m-0">
							Расчетный остаток наличных в кассовом ящике
						</h4>
						<p className="text-xs text-[var(--muted)] m-0">
							По данным фискальных операций 54-ФЗ за смену №{shiftNumber}
						</p>
					</div>
				</div>
				<div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
					{expectedCashRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</div>
			</div>

			{/* 1-Click Cash Drawer Matcher (Mandate 8k: no denomination calculator simulator) */}
			<div className="p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4">
				<div>
					<label
						htmlFor="cash-drawer-actual-input"
						className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1"
					>
						Фактическая сумма наличных в ящике (₽):
					</label>
					<div className="flex items-center gap-2 flex-wrap">
						<input
							id="cash-drawer-actual-input"
							type="text"
							inputMode="decimal"
							value={countedCashInput}
							onChange={(e) => onCountedCashChange(e.target.value)}
							placeholder={expectedCashRub.toString()}
							className="min-h-[44px] px-3.5 py-2 font-mono text-sm font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none w-56"
							data-testid={resolvedInputTestId}
						/>
						<button
							type="button"
							onClick={onMatchClick}
							className="min-h-[44px] px-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
							title="Подставить расчетную сумму кассы 54-ФЗ"
							data-testid="btn-match-drawer-cash"
						>
							<Check size={14} className="text-emerald-600" />
							<span>Совпадает с кассой ({expectedCashRub.toLocaleString("ru-RU")} ₽)</span>
						</button>
					</div>
				</div>

				{/* Reconciliation Status */}
				<div className="pt-1">
					{differenceRub === null ? (
						<div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
							<span>Введите сумму в денежном ящике или нажмите «Совпадает с кассой»</span>
						</div>
					) : differenceRub === 0 ? (
						<div
							className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2"
							data-testid={matchTestId}
						>
							<CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
							<span>
								Сверка успешна: фактическая сумма в ящике сходится копейка в копейку с данными 54-ФЗ ({expectedCashRub.toLocaleString("ru-RU")} ₽)
							</span>
						</div>
					) : differenceRub > 0 ? (
						<div
							className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center gap-2"
							data-testid={surplusTestId}
						>
							<AlertTriangle className="w-4 h-4 text-teal-600 shrink-0" />
							<span>
								Обнаружен излишек в ящике: +{differenceRub.toLocaleString("ru-RU")} ₽
								{variant === "zreport" ? " (проверьте неотмеченные операции)" : ""}
							</span>
						</div>
					) : (
						<div
							className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2"
							data-testid={deficitTestId}
						>
							<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
							<span>
								Обнаружена недостача в ящике: −{Math.abs(differenceRub).toLocaleString("ru-RU")} ₽
								{variant === "zreport" ? " (проверьте сдачи и возвраты)" : ""}
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

// ============================================================================
// 3. FISCAL RECEIPT TAPE VIEWER
// ============================================================================

export interface FiscalReceiptTapeViewerProps {
	readonly receiptTapeText: string;
	readonly tapeWidth: FiscalTapeWidth;
	readonly onTapeWidthChange: (width: FiscalTapeWidth) => void;
	readonly onCopy: () => void;
	readonly onPrint: () => void;
	readonly isCopied: boolean;
	readonly printButtonLabel?: string | undefined;
}

export const FiscalReceiptTapeViewer: React.FC<FiscalReceiptTapeViewerProps> = ({
	receiptTapeText,
	tapeWidth,
	onTapeWidthChange,
	onCopy,
	onPrint,
	isCopied,
	printButtonLabel,
}) => {
	return (
		<div className="space-y-4">
			{/* Tape Width Controls & Actions */}
			<div className="flex items-center justify-between flex-wrap gap-2.5 p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-[var(--muted)]">Ширина ленты:</span>
					<div className="flex bg-[var(--paper)] border border-[var(--line)] p-0.5 rounded-lg">
						<button
							type="button"
							onClick={() => onTapeWidthChange("58mm")}
							className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
								tapeWidth === "58mm"
									? "bg-[var(--teal)] text-white shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							58 мм (Узкая)
						</button>
						<button
							type="button"
							onClick={() => onTapeWidthChange("80mm")}
							className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
								tapeWidth === "80mm"
									? "bg-[var(--teal)] text-white shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							80 мм (Широкая)
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onCopy}
						className="min-h-[44px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--paper-soft)] transition-all cursor-pointer"
					>
						{isCopied ? <CheckCheck size={16} className="text-emerald-600" /> : <Copy size={16} />}
						<span>{isCopied ? "Скопировано!" : "Скопировать текст"}</span>
					</button>
					<button
						type="button"
						onClick={onPrint}
						className="min-h-[44px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
					>
						<Printer size={16} />
						<span>{printButtonLabel || `Печать на ККТ (${tapeWidth})`}</span>
					</button>
				</div>
			</div>

			{/* Monospaced Receipt Tape Container */}
			<div className="flex justify-center p-4 bg-[var(--paper-soft)] rounded-2xl overflow-x-auto">
				<div
					className={`p-4 bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono text-[11px] leading-relaxed shadow-xl border border-[var(--line)] rounded-sm whitespace-pre ${
						tapeWidth === "80mm" ? "w-[380px]" : "w-[290px]"
					}`}
				>
					{receiptTapeText}
				</div>
			</div>
		</div>
	);
};
