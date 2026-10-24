import React from "react";

type WeekdayOption = { value: number; label: string };

interface ClinicWorkingDaysBlockProps {
	currentDays: number[];
	typedWeekdayOptions: WeekdayOption[];
	onToggleDay: (day: number) => void;
	onApplyPreset: (days: number[], label: string) => void;
}

export function ClinicWorkingDaysBlock({
	currentDays,
	typedWeekdayOptions,
	onToggleDay,
	onApplyPreset,
}: ClinicWorkingDaysBlockProps) {
	return (
		<div className="space-y-2">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<span className="text-xs font-semibold text-[var(--ink-muted)]">
					Рабочие дни недели:
				</span>
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-[11px] text-[var(--ink-muted)]">Пресеты:</span>
					<button
						type="button"
						onClick={() => onApplyPreset([1, 2, 3, 4, 5], "Пн–Пт")}
						className="px-3 h-9 min-h-[36px] rounded-xl text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer inline-flex items-center"
					>
						Пн–Пт
					</button>
					<button
						type="button"
						onClick={() => onApplyPreset([1, 2, 3, 4, 5, 6], "Пн–Сб")}
						className="px-3 h-9 min-h-[36px] rounded-xl text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer inline-flex items-center"
					>
						Пн–Сб
					</button>
					<button
						type="button"
						onClick={() => onApplyPreset([1, 2, 3, 4, 5, 6, 7], "Без выходных")}
						className="px-3 h-9 min-h-[36px] rounded-xl text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer inline-flex items-center"
					>
						Все 7 дней
					</button>
				</div>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Рабочие дни клиники">
				{typedWeekdayOptions.map((day) => {
					const isActive = currentDays.includes(day.value);
					return (
						<button
							key={day.value}
							type="button"
							onClick={() => onToggleDay(day.value)}
							aria-pressed={isActive}
							className={`h-9 min-h-[36px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border inline-flex items-center justify-center ${
								isActive
									? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--line)] hover:border-[var(--line-strong)]"
							}`}
						>
							{day.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
