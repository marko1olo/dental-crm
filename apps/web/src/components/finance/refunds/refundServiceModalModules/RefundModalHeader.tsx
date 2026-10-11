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
		<div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
					<RotateCcw className="w-5 h-5" />
				</div>
				<div>
					<h3 className="text-base font-extrabold text-[var(--ink,#0f172a)] m-0 leading-snug">
						Оформление частичного возврата
					</h3>
					<p className="text-xs text-[var(--muted,#64748b)] m-0">
						Счет: <span className="font-mono font-bold text-[var(--ink,#0f172a)]">{invoiceNumber}</span> • Пациент: {patientName}
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--muted,#64748b)] flex items-center justify-center transition-colors"
				aria-label="Закрыть"
			>
				<X className="w-5 h-5" />
			</button>
		</div>
	);
};
