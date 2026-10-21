import React from "react";
import type { DateRangeShiftPreset } from "../roster/DoctorShiftRosterModal";

export const CHAIR_DATE_RANGE_PRESETS = [
	{ id: "morning", label: "1 см. 08-14" },
	{ id: "morning_9", label: "1 см. 09-15" },
	{ id: "evening", label: "2 см. 14-20" },
	{ id: "evening_15", label: "2 см. 15-21" },
	{ id: "full", label: "Весь день (08-20)" },
	{ id: "two_two", label: "2/2 (08-20)" },
	{ id: "five_day", label: "Пятидневка Пн–Пт" },
] as const;

export interface ChairDateRangePresetsProps {
	rangePreset: DateRangeShiftPreset;
	setRangePreset: (preset: DateRangeShiftPreset) => void;
}

export function ChairDateRangePresets({
	rangePreset,
	setRangePreset,
}: ChairDateRangePresetsProps) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]">
				Смена / график:
			</span>
			<div className="flex flex-wrap gap-1.5">
				{CHAIR_DATE_RANGE_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						data-testid={`chair-range-modal-preset-${preset.id}`}
						onClick={() => setRangePreset(preset.id as DateRangeShiftPreset)}
						className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center justify-center active:scale-95 ${
							rangePreset === preset.id
								? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold"
								: "bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal)]"
						}`}
					>
						{preset.label}
					</button>
				))}
			</div>
		</div>
	);
}
