import React from "react";
import { Clock } from "lucide-react";
import { RESORPTION_AGE_PRESETS } from "./pediatricResorptionConstants";

export interface PediatricResorptionHeaderProps {
	readonly currentAge: number;
	readonly stageNameRu: string;
	readonly onAgeChange: (newAge: number) => void;
}

export const PediatricResorptionHeader: React.FC<PediatricResorptionHeaderProps> = ({
	currentAge,
	stageNameRu,
	onAgeChange,
}) => {
	return (
		<div className="p-4 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div>
					<h3 className="text-sm sm:text-base font-black text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100">
						Клиническая шкала физиологической резорбции корней молочных зубов
					</h3>
					<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 leading-relaxed font-medium mt-0.5">
						Оценка степени рассасывания корней под давлением зачатка постоянного зуба (пресет нормы по возрасту).
					</p>
				</div>

				<div className="inline-flex items-center gap-2 min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[var(--teal-surface,rgba(20,184,166,0.12))] text-[var(--teal,#0d9488)] dark:text-teal-400 border border-[var(--teal-glow,rgba(20,184,166,0.25))] text-xs sm:text-sm font-bold shrink-0">
					<Clock className="w-4 h-4 shrink-0" />
					<span>Возраст: {currentAge.toFixed(1)} лет ({stageNameRu})</span>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800/80">
				<span className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 mr-1">
					Возрастной ориентир:
				</span>
				{RESORPTION_AGE_PRESETS.map((preset) => {
					const isSelected =
						(preset.id === "primary" && currentAge < 5.8) ||
						(preset.id === "early_mixed" && currentAge >= 5.8 && currentAge < 8.5) ||
						(preset.id === "late_mixed" && currentAge >= 8.5);
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onAgeChange(preset.targetAge)}
							className={`min-h-[44px] sm:min-h-[32px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer select-none active:scale-95 flex items-center gap-1.5 ${
								isSelected
									? "bg-teal-600 dark:bg-teal-600 text-white font-black border-teal-600 shadow-sm shadow-teal-600/30 ring-2 ring-teal-500/20"
									: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-800 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-200 border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-700 hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-700"
							}`}
							title={preset.descriptionRu}
						>
							<span>{preset.label}</span>
							<span className="opacity-80 font-normal">({preset.ageRange})</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
