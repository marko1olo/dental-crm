import React from "react";
import { Search, X } from "lucide-react";

interface RiskListControlsProps {
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly categoryFilter: string;
	readonly onCategoryChange: (cat: string) => void;
	readonly riskBandFilter: string;
	readonly onRiskBandChange: (rb: string) => void;
}

export function LostPatientsRiskListControls({
	searchQuery,
	onSearchChange,
	categoryFilter,
	onCategoryChange,
	riskBandFilter,
	onRiskBandChange,
}: RiskListControlsProps) {
	return (
		<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3">
			<div className="dente-search-wrap flex-1">
				<Search size={14} className="dente-search-icon" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Поиск по ФИО или номеру телефона..."
					className="dente-search-input"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => onSearchChange("")}
						className="dente-search-clear"
						aria-label="Очистить поиск"
					>
						<X size={13} />
					</button>
				)}
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<select
					value={categoryFilter}
					onChange={(e) => onCategoryChange(e.target.value)}
					className="h-8 px-2.5 text-[12.5px] rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] cursor-pointer"
					aria-label="Фильтр по типу лечения"
				>
					<option value="all">Все профили лечения</option>
					<option value="sanitation">После санации полости рта</option>
					<option value="implantation">После имплантации / протезирования</option>
					<option value="general_therapy">Терапевтический приём</option>
				</select>

				<select
					value={riskBandFilter}
					onChange={(e) => onRiskBandChange(e.target.value)}
					className="h-8 px-2.5 text-[12.5px] rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] cursor-pointer"
					aria-label="Фильтр по сроку отсутствия"
				>
					<option value="all">Любой срок риска</option>
					<option value="due_6m">6+ мес (срок профгигиены)</option>
					<option value="overdue_12m">12+ мес (пропущен осмотр)</option>
					<option value="critical_24m">24+ мес (критический отток)</option>
				</select>
			</div>
		</div>
	);
}
