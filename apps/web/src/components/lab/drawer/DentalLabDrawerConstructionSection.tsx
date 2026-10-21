import React from "react";
import {
	DENTAL_LAB_CONSTRUCTIONS,
	CANONICAL_LAB_WORK_TYPES,
	type DentalLabConstructionType,
} from "@dental/shared";
import { parseFdiTeethString } from "../dentalLabOrderEngine";
import { CANONICAL_6_ORTHOPEDIC_CHIPS } from "./constructionModules/constructionConstants";
import { DrawerFdiToothPicker } from "./constructionModules/DrawerFdiToothPicker";
import { DrawerQuickConstructionChips } from "./constructionModules/DrawerQuickConstructionChips";

export { CANONICAL_6_ORTHOPEDIC_CHIPS };

export interface DentalLabDrawerConstructionSectionProps {
	readonly formTeethInput: string;
	readonly setFormTeethInput: (val: string) => void;
	readonly formConstruction: DentalLabConstructionType | string;
	readonly onSelectConstruction: (val: string) => void;
}

export const DentalLabDrawerConstructionSection: React.FC<DentalLabDrawerConstructionSectionProps> = ({
	formTeethInput, setFormTeethInput, formConstruction, onSelectConstruction,
}) => {
	const selectedTeethList = parseFdiTeethString(formTeethInput);

	const toggleTooth = (t: number) => {
		if (selectedTeethList.includes(t)) {
			setFormTeethInput(selectedTeethList.filter((item) => item !== t).join(", "));
		} else {
			setFormTeethInput([...selectedTeethList, t].sort((a, b) => a - b).join(", "));
		}
	};

	return (
		<div className="space-y-2.5">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<div>
					<div className="flex items-center justify-between mb-1">
						<label className="font-semibold text-xs text-[var(--ink,#0f172a)]">Зубы FDI (11–48):</label>
						<span className="text-[10px] text-[var(--muted,#64748b)]">
							{selectedTeethList.length > 0 ? `Выбрано: ${selectedTeethList.length} ед.` : "1 тап по зубу"}
						</span>
					</div>
					<input
						type="text" required placeholder="16 или 11, 21 или 1.6"
						value={formTeethInput} onChange={(e) => setFormTeethInput(e.target.value)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold text-teal-700 dark:text-teal-300 focus:ring-1 focus:ring-teal-500 focus:outline-none"
						data-testid="form-teeth-fdi-input"
					/>
				</div>
				<div>
					<label className="font-semibold text-xs text-[var(--ink,#0f172a)] block mb-1">Вид конструкции:</label>
					<select
						value={formConstruction} onChange={(e) => onSelectConstruction(e.target.value)}
						className="w-full h-9 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold focus:ring-1 focus:ring-teal-500 focus:outline-none"
						data-testid="form-construction-select"
					>
						<optgroup label="Канонические ортопедические конструкции">
							{CANONICAL_6_ORTHOPEDIC_CHIPS.map((chip) => (<option key={chip.id} value={chip.id}>{chip.label}</option>))}
						</optgroup>
						<optgroup label="Клинические группы (съемные, каппы, шаблоны)">
							{Object.values(DENTAL_LAB_CONSTRUCTIONS).map((c) => (<option key={c.id} value={c.id}>{c.nameRu}</option>))}
						</optgroup>
						<optgroup label="Полный каталог конструкций ЗТЛ">
							{CANONICAL_LAB_WORK_TYPES.map((wt) => (<option key={wt.id} value={wt.id}>[{wt.id.toUpperCase()}] {wt.titleRu}</option>))}
						</optgroup>
					</select>
				</div>
			</div>

			<DrawerFdiToothPicker selectedTeethList={selectedTeethList} toggleTooth={toggleTooth} setFormTeethInput={setFormTeethInput} />
			<DrawerQuickConstructionChips formConstruction={formConstruction} onSelectConstruction={onSelectConstruction} setFormTeethInput={setFormTeethInput} />
		</div>
	);
};
