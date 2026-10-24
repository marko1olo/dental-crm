import { ShieldAlert, Timer } from "lucide-react";
import React from "react";

interface ClinicSlotAndSanitaryBlockProps {
	currentDuration: number;
	currentBuffer: number;
	onApplyDuration: (mins: number) => void;
	onApplyBuffer: (mins: number) => void;
}

const DURATION_PRESETS = [15, 30, 45, 60] as const;
const BUFFER_PRESETS = [
	{ val: 0, label: "Без буфера (0м)" },
	{ val: 10, label: "10 мин" },
	{ val: 15, label: "15 мин (Санобработка)" },
] as const;

export function ClinicSlotAndSanitaryBlock({
	currentDuration,
	currentBuffer,
	onApplyDuration,
	onApplyBuffer,
}: ClinicSlotAndSanitaryBlockProps) {
	return (
		<div className="pt-3 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1">
						<Timer size={14} className="text-[var(--primary)]" />
						Длительность визита по умолчанию:
					</span>
					<span className="text-xs font-mono font-bold text-[var(--primary)]">
						{currentDuration} мин
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					{DURATION_PRESETS.map((mins) => (
						<button
							key={mins}
							type="button"
							onClick={() => onApplyDuration(mins)}
							className={`flex-1 h-9 min-h-[36px] rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center justify-center ${
								currentDuration === mins
									? "bg-[var(--primary)] text-white border-[var(--primary)]"
									: "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--line)] hover:text-[var(--ink)]"
							}`}
						>
							{mins} мин
						</button>
					))}
				</div>
				<p className="text-[11px] text-[var(--ink-muted)] m-0">
					Базовый слот в расписании при создании новой записи пациента
				</p>
			</div>

			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1">
						<ShieldAlert size={14} className="text-[var(--primary)]" />
						Санитарная обработка кабинета:
					</span>
					<span className="text-xs font-mono font-bold text-[var(--primary)]">
						{currentBuffer > 0 ? `+${currentBuffer} мин` : "0 мин"}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					{BUFFER_PRESETS.map((item) => (
						<button
							key={item.val}
							type="button"
							onClick={() => onApplyBuffer(item.val)}
							className={`flex-1 h-9 min-h-[36px] rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center justify-center ${
								currentBuffer === item.val
									? "bg-[var(--primary)] text-white border-[var(--primary)]"
									: "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--line)] hover:text-[var(--ink)]"
							}`}
						>
							{item.label}
						</button>
					))}
				</div>
				<p className="text-[11px] text-[var(--ink-muted)] m-0">
					Автоматический перерыв между приёмами для дезинфекции установки и проветривания
				</p>
			</div>
		</div>
	);
}
