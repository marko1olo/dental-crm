import React from "react";
import { Search, X } from "lucide-react";

export interface PriorityFilterOption {
	id: string;
	label: string;
}

export const WAITLIST_PRIORITY_FILTERS: PriorityFilterOption[] = [
	{ id: "all", label: "Все" },
	{ id: "urgent", label: "Острая боль" },
	{ id: "treatment_plan", label: "План" },
	{ id: "vip", label: "VIP" },
	{ id: "routine", label: "Плановый" },
];

export interface WaitlistPatientFilterBarProps {
	searchQuery: string;
	onSearchChange: (query: string) => void;
	selectedPriorityFilter: string;
	onPriorityFilterChange: (filter: string) => void;
}

export const WaitlistPatientFilterBar: React.FC<WaitlistPatientFilterBarProps> = ({
	searchQuery,
	onSearchChange,
	selectedPriorityFilter,
	onPriorityFilterChange,
}) => {
	return (
		<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
			<div className="dente-search-wrap flex-1 min-w-[180px] max-w-sm">
				<Search className="dente-search-icon" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Поиск по ФИО, телефону или примечанию..."
					className="dente-search-input"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => onSearchChange("")}
						className="dente-search-clear"
						aria-label="Очистить поиск"
					>
						<X size={12} />
					</button>
				)}
			</div>
			<div className="dente-filter-chips overflow-x-auto whitespace-nowrap shrink-0">
				{WAITLIST_PRIORITY_FILTERS.map((filter) => (
					<button
						key={filter.id}
						type="button"
						onClick={() => onPriorityFilterChange(filter.id)}
						className={`dente-filter-chip ${
							selectedPriorityFilter === filter.id ? "active" : ""
						}`}
					>
						{filter.label}
					</button>
				))}
			</div>
		</div>
	);
};
