import { useCallback } from "react";
import { showToast } from "../../GlobalToast";
import type { OrthodonticVisitProtocolWidgetProps } from "../orthoProtocolTypes";
import { useOrthoClinicalPresets } from "../useOrthoClinicalPresets";
import { useOrthoProtocolState } from "../useOrthoProtocolState";
import { useOrthoArchwireActions } from "./modules/useOrthoArchwireActions";
import { useOrthoAppliancesActions } from "./modules/useOrthoAppliancesActions";
import { useOrthoDebouncedAutosave } from "./modules/useOrthoDebouncedAutosave";
import { useOrthoMemoActions } from "./modules/useOrthoMemoActions";
import { useOrthoProtocolGenerated } from "./modules/useOrthoProtocolGenerated";
import { useOrthoSyncEffects } from "./modules/useOrthoSyncEffects";
import { buildOrthoControlsProps, buildOrthoPreviewProps } from "./modules/useOrthoControlsPropsBuilder";

export { syncOrthoBackendActions } from "./modules/orthoBackendSync";

export function useOrthodonticVisitProtocol(props: OrthodonticVisitProtocolWidgetProps) {
	const {
		isOpen, onClose, patientId, patientName = "Пациент", clinicName = "Стоматологическая клиника DENTE",
		clinicPhone = "", doctorName = "Лечащий врач-ортодонт", selectedTooth = null, onSelectTooth, onIssueAlignerSet, onAddToInvoice,
	} = props;

	const state = useOrthoProtocolState(props);
	useOrthoSyncEffects({
		isOpen, patientId, setAlignerStep: state.setAlignerStep, setAlignerStepUpper: state.setAlignerStepUpper,
		setAlignerStepLower: state.setAlignerStepLower, setAlignerTotal: state.setAlignerTotal, setAlignerTotalUpper: state.setAlignerTotalUpper,
		setAlignerTotalLower: state.setAlignerTotalLower, setAlignerDaysPerStep: state.setAlignerDaysPerStep,
		setArchwireMaterial: state.setArchwireMaterial, setNotes: state.setNotes, setAnbAngle: state.setAnbAngle,
		setAnbClass: state.setAnbClass, setVerticalAnomaly: state.setVerticalAnomaly, setTorquePreset: state.setTorquePreset,
	});
	useOrthoDebouncedAutosave(isOpen, state.notes);

	const presets = useOrthoClinicalPresets({
		patientName, selectedTeeth: state.selectedTeeth, isSplitArchAligners: state.isSplitArchAligners,
		alignerStep: state.alignerStep, alignerTotal: state.alignerTotal, alignerStepUpper: state.alignerStepUpper,
		alignerTotalUpper: state.alignerTotalUpper, alignerStepLower: state.alignerStepLower, alignerTotalLower: state.alignerTotalLower,
		targetArch: state.targetArch, setActivePreset: state.setActivePreset, setTargetArch: state.setTargetArch,
		setSelectedTeeth: state.setSelectedTeeth, setBracketSlot: state.setBracketSlot, setBracketSystem: state.setBracketSystem,
		setArchwireMaterial: state.setArchwireMaterial, setArchwireSection: state.setArchwireSection, setSelectedActions: state.setSelectedActions,
		setElasticScheme: state.setElasticScheme, setElasticSize: state.setElasticSize, setElasticWear: state.setElasticWear, setNotes: state.setNotes,
	});

	const archwire = useOrthoArchwireActions({
		patientId, targetArch: state.targetArch, elasticScheme: state.elasticScheme, selectedActions: state.selectedActions,
		setTargetArch: state.setTargetArch, setSelectedTeeth: state.setSelectedTeeth, setSelectedActions: state.setSelectedActions,
		setActivePreset: state.setActivePreset, setArchwireMaterial: state.setArchwireMaterial, setArchwireSection: state.setArchwireSection,
		setElasticScheme: state.setElasticScheme, setAngleClass: state.setAngleClass, setAnbClass: state.setAnbClass, setAnbAngle: state.setAnbAngle,
		setSagittalAnomaly: state.setSagittalAnomaly, setSagittalGapMm: state.setSagittalGapMm, setVerticalAnomaly: state.setVerticalAnomaly,
		setTransversalAnomaly: state.setTransversalAnomaly, setTmjStatus: state.setTmjStatus, setNotes: state.setNotes, onSelectTooth,
	});

	const appliances = useOrthoAppliancesActions({
		patientId, patientName, clinicName, clinicPhone, doctorName, selectedTooth, torquePreset: state.torquePreset,
		activeAttachmentPreset: state.activeAttachmentPreset, isSplitArchAligners: state.isSplitArchAligners,
		alignerStep: state.alignerStep, alignerTotal: state.alignerTotal, alignerStepUpper: state.alignerStepUpper,
		alignerTotalUpper: state.alignerTotalUpper, alignerStepLower: state.alignerStepLower, alignerTotalLower: state.alignerTotalLower,
		alignerDaysPerStep: state.alignerDaysPerStep, setBracketSystem: state.setBracketSystem, setBracketSlot: state.setBracketSlot,
		setTorquePreset: state.setTorquePreset, setStageFilter: state.setStageFilter, setActiveAttachmentPreset: state.setActiveAttachmentPreset,
		setActivePreset: state.setActivePreset, setTargetArch: state.setTargetArch, setSelectedTeeth: state.setSelectedTeeth,
		setNotes: state.setNotes, setAlignerSetIssued: state.setAlignerSetIssued, setAlignerStep: state.setAlignerStep,
		onIssueAlignerSet, onAddToInvoice,
	});

	const { calculatedServices, generatedProtocol } = useOrthoProtocolGenerated(state, presets, props, appliances);

	const memo = useOrthoMemoActions({
		patientId, patientName, clinicName, clinicPhone, doctorName, selectedTooth, notes: state.notes, generatedProtocol,
		calculatedServices, bracketSystem: state.bracketSystem, archwireMaterial: state.archwireMaterial, archwireSection: state.archwireSection,
		targetArch: state.targetArch, torquePreset: state.torquePreset, elasticScheme: state.elasticScheme, elasticSize: state.elasticSize,
		elasticWear: state.elasticWear, activeAttachmentPreset: state.activeAttachmentPreset, isSplitArchAligners: state.isSplitArchAligners,
		alignerStep: state.alignerStep, alignerTotal: state.alignerTotal, alignerStepUpper: state.alignerStepUpper,
		alignerTotalUpper: state.alignerTotalUpper, alignerStepLower: state.alignerStepLower, alignerTotalLower: state.alignerTotalLower,
		plateActivationTurns: state.plateActivationTurns, angleClass: state.angleClass, selectedActions: state.selectedActions,
		powerChainType: state.powerChainType, powerChainSpan: state.powerChainSpan, onClose, onAddToInvoice,
	});

	const handleInsertCephToProtocol = useCallback((text: string) => {
		state.setNotes((prev: string) => (prev ? `${prev}\n\n${text}` : text));
		state.setIsCephModalOpen(false);
		showToast("ТРГ цефалометрический протокол добавлен в дневник", "success", 3000);
	}, [state.setNotes, state.setIsCephModalOpen]);

	const controlsColumnProps = buildOrthoControlsProps(state, presets, archwire, appliances, props, handleInsertCephToProtocol);
	const previewSectionProps = buildOrthoPreviewProps(memo, generatedProtocol, calculatedServices.length, onClose);

	return {
		state, presets, controlsColumnProps, previewSectionProps,
		calculatedServices,
		calculatedServices804n: calculatedServices, // Backward-compat alias
		generatedProtocol,
		handlePrintOrthodonticCard: memo.handlePrintOrthodonticCard,
		handleAddServicesToInvoice: memo.handleAddServicesToInvoice,
		handleApplyToVisitNote: memo.handleApplyToVisitNote,
		handleCopyClipboard: memo.handleCopyClipboard,
		handleCopyPatientMemo: memo.handleCopyPatientMemo,
		handlePrintPatientMemo: memo.handlePrintPatientMemo,
		handleSendAlignerReminder: appliances.handleSendAlignerReminder,
		handleSetMasterPhysiologicalNorm: archwire.handleSetMasterPhysiologicalNorm,
		nextAlignerDateStr: appliances.nextAlignerDateStr,
		alignerProgressPercent: appliances.alignerProgressPercent,
	};
}
