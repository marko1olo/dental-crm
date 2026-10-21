import type React from "react";
import { memo } from "react";
import type { OdontogramQuadrantId } from "./chart/toothChartTypes";
import type { MobileQuadrantItem } from "./mobileQuadrantData";

export interface MobileQuadrantGridProps {
	readonly quadrants: readonly MobileQuadrantItem[];
	readonly currentQuadrant: OdontogramQuadrantId;
	readonly onSelectQuadrant: (q: OdontogramQuadrantId) => void;
}

export const MobileQuadrantGrid: React.FC<MobileQuadrantGridProps> = memo(
	({ quadrants, currentQuadrant, onSelectQuadrant }) => {
		return (
			<div className="grid grid-cols-2 gap-1.5 w-full">
				{quadrants.map((quad) => {
					const isActive = currentQuadrant === quad.id;
					return (
						<button
							key={quad.id}
							type="button"
							onClick={() => onSelectQuadrant(quad.id)}
							title={quad.title}
							data-testid={quad.testId}
							style={
								isActive
									? {
											backgroundColor: "#0d9488",
											color: "#ffffff",
											borderColor: "#0f766e",
										}
									: undefined
							}
							className={`mobile-quadrant-btn min-h-[44px] h-[44px] px-2.5 py-1.5 rounded-xl font-bold flex items-center justify-between gap-1.5 border transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
								isActive
									? "active bg-teal-600 text-white border-teal-700 shadow-sm font-black ring-2 ring-teal-500/40"
									: "bg-[var(--odontogram-paper,var(--paper))] text-[var(--odontogram-ink,var(--ink))] border-[var(--odontogram-border,var(--line))] hover:border-teal-500 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong))]"
							}`}
						>
							<div className="flex items-center gap-1.5 min-w-0">
								<span
									className={`text-[14px] font-black font-mono leading-none ${isActive ? "text-white" : "text-[var(--odontogram-ink,var(--ink))]"}`}
								>
									{quad.label}
								</span>
								<span
									className={`text-[12px] font-extrabold truncate leading-none ${isActive ? "text-white/95" : "text-[var(--odontogram-ink,var(--ink))]"}`}
								>
									{quad.jawName}
								</span>
							</div>

							<span
								className={`text-[11px] font-black font-mono px-1.5 py-0.5 rounded-md uppercase tracking-tight shrink-0 ${
									isActive
										? "bg-black/30 text-white"
										: "bg-[var(--odontogram-surface,var(--paper-soft))] text-[var(--odontogram-ink-muted,var(--muted))] border border-[var(--odontogram-border-subtle,var(--line))]"
								}`}
							>
								{quad.teethRange}
							</span>
						</button>
					);
				})}
			</div>
		);
	},
);

MobileQuadrantGrid.displayName = "MobileQuadrantGrid";
