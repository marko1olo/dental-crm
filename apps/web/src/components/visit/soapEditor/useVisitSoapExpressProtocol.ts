import { useCallback } from "react";
import { showToast } from "../../GlobalToast";
import {
	buildChairsideSmartProtocol,
	type ChairsideSmartProtocolKey,
	saveChairsideVisitDraft,
} from "../clinicalVisitWorkflow";
import { dispatchExpressProtocolServicesToInvoice } from "./soapExpressInvoiceBridge";
import type { VisitSoapNoteValues } from "./types";

interface ExpressProtocolParams {
	readonly selectedTooth: number | null;
	readonly selectedSurfaces: string;
	readonly isLocked: boolean;
	readonly isCorrectionMode: boolean;
	readonly setIsCorrectionMode: (val: boolean) => void;
	readonly setValues: React.Dispatch<React.SetStateAction<VisitSoapNoteValues>>;
	readonly valuesRef: React.MutableRefObject<VisitSoapNoteValues>;
	readonly setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
	readonly saveDraftToStorage: (vals: VisitSoapNoteValues) => void;
	readonly onSave?: ((vals: VisitSoapNoteValues) => void) | undefined;
	readonly onChange?: ((vals: VisitSoapNoteValues) => void) | undefined;
	readonly onApplyFullDiary?: ((fullText: string) => void) | undefined;
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
}

export function useVisitSoapExpressProtocol({
	selectedTooth,
	selectedSurfaces,
	isLocked,
	isCorrectionMode,
	setIsCorrectionMode,
	setValues,
	valuesRef,
	setSaveStatus,
	saveDraftToStorage,
	onSave,
	onChange,
	onApplyFullDiary,
	visitId,
	patientId,
}: ExpressProtocolParams) {
	const handleApplyExpressProtocol = useCallback(
		(presetType: ChairsideSmartProtocolKey) => {
			if (isLocked && !isCorrectionMode) {
				setIsCorrectionMode(true);
			}
			const protocol = buildChairsideSmartProtocol(presetType, selectedTooth, {
				surfaces: selectedSurfaces,
				isLocked: isLocked && !isCorrectionMode,
			});

			const next: VisitSoapNoteValues = {
				complaint: protocol.complaint,
				anamnesis: protocol.anamnesis,
				objectiveStatus: protocol.objectiveStatus,
				diagnosis: protocol.diagnosis,
				treatmentPlan: protocol.treatmentPlan,
				recommendations: protocol.recommendations,
				icd10: protocol.icd10,
			};

			setValues(next);
			valuesRef.current = next;
			setSaveStatus("saved");
			saveDraftToStorage(next);
			if (visitId) {
				saveChairsideVisitDraft(visitId, {
					chairId: undefined,
					patientId,
					savedAtIso: new Date().toISOString(),
					version: 1,
					diary: { ...next, toothNumber: selectedTooth ?? undefined },
				});
			}
			onSave?.(next);
			onChange?.(next);

			const targetTooth = selectedTooth ?? 16;
			dispatchExpressProtocolServicesToInvoice(presetType, targetTooth, selectedSurfaces);

			const fullText = [
				`=== МЕДИЦИНСКАЯ КАРТА (ЗУБ ${targetTooth}) ===`,
				`[Жалобы]: ${next.complaint}`,
				`[Анамнез]: ${next.anamnesis}`,
				`[Объективный статус]: ${next.objectiveStatus}`,
				`[Диагноз]: [${next.icd10}] ${next.diagnosis}`,
				`[Протокол лечения]: ${next.treatmentPlan}`,
				`[Рекомендации]: ${next.recommendations}`,
			].join("\n\n");
			onApplyFullDiary?.(fullText);

			showToast(`Экспресс-протокол «${protocol.title}» применён`, "success", 3000);
		},
		[
			isLocked,
			isCorrectionMode,
			setIsCorrectionMode,
			selectedTooth,
			selectedSurfaces,
			visitId,
			patientId,
			saveDraftToStorage,
			setSaveStatus,
			valuesRef,
			onSave,
			onChange,
			onApplyFullDiary,
			setValues,
		],
	);

	return { handleApplyExpressProtocol };
}
