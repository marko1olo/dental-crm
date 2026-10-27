import React from "react";
import { Filter, Scan } from "lucide-react";
import {
	TIMELINE_DATE_PRESETS,
	type TimelineDatePreset,
} from "./types";
import { TimelineDropdownFilters } from "./TimelineDropdownFilters";

export interface PatientTimelineFiltersProps {
	readonly filteredCount: number;
	readonly selectedDatePreset: TimelineDatePreset;
	readonly onSelectDatePreset: (preset: TimelineDatePreset) => void;
	readonly selectedDateFilter: string;
	readonly onSelectDateFilter: (date: string) => void;
	readonly availableDates: readonly string[];
	readonly selectedToothFilter: string;
	readonly onSelectToothFilter: (tooth: string) => void;
	readonly availableTeeth: readonly string[];
	readonly selectedModalityFilter: string;
	readonly onSelectModalityFilter: (modality: string) => void;
	readonly onOpenTactileSearch?: (() => void) | undefined;
}

export const PatientTimelineFilters: React.FC<PatientTimelineFiltersProps> = ({
	filteredCount,
	selectedDatePreset,
	onSelectDatePreset,
	selectedDateFilter,
	onSelectDateFilter,
	availableDates,
	selectedToothFilter,
	onSelectToothFilter,
	availableTeeth,
	selectedModalityFilter,
	onSelectModalityFilter,
	onOpenTactileSearch,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-[#0d1627] border-b border-[#1e2d47] text-xs shrink-0">
			<div className="flex items-center gap-2.5 flex-wrap">
				<div className="flex items-center gap-1.5 font-bold text-emerald-400">
					<Scan className="w-4 h-4 text-[#00C853]" />
					<span className="tracking-wide">ТАЙМЛАЙН</span>
					<span className="text-slate-400 font-normal">({filteredCount})</span>
				</div>

				<div className="flex items-center gap-0.5 p-0.5 bg-[#080d18] rounded-lg border border-[#1e2d47]" data-testid="timeline-date-presets-bar">
					{TIMELINE_DATE_PRESETS.map((preset) => (
						<button
							key={preset.id}
							type="button"
							onClick={() => {
								onSelectDatePreset(preset.id);
								if (preset.id !== "all") onSelectDateFilter("all");
							}}
							className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
								selectedDatePreset === preset.id
									? "bg-[#00C853] text-[#012812] font-black shadow-xs"
									: "text-slate-400 hover:text-white hover:bg-[#131f33]"
							}`}
							data-testid={`timeline-date-preset-${preset.id}`}
						>
							{preset.label}
						</button>
					))}
				</div>

				<TimelineDropdownFilters
					selectedDateFilter={selectedDateFilter}
					onSelectDateFilter={onSelectDateFilter}
					availableDates={availableDates}
					selectedDatePreset={selectedDatePreset}
					onSelectDatePreset={onSelectDatePreset}
					selectedToothFilter={selectedToothFilter}
					onSelectToothFilter={onSelectToothFilter}
					availableTeeth={availableTeeth}
					selectedModalityFilter={selectedModalityFilter}
					onSelectModalityFilter={onSelectModalityFilter}
				/>
			</div>

			{onOpenTactileSearch && (
				<button
					type="button"
					onClick={onOpenTactileSearch}
					className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-bold rounded-lg bg-[#2E8B57] hover:bg-[#237A4B] text-white shadow-xs active:scale-95 transition-all cursor-pointer"
					data-testid="btn-timeline-open-tactile-search"
					title="Открыть тактильную матрицу поиска исследований (Аппарат + Период)"
				>
					<Filter className="w-3.5 h-3.5" />
					<span>Матрица поиска</span>
				</button>
			)}
		</div>
	);
};
