import React from "react";
import { FDI_TEETH_LIST } from "./types";

export interface TimelineDropdownFiltersProps {
	selectedDateFilter: string;
	onSelectDateFilter: (date: string) => void;
	availableDates: readonly string[];
	selectedDatePreset: string;
	onSelectDatePreset: (preset: any) => void;
	selectedToothFilter: string;
	onSelectToothFilter: (tooth: string) => void;
	availableTeeth: readonly string[];
	selectedModalityFilter: string;
	onSelectModalityFilter: (modality: string) => void;
}

export const TimelineDropdownFilters: React.FC<TimelineDropdownFiltersProps> = ({
	selectedDateFilter,
	onSelectDateFilter,
	availableDates,
	onSelectDatePreset,
	selectedToothFilter,
	onSelectToothFilter,
	availableTeeth,
	selectedModalityFilter,
	onSelectModalityFilter,
}) => {
	return (
		<>
			<div className="flex items-center gap-1 text-slate-300">
				<span className="text-[#00C853] font-black">●</span>
				<span className="font-semibold text-slate-300">Дата:</span>
				<select
					value={selectedDateFilter}
					onChange={(e) => {
						onSelectDateFilter(e.target.value);
						if (e.target.value !== "all") onSelectDatePreset("all");
					}}
					className="h-7 px-2 rounded-md bg-[#131f33] border border-[#233554] text-white text-xs outline-none cursor-pointer hover:border-emerald-500"
					data-testid="timeline-date-filter"
				>
					<option value="all">Все даты</option>
					{availableDates.map((dateStr) => (
						<option key={dateStr} value={dateStr}>
							{dateStr}
						</option>
					))}
				</select>
			</div>

			<div className="flex items-center gap-1 text-slate-300">
				<span className="text-[#00C853] font-black">●</span>
				<span className="font-semibold text-slate-300">Зуб:</span>
				<select
					value={selectedToothFilter}
					onChange={(e) => onSelectToothFilter(e.target.value)}
					className="h-7 px-2 rounded-md bg-[#131f33] border border-[#233554] text-white text-xs outline-none cursor-pointer hover:border-emerald-500"
					data-testid="timeline-tooth-filter"
				>
					<option value="all">Все зубы</option>
					{FDI_TEETH_LIST.map((tooth) => (
						<option key={tooth} value={tooth}>
							#{tooth} {availableTeeth.includes(tooth) ? "● (есть)" : ""}
						</option>
					))}
				</select>
			</div>

			<div className="flex items-center gap-1 text-slate-300">
				<span className="text-[#00C853] font-black">●</span>
				<span className="font-semibold text-slate-300">Режим:</span>
				<select
					value={selectedModalityFilter}
					onChange={(e) => onSelectModalityFilter(e.target.value)}
					className="h-7 px-2 rounded-md bg-[#131f33] border border-[#233554] text-white text-xs outline-none cursor-pointer hover:border-emerald-500"
					data-testid="timeline-modality-filter"
				>
					<option value="all">Все режимы</option>
					<option value="io">IO-сенсор (RVG)</option>
					<option value="opg">Панорама (ОПТГ)</option>
					<option value="cbct">КТ 3D (КЛКТ)</option>
					<option value="ceph">Цефалостат (ТРГ)</option>
					<option value="camera">IO-камера (Видео)</option>
					<option value="other">Другое (TWAIN/Фото)</option>
				</select>
			</div>
		</>
	);
};
