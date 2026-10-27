import type React from "react";
import type { RecallCycleType } from "./patientRecallEngine";
import { RECALL_CYCLE_PRESETS } from "./recallCyclePresetsConfig";

export interface RecallCycleSegmentedBarProps {
	readonly selectedCycle: RecallCycleType | "all";
	readonly onSelectedCycleChange: (cycle: RecallCycleType | "all") => void;
	readonly countsByCycle?: Partial<Record<RecallCycleType | "all", number>> | undefined;
}

export const RecallCycleSegmentedBar: React.FC<RecallCycleSegmentedBarProps> = ({
	selectedCycle,
	onSelectedCycleChange,
	countsByCycle,
}) => {
	const handleClick = (presetId: RecallCycleType | "all") => {
		if (presetId === "all") {
			onSelectedCycleChange("all");
		} else {
			onSelectedCycleChange(selectedCycle === presetId ? "all" : presetId);
		}
	};

	return (
		<div
			className="recall-solo-presets"
			role="group"
			aria-label="Быстрый фильтр циклов возврата"
		>
			{RECALL_CYCLE_PRESETS.map((p) => {
				const Icon = p.icon;
				const count = p.getCountKey(countsByCycle);
				const isActive = selectedCycle === p.id;
				return (
					<button
						key={p.id}
						type="button"
						data-testid={p.testId}
						className={`recall-preset-btn ${isActive ? "active" : ""}`}
						onClick={() => handleClick(p.id)}
						title={p.title}
						style={{ minHeight: "44px" }}
					>
						{Icon && <Icon size={16} />}
						<span className="recall-preset-label-full">{p.labelFull}</span>
						<span className="recall-preset-label-short">{p.labelShort}</span>
						{typeof count === "number" && (
							<span className="recall-chip-badge">{count}</span>
						)}
					</button>
				);
			})}
		</div>
	);
};
