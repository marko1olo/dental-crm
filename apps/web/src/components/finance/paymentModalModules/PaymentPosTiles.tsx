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
							Купюры и сдача
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
								: "Аванс или баланс"}
						</div>
					</div>
				</span>
			</button>
		</div>
	);
};
