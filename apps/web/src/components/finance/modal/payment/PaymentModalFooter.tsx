/**
 * apps/web/src/components/finance/modal/payment/PaymentModalFooter.tsx
 *
 * Dedicated fixed footer with total due, discount indicator, and primary submit buttons per method.
 */

import React from "react";
import { CheckCircle, Wallet } from "lucide-react";
import type { PaymentMethodTab } from "./paymentModalTypes.js";

export interface PaymentModalFooterProps {
	readonly totalDueRub: number;
	readonly discountRub: number;
	readonly onClose: () => void;
	readonly activeMethod: PaymentMethodTab;
	readonly handleCashSubmit: () => void;
	readonly isSubmittingCash: boolean;
	readonly receivedCashRub: number;
	readonly handleSplitSubmit: () => void;
	readonly isSubmittingSplit: boolean;
	readonly isBalanced: boolean;
	readonly handleDepositOrPartialCombo: (mode: "deposit" | "family") => void;
	readonly isSubmittingDeposit: boolean;
	readonly patientDepositRub: number;
	readonly patientFamilyBalanceRub: number;
	readonly handleManualCardTerminalConfirm: () => void;
	readonly isSubmittingManualCard: boolean;
	readonly handleConfirmSbpManual: () => void;
	readonly isCheckingSbp: boolean;
}

const formatMoney = (rub: number) =>
	(Number.isFinite(rub) ? (Object.is(rub, -0) ? 0 : rub) : 0).toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

export const PaymentModalFooter: React.FC<PaymentModalFooterProps> = ({
	totalDueRub,
	discountRub,
	onClose,
	activeMethod,
	handleCashSubmit,
	isSubmittingCash,
	receivedCashRub,
	handleSplitSubmit,
	isSubmittingSplit,
	isBalanced,
	handleDepositOrPartialCombo,
	isSubmittingDeposit,
	patientDepositRub,
	patientFamilyBalanceRub,
	handleManualCardTerminalConfirm,
	isSubmittingManualCard,
	handleConfirmSbpManual,
	isCheckingSbp,
}) => {
	return (
		<div
			className="p-3 sm:px-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex items-center justify-between gap-3 shrink-0 select-none shadow-md"
			data-testid="payment-modal-fixed-footer"
		>
			<div className="flex items-center gap-2 min-w-0">
				<span className="text-xs text-[var(--muted,#64748b)] hidden sm:inline">К оплате:</span>
				<span className="font-mono text-base sm:text-lg font-black text-[var(--ink,#0f172a)] truncate" data-testid="payment-modal-footer-total">
					{formatMoney(totalDueRub)} ₽
				</span>
				{discountRub > 0 && (
					<span className="text-xs text-amber-600 dark:text-amber-400 font-bold truncate">
						(-{formatMoney(discountRub)} ₽)
					</span>
				)}
			</div>
			<div className="flex items-center gap-2 min-w-0">
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors shrink-0"
				>
					Отмена
				</button>
				{activeMethod === "cash" ? (
					<button
						type="button"
						onClick={handleCashSubmit}
						disabled={isSubmittingCash}
						title={isSubmittingCash ? "Идет фиксация наличных в кассе..." : undefined}
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm transition-all min-w-0 truncate"
						data-testid="btn-cash-submit-footer"
					>
						<CheckCircle size={16} className="shrink-0" />
						<span className="truncate">
							{isSubmittingCash ? (
								"Фиксация..."
							) : (
								<>
									<span className="sm:hidden">
										Принять {receivedCashRub > 0 && receivedCashRub < totalDueRub ? formatMoney(receivedCashRub) : formatMoney(totalDueRub)} ₽
									</span>
									<span className="hidden sm:inline">
										Принять наличные ({receivedCashRub > 0 && receivedCashRub < totalDueRub ? formatMoney(receivedCashRub) : formatMoney(totalDueRub)} ₽)
									</span>
								</>
							)}
						</span>
					</button>
				) : activeMethod === "split" ? (
					<button
						type="button"
						onClick={handleSplitSubmit}
						disabled={isSubmittingSplit}
						title={
							isSubmittingSplit
								? "Идет фиксация комбинированной оплаты..."
								: !isBalanced
									? "Автоматически сбалансирует остаток и проведет оплату"
									: undefined
						}
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 sm:px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm transition-all min-w-0 truncate shrink-0"
						data-testid="btn-split-submit-footer"
					>
						<CheckCircle size={16} className="shrink-0" />
						<span className="truncate">
							{isSubmittingSplit ? (
								"Фиксация..."
							) : (
								<>
									<span className="sm:hidden">Сплит {formatMoney(totalDueRub)} ₽</span>
									<span className="hidden sm:inline">Пробить сплит ({formatMoney(totalDueRub)} ₽)</span>
								</>
							)}
						</span>
					</button>
				) : activeMethod === "family_deposit" ? (
					<button
						type="button"
						disabled={isSubmittingDeposit}
						onClick={() => handleDepositOrPartialCombo(patientDepositRub >= totalDueRub ? "deposit" : "family")}
						title={
							isSubmittingDeposit
								? "Идет списание со счета..."
								: patientDepositRub === 0 && patientFamilyBalanceRub === 0
									? "На лицевом и семейном счетах пациента нет средств (0 ₽)"
									: undefined
						}
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 sm:px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50 min-w-0 truncate"
						data-testid="btn-deposit-submit-footer"
					>
						<Wallet size={16} className="shrink-0" />
						<span className="truncate">
							{isSubmittingDeposit ? (
								"Списание..."
							) : patientDepositRub >= totalDueRub ? (
								<>
									<span className="sm:hidden">Депозит {formatMoney(totalDueRub)} ₽</span>
									<span className="hidden sm:inline">Списать с депозита ({formatMoney(totalDueRub)} ₽)</span>
								</>
							) : (
								<>
									<span className="sm:hidden">Баланс {formatMoney(Math.min(totalDueRub, patientDepositRub + patientFamilyBalanceRub))} ₽</span>
									<span className="hidden sm:inline">Зачесть баланс ({formatMoney(Math.min(totalDueRub, patientDepositRub + patientFamilyBalanceRub))} ₽)</span>
								</>
							)}
						</span>
					</button>
				) : activeMethod === "card_terminal" || activeMethod === "sberpay_qr" || activeMethod === "biometry" ? (
					<button
						type="button"
						onClick={() => handleManualCardTerminalConfirm()}
						disabled={isSubmittingManualCard}
						title={isSubmittingManualCard ? "Идет фиксация в CRM..." : "Зафиксировать оплату в CRM, если терминал уже списал средства"}
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm transition-all min-w-0 truncate"
						data-testid="btn-manual-terminal-confirm-footer"
					>
						<CheckCircle size={16} className="shrink-0" />
						<span className="truncate">
							{isSubmittingManualCard ? (
								"Фиксация..."
							) : (
								<>
									<span className="sm:hidden">Карта {formatMoney(totalDueRub)} ₽</span>
									<span className="hidden sm:inline">Подтвердить оплату картой ({formatMoney(totalDueRub)} ₽)</span>
								</>
							)}
						</span>
					</button>
				) : activeMethod === "sbp_qr" ? (
					<button
						type="button"
						onClick={handleConfirmSbpManual}
						disabled={isCheckingSbp}
						title="Подтвердить получение оплаты СБП по выписке банка"
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 sm:px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm transition-all min-w-0 truncate"
						data-testid="btn-sbp-submit-footer"
					>
						<CheckCircle size={16} className="shrink-0" />
						<span className="truncate">
							{isCheckingSbp ? (
								"Проверка..."
							) : (
								<>
									<span className="sm:hidden">СБП {formatMoney(totalDueRub)} ₽</span>
									<span className="hidden sm:inline">Подтвердить СБП ({formatMoney(totalDueRub)} ₽)</span>
								</>
							)}
						</span>
					</button>
				) : null}
			</div>
		</div>
	);
};
