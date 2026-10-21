import { AlertTriangle, Filter, Search, Zap } from "lucide-react";
import React from "react";
import { triggerHaptic } from "../../../native/mobileBridge";
import type { MobilePatientFilter } from "./types";

export interface MobilePatientsFilterChipsProps {
	readonly activeFilter: MobilePatientFilter;
	readonly onSelectFilter: (filter: MobilePatientFilter) => void;
	readonly countAll: number;
	readonly countAllergy: number;
	readonly countDebt: number;
	readonly showLostPatientsOnly?: boolean | undefined;
	readonly onToggleLostPatients?: (() => void) | undefined;
	readonly isLoadingLost?: boolean | undefined;
	readonly onOpenTactileSearch: () => void;
}

export function MobilePatientsFilterChips({
	activeFilter,
	onSelectFilter,
	countAll,
	countAllergy,
	countDebt,
	showLostPatientsOnly = false,
	onToggleLostPatients,
	isLoadingLost = false,
	onOpenTactileSearch,
}: MobilePatientsFilterChipsProps) {
	return (
		<div className="mobile-patients-chips-scroller" role="tablist">
			<button
				type="button"
				className={`mobile-filter-chip ${activeFilter === "all" && !showLostPatientsOnly ? "active" : ""}`}
				onClick={() => {
					triggerHaptic("light");
					onSelectFilter("all");
					if (showLostPatientsOnly && onToggleLostPatients) onToggleLostPatients();
				}}
				role="tab"
				aria-selected={activeFilter === "all" && !showLostPatientsOnly}
				data-testid="mobile-chip-all"
			>
				<span>Все</span>
				<span className="mobile-filter-chip-count">{countAll}</span>
			</button>

			<button
				type="button"
				className={`mobile-filter-chip ${activeFilter === "allergy" ? "active" : ""}`}
				onClick={() => {
					triggerHaptic("light");
					onSelectFilter(activeFilter === "allergy" ? "all" : "allergy");
				}}
				role="tab"
				aria-selected={activeFilter === "allergy"}
				data-testid="mobile-chip-allergy"
			>
				<AlertTriangle size={13} className="text-rose-500 shrink-0" aria-hidden="true" />
				<span>С аллергией</span>
				{countAllergy > 0 && <span className="mobile-filter-chip-count">{countAllergy}</span>}
			</button>

			<button
				type="button"
				className={`mobile-filter-chip ${activeFilter === "debt" ? "active" : ""}`}
				onClick={() => {
					triggerHaptic("light");
					onSelectFilter(activeFilter === "debt" ? "all" : "debt");
				}}
				role="tab"
				aria-selected={activeFilter === "debt"}
				data-testid="mobile-chip-debt"
			>
				<Zap size={13} className="text-amber-500 shrink-0" aria-hidden="true" />
				<span>С долгом</span>
				{countDebt > 0 && <span className="mobile-filter-chip-count">{countDebt}</span>}
			</button>

			<button
				type="button"
				className={`mobile-filter-chip ${showLostPatientsOnly ? "active" : ""}`}
				onClick={() => {
					triggerHaptic("light");
					if (onToggleLostPatients) onToggleLostPatients();
				}}
				role="tab"
				aria-selected={showLostPatientsOnly}
				data-testid="mobile-chip-lost"
			>
				<Search size={13} className="shrink-0" aria-hidden="true" />
				<span>{isLoadingLost ? "Загрузка..." : "Потерянные"}</span>
			</button>

			<button
				type="button"
				className="mobile-filter-chip mobile-filter-chip-matrix"
				onClick={() => {
					triggerHaptic("light");
					onOpenTactileSearch();
				}}
				title="Тактильная матрица исследований"
				data-testid="mobile-chip-matrix"
			>
				<Filter size={13} className="shrink-0" aria-hidden="true" />
				<span>Матрица</span>
			</button>
		</div>
	);
}
