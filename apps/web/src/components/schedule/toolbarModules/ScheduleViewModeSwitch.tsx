/**
 * DENTE Dental CRM — Schedule View Mode Segmented Control (SSOT)
 * Apple HIG Segmented Bar for schedule views: [ Лента | Сетка | Кабинеты ]
 * Mandate 8am (Strict Button Hierarchy & Tokens), Mandate 8d (Zero-Clipping).
 */

import React from "react";
import { Armchair, LayoutGrid, List } from "lucide-react";

export type ScheduleViewMode = "timeline" | "grid" | "chairs";

export interface ScheduleViewModeSwitchProps {
	viewMode?: ScheduleViewMode | undefined;
	onViewModeChange?: ((mode: ScheduleViewMode) => void) | undefined;
}

export function ScheduleViewModeSwitch({
	viewMode = "grid",
	onViewModeChange,
}: ScheduleViewModeSwitchProps) {
	if (!onViewModeChange) return null;

	const isTimelineActive = viewMode === "timeline";
	const isGridActive = viewMode === "grid" || !viewMode;
	const isChairsActive = viewMode === "chairs";

	return (
		<div
			className="schedule-view-mode-segmented dente-segmented-bar hidden sm:inline-flex shrink-0 select-none h-8 min-h-[32px] max-h-8 sm:h-9 sm:min-h-[36px] sm:max-h-9 p-0.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] gap-0.5 items-center shadow-2xs"
			role="group"
			aria-label="Режим отображения расписания"
			data-testid="schedule-view-mode-segmented-control"
		>
			<button
				type="button"
				onClick={() => onViewModeChange("timeline")}
				className={`schedule-view-mode-btn dente-segmented-item h-7 min-h-[26px] max-h-7 sm:h-8 sm:min-h-[32px] sm:max-h-8 rounded-lg px-2.5 text-[12px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none ${
					isTimelineActive
						? "active font-semibold bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line-subtle,var(--line))]"
						: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
				}`}
				title="Лента приемов по дням (День)"
				aria-label="Лента приёмов"
				aria-pressed={isTimelineActive}
				data-testid="schedule-view-mode-timeline"
			>
				<List size={13} className="shrink-0 opacity-80" aria-hidden="true" />
				<span className="font-medium">Лента</span>
			</button>

			<button
				type="button"
				onClick={() => onViewModeChange("grid")}
				className={`schedule-view-mode-btn dente-segmented-item h-7 min-h-[26px] max-h-7 sm:h-8 sm:min-h-[32px] sm:max-h-8 rounded-lg px-2.5 text-[12px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none ${
					isGridActive
						? "active font-semibold bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line-subtle,var(--line))]"
						: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
				}`}
				title="Сетка приемов по времени и креслам (Неделя)"
				aria-label="Сетка расписания"
				aria-pressed={isGridActive}
				data-testid="schedule-view-mode-grid"
			>
				<LayoutGrid size={13} className="shrink-0 opacity-80" aria-hidden="true" />
				<span className="font-medium">Сетка</span>
			</button>

			<button
				type="button"
				onClick={() => onViewModeChange("chairs")}
				className={`schedule-view-mode-btn dente-segmented-item h-7 min-h-[26px] max-h-7 sm:h-8 sm:min-h-[32px] sm:max-h-8 rounded-lg px-2.5 text-[12px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none ${
					isChairsActive
						? "active font-semibold bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line-subtle,var(--line))]"
						: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
				}`}
				title="Обзор кабинетов и стоматологических кресел (Кабинеты)"
				aria-label="Кабинеты и кресла"
				aria-pressed={isChairsActive}
				data-testid="schedule-view-mode-chairs"
			>
				<Armchair size={13} className="shrink-0 opacity-80" aria-hidden="true" />
				<span className="font-medium">Кабинеты</span>
			</button>
		</div>
	);
}

export default ScheduleViewModeSwitch;
