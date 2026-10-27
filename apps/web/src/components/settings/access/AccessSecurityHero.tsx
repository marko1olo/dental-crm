import { ShieldCheck, UserCheck } from "lucide-react";
import type React from "react";

export const AccessSecurityHero: React.FC = () => {
	return (
		<div className="import-copy p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs flex items-start gap-3.5 min-w-0">
			<div className="w-11 h-11 rounded-xl bg-teal-600 dark:bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
				<UserCheck size={22} aria-hidden="true" />
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<h2 className="text-sm sm:text-lg font-bold text-[var(--ink)] m-0 tracking-tight leading-snug">
						Матрица прав доступа к модулям DENTE, защита данных и финансовая изоляция
					</h2>
					<span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-500/30 whitespace-nowrap shrink-0 select-none">
						<ShieldCheck size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Безопасность и RBAC</span>
					</span>
				</div>
				<p className="text-xs text-[var(--muted)] m-0 mt-1 leading-relaxed break-words hidden sm:block">
					Гранулярная ролевая модель для клинических и административных ролей.
					Строгая изоляция финансовой отчётности клиники, маскирование персональных данных
					пациентов и расчёт сдельной мотивации в целых копейках.
				</p>
			</div>
		</div>
	);
};
