import React from "react";
import { Copy, Maximize2, Minimize2, Printer, X } from "lucide-react";

export interface PresenterHeaderActionsProps {
	readonly isFullscreen: boolean;
	readonly onToggleFullscreen: () => void;
	readonly onCopyTiersSummary: () => void;
	readonly onPrintAppendix: () => void;
	readonly onClose: () => void;
}

export const PresenterHeaderActions: React.FC<PresenterHeaderActionsProps> = ({
	isFullscreen,
	onToggleFullscreen,
	onCopyTiersSummary,
	onPrintAppendix,
	onClose,
}) => {
	return (
		<div className="flex items-center gap-1.5 shrink-0">
			<button
				type="button"
				onClick={onCopyTiersSummary}
				className="secondary-button min-h-[44px] min-w-[44px] sm:min-w-0 sm:min-h-[36px] sm:h-9 px-2.5 sm:px-3 rounded-lg text-[13px] font-medium bg-[var(--tp-surface-soft,var(--paper-soft))] hover:bg-[var(--tp-surface,var(--paper))] text-[var(--tp-text-main,var(--ink))] border border-[var(--tp-border,var(--line))] shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all touch-manipulation hover:border-[var(--tp-primary,var(--teal))]"
				title="Скопировать смету для пациента (WhatsApp / Telegram)"
				aria-label="Скопировать смету"
				data-testid="presenter-copy-tiers-summary-btn"
			>
				<Copy size={14} className="text-[var(--tp-primary,var(--teal))] shrink-0" />
				<span className="hidden sm:inline">Скопировать смету</span>
			</button>

			<button
				type="button"
				onClick={onPrintAppendix}
				className="treatment-presenter-header-print-btn secondary-button hidden md:inline-flex min-h-[36px] h-9 px-2.5 rounded-lg text-[13px] font-medium bg-[var(--tp-surface-soft,var(--paper-soft))] hover:bg-[var(--tp-surface,var(--paper))] text-[var(--tp-text-main,var(--ink))] border border-[var(--tp-border,var(--line))] shadow-xs items-center gap-1.5 cursor-pointer transition-all touch-manipulation hover:border-[var(--tp-primary,var(--teal))]"
				title="Печать сметы плана к договору"
				data-testid="presenter-header-print-btn"
			>
				<Printer size={14} className="shrink-0" />
				<span>Печать сметы</span>
			</button>

			<button
				type="button"
				onClick={onToggleFullscreen}
				className="treatment-presenter-fullscreen-btn icon-button hidden sm:inline-flex sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px] rounded-lg text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)] hover:bg-[var(--tp-surface-soft)] border border-[var(--tp-border)] bg-[var(--tp-bg)] items-center justify-center cursor-pointer transition-all"
				title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
				aria-label={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
				data-testid="presenter-fullscreen-btn"
			>
				{isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
			</button>

			<button
				type="button"
				onClick={onClose}
				className="treatment-presenter-close-btn icon-button w-11 h-11 sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px] rounded-lg"
				aria-label="Закрыть модальное окно"
				data-testid="close-treatment-presenter-btn"
			>
				<X size={16} />
			</button>
		</div>
	);
};
