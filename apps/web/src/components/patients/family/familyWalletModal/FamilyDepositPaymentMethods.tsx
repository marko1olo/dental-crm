/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyDepositPaymentMethods.tsx
 * Payment method selection buttons (Card, Cash, SBP QR).
 * Mandate 8b: strictly <= 120 lines.
 */

import { Coins, CreditCard, QrCode } from "lucide-react";
import React from "react";
import type { TopupPaymentMethod } from "./types";

export interface FamilyDepositPaymentMethodsProps {
	readonly topupMethod: TopupPaymentMethod;
	readonly setTopupMethod: (val: TopupPaymentMethod) => void;
}

export const FamilyDepositPaymentMethods: React.FC<FamilyDepositPaymentMethodsProps> =
	React.memo(function FamilyDepositPaymentMethods({
		topupMethod,
		setTopupMethod,
	}) {
		return (
			<div>
				<span className="text-xs font-semibold text-[var(--ink)] block mb-1.5">
					Способ внесения:
				</span>
				<div className="grid grid-cols-3 gap-2">
					<button
						type="button"
						onClick={() => setTopupMethod("card")}
						className={`min-h-[44px] sm:min-h-[36px] h-9 p-2 text-xs font-semibold rounded-xl border inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
							topupMethod === "card"
								? "border-[var(--teal)] bg-[var(--teal)] text-white shadow-xs"
								: "border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
						}`}
					>
						<CreditCard className="w-4 h-4 shrink-0" />
						<span>Карта</span>
					</button>

					<button
						type="button"
						onClick={() => setTopupMethod("cash")}
						className={`min-h-[44px] sm:min-h-[36px] h-9 p-2 text-xs font-semibold rounded-xl border inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
							topupMethod === "cash"
								? "border-[var(--teal)] bg-[var(--teal)] text-white shadow-xs"
								: "border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
						}`}
					>
						<Coins className="w-4 h-4 shrink-0" />
						<span>Наличные</span>
					</button>

					<button
						type="button"
						onClick={() => setTopupMethod("sbp")}
						className={`min-h-[44px] sm:min-h-[36px] h-9 p-2 text-xs font-semibold rounded-xl border inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
							topupMethod === "sbp"
								? "border-[var(--teal)] bg-[var(--teal)] text-white shadow-xs"
								: "border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
						}`}
					>
						<QrCode className="w-4 h-4 shrink-0" />
						<span>СБП QR</span>
					</button>
				</div>
			</div>
		);
	});
