import {
	Banknote,
	Coins,
	CreditCard,
	QrCode,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import React from "react";
import { useWorkspaceProfile } from "../../../hooks/useWorkspaceProfile.js";
import { CHECKOUT_PAYMENT_METHODS } from "../../payments/checkout/fastCheckoutPresets.js";
import {
	SplitSimpleCashierButtons,
	type SplitSimpleCashierButtonsProps,
} from "./SplitSimpleCashierButtons";

export type SplitMethodSelectorProps = SplitSimpleCashierButtonsProps & {
	readonly isSimpleCashierMode: boolean;
};

export const SplitMethodSelector: React.FC<SplitMethodSelectorProps> = ({
	isSimpleCashierMode,
	activeMethod,
	onSelectMethod,
	totalAvailableDeposit,
	availableLoyaltyPointsRub,
	loyaltyAmountRub,
	onApplyOneClickLoyaltyPoints,
	onSwitchToSplitMode,
}) => {
	const flags = useWorkspaceProfile();
	const visibleMethods = CHECKOUT_PAYMENT_METHODS.filter((m) => {
		if (m.id === "dms_insurance" && !flags?.hasInsuranceCoPay) return false;
		return true;
	});

	return (
		<div className="space-y-1.5">
			<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
				Способ оплаты:
			</span>
			{isSimpleCashierMode ? (
				<SplitSimpleCashierButtons
					activeMethod={activeMethod}
					onSelectMethod={onSelectMethod}
					totalAvailableDeposit={totalAvailableDeposit}
					availableLoyaltyPointsRub={availableLoyaltyPointsRub}
					loyaltyAmountRub={loyaltyAmountRub}
					onApplyOneClickLoyaltyPoints={onApplyOneClickLoyaltyPoints}
					onSwitchToSplitMode={onSwitchToSplitMode}
				/>
			) : (
				<div
					className="dente-segmented-bar w-full flex overflow-x-auto"
					role="tablist"
					aria-label="Способ оплаты"
				>
					{visibleMethods.map((m) => {
						const isSelected = activeMethod === m.id;
						return (
							<button
								key={m.id}
								type="button"
								role="tab"
								aria-selected={isSelected}
								onClick={() => onSelectMethod(m.id)}
								className={`dente-segmented-item flex-1 ${isSelected ? "active" : ""}`}
								data-testid={`checkout-method-${m.id}`}
							>
								{m.id === "sbp_qr" && <QrCode size={14} className="shrink-0" />}
								{m.id === "bank_card" && (
									<CreditCard size={14} className="shrink-0" />
								)}
								{m.id === "cash" && <Banknote size={14} className="shrink-0" />}
								{m.id === "patient_deposit" && (
									<Coins size={14} className="shrink-0" />
								)}
								{m.id === "dms_insurance" && (
									<ShieldCheck size={14} className="shrink-0" />
								)}
								{m.id === "loyalty_points" && (
									<Sparkles size={14} className="shrink-0" />
								)}
								<span>{m.titleRu}</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};
