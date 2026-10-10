import React from "react";
import {
	Activity,
	Check,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";

export interface PediatricQuickProtocolsProps {
	onApplyPrimaryNorm: () => void;
	onApplyFirstMolarNorm: () => void;
	onApplyEarlyMixedNorm: () => void;
	onApplyPermanentNorm: () => void;
	onApplyProcedurePreset: (presetId: "saforide" | "fissurit" | "pulpotec") => void;
	onInsertCariogramTo043: () => void;
}

export const PediatricQuickProtocols: React.FC<PediatricQuickProtocolsProps> = ({
	onApplyPrimaryNorm,
	onApplyFirstMolarNorm,
	onApplyEarlyMixedNorm,
	onApplyPermanentNorm,
	onApplyProcedurePreset,
	onInsertCariogramTo043,
}) => {
	return (
		<div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent border border-teal-500/30 space-y-2.5 shadow-xs">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<Zap className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300">
						Клинические Протоколы &amp; Физиологическая Норма
					</span>
				</div>
				<span className="text-[11px] font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
					Клинические стандарты • Готовый дневник приёма
				</span>
			</div>

			{/* Quick Action Buttons Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
				{/* 1. 3 года: Временный прикус — норма */}
				<button
					type="button"
					onClick={onApplyPrimaryNorm}
					className="min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Установить норму временного прикуса (3 года): 20 интактных молочных зубов (51–85), кариеса нет, резорбция 0%"
					data-testid="pediatric-preset-3y-btn"
				>
					<div className="min-w-0">
						<div className="font-extrabold text-emerald-700 dark:text-emerald-400 truncate">
							3 года: Молочный прикус
						</div>
						<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
							51–85 интактны, 0% резорбция
						</div>
					</div>
					<Check className="w-4 h-4 text-emerald-600 shrink-0" />
				</button>

				{/* 2. 6 лет: Первый моляр — норма */}
				<button
					type="button"
					onClick={onApplyFirstMolarNorm}
					className="min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Установить норму (6 лет): прорезывание первых моляров (16, 26, 36, 46) + 20 молочных зубов"
					data-testid="pediatric-preset-6y-btn"
				>
					<div className="min-w-0">
						<div className="font-extrabold text-cyan-700 dark:text-cyan-400 truncate">
							6 лет: Первый моляр
						</div>
						<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
							16, 26, 36, 46 + 20 молочных
						</div>
					</div>
					<Check className="w-4 h-4 text-cyan-600 shrink-0" />
				</button>

				{/* 3. 9 лет: Сменный прикус — норма */}
				<button
					type="button"
					onClick={onApplyEarlyMixedNorm}
					className="min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-teal-500/40 hover:border-teal-500 hover:bg-teal-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Установить норму сменного прикуса (9 лет): резцы 11..42, моляры 16..46, молочные 53..85"
					data-testid="pediatric-preset-9y-btn"
				>
					<div className="min-w-0">
						<div className="font-extrabold text-teal-700 dark:text-teal-400 truncate">
							9 лет: Сменный прикус
						</div>
						<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
							Резцы 11..42, 1-е мол., мол. 53..85
						</div>
					</div>
					<Check className="w-4 h-4 text-teal-600 shrink-0" />
				</button>

				{/* 4. 12 лет: Постоянный прикус — норма */}
				<button
					type="button"
					onClick={onApplyPermanentNorm}
					className="min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Установить норму постоянного прикуса (12 лет): 28 постоянных зубов 17..27, 47..37 без 8-ок"
					data-testid="pediatric-preset-12y-btn"
				>
					<div className="min-w-0">
						<div className="font-extrabold text-blue-700 dark:text-blue-400 truncate">
							12 лет: Постоянный прикус
						</div>
						<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
							28 зубов (17..27, 47..37)
						</div>
					</div>
					<Check className="w-4 h-4 text-blue-600 shrink-0" />
				</button>

				{/* 5. Серебрение Saforide (A16.07.057) */}
				<button
					type="button"
					onClick={() => onApplyProcedurePreset("saforide")}
					className="min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Клинический протокол: A16.07.057 Серебрение эмали Saforide 38% (51, 52, 61, 62)"
					data-testid="pediatric-preset-saforide-btn"
				>
					<div className="min-w-0">
						<div className="font-extrabold text-amber-700 dark:text-amber-400 truncate">
							Saforide (A16.07.057)
						</div>
						<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
							Серебрение резцов 51, 52, 61, 62
						</div>
					</div>
					<Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
				</button>

				{/* 6. Герметизация фиссур Fissurit (A16.07.050) */}
				<button
					type="button"
					onClick={() => onApplyProcedurePreset("fissurit")}
					className="min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-sky-500/40 hover:border-sky-500 hover:bg-sky-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Клинический протокол: A16.07.050 Запечатывание фиссур Fissurit FX (16, 26, 36, 46)"
					data-testid="pediatric-preset-fissurit-btn"
				>
					<div className="min-w-0">
						<div className="font-extrabold text-sky-700 dark:text-sky-400 truncate">
							Fissurit FX (A16.07.050)
						</div>
						<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
							Герметизация моляров 16, 26, 36, 46
						</div>
					</div>
					<ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
				</button>

				{/* 7. Витальная пульпотомия Pulpotec (A16.07.009) */}
				<button
					type="button"
					onClick={() => onApplyProcedurePreset("pulpotec")}
					className="min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-rose-500/40 hover:border-rose-500 hover:bg-rose-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
					title="Клинический протокол: A16.07.009 Пульпотомия (ампутация пульпы) препаратом Pulpotec"
					data-testid="pediatric-preset-pulpotec-btn"
				>
					<div className="min-w-0">
						<div className="font-extrabold text-rose-700 dark:text-rose-400 truncate">
							Pulpotec (A16.07.009)
						</div>
						<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
							Пульпотомия мол. моляра 54
						</div>
					</div>
					<Activity className="w-4 h-4 text-rose-600 shrink-0" />
				</button>

				{/* 8. Вставить протокол в медицинскую карту */}
				<button
					type="button"
					onClick={onInsertCariogramTo043}
					className="min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-sm text-left"
					title="Мгновенно перенести текущий протокол, Cariogram и поведение по Франклу в дневник приёма"
					data-testid="pediatric-preset-insert-043-btn"
				>
					<div className="min-w-0">
						<div className="font-extrabold truncate">
							В карту
						</div>
						<div className="text-[10px] text-teal-100 truncate">
							Перенос протокола и статуса
						</div>
					</div>
					<Zap className="w-4 h-4 text-amber-300 shrink-0" />
				</button>
			</div>
		</div>
	);
};
