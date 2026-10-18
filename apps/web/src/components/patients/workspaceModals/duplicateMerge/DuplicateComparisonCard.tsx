import React from "react";

export interface DuplicateComparisonCardProps {
	readonly patientName?: string | undefined;
	readonly patientId: string;
	readonly target: any;
	readonly confidencePercent: number;
}

export const DuplicateComparisonCard: React.FC<DuplicateComparisonCardProps> = ({
	patientName,
	patientId,
	target,
	confidencePercent,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
			{/* Left: Primary / Kept Card */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-teal-500/30 flex flex-col gap-1.5">
				<div className="flex items-center justify-between">
					<span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
						Основная карта (сохранится)
					</span>
					<span className="px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-800 dark:text-teal-300 text-[10px] font-bold">
						Primary
					</span>
				</div>
				<p className="text-sm font-bold text-[var(--ink)]">{patientName || "Текущий пациент"}</p>
				<p className="text-[11px] text-[var(--muted)] font-mono">ID: {patientId.slice(0, 13)}...</p>
			</div>

			{/* Right: Duplicate Candidate */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-indigo-500/30 flex flex-col gap-1.5">
				<div className="flex items-center justify-between">
					<span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
						Дубликат (будет объединен)
					</span>
					<span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold">
						{confidencePercent}% совпадение
					</span>
				</div>
				<p className="text-sm font-bold text-[var(--ink)]">{target.fullName || target.name || "Дублирующая карта"}</p>
				<p className="text-[11px] text-[var(--muted)]">
					{target.phone ? `Тел: ${target.phone}` : "Телефон не указан"}
					{target.birthDate ? ` • ${target.birthDate}` : ""}
				</p>
			</div>
		</div>
	);
};
