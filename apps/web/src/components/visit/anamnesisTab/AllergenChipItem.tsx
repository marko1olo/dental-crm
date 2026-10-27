/**
 * apps/web/src/components/visit/anamnesisTab/AllergenChipItem.tsx
 *
 * Интерактивный чип аллергена с выбором типа клинической реакции (Мандат 8e).
 */

import React from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { ALLERGY_REACTIONS, type DentalAllergen } from "./types";

export interface AllergenChipItemProps {
	readonly item: DentalAllergen;
	readonly isSelected: boolean;
	readonly currentReaction: string;
	readonly onToggle: () => void;
	readonly onReactionChange: (reaction: string) => void;
}

export const AllergenChipItem: React.FC<AllergenChipItemProps> = ({
	item,
	isSelected,
	currentReaction,
	onToggle,
	onReactionChange,
}) => {
	if (!isSelected) {
		return (
			<button
				type="button"
				onClick={onToggle}
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
		<div className="anamnesis-allergen-item">
			<button
				type="button"
				onClick={onToggle}
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
					onChange={(e) => onReactionChange(e.target.value)}
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
};
