import React from "react";
import { PHASE_OPTIONS } from "../clinicalTasksPresets";
import type { ClinicalPhaseCode, CustomTaskType } from "../clinicalTasksTypes";

export interface ClinicalPhaseCompletionFormProps {
	readonly notes: string;
	readonly onNotesChange: (notes: string) => void;
	readonly submittingPhase: ClinicalPhaseCode | null;
	readonly onCompletePhase: (code: ClinicalPhaseCode) => void;
	readonly customTaskTypes: readonly CustomTaskType[] | null;
}

export const ClinicalPhaseCompletionForm: React.FC<ClinicalPhaseCompletionFormProps> = ({
	notes,
	onNotesChange,
	submittingPhase,
	onCompletePhase,
	customTaskTypes,
}) => {
	return (
		<div className="ops-form flex flex-col gap-1.5" style={{ marginBottom: "1rem" }}>
			<label className="ops-label text-sm font-medium text-[var(--ink)] block" htmlFor="clinical-tasks-notes">
				Комментарий к передаче (необязательно)
			</label>
			<textarea
				id="clinical-tasks-notes"
				className="ops-textarea w-full"
				style={{ width: "100%", display: "block" }}
				rows={2}
				value={notes}
				disabled={false}
				onChange={(event) => onNotesChange(event.target.value)}
				placeholder="Например: зубы 16 и 17 готовы к препарированию под коронки"
			/>
			<div
				className="ops-actions"
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "0.5rem",
					marginTop: "0.75rem",
				}}
			>
				{PHASE_OPTIONS.map((option) => (
					<button
						key={option.code}
						className="primary-button"
						type="button"
						title={option.hint}
						disabled={false}
						onClick={() => void onCompletePhase(option.code)}
					>
						{submittingPhase === option.code ? "Записываю…" : option.buttonLabel}
					</button>
				))}
				{customTaskTypes?.map((type) => (
					<button
						key={type.typeCode}
						className="secondary-button"
						type="button"
						title={type.typeLabel}
						disabled={false}
						style={{ borderColor: type.colorHex, color: type.colorHex }}
						onClick={() => void onCompletePhase(type.typeCode as ClinicalPhaseCode)}
					>
						{submittingPhase === type.typeCode ? "Записываю…" : type.typeLabel}
					</button>
				))}
			</div>
		</div>
	);
};
