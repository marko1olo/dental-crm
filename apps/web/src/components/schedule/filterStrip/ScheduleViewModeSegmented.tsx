import { Armchair, LayoutGrid, List } from "lucide-react";
import React from "react";
import type { ReactElement } from "react";
import type { ScheduleFilterStripProps } from "./types";

export interface ScheduleViewModeSegmentedProps {
	scheduleViewMode?: ScheduleFilterStripProps["scheduleViewMode"];
	setScheduleViewMode?: ScheduleFilterStripProps["setScheduleViewMode"];
}

const BTN_BASE = "schedule-view-mode-btn dente-segmented-item h-7 min-h-[26px] max-h-7 sm:h-8 sm:min-h-[32px] sm:max-h-8 rounded-md px-2 text-[12px] font-medium inline-flex items-center gap-1.5";

export function ScheduleViewModeSegmented({
	scheduleViewMode = "timeline",
	setScheduleViewMode,
}: ScheduleViewModeSegmentedProps): ReactElement | null {
	if (!setScheduleViewMode) return null;

	return (
		<div
			className="schedule-view-mode-segmented dente-segmented-bar hidden sm:inline-flex shrink-0 select-none h-8 min-h-[32px] max-h-8 sm:h-9 sm:min-h-[36px] sm:max-h-9 p-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] gap-0.5 items-center"
			role="group"
			aria-label="Режим отображения"
		>
			<button
				type="button"
				onClick={() => setScheduleViewMode("timeline")}
				className={`${BTN_BASE} ${scheduleViewMode === "timeline" ? "active font-semibold" : ""}`}
				title="Лента приемов по дням"
				aria-label="Лента по дням"
				aria-pressed={scheduleViewMode === "timeline"}
				data-testid="schedule-view-mode-timeline"
			>
				<List size={13} className="shrink-0 opacity-80" aria-hidden="true" />
				<span className="hidden 2xl:inline">Лента</span>
			</button>
			<button
				type="button"
				onClick={() => setScheduleViewMode("grid")}
				className={`${BTN_BASE} ${scheduleViewMode === "grid" ? "active font-semibold" : ""}`}
				title="Сетка по кабинетам и креслам"
				aria-label="Сетка по кабинетам"
				aria-pressed={scheduleViewMode === "grid"}
				data-testid="schedule-view-mode-grid"
			>
				<LayoutGrid size={13} className="shrink-0 opacity-80" aria-hidden="true" />
				<span className="hidden 2xl:inline">Сетка</span>
			</button>
			<button
				type="button"
				onClick={() => setScheduleViewMode("chairs")}
				className={`${BTN_BASE} ${scheduleViewMode === "chairs" ? "active font-semibold" : ""}`}
				title="Режим расписания по креслам"
				aria-label="По креслам"
				aria-pressed={scheduleViewMode === "chairs"}
				data-testid="schedule-view-mode-chairs"
			>
				<Armchair size={13} className="shrink-0 opacity-80" aria-hidden="true" />
				<span className="hidden 2xl:inline">Кресла</span>
			</button>
		</div>
	);
}
