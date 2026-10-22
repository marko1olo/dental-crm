import { useCallback } from "react";
import { renderOrthodonticPresentationHtml, type OrthodonticPhotoSession } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import {
	type OrthodonticClinicalPreset,
	ORTHODONTIC_CLINICAL_PRESETS,
	generateOrthodonticDiaryNote,
} from "../orthodonticPresets";
import { dispatchSoapProtocolEvent } from "./dispatchSoapProtocolEvent";

interface UseOrthoProtocolActionsProps {
	session: OrthodonticPhotoSession;
	activePreset: OrthodonticClinicalPreset | null;
	insertProtocolOnSave: boolean;
	onInsertProtocol043?: ((protocolText: string) => void) | undefined;
	onSaveSession?: ((session: OrthodonticPhotoSession) => void) | undefined;
	onClose: () => void;
}

export function useOrthoProtocolActions({
	session,
	activePreset,
	insertProtocolOnSave,
	onInsertProtocol043,
	onSaveSession,
	onClose,
}: UseOrthoProtocolActionsProps) {
	const handleInsertProtocol043 = useCallback(
		(presetToApply?: OrthodonticClinicalPreset) => {
			const targetPreset = presetToApply || activePreset || ORTHODONTIC_CLINICAL_PRESETS[0]!;
			if (!targetPreset) return;
			const fullProtocolText = generateOrthodonticDiaryNote(targetPreset, session);

			try {
				const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
				if (setVisitNoteForm) {
					setVisitNoteForm((prev) => ({
						...prev,
						complaint: prev.complaint ? `${prev.complaint}\n\n[Ортодонтия] ${targetPreset.complaint}` : `[Ортодонтия] ${targetPreset.complaint}`,
						objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${fullProtocolText}` : fullProtocolText,
						treatmentPlan: prev.treatmentPlan ? `${prev.treatmentPlan}\n\n[Ортодонтия] ${targetPreset.shortLabel}` : `[Ортодонтия] ${targetPreset.shortLabel}: ${targetPreset.recommendations}`,
						diagnosis: prev.diagnosis ? `${prev.diagnosis}; ${targetPreset.diagnosisRu}` : targetPreset.diagnosisRu,
					}));
				}
				dispatchSoapProtocolEvent(fullProtocolText, targetPreset);
				if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
					navigator.clipboard.writeText(fullProtocolText).catch(() => {});
				}
				onInsertProtocol043?.(fullProtocolText);
				showToast("Протокол ортодонтии успешно внесен в дневник приёма", "success");
			} catch (_err) {
				if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
					navigator.clipboard.writeText(fullProtocolText).catch(() => {});
				}
				showToast("Протокол скопирован в буфер обмена", "info");
			}
		},
		[activePreset, session, onInsertProtocol043],
	);

	const handleCopyProtocolToClipboard = useCallback(() => {
		const targetPreset = activePreset || ORTHODONTIC_CLINICAL_PRESETS[0]!;
		if (!targetPreset) return;
		const fullProtocolText = generateOrthodonticDiaryNote(targetPreset, session);
		if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
			navigator.clipboard.writeText(fullProtocolText)
				.then(() => showToast("Протокол ортодонтии скопирован в буфер обмена", "success"))
				.catch(() => showToast("Не удалось скопировать", "error"));
		}
	}, [activePreset, session]);

	const handleExportPresentation = () => {
		const htmlContent = renderOrthodonticPresentationHtml(session);
		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.open();
			printWindow.document.write(htmlContent);
			printWindow.document.close();
			printWindow.focus();
			if (printWindow.document.readyState === "complete") printWindow.print();
			else printWindow.onload = () => printWindow.print();
		}
	};

	const handleSave = () => {
		if (insertProtocolOnSave) handleInsertProtocol043();
		if (onSaveSession) onSaveSession(session);
		onClose();
	};

	return { handleInsertProtocol043, handleCopyProtocolToClipboard, handleExportPresentation, handleSave };
}
