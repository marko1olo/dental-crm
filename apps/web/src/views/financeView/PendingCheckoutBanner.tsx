import React from "react";
import type { PendingCheckout } from "./types.js";

export interface PendingCheckoutBannerProps {
	readonly pendingCheckout: PendingCheckout;
	readonly onResetPendingCheckout: () => void;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly money: (value: number | null) => string;
}

export function PendingCheckoutBanner({
	pendingCheckout,
	onResetPendingCheckout,
	onOpenSplitPayment,
	money,
}: PendingCheckoutBannerProps): React.JSX.Element {
	const list = (pendingCheckout.services || []).map((s: any) => s.name || s.title).filter(Boolean);
	const count = list.length;
	const serviceText = count === 0
		? "Консультация и обследование"
		: count === 1
		? list[0]
		: `${count} ${count >= 2 && count <= 4 ? "услуги" : "услуг"}`;

	return (
		<div
			className="clinical-checkout-handoff-banner rounded-xl border border-teal-500/40 bg-teal-50/80 dark:bg-teal-950/40 p-2.5 text-xs flex items-center justify-between gap-2 mb-2 sm:mb-3 shadow-xs animate-in fade-in"
			data-testid="clinical-checkout-handoff-banner"
		>
			<div className="flex items-center gap-2 min-w-0">
				<div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
				<div className="flex items-center gap-1.5 min-w-0">
					<span className="font-bold text-teal-900 dark:text-teal-100 shrink-0">
						Счёт по приёму ({pendingCheckout.patientName}):
					</span>
					<span className="text-[var(--ink)] font-medium truncate">{serviceText}</span>
				</div>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				<span className="font-mono font-extrabold text-teal-800 dark:text-teal-200 text-sm">
					{money(pendingCheckout.totalDueRub)}
				</span>
				{onOpenSplitPayment && (
					<button
						type="button"
						onClick={onOpenSplitPayment}
						className="primary-button min-h-[28px] h-[28px] px-2.5 py-0 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-1 shadow-xs cursor-pointer select-none"
						data-testid="btn-pay-pending-checkout"
					>
						<span>Оплатить в кассе</span>
					</button>
				)}
				<button
					type="button"
					onClick={onResetPendingCheckout}
					className="text-[11px] text-[var(--muted)] hover:text-rose-500 underline ml-1 cursor-pointer"
				>
					Сбросить
				</button>
			</div>
		</div>
	);
}
