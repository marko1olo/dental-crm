import type React from "react";
import type { OrthoClinicalPresetId, TargetArch } from "./orthoProtocolTypes";
import type { BracketSlot } from "./OrthoBracketProtocolSection";
import type { ArchwireMaterial, ArchwireSection } from "./OrthoArchwireSelector";
import { useWireActivationPresets } from "./clinicalPresets/useWireActivationPresets";
import { useAdvancedWirePresets } from "./clinicalPresets/useAdvancedWirePresets";
import { useBondingPresets } from "./clinicalPresets/useBondingPresets";
import { useLabOrderPresets } from "./clinicalPresets/useLabOrderPresets";
import { useAlignerPresets } from "./clinicalPresets/useAlignerPresets";

export interface UseOrthoClinicalPresetsOptions {
	patientName: string;
	selectedTeeth: number[];
	isSplitArchAligners: boolean;
	alignerStep: number;
	alignerTotal: number;
	alignerStepUpper: number;
	alignerTotalUpper: number;
	alignerStepLower: number;
	alignerTotalLower: number;
	targetArch: TargetArch;
	setActivePreset: (preset: OrthoClinicalPresetId | null) => void;
	setTargetArch: (arch: TargetArch) => void;
	setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	setBracketSlot: (slot: BracketSlot) => void;
	setBracketSystem: (system: string) => void;
	setArchwireMaterial: (material: ArchwireMaterial) => void;
	setArchwireSection: (section: ArchwireSection) => void;
	setSelectedActions: React.Dispatch<React.SetStateAction<string[]>>;
	setElasticScheme: (scheme: string) => void;
	setElasticSize: (size: string) => void;
	setElasticWear: (wear: string) => void;
	setNotes: React.Dispatch<React.SetStateAction<string>>;
}

export function useOrthoClinicalPresets(options: UseOrthoClinicalPresetsOptions) {
	const wirePresets = useWireActivationPresets(options);
	const advancedWirePresets = useAdvancedWirePresets(options);
	const bondingPresets = useBondingPresets(options);
	const labOrderPresets = useLabOrderPresets(options);
	const alignerPresets = useAlignerPresets(options);

	return {
		...wirePresets,
		...advancedWirePresets,
		...bondingPresets,
		...labOrderPresets,
		...alignerPresets,
	};
}
