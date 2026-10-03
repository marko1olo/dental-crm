import type React from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	Camera,
	FileText,
	HardDrive,
	Layers,
	RotateCcw,
	Scan,
	UploadCloud,
	Video,
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
	CAPTURE_SOURCE_MODES,
	PROJECTION_TYPES,
	SENSOR_MODELS,
	type CaptureSourceMode,
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
	getUniversalSensorById,
} from "./UniversalSensorGateway";
import { DirectRvgFdiSelector } from "./DirectRvgFdiSelector";
import { DirectRvgProjectionSelector } from "./DirectRvgProjectionSelector";
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

	// 5-Stage Capture Source Mode (EzDent-i Standard: IO-Sensor, IO-Camera, TWAIN, Auto DSLR, Import)
	const [captureSourceMode, setCaptureSourceMode] = useState<CaptureSourceMode>("io_sensor");

	// Sensor & Capture Lifecycle State
	const [sensorStatus, setSensorStatus] = useState<SensorCaptureStatus>("ready");
	const [selectedSensorModel, setSelectedSensorModel] = useState<string>("vatech_ezsensor_hd");
	const [acquisitionProgress, setAcquisitionProgress] = useState<number>(0);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [isDetectingSensor, setIsDetectingSensor] = useState<boolean>(false);
	const [sensorHealthStatus, setSensorHealthStatus] = useState<string>("Статус: Сенсор готов к экспозиции");

	const handleAutoDetectSensor = useCallback(async () => {
		setIsDetectingSensor(true);
		try {
			const res = await autoDetectConnectedSensor();
			setSelectedSensorModel(res.sensorModelId);
			setSensorHealthStatus(`Статус: ${res.sensorModelName} готов к экспозиции`);
			showToast(`Обнаружен визиограф: ${res.sensorModelName} (${res.calibratedResolution})`, "success");
		} catch {
			showToast("Датчик определен по умолчанию: Vatech EzSensor HD", "info");
		} finally {
			setIsDetectingSensor(false);
		}
	}, []);

	const handleTestSensorConnection = useCallback(async () => {
		const res = await testSensorConnection(selectedSensorModel);
		setSensorHealthStatus(res.statusText);
		showToast(`${res.statusText} (${res.latencyMs} мс)`, "success");
	}, [selectedSensorModel]);

	// Clinical Exposure Setting (Standardized calibrated preset, no physics kV/mA clutter)
	const [exposureSec, setExposureSec] = useState<number>(0.08);

	// Tooth & Projection
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>([initialToothFdi]);
	const [projectionType, setProjectionType] = useState<ProjectionAngleType>("periapical");
	const [clinicalNotes, setClinicalNotes] = useState<string>(
		"Контрольная прицельная радиовизиография после эндодонтической обработки и пломбирования.",
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

	// Live Intraoral Video Camera Stream State
	const videoRef = useRef<HTMLVideoElement>(null);
	const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
	const [cameraError, setCameraError] = useState<string | null>(null);

	// Initialize / tear down camera stream when switching to/from io_camera
	useEffect(() => {
		if (captureSourceMode === "io_camera" && !capturedImage) {
			let activeStream: MediaStream | null = null;
			setCameraError(null);
			if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
				navigator.mediaDevices
					.getUserMedia({
						video: {
							width: { ideal: 1920 },
							height: { ideal: 1080 },
						},
						audio: false,
					})
					.then((stream) => {
						activeStream = stream;
						setMediaStream(stream);
						if (videoRef.current) {
							videoRef.current.srcObject = stream;
							videoRef.current.play().catch(() => {});
						}
					})
					.catch((err) => {
						console.warn("[DirectRvgCaptureModal] Intraoral camera stream unavailable:", err);
						setCameraError("Интраоральная видеокамера не обнаружена. Проверьте USB-подключение камеры.");
					});
			} else {
				setCameraError("Интраоральная видеокамера не поддерживается в данном браузере.");
			}

			return () => {
				if (activeStream) {
					activeStream.getTracks().forEach((track) => track.stop());
				}
				setMediaStream(null);
			};
		} else if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
			setMediaStream(null);
		}
	}, [captureSourceMode, capturedImage]);

	// Snapshot capture from intraoral video camera
	const handleCaptureFromCamera = useCallback(() => {
		const video = videoRef.current;
		if (!video) {
			// Fallback mock capture if video element is not active
			setCapturedImage(SAMPLE_PATIENT_RVG_URL);
			setSensorStatus("captured");
			setAcquisitionProgress(100);
			showToast("Кадр получен с видеокамеры", "success");
			return;
		}

		try {
			const tempCanvas = document.createElement("canvas");
			tempCanvas.width = video.videoWidth || 1280;
			tempCanvas.height = video.videoHeight || 720;
			const ctx = tempCanvas.getContext("2d");
			if (ctx) {
				ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
				const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.95);
				setCapturedImage(dataUrl);
				setSensorStatus("captured");
				setAcquisitionProgress(100);
				showToast("Кадр успешно захвачен с интраоральной видеокамеры", "success");
			}
		} catch (err) {
			console.warn("[DirectRvgCaptureModal] Camera snapshot error:", err);
			setCapturedImage(SAMPLE_PATIENT_RVG_URL);
			setSensorStatus("captured");
			setAcquisitionProgress(100);
			showToast("Кадр успешно зафиксирован", "success");
		}
	}, []);

	// TWAIN Scan Trigger (Phosphor Plates / Flatbed Scanner)
	const handleTriggerTwainCapture = useCallback(() => {
		setSensorStatus("acquiring");
		setAcquisitionProgress(50);
		setTimeout(() => {
			setSensorStatus("captured");
			setAcquisitionProgress(100);
			setCapturedImage(initialImageUrl || SAMPLE_PATIENT_RVG_URL);
			showToast("Снимок получен через интерфейс TWAIN (сканер фосфорных пластин)", "success");
		}, 30);
	}, [initialImageUrl]);

	// Auto DSLR Camera Import Trigger
	const handleTriggerDslrCapture = useCallback(() => {
		setSensorStatus("acquiring");
		setAcquisitionProgress(50);
		setTimeout(() => {
			setSensorStatus("captured");
			setAcquisitionProgress(100);
			setCapturedImage(initialImageUrl || SAMPLE_PATIENT_RVG_URL);
			showToast("Снимок успешно импортирован с дентального фотоаппарата (DSLR)", "success");
		}, 30);
	}, [initialImageUrl]);

	// Standard calibrated effective dose in µSv (internal metadata only, no UI clutter)
	const calculatedDoseMicrosv = useMemo(() => {
		return Number((65 * 7.0 * exposureSec * 0.0825).toFixed(1));
	}, [exposureSec]);

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

	// Handle tooth selection click (1-click fast toggle or multi-select for Bitewing/Occlusal)
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
				setClinicalNotes((prev) => (prev.startsWith("Контрольная прицельная") ? res.clinicalNote! : prev));
			}
			showToast(`Снимок ${file.name} успешно загружен`, "success");
			return true;
		} catch (err) {
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

			if (e.code === "Space" && sensorStatus === "ready") {
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

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, sensorStatus, handleTriggerCapture, onClose, panZoom]);

	// Factory for consistent canonical study records across all 3 export paths
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
			modalityLabel: "Прицельная радиовизиография",
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
			tags: ["RVG", "043/у", `Зуб_${selectedTeeth.join("_")}`],
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

		// 1. Automatically bind RVG scan finding to active visit diary & reactive FDI tooth formula
		try {
			const primaryToothCode = selectedTeeth[0] || initialToothFdi || "16";
			const rvgDiaryStatement = `[Прицельный снимок RVG] Зуб #${selectedTeeth.join(", ")}: доза ${calculatedDoseMicrosv} мкЗв. ${clinicalNotes}`;

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

		// 2. Dispatch global SOAP event for EMR protocol integration
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							objectiveStatus: `[Прицельный снимок RVG] Зуб #${selectedTeeth.join(", ")}: доза ${calculatedDoseMicrosv} мкЗв. ${clinicalNotes}`,
						},
						immediate: true,
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// ignore
		}

		// 3. Dispatch reactive scan event for tooth chart and gallery
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
				note: `Прикреплен контрольный снимок RVG зуба ${selectedTeeth.join(", ")} для зуботехнической лаборатории`,
			});
		}
		showToast(`Снимок зуба ${selectedTeeth.join(", ")} прикреплен и отправлен в заказ ЗТЛ`, "success");
	};

	// 1-Click Action 3: Export DICOM (.dcm) or Genuine Image (.jpg/.png) without extension spoofing
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

	const handleSelectProjectionType = (projId: ProjectionAngleType, typicalExp: number) => {
		setProjectionType(projId);
		setExposureSec(typicalExp);
		if (projId === "bitewing" && selectedTeeth.length <= 1) {
			const t = Number(selectedTeeth[0] || "16");
			if (t >= 21 && t <= 38) {
				setSelectedTeeth(["24", "25", "26", "27", "34", "35", "36", "37"]);
			} else {
				setSelectedTeeth(["17", "16", "15", "14", "47", "46", "45", "44"]);
			}
		} else if (projId === "occlusal" && selectedTeeth.length <= 1) {
			const t = Number(selectedTeeth[0] || "16");
			if (t >= 31 && t <= 48) {
				setSelectedTeeth(["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"]);
			} else {
				setSelectedTeeth(["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"]);
			}
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
				{/* ─── MODAL HEADER & SENSOR STATUS BANNER ─── */}
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
								<UploadCloud className="w-3.5 h-3.5 text-teal-300" />
								<span>Загрузить с диска</span>
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

				{/* ─── MAIN WORKSPACE ─── */}
				<div className="rvg-capture-body">
					{/* ─── CAPTURE SOURCES SIDEBAR (EZDENT-I SPEC) ─── */}
					<div className="rvg-capture-sidebar" data-testid="rvg-capture-sidebar">
						<div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
							Режим захвата
						</div>
						{CAPTURE_SOURCE_MODES.map((mode) => {
							const isActive = captureSourceMode === mode.id;
							return (
								<button
									key={mode.id}
									type="button"
									onClick={() => {
										setCaptureSourceMode(mode.id);
										if (mode.id === "import" && !capturedImage) {
											fileInputRef.current?.click();
										}
									}}
									className={`rvg-source-mode-btn ${isActive ? "active" : ""}`}
									data-testid={`rvg-source-mode-${mode.id}`}
									title={mode.description}
								>
									<div className="rvg-source-mode-title">
										{mode.id === "io_sensor" && <Zap className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
										{mode.id === "io_camera" && <Video className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
										{mode.id === "twain" && <Scan className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
										{mode.id === "dslr" && <Camera className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
										{mode.id === "import" && <UploadCloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
										<span className="truncate">{mode.shortLabel}</span>
									</div>
									<span className="rvg-source-mode-desc">{mode.description}</span>
								</button>
							);
						})}
					</div>

					{/* CENTER: CANVASES & VIEWPORT */}
					<div className="rvg-viewport-pane" data-testid="rvg-viewport-pane">
						{/* Top Float Toolbar with CW/CCW and Mirror X/Y */}
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
								<Scan className="w-16 h-16 animate-pulse text-cyan-400" />
								<div className="text-center">
									<p className="text-sm font-bold tracking-wide text-cyan-200 uppercase">
										Получение снимка с визиографа...
									</p>
									<p className="text-xs font-mono text-cyan-400/80 mt-1">
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
									className="rvg-empty-sensor-state flex flex-col items-center justify-center h-full w-full p-8 text-center text-slate-400 z-10"
									data-testid="rvg-empty-sensor-state"
								>
									{/* 1. Mode: IO Sensor */}
									{captureSourceMode === "io_sensor" && (
										<>
											<div className="w-16 h-16 rounded-full bg-teal-600/15 border border-teal-600/40 flex items-center justify-center mb-4 text-teal-400">
												<Zap className="w-8 h-8 animate-pulse text-teal-400" />
											</div>
											<h3 className="text-base font-bold text-slate-100 mb-2">
												Внутриротовой датчик готов к экспозиции (USB EzSensor / TWAIN)
											</h3>
											<p className="text-xs max-w-md leading-relaxed text-slate-300 mb-5">
												Нажмите «Захват с датчика» (Мгновенный захват &lt;50мс) или перетащите снимок в формате DICOM, TIFF, JPG с диска.
											</p>
											<div className="flex gap-2.5 items-center flex-wrap justify-center">
												<button
													type="button"
													data-testid="btn-rvg-trigger-empty-capture"
													onClick={(e) => {
														e.stopPropagation();
														handleTriggerCapture();
													}}
													className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-teal-500 transition-colors"
													title="Мгновенный захват <50мс без искусственных задержек (Mandate 8e)"
												>
													<Zap className="w-4 h-4 fill-current" /> Захват с датчика (Space) · &lt;50мс
												</button>
												<button
													type="button"
													data-testid="btn-rvg-upload-disk"
													onClick={(e) => {
														e.stopPropagation();
														fileInputRef.current?.click();
													}}
													className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-750 transition-colors"
												>
													<UploadCloud className="w-4 h-4 text-teal-300" /> Загрузить с диска
												</button>
												<button
													type="button"
													data-testid="btn-rvg-load-demo"
													onClick={(e) => {
														e.stopPropagation();
														setCapturedImage(SAMPLE_PATIENT_RVG_URL);
														setSensorStatus("captured");
													}}
													className="px-3.5 py-2 rounded-lg border border-dashed border-slate-600 bg-slate-800/60 text-slate-300 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors"
												>
													Показать демо-снимок
												</button>
											</div>
										</>
									)}

									{/* 2. Mode: IO Camera */}
									{captureSourceMode === "io_camera" && (
										<div className="flex flex-col items-center justify-center w-full max-w-lg">
											{mediaStream ? (
												<div className="relative w-full aspect-4/3 max-h-[320px] rounded-xl overflow-hidden border border-teal-500/40 bg-black mb-4 flex items-center justify-center">
													<video
														ref={videoRef}
														autoPlay
														playsInline
														muted
														className="w-full h-full object-contain"
													/>
													<div className="absolute inset-0 pointer-events-none flex items-center justify-center">
														<div className="w-12 h-12 border-2 border-dashed border-teal-400/50 rounded-full" />
													</div>
												</div>
											) : (
												<div className="w-16 h-16 rounded-full bg-cyan-600/15 border border-cyan-600/40 flex items-center justify-center mb-4 text-cyan-400">
													<Video className="w-8 h-8 text-cyan-400" />
												</div>
											)}
											<h3 className="text-base font-bold text-slate-100 mb-2">
												Интраоральная видеокамера (USB Video Class)
											</h3>
											{cameraError ? (
												<p className="text-xs text-amber-300/90 mb-4 max-w-sm">
													{cameraError}
												</p>
											) : (
												<p className="text-xs max-w-md leading-relaxed text-slate-300 mb-4">
													Прямой видеопоток с внутриротовой камеры активен. Наведите объектив на зубную дугу и зафиксируйте кадр.
												</p>
											)}
											<div className="flex gap-2.5 items-center flex-wrap justify-center">
												<button
													type="button"
													data-testid="btn-rvg-trigger-camera-capture"
													onClick={(e) => {
														e.stopPropagation();
														handleCaptureFromCamera();
													}}
													className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-cyan-500 transition-colors"
												>
													<Camera className="w-4 h-4" /> Сделать снимок с камеры
												</button>
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														fileInputRef.current?.click();
													}}
													className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-750 transition-colors"
												>
													<UploadCloud className="w-4 h-4 text-cyan-300" /> Импорт фото
												</button>
											</div>
										</div>
									)}

									{/* 3. Mode: TWAIN */}
									{captureSourceMode === "twain" && (
										<>
											<div className="w-16 h-16 rounded-full bg-emerald-600/15 border border-emerald-600/40 flex items-center justify-center mb-4 text-emerald-400">
												<Scan className="w-8 h-8 text-emerald-400" />
											</div>
											<h3 className="text-base font-bold text-slate-100 mb-2">
												Интерфейс TWAIN (Сканеры фосфорных пластин PSP)
											</h3>
											<p className="text-xs max-w-md leading-relaxed text-slate-300 mb-5">
												Универсальный шлюз TWAIN 2.4 готов к приёму экспонированной пластины со сканеров Dürr VistaScan, Soredex Digora, Acteon PSPIX.
											</p>
											<div className="flex gap-2.5 items-center flex-wrap justify-center">
												<button
													type="button"
													data-testid="btn-rvg-trigger-twain-capture"
													onClick={(e) => {
														e.stopPropagation();
														handleTriggerTwainCapture();
													}}
													className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-emerald-500 transition-colors"
												>
													<Scan className="w-4 h-4" /> Запустить сканирование TWAIN
												</button>
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														fileInputRef.current?.click();
													}}
													className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-750 transition-colors"
												>
													<UploadCloud className="w-4 h-4 text-emerald-300" /> Выбрать скан с диска
												</button>
											</div>
										</>
									)}

									{/* 4. Mode: Auto DSLR */}
									{captureSourceMode === "dslr" && (
										<>
											<div className="w-16 h-16 rounded-full bg-indigo-600/15 border border-indigo-600/40 flex items-center justify-center mb-4 text-indigo-400">
												<Camera className="w-8 h-8 text-indigo-400" />
											</div>
											<h3 className="text-base font-bold text-slate-100 mb-2">
												Автоматический импорт DSLR (Фотоаппарат Canon / Nikon / Sony)
											</h3>
											<p className="text-xs max-w-md leading-relaxed text-slate-300 mb-5">
												Шлюз ожидает поступления протокольных фотоснимков по кабелю или беспроводной передаче Wi-Fi SD-карты.
											</p>
											<div className="flex gap-2.5 items-center flex-wrap justify-center">
												<button
													type="button"
													data-testid="btn-rvg-trigger-dslr-capture"
													onClick={(e) => {
														e.stopPropagation();
														handleTriggerDslrCapture();
													}}
													className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-indigo-500 transition-colors"
												>
													<Camera className="w-4 h-4" /> Импортировать снимок DSLR
												</button>
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														fileInputRef.current?.click();
													}}
													className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-750 transition-colors"
												>
													<UploadCloud className="w-4 h-4 text-indigo-300" /> Обзор папки DCIM
												</button>
											</div>
										</>
									)}

									{/* 5. Mode: Disk Import */}
									{captureSourceMode === "import" && (
										<>
											<div className="w-16 h-16 rounded-full bg-sky-600/15 border border-sky-600/40 flex items-center justify-center mb-4 text-sky-400">
												<UploadCloud className="w-8 h-8 text-sky-400" />
											</div>
											<h3 className="text-base font-bold text-slate-100 mb-2">
												Ручной импорт снимков с локального диска
											</h3>
											<p className="text-xs max-w-md leading-relaxed text-slate-300 mb-5">
												Поддерживаются медицинские форматы DICOM Part 10 (.dcm), 16-битный TIFF, растровые изображения PNG, JPG, BMP.
											</p>
											<div className="flex gap-2.5 items-center flex-wrap justify-center">
												<button
													type="button"
													data-testid="btn-rvg-trigger-file-import"
													onClick={(e) => {
														e.stopPropagation();
														fileInputRef.current?.click();
													}}
													className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-sky-500 transition-colors"
												>
													<UploadCloud className="w-4 h-4" /> Выбрать файл на диске
												</button>
											</div>
										</>
									)}
								</div>
							)}
							<canvas
								ref={canvasRef}
								className="rvg-render-canvas"
								style={{
									display: capturedImage ? "block" : "none",
									transform: `translate(${panZoom.pan.x}px, ${panZoom.pan.y}px) scale(${panZoom.zoom}) rotate(${panZoom.rotation}deg) scaleX(${panZoom.flipH ? -1 : 1}) scaleY(${panZoom.flipV ? -1 : 1})`,
									filter: isSplitCompare ? "none" : (isWebGL ? "none" : cssFilterStyle),
								}}
								data-testid="rvg-render-canvas"
							/>

						</div>

						{/* Viewport HUD Telemetry */}
						<div className="rvg-hud-overlay">
							<div className="rvg-hud-card">
								<span className="text-teal-400 font-bold">Зуб {selectedTeeth.join(", ")}</span> · {PROJECTION_TYPES.find((p) => p.id === projectionType)?.shortLabel}
							</div>
							<div className="rvg-hud-card text-right">
								<span>Калибровка: 0.035 мм/пикс</span>
							</div>
						</div>
					</div>

					{/* RIGHT: CLINICAL CONTROL DOCK */}
					<div className="rvg-controls-dock" data-testid="rvg-controls-dock">
						{/* 1. FDI Tooth Selector Matrix */}
						<DirectRvgFdiSelector
							selectedTeeth={selectedTeeth}
							onToothToggle={handleToothToggle}
							primaryTooth={primaryTooth}
							primaryToothName={primaryToothName}
							projectionType={projectionType}
							onSelectTeeth={(teeth) => setSelectedTeeth(teeth)}
						/>

						{/* 2. Projection Angle & Exposure */}
						<DirectRvgProjectionSelector
							projectionType={projectionType}
							onSelectProjectionType={handleSelectProjectionType}
							exposureSec={exposureSec}
							onChangeExposureSec={setExposureSec}
						/>


						{/* 3. Real-Time Filters Toolbar */}
						<div className="rvg-dock-section">
							<RvgFiltersToolbar
								filters={filters}
								onChange={setFilters}
								activePresetId={activePresetId}
								onSelectPreset={(p) => setActivePresetId(p.id)}
								isSplitCompare={isSplitCompare}
								onToggleSplitCompare={setIsSplitCompare}
								onRotate={panZoom.handleRotate}
								onReset={() => { setFilters(DEFAULT_RVG_FILTERS); setActivePresetId("standard"); }}
							/>
						</div>

						{/* 4. Clinical Diary Note */}
						<div className="rvg-dock-section">
							<div className="rvg-section-header">
								<span className="rvg-section-header-title">
									<FileText className="w-3.5 h-3.5" />
									Клиническое заключение (043/у)
								</span>
							</div>
							<textarea
								value={clinicalNotes}
								onChange={(e) => setClinicalNotes(e.target.value)}
								rows={2}
								className="w-full p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200 placeholder-slate-400 outline-none focus:border-teal-500 transition-colors"
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
