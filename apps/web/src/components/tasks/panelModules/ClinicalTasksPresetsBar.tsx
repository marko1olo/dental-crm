import React from "react";
import { CLINICAL_TASK_PRESETS } from "../clinicalTasksPresets";
import type { ClinicalTaskPreset } from "../clinicalTasksTypes";

export interface ClinicalTasksPresetsBarProps {
	readonly onCreatePresetTask: (preset: ClinicalTaskPreset) => void;
}

export const ClinicalTasksPresetsBar: React.FC<ClinicalTasksPresetsBarProps> = ({
	onCreatePresetTask,
}) => {
	return (
		<div
			className="clinical-task-presets"
			style={{
				marginBottom: "1rem",
				padding: "0.75rem",
				background: "var(--paper-soft, #f8fafc)",
				borderRadius: "8px",
				border: "1px solid var(--line, #e2e8f0)",
			}}
		>
			<span
				className="ops-label"
				style={{
					display: "block",
					marginBottom: "0.5rem",
					fontWeight: 600,
					fontSize: "0.85rem",
					color: "var(--ink, #1e293b)",
				}}
			>
				Быстрые клинические пресеты:
			</span>
			<div
				className="ops-actions"
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "0.5rem",
				}}
			>
				{CLINICAL_TASK_PRESETS.map((preset) => (
					<button
						key={preset.id}
						className="secondary-button"
						type="button"
						data-testid={preset.testId}
						title={preset.hint}
						disabled={false}
						onClick={() => void onCreatePresetTask(preset)}
						style={{
							fontSize: "0.82rem",
							minHeight: "36px",
							padding: "0 0.75rem",
							borderRadius: "8px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
						}}
					>
						{preset.label}
					</button>
				))}
			</div>
		</div>
	);
};
