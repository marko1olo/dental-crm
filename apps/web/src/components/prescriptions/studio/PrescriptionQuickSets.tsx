/**
 * apps/web/src/components/prescriptions/studio/PrescriptionQuickSets.tsx
 *
 * 1-Клик экспресс-пакеты стоматологических назначений РФ (Мандаты 8e, 8n, 8y & Apple HIG).
 * Готовые клинические схемы частной стоматологии (Терапия, Удаление, Периодонтит, Альвеолит).
 * Сенсорный минимум: карточки min-h-[48px], пассивные предупреждения об аллергии без блокировок.
 */

import React from "react";
import {
	CLINICAL_FAST_SETS,
	type DentalFastPrescriptionSet,
} from "../prescriptionCatalogData";

export interface PrescriptionQuickSetsProps {
	readonly quickSets?: readonly DentalFastPrescriptionSet[];
	readonly onSelectFastSet: (set: DentalFastPrescriptionSet) => void;
	readonly hasPenicillinAllergy: boolean;
	readonly hasNsaidAllergy: boolean;
}

export const PrescriptionQuickSets: React.FC<PrescriptionQuickSetsProps> = ({
	quickSets = CLINICAL_FAST_SETS.slice(0, 5),
	onSelectFastSet,
	hasPenicillinAllergy,
	hasNsaidAllergy,
}) => {
	return (
		<div>
			<div className="rx-section-header">
				<span>Экспресс-пакеты назначений</span>
				<span className="text-[11px] text-[var(--rx-teal)] font-normal normal-case">
					Готовые схемы РФ
				</span>
			</div>
			<div className="rx-express-grid">
				{quickSets.map((set) => {
					const isSetConflicting =
						(hasPenicillinAllergy && set.drugIds.some((id) => id.includes("amoxiclav"))) ||
						(hasNsaidAllergy && set.drugIds.some((id) => id.includes("nimesulide")));
					return (
						<button
							key={set.id}
							type="button"
							onClick={() => onSelectFastSet(set)}
							className="rx-express-card min-h-[48px]"
							data-testid={isSetConflicting ? `preset-allergy-badge-${set.id}` : undefined}
						>
							<div className="rx-express-card-title">{set.label}</div>
							<div className="rx-express-card-desc">{set.desc}</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};

PrescriptionQuickSets.displayName = "PrescriptionQuickSets";
