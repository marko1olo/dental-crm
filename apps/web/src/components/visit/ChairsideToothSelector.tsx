/**
 * ChairsideToothSelector.tsx
 * Chairside Tooth Selector HUD with single/multi-select, quick groups and FDI grid.
 */

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Layers, Target, X } from "lucide-react";
import { useVisitStore } from "../../store/visitStore";
import { getToothBadgeColor } from "./chairsideToothColors.js";
import { ChairsideToothQuickGroups } from "./ChairsideToothQuickGroups.js";
import { ChairsideToothQuickChips } from "./ChairsideToothQuickChips.js";
import { ChairsideToothFdiGrid } from "./ChairsideToothFdiGrid.js";

export * from "./chairsideToothColors.js";

export interface ChairsideToothSelectorProps {
	selectedTooth: string | null;
	onSelectTooth: (tooth: string | null) => void;
	isToothGridOpen: boolean;
	onToggleToothGrid: () => void;
}

export const ChairsideToothSelector: React.FC<ChairsideToothSelectorProps> = ({
	selectedTooth, onSelectTooth, isToothGridOpen, onToggleToothGrid,
}) => {
	const toothStateByCode = useVisitStore((state) => state.visitToothStateByCode);
	const [isMultiSelect, setIsMultiSelect] = useState<boolean>(() => Boolean(selectedTooth && selectedTooth.includes(",")));
	const selectedTeethList = useMemo(() => selectedTooth ? selectedTooth.split(",").map((t) => t.trim()).filter(Boolean) : [], [selectedTooth]);

	const handleToothClick = (t: string | number) => {
		const str = String(t);
		if (isMultiSelect) {
			const next = selectedTeethList.includes(str) ? selectedTeethList.filter((x) => x !== str) : [...selectedTeethList, str].sort((a, b) => Number(a) - Number(b));
			onSelectTooth(next.length > 0 ? next.join(", ") : null);
			useVisitStore.getState().setActiveToothNumber(next.length === 1 ? Number(next[0]) : null);
		} else {
			const next = selectedTooth === str ? null : str;
			onSelectTooth(next);
			useVisitStore.getState().setActiveToothNumber(next ? Number(next) : null);
		}
	};

	const handleClear = () => {
		onSelectTooth(null);
		useVisitStore.getState().setActiveToothNumber(null);
	};
	const firstTooth = selectedTeethList[0];

	return (
		<div className="mb-3 p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
						<Target className="w-3.5 h-3.5 text-[var(--teal)]" />
						Привязка к зубу:
					</span>
					{selectedTeethList.length > 0 ? (
						<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal-dark,var(--teal,#0f766e))] border border-[var(--teal)]/30">
							{selectedTeethList.length === 1 && firstTooth !== undefined ? (
								<>
									<span>Зуб {firstTooth}</span>
									{getToothBadgeColor(toothStateByCode[firstTooth]) && (
										<span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getToothBadgeColor(toothStateByCode[firstTooth])! }} />
									)}
								</>
							) : <span>Зубы: {selectedTeethList.join(", ")} ({selectedTeethList.length})</span>}
							<button type="button" onClick={handleClear} className="hover:text-[var(--ink)] p-0.5 rounded-full min-w-[20px] min-h-[20px] inline-flex items-center justify-center cursor-pointer" title="Сбросить">
								<X className="w-3.5 h-3.5" />
							</button>
						</span>
					) : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--paper)] text-[var(--ink-muted)] border border-[var(--line)]">Без зуба (общая услуга)</span>}
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => setIsMultiSelect(!isMultiSelect)}
						className={`dente-filter-chip text-xs min-h-[32px] sm:min-h-[36px] h-8 sm:h-9 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${isMultiSelect ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal-strong,#0f766e)] shadow-xs font-bold" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"}`}
					>
						<Layers className="w-3.5 h-3.5" />
						<span>{isMultiSelect ? "Группа (вкл.)" : "Выбор группы"}</span>
					</button>
					<button
						type="button"
						onClick={onToggleToothGrid}
						className="dente-filter-chip text-xs text-[var(--ink)] hover:text-[var(--teal)] font-medium flex items-center gap-1 min-h-[32px] sm:min-h-[36px] h-8 sm:h-9 px-3 rounded-lg bg-[var(--paper)] transition-colors cursor-pointer border border-[var(--line)] hover:border-[var(--teal)]"
					>
						{isToothGridOpen ? <>Скрыть формулу <ChevronUp className="w-3.5 h-3.5" /></> : <>Все 32 зуба (11–48) <ChevronDown className="w-3.5 h-3.5" /></>}
					</button>
				</div>
			</div>

			{isMultiSelect && (
				<ChairsideToothQuickGroups
					onSelectGroup={(teeth) => { onSelectTooth(teeth.join(", ")); if (teeth.length === 1 && teeth[0] !== undefined) useVisitStore.getState().setActiveToothNumber(teeth[0]); }}
					onClear={handleClear}
					hasSelectedTeeth={selectedTeethList.length > 0}
				/>
			)}

			<ChairsideToothQuickChips
				selectedTeethList={selectedTeethList}
				toothStateByCode={toothStateByCode}
				onClear={handleClear}
				onToothClick={(t) => handleToothClick(t)}
			/>

			{isToothGridOpen && <ChairsideToothFdiGrid selectedTeethList={selectedTeethList} toothStateByCode={toothStateByCode} onToothClick={(t) => handleToothClick(t)} />}
		</div>
	);
};
