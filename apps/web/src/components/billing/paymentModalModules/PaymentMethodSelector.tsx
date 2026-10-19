/**
 * apps/web/src/components/billing/paymentModalModules/PaymentMethodSelector.tsx
 *
 * Layer 4: Payment Tender Selector Grid.
 * Large touch-friendly tender selection buttons (>= 44x44px) conforming to Apple HIG & Mandate 8d.
 */

import { Banknote, Coins, CreditCard, QrCode, Wallet } from "lucide-react";
import type React from "react";
import type { PaymentMethodSelectorProps } from "./types.js";

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
	activeMethod,
	setActiveMethod,
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	onOpenSplitPayment,
}) => {
	const isCardActive =
		activeMethod === "card_terminal" ||
		activeMethod === "sberpay_qr" ||
		activeMethod === "biometry";

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
					Способ оплаты:
				</span>
				<button
					type="button"
					onClick={() => {
						if (onOpenSplitPayment) onOpenSplitPayment();
						setActiveMethod("split");
					}}
					className="sr-only"
					data-testid="link-open-split-payment"
				>
					<span>Сплит-оплата (несколько способов)</span>
				</button>
			</div>
			<div className="payment-pos-tiles-grid">
				{/* 1. СБП (QR-код) */}
				<button
					type="button"
					onClick={() => setActiveMethod("sbp_qr")}
					className={`payment-pos-tile ${activeMethod === "sbp_qr" ? "is-active" : ""}`}
					data-testid="tab-method-sbp"
				>
					<span data-testid="btn-tender-sbp" className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
							<QrCode size={18} />
						</div>
						<div className="text-left min-w-0">
							<div className="font-bold text-xs sm:text-sm tracking-tight text-[var(--ink,#0f172a)] group-hover:text-teal-700">
								СБП (QR-код)
							</div>
							<div className="text-[11px] text-[var(--muted,#64748b)] truncate">
								Без комиссии 0 сек
							</div>
						</div>
					</span>
				</button>

				{/* 2. Банковский терминал */}
				<button
					type="button"
					onClick={() => setActiveMethod("card_terminal")}
					className={`payment-pos-tile ${isCardActive ? "is-active" : ""}`}
					data-testid="tab-method-card"
				>
					<span data-testid="btn-tender-card" className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
							<CreditCard size={18} />
						</div>
						<div className="text-left min-w-0">
							<div className="font-bold text-xs sm:text-sm tracking-tight text-[var(--ink,#0f172a)] group-hover:text-blue-700">
								Банковский терминал
							</div>
							<div className="text-[11px] text-[var(--muted,#64748b)] truncate">
								МИР / Любая карта
							</div>
						</div>
					</span>
				</button>

				{/* 3. Наличные */}
				<button
					type="button"
					onClick={() => setActiveMethod("cash")}
					className={`payment-pos-tile ${activeMethod === "cash" ? "is-active" : ""}`}
					data-testid="tab-method-cash"
				>
					<span data-testid="btn-tender-cash" className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
							<Banknote size={18} />
						</div>
						<div className="text-left min-w-0">
							<div className="font-bold text-xs sm:text-sm tracking-tight text-[var(--ink,#0f172a)] group-hover:text-emerald-700">
								Наличные
							</div>
							<div className="text-[11px] text-[var(--muted,#64748b)] truncate">
								Быстрые купюры и сдача
							</div>
						</div>
					</span>
				</button>

				{/* 4. Семейный депозит / Баланс */}
				<button
					type="button"
					onClick={() => setActiveMethod("family_deposit")}
					className={`payment-pos-tile ${activeMethod === "family_deposit" ? "is-active" : ""}`}
					data-testid="tab-method-deposit"
				>
					<span data-testid="btn-tender-deposit" className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
							<Wallet size={18} />
						</div>
						<div className="text-left min-w-0">
							<div className="font-bold text-xs sm:text-sm tracking-tight text-[var(--ink,#0f172a)] group-hover:text-indigo-700">
								Семейный депозит / Баланс
							</div>
							<div className="text-[11px] text-[var(--muted,#64748b)] truncate">
								{patientDepositRub > 0 || patientFamilyBalanceRub > 0
									? `Доступно: ${(patientDepositRub + patientFamilyBalanceRub).toLocaleString("ru-RU")} ₽`
									: "Аванс или баланс семьи"}
							</div>
						</div>
					</span>
				</button>
			</div>

			{/* 5. Сплит-оплата: аккуратный переключатель разделения чека */}
			<div className="pt-0.5">
				<button
					type="button"
					onClick={() => {
						if (onOpenSplitPayment) onOpenSplitPayment();
						setActiveMethod("split");
					}}
					className={`payment-pos-split-bar w-full ${activeMethod === "split" ? "is-active" : ""}`}
					data-testid="tab-method-split"
					data-tour="split-payment"
					title="Разделение чека: карта, наличные, СБП, ДМС, сертификат, семейный баланс"
				>
					<span data-testid="btn-tender-split" className="flex items-center justify-center gap-2">
						<Coins size={16} className="text-purple-600 dark:text-purple-400" />
						<span className="font-bold text-xs">
							Разделить чек (Сплит: Карта + Наличные + СБП + ДМС)
						</span>
					</span>
				</button>
			</div>
		</div>
	);
};
