import React from "react";
import { Check } from "lucide-react";
import { SHADE_SWATCH_MAP, STUMP_NATURAL_DIE_SHADES } from "../labShadesData";

interface DentalLabStumpGridProps {
	readonly selectedStumpShade?: string | null | undefined;
	readonly onSelectStumpShade?: ((stumpShade: string) => void) | undefined;
	readonly mode?: "tab" | "inline" | undefined;
}

export function DentalLabStumpGrid({
	selectedStumpShade,
	onSelectStumpShade,
	mode = "tab",
}: DentalLabStumpGridProps) {
	const isTab = mode === "tab";

	return (
		<div
			className={
				isTab
					? "space-y-2.5"
					: "pt-2 border-t border-[var(--line,#cbd5e1)] space-y-2"
			}
			data-testid={isTab ? "stump-tab-content" : "stump-shade-container"}
		>
			<div className="flex items-center justify-between flex-wrap gap-1">
				<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
					{isTab
						? "Эталон цвета культи препарированного зуба (IPS Natural Die ND1–ND9):"
						: "Цвет культи препарированного зуба (IPS Natural Die ND1–ND9):"}
				</span>
				{selectedStumpShade && onSelectStumpShade && (
					<button
						type="button"
						onClick={() => onSelectStumpShade("")}
						className="text-[11px] text-[var(--muted,#64748b)] hover:text-rose-600 underline cursor-pointer"
					>
						Сбросить культю
					</button>
				)}
			</div>
			<div
				className={
					isTab
						? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
						: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5"
				}
			>
				{STUMP_NATURAL_DIE_SHADES.map((nd) => {
					const isSelected = selectedStumpShade === nd.id;
					const swatch = SHADE_SWATCH_MAP[nd.id];

					return (
						<button
							key={nd.id}
							type="button"
							onClick={() => onSelectStumpShade?.(isSelected ? "" : nd.id)}
							data-testid={
								isTab ? `stump-tab-shade-${nd.id}` : `stump-shade-${nd.id}`
							}
							className={`min-h-[48px] p-2 text-left rounded-lg border text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
								isSelected
									? "bg-teal-500/15 border-teal-600 font-bold text-teal-800 dark:text-teal-200 ring-2 ring-teal-500/30 shadow-xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
							}`}
						>
							<div className="flex items-center gap-2 min-w-0">
								<span
									className="w-4 h-4 rounded-full shrink-0 border border-slate-400 dark:border-slate-500 shadow-2xs"
									style={{ backgroundColor: swatch?.bg || "#ebdcc9" }}
									aria-hidden="true"
								/>
								<div className="min-w-0 truncate">
									<div className="font-bold font-mono text-xs">{nd.id}</div>
									{isTab && (
										<div className="text-[10px] text-[var(--muted,#64748b)] truncate">
											{nd.name.replace(/^ND\d+\s*—\s*/, "")}
										</div>
									)}
								</div>
							</div>
							{isSelected && (
								<Check size={14} className="text-teal-600 shrink-0" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
