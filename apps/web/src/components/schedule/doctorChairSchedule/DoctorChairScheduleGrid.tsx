/**
 * DENTE Dental CRM — Doctor Chair Schedule Grid & Range Timeline (Layer 4)
 *
 * Mode tab switching (Day vs Date Range), visual shift timeline preview (08:00–20:00),
 * and multi-day rotation templates (2/2, 5/2, Full week, Morning/Evening pool).
 */

import React from "react";
import { CalendarRange, Clock } from "lucide-react";
import {
	CHAIR_SHIFT_PRESETS,
	type ChairShiftPresetId,
} from "../chairRosterMath";
import type { RangeRotationPreset, ScheduleModalTab } from "./types";

export interface DoctorChairScheduleGridProps {
	activeTab: ScheduleModalTab;
	onSelectTab: (tab: ScheduleModalTab) => void;
	selectedShiftPreset: ChairShiftPresetId;
	rangeStartDate: string;
	onChangeRangeStartDate: (date: string) => void;
	rangeEndDate: string;
	onChangeRangeEndDate: (date: string) => void;
	rangeRotationPreset: RangeRotationPreset;
	onSelectRangeRotationPreset: (preset: RangeRotationPreset) => void;
}

const ROTATION_TEMPLATES = [
	{ id: "five_day", label: "Пятидневка Пн–Пт", sub: "08:00–20:00" },
	{ id: "two_two", label: "График 2/2", sub: "Чередование" },
	{ id: "full", label: "Каждый день", sub: "Без выходных" },
	{ id: "morning", label: "1 см. 08–14", sub: "Утренний пул" },
	{ id: "evening", label: "2 см. 14–20", sub: "Вечерний пул" },
] as const;

export const DoctorChairScheduleGrid: React.FC<DoctorChairScheduleGridProps> = ({
	activeTab,
	onSelectTab,
	selectedShiftPreset,
	rangeStartDate,
	onChangeRangeStartDate,
	rangeEndDate,
	onChangeRangeEndDate,
	rangeRotationPreset,
	onSelectRangeRotationPreset,
}) => {
	const currentPreset = CHAIR_SHIFT_PRESETS.find((p) => p.id === selectedShiftPreset);
	const startHour = currentPreset?.startHour ?? 8;
	const endHour = currentPreset?.endHour ?? 14;

	// Visual timeline calculation: percentage within 08:00–20:00 (12 hours span)
	const totalSpan = 12; // 8 to 20
	const leftPercent = Math.max(0, Math.min(100, ((startHour - 8) / totalSpan) * 100));
	const widthPercent = Math.max(5, Math.min(100, ((endHour - startHour) / totalSpan) * 100));

	return (
		<div className="space-y-3.5">
			{/* Mode Tabs: Day vs Date Range */}
			<div className="flex p-1 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
				<button
					type="button"
					onClick={() => onSelectTab("day")}
					className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeTab === "day"
							? "bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line,#e2e8f0)]"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
					data-testid="tab-schedule-day"
					style={{ minHeight: "44px" }}
				>
					<Clock size={15} />
					<span>На выбранный день</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab("range")}
					className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeTab === "range"
							? "bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line,#e2e8f0)]"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
					data-testid="tab-schedule-range"
					style={{ minHeight: "44px" }}
				>
					<CalendarRange size={15} />
					<span>На диапазон дат (2/2, 5/2)</span>
				</button>
			</div>

			{/* Visual Shift Timeline Coverage Strip (08:00 - 20:00) */}
			{activeTab === "day" && (
				<div
					className="px-3 py-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-1.5"
					data-testid="chair-shift-visual-timeline"
				>
					<div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted,#64748b)]">
						<span>Таймлайн смены установки:</span>
						<span className="font-bold text-[var(--teal-dark,#0f766e)]">
							{currentPreset?.label || "Смена"} ({currentPreset?.hours || "08:00–14:00"})
						</span>
					</div>
					{/* 12-hour bar track */}
					<div className="relative h-4 rounded-md bg-[var(--line,#e2e8f0)] overflow-hidden">
						{/* Hour dividing markers */}
						<div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-40">
							<span className="w-px h-full bg-[var(--ink,#0f172a)]/20" />
							<span className="w-px h-full bg-[var(--ink,#0f172a)]/20" />
							<span className="w-px h-full bg-[var(--ink,#0f172a)]/20" />
							<span className="w-px h-full bg-[var(--ink,#0f172a)]/20" />
						</div>
						{/* Active shift coverage fill */}
						<div
							className="absolute top-0 bottom-0 bg-[var(--teal,#0d9488)] rounded-xs transition-all duration-200 flex items-center justify-center text-[9px] font-bold text-white shadow-2xs"
							style={{
								left: `${leftPercent}%`,
								width: `${widthPercent}%`,
							}}
							title={`${currentPreset?.hours}`}
						>
							{currentPreset?.hours}
						</div>
					</div>
					<div className="flex justify-between text-[10px] text-[var(--muted,#64748b)] font-mono">
						<span>08:00</span>
						<span>11:00</span>
						<span>14:00</span>
						<span>17:00</span>
						<span>20:00</span>
					</div>
				</div>
			)}

			{/* TAB 2: DATE RANGE & ROTATION TEMPLATES */}
			{activeTab === "range" && (
				<div className="space-y-3.5">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1">
								С даты:
							</label>
							<input
								type="date"
								value={rangeStartDate}
								onChange={(e) => onChangeRangeStartDate(e.target.value)}
								className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)]"
								style={{ minHeight: "44px" }}
							/>
						</div>
						<div>
							<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1">
								По дату:
							</label>
							<input
								type="date"
								value={rangeEndDate}
								onChange={(e) => onChangeRangeEndDate(e.target.value)}
								className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)]"
								style={{ minHeight: "44px" }}
							/>
						</div>
					</div>

					<div>
						<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1.5">
							Шаблон графика:
						</label>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
							{ROTATION_TEMPLATES.map((tpl) => {
								const isSelected = rangeRotationPreset === tpl.id;
								return (
									<button
										key={tpl.id}
										type="button"
										onClick={() => onSelectRangeRotationPreset(tpl.id as RangeRotationPreset)}
										className={`min-h-[44px] p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
											isSelected
												? "border-[var(--teal,#0d9488)] bg-[var(--teal-dark,#0f766e)] text-white shadow-xs font-bold"
												: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]"
										}`}
										style={{ minHeight: "44px" }}
									>
										<span className="text-xs font-bold">{tpl.label}</span>
										<span
											className={`text-[10px] ${
												isSelected ? "text-white/85" : "text-[var(--muted,#64748b)]"
											}`}
										>
											{tpl.sub}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
