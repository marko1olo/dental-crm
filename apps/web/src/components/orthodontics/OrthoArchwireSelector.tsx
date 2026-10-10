import React from "react";
import {
	WORKHORSE_ARCHWIRES,
	type WorkhorseArchwireOption,
} from "@dental/shared";
export type { WorkhorseArchwireOption };

import {
	ArchwireSelector,
	ARCHWIRE_MATERIALS,
	ROUND_SECTIONS,
	RECT_SECTIONS,
	TORQUE_PRESETS,
	ANGULATION_PRESETS,
} from "./orthodonticVisitProtocol/ArchwireSelector";
import {
	ElasticTractionMatrix,
	ELASTIC_SCHEMES,
	ELASTIC_SIZES,
} from "./orthodonticVisitProtocol/ElasticTractionMatrix";
import type {
	ArchwireMaterial,
	ArchwireSection,
	TorquePresetOption,
} from "./orthodonticVisitProtocol/types";

export {
	ARCHWIRE_MATERIALS,
	ROUND_SECTIONS,
	RECT_SECTIONS,
	TORQUE_PRESETS,
	ANGULATION_PRESETS,
	ELASTIC_SCHEMES,
	ELASTIC_SIZES,
};
export type { ArchwireMaterial, ArchwireSection, TorquePresetOption };

export interface OrthoArchwireSelectorProps {
	readonly archwireMaterial: ArchwireMaterial;
	readonly setArchwireMaterial: (material: ArchwireMaterial) => void;
	readonly archwireSection: ArchwireSection;
	readonly setArchwireSection: (section: ArchwireSection) => void;
	readonly onSelectWorkhorseArchwire: (wire: WorkhorseArchwireOption) => void;
	readonly torquePreset: string;
	readonly setTorquePreset: (presetId: string) => void;
	readonly angulationPreset: string;
	readonly setAngulationPreset: (presetId: string) => void;
	readonly elasticScheme: string;
	readonly setElasticScheme: (scheme: string) => void;
	readonly elasticSize: string;
	readonly setElasticSize: (size: string) => void;
	readonly onElasticSizeInteraction?: (() => void) | undefined;
}

export const OrthoArchwireSelector: React.FC<OrthoArchwireSelectorProps> = ({
	archwireMaterial,
	setArchwireMaterial,
	archwireSection,
	setArchwireSection,
	onSelectWorkhorseArchwire,
	torquePreset,
	setTorquePreset,
	angulationPreset,
	setAngulationPreset,
	elasticScheme,
	setElasticScheme,
	elasticSize,
	setElasticSize,
	onElasticSizeInteraction,
}) => {
	return (
		<div className="space-y-4" data-testid="ortho-archwire-selector">
			<ArchwireSelector
				archwireMaterial={archwireMaterial}
				setArchwireMaterial={setArchwireMaterial}
				archwireSection={archwireSection}
				setArchwireSection={setArchwireSection}
				onSelectWorkhorseArchwire={onSelectWorkhorseArchwire}
				torquePreset={torquePreset}
				setTorquePreset={setTorquePreset}
				angulationPreset={angulationPreset}
				setAngulationPreset={setAngulationPreset}
			/>

			<ElasticTractionMatrix
				elasticScheme={elasticScheme}
				setElasticScheme={setElasticScheme}
				elasticSize={elasticSize}
				setElasticSize={setElasticSize}
				{...(onElasticSizeInteraction ? { onElasticSizeInteraction } : {})}
			/>
		</div>
	);
};
