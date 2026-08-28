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
	Folder,
	FolderSync,
	HardDrive,
	Image as ImageIcon,
	Layers,
	Maximize2,
	Minus,
	Plus,
	Printer,
	RefreshCw,
	RotateCw,
	Scan,
	Send,
	ShieldCheck,
	Sparkles,
	Sun,
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
import type { RadiologyStudy } from "./types";
import "./hotFolderIntake.css";

export type HotFolderSource =
	| "all"
	| "ezdent"
	| "romexis"
	| "sidexis"
	| "carestream"
	| "cliniview"
	| "dicom_network";

export interface HotFolderItem {
	id: string;
	filename: string;
	source: Exclude<HotFolderSource, "all">;
	sourceLabel: string;
	folderPath: string;
	detectedModality: "intraoral_rvg" | "optg_panoramic" | "cbct_3d" | "bitewing";
	modalityLabel: string;
	detectedTeeth: string[];
	sizeBytes: number;
	sizeFormatted: string;
	timestampIso: string;
	relativeTime: string;
	imageUrl: string;
	status: "new" | "processing" | "imported";
	patientMatch?: {
		patientName: string;
		cardNumber: string;
		confidence: number;
	};
	metadata: {
		kv: number;
		ma: number;
		exposureSec: number;
		pixelSpacingMm: number;
		apparatusModel: string;
		sensorResolution?: string;
	};
}

export interface HotFolderIntakeModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string;
	patientName?: string;
	patientCardNumber?: string;
	patientBirthDate?: string;
	doctorName?: string;
	onAttachToEmr?: (result: {
		study: RadiologyStudy;
		teethFdi: string[];
		protocolNote: string;
		clinicalPurpose: string;
		doseMicrosv: number;
	}) => void;
	onExportDicom?: (item: HotFolderItem) => void;
	onSendToLab?: (item: HotFolderItem, note: string) => void;
}

export const INITIAL_HOT_FOLDER_ITEMS: HotFolderItem[] = [
	{
		id: "hf-01",
		filename: "RVG_Tooth16_20260828_114210.dcm",
		source: "ezdent",
		sourceLabel: "Vatech EzDent-i",
		folderPath: "\\\\XRAY-SERVER\\EzDent-i\\Export\\AutoIntake",
		detectedModality: "intraoral_rvg",
		modalityLabel: "Прицельный RVG",
		detectedTeeth: ["16"],
		sizeBytes: 1468006,
		sizeFormatted: "1.4 МБ",
		timestampIso: "2026-08-28T11:42:10.000Z",
		relativeTime: "1 мин назад",
		imageUrl: SAMPLE_PATIENT_RVG_URL,
		status: "new",
		patientMatch: {
			patientName: "Смирнова Екатерина Васильевна",
			cardNumber: "043/у-2026/891",
			confidence: 98,
		},
		metadata: {
			kv: 65,
			ma: 7.0,
			exposureSec: 0.08,
			pixelSpacingMm: 0.035,
			apparatusModel: "Vatech EzSensor HD",
			sensorResolution: "29.2 lp/mm",
		},
	},
	{
		id: "hf-02",
		filename: "Romexis_OPTG_Panoramic_20260828_113000.png",
		source: "romexis",
		sourceLabel: "Planmeca Romexis",
		folderPath: "\\\\ROMEXIS-SRV\\Exchange\\2D_Panoramic",
		detectedModality: "optg_panoramic",
		modalityLabel: "ОПТГ Панорама",
		detectedTeeth: [
			"18", "17", "16", "15", "14", "13", "12", "11",
			"21", "22", "23", "24", "25", "26", "27", "28",
			"48", "47", "46", "45", "44", "43", "42", "41",
			"31", "32", "33", "34", "35", "36", "37", "38",
		],
		sizeBytes: 8598322,
		sizeFormatted: "8.2 МБ",
		timestampIso: "2026-08-28T11:30:00.000Z",
		relativeTime: "12 мин назад",
		imageUrl: SAMPLE_PATIENT_RVG_URL,
		status: "new",
		patientMatch: {
			patientName: "Смирнова Екатерина Васильевна",
			cardNumber: "043/у-2026/891",
			confidence: 95,
		},
		metadata: {
			kv: 68,
			ma: 10.0,
			exposureSec: 14.2,
			pixelSpacingMm: 0.096,
			apparatusModel: "Planmeca ProMax 2D",
			sensorResolution: "16.0 lp/mm",
		},
	},
	{
		id: "hf-03",
		filename: "Sidexis_Bitewing_Q1Q4_20260828_105512.jpg",
		source: "sidexis",
		sourceLabel: "Dentsply Sirona Sidexis",
		folderPath: "\\\\SIDEXIS-SRV\\PDATA\\Incoming_Captures",
		detectedModality: "bitewing",
		modalityLabel: "Bite-wing",
		detectedTeeth: ["17", "16", "15", "14", "47", "46", "45", "44"],
		sizeBytes: 2202009,
		sizeFormatted: "2.1 МБ",
		timestampIso: "2026-08-28T10:55:12.000Z",
		relativeTime: "45 мин назад",
		imageUrl: SAMPLE_PATIENT_RVG_URL,
		status: "new",
		patientMatch: {
			patientName: "Смирнова Екатерина Васильевна",
			cardNumber: "043/у-2026/891",
			confidence: 92,
		},
		metadata: {
			kv: 60,
			ma: 7.0,
			exposureSec: 0.10,
			pixelSpacingMm: 0.040,
			apparatusModel: "Sirona XIOS XG Supreme",
			sensorResolution: "33.3 lp/mm",
		},
	},
	{
		id: "hf-04",
		filename: "EzDent_Periapical_21_20260828_091522.dcm",
		source: "ezdent",
		sourceLabel: "Vatech EzDent-i",
		folderPath: "\\\\XRAY-SERVER\\EzDent-i\\Export\\AutoIntake",
		detectedModality: "intraoral_rvg",
		modalityLabel: "Прицельный RVG",
		detectedTeeth: ["21"],
		sizeBytes: 1363148,
		sizeFormatted: "1.3 МБ",
		timestampIso: "2026-08-28T09:15:22.000Z",
		relativeTime: "2 ч назад",
		imageUrl: SAMPLE_PATIENT_RVG_URL,
		status: "new",
		patientMatch: {
			patientName: "Смирнова Екатерина Васильевна",
			cardNumber: "043/у-2026/891",
			confidence: 90,
		},
		metadata: {
			kv: 65,
			ma: 7.0,
			exposureSec: 0.08,
			pixelSpacingMm: 0.035,
			apparatusModel: "Vatech EzSensor HD",
			sensorResolution: "29.2 lp/mm",
		},
	},
	{
		id: "hf-05",
		filename: "Carestream_EndoControl_46_20260828_084011.tif",
		source: "carestream",
		sourceLabel: "Carestream CS Imaging",
		folderPath: "C:\\ProgramData\\Carestream\\Captures\\Inbox",
		detectedModality: "intraoral_rvg",
		modalityLabel: "Прицельный RVG",
		detectedTeeth: ["46"],
		sizeBytes: 1887436,
		sizeFormatted: "1.8 МБ",
		timestampIso: "2026-08-28T08:40:11.000Z",
		relativeTime: "3 ч назад",
		imageUrl: SAMPLE_PATIENT_RVG_URL,
		status: "imported",
		patientMatch: {
			patientName: "Барабаш Сергей Владимирович",
			cardNumber: "043/у-2026/042",
			confidence: 94,
		},
		metadata: {
			kv: 65,
			ma: 7.0,
			exposureSec: 0.09,
			pixelSpacingMm: 0.042,
			apparatusModel: "Carestream RVG 6200",
			sensorResolution: "24.0 lp/mm",
		},
	},
];

export const CLINICAL_PURPOSES = [
	{ id: "endo_control", label: "Контроль эндодонтического лечения (обтурация каналов)" },
	{ id: "primary_caries", label: "Первичная диагностика кариеса / пульпита" },
	{ id: "implant_check", label: "Контроль остеоинтеграции имплантата / костной пластики" },
	{ id: "periapical_check", label: "Оценка периапикального очага / периодонтита" },
	{ id: "orthopantomogram", label: "Обзорное исследование зубных рядов (ОПТГ)" },
	{ id: "marginal_fit", label: "Контроль краевого прилегания ортопедической конструкции" },
] as const;

export type FilterPresetKey = "standard" | "endo" | "bone" | "caries" | "sharpen" | "negative";

export const FILTER_PRESETS: Record<
	FilterPresetKey,
	{
		label: string;
		brightness: number;
		contrast: number;
		invert: boolean;
		description: string;
	}
> = {
	standard: {
		label: "Стандарт",
		brightness: 100,
		contrast: 100,
		invert: false,
		description: "Сбалансированная яркость и контрастность",
	},
	endo: {
		label: "Эндодонтия / Апекс",
		brightness: 105,
		contrast: 165,
		invert: false,
		description: "Высокий контраст для верхушек корней и гуттаперчи",
	},
	bone: {
		label: "Кость / Трабекулы",
		brightness: 95,
		contrast: 145,
		invert: false,
		description: "Четкая визуализация кортикальной пластинки и трабекул",
	},
	caries: {
		label: "Скрытый кариес",
		brightness: 110,
		contrast: 180,
		invert: true,
		description: "Негатив с контрастом для зон деминерализации эмали",
	},
	sharpen: {
		label: "Резкость (Шарп)",
		brightness: 100,
		contrast: 135,
		invert: false,
		description: "Подчеркивание краевого прилегания пломб и вкладок",
	},
	negative: {
		label: "Негатив",
		brightness: 100,
		contrast: 100,
		invert: true,
		description: "Инверсия монохромного спектра",
	},
};

export const HotFolderIntakeModal: React.FC<HotFolderIntakeModalProps> = ({
	isOpen,
	onClose,
	patientId = "PAT-001",
	patientName = "Смирнова Екатерина Васильевна",
	patientCardNumber = "043/у-2026/891",
	patientBirthDate = "1988-06-14",
	doctorName = "Д-р Смирнов Алексей Петрович",
	onAttachToEmr,
	onExportDicom,
	onSendToLab,
}) => {
	const modalId = useId();
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Hot Folder Items State
	const [hotFolderItems, setHotFolderItems] = useState<HotFolderItem[]>(INITIAL_HOT_FOLDER_ITEMS);
	const [activeSourceFilter, setActiveSourceFilter] = useState<HotFolderSource>("all");
	const [selectedItemId, setSelectedItemId] = useState<string>("hf-01");
	const [isScanning, setIsScanning] = useState(false);
	const [lastScanTime, setLastScanTime] = useState<string>("только что");
	const [isDragOver, setIsDragOver] = useState(false);

	// Active Selected Item
	const activeItem = useMemo(() => {
		return hotFolderItems.find((i) => i.id === selectedItemId) || hotFolderItems[0] || null;
	}, [hotFolderItems, selectedItemId]);

	// Selected Teeth in FDI formula
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>(["16"]);

	// Synchronize selected teeth when switching hot folder item
	useEffect(() => {
		if (activeItem && activeItem.detectedTeeth.length > 0) {
			setSelectedTeeth(activeItem.detectedTeeth);
		}
	}, [activeItem]);

	// Image Display & Filter Controls
	const [brightness, setBrightness] = useState<number>(100);
	const [contrast, setContrast] = useState<number>(100);
	const [invert, setInvert] = useState<boolean>(false);
	const [activePreset, setActivePreset] = useState<FilterPresetKey>("standard");
	const [zoom, setZoom] = useState<number>(100);
	const [rotation, setRotation] = useState<number>(0);
	const [flipH, setFlipH] = useState<boolean>(false);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
	const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

	// Clinical Modality & Purpose Binding
	const [clinicalPurpose, setClinicalPurpose] = useState<string>("endo_control");
	const [protocolNote, setProtocolNote] = useState<string>("");

	// Auto-generate protocol note when teeth or purpose changes
	useEffect(() => {
		const teethStr = selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "—";
		if (clinicalPurpose === "endo_control") {
			setProtocolNote(
				`Прицельная радиовизиография зуба ${teethStr}. Контроль качества пломбирования корневых каналов: каналы обтурированы плотно и гомогенно на всем протяжении до рентгенологического апекса. Выведения силера за верхушку корня нет. Периодонтальная щель в периапикальной зоне без деструкции кости.`,
			);
		} else if (clinicalPurpose === "primary_caries") {
			setProtocolNote(
				`Прицельная радиовизиография зуба ${teethStr}. Обнаружен кариозный дефект твердых тканей коронки, проникающий в средние/глубокие слои дентина. Периапикальные ткани интактны, кортикальная пластинка альвеолы прослеживается.`,
			);
		} else if (clinicalPurpose === "implant_check") {
			setProtocolNote(
				`Контрольная рентгенография области имплантата в позиции ${teethStr}. Интеграция тела имплантата удовлетворительная, плотный контакт с костной тканью альвеолярного гребня. Резорбции краевой кости не выявлено.`,
			);
		} else if (clinicalPurpose === "periapical_check") {
			setProtocolNote(
				`Прицельная радиовизиография зуба ${teethStr}. В области верхушки корня определяется разрежение костной ткани с нечеткими контурами (деструкция периодонта). Корневые каналы ранее не лечены.`,
			);
		} else if (clinicalPurpose === "orthopantomogram") {
			setProtocolNote(
				`Ортопантомограмма челюстей. Зубные ряды интактны, положение зачатков зубов мудрости удовлетворительное, альвеолярный край сохранен, ВНЧС симметричны.`,
			);
		} else {
			setProtocolNote(
				`Прицельная рентгенография зуба ${teethStr}. Краевое прилегание искусственной коронки/вкладки к уступу плотное, нависающих краев и вторичного кариеса под конструкцией не определяется.`,
			);
		}
	}, [selectedTeeth, clinicalPurpose]);

	// Apply Filter Preset
	const handleApplyPreset = (key: FilterPresetKey) => {
		const preset = FILTER_PRESETS[key];
		setActivePreset(key);
		setBrightness(preset.brightness);
		setContrast(preset.contrast);
		setInvert(preset.invert);
	};

	// Toggle tooth in FDI Formula
	const handleToggleTooth = (tooth: string) => {
		setSelectedTeeth((prev) => {
			if (prev.includes(tooth)) {
				const next = prev.filter((t) => t !== tooth);
				return next.length > 0 ? next : [tooth];
			}
			return [...prev, tooth].sort();
		});
	};

	// Quick FDI Presets
	const handleSelectAllTeeth = () => {
		const all = [
			...ADULT_FDI_TEETH.quadrant1,
			...ADULT_FDI_TEETH.quadrant2,
			...ADULT_FDI_TEETH.quadrant3,
			...ADULT_FDI_TEETH.quadrant4,
		];
		setSelectedTeeth(all);
	};

	const handleSelectUpperArch = () => {
		setSelectedTeeth([...ADULT_FDI_TEETH.quadrant1, ...ADULT_FDI_TEETH.quadrant2]);
	};

	const handleSelectLowerArch = () => {
		setSelectedTeeth([...ADULT_FDI_TEETH.quadrant4, ...ADULT_FDI_TEETH.quadrant3]);
	};

	const handleSelectFrontal = () => {
		setSelectedTeeth(["13", "12", "11", "21", "22", "23", "43", "42", "41", "31", "32", "33"]);
	};

	const handleSelectRightMolar = () => {
		setSelectedTeeth(["18", "17", "16", "15", "14", "48", "47", "46", "45", "44"]);
	};

	const handleSelectLeftMolar = () => {
		setSelectedTeeth(["24", "25", "26", "27", "28", "34", "35", "36", "37", "38"]);
	};

	// Manual scan folder trigger
	const handleRescanFolder = () => {
		setIsScanning(true);
		setTimeout(() => {
			setIsScanning(false);
			setLastScanTime("только что");
			showToast("Сетевая папка рентгена успешно синхронизирована (EzDent-i, Romexis, Sidexis)", "success");
		}, 600);
	};

	// Handle Drag and Drop Files
	const handleDropFile = (file: File) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result === "string") {
				const lowerName = file.name.toLowerCase();
				let modality: "intraoral_rvg" | "optg_panoramic" | "cbct_slice" | "bitewing" = "intraoral_rvg";
				let detectedTeeth = ["16"];

				if (lowerName.includes("optg") || lowerName.includes("panoramic")) {
					modality = "optg_panoramic";
					detectedTeeth = [
						"18", "17", "16", "15", "14", "13", "12", "11",
						"21", "22", "23", "24", "25", "26", "27", "28",
						"48", "47", "46", "45", "44", "43", "42", "41",
						"31", "32", "33", "34", "35", "36", "37", "38",
					];
				} else if (lowerName.includes("bitewing") || lowerName.includes("bw")) {
					modality = "bitewing";
					detectedTeeth = ["16", "15", "46", "45"];
				}

				// Extract tooth from filename if present (e.g. Tooth21, 21.dcm)
				const toothMatch = file.name.match(/\b([1-4][1-8])\b/);
				if (toothMatch?.[1]) {
					detectedTeeth = [toothMatch[1]];
				}

				const newItem: HotFolderItem = {
					id: `dropped-${Date.now()}`,
					filename: file.name,
					source: "dicom_network",
					sourceLabel: "Локальный импорт (Dropzone)",
					folderPath: "Внешний файл / Дропзона",
					detectedModality: modality,
					modalityLabel: modality === "optg_panoramic" ? "ОПТГ Панорама" : "Прицельный RVG",
					detectedTeeth,
					sizeBytes: file.size,
					sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} МБ`,
					timestampIso: new Date().toISOString(),
					relativeTime: "только что",
					imageUrl: result,
					status: "new",
					patientMatch: {
						patientName,
						cardNumber: patientCardNumber,
						confidence: 100,
					},
					metadata: {
						kv: 65,
						ma: 7.0,
						exposureSec: 0.08,
						pixelSpacingMm: 0.035,
						apparatusModel: "Импортированный снимок DICOM",
						sensorResolution: "29.2 lp/mm",
					},
				};

				setHotFolderItems((prev) => [newItem, ...prev]);
				setSelectedItemId(newItem.id);
				setSelectedTeeth(detectedTeeth);
				showToast(`Файл ${file.name} успешно загружен и привязан`, "success");
			}
		};
		reader.readAsDataURL(file);
	};

	// Filtered files list
	const filteredItems = useMemo(() => {
		if (activeSourceFilter === "all") return hotFolderItems;
		return hotFolderItems.filter((i) => i.source === activeSourceFilter);
	}, [hotFolderItems, activeSourceFilter]);

	// 1-Click Attach to EMR Action
	const handleAttachToEmr = useCallback(() => {
		if (!activeItem) return;

		const doseMicrosv = activeItem.detectedModality === "optg_panoramic" ? 18.0 : 3.0;
		const singleTooth = selectedTeeth.length === 1 && selectedTeeth[0] ? selectedTeeth[0] : null;
		const singleToothName = singleTooth ? FDI_TOOTH_NAMES[singleTooth] ?? "" : "";
		const anatomicalArea = singleTooth ? `Зуб ${singleTooth} (${singleToothName})` : `Зубы: ${selectedTeeth.join(", ")}`;

		const study: RadiologyStudy = {
			id: `study-${Date.now()}`,
			patientName,
			studyDate: new Date().toISOString().slice(0, 16).replace("T", " "),
			studyType: activeItem.detectedModality === "optg_panoramic" ? "optg_digital_panoramic" : "intraoral_radiovisiography",
			modality: activeItem.detectedModality,
			modalityLabel: activeItem.modalityLabel,
			anatomicalArea,
			teethFdi: selectedTeeth,
			effectiveDoseMicrosv: doseMicrosv,
			effectiveDoseMsv: doseMicrosv / 1000,
			imageUrl: activeItem.imageUrl,
			doctorName,
			doctorSpecialty: "Врач-стоматолог терапевт-эндодонтист",
			clinicName: "ООО «Денте Стоматология»",
			status: "completed",
			diagnosisIcd10: "K04.0",
			diagnosticNotes: protocolNote,
			metadata: {
				kv: activeItem.metadata.kv,
				ma: activeItem.metadata.ma,
				exposureSec: activeItem.metadata.exposureSec,
				pixelSpacingMm: activeItem.metadata.pixelSpacingMm,
				apparatusModel: activeItem.metadata.apparatusModel,
			},
		};

		// Mark item as imported
		setHotFolderItems((prev) =>
			prev.map((i) => (i.id === activeItem.id ? { ...i, status: "imported" } : i)),
		);

		onAttachToEmr?.({
			study,
			teethFdi: selectedTeeth,
			protocolNote,
			clinicalPurpose,
			doseMicrosv,
		});

		showToast(
			`Снимок (${activeItem.filename}) успешно прикреплен к карте пациента ${patientName} и протоколу ф. 043/у!`,
			"success",
		);
	}, [activeItem, patientName, selectedTeeth, doctorName, protocolNote, clinicalPurpose, onAttachToEmr]);

	// Canvas Pan drag handlers
	const handleMouseDownCanvas = (e: React.MouseEvent) => {
		setIsDraggingCanvas(true);
		dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
	};

	const handleMouseMoveCanvas = (e: React.MouseEvent) => {
		if (!isDraggingCanvas) return;
		setPan({
			x: e.clientX - dragStartRef.current.x,
			y: e.clientY - dragStartRef.current.y,
		});
	};

	const handleMouseUpCanvas = () => {
		setIsDraggingCanvas(false);
	};

	const handleResetView = () => {
		setZoom(100);
		setRotation(0);
		setFlipH(false);
		setPan({ x: 0, y: 0 });
		handleApplyPreset("standard");
	};

	if (!isOpen) return null;

	const doseInfo = formatRadiationDose(activeItem?.detectedModality === "optg_panoramic" ? 18.0 : 3.0);

	return createPortal(
		<div
			className="hfi-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby={`${modalId}-title`}
			data-testid="hotfolder-intake-modal-overlay"
			onMouseMove={handleMouseMoveCanvas}
			onMouseUp={handleMouseUpCanvas}
		>
			<div className="hfi-modal-shell" data-testid="hotfolder-intake-modal">
				{/* ─── HEADER ─────────────────────────────────────────────────── */}
				<header className="hfi-modal-header">
					<div className="hfi-header-left">
						<div className="hfi-header-icon-box">
							<FolderSync className="w-5 h-5" />
						</div>
						<div className="hfi-header-info">
							<div className="hfi-header-title-row">
								<h2 id={`${modalId}-title`} className="hfi-header-title">
									Импорт рентгенограмм из сетевой папки (Hot-Folder Intake)
								</h2>
								<span className="hfi-header-badge">
									<Wifi className="w-3 h-3 text-emerald-400" />
									<span>Auto-Polling Active</span>
								</span>
							</div>
							<p className="hfi-header-subtitle">
								<span>Пациент: <strong className="text-[var(--ink,#fff)]">{patientName}</strong></span>
								<span>·</span>
								<span>Медкарта: <strong className="text-[var(--ink,#fff)]">{patientCardNumber}</strong></span>
								<span>·</span>
								<span>Врач: {doctorName}</span>
							</p>
						</div>
					</div>

					<div className="hfi-header-actions">
						<button
							type="button"
							onClick={onClose}
							className="hfi-close-btn"
							data-testid="hfi-close-modal-btn"
							aria-label="Закрыть модальное окно"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* ─── BODY 3-PANEL LAYOUT ────────────────────────────────────── */}
				<div className="hfi-modal-body">
					{/* ─── 1. LEFT PANEL: HOT-FOLDER FILES & DROPZONE ───────────── */}
					<aside className="hfi-left-panel">
						<div className="hfi-left-header">
							<div className="hfi-folder-status-bar">
								<div className="hfi-folder-status-indicator">
									<span className="hfi-status-pulse-dot" />
									<span>Папка онлайн ({filteredItems.length} снимков)</span>
								</div>
								<button
									type="button"
									onClick={handleRescanFolder}
									disabled={isScanning}
									className="hfi-rescan-btn"
									data-testid="hfi-rescan-btn"
									title="Пересканировать сетевую папку"
								>
									<RefreshCw className={`w-3 h-3 ${isScanning ? "animate-spin text-teal-400" : ""}`} />
									<span>{isScanning ? "Скан..." : "Обновить"}</span>
								</button>
							</div>

							<select
								value={activeSourceFilter}
								onChange={(e) => setActiveSourceFilter(e.target.value as HotFolderSource)}
								className="hfi-source-filter-select"
								data-testid="hfi-source-filter-select"
								aria-label="Фильтр по источнику рентгена"
							>
								<option value="all">Все источники рентгена</option>
								<option value="ezdent">Vatech EzDent-i (Auto-Export)</option>
								<option value="romexis">Planmeca Romexis (Exchange)</option>
								<option value="sidexis">Dentsply Sirona Sidexis 4</option>
								<option value="carestream">Carestream CS Imaging</option>
								<option value="dicom_network">Локальный импорт (Dropzone)</option>
							</select>
						</div>

						{/* Discovered Files List */}
						<div className="hfi-files-list" data-testid="hfi-files-list">
							{filteredItems.map((item) => {
								const isSelected = item.id === activeItem?.id;
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => setSelectedItemId(item.id)}
										className={`hfi-file-card ${isSelected ? "active" : ""}`}
										data-testid={`hfi-file-card-${item.id}`}
									>
										<div className="hfi-file-card-top">
											<span className="hfi-file-modality-badge">
												<Scan className="w-3 h-3" />
												<span>{item.modalityLabel}</span>
											</span>
											<span className={`hfi-file-status-badge ${item.status}`}>
												{item.status === "new" ? "Новый" : item.status === "imported" ? "Импортирован" : "В работе"}
											</span>
										</div>

										<p className="hfi-file-name" title={item.filename}>
											{item.filename}
										</p>

										<div className="hfi-file-meta-row">
											<span>{item.sourceLabel}</span>
											<span>{item.sizeFormatted}</span>
										</div>

										<div className="hfi-file-meta-row">
											<span className="hfi-file-teeth-tag">
												Зуб FDI: {item.detectedTeeth.join(", ")}
											</span>
											<span className="text-[10px] text-gray-400">
												<Clock className="w-2.5 h-2.5 inline mr-1" />
												{item.relativeTime}
											</span>
										</div>

										{item.patientMatch && (
											<div className="mt-1 pt-1 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-emerald-400">
												<span className="truncate max-w-[170px]">
													✓ {item.patientMatch.patientName}
												</span>
												<span className="font-mono font-bold">
													{item.patientMatch.confidence}% match
												</span>
											</div>
										)}
									</button>
								);
							})}
						</div>

						{/* Dropzone for local dragging */}
						<div className="hfi-left-dropzone">
							<input
								ref={fileInputRef}
								type="file"
								accept=".dcm,.dicom,.jpg,.jpeg,.png,.tiff,.tif,.bmp"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) handleDropFile(file);
								}}
							/>
							<div
								className={`hfi-dropzone-box ${isDragOver ? "dragover" : ""}`}
								data-testid="hfi-dropzone-box"
								onClick={() => fileInputRef.current?.click()}
								onDragOver={(e) => {
									e.preventDefault();
									setIsDragOver(true);
								}}
								onDragLeave={() => setIsDragOver(false)}
								onDrop={(e) => {
									e.preventDefault();
									setIsDragOver(false);
									const file = e.dataTransfer.files?.[0];
									if (file) handleDropFile(file);
								}}
							>
								<UploadCloud className="w-5 h-5 text-teal-400" />
								<p className="hfi-dropzone-title">Перетащите снимок сюда</p>
								<p className="hfi-dropzone-sub">DICOM (.dcm), TIFF, PNG, JPG из EzDent/Romexis</p>
							</div>
						</div>
					</aside>

					{/* ─── 2. CENTER PANEL: DARK RADIOLOGY CANVAS & CONTROLS ───── */}
					<main className="hfi-center-panel" data-testid="hfi-center-canvas">
						{/* Top HUD overlay */}
						<div className="hfi-canvas-top-hud">
							<div className="hfi-hud-chip">
								<HardDrive className="w-3.5 h-3.5 text-teal-400" />
								<span>
									{activeItem?.metadata.apparatusModel ?? "Vatech EzSensor HD"}
									{activeItem?.metadata.sensorResolution ? ` · ${activeItem.metadata.sensorResolution}` : ""}
								</span>
							</div>

							<div className="flex items-center gap-2">
								<div className="hfi-hud-chip">
									<Zap className="w-3.5 h-3.5 text-amber-400" />
									<span>
										{activeItem?.metadata.kv ?? 65} kV · {activeItem?.metadata.ma ?? 7.0} mA · {activeItem?.metadata.exposureSec ?? 0.08} s
									</span>
								</div>

								<div className={`hfi-hud-chip border ${doseInfo.badgeClass}`}>
									<ShieldCheck className="w-3.5 h-3.5" />
									<span>{doseInfo.microsvText} (СанПиН ОК)</span>
								</div>
							</div>
						</div>

						{/* Dark Viewport Canvas Stage */}
						<div
							className="hfi-viewport-area"
							data-testid="hfi-viewport-area"
							onMouseDown={handleMouseDownCanvas}
						>
							<div
								className="hfi-image-stage"
								style={{
									transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
									filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? "invert(100%)" : ""}`,
								}}
							>
								{activeItem ? (
									<img
										src={activeItem.imageUrl}
										alt={activeItem.filename}
										className="hfi-radiology-image"
										data-testid="hfi-active-radiology-image"
										draggable={false}
									/>
								) : (
									<div className="flex flex-col items-center justify-center p-12 text-slate-500">
										<ImageIcon className="w-16 h-16 mb-2 opacity-40" />
										<p className="text-sm">Нет выбранного снимка</p>
									</div>
								)}
							</div>
						</div>

						{/* Bottom Floating Control Dock */}
						<div className="hfi-bottom-dock">
							{/* Presets row */}
							<div className="hfi-dock-pill">
								<div className="hfi-presets-strip">
									{(Object.keys(FILTER_PRESETS) as FilterPresetKey[]).map((key) => {
										const p = FILTER_PRESETS[key];
										const isSelected = activePreset === key;
										return (
											<button
												key={key}
												type="button"
												onClick={() => handleApplyPreset(key)}
												className={`hfi-preset-chip ${isSelected ? "active" : ""}`}
												data-testid={`hfi-preset-chip-${key}`}
												title={p.description}
											>
												{p.label}
											</button>
										);
									})}
								</div>
							</div>

							{/* Sliders & Tools row */}
							<div className="hfi-dock-pill">
								{/* Brightness Slider */}
								<div className="hfi-slider-group">
									<span className="hfi-slider-label">
										<Sun className="w-3.5 h-3.5 text-amber-400" />
										<span>Яркость</span>
									</span>
									<input
										type="range"
										min="20"
										max="200"
										value={brightness}
										onChange={(e) => setBrightness(Number(e.target.value))}
										className="hfi-dock-slider"
										data-testid="hfi-brightness-slider"
										aria-label="Регулировка яркости"
									/>
									<span className="font-mono text-[10px] w-7 text-right">{brightness}%</span>
								</div>

								<div className="w-[1px] h-4 bg-slate-700" />

								{/* Contrast Slider */}
								<div className="hfi-slider-group">
									<span className="hfi-slider-label">
										<Eye className="w-3.5 h-3.5 text-teal-400" />
										<span>Контраст</span>
									</span>
									<input
										type="range"
										min="50"
										max="300"
										value={contrast}
										onChange={(e) => setContrast(Number(e.target.value))}
										className="hfi-dock-slider"
										data-testid="hfi-contrast-slider"
										aria-label="Регулировка контрастности"
									/>
									<span className="font-mono text-[10px] w-7 text-right">{contrast}%</span>
								</div>

								<div className="w-[1px] h-4 bg-slate-700" />

								{/* Invert Button */}
								<button
									type="button"
									onClick={() => setInvert((prev) => !prev)}
									className={`hfi-dock-btn ${invert ? "active" : ""}`}
									data-testid="hfi-invert-btn"
									title="Инвертировать ч/б (Негатив)"
								>
									<span>Негатив</span>
								</button>

								{/* Rotation */}
								<button
									type="button"
									onClick={() => setRotation((prev) => (prev + 90) % 360)}
									className="hfi-dock-btn"
									data-testid="hfi-rotate-btn"
									title="Повернуть на 90° по часовой"
								>
									<RotateCw className="w-3.5 h-3.5" />
									<span>{rotation}°</span>
								</button>

								{/* Flip Horizontal */}
								<button
									type="button"
									onClick={() => setFlipH((prev) => !prev)}
									className={`hfi-dock-btn ${flipH ? "active" : ""}`}
									data-testid="hfi-flip-btn"
									title="Зеркальное отражение по горизонтали"
								>
									<FlipHorizontal className="w-3.5 h-3.5" />
								</button>

								<div className="w-[1px] h-4 bg-slate-700" />

								{/* Zoom Controls */}
								<button
									type="button"
									onClick={() => setZoom((prev) => Math.max(50, prev - 25))}
									className="hfi-dock-btn"
									data-testid="hfi-zoom-out-btn"
									title="Уменьшить масштаб"
								>
									<Minus className="w-3.5 h-3.5" />
								</button>
								<span className="font-mono text-[10px] text-gray-300 w-8 text-center">{zoom}%</span>
								<button
									type="button"
									onClick={() => setZoom((prev) => Math.min(400, prev + 25))}
									className="hfi-dock-btn"
									data-testid="hfi-zoom-in-btn"
									title="Увеличить масштаб"
								>
									<Plus className="w-3.5 h-3.5" />
								</button>

								{/* Reset */}
								<button
									type="button"
									onClick={handleResetView}
									className="hfi-dock-btn text-gray-400 hover:text-white"
									data-testid="hfi-reset-view-btn"
									title="Сбросить масштаб и положение"
								>
									<span>Сброс</span>
								</button>
							</div>
						</div>
					</main>

					{/* ─── 3. RIGHT PANEL: FDI FORMULA & 043/У PROTOCOL ─────────── */}
					<aside className="hfi-right-panel" data-testid="hfi-right-panel">
						<div className="hfi-right-content">
							{/* Section: FDI Dental Formula */}
							<div className="space-y-2">
								<h3 className="hfi-section-title">
									<Sparkles className="w-4 h-4 text-teal-400" />
									<span>Зубная формула FDI (11–48)</span>
								</h3>

								<div className="hfi-fdi-box">
									<div className="hfi-fdi-quick-presets">
										<button
											type="button"
											onClick={handleSelectAllTeeth}
											className="hfi-fdi-quick-chip"
											data-testid="hfi-fdi-all-btn"
										>
											Все (ОПТГ)
										</button>
										<button
											type="button"
											onClick={handleSelectUpperArch}
											className="hfi-fdi-quick-chip"
											data-testid="hfi-fdi-upper-btn"
										>
											Верхняя (18-28)
										</button>
										<button
											type="button"
											onClick={handleSelectLowerArch}
											className="hfi-fdi-quick-chip"
											data-testid="hfi-fdi-lower-btn"
										>
											Нижняя (48-38)
										</button>
										<button
											type="button"
											onClick={handleSelectFrontal}
											className="hfi-fdi-quick-chip"
											data-testid="hfi-fdi-frontal-btn"
										>
											Фронтальный
										</button>
										<button
											type="button"
											onClick={handleSelectRightMolar}
											className="hfi-fdi-quick-chip"
											data-testid="hfi-fdi-right-molar-btn"
										>
											Прав. жеват.
										</button>
										<button
											type="button"
											onClick={handleSelectLeftMolar}
											className="hfi-fdi-quick-chip"
											data-testid="hfi-fdi-left-molar-btn"
										>
											Лев. жеват.
										</button>
									</div>

									{/* 4-Quadrant FDI Grid */}
									<div className="hfi-fdi-grid-container" data-testid="hfi-fdi-grid">
										{/* Upper Arch (Q1: 18..11 | Q2: 21..28) */}
										<div className="hfi-fdi-arch-row">
											{ADULT_FDI_TEETH.quadrant1.map((tooth) => {
												const isSelected = selectedTeeth.includes(tooth);
												return (
													<button
														key={tooth}
														type="button"
														onClick={() => handleToggleTooth(tooth)}
														className={`hfi-tooth-btn ${isSelected ? "selected" : ""}`}
														data-testid={`hfi-tooth-btn-${tooth}`}
														title={`${tooth}: ${FDI_TOOTH_NAMES[tooth] ?? ""}`}
													>
														{tooth}
													</button>
												);
											})}
											<div className="w-1.5 h-6 bg-slate-700/80 mx-0.5 rounded-full" />
											{ADULT_FDI_TEETH.quadrant2.map((tooth) => {
												const isSelected = selectedTeeth.includes(tooth);
												return (
													<button
														key={tooth}
														type="button"
														onClick={() => handleToggleTooth(tooth)}
														className={`hfi-tooth-btn ${isSelected ? "selected" : ""}`}
														data-testid={`hfi-tooth-btn-${tooth}`}
														title={`${tooth}: ${FDI_TOOTH_NAMES[tooth] ?? ""}`}
													>
														{tooth}
													</button>
												);
											})}
										</div>

										<div className="hfi-fdi-divider" />

										{/* Lower Arch (Q4: 48..41 | Q3: 31..38) */}
										<div className="hfi-fdi-arch-row">
											{ADULT_FDI_TEETH.quadrant4.map((tooth) => {
												const isSelected = selectedTeeth.includes(tooth);
												return (
													<button
														key={tooth}
														type="button"
														onClick={() => handleToggleTooth(tooth)}
														className={`hfi-tooth-btn ${isSelected ? "selected" : ""}`}
														data-testid={`hfi-tooth-btn-${tooth}`}
														title={`${tooth}: ${FDI_TOOTH_NAMES[tooth] ?? ""}`}
													>
														{tooth}
													</button>
												);
											})}
											<div className="w-1.5 h-6 bg-slate-700/80 mx-0.5 rounded-full" />
											{ADULT_FDI_TEETH.quadrant3.map((tooth) => {
												const isSelected = selectedTeeth.includes(tooth);
												return (
													<button
														key={tooth}
														type="button"
														onClick={() => handleToggleTooth(tooth)}
														className={`hfi-tooth-btn ${isSelected ? "selected" : ""}`}
														data-testid={`hfi-tooth-btn-${tooth}`}
														title={`${tooth}: ${FDI_TOOTH_NAMES[tooth] ?? ""}`}
													>
														{tooth}
													</button>
												);
											})}
										</div>
									</div>

									<p className="hfi-selected-teeth-summary">
										Выбрано: <strong className="text-teal-300">{selectedTeeth.join(", ")}</strong>
										{selectedTeeth.length === 1 && selectedTeeth[0] && FDI_TOOTH_NAMES[selectedTeeth[0]] && (
											<span className="block text-[10px] text-gray-400 mt-0.5">
												{FDI_TOOTH_NAMES[selectedTeeth[0]]}
											</span>
										)}
									</p>
								</div>
							</div>

							{/* Section: Clinical Purpose */}
							<div className="hfi-field-group">
								<label className="hfi-field-label">Клиническая цель исследования</label>
								<select
									value={clinicalPurpose}
									onChange={(e) => setClinicalPurpose(e.target.value)}
									className="hfi-select-input"
									data-testid="hfi-clinical-purpose-select"
								>
									{CLINICAL_PURPOSES.map((cp) => (
										<option key={cp.id} value={cp.id}>
											{cp.label}
										</option>
									))}
								</select>
							</div>

							{/* Section: Protocol 043/y note */}
							<div className="hfi-protocol-box">
								<div className="flex items-center justify-between">
									<label className="hfi-field-label">
										Протокол описания для медкарты ф. 043/у
									</label>
									<span className="text-[10px] text-teal-400 font-semibold">
										Авто-шаблон
									</span>
								</div>
								<textarea
									value={protocolNote}
									onChange={(e) => setProtocolNote(e.target.value)}
									className="hfi-protocol-textarea"
									data-testid="hfi-protocol-textarea"
									rows={4}
									placeholder="Введите описание рентгенограммы..."
								/>
							</div>
						</div>

						{/* ─── FOOTER ACTIONS & 1-CLICK ATTACH ──────────────────── */}
						<div className="hfi-right-footer">
							<button
								type="button"
								onClick={handleAttachToEmr}
								className="hfi-primary-attach-btn"
								data-testid="hfi-primary-attach-btn"
							>
								<Zap className="w-4 h-4 fill-white" />
								<span>Прикрепить к карте пациента и протоколу ф. 043/у</span>
							</button>

							<div className="hfi-secondary-actions-row">
								<button
									type="button"
									onClick={() => {
										if (activeItem) {
											onExportDicom?.(activeItem);
											showToast(`Экспорт DICOM (${activeItem.filename}) выполнен`, "info");
										}
									}}
									className="hfi-secondary-btn"
									data-testid="hfi-export-dicom-btn"
								>
									<Download className="w-3.5 h-3.5" />
									<span>Экспорт DICOM</span>
								</button>

								<button
									type="button"
									onClick={() => {
										if (activeItem) {
											onSendToLab?.(activeItem, protocolNote);
											showToast(`Снимок отправлен в зуботехническую лабораторию`, "info");
										}
									}}
									className="hfi-secondary-btn"
									data-testid="hfi-send-lab-btn"
								>
									<Send className="w-3.5 h-3.5" />
									<span>В лабораторию</span>
								</button>
							</div>
						</div>
					</aside>
				</div>
			</div>
		</div>,
		document.body,
	);
};
