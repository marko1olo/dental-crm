import React from "react";
import { LayoutGrid, List, Armchair } from "lucide-react";

export interface ScheduleViewModeSwitchProps {
	viewMode?: "grid" | "timeline" | "chairs";
	onViewModeChange?: (mode: "grid" | "timeline" | "chairs") => void;
}

export function ScheduleViewModeSwitch({
	viewMode,
	onViewModeChange,
}: ScheduleViewModeSwitchProps) {
	if (!onViewModeChange) return null;

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
					viewMode === "grid" || !viewMode
						? "active font-semibold bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
						: "text-[var(--muted)]"
				}`}
				title="Сетка по кабинетам и креслам"
				aria-label="Сетка по кабинетам"
				aria-pressed={viewMode === "grid" || !viewMode}
				data-testid="schedule-view-mode-grid"
			>
				<LayoutGrid size={13} className="shrink-0 opacity-80" aria-hidden="true" />
				<span className="hidden xl:inline">Сетка</span>
			</button>
			<button
				type="button"
				onClick={() => onViewModeChange("chairs")}
				className={`schedule-view-mode-btn dente-segmented-item h-7 min-h-[26px] max-h-7 sm:h-8 sm:min-h-[32px] sm:max-h-8 rounded-md px-2 text-[12px] font-medium inline-flex items-center gap-1.5 ${
					viewMode === "chairs"
						? "active font-semibold bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
						: "text-[var(--muted)]"
				}`}
				title="Режим расписания по креслам"
				aria-label="По креслам"
				aria-pressed={viewMode === "chairs"}
				data-testid="schedule-view-mode-chairs"
			>
				<Armchair size={13} className="shrink-0 opacity-80" aria-hidden="true" />
				<span className="hidden xl:inline">Кресла</span>
			</button>
		</div>
	);
}
