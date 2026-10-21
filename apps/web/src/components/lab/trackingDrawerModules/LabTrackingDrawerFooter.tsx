import React from "react";

export interface LabTrackingDrawerFooterProps {
	onClose: () => void;
}

export function LabTrackingDrawerFooter({
	onClose,
}: LabTrackingDrawerFooterProps): React.JSX.Element {
	return (
		<div className="px-6 py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex justify-end">
			<button
				type="button"
				onClick={onClose}
				className="min-h-[36px] h-9 px-5 py-1.5 text-xs font-bold rounded-xl border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--line)] transition-colors cursor-pointer"
			>
				Закрыть
			</button>
		</div>
	);
}
