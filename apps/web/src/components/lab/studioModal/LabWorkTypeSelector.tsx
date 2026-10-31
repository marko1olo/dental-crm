/**
 * apps/web/src/components/lab/studioModal/LabWorkTypeSelector.tsx
 *
 * DENTE Dental CRM — Dental Lab Work Type, Laboratory & Schedule Selector.
 * Selects orthopedic material/construction, partner lab, turnaround date, and urgency.
 * Mandate 8b modular design, Mandate 8e chairside express autonomy.
 */

import React from "react";
import {
	CANONICAL_LAB_MATERIALS,
	CLINIC_LABORATORIES,
	formatKopecksToRubles,
} from "../dentalLabCatalogData";

export interface LabWorkTypeSelectorProps {
	readonly selectedMaterialId: string;
	readonly onSelectMaterialId: (materialId: string) => void;
	readonly selectedLab: string;
	readonly onSelectLab: (lab: string) => void;
	readonly customDueDate: string;
	readonly onChangeDueDate: (date: string) => void;
	readonly isUrgent: boolean;
	readonly onToggleUrgent: (urgent: boolean) => void;
	readonly notes: string;
	readonly onChangeNotes: (notes: string) => void;
}

export const LabWorkTypeSelector: React.FC<LabWorkTypeSelectorProps> = ({
	selectedMaterialId,
	onSelectMaterialId,
	selectedLab,
	onSelectLab,
	customDueDate,
	onChangeDueDate,
	isUrgent,
	onToggleUrgent,
	notes,
	onChangeNotes,
}) => {
	return (
		<div className="space-y-3 shrink-0">
			{/* Выбор материала и конструкции */}
			<div>
				<label className="block text-[11px] font-semibold text-[var(--ink)] mb-1">
					Материал и конструкция:
				</label>
				<select
					data-testid="lab-material-select"
					value={selectedMaterialId}
					onChange={(e) => onSelectMaterialId(e.target.value)}
					className="w-full text-xs font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl px-2.5 py-2 outline-none focus:border-[var(--teal)] transition-colors"
				>
					{CANONICAL_LAB_MATERIALS.map((mat) => (
						<option key={mat.id} value={mat.id}>
							{mat.titleRu} ({mat.defaultDurationDays} дн. / {formatKopecksToRubles(mat.baseLabCostKopecks)})
						</option>
					))}
				</select>
			</div>

			{/* Лаборатория и дата готовности */}
			<div className="grid grid-cols-2 gap-2">
				<div>
					<label className="block text-[11px] font-semibold text-[var(--ink)] mb-1">
						Лаборатория:
					</label>
					<select
						data-testid="lab-partner-select"
						value={selectedLab}
						onChange={(e) => onSelectLab(e.target.value)}
						className="w-full text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl px-2 py-1.5 outline-none focus:border-[var(--teal)]"
					>
						{CLINIC_LABORATORIES.map((lab) => (
							<option key={lab} value={lab}>
								{lab}
							</option>
						))}
					</select>
				</div>
				<div>
					<label className="block text-[11px] font-semibold text-[var(--ink)] mb-1">
						Срок готовности:
					</label>
					<input
						type="date"
						data-testid="lab-due-date-input"
						value={customDueDate}
						onChange={(e) => onChangeDueDate(e.target.value)}
						className="w-full text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl px-2 py-1.5 outline-none focus:border-[var(--teal)]"
					>
					</input>
				</div>
			</div>

			{/* Срочность и примечание технику */}
			<div className="space-y-1.5">
				<label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--ink)]">
					<input
						type="checkbox"
						data-testid="lab-urgent-checkbox"
						checked={isUrgent}
						onChange={(e) => onToggleUrgent(e.target.checked)}
						className="rounded border-[var(--line)] text-[var(--teal)] focus:ring-[var(--teal)] w-4 h-4 cursor-pointer"
					/>
					<span className="text-[var(--rose-ink,#e11d48)] font-semibold text-xs">
						Срочный наряд (экспресс)
					</span>
				</label>

				<input
					type="text"
					data-testid="lab-notes-input"
					placeholder="Примечание технику (уступ, прикус, особенности)..."
					value={notes}
					onChange={(e) => onChangeNotes(e.target.value)}
					className="w-full text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl px-2.5 py-1.5 placeholder:text-[var(--ink-muted)] outline-none focus:border-[var(--teal)]"
				/>
			</div>
		</div>
	);
};

export default LabWorkTypeSelector;
