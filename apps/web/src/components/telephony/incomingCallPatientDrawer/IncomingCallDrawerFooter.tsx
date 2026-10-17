import React from "react";
import { ExternalLink } from "lucide-react";

interface IncomingCallDrawerFooterProps {
	onClose: () => void;
	onOpenFullPatientView: () => void;
}

export const IncomingCallDrawerFooter: React.FC<IncomingCallDrawerFooterProps> = ({
	onClose,
	onOpenFullPatientView,
}) => {
	return (
		<div className="shrink-0 p-3.5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] flex items-center justify-between gap-2">
			<button
				type="button"
				onClick={onClose}
				className="h-8 min-h-[32px] px-3.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#e2e8f0)] border border-[var(--line,#e2e8f0)] text-xs font-semibold text-[var(--ink,#0f172a)] transition-all cursor-pointer inline-flex items-center justify-center"
			>
				Закрыть шторку
			</button>

			<button
				type="button"
				onClick={onOpenFullPatientView}
				className="h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold text-[var(--teal)] hover:bg-[var(--teal-soft)] border border-transparent hover:border-[var(--teal)] inline-flex items-center gap-1 cursor-pointer transition-all"
				title="Перейти в полноэкранный раздел Пациенты"
			>
				<span>Открыть в общем списке</span>
				<ExternalLink size={12} />
			</button>
		</div>
	);
};
