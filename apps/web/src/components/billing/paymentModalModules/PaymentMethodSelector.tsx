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
			<div
				className="payment-method-grid"
				style={
					patientDepositRub > 0 || patientFamilyBalanceRub > 0
						? { gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }
						: undefined
				}
			>
				<button
					type="button"
					onClick={() => setActiveMethod("card_terminal")}
					className={`payment-method-pill ${isCardActive ? "is-active" : ""}`}
					data-testid="tab-method-card"
				>
					<span
						data-testid="btn-tender-card"
						className="flex items-center gap-1.5"
					>
						<CreditCard size={16} />
						<span>Карта / Терминал</span>
					</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveMethod("sbp_qr")}
					className={`payment-method-pill ${activeMethod === "sbp_qr" ? "is-active" : ""}`}
					data-testid="tab-method-sbp"
				>
					<span
						data-testid="btn-tender-sbp"
						className="flex items-center gap-1.5"
					>
						<QrCode size={16} />
						<span>СБП QR</span>
					</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveMethod("cash")}
					className={`payment-method-pill ${activeMethod === "cash" ? "is-active" : ""}`}
					data-testid="tab-method-cash"
				>
					<span
						data-testid="btn-tender-cash"
						className="flex items-center gap-1.5"
					>
						<Banknote size={16} />
						<span>Наличные</span>
					</span>
				</button>

				<button
					type="button"
					onClick={() => {
						if (onOpenSplitPayment) onOpenSplitPayment();
						setActiveMethod("split");
					}}
					className={`payment-method-pill ${activeMethod === "split" ? "is-active" : ""}`}
					data-testid="tab-method-split"
					data-tour="split-payment"
					title="Разделение чека: карта, наличные, СБП, ДМС, сертификат, семейный баланс"
				>
					<span
						data-testid="btn-tender-split"
						className="flex items-center gap-1.5"
					>
						<Coins size={16} />
						<span>Разделить чек (Сплит / ДМС)</span>
					</span>
				</button>

				{(patientDepositRub > 0 || patientFamilyBalanceRub > 0) && (
					<button
						type="button"
						onClick={() => setActiveMethod("family_deposit")}
						className={`payment-method-pill ${activeMethod === "family_deposit" ? "is-active" : ""}`}
						data-testid="tab-method-deposit"
					>
						<span
							data-testid="btn-tender-deposit"
							className="flex items-center gap-1.5"
						>
							<Wallet size={16} />
							<span>Депозит / Семья</span>
						</span>
					</button>
				)}
			</div>
		</div>
	);
};
