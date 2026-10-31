/**
 * PrescriptionActiveItemsList.tsx — Outpatient Active Prescription Items & Regimens
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y & Mandate 8b Sweet Spot 120–180 lines).
 * Touch targets >= 44px (Apple HIG), non-blocking allergy markers.
 */

import React from "react";
import { Trash2 } from "lucide-react";
import type { DentalOutpatientDrug } from "../prescriptionCatalogData";

export interface PrescriptionActiveItemsListProps {
	readonly selectedDrugs: readonly DentalOutpatientDrug[];
	readonly onRemoveDrug: (drugId: string) => void;
	readonly onClearDrugs: () => void;
	readonly hasPenicillinAllergy?: boolean;
	readonly hasNsaidAllergy?: boolean;
	readonly className?: string;
}

export const PrescriptionActiveItemsList: React.FC<PrescriptionActiveItemsListProps> = ({
	selectedDrugs,
	onRemoveDrug,
	onClearDrugs,
	hasPenicillinAllergy = false,
	hasNsaidAllergy = false,
	className = "",
}) => {
	return (
		<div className={`flex flex-col min-h-0 bg-[var(--paper)] ${className}`}>
			<div className="flex items-center justify-between mb-2 shrink-0">
				<h4 className="text-xs font-bold text-[var(--ink)]">
					Выписанные препараты ({selectedDrugs.length}):
				</h4>
				{selectedDrugs.length > 0 && (
					<button
						type="button"
						data-testid="clear-all-prescriptions-btn"
						onClick={onClearDrugs}
						className="min-h-[32px] px-2 bg-transparent border-0 text-[11px] text-[var(--muted)] hover:text-red-500 cursor-pointer transition-colors"
					>
						Очистить всё
					</button>
				)}
			</div>

			{selectedDrugs.length === 0 ? (
				<div
					data-testid="empty-active-prescriptions-banner"
					className="p-4 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl bg-[var(--paper-soft)]"
				>
					Препараты не выбраны. Выберите готовую схему или добавьте препарат из каталога.
				</div>
			) : (
				<div className="flex flex-col gap-2 overflow-y-auto">
					{selectedDrugs.map((drug, idx) => {
						const isDrugAllergic =
							(hasPenicillinAllergy && drug.id.includes("amoxi")) ||
							(hasNsaidAllergy && drug.category === "nsaid");
						return (
							<div
								key={drug.id}
								data-testid={`active-prescription-item-${drug.id}`}
								className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-start justify-between gap-3 shadow-2xs"
							>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="w-5 h-5 rounded-full bg-[var(--paper)] text-[10px] font-bold flex items-center justify-center text-[var(--muted)] shrink-0">
											{idx + 1}
										</span>
										<span className="font-bold text-xs text-[var(--ink)] truncate">
											{drug.tradeName}
										</span>
										{isDrugAllergic && (
											<span
												data-testid={`drug-allergy-badge-${drug.id}`}
												className="text-[9px] font-bold text-amber-700 bg-amber-500/15 px-1.5 py-0.5 rounded shrink-0"
											>
												Аллерген
											</span>
										)}
										<span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--paper)] px-1.5 py-0.5 rounded border border-[var(--line)] shrink-0">
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
									data-testid={`remove-drug-btn-${drug.id}`}
									onClick={() => onRemoveDrug(drug.id)}
									className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-transparent border-0 rounded-lg text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer shrink-0"
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
	);
};

PrescriptionActiveItemsList.displayName = "PrescriptionActiveItemsList";
