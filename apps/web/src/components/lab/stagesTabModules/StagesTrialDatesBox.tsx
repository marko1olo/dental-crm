import React from "react";
import { Calendar } from "lucide-react";
import { calculateWorkingDaysRemaining } from "../labMath";

export interface StagesTrialDatesBoxProps {
	dueDate: string;
	setDueDate: (date: string) => void;
	frameworkTrialDate: string;
	setFrameworkTrialDate: (date: string) => void;
	ceramicTrialDate: string;
	setCeramicTrialDate: (date: string) => void;
}

export function StagesTrialDatesBox({
	dueDate, setDueDate, frameworkTrialDate, setFrameworkTrialDate, ceramicTrialDate, setCeramicTrialDate,
}: StagesTrialDatesBoxProps): React.JSX.Element {
	const rem = calculateWorkingDaysRemaining(dueDate);

	return (
		<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<Calendar className="w-4 h-4 text-[var(--teal)]" />
					<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
						Даты клинических примерок и дедлайн сдачи работы
					</span>
				</div>
				{rem && (
					<span
						className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${rem.badgeClass}`}
						data-testid="lab-order-due-deadline-badge"
					>
						{rem.labelRu}
					</span>
				)}
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div className="space-y-1.5">
					<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
						1. Примерка каркаса (Framework)
					</label>
					<input
						type="date"
						value={frameworkTrialDate}
						onChange={(e) => setFrameworkTrialDate(e.target.value)}
						className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[var(--teal)]"
					/>
				</div>
				<div className="space-y-1.5">
					<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
						2. Примерка керамики / Бисквит
					</label>
					<input
						type="date"
						value={ceramicTrialDate}
						onChange={(e) => setCeramicTrialDate(e.target.value)}
						className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[var(--teal)]"
					/>
				</div>
				<div className="space-y-1.5">
					<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
						3. Срок сдачи (Дедлайн ЗТЛ)
					</label>
					<input
						type="date"
						value={dueDate}
						onChange={(e) => setDueDate(e.target.value)}
						className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[var(--teal)]"
					/>
				</div>
			</div>
		</div>
	);
}
