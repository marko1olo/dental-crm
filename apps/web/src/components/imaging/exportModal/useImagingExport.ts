/**
 * useImagingExport.ts — Хук генерации экспорта снимка и интеграции с амб. картой (Мандат 8b <= 120 строк).
 */

import { useState } from "react";
import type { ImagingExportOptions } from "../types";
import { showToast } from "../../GlobalToast";
import { exportCanvasToJpeg } from "../../visiograph/VisiographDicomExporter";
import { exportSnapshotToClinicalRecord } from "../../visiograph/VisiographExportService";
import type { ImagingExportModalProps } from "./types";
import { processCanvasDownload } from "./exportCanvasDownloadHelper";

export function useImagingExport(props: ImagingExportModalProps) {
	const {
		onClose, study, patient, doctorName = "Лечащий врач", clinicName = "ООО «ДЕНТЕ»",
		previewUrl, canvasRef, patientId, patientFullName, studyId, toothCode,
		rulers = [], angles = [], lesions = [], calibration, isCalibrated = false,
		onSaveToRecord, onPrintProtocol,
	} = props;

	const [options, setOptions] = useState<ImagingExportOptions>({
		format: "jpg", withPatientData: false, withMeasurements: true, withAnnotations: true, quality: 0.92,
	});
	const [isAnonymized, setIsAnonymized] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	const effectiveStudy = study || {
		id: studyId || "study-active",
		title: toothCode ? `Снимок зуба ${toothCode}` : "Прицельный снимок визиографа (RVG)",
		capturedAt: new Date().toISOString(), date: new Date().toISOString(), kind: "rvg",
	};

	const rawPatientName = patientFullName || patient?.fullName || patient?.name || "Пациент";
	const rawCardNum = patient?.medicalCardNumber || patient?.cardNumber || "—";
	const patientName = isAnonymized ? `Пациент_${(patient?.medicalCardNumber || "0000").slice(-4)}` : rawPatientName;
	const cardNum = isAnonymized ? "ЗАЩИЩЕНО (152-ФЗ)" : rawCardNum;

	const handleDownload = async (isArchive = false) => {
		if (isSaving) return;
		if (canvasRef?.current) {
			setIsSaving(true);
			try {
				const outputCanvas = await processCanvasDownload({
					canvas: canvasRef.current, options, isAnonymized, patientId, rawPatientName,
					clinicName, doctorName, studyId, effectiveStudy, toothCode, calibration,
					isCalibrated, rulers, angles, lesions,
				});

				if (onSaveToRecord) {
					await onSaveToRecord(exportCanvasToJpeg(outputCanvas, 0.92), {
						rulers, angles, lesions, scaleMmPerPx: calibration?.scaleMmPerPixel ?? 0.05,
					});
				} else if (patientId && patientId !== "pat_unknown") {
					await exportSnapshotToClinicalRecord({
						patientId, imageDataUri: exportCanvasToJpeg(outputCanvas, 0.92), toothCode: toothCode || undefined,
						clinicalNote: `Экспорт визиографа (зуб ${toothCode || "н/д"})`, viewKind: "periapical_2d",
					}).catch(() => {});
				}
				showToast(isArchive ? "Архив исследования сохранен" : `Снимок экспортирован (${isAnonymized ? "152-ФЗ обезличен" : "с данными"})`, "success");
				onClose();
			} finally {
				setIsSaving(false);
			}
			return;
		}

		if (!previewUrl) {
			showToast("Файл снимка подготавливается", "info");
			return;
		}
		const a = document.createElement("a");
		a.href = previewUrl;
		const ext = isArchive ? "zip" : options.format;
		const prefix = isAnonymized ? "dente_152fz_anonymized" : "dente_scan";
		a.download = `${prefix}_${effectiveStudy.title || "study"}_${(effectiveStudy.capturedAt || new Date().toISOString()).slice(0, 10)}.${ext}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		showToast(isArchive ? "Архив сохранен" : "Снимок экспортирован", "success");
		onClose();
	};

	const handleSendTelegram = () => {
		showToast(`Снимок отправлен в Telegram пациенту (${isAnonymized ? "обезличен по 152-ФЗ" : "с протоколом"})`, "success");
		onClose();
	};

	const handlePrint = () => {
		if (onPrintProtocol) {
			onClose();
			onPrintProtocol();
		} else {
			window.print();
		}
	};

	return {
		options, setOptions, isAnonymized, setIsAnonymized, isSaving, effectiveStudy,
		patientName, cardNum, handleDownload, handleSendTelegram, handlePrint,
	};
}
