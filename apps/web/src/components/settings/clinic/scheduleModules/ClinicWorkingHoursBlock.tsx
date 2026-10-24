import React from "react";

interface ClinicWorkingHoursBlockProps {
	start: string;
	end: string;
	onStartChange: (val: string) => void;
	onEndChange: (val: string) => void;
	onApplyPreset: (start: string, end: string, label: string) => void;
}

export function ClinicWorkingHoursBlock({
	start,
	end,
	onStartChange,
	onEndChange,
	onApplyPreset,
}: ClinicWorkingHoursBlockProps) {
	return (
		<div className="space-y-2">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<span className="text-xs font-semibold text-[var(--ink-muted)]">
					Часы работы клиники:
				</span>
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-[11px] text-[var(--ink-muted)]">Быстрый выбор:</span>
					<button
						type="button"
						onClick={() => onApplyPreset("08:00", "20:00", "08:00–20:00")}
						className="px-3 h-9 min-h-[36px] rounded-xl text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer inline-flex items-center"
					>
						08:00–20:00
					</button>
					<button
						type="button"
						onClick={() => onApplyPreset("08:00", "21:00", "08:00–21:00")}
						className="px-3 h-9 min-h-[36px] rounded-xl text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer inline-flex items-center"
					>
						08:00–21:00
					</button>
					<button
						type="button"
						onClick={() => onApplyPreset("09:00", "21:00", "09:00–21:00")}
						className="px-3 h-9 min-h-[36px] rounded-xl text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer inline-flex items-center"
					>
						09:00–21:00
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink)]">
					<span>Открытие (начало приёма)</span>
					<input
						type="time"
						value={start}
						onChange={(e) => onStartChange(e.target.value)}
						className="px-3 h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm font-semibold text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
					/>
				</label>

				<label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink)]">
					<span>Закрытие (окончание смены)</span>
					<input
						type="time"
						value={end}
						onChange={(e) => onEndChange(e.target.value)}
						className="px-3 h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm font-semibold text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
					/>
				</label>
			</div>
		</div>
	);
}
