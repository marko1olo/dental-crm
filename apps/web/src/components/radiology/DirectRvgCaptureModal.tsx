import type React from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	Activity,
	ArrowRight,
	Camera,
	Check,
	CheckCircle2,
	Clock,
	Compass,
	Download,
	Eye,
	FileText,
	Filter,
	FlipHorizontal,
	HardDrive,
	Layers,
	Maximize2,
	Minus,
	Plus,
	RotateCw,
	Scan,
	Send,
	ShieldCheck,
	Sparkles,
	Sun,
	Thermometer,
	Truck,
	UploadCloud,
	Wifi,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	ADULT_FDI_TEETH,
	FDI_TOOTH_NAMES,
	formatRadiationDose,
} from "./radiologyMath";
import { SAMPLE_PATIENT_RVG_URL } from "./MedicalRadiologyDropzone";
import {
	RvgFiltersToolbar,
	DEFAULT_RVG_FILTERS,
	type RvgFilterPreset,
	type RvgFilterValues,
} from "./RvgFiltersToolbar";
import type { RadiologyStudy } from "./types";
import "./rvgCapture.css";

export type SensorCaptureStatus = "ready" | "acquiring" | "captured";

export type ProjectionAngleType = "periapical" | "bitewing" | "occlusal";

export interface DirectRvgCaptureModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string;
	patientName?: string;
	patientCardNumber?: string;
	doctorName?: string;
	initialToothFdi?: string;
	initialImageUrl?: string;
	onSaveToEmr?: (study: RadiologyStudy) => void;
	onSendToLab?: (orderData: {
		study: RadiologyStudy;
		toothFdi: string;
		note: string;
	}) => void;
	onExportDicom?: (study: RadiologyStudy) => void;
}

export const SENSOR_MODELS = [
	{
		id: "vatech_ezsensor_hd",
		name: "Vatech EzSensor HD",
		resolution: "29.2 lp/mm (CMOS)",
		pixelSpacing: 0.035,
	},
	{
		id: "kavo_gxs_700",
		name: "KaVo Gendex GXS-700",
		resolution: "25.0 lp/mm (Direct USB)",
		pixelSpacing: 0.04,
	},
	{
		id: "planmeca_prosensor",
		name: "Planmeca ProSensor HD",
		resolution: "33.7 lp/mm (Fiber-Optic)",
		pixelSpacing: 0.03,
	},
	{
		id: "carestream_rvg_6200",
		name: "Carestream RVG 6200",
		resolution: "24.0 lp/mm (True Res)",
		pixelSpacing: 0.042,
	},
	{
		id: "fona_cdrelite",
		name: "FONA CDRelite / Schick",
		resolution: "28.0 lp/mm (Active CMOS)",
		pixelSpacing: 0.038,
	},
] as const;

export const PROJECTION_TYPES: Array<{
	id: ProjectionAngleType;
	label: string;
	shortLabel: string;
	description: string;
	typicalExposureSec: number;
}> = [
	{
		id: "periapical",
		label: "Интраоральный прицельный (Периапикальный)",
		shortLabel: "Прицельный",
		description: "Отображение верхушки корня, периодонта и периапикальной кости",
		typicalExposureSec: 0.08,
	},
	{
		id: "bitewing",
		label: "Интерпроксимальный (Bite-wing)",
		shortLabel: "Bite-wing",
		description: "Коронковые части верхних и нижних зубов для скрытого кариеса",
		typicalExposureSec: 0.09,
	},
	{
		id: "occlusal",
		label: "Окклюзионный (Аксиальный)",
		shortLabel: "Окклюзионный",
		description: "Поперечный срез альвеолярного отростка и свода челюсти",
		typicalExposureSec: 0.12,
	},
];

export const DirectRvgCaptureModal: React.FC<DirectRvgCaptureModalProps> = ({
	isOpen,
	onClose,
	patientId = "PAT-001",
	patientName = "Смирнова Екатерина Васильевна",
	patientCardNumber = "043/у-2026/891",
	doctorName = "Д-р Смирнов Алексей Петрович",
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
	const [sensorTemperature, setSensorTemperature] = useState<number>(24.4);
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
		// RVG empirical dose calculation: kV * mA * exposureSec * constant
		// e.g. 65 * 7 * 0.08 * 0.0825 ≈ 3.0 µSv
		const dose = (voltageKv * currentMa * exposureSec * 0.0825);
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

	// Trigger simulated or physical x-ray exposure capture
	const handleTriggerCapture = useCallback(() => {
		if (sensorStatus === "acquiring") return;
		setSensorStatus("acquiring");
		setAcquisitionProgress(15);

		const step1 = setTimeout(() => setAcquisitionProgress(50), 300);
		const step2 = setTimeout(() => setAcquisitionProgress(85), 650);
		const step3 = setTimeout(() => {
			setAcquisitionProgress(100);
			setSensorStatus("captured");
			setCapturedImage(initialImageUrl || SAMPLE_PATIENT_RVG_URL);
			setSensorTemperature((prev) => Number((prev + 0.3).toFixed(1)));
			showToast("Снимок успешно получен с датчика RVG", "success");
		}, 950);

		return () => {
			clearTimeout(step1);
			clearTimeout(step2);
			clearTimeout(step3);
		};
	}, [sensorStatus, initialImageUrl]);

	// Load source image into memory and paint canvas with filters
	useEffect(() => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = capturedImage;
		img.onload = () => {
			imageSourceRef.current = img;
			applyCanvasFilters();
		};
	}, [capturedImage]);

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
			metadata: {
				kv: voltageKv,
				ma: currentMa,
				exposureSec,
				pixelSpacingMm: currentSensor?.pixelSpacing || 0.035,
				apparatusModel: currentSensor?.name || "Vatech EzSensor HD",
				sensorType: "CMOS Active Pixel",
			},
			tags: ["RVG", "043/у", `Зуб_${selectedTeeth.join("_")}`],
		};

		if (onSaveToEmr) {
			onSaveToEmr(studyRecord);
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
			metadata: {
				kv: voltageKv,
				ma: currentMa,
				exposureSec,
				pixelSpacingMm: currentSensor?.pixelSpacing || 0.035,
				apparatusModel: currentSensor?.name || "Vatech EzSensor HD",
			},
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

	// 1-Click Action 3: Export DICOM (.dcm)
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
		};

		if (onExportDicom) {
			onExportDicom(studyRecord);
		}

		// Trigger direct image/DICOM download in browser
		const link = document.createElement("a");
		link.href = capturedImage;
		link.download = `RVG_Tooth_${selectedTeeth.join("_")}_${patientCardNumber.replace(/[/\\?%*:|"<>]/g, "-")}.jpg`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		showToast(`Файл цифрового снимка DICOM/RVG для зуба ${selectedTeeth.join(", ")} успешно экспортирован`, "success");
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
					<div className="rvg-header-title-group">
						<div className="rvg-sensor-icon-box">
							<Camera className="w-5 h-5 animate-pulse" />
						</div>
						<div className="rvg-header-titles">
							<h2 id={`${modalId}-title`} className="rvg-header-title">
								<span>Прямой захват RVG и студия фильтрации</span>
								<span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-normal">
									USB 3.0 CMOS Direct
								</span>
							</h2>
							<p className="rvg-header-subtitle">
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
								className="bg-transparent text-slate-200 border-none outline-none font-sans text-xs cursor-pointer"
								data-testid="rvg-sensor-device-select"
							>
								{SENSOR_MODELS.map((sensor) => (
									<option key={sensor.id} value={sensor.id} className="bg-slate-900 text-slate-100">
										{sensor.name} ({sensor.resolution})
									</option>
								))}
							</select>
						</div>

						<div className="rvg-telemetry-chip" title="Температура матрицы визиографа">
							<Thermometer className="w-3.5 h-3.5 text-amber-400" />
							<span>{sensorTemperature} °C</span>
						</div>

						<div className="rvg-telemetry-chip" title="Эффективная лучевая нагрузка по СанПиН">
							<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
							<span>{radiationDoseInfo.fullText}</span>
						</div>

						{/* Action Trigger Simulation Button */}
						<button
							type="button"
							onClick={handleTriggerCapture}
							disabled={sensorStatus === "acquiring"}
							className="rvg-trigger-btn"
							data-testid="rvg-trigger-exposure-btn"
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
					</div>
				</div>

				{/* ─── MAIN WORKSPACE ─── */}
				<div className="rvg-capture-body">
					{/* LEFT: CANVASES & VIEWPORT */}
					<div className="rvg-viewport-pane" data-testid="rvg-viewport-pane">
						{/* Top Float Toolbar */}
						<div className="rvg-viewport-top-toolbar">
							<div className="rvg-toolbar-glass-cluster">
								<button
									type="button"
									onClick={() => setZoom((prev) => Math.min(prev + 0.25, 4.0))}
									className="rvg-tool-btn"
									title="Увеличить (+)"
									data-testid="rvg-zoom-in-btn"
								>
									<Plus className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.5))}
									className="rvg-tool-btn"
									title="Уменьшить (-)"
									data-testid="rvg-zoom-out-btn"
								>
									<Minus className="w-4 h-4" />
								</button>
								<span className="text-[11px] font-mono font-bold text-slate-300 px-1">
									{Math.round(zoom * 100)}%
								</span>
								<div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
								<button
									type="button"
									onClick={() => setRotation((prev) => (prev + 90) % 360)}
									className="rvg-tool-btn"
									title="Повернуть на 90° (R)"
									data-testid="rvg-rotate-btn"
								>
									<RotateCw className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => setFlipH((prev) => !prev)}
									className={`rvg-tool-btn ${flipH ? "active" : ""}`}
									title="Отразить по горизонтали"
									data-testid="rvg-flip-btn"
								>
									<FlipHorizontal className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={handleResetTransform}
									className="rvg-tool-btn"
									title="Сбросить масштаб и положение (0)"
									data-testid="rvg-reset-transform-btn"
								>
									<Maximize2 className="w-4 h-4" />
								</button>
							</div>

							{/* Split compare indicator */}
							{isSplitCompare && (
								<div className="rvg-toolbar-glass-cluster text-xs font-semibold text-cyan-300">
									<Eye className="w-3.5 h-3.5" />
									<span>Режим сравнения (Оригинал / Фильтр)</span>
								</div>
							)}
						</div>

						{/* Acquiring Animation Overlay */}
						{sensorStatus === "acquiring" && (
							<div className="rvg-acquiring-overlay" data-testid="rvg-acquiring-overlay">
								<div className="rvg-scanner-beam" />
								<Scan className="w-16 h-16 animate-pulse text-cyan-400" />
								<div className="text-center">
									<p className="text-sm font-bold tracking-wide text-cyan-200 uppercase">
										Чтение 16-битной матрицы визиографа...
									</p>
									<p className="text-xs font-mono text-cyan-400/80 mt-1">
										Калибровка шума · Пакет {acquisitionProgress}%
									</p>
								</div>
							</div>
						)}

						{/* Viewport Canvas Container */}
						<div
							className={`rvg-canvas-container ${isDragging ? "grabbing" : ""}`}
							onMouseDown={handleMouseDown}
							onMouseMove={handleMouseMove}
							onMouseUp={handleMouseUp}
							onMouseLeave={handleMouseUp}
							onWheel={handleWheel}
							data-testid="rvg-canvas-container"
						>
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
						<div className="rvg-dock-section">
							<div className="rvg-section-header">
								<span className="rvg-section-header-title">
									<Sparkles className="w-3.5 h-3.5" />
									Зубная формула (FDI 11–48)
								</span>
								<span className="font-mono text-teal-400 font-bold">
									{selectedTeeth.join(", ")}
								</span>
							</div>

							<div className="rvg-fdi-selector-panel" data-testid="rvg-fdi-selector-panel">
								{/* Upper Jaw: Quadrant 1 (18-11) | Quadrant 2 (21-28) */}
								<div className="rvg-fdi-jaw-row">
									<div className="rvg-fdi-quadrant">
										{ADULT_FDI_TEETH.quadrant1.map((tooth) => (
											<button
												key={tooth}
												type="button"
												onClick={() => handleToothToggle(tooth)}
												className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
												title={FDI_TOOTH_NAMES[tooth]}
												data-testid={`rvg-tooth-${tooth}`}
											>
												{tooth}
											</button>
										))}
									</div>
									<div className="rvg-fdi-quadrant">
										{ADULT_FDI_TEETH.quadrant2.map((tooth) => (
											<button
												key={tooth}
												type="button"
												onClick={() => handleToothToggle(tooth)}
												className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
												title={FDI_TOOTH_NAMES[tooth]}
												data-testid={`rvg-tooth-${tooth}`}
											>
												{tooth}
											</button>
										))}
									</div>
								</div>

								{/* Lower Jaw: Quadrant 4 (48-41) | Quadrant 3 (31-38) */}
								<div className="rvg-fdi-jaw-row">
									<div className="rvg-fdi-quadrant">
										{ADULT_FDI_TEETH.quadrant4.map((tooth) => (
											<button
												key={tooth}
												type="button"
												onClick={() => handleToothToggle(tooth)}
												className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
												title={FDI_TOOTH_NAMES[tooth]}
												data-testid={`rvg-tooth-${tooth}`}
											>
												{tooth}
											</button>
										))}
									</div>
									<div className="rvg-fdi-quadrant">
										{ADULT_FDI_TEETH.quadrant3.map((tooth) => (
											<button
												key={tooth}
												type="button"
												onClick={() => handleToothToggle(tooth)}
												className={`rvg-tooth-btn ${selectedTeeth.includes(tooth) ? "selected" : ""}`}
												title={FDI_TOOTH_NAMES[tooth]}
												data-testid={`rvg-tooth-${tooth}`}
											>
												{tooth}
											</button>
										))}
									</div>
								</div>

								{/* Selected Tooth Description */}
								<div className="rvg-selected-tooth-badge">
									<span>{primaryToothName}</span>
									<span className="font-mono text-[11px] opacity-80">
										FDI #{primaryTooth}
									</span>
								</div>
							</div>
						</div>

						{/* 2. Projection Angle & Exposure */}
						<div className="rvg-dock-section">
							<div className="rvg-section-header">
								<span className="rvg-section-header-title">
									<Layers className="w-3.5 h-3.5" />
									Угол проекции и экспозиция
								</span>
							</div>

							<div className="rvg-projection-chips" data-testid="rvg-projection-chips">
								{PROJECTION_TYPES.map((proj) => {
									const isActive = projectionType === proj.id;
									return (
										<button
											key={proj.id}
											type="button"
											onClick={() => {
												setProjectionType(proj.id);
												setExposureSec(proj.typicalExposureSec);
											}}
											className={`rvg-projection-btn ${isActive ? "active" : ""}`}
											data-testid={`rvg-projection-${proj.id}`}
										>
											<div className="flex flex-col">
												<span className="text-xs font-bold text-slate-100">
													{proj.label}
												</span>
												<span className="text-[11px] text-slate-400 font-normal">
													{proj.description}
												</span>
											</div>
											<span className="text-[11px] font-mono text-teal-400 shrink-0 ml-2">
												{proj.typicalExposureSec} с
											</span>
										</button>
									);
								})}
							</div>

							{/* Tube Voltage & Current Fine Steppers */}
							<div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/60">
								<div>
									<span className="text-[11px] text-slate-400 block mb-1">Напряжение</span>
									<select
										value={voltageKv}
										onChange={(e) => setVoltageKv(Number(e.target.value))}
										className="w-full h-8 px-2 rounded-lg bg-slate-800 text-xs text-slate-200 border border-slate-700 outline-none font-mono"
										data-testid="rvg-voltage-select"
									>
										<option value={60}>60 кВ</option>
										<option value={65}>65 кВ</option>
										<option value={70}>70 кВ</option>
									</select>
								</div>
								<div>
									<span className="text-[11px] text-slate-400 block mb-1">Ток трубки</span>
									<select
										value={currentMa}
										onChange={(e) => setCurrentMa(Number(e.target.value))}
										className="w-full h-8 px-2 rounded-lg bg-slate-800 text-xs text-slate-200 border border-slate-700 outline-none font-mono"
										data-testid="rvg-current-select"
									>
										<option value={6.0}>6.0 мА</option>
										<option value={7.0}>7.0 мА</option>
										<option value={8.0}>8.0 мА</option>
									</select>
								</div>
								<div>
									<span className="text-[11px] text-slate-400 block mb-1">Экспозиция</span>
									<select
										value={exposureSec}
										onChange={(e) => setExposureSec(Number(e.target.value))}
										className="w-full h-8 px-2 rounded-lg bg-slate-800 text-xs text-slate-200 border border-slate-700 outline-none font-mono"
										data-testid="rvg-exposure-select"
									>
										<option value={0.06}>0.06 с</option>
										<option value={0.08}>0.08 с</option>
										<option value={0.10}>0.10 с</option>
										<option value={0.12}>0.12 с</option>
									</select>
								</div>
							</div>
						</div>

						{/* 3. Real-Time Filters Toolbar */}
						<div className="rvg-dock-section">
							<RvgFiltersToolbar
								filters={filters}
								onChange={setFilters}
								activePresetId={activePresetId}
								onSelectPreset={(p) => setActivePresetId(p.id)}
								isSplitCompare={isSplitCompare}
								onToggleSplitCompare={setIsSplitCompare}
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
				<div className="rvg-capture-footer">
					<div className="rvg-footer-left-info">
						<span className="font-mono">
							Стандарт СанПиН 2.6.1.1192-03 · FDI #{selectedTeeth.join(", ")} · {calculatedDoseMicrosv} мкЗв
						</span>
					</div>

					<div className="rvg-footer-actions-group">
						{/* Action 1: Export DICOM */}
						<button
							type="button"
							onClick={handleExportDicom}
							className="rvg-action-btn-secondary"
							title="Экспортировать снимок в DICOM 3.0 / TIFF высокой четкости"
							data-testid="rvg-export-dicom-btn"
						>
							<Download className="w-4 h-4 text-teal-400" />
							<span>Экспорт DICOM</span>
						</button>

						{/* Action 2: Send to Dental Lab */}
						<button
							type="button"
							onClick={handleSendToLab}
							className="rvg-action-btn-secondary"
							title="Прикрепить снимок к текущему заказу зуботехнической лаборатории"
							data-testid="rvg-send-lab-btn"
						>
							<Truck className="w-4 h-4 text-teal-400" />
							<span>Отправить в ЗТЛ</span>
						</button>

						{/* Action 3: Save to EMR 043/u (Primary) */}
						<button
							type="button"
							onClick={handleSaveToEmr}
							disabled={isSaving}
							className="rvg-action-btn-primary"
							title="Сохранить исследование в медицинскую карту пациента 043/у"
							data-testid="rvg-save-emr-btn"
						>
							<CheckCircle2 className="w-4 h-4" />
							<span>Сохранить в карту 043/у</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	if (typeof document === "undefined") {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};
