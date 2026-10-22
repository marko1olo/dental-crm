import type React from "react";
import type {
	EndoCanalData,
	EndoToothClinicalData,
	EndoTreatmentBillingEstimateResult,
} from "@dental/shared";
import type { EndoStageStamp } from "../endoCanalConstants";
import { useEndoProtocolSaver } from "./useEndoProtocolSaver";
import { useEndoExportActions } from "./useEndoExportActions";

interface UseEndoSaveActionsProps {
	readonly activeTooth: number;
	readonly toothAnatomicalName: string;
	readonly canals: EndoCanalData[];
	readonly stageStamp: EndoStageStamp;
	readonly irrigation: string;
	readonly rotarySystem: string;
	readonly radiologyControl: string;
	readonly patientId?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly generatedProtocolText: string;
	readonly billingEstimate: EndoTreatmentBillingEstimateResult;
	readonly onInsertToProtocol?: ((protocolText: string, canals: EndoCanalData[]) => void) | undefined;
	readonly onSaveCanals?: ((canals: EndoCanalData[], clinicalData: EndoToothClinicalData) => Promise<void> | void) | undefined;
	readonly onSave?: ((savedCanals: EndoCanalData[], noteText?: string) => void) | undefined;
	readonly onClose: () => void;
	readonly setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
	readonly setCopied: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useEndoSaveActions(props: UseEndoSaveActionsProps) {
	const protocolSaver = useEndoProtocolSaver({
		activeTooth: props.activeTooth,
		toothAnatomicalName: props.toothAnatomicalName,
		canals: props.canals,
		stageStamp: props.stageStamp,
		irrigation: props.irrigation,
		rotarySystem: props.rotarySystem,
		radiologyControl: props.radiologyControl,
		patientId: props.patientId,
		billingEstimate: props.billingEstimate,
		onInsertToProtocol: props.onInsertToProtocol,
		onSaveCanals: props.onSaveCanals,
		onSave: props.onSave,
		onClose: props.onClose,
		setIsSaving: props.setIsSaving,
	});

	const exportActions = useEndoExportActions({
		activeTooth: props.activeTooth,
		toothAnatomicalName: props.toothAnatomicalName,
		canals: props.canals,
		stageStamp: props.stageStamp,
		irrigation: props.irrigation,
		rotarySystem: props.rotarySystem,
		radiologyControl: props.radiologyControl,
		clinicName: props.clinicName,
		clinicPhone: props.clinicPhone,
		doctorName: props.doctorName,
		patientName: props.patientName,
		generatedProtocolText: props.generatedProtocolText,
		setCopied: props.setCopied,
	});

	return { ...protocolSaver, ...exportActions };
}
