/**
 * apps/web/src/components/visit/anamnesisTab/AllergyStatusPicker.tsx
 *
 * Layer 1: Селектор аллергологического статуса стоматолога:
 * выбор местных анестетиков (риск анафилаксии) и антибиотиков/материалов
 * с типом реакции (крапивница, отек Квинке, анафилаксия).
 */

import React from "react";
import { Check, ChevronDown, Pill, Plus } from "lucide-react";
import { ALLERGY_REACTIONS, DENTAL_ALLERGENS } from "./types";

export interface AllergyStatusPickerProps {
	readonly selectedAllergies: Record<string, string>;
	readonly selectedAllergyCount: number;
	readonly toggleAllergen: (name: string) => void;
	readonly setAllergyReaction: (allergenName: string, reaction: string) => void;
}

export const AllergyStatusPicker: React.FC<AllergyStatusPickerProps> = ({
	selectedAllergies,
	selectedAllergyCount,
	toggleAllergen,
	setAllergyReaction,
}) => {
	return (
		<div className="space-y-3 p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/50 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
			<div className="flex items-center justify-between">
				<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
					<Pill className="w-4 h-4 text-rose-500" />
					<span>1. Аллергологический статус (Стоматологические препараты)</span>
				</label>
				<span className="text-[11px] text-[var(--muted,#64748b)]">
					{selectedAllergyCount > 0 ? (
						<span className="font-bold text-[#ef4444]">
							Выбрано аллергенов: {selectedAllergyCount}
						</span>
					) : (
						"Аллергии не выявлены"
					)}
				</span>
			</div>

			{/* Группированные чипы аллергенов */}
			<div className="space-y-2.5">
				{/* Подкатегория: Местные анестетики */}
				<div>
					<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1.5">
						Местные анестетики (риск анафилаксии):
					</span>
					<div className="flex flex-wrap gap-2">
						{DENTAL_ALLERGENS.filter((a) => a.category === "anesthetics").map(
							(item) => {
								const isSelected = Boolean(selectedAllergies[item.name]);
								const currentReaction = selectedAllergies[item.name] || "";
								if (!isSelected) {
									return (
										<button
											key={item.id}
											type="button"
											onClick={() => toggleAllergen(item.name)}
											className="anamnesis-chip"
											title={item.tradeNamesHint}
											data-testid={`toggle-allergy-${item.id}`}
										>
											<Plus className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
											<span>{item.name}</span>
										</button>
									);
								}
								return (
									<div key={item.id} className="anamnesis-allergen-item">
										<button
											type="button"
											onClick={() => toggleAllergen(item.name)}
											className="anamnesis-chip anamnesis-chip--active-danger"
											title={item.tradeNamesHint}
											data-testid={`toggle-allergy-${item.id}`}
										>
											<Check className="w-3.5 h-3.5 text-[#ef4444]" />
											<span>{item.name}</span>
										</button>
										<div className="anamnesis-reaction-selector" title="Тип аллергической реакции">
											<span>{currentReaction}</span>
											<ChevronDown className="anamnesis-reaction-arrow" />
											<select
												value={currentReaction}
												onChange={(e) =>
													setAllergyReaction(item.name, e.target.value)
												}
												className="anamnesis-reaction-select"
												title="Тип аллергической реакции"
												aria-label={`Тип реакции на ${item.name}`}
											>
												{ALLERGY_REACTIONS.map((reaction) => (
													<option
														key={reaction}
														value={reaction}
														className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
													>
														{reaction}
													</option>
												))}
											</select>
										</div>
									</div>
								);
							},
						)}
					</div>
				</div>

				{/* Подкатегория: Антибиотики и материалы */}
				<div>
					<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1.5">
						Антибиотики и контактные материалы:
					</span>
					<div className="flex flex-wrap gap-2">
						{DENTAL_ALLERGENS.filter((a) => a.category !== "anesthetics").map(
							(item) => {
								const isSelected = Boolean(selectedAllergies[item.name]);
								const currentReaction = selectedAllergies[item.name] || "";
								if (!isSelected) {
									return (
										<button
											key={item.id}
											type="button"
											onClick={() => toggleAllergen(item.name)}
											className="anamnesis-chip"
											title={item.tradeNamesHint}
											data-testid={`toggle-allergy-${item.id}`}
										>
											<Plus className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
											<span>{item.name}</span>
										</button>
									);
								}
								return (
									<div key={item.id} className="anamnesis-allergen-item">
										<button
											type="button"
											onClick={() => toggleAllergen(item.name)}
											className="anamnesis-chip anamnesis-chip--active-danger"
											title={item.tradeNamesHint}
											data-testid={`toggle-allergy-${item.id}`}
										>
											<Check className="w-3.5 h-3.5 text-[#ef4444]" />
											<span>{item.name}</span>
										</button>
										<div className="anamnesis-reaction-selector" title="Тип аллергической реакции">
											<span>{currentReaction}</span>
											<ChevronDown className="anamnesis-reaction-arrow" />
											<select
												value={currentReaction}
												onChange={(e) =>
													setAllergyReaction(item.name, e.target.value)
												}
												className="anamnesis-reaction-select"
												title="Тип аллергической реакции"
												aria-label={`Тип реакции на ${item.name}`}
											>
												{ALLERGY_REACTIONS.map((reaction) => (
													<option
														key={reaction}
														value={reaction}
														className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
													>
														{reaction}
													</option>
												))}
											</select>
										</div>
									</div>
								);
							},
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
