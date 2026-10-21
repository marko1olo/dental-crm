import { Search, X } from "lucide-react";
import React from "react";
import { triggerHaptic } from "../../../native/mobileBridge";
import { MobilePatientsFilterChips } from "./MobilePatientsFilterChips";
import type { MobilePatientFilter } from "./types";

export interface MobilePatientsHeaderBarProps {
	readonly query: string;
	readonly onQueryChange: (query: string) => void;
	readonly onClearQuery: () => void;
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

export function MobilePatientsHeaderBar({
	query,
	onQueryChange,
	onClearQuery,
	activeFilter,
	onSelectFilter,
	countAll,
	countAllergy,
	countDebt,
	showLostPatientsOnly = false,
	onToggleLostPatients,
	isLoadingLost = false,
	onOpenTactileSearch,
}: MobilePatientsHeaderBarProps) {
	return (
		<div className="mobile-patients-header-bar">
			<div className="mobile-patients-search-row">
				<div className="mobile-patients-search-input-wrap">
					<Search className="mobile-patients-search-icon" size={16} aria-hidden="true" />
					<input
						type="search"
						className="mobile-patients-search-input"
						value={query}
						onChange={(e) => onQueryChange(e.target.value)}
						placeholder="ФИО или телефон пациента..."
						aria-label="Поиск пациента"
						data-testid="mobile-patients-search-input"
					/>
					{query ? (
						<button
							type="button"
							className="mobile-patients-search-clear"
							onClick={() => {
								triggerHaptic("light");
								onClearQuery();
							}}
							aria-label="Очистить поиск"
							data-testid="mobile-patients-search-clear"
						>
							<X size={15} aria-hidden="true" />
						</button>
					) : null}
				</div>
			</div>

			<MobilePatientsFilterChips
				activeFilter={activeFilter}
				onSelectFilter={onSelectFilter}
				countAll={countAll}
				countAllergy={countAllergy}
				countDebt={countDebt}
				showLostPatientsOnly={showLostPatientsOnly}
				onToggleLostPatients={onToggleLostPatients}
				isLoadingLost={isLoadingLost}
				onOpenTactileSearch={onOpenTactileSearch}
			/>
		</div>
	);
}
