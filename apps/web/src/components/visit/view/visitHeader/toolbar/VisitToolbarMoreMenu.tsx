import React from "react";
import { MoreHorizontal } from "lucide-react";
import { VisitToolbarMoreMenuItems } from "./VisitToolbarMoreMenuItems";
import type { VisitActionButtonsToolbarProps } from "../types";

export interface VisitToolbarMoreMenuProps extends VisitActionButtonsToolbarProps {
	readonly handlePrintClinicalDiaryFast: () => void;
}

export function VisitToolbarMoreMenu(props: VisitToolbarMoreMenuProps) {
	const { isHeaderMoreMenuOpen, setIsHeaderMoreMenuOpen, headerMoreMenuRef } = props;

	return (
		<div className="relative shrink-0" ref={headerMoreMenuRef as any}>
			<button
				type="button"
				onClick={() => setIsHeaderMoreMenuOpen((prev) => !prev)}
				data-testid="visit-header-more-actions-btn"
				className="secondary-button min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] sm:h-9 sm:w-9 p-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center cursor-pointer shrink-0 rounded-xl shadow-xs transition-colors h-11 w-11"
				title="Дополнительные действия и бланки приема"
				aria-label="Дополнительные действия приема"
				aria-expanded={isHeaderMoreMenuOpen}
			>
				<MoreHorizontal className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
			</button>

			{isHeaderMoreMenuOpen && (
				<VisitToolbarMoreMenuItems
					{...props}
					onClose={() => setIsHeaderMoreMenuOpen(false)}
				/>
			)}
		</div>
	);
}
