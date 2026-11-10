import React from "react";
import { LayoutGrid, List } from "lucide-react";

export interface ScheduleViewModeSwitchProps {
	viewMode?: "grid" | "timeline" | "chairs" | undefined;
	onViewModeChange?: ((mode: "grid" | "timeline") => void) | undefined;
}

export function ScheduleViewModeSwitch({
	viewMode,
	onViewModeChange,
}: ScheduleViewModeSwitchProps) {
	if (!onViewModeChange) return null;

	const isGridActive = viewMode === "grid" || viewMode === "chairs" || !viewMode;

	return (
		<div
			className="schedule-view-mode-segmented dente-segmented-bar hidden sm:inline-flex shrink-0 select-none h-8 min-h-[32px] max-h-8 sm:h-9 sm:min-h-[36px] sm:max-h-9 p-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] gap-0.5 items-center"
			role="group"
			aria-label="Режим отображения"
		>
			<button
				type="button"
				onClick={() => onViewModeChange("timeline")}
				className={`schedule-view-mode-btn dente-segmented-item h-7 min-h-[26px] max-h-7 sm:h-8 sm:min-h-[32px] sm:max-h-8 rounded-md px-2 text-[12px] font-medium inline-flex items-center gap-1.5 ${
					viewMode === "timeline"
						? "active font-semibold bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
						: "text-[var(--muted)]"
				}`}
				title="Лента приемов по дням"
				aria-label="Лента по дням"
				aria-pressed={viewMode === "timeline"}
				data-testid="schedule-view-mode-timeline"
			>
				<List size={13} className="shrink-0 opacity-80" aria-hidden="true" />
				<span className="hidden xl:inline">Лента</span>
			</button>
			<button
				type="button"
				onClick={() => onViewModeChange("grid")}
				className={`schedule-view-mode-btn dente-segmented-item h-7 min-h-[26px] max-h-7 sm:h-8 sm:min-h-[32px] sm:max-h-8 rounded-md px-2 text-[12px] font-medium inline-flex items-center gap-1.5 ${
					isGridActive
						? "active font-semibold bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
						: "text-[var(--muted)]"
				}`}
				title="Сетка по кабинетам и креслам"
				aria-label="Сетка по кабинетам"
				aria-pressed={isGridActive}
				data-testid="schedule-view-mode-grid"
			>
				<LayoutGrid size={13} className="shrink-0 opacity-80" aria-hidden="true" />
				<span className="hidden xl:inline">Сетка</span>
			</button>
		</div>
	);
}
