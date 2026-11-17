import { useCallback, useState } from "react";
import type React from "react";
import { renderClinicalExportBlob } from "../../dentalViewerCanvasDraw.js";
import { RADIOLOGY_STANDARD_PROTOCOLS, applyRadiologyProtocolToForm043 } from "../../radiologyProtocols.js";
import { useVisitStore } from "../../../../store/visitStore.js";
import { usePatientStore } from "../../../../store/patientStore.js";
import { showToast } from "../../../GlobalToast.js";
import type { RadiologyFilmstripItem } from "../../RadiologyFilmstripDock.js";
import type { RadiologyStudy } from "../../types.js";
import type { ViewerRulerMeasurement, ViewerCurvedMeasurement } from "../../dentalViewerMath.js";

interface UseSensorViewerExportProtocolProps {
	toothFdiCode?: string | number | null | undefined;
	onInsertToProtocol?: ((statement: string) => void) | undefined;
	rawImageRef: React.MutableRefObject<HTMLImageElement | null>;
	filteredCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
	measurements: readonly ViewerRulerMeasurement[];
	curvedCanals: readonly ViewerCurvedMeasurement[];
	calibratedMmPerPx: number;
	activeStudy: RadiologyStudy | RadiologyFilmstripItem | null;
	patientName?: string | null | undefined;
	patientAge?: string | number | null | undefined;
	patientBirthDate?: string | null | undefined;
	effectiveTooth: string;
	onSelectStudy?: ((study: RadiologyStudy | RadiologyFilmstripItem) => void) | undefined;
	setActiveStudy: React.Dispatch<React.SetStateAction<RadiologyStudy | RadiologyFilmstripItem | null>>;
	setIsProtocolsOpen: (open: boolean) => void;
}

export function useSensorViewerExportProtocol(p: UseSensorViewerExportProtocolProps) {
	const [isNormaApplied, setIsNormaApplied] = useState(false);
	const [isExporting, setIsExporting] = useState(false);

	const handleInsertNorma = useCallback(() => {
		const targetTooth = p.toothFdiCode ? ` зуба ${p.toothFdiCode}` : "";
		const statement = `Рентгенологическое исследование (RVG/DICOM)${targetTooth}: норма. Патологических изменений костной ткани и периапикальных очагов деструкции на снимке не выявлено. Кортикальная пластинка альвеолы и периодонтальная щель прослеживаются на всем протяжении.`;

		applyRadiologyProtocolToForm043({
			protocol: statement,
			options: { toothFdi: p.toothFdiCode ? String(p.toothFdiCode) : undefined, modalityLabel: "RVG/DICOM" },
			onInsertToProtocol: p.onInsertToProtocol, showNotification: false,
		});

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const current = prev.objectiveStatus || "";
				return { ...prev, objectiveStatus: current.trim() ? `${current.trim()}\n${statement}` : statement };
			});
		} catch {}

		p.onInsertToProtocol?.(statement);
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(statement).catch(() => {});
		}

		setIsNormaApplied(true);
		showToast(`Заключение «Норма» внесено в медицинскую карту${targetTooth}`, "success");
	}, [p.toothFdiCode, p.onInsertToProtocol]);

	const handleApplyStandardProtocol = useCallback((preset: (typeof RADIOLOGY_STANDARD_PROTOCOLS)[number]) => {
		applyRadiologyProtocolToForm043({
			protocol: preset.text,
			options: { toothFdi: p.toothFdiCode ? String(p.toothFdiCode) : undefined, modalityLabel: "RVG/DICOM" },
			onInsertToProtocol: p.onInsertToProtocol, showNotification: true,
		});
		p.setIsProtocolsOpen(false);
	}, [p.toothFdiCode, p.onInsertToProtocol, p.setIsProtocolsOpen]);

	const handleExportImage = useCallback(async () => {
		const rawImg = p.rawImageRef.current;
		if (!rawImg) {
			showToast("Нет активного снимка для экспорта", "error");
			return;
		}
		setIsExporting(true);
		try {
			const activePatientName =
				p.activeStudy && "patientName" in p.activeStudy && typeof p.activeStudy.patientName === "string"
					? p.activeStudy.patientName
					: p.patientName || undefined;
			const activePatientBirthDate =
				p.activeStudy && "patientBirthDate" in p.activeStudy && typeof p.activeStudy.patientBirthDate === "string"
					? p.activeStudy.patientBirthDate
					: p.patientBirthDate || undefined;
			const activeModalityLabel =
				p.activeStudy && "modalityLabel" in p.activeStudy && typeof p.activeStudy.modalityLabel === "string"
					? p.activeStudy.modalityLabel
					: "IO-СЕНСОР";
			const activeStudyDate =
				p.activeStudy && "studyDate" in p.activeStudy && typeof p.activeStudy.studyDate === "string"
					? p.activeStudy.studyDate
					: undefined;

			const blob = await renderClinicalExportBlob({
				rawImage: rawImg, filteredCanvas: p.filteredCanvasRef.current,
				measurements: p.measurements, curvedCanals: p.curvedCanals,
				calibratedMmPerPx: p.calibratedMmPerPx, patientName: activePatientName,
				patientAge: p.patientAge || undefined, patientBirthDate: activePatientBirthDate,
				toothFdi: p.effectiveTooth || undefined, modalityLabel: activeModalityLabel,
				studyDate: activeStudyDate,
			});
			if (!blob) {
				showToast("Не удалось сформировать экспорт", "error");
				return;
			}
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = p.effectiveTooth ? `RVG_Tooth${p.effectiveTooth}_${Date.now()}.png` : `RVG_Scan_${Date.now()}.png`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast(p.effectiveTooth ? `Снимок зуба #${p.effectiveTooth} с калибровочной шкалой 5 мм экспортирован` : "Снимок с калибровочной шкалой 5 мм экспортирован", "success");
		} catch {
			showToast("Ошибка при экспорте снимка", "error");
		} finally {
			setIsExporting(false);
		}
	}, [p]);

	const handleProcessUploadedFile = useCallback(async (file: File) => {
		const objectUrl = URL.createObjectURL(file);
		const initialStudy: RadiologyFilmstripItem = {
			id: `uploaded-${Date.now()}`,
			title: file.name.replace(/\.[^/.]+$/, "") || (p.effectiveTooth ? `Снимок зуба ${p.effectiveTooth}` : "Снимок RVG"),
			modality: "intraoral_rvg", modalityLabel: "IO-СЕНСОР",
			studyDate: new Date().toLocaleDateString("ru-RU"),
			teethFdi: p.effectiveTooth ? [p.effectiveTooth] : [],
			imageUrl: objectUrl, thumbnailUrl: objectUrl,
		};
		p.setActiveStudy(initialStudy);
		p.onSelectStudy?.(initialStudy);

		try {
			const reader = new FileReader();
			const dataUrl = await new Promise<string>((resolve, reject) => {
				reader.onload = () => resolve(reader.result as string);
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});

			let patientId: string | undefined;
			try {
				const id = usePatientStore.getState().selectedPatientId;
				if (id) patientId = id;
			} catch {}

			const res = await fetch("/api/xray/scans", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": crypto.randomUUID(),
				},
				body: JSON.stringify({
					...(patientId && patientId.length === 36 ? { patientId } : {}),
					imageBase64: dataUrl,
					originalFilename: file.name,
					mimeType: file.type || "image/jpeg",
					...(p.effectiveTooth ? { toothCode: p.effectiveTooth } : {}),
					kind: "periapical",
				}),
			});

			if (res.ok) {
				const json = await res.json();
				const savedScan = json?.data ?? json;
				const persistedStudy: RadiologyFilmstripItem = {
					...initialStudy,
					id: savedScan.id || initialStudy.id,
					imageUrl: savedScan.fileUrl || objectUrl,
					thumbnailUrl: savedScan.fileUrl || objectUrl,
				};
				p.setActiveStudy(persistedStudy);
				p.onSelectStudy?.(persistedStudy);
				showToast(`Снимок «${file.name}» сохранен в хранилище клиники`, "success");
			} else {
				showToast(`Снимок «${file.name}» успешно открыт`, "info");
			}
		} catch {
			showToast(`Снимок «${file.name}» открыт локально`, "info");
		}
	}, [p]);

	const handleDirectFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) handleProcessUploadedFile(file);
		e.target.value = "";
	}, [handleProcessUploadedFile]);

	return {
		isNormaApplied, isExporting, handleInsertNorma,
		handleApplyStandardProtocol, handleExportImage,
		handleProcessUploadedFile, handleDirectFileUpload,
	};
}
