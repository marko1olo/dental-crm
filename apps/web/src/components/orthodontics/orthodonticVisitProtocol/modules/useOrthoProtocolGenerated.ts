import { useMemo } from "react";
import { synthesizeOrthodonticProtocolText } from "../../orthoProtocolSynthesis";
import { calculateOrthodonticServices } from "../../orthoProtocolTypes";

export function useOrthoProtocolGenerated(state: any, presets: any, props: any, appliances: any) {
	const calculatedServices = useMemo(() => {
		return calculateOrthodonticServices({
			selectedActions: state.selectedActions,
			bracketSystem: state.bracketSystem,
			activeAttachmentPreset: state.activeAttachmentPreset,
			selectedTooth: props.selectedTooth,
			targetArch: state.targetArch,
		});
	}, [state.selectedActions, state.bracketSystem, state.activeAttachmentPreset, props.selectedTooth, state.targetArch]);

	const generatedProtocol = useMemo(() => {
		return synthesizeOrthodonticProtocolText({
			patientName: props.patientName ?? "Пациент",
			notes: state.notes,
			angleClass: state.angleClass,
			anbClass: state.anbClass,
			anbAngle: state.anbAngle,
			sagittalAnomaly: state.sagittalAnomaly,
			sagittalGapMm: state.sagittalGapMm,
			verticalAnomaly: state.verticalAnomaly,
			transversalAnomaly: state.transversalAnomaly,
			tmjStatus: state.tmjStatus,
			isPhotoProtocolCompleted: state.isPhotoProtocolCompleted,
			bracketSlot: state.bracketSlot,
			bracketSystem: state.bracketSystem,
			archwireMaterial: state.archwireMaterial,
			archwireSection: state.archwireSection,
			targetArch: state.targetArch,
			elasticScheme: state.elasticScheme,
			elasticSize: state.elasticSize,
			elasticWear: state.elasticWear,
			selectedActions: state.selectedActions,
			selectedTeeth: state.selectedTeeth,
			powerChainSpan: state.powerChainSpan,
			powerChainType: state.powerChainType,
			activePreset: state.activePreset,
			activeAttachmentPreset: state.activeAttachmentPreset,
			alignerSetIssued: state.alignerSetIssued,
			plateActivationTurns: state.plateActivationTurns,
			torquePreset: state.torquePreset,
			angulationPreset: state.angulationPreset,
			isSplitArchAligners: state.isSplitArchAligners,
			alignerStep: state.alignerStep,
			alignerTotal: state.alignerTotal,
			alignerStepUpper: state.alignerStepUpper,
			alignerTotalUpper: state.alignerTotalUpper,
			alignerStepLower: state.alignerStepLower,
			alignerTotalLower: state.alignerTotalLower,
			alignerProgressPercent: appliances.alignerProgressPercent,
			nextAlignerDateStr: appliances.nextAlignerDateStr,
			alignerDaysPerStep: state.alignerDaysPerStep,
		});
	}, [props.patientName, state, appliances.alignerProgressPercent, appliances.nextAlignerDateStr]);

	return { calculatedServices, generatedProtocol };
}
