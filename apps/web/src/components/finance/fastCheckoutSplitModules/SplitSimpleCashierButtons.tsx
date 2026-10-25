import { Banknote, Coins, CreditCard, Layers, QrCode, Sparkles } from "lucide-react";
import type React from "react";
import type { CheckoutPaymentMethodType } from "../../payments/checkout/fastCheckoutPresets.js";

export interface SplitSimpleCashierButtonsProps {
	readonly activeMethod: CheckoutPaymentMethodType;
	readonly onSelectMethod: (method: CheckoutPaymentMethodType) => void;
	readonly totalAvailableDeposit: number;
	readonly availableLoyaltyPointsRub?: number | undefined;
	readonly loyaltyAmountRub?: number | undefined;
	readonly onApplyOneClickLoyaltyPoints?: (() => void) | undefined;
	readonly onSwitchToSplitMode?: (() => void) | undefined;
}

const getBtnClass = (isActive: boolean) =>
	`min-h-[52px] sm:min-h-[44px] h-auto py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 font-extrabold text-sm transition-all cursor-pointer select-none active:scale-95 ${
		isActive
			? "border-2 border-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] dark:text-[var(--teal,#2dd4bf)] ring-2 ring-[var(--teal,#0d9488)]/20 shadow-xs"
			: "border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)]/60 hover:bg-[var(--paper-soft,#f8fafc)]"
	}`;

export const SplitSimpleCashierButtons: React.FC<SplitSimpleCashierButtonsProps> = ({
	activeMethod, onSelectMethod, totalAvailableDeposit,
	availableLoyaltyPointsRub = 0, loyaltyAmountRub = 0,
	onApplyOneClickLoyaltyPoints, onSwitchToSplitMode,
}) => {
	const hasBonus = availableLoyaltyPointsRub > 0 || loyaltyAmountRub > 0;
	const isLoyaltyActive = activeMethod === "loyalty_points" || loyaltyAmountRub > 0;
	const gridCols = hasBonus
		? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
		: totalAvailableDeposit > 0 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3";

	return (
		<div className={`grid gap-2 ${gridCols}`} data-testid="simple-cashier-methods">
			<button type="button" onClick={() => onSelectMethod("bank_card")} className={getBtnClass(activeMethod === "bank_card")} data-testid="simple-card-btn">
				<CreditCard size={18} className="shrink-0 text-current" /><span className="truncate">Картой</span>
			</button>
			<button type="button" onClick={() => onSelectMethod("cash")} className={getBtnClass(activeMethod === "cash")} data-testid="simple-cash-btn">
				<Banknote size={18} className="shrink-0 text-current" /><span className="truncate">Наличными</span>
			</button>
			<button type="button" onClick={() => onSelectMethod("sbp_qr")} className={getBtnClass(activeMethod === "sbp_qr")} data-testid="simple-sbp-btn">
				<QrCode size={18} className="shrink-0 text-current" /><span className="truncate">СБП QR</span>
			</button>
			{totalAvailableDeposit > 0 && (
				<button type="button" onClick={() => onSelectMethod("patient_deposit")} className={getBtnClass(activeMethod === "patient_deposit")} data-testid="simple-deposit-btn" title={`Списать с депозита пациента (${totalAvailableDeposit.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽)`}>
					<Coins size={18} className="shrink-0 text-current" /><span className="truncate">Депозит</span>
				</button>
			)}
			{hasBonus && (
				<button type="button" onClick={() => onApplyOneClickLoyaltyPoints ? onApplyOneClickLoyaltyPoints() : onSelectMethod("loyalty_points")} className={getBtnClass(isLoyaltyActive)} data-testid="simple-loyalty-btn" title={`Списать бонусы: ${(loyaltyAmountRub > 0 ? loyaltyAmountRub : availableLoyaltyPointsRub).toLocaleString("ru-RU")} ₽`}>
					<Sparkles size={18} className="shrink-0 text-current" />
					<span className="truncate">
						{loyaltyAmountRub > 0 ? `Бонусы (${loyaltyAmountRub} ₽)` : "Бонусы"}
					</span>
				</button>
			)}
			{onSwitchToSplitMode && (
				<button type="button" onClick={onSwitchToSplitMode} className="min-h-[52px] sm:min-h-[44px] h-auto py-2.5 px-3 rounded-xl border border-dashed border-[var(--teal,#0d9488)]/60 bg-[var(--teal-surface,rgba(13,148,136,0.06))] hover:bg-[var(--teal-surface,rgba(13,148,136,0.14))] text-[var(--teal,#0d9488)] dark:text-[var(--teal,#2dd4bf)] flex items-center justify-center gap-1.5 font-extrabold text-sm transition-all cursor-pointer select-none active:scale-95" data-testid="simple-split-toggle-btn" title="Разделить оплату между несколькими источниками (Нал + Карта + СБП + Депозит)">
					<Layers size={18} className="shrink-0 text-current" /><span className="truncate">Сплит</span>
				</button>
			)}
		</div>
	);
};
