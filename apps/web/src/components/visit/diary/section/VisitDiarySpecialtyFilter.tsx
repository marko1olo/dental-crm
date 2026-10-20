import React from "react";
import {
	CLINICAL_SPECIALTY_SECTIONS,
	type ClinicalSpecialtySection,
} from "../../clinicalSpecialtySections";

export interface VisitDiarySpecialtyFilterProps {
	readonly activeSpecialtyCategory: string;
	readonly onSelectSpecialty: (id: string) => void;
}

export const VisitDiarySpecialtyFilter: React.FC<VisitDiarySpecialtyFilterProps> = ({
	activeSpecialtyCategory,
	onSelectSpecialty,
}) => {
	return (
		<div
			className="flex items-center gap-1.5 flex-wrap min-w-0 py-0.5"
			data-testid="clinical-category-chips-bar"
			role="tablist"
			aria-label="Специальности клинических протоколов"
		>
			{CLINICAL_SPECIALTY_SECTIONS.map((sec: ClinicalSpecialtySection) => {
				const IconComponent = sec.icon;
				const isActive = activeSpecialtyCategory === sec.id;
				return (
					<button
						key={sec.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => onSelectSpecialty(sec.id)}
						data-testid={`btn-specialty-category-${sec.id}`}
						data-active={isActive}
						className={`flex items-center gap-1.5 text-xs font-bold rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer select-none shadow-2xs border ${
							isActive
								? "border-[var(--teal)] bg-[var(--teal-soft,rgba(13,148,136,0.14))] text-[var(--teal-dark,var(--teal,#0f766e))] shadow-xs"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
						}`}
						title={`Клинические протоколы: ${sec.label}`}
					>
						<IconComponent size={13} className="shrink-0 text-[var(--teal)]" />
						<span className="whitespace-nowrap">{sec.label}</span>
					</button>
				);
			})}
		</div>
	);
};
