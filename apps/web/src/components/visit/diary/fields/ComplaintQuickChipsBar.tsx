import React from "react";
import { Sparkles, Check, Plus } from "lucide-react";
import { COMPLAINT_QUICK_CHIPS } from "../visitDiaryTypes";

export interface ComplaintQuickChipsBarProps {
	readonly anamnesis?: string;
	readonly fieldsDisabled: boolean;
	readonly onAddComplaintChip: (chipText: string) => void;
}

export const ComplaintQuickChipsBar: React.FC<ComplaintQuickChipsBarProps> = ({
	anamnesis,
	fieldsDisabled,
	onAddComplaintChip,
}) => {
	if ((COMPLAINT_QUICK_CHIPS as readonly string[]).length === 0) return null;

	return (
		<div
			className="mt-1.5 dente-filter-chips overflow-x-auto no-scrollbar py-0.5 max-w-full flex-nowrap touch-pan-x"
			data-testid="complaint-quick-chips-bar"
		>
			<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1 shrink-0">
				<Sparkles className="w-3 h-3 text-[var(--teal,var(--brand-primary))]" />
				Быстрые жалобы:
			</span>
			{COMPLAINT_QUICK_CHIPS.map((chipText) => {
				const isApplied = (anamnesis ?? "").includes(chipText);
				return (
					<button
						key={chipText}
						type="button"
						onClick={() => onAddComplaintChip(chipText)}
						disabled={fieldsDisabled}
						className={`dente-filter-chip shrink-0 ${isApplied ? "active" : ""}`}
						data-active={isApplied}
						title={isApplied ? `Жалоба внесена: «${chipText}»` : `Внести в анамнез: «${chipText}»`}
						data-testid={`complaint-chip-${chipText}`}
					>
						{chipText}
						{isApplied ? <Check className="w-3 h-3 shrink-0" /> : <Plus className="w-3 h-3 opacity-60 shrink-0" />}
					</button>
				);
			})}
		</div>
	);
};
