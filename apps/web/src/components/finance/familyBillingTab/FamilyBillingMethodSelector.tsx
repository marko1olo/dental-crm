import React from "react";
import { Banknote, CreditCard, QrCode } from "lucide-react";

export interface FamilyBillingMethodSelectorProps {
	readonly additionalPaymentMethod: "sbp" | "card" | "cash";
	readonly setAdditionalPaymentMethod: (method: "sbp" | "card" | "cash") => void;
}

export const FamilyBillingMethodSelector: React.FC<FamilyBillingMethodSelectorProps> = ({
	additionalPaymentMethod,
	setAdditionalPaymentMethod,
}) => {
	return (
		<div className="flex items-center gap-2 p-1.5 bg-[var(--paper,#ffffff)] rounded-xl border border-[var(--line,#e2e8f0)]">
			<button
				type="button"
				onClick={() => setAdditionalPaymentMethod("sbp")}
				className={`flex-1 min-h-[44px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
					additionalPaymentMethod === "sbp"
						? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30"
						: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
				}`}
			>
				<QrCode size={16} className="text-teal-600" />
				<span>СБП QR (0.7%)</span>
			</button>
			<button
				type="button"
				onClick={() => setAdditionalPaymentMethod("card")}
				className={`flex-1 min-h-[44px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
					additionalPaymentMethod === "card"
						? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
						: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
				}`}
			>
				<CreditCard size={16} className="text-blue-600" />
				<span>Банковская карта</span>
			</button>
			<button
				type="button"
				onClick={() => setAdditionalPaymentMethod("cash")}
				className={`flex-1 min-h-[44px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
					additionalPaymentMethod === "cash"
						? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
						: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
				}`}
			>
				<Banknote size={16} className="text-emerald-600" />
				<span>Наличные</span>
			</button>
		</div>
	);
};
