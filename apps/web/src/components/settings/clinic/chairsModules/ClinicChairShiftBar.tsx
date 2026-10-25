import React from "react";
import type { InputChangeEvent } from "./clinicChairsTypes";

interface ClinicChairShiftBarProps {
	chairId: string;
	start: string;
	end: string;
	updateChairScheduleDraft: (chairId: string, patch: { start?: string; end?: string }) => void;
	showToast: (message: string, variant?: "info" | "success" | "error" | "warning") => void;
}

export const ClinicChairShiftBar: React.FC<ClinicChairShiftBarProps> = ({
	chairId,
	start,
	end,
	updateChairScheduleDraft,
	showToast,
}) => {
	const applyChairShift = (newStart: string, newEnd: string, shiftName: string) => {
		updateChairScheduleDraft(chairId, { start: newStart, end: newEnd });
		showToast(`Установлена смена кресла: ${shiftName} (${newStart}–${newEnd})`, "info");
	};

	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[11px] text-[var(--muted)] font-semibold">Смена:</span>
				<button
					type="button"
					className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer inline-flex items-center"
					onClick={() => applyChairShift("08:00", "14:00", "1-я смена")}
				>
					08:00–14:00 (1-я)
				</button>
				<button
					type="button"
					className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer inline-flex items-center"
					onClick={() => applyChairShift("14:00", "20:00", "2-я смена")}
				>
					14:00–20:00 (2-я)
				</button>
				<button
					type="button"
					className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer inline-flex items-center"
					onClick={() => applyChairShift("08:00", "21:00", "Весь день")}
				>
					08:00–21:00 (День)
				</button>
			</div>

			<div className="flex items-center gap-2 text-xs">
				<label className="flex items-center gap-1 text-[var(--ink)] font-medium">
					<span>С:</span>
					<input
						type="time"
						value={start}
						onChange={(event: InputChangeEvent) =>
							updateChairScheduleDraft(chairId, {
								start: event.target.value,
							})
						}
						className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/40"
					/>
				</label>
				<label className="flex items-center gap-1 text-[var(--ink)] font-medium">
					<span>До:</span>
					<input
						type="time"
						value={end}
						onChange={(event: InputChangeEvent) =>
							updateChairScheduleDraft(chairId, {
								end: event.target.value,
							})
						}
						className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/40"
					/>
				</label>
			</div>
		</div>
	);
};
