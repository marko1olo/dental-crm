import {
	calculateCashChange,
	getCashPresetSuggestions,
	type PaymentMethod,
} from "@dental/shared";
import { Coins, X } from "lucide-react";
import React from "react";
import { money } from "./AppHelpers";
import { rubAmountForInput } from "./components/payments/cashDeskAmounts";
import { normalizeRubAmountInput } from "./rubAmountInput";

export interface PaymentQuickTenderGridProps {
	readonly amount: string;
	readonly onAmountChange: (value: string) => void;
	readonly remainingDebt?: number | undefined;
	readonly method: PaymentMethod;
	readonly paymentAmountInvalid: boolean;
	readonly paymentMissingId: string;
	readonly receivedCash: string;
	readonly onReceivedCashChange: (value: string) => void;
}

export function PaymentQuickTenderGrid({
	amount,
	onAmountChange,
	remainingDebt,
	method,
	paymentAmountInvalid,
	paymentMissingId,
	receivedCash,
	onReceivedCashChange,
}: PaymentQuickTenderGridProps) {
	const parsedRequiredRub = normalizeRubAmountInput(amount) ?? 0;

	return (
		<>
			{/* Секция ввода суммы и быстрых пресетов */}
			<div
				className="payment-amount-section col-span-full p-2 sm:p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]"
				style={{ gridColumn: "1 / -1", margin: "1px 0 2px 0" }}
				data-testid="payment-amount-section"
			>
				<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
					<div className="w-full sm:w-56 shrink-0">
						<label
							htmlFor="payment-amount-input"
							className="block text-[10px] sm:text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5"
						>
							Сумма к оплате (₽)
						</label>
						<div className="relative">
							<input
								id="payment-amount-input"
								inputMode="numeric"
								autoComplete="transaction-amount"
								pattern="[0-9\s]*"
								aria-label="Сумма оплаты"
								aria-invalid={paymentAmountInvalid || undefined}
								aria-describedby={
									paymentAmountInvalid ? paymentMissingId : undefined
								}
								value={amount}
								onChange={(event) => onAmountChange(event.target.value)}
								placeholder="0 ₽"
								className="w-full h-11 sm:h-12 px-3 text-xl sm:text-2xl font-black font-mono rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] dark:bg-[var(--paper-strong)] dark:border-[var(--glass-border)] text-[var(--ink)] focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)]/20 outline-none transition-all"
							/>
							{amount ? (
								<button
									type="button"
									style={{ minHeight: "44px" }}
									onClick={() => onAmountChange("")}
									className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] text-xs text-[var(--muted)] hover:text-[var(--ink)] px-2 cursor-pointer flex items-center justify-center"
									title="Очистить сумму"
								>
									<X size={16} aria-hidden="true" />
								</button>
							) : null}
						</div>
					</div>

					{remainingDebt !== undefined && (
						<div className="flex-1 min-w-0">
							<span className="block text-[10px] sm:text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5">
								Быстрые суммы:
							</span>
							<div
								className="quick-chips-row payment-amount-presets flex flex-wrap items-center gap-1 sm:gap-1.5"
								role="toolbar"
								aria-label="Быстрый выбор суммы к оплате"
							>
								{remainingDebt > 0 && (
									<button
										type="button"
										style={{ minHeight: "44px" }}
										className="quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-2 sm:px-2.5 font-bold text-xs shrink-0 bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
										onClick={() =>
											onAmountChange(rubAmountForInput(remainingDebt))
										}
									>
										Долг: {money(remainingDebt)}
									</button>
								)}
								{[500, 1000, 2000, 3000, 5000].map((val) => (
									<button
										key={val}
										type="button"
										style={{ minHeight: "44px" }}
										className={`quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-2 sm:px-2.5 font-bold text-xs shrink-0 ${amount === String(val) ? "active" : ""}`}
										onClick={() => onAmountChange(String(val))}
									>
										{val.toLocaleString("ru-RU")} ₽
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Калькулятор сдачи и быстрый выбор купюр при оплате наличными */}
			{method === "cash" &&
				parsedRequiredRub > 0 &&
				(() => {
					const requiredRub = parsedRequiredRub;
					const tenderedRub =
						normalizeRubAmountInput(receivedCash) ?? requiredRub;
					const changeCalc = calculateCashChange(requiredRub, tenderedRub);
					const presets = getCashPresetSuggestions(requiredRub);

					return (
						<div
							className="col-span-full p-3 mb-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal)]/30 space-y-2"
							style={{ gridColumn: "1 / -1" }}
							data-testid="cash-change-hud"
						>
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<span className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
									<Coins size={18} className="text-[var(--teal-dark)]" />
									Калькулятор сдачи (Наличные)
								</span>
								{changeCalc.changeRub > 0 ? (
									<span className="font-mono font-black text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-[var(--teal-dark)] text-white shadow-sm">
										Сдача: {changeCalc.changeRub.toLocaleString("ru-RU")} ₽
									</span>
								) : changeCalc.isShortage ? (
									<span className="font-mono font-bold text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-amber-600 text-white shadow-sm">
										Не хватает: {changeCalc.shortageRub.toLocaleString("ru-RU")}{" "}
										₽
									</span>
								) : (
									<span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
										Без сдачи
									</span>
								)}
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
								<div className="smart-field no-float">
									<input
										id="payment-tendered-cash-input"
										inputMode="numeric"
										pattern="[0-9\s]*"
										placeholder={`${requiredRub} ₽`}
										value={receivedCash}
										onChange={(e) => onReceivedCashChange(e.target.value)}
										className="text-right font-mono font-bold text-base min-h-[44px]"
									/>
									<label htmlFor="payment-tendered-cash-input">
										Получено купюрами (₽)
									</label>
								</div>

								<div className="space-y-1.5">
									<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
										Быстрый выбор купюры:
									</span>
									<div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
										<button
											type="button"
											style={{ minHeight: "44px" }}
											className="col-span-2 sm:col-span-1 min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-[var(--teal-dark)] text-white hover:brightness-110 active:brightness-95 shadow-sm cursor-pointer flex items-center justify-center text-center"
											onClick={() => onReceivedCashChange(String(requiredRub))}
										>
											Без сдачи ({requiredRub.toLocaleString("ru-RU")} ₽)
										</button>
										{Array.from(new Set([500, 1000, 2000, 5000, ...presets]))
											.filter((p) => p >= requiredRub)
											.slice(0, 5)
											.map((preset) => (
												<button
													key={preset}
													type="button"
													style={{ minHeight: "44px" }}
													className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)] shadow-sm cursor-pointer flex items-center justify-center text-center"
													onClick={() => onReceivedCashChange(String(preset))}
												>
													{preset.toLocaleString("ru-RU")} ₽
												</button>
											))}
									</div>
								</div>
							</div>
						</div>
					);
				})()}
		</>
	);
}
