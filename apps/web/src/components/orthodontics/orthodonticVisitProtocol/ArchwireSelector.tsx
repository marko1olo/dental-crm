import React from "react";
import type { ArchwireSelectorProps } from "./types";
import { ArchwireMaterialAndSection } from "./archwire/ArchwireMaterialAndSection";
import { WorkhorseWiresStrip } from "./archwire/WorkhorseWiresStrip";
import { TorqueAngulationPanel } from "./archwire/TorqueAngulationPanel";

export * from "./archwire/archwireConstants";

export const ArchwireSelector: React.FC<ArchwireSelectorProps> = ({
	archwireMaterial,
	setArchwireMaterial,
	archwireSection,
	setArchwireSection,
	onSelectWorkhorseArchwire,
	torquePreset,
	setTorquePreset,
	angulationPreset,
	setAngulationPreset,
}) => {
	return (
		<div className="space-y-4" data-testid="ortho-archwire-selector">
			<ArchwireMaterialAndSection
				archwireMaterial={archwireMaterial}
				setArchwireMaterial={setArchwireMaterial}
				archwireSection={archwireSection}
				setArchwireSection={setArchwireSection}
			/>

			<WorkhorseWiresStrip
				archwireMaterial={archwireMaterial}
				archwireSection={archwireSection}
				onSelectWorkhorseArchwire={onSelectWorkhorseArchwire}
			/>

			<TorqueAngulationPanel
				torquePreset={torquePreset}
				setTorquePreset={setTorquePreset}
				angulationPreset={angulationPreset}
				setAngulationPreset={setAngulationPreset}
			/>
		</div>
	);
};
