/**
 * DENTE Dental CRM — Column Focus Modal Footer
 * Mandate 8b (<= 120 lines)
 */

import React from "react";

interface ColumnFocusFooterProps {
	visibleCount: number;
	displayCount: number;
	totalCount: number;
	onClose: () => void;
}

export const ColumnFocusFooter: React.FC<ColumnFocusFooterProps> = ({
	visibleCount,
	displayCount,
	totalCount,
	onClose,
}) => {
	return (
		<footer className="expanded-focus-footer">
			<div className="flex items-center gap-3 text-[11.5px] text-[var(--muted)]">
				<span>
					Показано: <strong>{visibleCount}</strong> из {displayCount}
					{displayCount !== totalCount ? ` (всего ${totalCount})` : ""}
				</span>
				<span>·</span>
				<span>
					Клавиша <strong>Esc</strong> для возврата к доске
				</span>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onClose}
					className="expanded-focus-footer-close-btn"
					data-testid="focus-modal-footer-close-btn"
				>
					Закрыть
				</button>
			</div>
		</footer>
	);
};
