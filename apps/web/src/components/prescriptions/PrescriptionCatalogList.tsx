/**
 * PrescriptionCatalogList.tsx — Searchable Outpatient Drug Catalog List
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y & Mandate 8b Sweet Spot 200–350 lines).
 */

import { AlertTriangle, Award, CheckCircle2, Plus, Search, X } from "lucide-react";
import React from "react";
import { getDrugAllergyConflictType } from "./prescriptionAllergyChecker";

export interface PrescriptionCatalogListItemProps {
	readonly drug: {
		readonly id: string;
		readonly tradeNameRu: string;
		readonly latinRp: string;
		readonly dosageRu: string;
		readonly category?: string;
	};
	readonly isSelected: boolean;
	readonly onToggle: (id: string) => void;
	readonly patientAllergies?: string | readonly string[] | null | undefined;
}

export const PrescriptionCatalogListItem: React.FC<
	PrescriptionCatalogListItemProps
> = ({ drug, isSelected, onToggle, patientAllergies }) => {
	const conflict = getDrugAllergyConflictType(
		{
			id: drug.id,
			tradeName: drug.tradeNameRu,
			latinName: drug.latinRp,
			category: drug.category,
		},
		patientAllergies,
	);

	return (
		<button
			type="button"
			onClick={() => onToggle(drug.id)}
			className={`w-full text-left p-2.5 min-h-[44px] rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
				isSelected
					? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--ink)] font-semibold shadow-xs"
					: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--line-strong)]"
			}`}
		>
			<div className="min-w-0">
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="font-bold truncate">{drug.tradeNameRu}</span>
					{conflict && (
						<span
							data-testid={`drug-allergy-badge-${drug.id}`}
							className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30 flex items-center gap-1 shrink-0"
						>
							<AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
							<span>Аллергия</span>
						</span>
					)}
				</div>
				<div className="text-xs text-[var(--muted)] truncate italic">
					{drug.latinRp}
				</div>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				<span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)]">
					{drug.dosageRu}
				</span>
				<div
					className={`w-4 h-4 rounded-md border flex items-center justify-center ${
						isSelected
							? "bg-[var(--teal)] border-[var(--teal)] text-[var(--ink-inverse)]"
							: "border-[var(--line)]"
					}`}
				>
					{isSelected && <CheckCircle2 className="w-3 h-3" />}
				</div>
			</div>
		</button>
	);
};

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
					className="secondary-button btn btn--secondary h-8 px-3 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none"
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
