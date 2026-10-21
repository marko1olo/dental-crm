export type JawOrOcclusionTarget = "JU" | "JL" | "C";

export interface JawFindingPreset {
	readonly id: string;
	readonly titleRu: string;
	readonly mkb10Code?: string;
	readonly isNorm?: boolean;
	readonly descriptionRu: string;
	readonly soapStatusLocalis: string;
	readonly recommendedPlanRu?: string;
}

export interface JawOcclusionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTarget?: JawOrOcclusionTarget;
	readonly onApply?: (finding: {
		code: JawOrOcclusionTarget;
		nameRu: string;
		titleRu: string;
		soapText: string;
		mkb10Code?: string;
	}) => void;
}
