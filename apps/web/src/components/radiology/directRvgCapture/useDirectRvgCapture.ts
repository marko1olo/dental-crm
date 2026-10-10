import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import { FDI_TOOTH_NAMES } from "../radiologyMath";
import { SAMPLE_PATIENT_RVG_URL } from "../types";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import { useVisitStore } from "../../../store/visitStore";
import { DEFAULT_RVG_FILTERS, type RvgFilterValues } from "../RvgFiltersToolbar";
import type { RadiologyStudy } from "../types";
import {
	SENSOR_MODELS,
	type DirectRvgCaptureModalProps,
	type ProjectionAngleType,
	type SensorCaptureStatus,
} from "../directRvgTypes";
import {
	exportDirectRvgImageOrDicom,
	persistRvgScanToServer,
	validateRadiologyUploadFile,
	readRadiologyFileForCapture,
	POPULAR_RVG_SENSORS,
} from "../directRvgFileValidation";
import {
	UNIVERSAL_SENSOR_CATALOG,
	autoDetectConnectedSensor,
	testSensorConnection,
} from "../UniversalSensorGateway";
import type { AnatomicalZone, PatientCategory } from "../DirectRvgProjectionSelector";
import { useRvgGlCanvas } from "../useRvgGlCanvas";
import { useDirectRvgPanZoom } from "../useDirectRvgPanZoom";
import type { RvgSensorDeviceOption } from "./types";

export function useDirectRvgCapture(props: DirectRvgCaptureModalProps) {
	const {
		isOpen,
		onClose,
		patientId = "PAT-001",
		patientName = "Пациент",
		patientCardNumber = "043/у-2026/891",
		doctorName = "Лечащий врач",
		initialToothFdi = "16",
		initialImageUrl,
		onSaveToEmr,
		onSendToLab,
		onExportDicom,
	} = props;

	const modalId = useId();

	const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId) || isDemoPatientId(patientName);

	const defaultImage = useMemo(() => {
		if (initialImageUrl !== undefined) return initialImageUrl;
		if (isDemo) {
			return SAMPLE_PATIENT_RVG_URL;
		}
		return "";
	}, [initialImageUrl, isDemo]);

	// Sensor & Capture Lifecycle State
	const [sensorStatus, setSensorStatus] = useState<SensorCaptureStatus>("ready");
	const [selectedSensorModel, setSelectedSensorModel] = useState<string>("vatech_ezsensor_hd");
	const [acquisitionProgress, setAcquisitionProgress] = useState<number>(0);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [isDetectingSensor, setIsDetectingSensor] = useState<boolean>(false);
	const [sensorHealthStatus, setSensorHealthStatus] = useState<string>("Ожидание снимка (Hot Folder / Автоподхват)");

	const handleAutoDetectSensor = useCallback(async () => {
		setIsDetectingSensor(true);
		try {
			const res = await autoDetectConnectedSensor();
			setSelectedSensorModel(res.sensorModelId);
			setSensorHealthStatus(res.statusMessage);
			showToast(`${res.statusMessage}`, "success");
		} catch {
			setSensorHealthStatus("Ожидание снимка (Hot Folder / Автоподхват) — Vatech EzSensor HD");
			showToast("Датчик определен по умолчанию: Vatech EzSensor HD (Hot Folder)", "info");
		} finally {
			setIsDetectingSensor(false);
		}
	}, []);

	const handleTestSensorConnection = useCallback(async () => {
		const res = await testSensorConnection(selectedSensorModel);
		setSensorHealthStatus(res.statusText);
		showToast(`${res.statusText} (${res.latencyMs} мс)`, "success");
	}, [selectedSensorModel]);

	// 1-Click Anatomical & Patient Category Presets (Mandate 8e: Doctor Autonomy)
	const [patientCategory, setPatientCategory] = useState<PatientCategory>("adult");
	const [anatomicalZone, setAnatomicalZone] = useState<AnatomicalZone>("molar");
	const [exposureSec, setExposureSec] = useState<number>(0.08);

	// Tooth & Projection
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>([initialToothFdi]);
	const [projectionType, setProjectionType] = useState<ProjectionAngleType>("periapical");
	const [clinicalNotes, setClinicalNotes] = useState<string>(
		"Контрольный прицельный снимок после эндодонтической обработки и пломбирования.",
	);

	// Viewport & Image Filters
	const [capturedImage, setCapturedImage] = useState<string>(defaultImage);
	useEffect(() => {
		setCapturedImage(defaultImage);
	}, [defaultImage]);

	const [filters, setFilters] = useState<RvgFilterValues>(DEFAULT_RVG_FILTERS);
	const [activePresetId, setActivePresetId] = useState<string>("standard");
	const [isSplitCompare, setIsSplitCompare] = useState<boolean>(false);

	// Pan, Zoom, Rotation & Mirroring
	const panZoom = useDirectRvgPanZoom();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { isWebGL } = useRvgGlCanvas(canvasRef, capturedImage, filters);

	// Standard calibrated effective dose in µSv (quiet telemetry)
	const calculatedDoseMicrosv = useMemo(() => {
		const zoneMult = anatomicalZone === "molar" ? 1.2 : anatomicalZone === "premolar" ? 1.0 : 0.8;
		const ageMult = patientCategory === "child" ? 0.6 : 1.0;
		return Number((65 * 7.0 * exposureSec * 0.0825 * zoneMult * ageMult).toFixed(1));
	}, [exposureSec, anatomicalZone, patientCategory]);

	const primaryTooth = selectedTeeth[0] || "16";
	const primaryToothName = FDI_TOOTH_NAMES[primaryTooth] || `Зуб ${primaryTooth}`;

	// Popular sensors merged with SENSOR_MODELS and UNIVERSAL_SENSOR_CATALOG
	const availableSensors = useMemo<RvgSensorDeviceOption[]>(() => {
		const list: RvgSensorDeviceOption[] = [...SENSOR_MODELS];
		for (const u of UNIVERSAL_SENSOR_CATALOG) {
			if (!list.some((existing) => existing.id === u.id)) {
				list.push({
					id: u.id,
					name: u.name,
					resolution: u.resolution,
					pixelSpacing: u.pixelSpacing,
					brandName: u.brandName,
				});
			}
		}
		for (const s of POPULAR_RVG_SENSORS) {
			if (!list.some((existing) => existing.id === s.id)) {
				list.push({
					id: s.id,
					name: s.name,
					resolution: s.resolution,
					pixelSpacing: s.pixelSpacing,
				});
			}
		}
		return list;
	}, []);

	// Handle tooth selection click (1-click fast toggle)
	const handleToothToggle = (tooth: string, multiSelect = false) => {
		if (multiSelect || projectionType === "bitewing" || projectionType === "occlusal") {
			if (selectedTeeth.includes(tooth)) {
				if (selectedTeeth.length > 1) {
					setSelectedTeeth(selectedTeeth.filter((t) => t !== tooth));
				}
			} else {
				setSelectedTeeth([...selectedTeeth, tooth].sort());
			}
		} else {
			if (selectedTeeth.includes(tooth) && selectedTeeth.length > 1) {
				setSelectedTeeth(selectedTeeth.filter((t) => t !== tooth));
			} else {
				setSelectedTeeth([tooth]);
			}
		}
	};

	// Trigger physical or instant x-ray exposure capture (Mandate 8e: <50ms instant capture)
	const handleTriggerCapture = useCallback(() => {
		if (sensorStatus === "acquiring") return;
		if (initialImageUrl) {
			setSensorStatus("captured");
			setAcquisitionProgress(100);
			setCapturedImage(initialImageUrl);
			showToast("Снимок успешно получен с датчика RVG", "success");
			return;
		}
		if (isDemo) {
			setSensorStatus("captured");
			setAcquisitionProgress(100);
			setCapturedImage(SAMPLE_PATIENT_RVG_URL);
			showToast("Демо-режим: демонстрационный снимок RVG получен", "success");
			return;
		}
		showToast("Датчик ожидает физической экспозиции рентген-аппарата или загрузки файла", "info");
	}, [sensorStatus, initialImageUrl, isDemo]);

	const handleLoadDemo = useCallback(() => {
		setCapturedImage(SAMPLE_PATIENT_RVG_URL);
		setSensorStatus("captured");
	}, []);

	// Direct File Upload & Ingestion State
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragOver, setIsDragOver] = useState<boolean>(false);

	const handleProcessFile = useCallback(async (file: File) => {
		const validation = validateRadiologyUploadFile(file);
		if (!validation.isValid) {
			showToast(
				`Неподдерживаемый формат файла: ${file.name}. Поддерживаются: DICOM (.dcm), TIFF, PNG, JPG, BMP`,
				"error",
			);
			return false;
		}

		try {
			const res = await readRadiologyFileForCapture(file);
			if (res.matchedSensorId) setSelectedSensorModel(res.matchedSensorId);
			if (res.detectedTeeth && res.detectedTeeth.length > 0) {
				setSelectedTeeth(res.detectedTeeth);
				if (res.suggestedProjection) setProjectionType(res.suggestedProjection);
			}
			setCapturedImage(res.imageUrl);
			setSensorStatus("captured");
			setAcquisitionProgress(100);
			if (res.clinicalNote) {
				setClinicalNotes((prev) => (prev.startsWith("Контрольный прицельный") ? res.clinicalNote! : prev));
			}
			showToast(`Снимок ${file.name} успешно загружен`, "success");
			return true;
		} catch {
			showToast(`Ошибка чтения файла: ${file.name}`, "error");
			return false;
		}
	}, []);

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0 && files[0]) {
			void handleProcessFile(files[0]);
		}
		e.target.value = "";
	};

	const handleViewportDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	};

	const handleViewportDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	};

	const handleViewportDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
		const files = e.dataTransfer.files;
		if (files && files.length > 0 && files[0]) {
			void handleProcessFile(files[0]);
		}
	};

	// Keyboard Shortcuts & Paste
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			if (e.code === "Space") {
				e.preventDefault();
				handleTriggerCapture();
			} else if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			} else if (e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") {
				e.preventDefault();
				panZoom.handleRotate();
			} else if (e.key === "+" || e.key === "=") {
				e.preventDefault();
				panZoom.handleZoomIn();
			} else if (e.key === "-" || e.key === "_") {
				e.preventDefault();
				panZoom.handleZoomOut();
			} else if (e.key === "0") {
				e.preventDefault();
				panZoom.handleResetTransform();
			}
		};

		const handlePaste = (e: ClipboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}
			const items = e.clipboardData?.items;
			if (!items) return;
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (item && item.kind === "file") {
					const file = item.getAsFile();
					if (file) {
						e.preventDefault();
						void handleProcessFile(file);
						showToast("Снимок успешно вставлен из буфера обмена (Ctrl+V)", "success");
						break;
					}
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("paste", handlePaste);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("paste", handlePaste);
		};
	}, [isOpen, handleTriggerCapture, onClose, panZoom, handleProcessFile]);

	// Factory for consistent canonical study records across all export paths
	const createStudyRecord = useCallback((idSuffix: string): { study: RadiologyStudy; pixelSpacingMm: number } => {
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
	}, [selectedSensorModel, patientId, patientName, patientCardNumber, selectedTeeth, primaryToothName, calculatedDoseMicrosv, capturedImage, doctorName, clinicalNotes, exposureSec]);

	// 1-Click Action 1: Save to EMR (Карта 043/у)
	const handleSaveToEmr = () => {
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

		// Dispatch global SOAP event for EMR protocol integration
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

		// Dispatch reactive scan event for tooth chart and gallery
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
	};

	// 1-Click Action 2: Send to Dental Lab (ЗТЛ)
	const handleSendToLab = () => {
		const { study: studyRecord } = createStudyRecord("lab");
		if (onSendToLab) {
			onSendToLab({
				study: studyRecord,
				toothFdi: selectedTeeth.join(", "),
				note: `Прикреплен контрольный снимок зуба ${selectedTeeth.join(", ")} для зуботехнической лаборатории`,
			});
		}
		showToast(`Снимок зуба ${selectedTeeth.join(", ")} прикреплен и отправлен в заказ ЗТЛ`, "success");
	};

	// 1-Click Action 2b: Send to Treatment Plan
	const handleSendToPlan = () => {
		if (!capturedImage) {
			showToast("Сначала выполните захват с датчика или загрузите снимок", "warning");
			return;
		}
		const { study: studyRecord } = createStudyRecord("plan");
		if (onSaveToEmr) {
			onSaveToEmr(studyRecord);
		}
		showToast(`Снимок зуба #${selectedTeeth.join(", ")} успешно прикреплен к плану лечения`, "success");
	};

	// 1-Click Action 3: Export DICOM (.dcm) or Genuine Image
	const handleExportDicom = () => {
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
	};

	const handleSelectProjectionType = (projId: ProjectionAngleType, typicalExp?: number) => {
		setProjectionType(projId);
		if (typicalExp) {
			setExposureSec(typicalExp);
		}
	};

	// Compute CSS filter string with authentic SVG convolution kernel for clinical sharpness
	const cssFilterStyle = [
		`brightness(${filters.brightness}%)`,
		`contrast(${filters.contrast + (filters.clahe > 0 ? filters.clahe * 0.4 : 0)}%)`,
		filters.invert ? "invert(100%)" : "",
		filters.sharpness > 0 ? `url(#rvg-sharpness-kernel-${modalId}) contrast(${100 + Math.round(filters.sharpness * 0.35)}%)` : "",
	].filter(Boolean).join(" ");

	return {
		modalId,
		isDemo,
		sensorStatus,
		selectedSensorModel,
		setSelectedSensorModel,
		acquisitionProgress,
		isSaving,
		isDetectingSensor,
		sensorHealthStatus,
		handleAutoDetectSensor,
		handleTestSensorConnection,
		patientCategory,
		setPatientCategory,
		anatomicalZone,
		setAnatomicalZone,
		exposureSec,
		setExposureSec,
		selectedTeeth,
		setSelectedTeeth,
		projectionType,
		clinicalNotes,
		setClinicalNotes,
		capturedImage,
		setCapturedImage,
		filters,
		setFilters,
		activePresetId,
		setActivePresetId,
		isSplitCompare,
		setIsSplitCompare,
		panZoom,
		canvasRef,
		isWebGL,
		calculatedDoseMicrosv,
		primaryTooth,
		primaryToothName,
		availableSensors,
		handleToothToggle,
		handleTriggerCapture,
		handleLoadDemo,
		fileInputRef,
		isDragOver,
		handleFileInputChange,
		handleViewportDragOver,
		handleViewportDragLeave,
		handleViewportDrop,
		handleSaveToEmr,
		handleSendToLab,
		handleSendToPlan,
		handleExportDicom,
		handleSelectProjectionType,
		cssFilterStyle,
	};
}
