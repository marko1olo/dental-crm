/**
 * apps/web/src/components/finance/modal/payment/PaymentCashView.tsx
 *
 * Cash received input, denomination bill buttons, and change calculation HUD.
 */

import React from "react";
import { AlertCircle, Banknote, CheckCircle, CheckCircle2, Coins, Zap } from "lucide-react";
import { CASH_ADD_BUTTONS, CASH_DENOMINATIONS } from "./paymentModalPrintHtml.js";

export interface PaymentCashViewProps {
	readonly totalDueRub: number;
	readonly receivedCashRub: number;
	readonly setReceivedCashRub: React.Dispatch<React.SetStateAction<number>>;
	readonly cashChange: {
		changeRub: number;
		isExact: boolean;
		shortageRub: number;
	};
	readonly handleCashSubmit: () => void;
	readonly isSubmittingCash: boolean;
}

export const PaymentCashView: React.FC<PaymentCashViewProps> = ({
	totalDueRub,
	receivedCashRub,
	setReceivedCashRub,
	cashChange,
	handleCashSubmit,
	isSubmittingCash,
}) => {
	return (
		<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-4">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
					<Banknote size={20} />
				</div>
				<div>
					<h3 className="text-sm font-bold m-0 text-[var(--ink,#0f172a)]">
						Прием наличных денежных средств
					</h3>
					<p className="text-xs text-[var(--muted,#64748b)] m-0">
						Сумма к внесению в кассу:{" "}
						<strong className="text-[var(--ink,#0f172a)]">
							{totalDueRub.toLocaleString("ru-RU")} ₽
						</strong>
					</p>
				</div>
			</div>

			<div className="space-y-2 p-3 bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line,#e2e8f0)]">
				<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center justify-between">
					<span>Получено от пациента наличными, ₽:</span>
					<button
						type="button"
						onClick={() => setReceivedCashRub(totalDueRub)}
						className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
						data-testid="btn-cash-exact-amount"
					>
						<Coins size={12} />
						<span>Ровно без сдачи ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
					</button>
				</label>
				<div className="flex items-center gap-2">
					<input
						type="number"
						min={0}
						step="1"
						value={receivedCashRub || ""}
						onChange={(e) => setReceivedCashRub(Math.max(0, parseFloat(e.target.value) || 0))}
						placeholder="0 ₽"
						className="h-10 w-full px-3 text-base font-bold font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink,#0f172a)] outline-none focus:border-emerald-500"
						data-testid="input-cash-received"
					/>
					<button
						type="button"
						onClick={() => setReceivedCashRub(totalDueRub)}
						className="h-10 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 hover:bg-emerald-100 cursor-pointer flex items-center gap-1"
					>
						<Zap size={14} />
						<span>Без сдачи</span>
					</button>
				</div>

				{/* Quick denomination bill buttons (Мандаты 8e, 8k, 8n) */}
				<div className="space-y-1 pt-1">
					<div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted,#64748b)]">
						<span>Быстрый ввод внесенной суммы:</span>
						<button
							type="button"
							onClick={() => setReceivedCashRub(0)}
							className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
							data-testid="btn-cash-reset"
						>
							Сброс (0 ₽)
						</button>
					</div>
					<div className="grid grid-cols-5 gap-1.5">
						<button
							type="button"
							onClick={() => setReceivedCashRub(totalDueRub)}
							className="min-h-[44px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 truncate"
							data-testid="btn-cash-exact"
							title="Внесено ровно сумма счета без сдачи"
						>
							Без сдачи
						</button>
						{CASH_DENOMINATIONS.map((denom) => (
							<button
								key={denom.amount}
								type="button"
								onClick={() => setReceivedCashRub(denom.amount)}
								className="min-h-[44px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 font-mono truncate"
								data-testid={denom.testId}
								title={`Внесено ${denom.label}`}
							>
								{denom.label}
							</button>
						))}
					</div>
					<div className="grid grid-cols-4 gap-1.5 pt-1">
						{CASH_ADD_BUTTONS.map((addBtn) => (
							<button
								key={addBtn.amount}
								type="button"
								onClick={() => setReceivedCashRub((prev) => prev + addBtn.amount)}
								className="min-h-[44px] rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 cursor-pointer transition-all active:scale-95 font-mono truncate"
								data-testid={addBtn.testId}
								title={`Добавить ${addBtn.label.replace("+", "")} к внесенной сумме`}
							>
								{addBtn.label}
							</button>
						))}
						<button
							type="button"
							onClick={() => setReceivedCashRub(totalDueRub)}
							className="min-h-[44px] rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 hover:bg-blue-100 text-blue-800 dark:text-blue-200 cursor-pointer transition-all active:scale-95 truncate flex items-center justify-center gap-1"
							data-testid="btn-cash-exact-rounded"
							title="Внести ровно без сдачи"
						>
							<Coins size={12} />
							<span>Ровно</span>
						</button>
					</div>
				</div>

				{/* Change Calculation Box */}
				{cashChange.changeRub > 0 ? (
					<div
						className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs min-w-0"
						data-testid="cash-change-display"
					>
						<span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 truncate">
							<Coins size={14} className="shrink-0" />
							<span>Сдача пациенту:</span>
						</span>
						<span
							className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300 shrink-0 ml-2"
							data-testid="cash-change-amount"
						>
							{cashChange.changeRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
						</span>
					</div>
				) : cashChange.isExact ? (
					<div
						className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 min-w-0"
						data-testid="cash-exact-display"
					>
						<CheckCircle2 size={14} className="shrink-0" />
						<span className="truncate">Внесено ровно, без сдачи</span>
					</div>
				) : cashChange.shortageRub > 0 ? (
					<div
						className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-between min-w-0"
						data-testid="cash-shortage-display"
					>
						<span className="flex items-center gap-1.5 truncate">
							<AlertCircle size={14} className="shrink-0" />
							<span>Недостает до полной суммы:</span>
						</span>
						<span className="font-mono font-bold shrink-0 ml-2">
							{cashChange.shortageRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
						</span>
					</div>
				) : null}
			</div>

			<button
				type="button"
				onClick={handleCashSubmit}
				disabled={isSubmittingCash}
				title={isSubmittingCash ? "Идет фиксация наличных в кассе..." : undefined}
				className="min-h-[44px] w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all min-w-0"
				data-testid="btn-cash-submit"
			>
				<CheckCircle size={16} className="shrink-0" />
				<span className="truncate">
					{isSubmittingCash
						? "Фиксация..."
						: `Подтвердить прием ${
								receivedCashRub > 0 && receivedCashRub < totalDueRub
									? receivedCashRub.toLocaleString("ru-RU")
									: totalDueRub.toLocaleString("ru-RU")
							} ₽ в кассу`}
				</span>
			</button>
		</div>
	);
};
