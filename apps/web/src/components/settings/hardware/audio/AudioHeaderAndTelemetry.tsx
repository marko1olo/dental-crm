import React from "react";
import { Activity, Mic, Zap } from "lucide-react";

export const AudioHeaderAndTelemetry: React.FC = () => {
	return (
		<>
			<div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 rounded-xl bg-[var(--teal-surface)] text-[var(--teal)] flex items-center justify-center shrink-0">
						<Mic size={18} />
					</div>
					<div>
						<h3 className="text-sm font-bold text-[var(--ink)] m-0">Аудиосистема клиники и Web Audio DSP</h3>
						<p className="text-xs text-[var(--muted)] m-0">
							Процедурная обратная связь, микрофоны кабинетов и фильтрация шума турбин
						</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
							<Zap size={16} />
						</div>
						<div>
							<span className="text-xs font-bold text-[var(--ink)] block">Процедурный DSP движок</span>
							<span className="text-[11px] text-[var(--muted)]">Web Audio API • 0 KB ассетов на диске • Celeron-Ready</span>
						</div>
					</div>
					<span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0">
						0 KB Памяти
					</span>
				</div>

				<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal-surface)] text-[var(--teal)] flex items-center justify-center shrink-0">
							<Activity size={16} />
						</div>
						<div>
							<span className="text-xs font-bold text-[var(--ink)] block">Шумоподавление турбин</span>
							<span className="text-[11px] text-[var(--muted)]">Фильтрация шума бормашины (4.5–6 кГц) для голосовых заметок</span>
						</div>
					</div>
					<span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0">
						DSP Активен
					</span>
				</div>
			</div>
		</>
	);
};
