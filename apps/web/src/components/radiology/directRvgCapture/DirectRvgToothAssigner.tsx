import React from "react";
import { FileText } from "lucide-react";
import { DirectRvgFdiSelector } from "../DirectRvgFdiSelector";
import { DirectRvgProjectionSelector } from "../DirectRvgProjectionSelector";
import type { DirectRvgToothAssignerProps } from "./types";

export const DirectRvgToothAssigner: React.FC<DirectRvgToothAssignerProps> = ({
	selectedTeeth,
	onToothToggle,
	onSelectTeeth,
	primaryTooth,
	primaryToothName,
	projectionType,
	onSelectProjectionType,
	patientCategory,
	onChangePatientCategory,
	anatomicalZone,
	onChangeAnatomicalZone,
	clinicalNotes,
	onChangeClinicalNotes,
}) => {
	return (
		<div className="rvg-controls-dock" data-testid="rvg-controls-dock">
			{/* 1. FDI Tooth Selector Matrix with Adult/Child switch */}
			<DirectRvgFdiSelector
				selectedTeeth={selectedTeeth}
				onToothToggle={onToothToggle}
				primaryTooth={primaryTooth}
				primaryToothName={primaryToothName}
				projectionType={projectionType}
				onSelectTeeth={onSelectTeeth}
				patientCategory={patientCategory}
				onChangePatientCategory={onChangePatientCategory}
			/>

			{/* 2. Projection Angle & 1-Click Anatomical Zone Presets */}
			<DirectRvgProjectionSelector
				projectionType={projectionType}
				onSelectProjectionType={onSelectProjectionType}
				patientCategory={patientCategory}
				onChangePatientCategory={onChangePatientCategory}
				anatomicalZone={anatomicalZone}
				onChangeAnatomicalZone={onChangeAnatomicalZone}
			/>

			{/* 3. Clinical Diary Note */}
			<div className="rvg-dock-section">
				<div className="rvg-section-header">
					<span className="rvg-section-header-title">
						<FileText className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
						Клиническое заключение
					</span>
				</div>
				<textarea
					value={clinicalNotes}
					onChange={(e) => onChangeClinicalNotes(e.target.value)}
					rows={3}
					className="w-full p-2.5 rounded-lg bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#334155)] text-xs leading-relaxed text-[var(--ink,#e2e8f0)] placeholder-[var(--muted,#94a3b8)] outline-none focus:border-[var(--teal,#0d9488)] transition-colors resize-y min-h-[64px]"
					placeholder="Диагностические примечания к снимку..."
					data-testid="rvg-clinical-notes-input"
				/>
			</div>
		</div>
	);
};

export default DirectRvgToothAssigner;
