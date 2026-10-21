import { Banknote, Coins, CreditCard, Layers, QrCode } from "lucide-react";
import type React from "react";
import type { CheckoutPaymentMethodType } from "../../payments/checkout/fastCheckoutPresets.js";

export interface SplitSimpleCashierButtonsProps {
	readonly activeMethod: CheckoutPaymentMethodType;
	readonly onSelectMethod: (method: CheckoutPaymentMethodType) => void;
	readonly totalAvailableDeposit: number;
	readonly onSwitchToSplitMode?: (() => void) | undefined;
}

export const SplitSimpleCashierButtons: React.FC<
	SplitSimpleCashierButtonsProps
> = ({
	activeMethod,
	onSelectMethod,
	totalAvailableDeposit,
	onSwitchToSplitMode,
}) => {
	const gridCols =
		totalAvailableDeposit > 0 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3";

	return (
		<div
			className={`grid gap-2 ${gridCols}`}
			data-testid="simple-cashier-methods"
		>
			<button
				type="button"
				onClick={() => onSelectMethod("bank_card")}
				className={`min-h-[52px] sm:min-h-[44px] h-auto py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 font-extrabold text-sm transition-all cursor-pointer select-none active:scale-95 ${
					activeMethod === "bank_card"
						? "border-2 border-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] dark:text-[var(--teal,#2dd4bf)] ring-2 ring-[var(--teal,#0d9488)]/20 shadow-xs"
						: "border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)]/60 hover:bg-[var(--paper-soft,#f8fafc)]"
				}`}
				data-testid="simple-card-btn"
			>
				<CreditCard size={18} className="shrink-0 text-current" />
				<span className="truncate">Картой</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectMethod("cash")}
				className={`min-h-[52px] sm:min-h-[44px] h-auto py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 font-extrabold text-sm transition-all cursor-pointer select-none active:scale-95 ${
					activeMethod === "cash"
						? "border-2 border-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] dark:text-[var(--teal,#2dd4bf)] ring-2 ring-[var(--teal,#0d9488)]/20 shadow-xs"
						: "border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)]/60 hover:bg-[var(--paper-soft,#f8fafc)]"
				}`}
				data-testid="simple-cash-btn"
			>
				<Banknote size={18} className="shrink-0 text-current" />
				<span className="truncate">Наличными</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectMethod("sbp_qr")}
				className={`min-h-[52px] sm:min-h-[44px] h-auto py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 font-extrabold text-sm transition-all cursor-pointer select-none active:scale-95 ${
					activeMethod === "sbp_qr"
						? "border-2 border-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] dark:text-[var(--teal,#2dd4bf)] ring-2 ring-[var(--teal,#0d9488)]/20 shadow-xs"
						: "border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)]/60 hover:bg-[var(--paper-soft,#f8fafc)]"
				}`}
				data-testid="simple-sbp-btn"
			>
				<QrCode size={18} className="shrink-0 text-current" />
				<span className="truncate">СБП QR</span>
			</button>

			{totalAvailableDeposit > 0 && (
				<button
					type="button"
					onClick={() => onSelectMethod("patient_deposit")}
					className={`min-h-[52px] sm:min-h-[44px] h-auto py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 font-extrabold text-sm transition-all cursor-pointer select-none active:scale-95 ${
						activeMethod === "patient_deposit"
							? "border-2 border-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] dark:text-[var(--teal,#2dd4bf)] ring-2 ring-[var(--teal,#0d9488)]/20 shadow-xs"
							: "border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)]/60 hover:bg-[var(--paper-soft,#f8fafc)]"
					}`}
					data-testid="simple-deposit-btn"
					title={`Списать с депозита пациента (${totalAvailableDeposit.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽)`}
				>
					<Coins size={18} className="shrink-0 text-current" />
					<span className="truncate">Депозит</span>
				</button>
			)}

			{onSwitchToSplitMode && (
				<button
					type="button"
					onClick={onSwitchToSplitMode}
					className="min-h-[52px] sm:min-h-[44px] h-auto py-2.5 px-3 rounded-xl border border-dashed border-[var(--teal,#0d9488)]/60 bg-[var(--teal-surface,rgba(13,148,136,0.06))] hover:bg-[var(--teal-surface,rgba(13,148,136,0.14))] text-[var(--teal,#0d9488)] dark:text-[var(--teal,#2dd4bf)] flex items-center justify-center gap-1.5 font-extrabold text-sm transition-all cursor-pointer select-none active:scale-95"
					data-testid="simple-split-toggle-btn"
					title="Разделить оплату между несколькими источниками (Нал + Карта + СБП + Депозит)"
				>
					<Layers size={18} className="shrink-0 text-current" />
					<span className="truncate">Сплит</span>
				</button>
			)}
		</div>
	);
};
