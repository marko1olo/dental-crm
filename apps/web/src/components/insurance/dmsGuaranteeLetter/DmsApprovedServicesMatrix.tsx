/**
 * DmsApprovedServicesMatrix.tsx — Матрица исключений программы ДМС,
 * согласованных услуг, диагнозов МКБ-10, зубов FDI и калькулятора счета визита.
 * (Мандат 8b: <= 120 строк)
 */

import React, { useId } from "react";
import { DmsBillSplitCalculatorSection } from "../DmsBillSplitCalculatorSection.js";
import { DmsExclusionsSelectorCard } from "../DmsExclusionsSelectorCard.js";
import { DmsNomenclatureSelectorCard } from "../DmsNomenclatureSelectorCard.js";
import { DmsApprovedTeethSelector } from "./DmsApprovedTeethSelector.js";
import { getActiveBillItemsToSplit, type BillItemToSplit, type SplitEngineGuaranteeLetter } from "./types.js";

export { DmsApprovedTeethSelector } from "./DmsApprovedTeethSelector.js";

export interface DmsApprovedServicesMatrixProps {
	readonly selectedExclusions: readonly string[];
	readonly approvedServiceCodes: readonly string[];
	readonly approvedDiagnosisCodes: readonly string[];
	readonly approvedTeethFdi: readonly string[];
	readonly letterForSplit: SplitEngineGuaranteeLetter;
	readonly billItems?: readonly BillItemToSplit[] | undefined;
	readonly notes: string;
	readonly onToggleExclusion: (exclusionKey: string) => void;
	readonly onToggleApprovedService: (code: string) => void;
	readonly onToggleDiagnosis: (code: string) => void;
	readonly onToggleApprovedTooth: (toothFdi: string) => void;
	readonly onNotesChange: (val: string) => void;
}

export function DmsApprovedServicesMatrix({
	selectedExclusions,
	approvedServiceCodes,
	approvedDiagnosisCodes,
	approvedTeethFdi,
	letterForSplit,
	billItems,
	notes,
	onToggleExclusion,
	onToggleApprovedService,
	onToggleDiagnosis,
	onToggleApprovedTooth,
	onNotesChange,
}: DmsApprovedServicesMatrixProps) {
	const notesTextareaId = useId();

	return (
		<>
			<DmsExclusionsSelectorCard
				selectedExclusions={selectedExclusions}
				onToggleExclusion={onToggleExclusion}
			/>
			<DmsNomenclatureSelectorCard
				approvedServiceCodes={approvedServiceCodes}
				approvedDiagnosisCodes={approvedDiagnosisCodes}
				onToggleApprovedService={onToggleApprovedService}
				onToggleDiagnosis={onToggleDiagnosis}
			/>
			<DmsApprovedTeethSelector
				approvedTeethFdi={approvedTeethFdi}
				onToggleApprovedTooth={onToggleApprovedTooth}
			/>
			<DmsBillSplitCalculatorSection
				letter={letterForSplit}
				billItems={billItems ?? getActiveBillItemsToSplit()}
			/>
			<div className="dms-field-group">
				<label htmlFor={notesTextareaId} className="dms-label">
					Служебные примечания и комментарии куратора страховой компании
				</label>
				<textarea
					id={notesTextareaId}
					rows={2}
					placeholder="Например: Согласовано депульпирование зуба 1.6 по острой боли куратором"
					value={notes}
					onChange={(e) => onNotesChange(e.target.value)}
					className="dms-textarea"
				/>
			</div>
		</>
	);
}
