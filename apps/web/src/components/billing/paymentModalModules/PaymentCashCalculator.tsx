/**
 * apps/web/src/components/billing/paymentModalModules/PaymentCashCalculator.tsx
 *
 * Layer 4: Cash Received Input, Quick Bill Tiles, and Instant Change Calculation HUD.
 * Touch targets >= 44x44px conforming to Apple HIG & Mandates 8e, 8k, 8n.
 */

import React from "react";
import {
	AlertCircle,
	Banknote,
	CheckCircle,
	CheckCircle2,
	Coins,
	Zap,
} from "lucide-react";
import {
	CASH_ADD_BUTTONS,
	CASH_DENOMINATIONS,
} from "../../finance/modal/payment/paymentModalPrintHtml.js";
import type { PaymentCashCalculatorProps } from "./types.js";

export const PaymentCashCalculator: React.FC<PaymentCashCalculatorProps> = ({
	totalDueRub,
	receivedCashRub,
	setReceivedCashRub,
	cashChange,
	handleCashSubmit,
	isSubmittingCash,
}) => {
	return (
		<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-2.5">
			<div className="flex items-center gap-2.5">
				<div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
					<Banknote size={18} />
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

			<div className="space-y-2 p-2.5 bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line,#e2e8f0)]">
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
						className="h-10 sm:h-9.5 w-full px-3 text-lg sm:text-base font-bold font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink,#0f172a)] outline-none focus:border-emerald-500 shadow-2xs"
						data-testid="input-cash-received"
					/>
					<button
						type="button"
						onClick={() => setReceivedCashRub(totalDueRub)}
						className="cash-quick-match-btn min-h-[38px]"
						title="Внести сумму ровно без сдачи"
					>
						<Zap size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Без сдачи</span>
					</button>
				</div>

				{/* Quick denomination bill buttons (Мандаты 8e, 8k, 8n) */}
				<div className="space-y-1 pt-0.5">
					<div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted,#64748b)]">
						<span>Быстрый ввод внесенной суммы:</span>
						<button
							type="button"
							onClick={() => setReceivedCashRub(0)}
							className="text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
							data-testid="btn-cash-reset"
						>
							Сброс (0 ₽)
						</button>
					</div>

					{/* Ряд 1: Купюры номиналов */}
					<div className="cash-bill-grid">
						<button
							type="button"
							onClick={() => setReceivedCashRub(totalDueRub)}
							className={`cash-bill-chip ${receivedCashRub === totalDueRub ? "is-active" : ""}`}
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
								className={`cash-bill-chip ${receivedCashRub === denom.amount ? "is-active" : ""}`}
								data-testid={denom.testId}
								title={`Внесено ${denom.label}`}
							>
								{denom.label}
							</button>
						))}
					</div>

					{/* Ряд 2: Быстрое добавление + Ровно */}
					<div className="cash-add-grid">
						{CASH_ADD_BUTTONS.map((addBtn) => (
							<button
								key={addBtn.amount}
								type="button"
								onClick={() => setReceivedCashRub((prev) => (Number.isFinite(prev) ? prev : 0) + addBtn.amount)}
								className="cash-add-chip"
								data-testid={addBtn.testId}
								title={`Добавить ${addBtn.label.replace("+", "")} к внесенной сумме`}
							>
								{addBtn.label}
							</button>
						))}
						<button
							type="button"
							onClick={() => setReceivedCashRub(totalDueRub)}
							className="cash-exact-chip"
							data-testid="btn-cash-exact-rounded"
							title="Внести ровно без сдачи"
						>
							<Coins size={13} />
							<span>Ровно</span>
						</button>
					</div>
				</div>

				{/* Change Calculation Box */}
				{cashChange.changeRub > 0 ? (
					<div
						className="change-display-hud has-change"
						data-testid="cash-change-display"
					>
						<span className="font-bold flex items-center gap-1.5 truncate">
							<Coins size={15} className="shrink-0" />
							<span>Сдача пациенту:</span>
						</span>
						<span
							className="font-mono text-base font-black shrink-0 ml-2"
							data-testid="cash-change-amount"
						>
							{cashChange.changeRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
						</span>
					</div>
				) : cashChange.isExact ? (
					<div
						className="change-display-hud is-exact"
						data-testid="cash-exact-display"
					>
						<span className="flex items-center gap-1.5">
							<CheckCircle2 size={15} className="shrink-0" />
							<span>Внесено ровно, без сдачи</span>
						</span>
					</div>
				) : cashChange.shortageRub > 0 ? (
					<div
						className="change-display-hud has-shortage"
						data-testid="cash-shortage-display"
					>
						<span className="flex items-center gap-1.5 truncate">
							<AlertCircle size={15} className="shrink-0" />
							<span>Недостает до полной суммы:</span>
						</span>
						<span className="font-mono font-bold shrink-0 ml-2">
							{cashChange.shortageRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
};
