import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export interface FilterBarSegmentedChipsProps {
	selectedStage: string;
	setSelectedStage: (stage: string) => void;
	onlyDelayedFilter: boolean;
	setOnlyDelayedFilter: React.Dispatch<React.SetStateAction<boolean>>;
	delayedCount: number;
	hasActiveFilters: boolean;
	handleReset: () => void;
}

export function FilterBarSegmentedChips({
	selectedStage, setSelectedStage, onlyDelayedFilter, setOnlyDelayedFilter,
	delayedCount, hasActiveFilters, handleReset,
}: FilterBarSegmentedChipsProps): React.JSX.Element {
	return (
		<>
			<div className="dente-segmented-bar ztl-stage-chips-group" role="tablist">
				{[
					{ id: "ALL", label: "Все" },
					{ id: "sent_to_lab", label: "Отправлен" },
					{ id: "in_work", label: "В работе" },
					{ id: "draft", label: "Принят" },
					{ id: "fitting_scheduled", label: "Готов" },
					{ id: "installed_completed", label: "Припасован" },
				].map((st) => (
					<button
						key={st.id}
						type="button"
						role="tab"
						aria-selected={selectedStage === st.id}
						className={`dente-segmented-item ${selectedStage === st.id ? "active" : ""}`}
						onClick={() => setSelectedStage(st.id)}
						data-testid={`ztl-filter-stage-${st.id}`}
						title={`Фильтр статуса: ${st.label}`}
					>
						<span>{st.label}</span>
					</button>
				))}
			</div>

			<div className="ztl-filter-chips">
				<button
					type="button"
					className={`ztl-chip alert-chip ${onlyDelayedFilter ? "active" : ""}`}
					onClick={() => setOnlyDelayedFilter((prev) => !prev)}
				>
					<AlertTriangle size={12} />
					<span>Задержки ({delayedCount})</span>
				</button>
				{hasActiveFilters && (
					<button
						type="button"
						className="ztl-chip"
						onClick={handleReset}
					>
						<RefreshCw size={11} />
						<span>Сброс</span>
					</button>
				)}
			</div>
		</>
	);
}
