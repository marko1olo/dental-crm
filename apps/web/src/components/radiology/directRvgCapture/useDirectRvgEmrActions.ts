import { useCallback, useState } from "react";
import { showToast } from "../../GlobalToast";
import { SENSOR_MODELS } from "../directRvgTypes";
import type { RadiologyStudy } from "../types";
import { exportDirectRvgImageOrDicom, persistRvgScanToServer } from "../directRvgFileValidation";
import { useVisitStore } from "../../../store/visitStore";

export interface UseDirectRvgEmrActionsProps {
	readonly patientId: string;
	readonly patientName: string;
	readonly patientCardNumber: string;
	readonly doctorName: string;
	readonly selectedSensorModel: string;
	readonly selectedTeeth: string[];
	readonly primaryToothName: string;
	readonly initialToothFdi: string;
	readonly exposureSec: number;
	readonly calculatedDoseMicrosv: number;
	readonly capturedImage: string;
	readonly clinicalNotes: string;
	readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly onSaveToEmr?: ((study: RadiologyStudy) => void) | undefined;
	readonly onSendToLab?: ((data: any) => void) | undefined;
	readonly onExportDicom?: ((blob: Blob, filename: string) => void) | undefined;
	readonly onClose: () => void;
}

export function useDirectRvgEmrActions({
	patientId,
	patientName,
	patientCardNumber,
	doctorName,
	selectedSensorModel,
	selectedTeeth,
	primaryToothName,
	initialToothFdi,
	exposureSec,
	calculatedDoseMicrosv,
	capturedImage,
	clinicalNotes,
	canvasRef,
	onSaveToEmr,
	onSendToLab,
	onExportDicom,
	onClose,
}: UseDirectRvgEmrActionsProps) {
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const createStudyRecord = useCallback(
		(idSuffix: string): { study: RadiologyStudy; pixelSpacingMm: number } => {
			const currentSensor = SENSOR_MODELS.find((s) => s.id === selectedSensorModel);
			const pixelSpacingMm = currentSensor?.pixelSpacing || 0.035;
			const currentIso = new Date().toISOString();

			const study: RadiologyStudy = {
				id: `study-rvg-${idSuffix}-${Date.now()}`,
				patientId,
				patientName,
				medicalCardNumber: patientCardNumber,
				studyDate: currentIso.replace("T", " ").substring(0, 16),
				studyType: "intraoral_radiovisiography",
				modality: "intraoral_rvg",
				modalityLabel: "Прицельный снимок",
				anatomicalArea: `Зуб ${selectedTeeth.join(", ")} (${primaryToothName})`,
				teethFdi: selectedTeeth,
				effectiveDoseMicrosv: calculatedDoseMicrosv,
				effectiveDoseMsv: calculatedDoseMicrosv / 1000,
				imageUrl: capturedImage,
				doctorName,
				doctorSpecialty: "Врач-стоматолог терапевт-эндодонтист",
				clinicName: "ООО «Денте Стоматология»",
				status: "completed",
				diagnosisIcd10: "K04.0",
				diagnosticNotes: clinicalNotes,
				metadata: {
					kv: 65,
					ma: 7.0,
					exposureSec,
					pixelSpacingMm,
					apparatusModel: currentSensor?.name || "Vatech EzSensor HD",
					sensorType: "CMOS Active Pixel",
				},
				tags: ["Прицельный", "043/у", `Зуб_${selectedTeeth.join("_")}`],
			};
			return { study, pixelSpacingMm };
		},
		[
			selectedSensorModel,
			patientId,
			patientName,
			patientCardNumber,
			selectedTeeth,
			primaryToothName,
			calculatedDoseMicrosv,
			capturedImage,
			doctorName,
			clinicalNotes,
			exposureSec,
		],
	);

	// 1-Click Action 1: Save to EMR
	const handleSaveToEmr = useCallback(() => {
		if (!capturedImage) {
			showToast("Сначала выполните захват с датчика или загрузите снимок", "warning");
			return;
		}
		setIsSaving(true);
		const { study: studyRecord } = createStudyRecord("emr");

		if (onSaveToEmr) {
			onSaveToEmr(studyRecord);
		}

		persistRvgScanToServer({ patientId, capturedImage, selectedTeeth, clinicalNotes });

		// Automatically bind RVG scan finding to active visit diary & reactive FDI tooth formula
		try {
			const primaryToothCode = selectedTeeth[0] || initialToothFdi || "16";
			const rvgDiaryStatement = `[Прицельный снимок] Зуб #${selectedTeeth.join(", ")}: доза ${calculatedDoseMicrosv} мкЗв. ${clinicalNotes}`;

			useVisitStore.getState().setVisitNoteForm((prev) => {
				const current = prev.objectiveStatus || "";
				const updated = current.trim() ? `${current.trim()}\n${rvgDiaryStatement}` : rvgDiaryStatement;
				return { ...prev, objectiveStatus: updated };
			});

			if (primaryToothCode) {
				const store = useVisitStore.getState();
				const currentState = store.visitToothStateByCode[primaryToothCode];
				if (!currentState || currentState === "idle") {
					store.setToothState(primaryToothCode, "treatment");
				}
			}
		} catch (err) {
			console.warn("[DirectRvgCaptureModal] Failed to update visit store:", err);
		}

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							objectiveStatus: `[Прицельный снимок] Зуб #${selectedTeeth.join(", ")}: доза ${calculatedDoseMicrosv} мкЗв. ${clinicalNotes}`,
						},
						immediate: true,
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// ignore
		}

		try {
			window.dispatchEvent(
				new CustomEvent("dente-rvg-scan-saved", {
					detail: {
						study: studyRecord,
						toothFdi: selectedTeeth[0] || initialToothFdi || "16",
						teethFdi: selectedTeeth,
					},
				}),
			);
		} catch {
			// ignore
		}

		showToast(`Снимок зуба ${selectedTeeth.join(", ")} сохранён в медицинскую карту ${patientCardNumber}`, "success");
		setIsSaving(false);
		onClose();
	}, [
		capturedImage,
		createStudyRecord,
		onSaveToEmr,
		patientId,
		selectedTeeth,
		clinicalNotes,
		initialToothFdi,
		calculatedDoseMicrosv,
		patientCardNumber,
		onClose,
	]);

	// 1-Click Action 2: Send to Dental Lab (ЗТЛ)
	const handleSendToLab = useCallback(() => {
		const { study: studyRecord } = createStudyRecord("lab");
		if (onSendToLab) {
			onSendToLab({
				study: studyRecord,
				toothFdi: selectedTeeth.join(", "),
				note: `Прикреплен контрольный снимок зуба ${selectedTeeth.join(", ")} для зуботехнической лаборатории`,
			});
		}
		showToast(`Снимок зуба ${selectedTeeth.join(", ")} прикреплен и отправлен в заказ ЗТЛ`, "success");
	}, [createStudyRecord, onSendToLab, selectedTeeth]);

	// 1-Click Action 2b: Send to Treatment Plan
	const handleSendToPlan = useCallback(() => {
		if (!capturedImage) {
			showToast("Сначала выполните захват с датчика или загрузите снимок", "warning");
			return;
		}
		const { study: studyRecord } = createStudyRecord("plan");
		if (onSaveToEmr) {
			onSaveToEmr(studyRecord);
		}
		showToast(`Снимок зуба #${selectedTeeth.join(", ")} успешно прикреплен к плану лечения`, "success");
	}, [capturedImage, createStudyRecord, onSaveToEmr, selectedTeeth]);

	// 1-Click Action 3: Export DICOM (.dcm) or Genuine Image
	const handleExportDicom = useCallback(() => {
		const { study: studyRecord, pixelSpacingMm } = createStudyRecord("dcm");
		exportDirectRvgImageOrDicom({
			study: studyRecord,
			canvas: canvasRef.current,
			selectedTeeth,
			patientId,
			patientName,
			patientCardNumber,
			doctorName,
			capturedImage,
			pixelSpacingMm,
			onExportDicom,
		});
	}, [
		createStudyRecord,
		canvasRef,
		selectedTeeth,
		patientId,
		patientName,
		patientCardNumber,
		doctorName,
		capturedImage,
		onExportDicom,
	]);

	return {
		isSaving,
		handleSaveToEmr,
		handleSendToLab,
		handleSendToPlan,
		handleExportDicom,
	};
}
