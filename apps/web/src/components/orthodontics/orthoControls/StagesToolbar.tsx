import React from "react";
import { ORTHODONTIC_STAGE_TABS, type OrthodonticStageFilter } from "../orthoProtocolTypes";
import type { ArchwireMaterial, ArchwireSection } from "../OrthoArchwireSelector";

interface StagesToolbarProps {
	readonly stageFilter: OrthodonticStageFilter;
	readonly setStageFilter: (filter: OrthodonticStageFilter) => void;
	readonly setBracketSystem: (system: string) => void;
	readonly setArchwireMaterial: (mat: ArchwireMaterial) => void;
	readonly setArchwireSection: (sec: ArchwireSection) => void;
	readonly selectedActions: string[];
	readonly setSelectedActions: React.Dispatch<React.SetStateAction<string[]>>;
}

export const StagesToolbar: React.FC<StagesToolbarProps> = ({
	stageFilter,
	setStageFilter,
	setBracketSystem,
	setArchwireMaterial,
	setArchwireSection,
	selectedActions,
	setSelectedActions,
}) => {
	return (
		<div data-testid="ortho-stages-toolbar" className="dente-segmented-bar w-full shrink-0 shadow-2xs">
			{ORTHODONTIC_STAGE_TABS.map((stage) => {
				const isSelected = stageFilter === stage.id;
				return (
					<button
						key={stage.id}
						type="button"
						onClick={() => {
							setStageFilter(stage.id);
							if (stage.id === "aligners") {
								setBracketSystem("aligners");
							} else if (stage.id === "leveling") {
								setArchwireMaterial("NiTi");
								setArchwireSection(".014");
							} else if (stage.id === "working") {
								setArchwireMaterial("SS");
								setArchwireSection(".019x.025");
							} else if (stage.id === "finishing") {
								setArchwireMaterial("TMA");
								setArchwireSection(".017x.025");
							} else if (stage.id === "retention") {
								if (!selectedActions.includes("debonding")) {
									setSelectedActions((prev) => [...prev, "debonding"]);
								}
							}
						}}
						data-testid={`ortho-stage-tab-${stage.id}`}
						className={`dente-segmented-item ${isSelected ? "active" : ""}`}
						title={stage.desc}
					>
						<span className="hidden xl:inline">{stage.label}</span>
						<span className="xl:hidden">{stage.shortLabel}</span>
					</button>
				);
			})}
		</div>
	);
};
