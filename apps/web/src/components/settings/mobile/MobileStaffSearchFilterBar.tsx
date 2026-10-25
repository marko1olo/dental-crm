import React from "react";
import { Search, X } from "lucide-react";

interface RoleFilterOption {
	key: string;
	label: string;
}

interface MobileStaffSearchFilterBarProps {
	searchQuery: string;
	setSearchQuery: (val: string) => void;
	selectedRoleFilter: string;
	setSelectedRoleFilter: (val: string) => void;
	roleFilters: RoleFilterOption[];
	staffList: Array<{ role?: string }>;
}

export const MobileStaffSearchFilterBar: React.FC<MobileStaffSearchFilterBarProps> = ({
	searchQuery,
	setSearchQuery,
	selectedRoleFilter,
	setSelectedRoleFilter,
	roleFilters,
	staffList,
}) => {
	return (
		<>
			<div className="px-4 pt-3 pb-2">
				<div className="dente-search-wrap">
					<Search size={14} className="dente-search-icon" aria-hidden="true" />
					<input
						type="search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по имени, роли или телефону..."
						className="dente-search-input"
						data-testid="input-mobile-staff-search"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="dente-search-clear"
							aria-label="Очистить поиск"
						>
							<X size={14} />
						</button>
					)}
				</div>
			</div>

			<div className="px-4 pb-2 overflow-x-auto">
				<div className="dente-filter-chips flex-nowrap" role="group" aria-label="Фильтр сотрудников по ролям">
					{roleFilters.map((f) => {
						const count = f.key === "all"
							? staffList.length
							: staffList.filter((s) => s.role === f.key).length;
						return (
							<button
								key={f.key}
								type="button"
								onClick={() => setSelectedRoleFilter(f.key)}
								className={`dente-filter-chip ${selectedRoleFilter === f.key ? "active" : ""}`}
								data-active={selectedRoleFilter === f.key}
							>
								<span>{f.label}</span>
								{count > 0 && <span className="opacity-70 text-[10px] ml-1 font-mono">({count})</span>}
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
};
