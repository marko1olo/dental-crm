export type JawOrOcclusionTarget = "JU" | "JL" | "C";

export const JAW_CODE_TO_NUMBER: Record<JawOrOcclusionTarget, 100 | 101 | 102> = {
	JU: 100,
	JL: 101,
	C: 102,
};

export interface JawFindingPreset {
	readonly id: string;
	readonly titleRu: string;
	readonly mkb10Code?: string | undefined;
	readonly isNorm?: boolean | undefined;
	readonly descriptionRu: string;
	readonly soapStatusLocalis: string;
	readonly recommendedPlanRu?: string | undefined;
}

export interface JawOcclusionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly initialTarget?: JawOrOcclusionTarget | undefined;
	readonly onApply?: ((finding: {
		code: JawOrOcclusionTarget;
		nameRu: string;
		titleRu: string;
		soapText: string;
		mkb10Code?: string | undefined;
	}) => void) | undefined;
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
