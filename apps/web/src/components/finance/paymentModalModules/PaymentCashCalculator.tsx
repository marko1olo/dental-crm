/**
 * apps/web/src/components/finance/paymentModalModules/PaymentCashCalculator.tsx
 *
 * Layer 4: Cash Received Input, Quick Bill Tiles, and Instant Change Calculation HUD.
 * Touch targets >= 44x44px conforming to Apple HIG & Mandates 8b (<=120 lines), 8e, 8k, 8n.
 */

import React from "react";
import { Banknote, Coins, Zap } from "lucide-react";
import type { PaymentCashCalculatorProps } from "./types.js";
import { PaymentCashDenominations } from "./PaymentCashDenominations.js";
import { PaymentCashChangeHud } from "./PaymentCashChangeHud.js";

export const PaymentCashCalculator: React.FC<PaymentCashCalculatorProps> = ({
	totalDueRub,
	receivedCashRub,
	setReceivedCashRub,
	cashChange,
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

				<PaymentCashDenominations
					totalDueRub={totalDueRub}
					receivedCashRub={receivedCashRub}
					setReceivedCashRub={setReceivedCashRub}
				/>

				<PaymentCashChangeHud cashChange={cashChange} />
			</div>
		</div>
	);
};
