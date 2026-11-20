/**
 * @dental/web/components/hygiene/HygieneStudioFooter.tsx
 *
 * Нижний плавающий тулбар действий Студии гигиены.
 * Мандаты: 8b (<=300 строк), 8am (Ровно 1 Primary CTA), 8ze (Apple HIG).
 */

import React from "react";

export interface HygieneStudioFooterProps {
	readonly onClose: () => void;
	readonly handlePrint: () => void;
	readonly handleCopyMemo: () => void;
	readonly handleCommit: () => void;
	readonly isSubmitting: boolean;
}

export const HygieneStudioFooter: React.FC<HygieneStudioFooterProps> = ({
	onClose,
	handlePrint,
	handleCopyMemo,
	handleCommit,
	isSubmitting,
}) => {
	return (
		<div className="p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--paper)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-[max(12px,env(safe-area-inset-bottom))]">
			<div className="flex items-center gap-2 order-2 sm:order-1 w-full sm:w-auto">
				<button
					type="button"
					data-testid="hygiene-print-memo-btn"
					onClick={handlePrint}
					className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-medium rounded-lg border border-[var(--line)] text-[var(--ink)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] transition-colors min-h-[44px] inline-flex items-center justify-center cursor-pointer shadow-xs"
				>
					Печать памятки А4
				</button>
				<button
					type="button"
					data-testid="hygiene-copy-memo-btn"
					onClick={handleCopyMemo}
					className="!hidden sm:!inline-flex px-3.5 py-2 text-xs font-medium rounded-lg border border-[var(--line)] text-[var(--ink)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] transition-colors min-h-[44px] items-center justify-center cursor-pointer shadow-xs"
				>
					Копировать текст
				</button>
				<button
					type="button"
					onClick={onClose}
					className="flex-1 sm:!hidden px-3.5 py-2 text-xs font-medium rounded-lg border border-[var(--line)] bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors min-h-[44px] inline-flex items-center justify-center cursor-pointer"
				>
					Отмена
				</button>
			</div>

			<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 order-1 sm:order-2 w-full sm:w-auto">
				<button
					type="button"
					onClick={onClose}
					className="!hidden sm:!inline-flex px-4 py-2 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors min-h-[44px] items-center justify-center cursor-pointer shadow-xs"
				>
					Отмена
				</button>

				{/* Primary CTA (Exactly ONE, color #0d9488, NEVER disabled, full width on mobile) */}
				<button
					type="button"
					data-testid="hygiene-commit-protocol-btn"
					onClick={handleCommit}
					className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-strong)] rounded-xl sm:rounded-lg shadow-sm transition-all min-h-[48px] sm:min-h-[44px] flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
				>
					{isSubmitting ? (
						"Фиксация..."
					) : (
						<>
							<span className="hidden sm:inline">✓ Зафиксировать протокол гигиены</span>
							<span className="sm:hidden">✓ Зафиксировать протокол</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
};

HygieneStudioFooter.displayName = "HygieneStudioFooter";
