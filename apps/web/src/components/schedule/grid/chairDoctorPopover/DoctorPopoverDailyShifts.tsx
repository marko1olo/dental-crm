/**
 * DoctorPopoverDailyShifts.tsx — Daily single-shift buttons inside chair popover.
 */

import React from "react";
import { Building2, Moon, Sun } from "lucide-react";
import type { ShiftPresetType } from "./chairDoctorPopoverTypes";

interface DoctorPopoverDailyShiftsProps {
	chair: { id: string; name: string };
	targetDocId: string;
	onAssign: (chairId: string, docId: string, preset: ShiftPresetType) => void;
	onClose: () => void;
}

export function DoctorPopoverDailyShifts({
	chair,
	targetDocId,
	onAssign,
	onClose,
}: DoctorPopoverDailyShiftsProps) {
	const handleSelect = (preset: ShiftPresetType) => {
		if (targetDocId) {
			onAssign(chair.id, targetDocId, preset);
		}
		onClose();
	};

	return (
		<>
			<button
				type="button"
				onClick={() => handleSelect("morning")}
				className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
				style={{ minHeight: "44px" }}
				title="Утро 08:00–14:00"
				aria-label={`Назначить утреннюю смену 08:00–14:00 на кресло ${chair.name}`}
				data-testid={`chair-popover-shift-morning-${chair.id}`}
			>
				<Sun size={15} className="text-amber-500 shrink-0" aria-hidden="true" />
				<span className="truncate">Утро 08:00–14:00</span>
			</button>
			<button
				type="button"
				onClick={() => handleSelect("morning_9")}
				className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
				style={{ minHeight: "44px" }}
				title="1 смена: 09:00–15:00"
				aria-label={`Назначить 1 смену 09:00–15:00 на кресло ${chair.name}`}
				data-testid={`chair-popover-shift-morning-9-${chair.id}`}
			>
				<Sun size={15} className="text-amber-600 shrink-0" aria-hidden="true" />
				<span className="truncate">1 см. 09:00–15:00</span>
			</button>
			<button
				type="button"
				onClick={() => handleSelect("evening")}
				className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
				style={{ minHeight: "44px" }}
				title="Вечер 14:00–20:00"
				aria-label={`Назначить вечернюю смену 14:00–20:00 на кресло ${chair.name}`}
				data-testid={`chair-popover-shift-evening-${chair.id}`}
			>
				<Moon size={15} className="text-indigo-400 shrink-0" aria-hidden="true" />
				<span className="truncate">Вечер 14:00–20:00</span>
			</button>
			<button
				type="button"
				onClick={() => handleSelect("evening_15")}
				className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
				style={{ minHeight: "44px" }}
				title="2 смена: 15:00–21:00"
				aria-label={`Назначить смену 15:00–21:00 на кресло ${chair.name}`}
				data-testid={`chair-popover-shift-evening-15-${chair.id}`}
			>
				<Moon size={15} className="text-indigo-500 shrink-0" aria-hidden="true" />
				<span className="truncate">2 см. 15:00–21:00</span>
			</button>
			<button
				type="button"
				onClick={() => handleSelect("full")}
				className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
				style={{ minHeight: "44px" }}
				title="Весь день 08:00–20:00"
				aria-label={`Назначить смену на весь день 08:00–20:00 на кресло ${chair.name}`}
				data-testid={`chair-popover-shift-full-${chair.id}`}
			>
				<Building2 size={15} className="text-[var(--teal)] shrink-0" aria-hidden="true" />
				<span className="truncate">Весь день 08:00–20:00</span>
			</button>
			<button
				type="button"
				onClick={() => handleSelect("full_9_21")}
				className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
				style={{ minHeight: "44px" }}
				title="Весь день 09:00–21:00"
				aria-label={`Назначить смену на весь день 09:00–21:00 на кресло ${chair.name}`}
				data-testid={`chair-popover-shift-full-9-21-${chair.id}`}
			>
				<Building2 size={15} className="text-[var(--teal)] shrink-0" aria-hidden="true" />
				<span className="truncate">Весь день 09:00–21:00</span>
			</button>
		</>
	);
}
