/**
 * PrescriptionCatalogList.tsx — Searchable Outpatient Drug Catalog List
 * Decomposed coordinator <= 120 lines (Mandate 8b).
 */

import { Award, Plus, Search, X } from "lucide-react";
import type React from "react";
import { PrescriptionCatalogListItem } from "./PrescriptionCatalogListItem";

export interface PrescriptionCatalogListProps {
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly filteredCatalog: readonly {
		readonly id: string;
		readonly tradeNameRu: string;
		readonly latinRp: string;
		readonly dosageRu: string;
		readonly category?: string;
	}[];
	readonly selectedDrugIds: readonly string[];
	readonly onToggleDrug: (id: string) => void;
	readonly onToggleAddingCustom: () => void;
	readonly patientAllergies?: string | readonly string[] | null | undefined;
}

export const PrescriptionCatalogList: React.FC<
	PrescriptionCatalogListProps
> = ({
	searchQuery,
	onSearchQueryChange,
	filteredCatalog,
	selectedDrugIds,
	onToggleDrug,
	onToggleAddingCustom,
	patientAllergies,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<Award className="w-3.5 h-3.5 text-[var(--teal)]" />
					Каталог препаратов
				</span>
				<button
					type="button"
					onClick={onToggleAddingCustom}
					className="secondary-button h-8 px-3 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none"
				>
					<Plus className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
					<span>Свой препарат</span>
				</button>
			</div>

			<div className="dente-search-wrap w-full">
				<Search className="dente-search-icon" />
				<input
					type="text"
					placeholder="Поиск по МНН, торговому названию или латыни..."
					value={searchQuery}
					onChange={(e) => onSearchQueryChange(e.target.value)}
					className="dente-search-input"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => onSearchQueryChange("")}
						className="dente-search-clear"
						aria-label="Очистить поиск"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			<div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
				{filteredCatalog.map((drug) => (
					<PrescriptionCatalogListItem
						key={drug.id}
						drug={drug}
						isSelected={selectedDrugIds.includes(drug.id)}
						onToggle={onToggleDrug}
						patientAllergies={patientAllergies}
					/>
				))}
			</div>
		</div>
	);
};
