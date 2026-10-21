import React, { useMemo } from "react";
import { Link2, Check } from "lucide-react";
import {
	FDI_UPPER_RIGHT,
	FDI_UPPER_LEFT,
	FDI_LOWER_LEFT,
	FDI_LOWER_RIGHT,
} from "./teethSelectorModules/teethConstants";
import { FdiQuadrantRow } from "./teethSelectorModules/FdiQuadrantRow";

export interface LabOrderTeethSelectorProps {
	readonly value: string;
	readonly onChange: (teethStr: string, parsedTeeth: number[]) => void;
	readonly isBridge: boolean;
	readonly onToggleBridge: (isBridge: boolean) => void;
}

export const LabOrderTeethSelector: React.FC<LabOrderTeethSelectorProps> = ({
	value, onChange, isBridge, onToggleBridge,
}) => {
	const selectedTeethSet = useMemo(() => {
		const numbers = value
			.split(",")
			.map((s) => Number.parseInt(s.trim(), 10))
			.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 48);
		return new Set<number>(numbers);
	}, [value]);

	const toggleTooth = (tooth: number) => {
		const nextSet = new Set(selectedTeethSet);
		if (nextSet.has(tooth)) nextSet.delete(tooth); else nextSet.add(tooth);
		const sorted = Array.from(nextSet).sort((a, b) => a - b);
		onChange(sorted.join(", "), sorted);
	};

	const selectAllInQuadrant = (quadrant: readonly number[]) => {
		const allSelected = quadrant.every((t) => selectedTeethSet.has(t));
		const nextSet = new Set(selectedTeethSet);
		for (const t of quadrant) { if (allSelected) nextSet.delete(t); else nextSet.add(t); }
		const sorted = Array.from(nextSet).sort((a, b) => a - b);
		onChange(sorted.join(", "), sorted);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<label className="ztl-form-label mb-0" htmlFor="teeth-input-field">
					Зубы по формуле FDI (клик по схеме или через запятую)
				</label>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onToggleBridge(!isBridge)}
						className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
							isBridge
								? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 font-semibold"
								: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--muted,#64748b)] hover:text-[var(--ink,#1e293b)]"
						}`}
						data-testid="toggle-bridge-mode-btn"
						title="Переключить тип конструкции: мостовидный протез с промежуточной частью"
					>
						<Link2 size={13} className={isBridge ? "text-amber-600" : "text-slate-400"} />
						<span>{isBridge ? "Мостовидный протез (с понтиком)" : "Одиночные коронки"}</span>
					</button>
				</div>
			</div>

			<div className="relative">
				<input
					id="teeth-input-field" type="text" className="ztl-form-input w-full"
					placeholder="например: 14, 15, 16" value={value} data-testid="teeth-input"
					onChange={(e) => {
						const raw = e.target.value;
						const parsed = raw.split(",").map((s) => Number.parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n) && n >= 11 && n <= 48);
						onChange(raw, parsed);
					}}
				/>
				{selectedTeethSet.size > 0 && (
					<span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted,#64748b)] dark:text-slate-400 pointer-events-none">
						Выбрано: {selectedTeethSet.size} {selectedTeethSet.size === 1 ? "зуб" : "ед."}
					</span>
				)}
			</div>

			<div className="p-2 sm:p-3 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900/60 select-none">
				<FdiQuadrantRow
					title="Верхняя челюсть (18..11 · 21..28)"
					leftQuadrant={FDI_UPPER_RIGHT} rightQuadrant={FDI_UPPER_LEFT}
					leftLabel="Q1 (18..11)" rightLabel="Q2 (21..28)"
					selectedTeethSet={selectedTeethSet} toggleTooth={toggleTooth}
					selectAllInQuadrant={selectAllInQuadrant}
				/>
				<FdiQuadrantRow
					title="Нижняя челюсть (48..41 · 31..38)"
					leftQuadrant={FDI_LOWER_RIGHT} rightQuadrant={FDI_LOWER_LEFT}
					leftLabel="Q4 (48..41)" rightLabel="Q3 (31..38)"
					selectedTeethSet={selectedTeethSet} toggleTooth={toggleTooth}
					selectAllInQuadrant={selectAllInQuadrant} isLower
				/>
			</div>

			{isBridge && selectedTeethSet.size >= 2 && (
				<div className="flex items-center gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
					<Check size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span>
						Мостовидная протяженность: зубы {Array.from(selectedTeethSet).sort((a,b)=>a-b).join("—")}.
						Технику будет указано смоделировать монолитный каркас с промежуточной балкой.
					</span>
				</div>
			)}
		</div>
	);
};
