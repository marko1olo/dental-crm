/**
 * PrescriptionCatalogWorkbench.tsx — Outpatient Dental Pharmacopeia & Fast Sets Workbench
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y & Mandate 8b Sweet Spot 200–300 lines).
 * Touch targets >= 44px (Apple HIG), zero bureaucratic jargon.
 */

import React, { useState, useMemo } from "react";
import { Search, Sparkles, Trash2, Plus, Check } from "lucide-react";
import {
	CANONICAL_DENTAL_DRUGS,
	CLINICAL_FAST_SETS,
	type DentalOutpatientDrug,
	type DentalFastPrescriptionSet,
} from "./prescriptionCatalogData";

export interface PrescriptionCatalogWorkbenchProps {
	readonly selectedDrugs: readonly DentalOutpatientDrug[];
	readonly onSelectFastSet: (set: DentalFastPrescriptionSet) => void;
	readonly onAddDrug: (drug: DentalOutpatientDrug) => void;
	readonly onRemoveDrug: (drugId: string) => void;
	readonly onClearDrugs: () => void;
	readonly hasPenicillinAllergy?: boolean;
	readonly hasNsaidAllergy?: boolean;
	readonly className?: string;
}

export const PrescriptionCatalogWorkbench: React.FC<PrescriptionCatalogWorkbenchProps> = ({
	selectedDrugs,
	onSelectFastSet,
	onAddDrug,
	onRemoveDrug,
	onClearDrugs,
	hasPenicillinAllergy = false,
	hasNsaidAllergy = false,
	className = "",
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState<string>("all");

	const filteredCatalog = useMemo(() => {
		return CANONICAL_DENTAL_DRUGS.filter((drug) => {
			if (activeCategory !== "all" && drug.category !== activeCategory) return false;
			if (!searchQuery) return true;
			const q = searchQuery.toLowerCase();
			return (
				drug.tradeName.toLowerCase().includes(q) ||
				drug.activeSubstanceRu.toLowerCase().includes(q) ||
				drug.latinName.toLowerCase().includes(q)
			);
		});
	}, [activeCategory, searchQuery]);

	return (
		<div className={`flex flex-col min-h-0 bg-[var(--paper)] ${className}`}>
			{/* 1-Click Fast Sets */}
			<div className="p-4 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-2">
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
					Готовые клинические схемы в 1 клик
				</span>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{CLINICAL_FAST_SETS.map((set) => {
						const isSetConflicting =
							(hasPenicillinAllergy && set.drugIds.some((id) => id.includes("amoxi"))) ||
							(hasNsaidAllergy &&
								set.drugIds.some(
									(id) => id.includes("nime") || id.includes("ibu") || id.includes("keto"),
								));
						return (
							<button
								key={set.id}
								type="button"
								onClick={() => onSelectFastSet(set)}
								className="min-h-[44px] p-2.5 text-left rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)] transition-all flex flex-col justify-between group shadow-2xs cursor-pointer"
							>
								<div className="flex items-center justify-between gap-1 w-full">
									<div className="font-semibold text-xs text-[var(--ink)] group-hover:text-[var(--teal,#0d9488)] truncate">
										{set.label}
									</div>
									{isSetConflicting && (
										<span
											data-testid={`preset-allergy-badge-${set.id}`}
											className="text-[9px] font-bold text-amber-700 bg-amber-500/15 px-1.5 py-0.5 rounded shrink-0"
										>
											Аллерген
										</span>
									)}
								</div>
								<div className="text-[11px] text-[var(--muted)] truncate w-full mt-0.5">
									{set.desc}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Search & Group Filter */}
			<div className="p-3 border-b border-[var(--line)] bg-[var(--paper)] flex flex-wrap items-center gap-2 shrink-0">
				<div className="relative flex-1 min-w-[180px]">
					<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по названию или действию..."
						style={{ paddingLeft: "36px" }}
						className="w-full pr-3 py-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					/>
				</div>
				<select
					value={activeCategory}
					onChange={(e) => setActiveCategory(e.target.value)}
					className="px-2.5 py-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none"
				>
					<option value="all">Все группы</option>
					<option value="antibiotic">Антибиотики</option>
					<option value="nsaid">Обезболивающие (НПВС)</option>
					<option value="antiseptic">Антисептики</option>
					<option value="mucosa">Слизистая и десны</option>
					<option value="antihistamine">Противоотечные</option>
				</select>
			</div>

			{/* Selected Drugs & Pharmacopeia Catalog */}
			<div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
				{/* Current Selected Items */}
				<div>
					<div className="flex items-center justify-between mb-2">
						<h4 className="text-xs font-bold text-[var(--ink)]">
							Выписанные препараты ({selectedDrugs.length}):
						</h4>
						{selectedDrugs.length > 0 && (
							<button
								type="button"
								onClick={onClearDrugs}
								className="bg-transparent border-0 text-[11px] text-[var(--muted)] hover:text-red-500 cursor-pointer"
							>
								Очистить всё
							</button>
						)}
					</div>
					{selectedDrugs.length === 0 ? (
						<div className="p-3 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl bg-[var(--paper-soft)]">
							Препараты не выбраны. Выберите готовую схему или препарат из каталога ниже.
						</div>
					) : (
						<div className="flex flex-col gap-2">
							{selectedDrugs.map((drug, idx) => {
								const isDrugAllergic =
									(hasPenicillinAllergy && drug.id.includes("amoxi")) ||
									(hasNsaidAllergy && drug.category === "nsaid");
								return (
									<div
										key={drug.id}
										className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-start justify-between gap-3 shadow-2xs"
									>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="w-5 h-5 rounded-full bg-[var(--paper)] text-[10px] font-bold flex items-center justify-center text-[var(--muted)]">
													{idx + 1}
												</span>
												<span className="font-bold text-xs text-[var(--ink)] truncate">
													{drug.tradeName}
												</span>
												{isDrugAllergic && (
													<span
														data-testid={`drug-allergy-badge-${drug.id}`}
														className="text-[9px] font-bold text-amber-700 bg-amber-500/15 px-1.5 py-0.5 rounded"
													>
														Аллерген
													</span>
												)}
												<span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--paper)] px-1.5 py-0.5 rounded border border-[var(--line)]">
													{drug.quantityLabel}
												</span>
											</div>
											<div className="text-[11px] text-[var(--teal,#0d9488)] font-mono italic mt-1 truncate">
												{drug.latinName}
											</div>
											<div className="text-[11px] text-[var(--ink)] mt-1 bg-[var(--paper)] p-1.5 rounded-lg border border-[var(--line)]">
												<strong>Режим:</strong> {drug.signaRussian}
											</div>
										</div>
										<button
											type="button"
											onClick={() => onRemoveDrug(drug.id)}
											className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-transparent border-0 rounded-lg text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer"
											aria-label={`Удалить ${drug.tradeName}`}
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Pharmacopeia Catalog */}
				<div>
					<h4 className="text-xs font-bold text-[var(--ink)] mb-2">
						Каталог стоматологической фармакопеи:
					</h4>
					<div className="flex flex-col gap-1.5">
						{filteredCatalog.map((drug) => {
							const isSelected = selectedDrugs.some((d) => d.id === drug.id);
							const isDrugAllergic =
								(hasPenicillinAllergy && drug.id.includes("amoxi")) ||
								(hasNsaidAllergy && drug.category === "nsaid");
							return (
								<div
									key={drug.id}
									className="p-2.5 rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-2 transition-colors"
								>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span className="font-semibold text-xs text-[var(--ink)] truncate">
												{drug.tradeName}
											</span>
											{isDrugAllergic && (
												<span
													data-testid={`drug-allergy-badge-${drug.id}`}
													className="text-[9px] font-bold text-amber-700 bg-amber-500/15 px-1.5 py-0.5 rounded"
												>
													Аллерген
												</span>
											)}
											<span className="text-[10px] text-[var(--muted)]">
												({drug.dosageRu})
											</span>
										</div>
										<div className="text-[11px] text-[var(--muted)] truncate">
											{drug.categoryLabelRu} · {drug.signaRussian}
										</div>
									</div>
									<button
										type="button"
										onClick={() => (isSelected ? onRemoveDrug(drug.id) : onAddDrug(drug))}
										className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
											isSelected
												? "bg-teal-500/15 text-[var(--teal,#0d9488)] border border-teal-500/30"
												: "bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)]"
										}`}
									>
										{isSelected ? (
											<>
												<Check className="w-3.5 h-3.5" />
												<span>В бланке</span>
											</>
										) : (
											<>
												<Plus className="w-3.5 h-3.5" />
												<span>Добавить</span>
											</>
										)}
									</button>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};

PrescriptionCatalogWorkbench.displayName = "PrescriptionCatalogWorkbench";
