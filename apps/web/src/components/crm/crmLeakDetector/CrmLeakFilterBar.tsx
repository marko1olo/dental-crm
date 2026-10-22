import type React from "react";

interface Props {
	minDays: number;
	onMinDaysChange: (days: number) => void;
	statusFilter: string;
	onStatusFilterChange: (status: string) => void;
	onlyUncompletedPlans: boolean;
	onOnlyUncompletedPlansChange: (checked: boolean) => void;
	searchQuery: string;
	onSearchQueryChange: (query: string) => void;
}

export const CrmLeakFilterBar: React.FC<Props> = ({
	minDays,
	onMinDaysChange,
	statusFilter,
	onStatusFilterChange,
	onlyUncompletedPlans,
	onOnlyUncompletedPlansChange,
	searchQuery,
	onSearchQueryChange,
}) => {
	return (
		<div className="cld-filter-bar px-4 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center gap-2 flex-wrap">
			<select
				className="secondary-button cld-filter-select h-9 text-xs"
				value={minDays}
				onChange={(e) => onMinDaysChange(Number(e.target.value))}
			>
				<option value={210}>Порог: 210 дней (7 мес.)</option>
				<option value={240}>Порог: 240 дней (8 мес.)</option>
				<option value={365}>Порог: 365 дней (1 год)</option>
			</select>

			<select
				className="secondary-button cld-filter-select h-9 text-xs"
				value={statusFilter}
				onChange={(e) => onStatusFilterChange(e.target.value)}
			>
				<option value="all">Все статусы</option>
				<option value="new">Новые</option>
				<option value="in_progress">В работе</option>
				<option value="contacted">Связались</option>
				<option value="rebooked">Записаны</option>
				<option value="declined">Отказ</option>
			</select>

			<label className="text-xs text-[var(--ink)] font-medium inline-flex items-center gap-1.5 cursor-pointer ml-1">
				<input
					type="checkbox"
					checked={onlyUncompletedPlans}
					onChange={(e) => onOnlyUncompletedPlansChange(e.target.checked)}
					className="rounded border-[var(--line)]"
				/>
				<span>Только брошенные планы</span>
			</label>

			<input
				type="text"
				className="cld-filter-input h-9 text-xs ml-auto min-w-[180px] bg-[var(--paper)] border border-[var(--line)] rounded-lg px-2.5 text-[var(--ink)]"
				placeholder="Поиск по имени/телефону..."
				value={searchQuery}
				onChange={(e) => onSearchQueryChange(e.target.value)}
			/>
		</div>
	);
};
