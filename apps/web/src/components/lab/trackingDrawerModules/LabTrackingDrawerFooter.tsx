import React from "react";
import { Award } from "lucide-react";

export interface LabTrackingDrawerFooterProps {
	readonly onClose: () => void;
	readonly onOpenPassport?: (() => void) | undefined;
	readonly isInstalled?: boolean | undefined;
}

export function LabTrackingDrawerFooter({
	onClose,
	onOpenPassport,
	isInstalled,
}: LabTrackingDrawerFooterProps): React.JSX.Element {
	return (
		<div className="px-6 py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-3">
			{isInstalled && onOpenPassport ? (
				<button
					type="button"
					onClick={onOpenPassport}
					className="min-h-[36px] h-9 px-3.5 text-xs font-semibold rounded-lg border border-teal-500/40 bg-[var(--paper)] text-teal-700 dark:text-teal-300 hover:bg-[var(--paper-soft)] inline-flex items-center gap-2 transition-colors cursor-pointer"
					data-testid="lab-order-warranty-passport-btn"
				>
					<Award className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
					<span>Гарантийный паспорт</span>
				</button>
			) : (
				<div />
			)}
			<button
				type="button"
				onClick={onClose}
				className="min-h-[36px] h-9 px-5 py-1.5 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
			>
				Закрыть
			</button>
		</div>
	);
}
