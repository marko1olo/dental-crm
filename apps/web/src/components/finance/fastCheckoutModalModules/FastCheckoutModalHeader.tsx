import { QrCode, X } from "lucide-react";
import type React from "react";

export interface FastCheckoutModalHeaderProps {
	readonly patientName: string;
	readonly orderId?: string | undefined;
	readonly effectiveBillKop: number;
	readonly onClose: () => void;
}

export const FastCheckoutModalHeader: React.FC<
	FastCheckoutModalHeaderProps
> = ({ patientName, orderId, effectiveBillKop, onClose }) => (
	<div className="relative p-3 sm:py-2.5 sm:px-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
		<div className="sm:hidden absolute top-1.5 left-1/2 -translate-x-1/2 w-9 h-1 rounded-full bg-[var(--line,#cbd5e1)]" aria-hidden="true" />
		<div className="flex items-center gap-2.5 min-w-0">
			<div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30 shrink-0">
				<QrCode className="w-4 h-4" />
			</div>
			<div className="min-w-0">
				<h2 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] truncate flex items-center gap-2 m-0">
					Оплата приёма и кассовый чек
				</h2>
				<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5 truncate">
					{patientName} • Заказ #{orderId} • К оплате:{" "}
					<span className="font-bold font-mono text-teal-700 dark:text-teal-300">
						{(effectiveBillKop / 100).toLocaleString("ru-RU", {
							minimumFractionDigits: 2,
						})}{" "}
						₽
					</span>
				</p>
			</div>
		</div>
		<button
			type="button"
			onClick={onClose}
			className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer shrink-0 ml-2"
			aria-label="Закрыть быструю кассу"
			data-testid="btn-close-fast-checkout-modal"
		>
			<X className="w-4 h-4" />
		</button>
	</div>
);
