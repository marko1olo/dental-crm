import { useCallback, useState } from "react";
import type React from "react";
import { generateUuidV7 } from "@dental/shared";
import { clientLogger } from "../../../../services/logging/clientLogger.js";
import { renderClinicalExportBlob } from "../../dentalViewerCanvasDraw.js";
import { RADIOLOGY_STANDARD_PROTOCOLS, applyRadiologyProtocolToForm043 } from "../../radiologyProtocols.js";
import { useVisitStore } from "../../../../store/visitStore.js";
import { usePatientStore } from "../../../../store/patientStore.js";
import { showToast } from "../../../GlobalToast.js";
import { denteClinicalMutationHeaders } from "../../../../lib/denteRequestHeaders.js";
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
		} catch (visitErr) {
			clientLogger.warn("[SensorViewerExport] Не удалось записать статус в дневник визита", visitErr, {
				module: "SensorViewerExport",
			});
		}

		p.onInsertToProtocol?.(statement);
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(statement).catch((clipErr) => {
				clientLogger.warn("[SensorViewerExport] Не удалось скопировать заключение в буфер обмена", clipErr, {
					module: "SensorViewerExport",
				});
			});
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
			} catch (storeErr) {
				clientLogger.warn("[SensorViewerExport] Ошибка получения selectedPatientId", storeErr, {
					module: "SensorViewerExport",
				});
			}

			const hasValidUuid = Boolean(
				patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId),
			);
			if (!hasValidUuid) {
				showToast(`Снимок «${file.name}» успешно открыт`, "info");
				return;
			}

			const res = await fetch("/api/imaging/studies", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					patientId,
					title: file.name,
					imageBase64: dataUrl,
					sourceKind: "sensor_bridge",
					sourceName: file.name.slice(0, 160),
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
		} catch (uploadErr) {
			clientLogger.warn("[SensorViewerExport] Ошибка сохранения снимка на сервере", uploadErr, {
				module: "SensorViewerExport",
			});
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
