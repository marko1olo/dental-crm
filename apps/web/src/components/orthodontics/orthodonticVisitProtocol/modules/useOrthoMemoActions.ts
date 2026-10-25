import { useCallback } from "react";
import { showToast } from "../../../GlobalToast";
import { useVisitStore } from "../../../../store/visitStore";
import { ALIGNER_ATTACHMENT_PRESETS } from "../../OrthoBracketProtocolSection";
import { TORQUE_PRESETS } from "../../OrthoArchwireSelector";
import { copyTextToClipboard, printOrthodonticCard, printPatientMemoA4 } from "../../orthoProtocolPrintUtils";
import { formatOrthodonticPatientMemo, type OrthodonticService } from "../../orthoProtocolTypes";
import { syncOrthoBackendActions } from "./orthoBackendSync";

export interface UseOrthoMemoParams {
	patientId?: string | undefined; patientName: string; clinicName: string; clinicPhone: string; doctorName: string;
	selectedTooth?: number | null | undefined; notes: string; generatedProtocol: string; calculatedServices: OrthodonticService[];
	bracketSystem: string; archwireMaterial: string; archwireSection: string; targetArch: string; torquePreset: string;
	elasticScheme: string; elasticSize: string; elasticWear: string; activeAttachmentPreset: string | null; isSplitArchAligners: boolean;
	alignerStep: number; alignerTotal: number; alignerStepUpper: number; alignerTotalUpper: number; alignerStepLower: number;
	alignerTotalLower: number; plateActivationTurns: number; angleClass: string; selectedActions: string[];
	powerChainType: string; powerChainSpan: string; onClose: () => void;
	onAddToInvoice?: ((services: OrthodonticService[]) => void) | undefined;
}

export function useOrthoMemoActions(params: UseOrthoMemoParams) {
	const {
		patientId, patientName, clinicName, clinicPhone, doctorName, selectedTooth,
		notes, generatedProtocol, calculatedServices, bracketSystem, archwireMaterial, archwireSection,
		targetArch, torquePreset, elasticScheme, elasticSize, elasticWear, activeAttachmentPreset,
		isSplitArchAligners, alignerStep, alignerTotal, alignerStepUpper, alignerTotalUpper,
		alignerStepLower, alignerTotalLower, plateActivationTurns, selectedActions,
		powerChainType, powerChainSpan, onClose, onAddToInvoice,
	} = params;

	const handlePrintOrthodonticCard = useCallback(() => {
		printOrthodonticCard({ patientName, clinicName, doctorName, generatedProtocol });
	}, [clinicName, doctorName, patientName, generatedProtocol]);

	const handleCopyClipboard = useCallback(() => {
		copyTextToClipboard(generatedProtocol, "Протокол скопирован в буфер обмена");
	}, [generatedProtocol]);

	const getPatientMemoContent = useCallback(() => {
		return formatOrthodonticPatientMemo({
			clinicName, clinicPhone, doctorName, patientName, bracketSystem, archwireMaterial, archwireSection, targetArch,
			elasticScheme, elasticSize, elasticWear, isAligners: bracketSystem === "aligners" || Boolean(activeAttachmentPreset),
			currentAligner: isSplitArchAligners ? undefined : alignerStep, totalAligners: isSplitArchAligners ? undefined : alignerTotal,
			currentAlignerUpper: isSplitArchAligners ? alignerStepUpper : undefined, totalAlignersUpper: isSplitArchAligners ? alignerTotalUpper : undefined,
			currentAlignerLower: isSplitArchAligners ? alignerStepLower : undefined, totalAlignersLower: isSplitArchAligners ? alignerTotalLower : undefined,
			notes,
		});
	}, [clinicName, clinicPhone, doctorName, patientName, bracketSystem, archwireMaterial, archwireSection, targetArch, elasticScheme, elasticSize, elasticWear, activeAttachmentPreset, isSplitArchAligners, alignerStep, alignerTotal, alignerStepUpper, alignerTotalUpper, alignerStepLower, alignerTotalLower, notes]);

	const handleCopyPatientMemo = useCallback(() => {
		copyTextToClipboard(getPatientMemoContent(), "Памятка пациенту по эластикам и уходу скопирована для мессенджера");
	}, [getPatientMemoContent]);

	const handlePrintPatientMemo = useCallback(() => {
		printPatientMemoA4({ patientName, clinicName, doctorName, clinicPhone, memoText: getPatientMemoContent() });
	}, [clinicName, clinicPhone, doctorName, patientName, getPatientMemoContent]);

	const handleAddServicesToInvoice = useCallback(() => {
		if (calculatedServices.length === 0) return showToast("Нет выбранных ортодонтических манипуляций для начисления", "info");
		onAddToInvoice?.(calculatedServices);
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", { detail: { services: calculatedServices, toothNumber: selectedTooth ?? undefined, stageKind: "stage_ortho" } }));
		}
		const totalRub = calculatedServices.reduce((acc, s) => acc + s.priceRub, 0);
		const codesStr = calculatedServices.map((s) => s.code).join(", ");
		showToast(`Начислено ${calculatedServices.length} услуг (${codesStr}) на сумму ${totalRub} ₽`, "success", 3500);
	}, [calculatedServices, selectedTooth, onAddToInvoice]);

	const handleApplyToVisitNote = useCallback(() => {
		const torqueObj = TORQUE_PRESETS.find((t) => t.id === torquePreset);
		try {
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				const planSummary = activeAttachmentPreset
					? `Элайнеры: ${isSplitArchAligners ? `ВЧ №${alignerStepUpper}/${alignerTotalUpper}, НЧ №${alignerStepLower}/${alignerTotalLower}` : `Каппа №${alignerStep}/${alignerTotal}`}`
					: bracketSystem === "removable_plate" ? `Пластинка с винтом (активация ${plateActivationTurns}/4 об.)`
						: `Дуга ${archwireMaterial} ${archwireSection}", торк ${torqueObj?.shortLabel || "Damon Std"}`;
				setVisitNoteForm((prev) => ({
					...prev,
					complaint: prev.complaint ? `${prev.complaint}\n\n[Ортодонтия] ${notes}` : `Плановый ортодонтический приём. ${notes}`,
					objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${generatedProtocol}` : generatedProtocol,
					treatmentPlan: prev.treatmentPlan ? `${prev.treatmentPlan}\n\n[Ортодонтия] ${planSummary}` : `Ортодонтическое лечение: ${planSummary}.`,
				}));
			}
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: { protocolText: generatedProtocol, title: "Ортодонтический протокол" } }));
				if (calculatedServices.length > 0) {
					window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", { detail: { services: calculatedServices, toothNumber: selectedTooth ?? undefined, stageKind: "stage_ortho" } }));
				}
			}
			if (calculatedServices.length > 0) onAddToInvoice?.(calculatedServices);
			if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(generatedProtocol).catch(() => {});
			showToast("Ортодонтический протокол сохранен в медицинскую карту!", "success");
			if (patientId) syncOrthoBackendActions(patientId, selectedActions, archwireMaterial, archwireSection, targetArch, notes, powerChainType, powerChainSpan);
			onClose();
		} catch { showToast("Протокол скопирован в буфер", "info"); }
	}, [activeAttachmentPreset, calculatedServices, torquePreset, isSplitArchAligners, alignerStepUpper, alignerTotalUpper, alignerStepLower, alignerTotalLower, alignerStep, alignerTotal, bracketSystem, plateActivationTurns, archwireMaterial, archwireSection, notes, generatedProtocol, selectedTooth, onAddToInvoice, patientId, selectedActions, targetArch, powerChainType, powerChainSpan, onClose]);

	return { handlePrintOrthodonticCard, handleCopyClipboard, handleCopyPatientMemo, handlePrintPatientMemo, handleAddServicesToInvoice, handleApplyToVisitNote };
}
