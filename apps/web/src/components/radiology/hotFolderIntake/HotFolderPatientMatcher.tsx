import React from "react";
import { CLINICAL_PURPOSES } from "../hotFolderTypes";
import { HotFolderFdiSelector } from "../HotFolderFdiSelector";
import type { HotFolderPatientMatcherProps } from "./types";

export const HotFolderPatientMatcher: React.FC<HotFolderPatientMatcherProps> = ({
	selectedTeeth,
	clinicalPurpose,
	protocolNote,
	onToggleTooth,
	onSelectAllTeeth,
	onSelectUpperArch,
	onSelectLowerArch,
	onSelectFrontal,
	onSelectRightMolar,
	onSelectLeftMolar,
	onSelectTeethBatch,
	onClinicalPurposeChange,
	onProtocolNoteChange,
}) => {
	return (
		<div className="hfi-right-content">
			{/* Section: FDI Dental Formula */}
			<HotFolderFdiSelector
				selectedTeeth={selectedTeeth}
				onToggleTooth={onToggleTooth}
				onSelectAllTeeth={onSelectAllTeeth}
				onSelectUpperArch={onSelectUpperArch}
				onSelectLowerArch={onSelectLowerArch}
				onSelectFrontal={onSelectFrontal}
				onSelectRightMolar={onSelectRightMolar}
				onSelectLeftMolar={onSelectLeftMolar}
			/>

			{/* Section: Bitewing Quick Presets */}
			<div className="hfi-fdi-quick-presets">
				<button
					type="button"
					onClick={() => onSelectTeethBatch(["17", "16", "15", "14", "47", "46", "45", "44"])}
					className="hfi-fdi-quick-chip"
					data-testid="hfi-bw-right-quick-btn"
				>
					Bite-wing R (14-17 / 44-47)
				</button>
				<button
					type="button"
					onClick={() => onSelectTeethBatch(["24", "25", "26", "27", "34", "35", "36", "37"])}
					className="hfi-fdi-quick-chip"
					data-testid="hfi-bw-left-quick-btn"
				>
					Bite-wing L (24-27 / 34-37)
				</button>
			</div>

			{/* Section: Clinical Purpose */}
			<div className="hfi-field-group">
				<label className="hfi-field-label">Клиническая цель исследования</label>
				<select
					value={clinicalPurpose}
					onChange={(e) => onClinicalPurposeChange(e.target.value)}
					className="hfi-select-input"
					data-testid="hfi-clinical-purpose-select"
				>
					{CLINICAL_PURPOSES.map((cp) => (
						<option key={cp.id} value={cp.id}>
							{cp.label}
						</option>
					))}
				</select>
			</div>

			{/* Section: Protocol 043/y note */}
			<div className="hfi-protocol-box">
				<div className="flex items-center justify-between">
					<label className="hfi-field-label">Протокол описания для медицинской карты</label>
					<span className="text-[10px] text-teal-400 font-semibold">Авто-шаблон</span>
				</div>
				<textarea
					value={protocolNote}
					onChange={(e) => onProtocolNoteChange(e.target.value)}
					className="hfi-protocol-textarea"
					data-testid="hfi-protocol-textarea"
					rows={4}
					placeholder="Введите описание рентгенограммы..."
				/>
			</div>
		</div>
	);
};
