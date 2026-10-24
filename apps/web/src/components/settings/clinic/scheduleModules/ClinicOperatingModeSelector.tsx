import React from "react";

interface ClinicOperatingModeSelectorProps {
	mode?: string;
	onSelectMode: (mode: string) => void;
}

const MODES = [
	{
		value: "solo_doctor",
		title: "Частный кабинет / Соло-врач",
		desc: "1–2 кресла, субаренда или кабинет без обязательного ассистента",
	},
	{
		value: "small_clinic",
		title: "Стандартная клиника",
		desc: "3–5 кресел, сменные ассистенты и администратор на ресепшене",
	},
] as const;

export function ClinicOperatingModeSelector({
	mode,
	onSelectMode,
}: ClinicOperatingModeSelectorProps) {
	return (
		<div>
			<span className="text-xs font-semibold text-[var(--ink-muted)] block mb-2">
				Режим приёма в клинике:
			</span>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{MODES.map((opt) => {
					const isSelected = mode === opt.value;
					return (
						<button
							key={opt.value}
							type="button"
							onClick={() => onSelectMode(opt.value)}
							className={`rounded-xl border text-left transition-all cursor-pointer overflow-hidden flex flex-col ${
								isSelected
									? "bg-[var(--paper)] border-2 border-[var(--primary)] text-[var(--ink)] shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink-muted)] hover:border-[var(--line-strong)]"
							}`}
						>
							<div className="px-3.5 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2 w-full">
								<strong className="text-xs font-bold text-[var(--ink)]">{opt.title}</strong>
								{isSelected && (
									<span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--primary)] text-white shrink-0">
										Активен
									</span>
								)}
							</div>
							<div className="px-3.5 py-2.5 text-xs text-[var(--ink-muted)] leading-relaxed w-full">
								{opt.desc}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
