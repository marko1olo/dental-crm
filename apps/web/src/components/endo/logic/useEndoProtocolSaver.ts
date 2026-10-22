import type React from "react";
import type {
	EndoCanalData,
	EndoToothClinicalData,
	EndoTreatmentBillingEstimateResult,
} from "@dental/shared";
import { generateEndoProtocol043, type EndoStageStamp } from "../endoCanalConstants";
import { sanitizeCanalsForSubmission } from "../endoCanalHelpers";
import {
	persistCanalsToBackend,
	updateVisitStoreWithEndoProtocol,
	applyEndoBillingAndInventoryDeductions,
} from "../endoPersistenceBridge";
import { showToast } from "../../GlobalToast";

interface UseEndoProtocolSaverProps {
	readonly activeTooth: number;
	readonly toothAnatomicalName: string;
	readonly canals: EndoCanalData[];
	readonly stageStamp: EndoStageStamp;
	readonly irrigation: string;
	readonly rotarySystem: string;
	readonly radiologyControl: string;
	readonly patientId?: string | undefined;
	readonly billingEstimate: EndoTreatmentBillingEstimateResult;
	readonly onInsertToProtocol?: ((protocolText: string, canals: EndoCanalData[]) => void) | undefined;
	readonly onSaveCanals?: ((canals: EndoCanalData[], clinicalData: EndoToothClinicalData) => Promise<void> | void) | undefined;
	readonly onSave?: ((savedCanals: EndoCanalData[], noteText?: string) => void) | undefined;
	readonly onClose: () => void;
	readonly setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useEndoProtocolSaver({
	activeTooth,
	toothAnatomicalName,
	canals,
	stageStamp,
	irrigation,
	rotarySystem,
	radiologyControl,
	patientId,
	billingEstimate,
	onInsertToProtocol,
	onSaveCanals,
	onSave,
	onClose,
	setIsSaving,
}: UseEndoProtocolSaverProps) {
	const handleSaveCanalsOnly = async () => {
		setIsSaving(true);
		const effectiveCanals = sanitizeCanalsForSubmission(canals, activeTooth, stageStamp);
		const clinicalData: EndoToothClinicalData = {
			canals: effectiveCanals,
			irrigation,
			rotarySystem,
			radiologyControl,
			updatedAt: new Date().toISOString(),
		};
		try {
			const ok = await persistCanalsToBackend({ patientId, activeTooth, clinicalData, onSaveCanals });
			if (ok) {
				showToast(`Параметры каналов зуба #${activeTooth} успешно сохранены в карту!`, "success");
				onClose();
			}
		} finally {
			setIsSaving(false);
		}
	};

	const handleInsertToProtocol = async () => {
		setIsSaving(true);
		const effectiveCanals = sanitizeCanalsForSubmission(canals, activeTooth, stageStamp);
		const stampedTitle = stageStamp === "DRAFT"
			? `${toothAnatomicalName} [ЧЕРНОВИК — КАНАЛЫ В ОБРАБОТКЕ]`
			: stageStamp === "TEMP_CAOH2"
				? `${toothAnatomicalName} [ВРЕМЕННАЯ ОБТУРАЦИЯ Ca(OH)2]`
				: `${toothAnatomicalName} [ПОЛНАЯ ОБТУРАЦИЯ ДО АПЕКСА]`;
		const protocolText = generateEndoProtocol043({
			toothNumber: activeTooth,
			toothTitle: stampedTitle,
			canals: effectiveCanals,
			irrigation,
			rotarySystem,
			radiologyControl,
		});
		const clinicalData: EndoToothClinicalData = {
			canals: effectiveCanals,
			irrigation,
			rotarySystem,
			radiologyControl,
			updatedAt: new Date().toISOString(),
		};
		try {
			await persistCanalsToBackend({ patientId, activeTooth, clinicalData, onSaveCanals });
		} catch (err) {
			console.warn("Background persistence failed", err);
		} finally {
			setIsSaving(false);
		}

		updateVisitStoreWithEndoProtocol(activeTooth, stageStamp, protocolText);
		applyEndoBillingAndInventoryDeductions(activeTooth, patientId, stageStamp, billingEstimate);

		if (onInsertToProtocol) onInsertToProtocol(protocolText, effectiveCanals);
		if (onSave) onSave(effectiveCanals, protocolText);

		try {
			window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
				detail: { soap: { treatmentDescription: protocolText }, mode: "smart_append" },
			}));
		} catch { /* fallback */ }

		showToast(`Эндодонтический протокол для зуба #${activeTooth} сохранен и вставлен в дневник визита!`, "success");
		onClose();
	};

	return { handleSaveCanalsOnly, handleInsertToProtocol };
}
