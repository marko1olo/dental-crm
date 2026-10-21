import { CheckCircle2 } from "lucide-react";

export interface AnesthesiaStatusFooterProps {
	lastAppliedText: string | null;
	activeToastMessage: string | null;
}

export function AnesthesiaStatusFooter({
	lastAppliedText,
	activeToastMessage,
}: AnesthesiaStatusFooterProps) {
	return (
		<>
			<div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-[var(--muted)]">
				<span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
					<CheckCircle2 size={12} className="shrink-0" />
					<span>Стандартная терапевтическая дозировка — безопасно</span>
				</span>
				{lastAppliedText && (
					<span className="truncate max-w-[400px] text-[var(--ink-secondary)] italic">
						Внесено в протокол: {lastAppliedText}
					</span>
				)}
			</div>
			{activeToastMessage && (
				<div className="anesthesia-quick-toast" role="status">
					<CheckCircle2 size={16} />
					<span>{activeToastMessage}</span>
				</div>
			)}
		</>
	);
}
