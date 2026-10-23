/**
 * PerioToothInspectorHeader.tsx — Заголовок инспектора: номер зуба, статус имплантата, подвижность Miller, фуркация Hamp.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import { FURCATION_GRADES, isFurcationEligibleTooth, MOBILITY_GRADES, type PerioToothRecord } from "@dental/shared";
import { Check } from "lucide-react";
import React from "react";
import { getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols";

export interface PerioToothInspectorHeaderProps {
	readonly selectedTooth: PerioToothRecord;
	readonly readOnly?: boolean | undefined;
	readonly onUpdateToothProperties: (
		toothNumber: number,
		patch: Partial<Pick<PerioToothRecord, "isMissing" | "isImplant" | "mobility" | "furcation">>,
	) => void;
}

export const PerioToothInspectorHeader: React.FC<PerioToothInspectorHeaderProps> = React.memo(({
	selectedTooth, readOnly = false, onUpdateToothProperties,
}) => {
	const num = selectedTooth.toothNumber;

	return (
		<div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--line)]">
			<div className="flex items-center gap-2 min-w-0">
				<span className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 font-black text-sm flex items-center justify-center border border-teal-500/30 shrink-0">
					{num}
				</span>
				<div className="min-w-0">
					<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">
						{getToothFolkAndAnatomicalNameRu(num)}
					</h4>
					<span className="text-[10px] text-[var(--muted)] truncate block">
						{selectedTooth.isMissing ? "Зуб отсутствует" : selectedTooth.isImplant ? "Дентальный имплантат" : "Естественный зуб"}
					</span>
				</div>
			</div>

			{!readOnly && (
				<div className="flex items-center gap-2 flex-wrap text-xs">
					<button
						type="button"
						onClick={() => onUpdateToothProperties(num, { isMissing: !selectedTooth.isMissing })}
						className={`secondary-button ${selectedTooth.isMissing ? "!bg-slate-200 dark:!bg-slate-700 !text-slate-900 dark:!text-white font-semibold" : ""}`}
					>
						<span>{selectedTooth.isMissing ? "Отсутствует" : "Отметить отсутствующим"}</span>
						{selectedTooth.isMissing && <Check size={14} className="text-slate-900 dark:text-white" />}
					</button>

					<button
						type="button"
						onClick={() => onUpdateToothProperties(num, { isImplant: !selectedTooth.isImplant })}
						className={`secondary-button ${selectedTooth.isImplant ? "!bg-amber-500/20 !text-amber-700 dark:!text-amber-300 !border-amber-500/50 font-semibold" : ""}`}
					>
						<span>Имплантат</span>
						{selectedTooth.isImplant && <Check size={14} className="text-amber-600 dark:text-amber-300" />}
					</button>

					{/* Mobility (Miller 0..III) */}
					<div className="dente-segmented-bar h-8 px-1.5 flex items-center gap-1 shadow-2xs">
						<span className="text-[12px] font-semibold text-[var(--muted)] px-1 select-none">Miller:</span>
						{([0, 1, 2, 3] as const).map((grade) => (
							<button
								key={grade} type="button"
								onClick={() => onUpdateToothProperties(num, { mobility: grade })}
								className={`dente-segmented-item !h-6 !min-h-[24px] !max-h-[24px] !px-2 text-[12px] ${selectedTooth.mobility === grade ? "active" : ""}`}
								data-testid={`inspector-mobility-${grade}`}
							>
								{grade === 0 ? "0" : MOBILITY_GRADES[grade]?.codeRu}
							</button>
						))}
					</div>

					{/* Furcation (Hamp I..IV) */}
					{isFurcationEligibleTooth(num) && (
						<div className="dente-segmented-bar h-8 px-1.5 flex items-center gap-1 shadow-2xs">
							<span className="text-[12px] font-semibold text-[var(--muted)] px-1 select-none">Hamp:</span>
							{([0, 1, 2, 3, 4] as const).map((grade) => (
								<button
									key={grade} type="button"
									onClick={() => onUpdateToothProperties(num, { furcation: grade })}
									className={`dente-segmented-item !h-6 !min-h-[24px] !max-h-[24px] !px-2 text-[12px] ${selectedTooth.furcation === grade ? "active" : ""}`}
									data-testid={`inspector-furcation-${grade}`}
								>
									{grade === 0 ? "0" : FURCATION_GRADES[grade]?.codeRu}
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
});

PerioToothInspectorHeader.displayName = "PerioToothInspectorHeader";
