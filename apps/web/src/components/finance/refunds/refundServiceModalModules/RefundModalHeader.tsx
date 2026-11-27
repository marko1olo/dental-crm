import React from "react";
import { RotateCcw, X } from "lucide-react";

export interface RefundModalHeaderProps {
	readonly invoiceNumber: string;
	readonly patientName: string;
	readonly onClose: () => void;
}

export const RefundModalHeader: React.FC<RefundModalHeaderProps> = ({
	invoiceNumber,
	patientName,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
			<div className="flex items-center gap-3 min-w-0">
				<div className="w-9 h-9 rounded-lg bg-[var(--primary-soft,rgba(13,148,136,0.12))] text-[var(--primary)] flex items-center justify-center border border-[var(--primary)]/20 shrink-0">
					<RotateCcw className="w-4 h-4" />
				</div>
				<div className="min-w-0">
					<h3 className="text-base font-semibold text-[var(--ink,#0f172a)] m-0 leading-snug">
						Оформление частичного возврата
					</h3>
					<p className="text-xs text-[var(--ink-muted,#64748b)] m-0 leading-snug">
						Счёт: <span className="font-mono font-semibold text-[var(--ink,#0f172a)]">{invoiceNumber}</span> • Пациент: {patientName}
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="w-9 h-9 max-sm:min-h-[44px] max-sm:min-w-[44px] rounded-lg max-sm:rounded-xl bg-[var(--paper,#ffffff)] dark:bg-white/5 border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
				aria-label="Закрыть"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
};
