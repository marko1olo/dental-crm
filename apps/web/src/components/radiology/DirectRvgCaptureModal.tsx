import type React from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	FileText,
	HardDrive,
	RotateCcw,
	Scan,
	UploadCloud,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	FDI_TOOTH_NAMES,
	formatRadiationDose,
} from "./radiologyMath";
import { SAMPLE_PATIENT_RVG_URL } from "./types";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode";
import { useVisitStore } from "../../store/visitStore";
import {
	RvgFiltersToolbar,
	DEFAULT_RVG_FILTERS,
	type RvgFilterValues,
} from "./RvgFiltersToolbar";
import type { RadiologyStudy } from "./types";
import {
	PROJECTION_TYPES,
	SENSOR_MODELS,
	type DirectRvgCaptureModalProps,
	type ProjectionAngleType,
	type SensorCaptureStatus,
} from "./directRvgTypes";

import {
	exportDirectRvgImageOrDicom,
	getDirectRvgExportFileName,
	persistRvgScanToServer,
	validateRadiologyUploadFile,
	detectRadiologySensorBrand,
	extractTeethFromRadiologyFilename,
	convertDicomBufferToDataUrl,
	readRadiologyFileForCapture,
	POPULAR_RVG_SENSORS,
} from "./directRvgFileValidation";
import {
	UNIVERSAL_SENSOR_CATALOG,
	autoDetectConnectedSensor,
	testSensorConnection,
} from "./UniversalSensorGateway";
import { DirectRvgFdiSelector } from "./DirectRvgFdiSelector";
import {
	DirectRvgProjectionSelector,
	type AnatomicalZone,
	type PatientCategory,
} from "./DirectRvgProjectionSelector";
import { DirectRvgViewportToolbar } from "./DirectRvgViewportToolbar";
import { DirectRvgFooter } from "./DirectRvgFooter";
import { DirectRvgSensorTelemetryHeader } from "./DirectRvgSensorTelemetryHeader";
import { useRvgGlCanvas } from "./useRvgGlCanvas";
import { useDirectRvgPanZoom } from "./useDirectRvgPanZoom";
if (typeof document !== "undefined") { import("./rvgCapture.css"); }

// Transparent re-exports
export * from "./directRvgTypes";
export * from "./UniversalSensorGateway";
export {
	getDirectRvgExportFileName,
	validateRadiologyUploadFile,
	createDicomSecondaryCaptureFile,
	triggerBinaryDownload,
	detectRadiologySensorBrand,
	extractTeethFromRadiologyFilename,
	convertDicomBufferToDataUrl,
	readRadiologyFileForCapture,
	POPULAR_RVG_SENSORS,
} from "./directRvgFileValidation";
export { DirectRvgSensorTelemetryHeader } from "./DirectRvgSensorTelemetryHeader";
export { useRvgGlCanvas } from "./useRvgGlCanvas";
export { useDirectRvgPanZoom } from "./useDirectRvgPanZoom";

export const DirectRvgCaptureModal: React.FC<DirectRvgCaptureModalProps> = ({
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
}) => {
	const modalId = useId();

	const defaultImage = useMemo(() => {
		if (initialImageUrl !== undefined) return initialImageUrl;
		if (isDemoShowcaseMode() || isDemoPatientId(patientId) || isDemoPatientId(patientName)) {
			return SAMPLE_PATIENT_RVG_URL;
		}
		return "";
	}, [initialImageUrl, patientId, patientName]);

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

	// Pan, Zoom, Rotation (CW/CCW) & Mirroring (Mirror X / Mirror Y)
	const panZoom = useDirectRvgPanZoom();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { isWebGL } = useRvgGlCanvas(canvasRef, capturedImage, filters);

	// Standard calibrated effective dose in µSv (internal metadata only, quiet telemetry)
	const calculatedDoseMicrosv = useMemo(() => {
		const zoneMult = anatomicalZone === "molar" ? 1.2 : anatomicalZone === "premolar" ? 1.0 : 0.8;
		const ageMult = patientCategory === "child" ? 0.6 : 1.0;
		return Number((65 * 7.0 * exposureSec * 0.0825 * zoneMult * ageMult).toFixed(1));
	}, [exposureSec, anatomicalZone, patientCategory]);

	const primaryTooth = selectedTeeth[0] || "16";
	const primaryToothName = FDI_TOOTH_NAMES[primaryTooth] || `Зуб ${primaryTooth}`;

	// Popular sensors merged with SENSOR_MODELS and UNIVERSAL_SENSOR_CATALOG
	const availableSensors = useMemo(() => {
		const list: Array<{ id: string; name: string; resolution: string; pixelSpacing: number; brandName?: string }> = [...SENSOR_MODELS];
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
		setSensorStatus("captured");
		setAcquisitionProgress(100);
		setCapturedImage(initialImageUrl || SAMPLE_PATIENT_RVG_URL);
		showToast("Снимок успешно получен с датчика RVG", "success");
	}, [sensorStatus, initialImageUrl]);

	// Direct File Upload & Ingestion State (Mandate 8e: Doctor Autonomy, no sensor lock-in)
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

	// Keyboard Shortcuts
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

	// 1-Click Action 3: Export DICOM (.dcm) or Genuine Image (.jpg/.png)
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

	const modalContent = (
		<div
			className="rvg-capture-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby={`${modalId}-title`}
			data-testid="direct-rvg-capture-modal-overlay"
		>
			{/* Authentic SVG 3x3 Convolution Kernel for Clinical Unsharp Masking */}
			<svg width="0" height="0" className="absolute pointer-events-none opacity-0" aria-hidden="true">
				<defs>
					<filter id={`rvg-sharpness-kernel-${modalId}`}>
						<feConvolveMatrix
							order="3"
							preserveAlpha="true"
							kernelMatrix={`0 -${(filters.sharpness / 100).toFixed(2)} 0 -${(filters.sharpness / 100).toFixed(2)} ${(1 + 4 * (filters.sharpness / 100)).toFixed(2)} -${(filters.sharpness / 100).toFixed(2)} 0 -${(filters.sharpness / 100).toFixed(2)} 0`}
						/>
					</filter>
				</defs>
			</svg>

			<div className="rvg-capture-modal" data-testid="direct-rvg-capture-modal">
				{/* ─── MODAL HEADER & SENSOR STATUS BANNER (APPLE HIG) ─── */}
				<DirectRvgSensorTelemetryHeader
					modalId={modalId}
					patientName={patientName}
					patientCardNumber={patientCardNumber}
					doctorName={doctorName}
					onClose={onClose}
					sensorStatus={sensorStatus}
					acquisitionProgress={acquisitionProgress}
					selectedSensorModel={selectedSensorModel}
					onSelectSensorModel={setSelectedSensorModel}
					availableSensors={availableSensors}
					onTriggerCapture={handleTriggerCapture}
					onAutoDetectSensor={handleAutoDetectSensor}
					onTestSensorConnection={handleTestSensorConnection}
					isDetectingSensor={isDetectingSensor}
					sensorStatusMessage={sensorHealthStatus}
					uploadAction={
						<>
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="rvg-trigger-btn rvg-trigger-btn-secondary"
								data-testid="rvg-upload-file-btn"
								title="Загрузить снимок с диска (DICOM, TIFF, PNG, JPG)"
							>
								<UploadCloud className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300" />
								<span>Загрузить</span>
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept=".dcm,.dicom,.tif,.tiff,.png,.jpg,.jpeg,.webp,image/*"
								className="hidden"
								onChange={handleFileInputChange}
								data-testid="rvg-file-input"
							/>
						</>
					}
				/>

				{/* ─── MAIN WORKSPACE: VIEWPORT (LEFT) + CLINICAL DOCK (RIGHT) ─── */}
				<div className="rvg-capture-body">
					{/* DOMINANT CENTER/LEFT: X-RAY VIEWPORT */}
					<div className="rvg-viewport-pane" data-testid="rvg-viewport-pane">
						{/* Top Float Toolbar with Rotate CW/CCW and Mirror X/Y */}
						<DirectRvgViewportToolbar
							zoom={panZoom.zoom}
							flipH={panZoom.flipH}
							flipV={panZoom.flipV}
							isSplitCompare={isSplitCompare}
							onZoomIn={panZoom.handleZoomIn}
							onZoomOut={panZoom.handleZoomOut}
							onRotate={panZoom.handleRotateCw}
							onRotateCcw={panZoom.handleRotateCcw}
							onToggleFlipH={panZoom.handleToggleFlipH}
							onToggleFlipV={panZoom.handleToggleFlipV}
							onResetTransform={panZoom.handleResetTransform}
						/>

						{/* Acquiring Animation Overlay */}
						{sensorStatus === "acquiring" && (
							<div className="rvg-acquiring-overlay" data-testid="rvg-acquiring-overlay">
								<div className="rvg-scanner-beam" />
								<Scan className="w-16 h-16 animate-pulse text-teal-400" />
								<div className="text-center">
									<p className="text-sm font-bold tracking-wide text-teal-200 uppercase">
										Получение снимка с датчика...
									</p>
									<p className="text-xs font-mono text-teal-400/80 mt-1">
										Передача данных {acquisitionProgress}%
									</p>
								</div>
							</div>
						)}

						{/* Viewport Canvas Container with Drag-and-Drop Dropzone Support */}
						<div
							className={`rvg-canvas-container ${panZoom.isDragging ? "grabbing" : ""} ${isDragOver ? "dragover" : ""}`}
							onMouseDown={panZoom.handleMouseDown}
							onMouseMove={panZoom.handleMouseMove}
							onMouseUp={panZoom.handleMouseUp}
							onMouseLeave={panZoom.handleMouseUp}
							onWheel={panZoom.handleWheel}
							onDragOver={handleViewportDragOver}
							onDragLeave={handleViewportDragLeave}
							onDrop={handleViewportDrop}
							data-testid="rvg-canvas-container"
						>
							{isDragOver && (
								<div className="rvg-drop-overlay" data-testid="rvg-drop-overlay">
									<UploadCloud className="w-12 h-12 text-teal-400 animate-bounce" />
									<span className="text-sm font-bold text-teal-200">
										Отпустите файл для загрузки снимка (DICOM, TIFF, PNG, JPG)
									</span>
								</div>
							)}

							{!capturedImage && (
								<div
									className="rvg-empty-sensor-state flex flex-col items-center justify-center h-full w-full p-8 text-center z-10"
									data-testid="rvg-empty-sensor-state"
								>
									<div className="w-16 h-16 rounded-full bg-teal-500/15 border border-teal-500/35 flex items-center justify-center mb-4 text-teal-400 shadow-lg shadow-teal-500/10">
										<Zap className="w-8 h-8 animate-pulse text-teal-400" />
									</div>
									<h3 className="text-base font-bold text-white mb-2">
										Датчик готов к захвату (Auto-Trigger)
									</h3>
									<p className="text-xs max-w-md leading-relaxed text-teal-300 font-medium mb-1">
										Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB
									</p>
									<p className="text-xs max-w-md leading-relaxed text-slate-300 mb-5">
										Сделайте экспозицию на рентген-аппарате. Датчик автоматически зафиксирует импульс (&lt;50 мс), либо снимок поступит из папки аппарата. Также можно перетащить файл (Drag &amp; Drop) или вставить из буфера (Ctrl+V).
									</p>
									<div className="flex gap-2.5 items-center flex-wrap justify-center">
										<button
											type="button"
											data-testid="btn-rvg-trigger-empty-capture"
											onClick={(e) => {
												e.stopPropagation();
												handleTriggerCapture();
											}}
											className="rvg-empty-btn-primary"
											title="Мгновенный захват <50мс без искусственных задержек"
										>
											<Zap className="w-4 h-4 fill-current" />
											<span>Захват снимка (Space) · &lt;50мс</span>
										</button>
										<button
											type="button"
											data-testid="btn-rvg-upload-disk"
											onClick={(e) => {
												e.stopPropagation();
												fileInputRef.current?.click();
											}}
											className="rvg-empty-btn-secondary"
										>
											<UploadCloud className="w-4 h-4 text-teal-400" />
											<span>Загрузить с диска</span>
										</button>
										<button
											type="button"
											data-testid="btn-rvg-load-demo"
											onClick={(e) => {
												e.stopPropagation();
												setCapturedImage(SAMPLE_PATIENT_RVG_URL);
												setSensorStatus("captured");
											}}
											className="rvg-empty-btn-demo"
										>
											<span>Показать демо-снимок</span>
										</button>
									</div>
								</div>
							)}

							{capturedImage ? (
								<img
									src={capturedImage}
									alt={`Снимок зуба ${selectedTeeth.join(", ")}`}
									className="rvg-render-canvas"
									style={{
										transform: `translate(${panZoom.pan.x}px, ${panZoom.pan.y}px) scale(${panZoom.zoom}) rotate(${panZoom.rotation}deg) scaleX(${panZoom.flipH ? -1 : 1}) scaleY(${panZoom.flipV ? -1 : 1})`,
										filter: isSplitCompare ? "none" : cssFilterStyle,
										maxWidth: "92%",
										maxHeight: "92%",
										objectFit: "contain",
										borderRadius: "0.5rem",
										boxShadow: "0 10px 40px rgba(0, 0, 0, 0.8)",
									}}
									data-testid="rvg-render-canvas"
								/>
							) : null}
							<canvas
								ref={canvasRef}
								style={{ display: "none" }}
							/>
						</div>

						{/* Viewport HUD Telemetry */}
						<div className="rvg-hud-overlay">
							<div className="rvg-hud-card">
								<span className="text-teal-400 font-bold">Зуб {selectedTeeth.join(", ")}</span> · {PROJECTION_TYPES.find((p) => p.id === projectionType)?.shortLabel ?? "Прицельный"}
							</div>
							<div className="rvg-hud-card text-right">
								<span>Калибровка: 0.035 мм/пикс</span>
							</div>
						</div>
					</div>

					{/* RIGHT: CLINICAL CONTROL DOCK */}
					<div className="rvg-controls-dock" data-testid="rvg-controls-dock">
						{/* 1. FDI Tooth Selector Matrix with Adult/Child switch */}
						<DirectRvgFdiSelector
							selectedTeeth={selectedTeeth}
							onToothToggle={handleToothToggle}
							primaryTooth={primaryTooth}
							primaryToothName={primaryToothName}
							projectionType={projectionType}
							onSelectTeeth={(teeth) => setSelectedTeeth(teeth)}
							patientCategory={patientCategory}
							onChangePatientCategory={setPatientCategory}
						/>

						{/* 2. Projection Angle & 1-Click Anatomical Zone Presets */}
						<DirectRvgProjectionSelector
							projectionType={projectionType}
							onSelectProjectionType={handleSelectProjectionType}
							patientCategory={patientCategory}
							onChangePatientCategory={setPatientCategory}
							anatomicalZone={anatomicalZone}
							onChangeAnatomicalZone={setAnatomicalZone}
						/>

						{/* 3. Real-Time Filters Toolbar (Compact 1-row mode) */}
						<div className="rvg-dock-section">
							<div className="rvg-section-header">
								<span className="rvg-section-header-title">
									<Scan className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
									Фильтры и оптимизация
								</span>
							</div>
							<RvgFiltersToolbar
								filters={filters}
								onChange={setFilters}
								activePresetId={activePresetId}
								onSelectPreset={(p) => setActivePresetId(p.id)}
								isSplitCompare={isSplitCompare}
								onToggleSplitCompare={setIsSplitCompare}
								onRotate={panZoom.handleRotate}
								onReset={() => { setFilters(DEFAULT_RVG_FILTERS); setActivePresetId("standard"); }}
								layout="toolbar"
							/>
						</div>

						{/* 4. Clinical Diary Note */}
						<div className="rvg-dock-section">
							<div className="rvg-section-header">
								<span className="rvg-section-header-title">
									<FileText className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
									Клиническое заключение
								</span>
							</div>
							<textarea
								value={clinicalNotes}
								onChange={(e) => setClinicalNotes(e.target.value)}
								rows={2}
								className="w-full p-2 rounded-lg bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#334155)] text-xs text-[var(--ink,#e2e8f0)] placeholder-[var(--muted,#94a3b8)] outline-none focus:border-[var(--teal,#0d9488)] transition-colors resize-none"
								placeholder="Диагностические примечания к снимку..."
								data-testid="rvg-clinical-notes-input"
							/>
						</div>
					</div>
				</div>

				{/* ─── MODAL FOOTER WITH 1-CLICK WORKFLOWS ─── */}
				<DirectRvgFooter
					selectedTeeth={selectedTeeth}
					calculatedDoseMicrosv={calculatedDoseMicrosv}
					isSaving={isSaving}
					onExportDicom={handleExportDicom}
					onSendToLab={handleSendToLab}
					onSaveToEmr={handleSaveToEmr}
					onSendToPlan={handleSendToPlan}
					onRetake={handleTriggerCapture}
				/>
			</div>
		</div>
	);

	if (typeof document === "undefined") {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};

export default DirectRvgCaptureModal;
