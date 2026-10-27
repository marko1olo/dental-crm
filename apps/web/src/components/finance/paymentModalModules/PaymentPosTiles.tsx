import React from "react";
import { Banknote, CreditCard, QrCode, Wallet } from "lucide-react";
import type { PaymentMethodTab } from "./types.js";

export interface PaymentPosTilesProps {
	readonly activeMethod: PaymentMethodTab;
	readonly setActiveMethod: (method: PaymentMethodTab) => void;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
}

export const PaymentPosTiles: React.FC<PaymentPosTilesProps> = ({
	activeMethod,
	setActiveMethod,
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
}) => {
	const isCardActive =
		activeMethod === "card_terminal" ||
		activeMethod === "sberpay_qr" ||
		activeMethod === "biometry";

	return (
		<div className="payment-pos-tiles-grid" data-testid="payment-pos-tiles">
			{/* 1. СБП (QR-код) */}
			<button
				type="button"
				onClick={() => setActiveMethod("sbp_qr")}
				className={`payment-pos-tile ${activeMethod === "sbp_qr" ? "is-active" : ""}`}
				data-testid="tab-method-sbp"
			>
				<span data-testid="btn-tender-sbp" className="flex items-center gap-2 w-full min-w-0">
					<QrCode size={16} className={`shrink-0 ${activeMethod === "sbp_qr" ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted,#64748b)]"}`} />
					<div className="text-left min-w-0 leading-tight">
						<div className="font-semibold text-xs text-[var(--ink,#0f172a)] truncate">
							СБП (QR-код)
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
				<span data-testid="btn-tender-card" className="flex items-center gap-2 w-full min-w-0">
					<CreditCard size={16} className={`shrink-0 ${isCardActive ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted,#64748b)]"}`} />
					<div className="text-left min-w-0 leading-tight">
						<div className="font-semibold text-xs text-[var(--ink,#0f172a)] truncate">
							Банковский терминал
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
				<span data-testid="btn-tender-cash" className="flex items-center gap-2 w-full min-w-0">
					<Banknote size={16} className={`shrink-0 ${activeMethod === "cash" ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted,#64748b)]"}`} />
					<div className="text-left min-w-0 leading-tight">
						<div className="font-semibold text-xs text-[var(--ink,#0f172a)] truncate">
							Наличные
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
				<span data-testid="btn-tender-deposit" className="flex items-center gap-2 w-full min-w-0">
					<Wallet size={16} className={`shrink-0 ${activeMethod === "family_deposit" ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted,#64748b)]"}`} />
					<div className="text-left min-w-0 leading-tight">
						<div className="font-semibold text-xs text-[var(--ink,#0f172a)] truncate">
							{patientDepositRub > 0 || patientFamilyBalanceRub > 0
								? `Аванс (${(patientDepositRub + patientFamilyBalanceRub).toLocaleString("ru-RU")} ₽)`
								: "Семейный депозит / Баланс"}
						</div>
					</div>
				</span>
			</button>
		</div>
	);
};
