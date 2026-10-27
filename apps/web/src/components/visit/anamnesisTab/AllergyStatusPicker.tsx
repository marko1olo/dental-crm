/**
 * apps/web/src/components/visit/anamnesisTab/AllergyStatusPicker.tsx
 *
 * Layer 1: Селектор аллергологического статуса стоматолога (Мандат 8e, 8y).
 */

import React from "react";
import { Pill } from "lucide-react";
import { DENTAL_ALLERGENS } from "./types";
import { AllergenChipItem } from "./AllergenChipItem";

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
	const anesthetics = DENTAL_ALLERGENS.filter((a) => a.category === "anesthetics");
	const materials = DENTAL_ALLERGENS.filter((a) => a.category !== "anesthetics");

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

			<div className="space-y-2.5">
				<div>
					<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1.5">
						Местные анестетики (риск анафилаксии):
					</span>
					<div className="flex flex-wrap gap-2">
						{anesthetics.map((item) => (
							<AllergenChipItem
								key={item.id}
								item={item}
								isSelected={Boolean(selectedAllergies[item.name])}
								currentReaction={selectedAllergies[item.name] || ""}
								onToggle={() => toggleAllergen(item.name)}
								onReactionChange={(r) => setAllergyReaction(item.name, r)}
							/>
						))}
					</div>
				</div>

				<div>
					<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1.5">
						Антибиотики и контактные материалы:
					</span>
					<div className="flex flex-wrap gap-2">
						{materials.map((item) => (
							<AllergenChipItem
								key={item.id}
								item={item}
								isSelected={Boolean(selectedAllergies[item.name])}
								currentReaction={selectedAllergies[item.name] || ""}
								onToggle={() => toggleAllergen(item.name)}
								onReactionChange={(r) => setAllergyReaction(item.name, r)}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};
