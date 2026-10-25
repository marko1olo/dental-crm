import React from "react";
import { Copy, FileText, Printer } from "lucide-react";

export interface ProtocolPreviewHeaderProps {
	readonly onPrintOrthodonticCard: () => void;
	readonly onCopyClipboard: () => void;
}

export const ProtocolPreviewHeader: React.FC<ProtocolPreviewHeaderProps> = ({
	onPrintOrthodonticCard,
	onCopyClipboard,
}) => {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<FileText size={16} className="text-[var(--primary)]" />
				<span className="text-xs font-black uppercase tracking-wider text-[var(--ink)]">
					Дневник приёма
				</span>
			</div>

			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={onPrintOrthodonticCard}
					className="secondary-button shrink-0"
					data-testid="print-ortho-protocol-btn"
					title="Распечатать карту"
					aria-label="Печать протокола"
				>
					<Printer size={13} />
					<span className="hidden sm:inline">Печать протокола</span>
					<span className="sm:hidden">Печать</span>
				</button>
				<button
					type="button"
					onClick={onCopyClipboard}
					className="secondary-button shrink-0 min-h-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border border-[var(--line)]"
					title="Скопировать протокол в буфер"
				>
					<Copy size={13} />
					<span>Копировать</span>
				</button>
			</div>
		</div>
	);
};
