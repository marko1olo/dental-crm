import { useMemo } from "react";
import { calculateClinicalProtocol } from "./protocolCalculation";
import type { usePediatricWidgetState } from "./usePediatricWidgetState";

export function usePediatricClinicalCalculation(state: ReturnType<typeof usePediatricWidgetState>) {
	return useMemo(() => {
		return calculateClinicalProtocol({
			currentTooth: state.currentTooth,
			activePreset: state.activePreset,
			activePresetId: state.activePresetId,
			selectedSurfaces: state.selectedSurfaces,
			selectedMaterial: state.selectedMaterial,
			anesthesiaCalculation: state.anesthesiaCalculation,
			anesthesiaText: state.anesthesiaText,
			sedation: state.sedation,
			representative: state.representative,
			representativeText: state.representativeText,
			somaticStatus: state.somaticStatus,
			somaticText: state.somaticText,
			activeFrankl: state.activeFrankl,
			orthoFrenulumNormal: state.orthoFrenulumNormal,
			orthoNasalBreathing: state.orthoNasalBreathing,
			orthoNoHarmfulHabits: state.orthoNoHarmfulHabits,
		});
	}, [state]);
}
