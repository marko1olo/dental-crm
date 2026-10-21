import { Calendar, Clock, Moon, Sun, Zap } from "lucide-react";
import React from "react";
import type { ScheduleChair } from "../ScheduleFilterStrip";

export type ShiftPresetType =
	| "morning"
	| "morning_9"
	| "evening"
	| "evening_15"
	| "full"
	| "full_9_21"
	| "2x2"
	| "even_odd";

export interface ChairShiftPresetsGridProps {
	chair: ScheduleChair;
	handleAssignShift: (chair: ScheduleChair, preset: ShiftPresetType) => void;
}

export function ChairShiftPresetsGrid({
	chair,
	handleAssignShift,
}: ChairShiftPresetsGridProps) {
	return (
		<div className="flex flex-col gap-1 border-t border-[var(--line)] pt-2">
			<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
				Шаблоны смен:
			</span>
			<div className="grid grid-cols-2 gap-1.5">
				<button
					type="button"
					onClick={() => handleAssignShift(chair, "morning")}
					className="px-2 py-1.5 rounded-xl border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
					data-testid={`chair-view-shift-morning-${chair.id}`}
				>
					<Sun size={12} className="text-amber-500 shrink-0" />
					<span>Утро 08-14</span>
				</button>
				<button
					type="button"
					onClick={() => handleAssignShift(chair, "morning_9")}
					className="px-2 py-1.5 rounded-xl border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
					data-testid={`chair-view-shift-morning-9-${chair.id}`}
				>
					<Sun size={12} className="text-amber-500 shrink-0" />
					<span>1 см. 09-15</span>
				</button>
				<button
					type="button"
					onClick={() => handleAssignShift(chair, "evening")}
					className="px-2 py-1.5 rounded-xl border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
					data-testid={`chair-view-shift-evening-${chair.id}`}
				>
					<Moon size={12} className="text-indigo-400 shrink-0" />
					<span>Вечер 14-20</span>
				</button>
				<button
					type="button"
					onClick={() => handleAssignShift(chair, "evening_15")}
					className="px-2 py-1.5 rounded-xl border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
					data-testid={`chair-view-shift-evening-15-${chair.id}`}
				>
					<Moon size={12} className="text-indigo-400 shrink-0" />
					<span>2 см. 15-21</span>
				</button>
				<button
					type="button"
					onClick={() => handleAssignShift(chair, "full")}
					className="px-2 py-1.5 rounded-xl border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
					data-testid={`chair-view-shift-full-${chair.id}`}
				>
					<Clock size={12} className="text-[var(--teal)] shrink-0" />
					<span>Весь день 08-20</span>
				</button>
				<button
					type="button"
					onClick={() => handleAssignShift(chair, "full_9_21")}
					className="px-2 py-1.5 rounded-xl border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
					data-testid={`chair-view-shift-full-9-21-${chair.id}`}
				>
					<Clock size={12} className="text-[var(--teal)] shrink-0" />
					<span>Весь день 09-21</span>
				</button>
				<button
					type="button"
					onClick={() => handleAssignShift(chair, "2x2")}
					className="px-2 py-1.5 rounded-xl border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
					data-testid={`chair-view-shift-2x2-${chair.id}`}
				>
					<Calendar size={12} className="text-emerald-500 shrink-0" />
					<span>2 через 2</span>
				</button>
				<button
					type="button"
					onClick={() => handleAssignShift(chair, "even_odd")}
					className="px-2 py-1.5 rounded-xl border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer col-span-2 active:scale-95"
					data-testid={`chair-view-shift-even-odd-${chair.id}`}
					title="Чётные/Нечётные дни месяца"
				>
					<Zap size={12} className="text-amber-500 shrink-0" />
					<span>Чет/Нечет</span>
				</button>
			</div>
		</div>
	);
}
