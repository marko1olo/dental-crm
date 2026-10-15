import React from "react";
import {
	DENTAL_LAB_CONSTRUCTIONS,
	CANONICAL_LAB_WORK_TYPES,
	type DentalLabConstructionType,
} from "@dental/shared";

export interface DentalLabDrawerConstructionSectionProps {
	readonly formTeethInput: string;
	readonly setFormTeethInput: (val: string) => void;
	readonly formConstruction: DentalLabConstructionType;
	readonly onSelectConstruction: (val: string) => void;
}

export const DentalLabDrawerConstructionSection: React.FC<DentalLabDrawerConstructionSectionProps> = ({
	formTeethInput,
	setFormTeethInput,
	formConstruction,
	onSelectConstruction,
}) => {
	return (
		<div className="space-y-2">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<div>
					<div className="flex items-center justify-between mb-1">
						<label className="font-semibold">Зубы FDI (11–48):</label>
						<span className="text-[10px] text-[var(--muted,#64748b)]">Формула</span>
					</div>
					<input
						type="text"
						required
						placeholder="16 или 11, 21"
						value={formTeethInput}
						onChange={(e) => setFormTeethInput(e.target.value)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold text-teal-700 dark:text-teal-300 focus:ring-1 focus:ring-teal-500 focus:outline-none"
						data-testid="form-teeth-fdi-input"
					/>
				</div>
				<div>
					<label className="font-semibold block mb-1">Вид конструкции:</label>
					<select
						value={formConstruction}
						onChange={(e) => onSelectConstruction(e.target.value)}
						className="w-full h-9 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
						data-testid="form-construction-select"
					>
						<optgroup label="Клинические группы (ортопедия, съемные, каппы)">
							{Object.values(DENTAL_LAB_CONSTRUCTIONS).map((c) => (
								<option key={c.id} value={c.id}>
									{c.nameRu}
								</option>
							))}
						</optgroup>
						<optgroup label="Каталог конструкций лаборатории">
							{CANONICAL_LAB_WORK_TYPES.map((wt) => (
								<option key={wt.id} value={wt.id}>
									[{wt.id.toUpperCase()}] {wt.titleRu}
								</option>
							))}
						</optgroup>
					</select>
				</div>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[10px] text-[var(--muted,#64748b)] font-semibold">Пресеты:</span>
				{[
					{ label: "16", val: "16" },
					{ label: "11, 21", val: "11, 21" },
					{ label: "Вся ВЧ (18–28)", val: "18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28" },
					{ label: "Вся НЧ (38–48)", val: "48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38" },
				].map((p) => (
					<button
						key={p.label}
						type="button"
						onClick={() => setFormTeethInput(p.val)}
						className="min-h-[28px] px-2 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink)] hover:border-[var(--teal)] font-bold text-[11px] shadow-2xs transition"
					>
						{p.label}
					</button>
				))}
			</div>
		</div>
	);
};
