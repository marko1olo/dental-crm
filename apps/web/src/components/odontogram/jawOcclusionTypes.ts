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

export function resolveJawTargetLabels(target: JawOrOcclusionTarget) {
	return {
		targetLabelRu:
			target === "JU"
				? "Верхняя челюсть (JU / Maxilla)"
				: target === "JL"
					? "Нижняя челюсть (JL / Mandibula)"
					: "Центральное соотношение / Прикус (C)",
		targetShortTitle:
			target === "JU"
				? "Верхняя челюсть"
				: target === "JL"
					? "Нижняя челюсть"
					: "Прикус",
	};
}
