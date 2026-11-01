/**
 * apps/web/src/components/prescriptions/studio/PrescriptionDrugList.tsx
 *
 * Каталог стоматологических препаратов и список выписанных лекарств (Мандаты 8e, 8y & Apple HIG).
 * Фильтрация по клиническим группам, живой поиск, разметка Rp. и удаление в 1 клик.
 */

import React from "react";
import { Check, X } from "lucide-react";
import {
	DENTAL_PRESCRIPTION_CATEGORIES,
	type DentalOutpatientDrug,
} from "../prescriptionCatalogData";

export interface PrescriptionDrugListProps {
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly activeCategory: string;
	readonly onSelectCategory: (categoryKey: string) => void;
	readonly filteredDrugs: readonly DentalOutpatientDrug[];
	readonly selectedDrugIds: readonly string[];
	readonly onToggleDrug: (drugId: string) => void;
	readonly selectedDrugs: readonly DentalOutpatientDrug[];
	readonly onRemoveDrug: (drugId: string) => void;
	readonly onClearDrugs: () => void;
	readonly hasPenicillinAllergy: boolean;
	readonly hasNsaidAllergy: boolean;
}

export const PrescriptionDrugList: React.FC<PrescriptionDrugListProps> = ({
	searchQuery,
	onSearchChange,
	activeCategory,
	onSelectCategory,
	filteredDrugs,
	selectedDrugIds,
	onToggleDrug,
	selectedDrugs,
	onRemoveDrug,
	onClearDrugs,
	hasPenicillinAllergy,
	hasNsaidAllergy,
}) => {
	return (
		<>
			{/* Clinical Groups & Live Search */}
			<div>
				<div className="rx-section-header">
					<span>Клинические группы</span>
					<input
						type="text"
						placeholder="Поиск по названию или действию..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						className="px-2.5 py-1 text-xs rounded-lg border border-[var(--rx-line)] bg-[var(--rx-paper)] text-[var(--rx-ink)] outline-none focus:border-[var(--rx-teal)] w-48 font-normal"
					/>
				</div>
				<div className="rx-category-row">
					<button
						type="button"
						onClick={() => onSelectCategory("all")}
						className={`rx-category-chip ${activeCategory === "all" ? "active" : ""}`}
					>
						Все препараты
					</button>
					{DENTAL_PRESCRIPTION_CATEGORIES.map((cat) => (
						<button
							key={cat.key}
							type="button"
							onClick={() => onSelectCategory(cat.key)}
							className={`rx-category-chip ${activeCategory === cat.key ? "active" : ""}`}
						>
							{cat.labelRu}
						</button>
					))}
				</div>
			</div>

			{/* Drug Cards Grid */}
			<div className="rx-drugs-grid">
				{filteredDrugs.map((drug) => {
					const isSelected = selectedDrugIds.includes(drug.id);
					const isConflicting =
						(hasPenicillinAllergy && drug.category === "antibiotic" && /амокси/i.test(drug.activeSubstanceRu)) ||
						(hasNsaidAllergy && drug.category === "nsaid");
					return (
						<button
							key={drug.id}
							type="button"
							onClick={() => onToggleDrug(drug.id)}
							className={`rx-drug-card ${isSelected ? "selected" : ""}`}
							data-testid={isConflicting ? `drug-allergy-badge-${drug.id}` : undefined}
						>
							<div className="rx-drug-card-info">
								<div className="rx-drug-card-name">
									{isSelected && <Check className="w-3.5 h-3.5 text-[var(--rx-teal)] inline mr-1 shrink-0" />}
									{drug.tradeName}
								</div>
								<div className="rx-drug-card-scheme">{drug.memoInstruction}</div>
							</div>
							<span className="text-xs px-2 py-0.5 rounded-md bg-[var(--rx-paper-soft)] text-[var(--rx-ink-muted)] shrink-0 font-medium">
								{drug.dosageRu}
							</span>
						</button>
					);
				})}
			</div>

			{/* Active Prescribed Drugs List */}
			<div>
				<div className="rx-section-header">
					<span>Выписанные препараты ({selectedDrugs.length})</span>
					{selectedDrugs.length > 0 && (
						<button
							type="button"
							onClick={onClearDrugs}
							className="text-xs text-[var(--rx-ink-muted)] hover:text-red-500 cursor-pointer border-none bg-transparent"
						>
							Очистить всё
						</button>
					)}
				</div>
				{selectedDrugs.length === 0 ? (
					<div className="p-4 text-center text-xs text-[var(--rx-ink-muted)] border border-dashed border-[var(--rx-line)] rounded-xl">
						Выберите экспресс-набор или кликните по препаратам в каталоге
					</div>
				) : (
					<div className="rx-active-list">
						{selectedDrugs.map((drug) => (
							<div key={drug.id} className="rx-active-item">
								<div className="rx-active-item-details">
									<div className="rx-active-item-title">{drug.tradeName}</div>
									<div className="rx-active-item-latin">{drug.latinName}</div>
									<div className="rx-active-item-scheme">{drug.signaRussian}</div>
								</div>
								<button
									type="button"
									onClick={() => onRemoveDrug(drug.id)}
									className="rx-remove-btn min-h-[44px]"
									aria-label={`Удалить ${drug.tradeName}`}
									title="Удалить препарат"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		</>
	);
};

PrescriptionDrugList.displayName = "PrescriptionDrugList";
