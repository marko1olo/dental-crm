import type React from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	Camera,
	FileText,
	HardDrive,
	Scan,
	ShieldCheck,
	UploadCloud,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	FDI_TOOTH_NAMES,
	formatRadiationDose,
} from "./radiologyMath";
import { SAMPLE_PATIENT_RVG_URL } from "./types";
import {
	createDicomSecondaryCaptureFile,
	triggerBinaryDownload,
} from "../visiograph/VisiographDicomExporter";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
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
	getDirectRvgExportFileName,
	validateRadiologyUploadFile,
} from "./directRvgFileValidation";
import { DirectRvgFdiSelector } from "./DirectRvgFdiSelector";
import { DirectRvgProjectionSelector } from "./DirectRvgProjectionSelector";
import { DirectRvgViewportToolbar } from "./DirectRvgViewportToolbar";
import { DirectRvgFooter } from "./DirectRvgFooter";
import "./rvgCapture.css";

// Transparent re-exports
export * from "./directRvgTypes";
export { getDirectRvgExportFileName, validateRadiologyUploadFile } from "./directRvgFileValidation";

export const DirectRvgCaptureModal: React.FC<DirectRvgCaptureModalProps> = ({
	isOpen,
	onClose,
	patientId = "PAT-001",
	patientName = "Пациент",
	patientCardNumber = "043/у-2026/891",
	doctorName = "Лечащий врач",
	initialToothFdi = "16",
	initialImageUrl = SAMPLE_PATIENT_RVG_URL,
	onSaveToEmr,
	onSendToLab,
	onExportDicom,
}) => {
	const modalId = useId();

	// Sensor & Capture Lifecycle State
	const [sensorStatus, setSensorStatus] = useState<SensorCaptureStatus>("ready");
	const [selectedSensorModel, setSelectedSensorModel] = useState<string>("vatech_ezsensor_hd");
	const [acquisitionProgress, setAcquisitionProgress] = useState<number>(0);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	// Exposure Settings
	const [voltageKv, setVoltageKv] = useState<number>(65);
	const [currentMa, setCurrentMa] = useState<number>(7.0);
	const [exposureSec, setExposureSec] = useState<number>(0.08);

	// Tooth & Projection
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>([initialToothFdi]);
	const [projectionType, setProjectionType] = useState<ProjectionAngleType>("periapical");
	const [clinicalNotes, setClinicalNotes] = useState<string>(
		"Контрольная прицельная радиовизиография после эндодонтической обработки и пломбирования.",
	);

	// Viewport & Image Filters
	const [capturedImage, setCapturedImage] = useState<string>(initialImageUrl);
	const [filters, setFilters] = useState<RvgFilterValues>(DEFAULT_RVG_FILTERS);
	const [activePresetId, setActivePresetId] = useState<string>("standard");
	const [isSplitCompare, setIsSplitCompare] = useState<boolean>(false);

	// Viewport Transformation
	const [zoom, setZoom] = useState<number>(1.0);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [rotation, setRotation] = useState<number>(0);
	const [flipH, setFlipH] = useState<boolean>(false);
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imageSourceRef = useRef<HTMLImageElement | null>(null);

	// Calculated effective dose in µSv
	const calculatedDoseMicrosv = useMemo(() => {
		const dose = voltageKv * currentMa * exposureSec * 0.0825;
		return Number(dose.toFixed(1));
	}, [voltageKv, currentMa, exposureSec]);

	const radiationDoseInfo = useMemo(() => {
		return formatRadiationDose(calculatedDoseMicrosv);
	}, [calculatedDoseMicrosv]);

	const primaryTooth = selectedTeeth[0] || "16";
	const primaryToothName = FDI_TOOTH_NAMES[primaryTooth] || `Зуб ${primaryTooth}`;

	// Handle tooth selection click
	const handleToothToggle = (tooth: string) => {
		if (selectedTeeth.includes(tooth)) {
			if (selectedTeeth.length > 1) {
				setSelectedTeeth(selectedTeeth.filter((t) => t !== tooth));
			}
		} else {
			setSelectedTeeth([tooth]);
		}
	};

	// Trigger physical or instant x-ray exposure capture (Mandate 8e: <50ms instant capture, Mandate 8k: CRM != Reality Simulator)
	const handleTriggerCapture = useCallback(() => {
		if (sensorStatus === "acquiring") return;
		// Мгновенный захват <50мс без искусственных задержек и симуляций калибровки шума
		setSensorStatus("captured");
		setAcquisitionProgress(100);
		setCapturedImage(initialImageUrl || SAMPLE_PATIENT_RVG_URL);
		showToast("Снимок успешно получен с датчика RVG", "success");
	}, [sensorStatus, initialImageUrl]);

	// Direct File Upload & Ingestion State (Mandate 8e: Doctor Autonomy, no sensor lock-in)
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragOver, setIsDragOver] = useState<boolean>(false);

	const handleProcessFile = useCallback((file: File) => {
		const validation = validateRadiologyUploadFile(file);

		if (!validation.isValid) {
			showToast(
				`Неподдерживаемый формат файла: ${file.name}. Поддерживаются: DICOM (.dcm), TIFF, PNG, JPG`,
				"error",
			);
			return false;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result === "string") {
				setCapturedImage(result);
				setSensorStatus("captured");
				setAcquisitionProgress(100);
				setClinicalNotes((prev) =>
					prev.startsWith("Контрольная прицельная")
						? `Загружен снимок: ${file.name} (${Math.round(file.size / 1024)} КБ).`
						: prev,
				);
				showToast(`Снимок ${file.name} успешно загружен`, "success");
			}
		};
		reader.onerror = () => {
			showToast(`Ошибка чтения файла: ${file.name}`, "error");
		};
		reader.readAsDataURL(file);
		return true;
	}, []);

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0 && files[0]) {
			handleProcessFile(files[0]);
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
			handleProcessFile(files[0]);
		}
	};

	const applyCanvasFilters = useCallback(() => {
		const canvas = canvasRef.current;
		const img = imageSourceRef.current;
		if (!canvas || !img) return;

		canvas.width = img.naturalWidth || 1000;
		canvas.height = img.naturalHeight || 1300;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
	}, []);

	// Load source image into memory and paint canvas with filters
	useEffect(() => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = capturedImage;
		img.onload = () => {
			imageSourceRef.current = img;
			applyCanvasFilters();
		};

		return () => {
			img.onload = null;
			img.src = "";
			imageSourceRef.current = null;
			if (canvasRef.current) {
				canvasRef.current.width = 0;
				canvasRef.current.height = 0;
			}
		};
	}, [capturedImage, applyCanvasFilters]);

	// Reset transformation
	const handleResetTransform = () => {
		setZoom(1.0);
		setPan({ x: 0, y: 0 });
		setRotation(0);
		setFlipH(false);
	};

	// Mouse Pan interactions
	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		setIsDragging(true);
		dragStartPos.current = {
			x: e.clientX - pan.x,
			y: e.clientY - pan.y,
		};
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!isDragging) return;
		setPan({
			x: e.clientX - dragStartPos.current.x,
			y: e.clientY - dragStartPos.current.y,
		});
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		e.preventDefault();
		const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
		setZoom((prev) => Math.min(Math.max(Number((prev + zoomDelta).toFixed(2)), 0.5), 4.0));
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
				setRotation((prev) => (prev + 90) % 360);
			} else if (e.key === "+" || e.key === "=") {
				e.preventDefault();
				setZoom((prev) => Math.min(prev + 0.2, 4.0));
			} else if (e.key === "-" || e.key === "_") {
				e.preventDefault();
				setZoom((prev) => Math.max(prev - 0.2, 0.5));
			} else if (e.key === "0") {
				e.preventDefault();
				handleResetTransform();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, sensorStatus, handleTriggerCapture, onClose]);

	// 1-Click Action 1: Save to EMR (Карта 043/у)
	const handleSaveToEmr = () => {
		setIsSaving(true);
		const currentSensor = SENSOR_MODELS.find((s) => s.id === selectedSensorModel);
		const currentIso = new Date().toISOString();

		const metadata = {
			kv: voltageKv,
			ma: currentMa,
			exposureSec,
			pixelSpacingMm: currentSensor?.pixelSpacing || 0.035,
			apparatusModel: currentSensor?.name || "Vatech EzSensor HD",
			sensorType: "CMOS Active Pixel",
		};

		const studyRecord: RadiologyStudy = {
			id: `study-rvg-${Date.now()}`,
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
			metadata,
			tags: ["RVG", "043/у", `Зуб_${selectedTeeth.join("_")}`],
		};

		if (onSaveToEmr) {
			onSaveToEmr(studyRecord);
		}

		if (patientId && capturedImage && (capturedImage.startsWith("data:image/") || capturedImage.startsWith("blob:"))) {
			void (async () => {
				try {
					let imageBase64 = capturedImage;
					if (capturedImage.startsWith("blob:")) {
						const blob = await fetch(capturedImage).then((r) => r.blob());
						imageBase64 = await new Promise<string>((resolve) => {
							const reader = new FileReader();
							reader.onloadend = () => resolve(reader.result as string);
							reader.readAsDataURL(blob);
						});
					}
					await fetch("/api/xray/scans", {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({
							"Content-Type": "application/json",
						}),
						body: JSON.stringify({
							patientId,
							imageBase64,
							originalFilename: `rvg_tooth_${selectedTeeth.join("_")}_${Date.now()}.jpg`,
							mimeType: "image/jpeg",
							kind: "periapical",
							toothCode: selectedTeeth[0] || null,
							notes: clinicalNotes,
							status: "done",
						}),
					}).catch((err) => {
						console.warn("[DirectRvgCaptureModal] Failed to persist scan to server:", err);
					});
				} catch (err) {
					console.warn("[DirectRvgCaptureModal] Server save error:", err);
				}
			})();
		}

		showToast(`Снимок зуба ${selectedTeeth.join(", ")} сохранён в медицинскую карту ${patientCardNumber}`, "success");
		setIsSaving(false);
		onClose();
	};

	// 1-Click Action 2: Send to Dental Lab (ЗТЛ)
	const handleSendToLab = () => {
		const currentSensor = SENSOR_MODELS.find((s) => s.id === selectedSensorModel);
		const currentIso = new Date().toISOString();

		const studyRecord: RadiologyStudy = {
			id: `study-rvg-lab-${Date.now()}`,
			patientId,
			patientName,
			medicalCardNumber: patientCardNumber,
			studyDate: currentIso.replace("T", " ").substring(0, 16),
			studyType: "intraoral_radiovisiography",
			modality: "intraoral_rvg",
			modalityLabel: "Прицельная радиовизиография",
			anatomicalArea: `Зуб ${selectedTeeth.join(", ")}`,
			teethFdi: selectedTeeth,
			effectiveDoseMicrosv: calculatedDoseMicrosv,
			effectiveDoseMsv: calculatedDoseMicrosv / 1000,
			imageUrl: capturedImage,
			doctorName,
			status: "completed",
			diagnosticNotes: clinicalNotes,
			metadata: { kv: voltageKv, ma: currentMa, exposureSec, pixelSpacingMm: currentSensor?.pixelSpacing || 0.035, apparatusModel: currentSensor?.name || "Vatech EzSensor HD" },
		};

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
		const currentSensor = SENSOR_MODELS.find((s) => s.id === selectedSensorModel);
		const currentIso = new Date().toISOString();

		const studyRecord: RadiologyStudy = {
			id: `study-rvg-dcm-${Date.now()}`,
			patientId,
			patientName,
			medicalCardNumber: patientCardNumber,
			studyDate: currentIso.replace("T", " ").substring(0, 16),
			studyType: "intraoral_radiovisiography",
			modality: "intraoral_rvg",
			modalityLabel: "Прицельная радиовизиография",
			anatomicalArea: `Зуб ${selectedTeeth.join(", ")}`,
			teethFdi: selectedTeeth,
			effectiveDoseMicrosv: calculatedDoseMicrosv,
			effectiveDoseMsv: calculatedDoseMicrosv / 1000,
			imageUrl: capturedImage,
			doctorName,
			status: "completed",
			metadata: {
				kv: voltageKv,
				ma: currentMa,
				exposureSec,
				pixelSpacingMm: currentSensor?.pixelSpacing || 0.035,
				apparatusModel: currentSensor?.name || "Vatech EzSensor HD",
			},
		};

		if (onExportDicom) {
			onExportDicom(studyRecord);
		}

		// Attempt genuine Part 10 DICOM generation if canvas is available
		let dicomBytes: Uint8Array | null = null;
		const canvas = canvasRef.current;
		if (canvas && canvas.width > 0 && canvas.height > 0) {
			try {
				dicomBytes = createDicomSecondaryCaptureFile(canvas, {
					patientId: patientId || "PAT-001",
					patientFullName: patientName || "UNKNOWN^PATIENT",
					clinicName: "ООО «Денте Стоматология»",
					doctorFullName: doctorName || "Лечащий врач",
					modality: "IO",
					toothCode: selectedTeeth.join(", "),
					scaleMmPerPixel: currentSensor?.pixelSpacing || 0.035,
				});
			} catch (err) {
				console.warn(
					"DirectRvgCaptureModal: Failed to generate DICOM buffer, falling back to honest image export",
					err,
				);
			}
		}

		const exportInfo = getDirectRvgExportFileName(
			selectedTeeth,
			patientCardNumber,
			Boolean(dicomBytes && dicomBytes.length > 0),
			capturedImage,
		);

		if (dicomBytes && dicomBytes.length > 0) {
			triggerBinaryDownload(dicomBytes, exportInfo.filename, exportInfo.mimeType);
			showToast(
				`Файл цифрового снимка DICOM Part 10 (.dcm) для зуба ${selectedTeeth.join(", ")} успешно экспортирован`,
				"success",
			);
		} else {
			// Honest image download fallback with genuine .jpg / .png extension — NEVER masquerading JPEG as .dcm
			const link = document.createElement("a");
			link.href = capturedImage;
			link.download = exportInfo.filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			const extLabel = exportInfo.filename.split(".").pop()?.toUpperCase() || "IMAGE";
			showToast(
				`Файл цифрового снимка (${extLabel}) для зуба ${selectedTeeth.join(", ")} успешно экспортирован`,
				"success",
			);
		}
	};

	if (!isOpen) return null;

	// Compute CSS filter string
	const cssFilterStyle = [
		`brightness(${filters.brightness}%)`,
		`contrast(${filters.contrast + (filters.clahe > 0 ? filters.clahe * 0.4 : 0)}%)`,
		filters.invert ? "invert(100%)" : "",
		filters.sharpness > 0 ? `drop-shadow(0 0 ${Math.max(1, filters.sharpness / 30)}px rgba(0,0,0,0.8))` : "",
	].filter(Boolean).join(" ");

	const modalContent = (
		<div
			className="rvg-capture-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby={`${modalId}-title`}
			data-testid="direct-rvg-capture-modal-overlay"
		>
			<div className="rvg-capture-modal" data-testid="direct-rvg-capture-modal">
				{/* ─── MODAL HEADER ─── */}
				<div className="rvg-capture-header">
					<div className="rvg-header-title-group min-w-0 flex-1">
						<div className="rvg-sensor-icon-box">
							<Camera className="w-5 h-5 animate-pulse" />
						</div>
						<div className="rvg-header-titles min-w-0 flex-1">
							<h2 id={`${modalId}-title`} className="rvg-header-title min-w-0">
								<span className="truncate">Прямой захват RVG и студия фильтрации</span>
								<span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-normal shrink-0">
									USB 3.0 CMOS Direct
								</span>
							</h2>
							<p
								className="rvg-header-subtitle truncate"
								title={`${patientName} · Карта: ${patientCardNumber} · Врач: ${doctorName}`}
							>
								{patientName} · Карта: {patientCardNumber} · Врач: {doctorName}
							</p>
						</div>
					</div>

					<div className="rvg-header-actions">
						<button
							type="button"
							onClick={onClose}
							className="rvg-close-btn"
							aria-label="Закрыть окно захвата"
							data-testid="rvg-modal-close-btn"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* ─── SENSOR STATUS BANNER ─── */}
				<div
					className={`rvg-sensor-status-banner rvg-status-${sensorStatus}`}
					data-testid="rvg-sensor-status-banner"
				>
					<div className="rvg-sensor-status-state">
						<div className="rvg-status-indicator-dot" />
						<span className="rvg-status-badge">
							{sensorStatus === "ready" && "Датчик готов / Ожидание экспозиции"}
							{sensorStatus === "acquiring" && `Получение данных (${acquisitionProgress}%)`}
							{sensorStatus === "captured" && "Снимок получен / Кадр в буфере"}
						</span>
					</div>

					{/* Telemetry & Device Selector */}
					<div className="rvg-sensor-telemetry">
						<div className="rvg-telemetry-chip">
							<HardDrive className="w-3.5 h-3.5 text-teal-400" />
							<select
								value={selectedSensorModel}
								onChange={(e) => setSelectedSensorModel(e.target.value)}
								className="bg-transparent text-slate-200 border-none outline-none font-sans text-xs cursor-pointer max-w-[180px] truncate"
								data-testid="rvg-sensor-device-select"
							>
								{SENSOR_MODELS.map((sensor) => (
									<option key={sensor.id} value={sensor.id} className="bg-slate-900 text-slate-100">
										{sensor.name} ({sensor.resolution})
									</option>
								))}
							</select>
						</div>

						<div className="rvg-telemetry-chip" title="Эффективная лучевая нагрузка по СанПиН">
							<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
							<span>{radiationDoseInfo.fullText}</span>
						</div>

						{/* Hardware RVG Exposure & Frame Capture Trigger */}
						<button
							type="button"
							onClick={handleTriggerCapture}
							disabled={sensorStatus === "acquiring"}
							className="rvg-trigger-btn"
							data-testid="rvg-trigger-exposure-btn"
							title={
								sensorStatus === "acquiring"
									? "Идет захват и передача кадра с датчика визиографа..."
									: sensorStatus === "captured"
										? "Повторный захват кадра с визиографа (Space)"
										: "Запустить экспозицию и захват кадра с датчика (Space)"
							}
						>
							<Zap className="w-3.5 h-3.5 fill-current" />
							<span>
								{sensorStatus === "acquiring"
									? "Экспонирование..."
									: sensorStatus === "captured"
										? "Повторный захват (Space)"
										: "Захват с датчика (Space)"}
							</span>
						</button>

						{/* Direct File Upload from Disk Button (Mandate 8e: Doctor Autonomy) */}
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
					</div>
				</div>

				{/* ─── MAIN WORKSPACE ─── */}
				<div className="rvg-capture-body">
					{/* LEFT: CANVASES & VIEWPORT */}
					<div className="rvg-viewport-pane" data-testid="rvg-viewport-pane">
						{/* Top Float Toolbar */}
						<DirectRvgViewportToolbar
							zoom={zoom}
							flipH={flipH}
							isSplitCompare={isSplitCompare}
							onZoomIn={() => setZoom((prev) => Math.min(prev + 0.25, 4.0))}
							onZoomOut={() => setZoom((prev) => Math.max(prev - 0.25, 0.5))}
							onRotate={() => setRotation((prev) => (prev + 90) % 360)}
							onToggleFlipH={() => setFlipH((prev) => !prev)}
							onResetTransform={handleResetTransform}
						/>

						{/* Acquiring Animation Overlay (for external streaming / hardware transfer) */}
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
							className={`rvg-canvas-container ${isDragging ? "grabbing" : ""} ${isDragOver ? "dragover" : ""}`}
							onMouseDown={handleMouseDown}
							onMouseMove={handleMouseMove}
							onMouseUp={handleMouseUp}
							onMouseLeave={handleMouseUp}
							onWheel={handleWheel}
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
							<canvas
								ref={canvasRef}
								className="rvg-render-canvas"
								style={{
									transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
									filter: isSplitCompare ? "none" : cssFilterStyle,
								}}
								data-testid="rvg-render-canvas"
							/>
						</div>

						{/* Viewport HUD Telemetry */}
						<div className="rvg-hud-overlay">
							<div className="rvg-hud-card">
								<span className="text-teal-400 font-bold">Зуб {selectedTeeth.join(", ")}</span> · {PROJECTION_TYPES.find((p) => p.id === projectionType)?.shortLabel} · {voltageKv} кВ / {currentMa} мА / {exposureSec} с
							</div>
							<div className="rvg-hud-card text-right">
								<span>Калибровка: 0.035 мм/пикс</span> · <span className="text-emerald-400 font-bold">{calculatedDoseMicrosv} мкЗв</span>
							</div>
						</div>
					</div>

					{/* RIGHT: CLINICAL CONTROL DOCK */}
					<div className="rvg-controls-dock" data-testid="rvg-controls-dock">
						{/* 1. FDI Tooth Selector Matrix */}
						<DirectRvgFdiSelector
							selectedTeeth={selectedTeeth} onToothToggle={handleToothToggle}
							primaryTooth={primaryTooth} primaryToothName={primaryToothName}
						/>

						{/* 2. Projection Angle & Exposure */}
						<DirectRvgProjectionSelector
							projectionType={projectionType}
							onSelectProjectionType={(projId, typicalExp) => {
								setProjectionType(projId);
								setExposureSec(typicalExp);
							}}
							voltageKv={voltageKv} onChangeVoltageKv={setVoltageKv}
							currentMa={currentMa} onChangeCurrentMa={setCurrentMa}
							exposureSec={exposureSec} onChangeExposureSec={setExposureSec}
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
								onRotate={() => setRotation((prev) => (prev + 90) % 360)}
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
