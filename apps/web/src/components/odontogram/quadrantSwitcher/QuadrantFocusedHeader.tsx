/**
 * DENTE Dental CRM — Quadrant Focused View Header & Pagination
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import {
	type OdontogramQuadrantId,
	getAdjacentQuadrant,
	getQuadrantTitle,
} from "../ToothChart";
import { MobileQuadrantTabs } from "../MobileQuadrantTabs";

export interface QuadrantFocusedHeaderProps {
	currentQuadrant: OdontogramQuadrantId;
	onSelectQuadrant: (q: OdontogramQuadrantId) => void;
	isPediatricEffective: boolean;
	isMixedEffective?: boolean;
	mobileDisplayMode?: "quadrant" | "carousel" | undefined;
	onToggleMobileDisplayMode?: ((mode: "quadrant" | "carousel") => void) | undefined;
}

export const QuadrantFocusedHeader: React.FC<QuadrantFocusedHeaderProps> = ({
	currentQuadrant,
	onSelectQuadrant,
	isPediatricEffective,
	isMixedEffective = false,
	mobileDisplayMode = "quadrant",
	onToggleMobileDisplayMode,
}) => {
	return (
		<div className="w-full flex flex-col gap-2 mb-2 items-center">
			{/* Mobile 2x2 Anatomical Quadrant Switcher per Apple HIG (< 768px) */}
			<div className="w-full sm:hidden">
				<MobileQuadrantTabs
					currentQuadrant={currentQuadrant}
					onSelectQuadrant={onSelectQuadrant}
					isPediatricEffective={isPediatricEffective}
					isMixedEffective={isMixedEffective}
					showAllOption={true}
					mobileDisplayMode={mobileDisplayMode}
					onToggleMobileDisplayMode={onToggleMobileDisplayMode}
				/>
			</div>

			{/* Desktop pagination bar (hidden on mobile) */}
			<div className="hidden sm:flex items-center justify-between w-full max-w-lg px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] gap-1.5">
				<button
					type="button"
					onClick={() => onSelectQuadrant(getAdjacentQuadrant(currentQuadrant, "prev", isPediatricEffective))}
					className="min-h-[32px] min-w-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border-subtle)] flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
					title="Предыдущий квадрант"
					data-testid="quadrant-prev-btn"
				>
					<span>←</span>
					<span> Пред.</span>
				</button>
				<div className="flex flex-col items-center justify-center min-w-0 flex-1 px-1 text-center">
					<span className="text-xs sm:text-sm font-black text-[var(--odontogram-ink)] leading-tight text-center">
						{getQuadrantTitle(currentQuadrant, isPediatricEffective)}
					</span>
				</div>
				<button
					type="button"
					onClick={() => onSelectQuadrant(getAdjacentQuadrant(currentQuadrant, "next", isPediatricEffective))}
					className="min-h-[32px] min-w-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border-subtle)] flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
					title="Следующий квадрант"
					data-testid="quadrant-next-btn"
				>
					<span>След. </span>
					<span>→</span>
				</button>
			</div>
		</div>
	);
};
