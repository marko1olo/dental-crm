import React from "react";

export interface DocumentVoidModalFooterProps {
	saving: boolean;
	ready: boolean;
	guidanceId: string;
	onClose: () => void;
	onConfirm: () => Promise<void> | void;
}

export const DocumentVoidModalFooter: React.FC<DocumentVoidModalFooterProps> = ({
	saving,
	ready,
	guidanceId,
	onClose,
	onConfirm,
}) => {
	return (
		<div className="flex items-center justify-between p-3 px-4 border-t border-[var(--line)] bg-[var(--paper-soft)]">
			<button
				type="button"
				aria-busy={saving || undefined}
				className="inline-flex items-center justify-center min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3.5 text-sm font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
				onClick={() => {
					if (saving) return;
					onClose();
				}}
			>
				Вернуться
			</button>
			<button
				type="button"
				aria-busy={saving || undefined}
				aria-describedby={!ready ? guidanceId : undefined}
				className="inline-flex items-center justify-center min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-4 text-sm font-medium rounded-lg border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors cursor-pointer shrink-0 bg-transparent"
				onClick={() => {
					if (saving) return;
					void onConfirm();
				}}
			>
				{saving ? "Аннулирую документ..." : "Аннулировать с причиной"}
			</button>
		</div>
	);
};
