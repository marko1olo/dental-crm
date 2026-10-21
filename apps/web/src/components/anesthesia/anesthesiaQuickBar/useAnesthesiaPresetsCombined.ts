import type { Dispatch, SetStateAction } from "react";
import type {
	AnestheticDrugId,
	InjectionTechniqueId,
} from "../anesthesiaCatalog";
import type { AsaPhysicalStatus } from "../anesthesiaEngine";
import type { AnesthesiaQuickBarProps } from "./types";
import { useAnesthesiaCorePresets } from "./useAnesthesiaCorePresets";
import { useAnesthesiaTargetedPresets } from "./useAnesthesiaTargetedPresets";

export function useAnesthesiaPresetsCombined(params: {
	props: AnesthesiaQuickBarProps;
	patientWeightKg: number;
	asaStatus: AsaPhysicalStatus;
	isCardioRisk: boolean;
	setSelectedDrugId: Dispatch<SetStateAction<AnestheticDrugId>>;
	setTechniqueId: Dispatch<SetStateAction<InjectionTechniqueId>>;
	showQuickToast: (message: string, duration?: number) => void;
}) {
	const presetProps = {
		...params.props,
		disabled: Boolean(params.props.disabled),
		patientWeightKg: params.patientWeightKg,
		patientAgeYears: params.props.patientAgeYears ?? 35,
		asaStatus: params.asaStatus,
		isCardioRisk: params.isCardioRisk,
		hasCardiovascularRisk: Boolean(
			params.props.hasCardiovascularRisk || params.isCardioRisk,
		),
		hasSulfiteAllergy: Boolean(params.props.hasSulfiteAllergy),
		hasBronchialAsthma: Boolean(params.props.hasBronchialAsthma),
		isPregnantOrLactating: Boolean(params.props.isPregnantOrLactating),
		setSelectedDrugId: params.setSelectedDrugId,
		setTechniqueId: params.setTechniqueId,
		showQuickToast: params.showQuickToast,
	};
	const corePresets = useAnesthesiaCorePresets(presetProps);
	const targetedPresets = useAnesthesiaTargetedPresets(presetProps);

	return {
		...corePresets,
		...targetedPresets,
	};
}
