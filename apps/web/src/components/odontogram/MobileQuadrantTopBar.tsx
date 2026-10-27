import type React from "react";
import { memo } from "react";
import type { OdontogramQuadrantId } from "./chart/toothChartTypes";

export interface MobileQuadrantTopBarProps {
	readonly mobileDisplayMode?: "quadrant" | "carousel" | undefined;
	readonly onToggleMobileDisplayMode?: ((mode: "quadrant" | "carousel") => void) | undefined;
	readonly showAllOption?: boolean | undefined;
	readonly currentQuadrant: OdontogramQuadrantId;
	readonly allTeethCount: string;
	readonly onSelectQuadrant: (q: OdontogramQuadrantId) => void;
}

export const MobileQuadrantTopBar: React.FC<MobileQuadrantTopBarProps> = memo(
	({
		mobileDisplayMode = "quadrant",
		onToggleMobileDisplayMode,
		showAllOption = true,
		currentQuadrant,
		allTeethCount,
		onSelectQuadrant,
	}) => {
		return (
			<div className="flex items-center justify-between px-1 gap-2 flex-wrap">
				<div className="flex items-center gap-1 bg-[var(--odontogram-paper,var(--paper))] p-0.5 rounded-xl border border-[var(--odontogram-border,var(--line))] shadow-2xs">
					<button
						type="button"
						onClick={() => onToggleMobileDisplayMode?.("quadrant")}
						className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
							mobileDisplayMode !== "carousel"
								? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
								: "text-[var(--odontogram-ink-muted,var(--muted))] hover:text-[var(--odontogram-ink,var(--ink))]"
						}`}
						data-testid="mobile-mode-quadrant-btn"
						title="Режим квадрантов: 8 зубов >= 44x56px"
					>
						Квадранты (8)
					</button>
					<button
						type="button"
						onClick={() => onToggleMobileDisplayMode?.("carousel")}
						className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
							mobileDisplayMode === "carousel"
								? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
								: "text-[var(--odontogram-ink-muted,var(--muted))] hover:text-[var(--odontogram-ink,var(--ink))]"
						}`}
						data-testid="mobile-mode-carousel-btn"
						title="Режим фокуса: 1 крупный зуб 120x140px с каруселью"
					>
						Фокус (1)
					</button>
				</div>
				{showAllOption && (
					<button
						type="button"
						onClick={() => onSelectQuadrant("all")}
						className={`mobile-quadrant-all-btn min-h-[30px] h-[30px] px-2.5 rounded-lg text-[11px] font-black border transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
							currentQuadrant === "all"
								? "active bg-[var(--teal,#0d9488)] text-white border-[var(--teal-strong,#0f766e)] shadow-xs"
								: "bg-[var(--odontogram-paper,var(--paper))] text-[var(--odontogram-ink-muted,var(--muted))] hover:text-[var(--odontogram-ink,var(--ink))] border-[var(--odontogram-border,var(--line))]"
						}`}
						title="Показать полную зубную дугу"
						data-testid="mobile-quadrant-btn-all"
					>
						<span>Все ({allTeethCount})</span>
					</button>
				)}
			</div>
		);
	},
);

MobileQuadrantTopBar.displayName = "MobileQuadrantTopBar";
