import {
	Activity,
	ArrowRight,
	Check,
	CheckCircle2,
	Clipboard,
	FileText,
	Layers,
	Mic,
	MicOff,
	Printer,
	Save,
	Sparkles,
	Target,
	HelpCircle,
	Trash2,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { globalDentalVoiceEngine } from "../../services/voice";
import { useVisitStore } from "../../store/visitStore";
if (typeof document !== "undefined") {
	import("../orthodontics/CephalometricAnalysisModal.css");
}
import {
	CephalometricCanvas,
	SAMPLE_TRG_CEPHALOGRAM_URL,
	type XrayFilterMode,
} from "../orthodontics/CephalometricCanvas";
import {
	calculateCephalometrics,
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	CLASS_I_NORMAL_LANDMARKS_PRESET,
	CLASS_II_DISTAL_LANDMARKS_PRESET,
	CLASS_III_MESIAL_LANDMARKS_PRESET,
	type LandmarkKey,
	type LandmarkMap,
	type Point2D,
} from "../orthodontics/cephalometricMath";

export const LANDMARK_CLINICAL_ROLES: Record<LandmarkKey, { depends: string; clinicalTip: string }> = {
	S: {
		depends: "Углы SNA (82°±2°), SNB (80°±2°), SN-GoGn (32°±3°), U1-SN (104°±2°), Y-ось Downs",
		clinicalTip: "Центр контура турецкого седла (гипофизарной ямки клиновидной кости).",
	},
	N: {
		depends: "Ключевая точка основания черепа: углы SNA, SNB, ANB (Класс I/II/III), 1-NA, 1-NB, Facial Angle, Convexity",
		clinicalTip: "Лобно-носовой шов на профильном контуре черепа (переход лобной кости в носовую).",
	},
	A: {
		depends: "Угол SNA (ВЧ к черепу), угол ANB (Скелетный класс), Wits-число, 1-NA (22°±2° и 4±1 мм), McNamara A-Nperp",
		clinicalTip: "Точка наибольшей вогнутости переднего контура апикального базиса верхней челюсти под остью ANS.",
	},
	B: {
		depends: "Угол SNB (НЧ к черепу), угол ANB (Скелетный класс), Wits-число, 1-NB (25°±2° и 4±1 мм)",
		clinicalTip: "Точка наибольшей вогнутости переднего контура альвеолярной части нижней челюсти над погонионом Pog.",
	},
	Pog: {
		depends: "Лицевой угол Downs (N-Pog to FH), угол выпуклости Downs (N-A-Pog), McNamara Pog-Nperp",
		clinicalTip: "Наиболее передняя точка подбородочного выступа на профиле симфиза нижней челюсти.",
	},
	Me: {
		depends: "Плоскость основания нижней челюсти MP, угол FMA (25°±3°), угол наклона SN-GoGn, наклон резцов L1-MP",
		clinicalTip: "Самая нижняя точка контура подбородочного симфиза нижней челюсти.",
	},
	Gn: {
		depends: "Гнатион: угол SN-GoGn, ось роста лица Y-Axis (Downs), угол FMA (Tweed)",
		clinicalTip: "Передне-нижняя точка контура подбородочного симфиза (между точками Pog и Me).",
	},
	Go: {
		depends: "Угол нижней челюсти: плоскость MP, угол FMA (Tweed), SN-GoGn (Steiner), межбазисный угол NL-ML",
		clinicalTip: "Вершина угла нижней челюсти (переход тела челюсти в восходящую ветвь).",
	},
	ANS: {
		depends: "Нёбная плоскость NL, межбазисный угол NL-ML (Ricketts, 25°±4°), Wits-ориентир",
		clinicalTip: "Вершина костного выступа передней носовой ости на дистальном крае грушевидного отверстия.",
	},
	PNS: {
		depends: "Нёбная плоскость NL, межбазисный угол NL-ML (Ricketts), окклюзионная плоскость",
		clinicalTip: "Задний дистальный край твердого нёба (вершина задней носовой ости).",
	},
	Or: {
		depends: "Франкфуртская горизонталь FH (FMA Tweed, Facial Angle Downs, Y-Axis, McNamara)",
		clinicalTip: "Самая нижняя точка инфраорбитального края глазницы на рентгенограмме.",
	},
	Po: {
		depends: "Франкфуртская горизонталь FH (FMA Tweed, Facial Angle Downs, Y-Axis, McNamara)",
		clinicalTip: "Верхний край наружного слухового прохода.",
	},
	U1t: {
		depends: "Инклинация 1-NA (22°±2°), расстояние 1-NA (4±1 мм), U1-SN (104°±2°), межрезцовый угол U1-L1",
		clinicalTip: "Режущий край наиболее выступающего центрального резца верхней челюсти (1.1 или 2.1).",
	},
	U1a: {
		depends: "Продольная ось верхнего резца: угол 1-NA (22°±2°), угол U1-SN (104°±2°), межрезцовый U1-L1",
		clinicalTip: "Верхушка корня центрального резца верхней челюсти.",
	},
	L1t: {
		depends: "Инклинация 1-NB (25°±2°), расстояние 1-NB (4±1 мм), L1-MP / IMPA (90°±3°), межрезцовый U1-L1",
		clinicalTip: "Режущий край наиболее выступающего центрального резца нижней челюсти (4.1 или 3.1).",
	},
	L1a: {
		depends: "Продольная ось нижнего резца: угол 1-NB (25°±2°), угол L1-MP / IMPA (90°±3°), межрезцовый U1-L1",
		clinicalTip: "Верхушка корня центрального резца нижней челюсти.",
	},
};

export function getRequiredLandmarksForMeasurement(id: string): LandmarkKey[] {
	switch (id) {
		case "SNA": return ["S", "N", "A"];
		case "SNB": return ["S", "N", "B"];
		case "ANB": return ["S", "N", "A", "B"];
		case "Wits": return ["A", "B", "U1t", "L1t"];
		case "Downs-FA": return ["N", "Pog", "Po", "Or"];
		case "Downs-Conv": return ["N", "A", "Pog"];
		case "Downs-AB": return ["N", "Pog", "A", "B"];
		case "SN-GoGn": return ["S", "N", "Go", "Gn"];
		case "FMA": return ["Po", "Or", "Go", "Me"];
		case "Downs-YAxis": return ["S", "Gn", "Po", "Or"];
		case "Downs-CantOP": return ["Po", "Or", "U1t", "L1t"];
		case "U1-SN": return ["S", "N", "U1t", "U1a"];
		case "1-NA-Angle": return ["N", "A", "U1t", "U1a"];
		case "1-NA-Dist": return ["N", "A", "U1t"];
		case "L1-MP": return ["Go", "Me", "L1t", "L1a"];
		case "1-NB-Angle": return ["N", "B", "L1t", "L1a"];
		case "1-NB-Dist": return ["N", "B", "L1t"];
		case "U1-L1": return ["U1t", "U1a", "L1t", "L1a"];
		case "NL-ML": return ["ANS", "PNS", "Go", "Me"];
		case "McNamara-A-Nperp": return ["N", "A", "Po", "Or"];
		case "McNamara-Pog-Nperp": return ["N", "Pog", "Po", "Or"];
		default: return [];
	}
}

export interface CephalometricAnalysisModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly initialImageUrl?: string | undefined;
	readonly initialTab?: ("landmarks" | "metrics" | "report") | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
}

export function CephalometricAnalysisModal({
	isOpen,
	onClose,
	patientId,
	patientName,
	initialImageUrl,
	initialTab,
	onInsertToProtocol,
}: CephalometricAnalysisModalProps) {
	// Active Tab inside the sidebar: 'landmarks' | 'metrics' | 'report'
	const [activeTab, setActiveTab] = useState<"landmarks" | "metrics" | "report">(
		initialTab ?? "landmarks",
	);
	// Mobile Viewport Control (< lg / 390px): 'canvas' | 'landmarks' | 'metrics' | 'report'
	const [mobileView, setMobileView] = useState<"canvas" | "landmarks" | "metrics" | "report">(
		initialTab ? initialTab : "canvas",
	);

	// Landmarks State (Initialized empty when no image is loaded to prevent fake 100% status)
	const [landmarks, setLandmarks] = useState<LandmarkMap>(() =>
		initialImageUrl ? DEFAULT_CEPH_LANDMARKS_PRESET : {},
	);
	const [activeTargetKey, setActiveTargetKey] = useState<LandmarkKey | null>(
		initialImageUrl ? "S" : null,
	);

	// Image & Filters State
	const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl ?? null);
	const isImageLoaded = Boolean(imageUrl);
	const [filterMode, setFilterMode] = useState<XrayFilterMode>("normal");
	const [brightness, setBrightness] = useState<number>(100);
	const [contrast, setContrast] = useState<number>(100);

	// Overlay Toggles
	const [showPolygon, setShowPolygon] = useState<boolean>(true);
	const [showPlanes, setShowPlanes] = useState<boolean>(true);
	const [showLabels, setShowLabels] = useState<boolean>(true);

	// Calibration & Scale (mm per pixel)
	const [scaleMmPerPixel, setScaleMmPerPixel] = useState<number>(0.15);

	// Voice STT State
	const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
	const [voiceInterimText, setVoiceInterimText] = useState<string>("");

	// Copied state
	const [copied, setCopied] = useState<boolean>(false);

	// Perform Cephalometric Calculations (Steiner, Tweed, Downs, Jacobson, Ricketts)
	const analysis = useMemo(() => {
		return calculateCephalometrics(landmarks, scaleMmPerPixel);
	}, [landmarks, scaleMmPerPixel]);

	const activeLm = useMemo(() => {
		return activeTargetKey ? CEPHALOMETRIC_LANDMARKS.find((l) => l.key === activeTargetKey) ?? null : null;
	}, [activeTargetKey]);

	const isAllPlaced = analysis.placedCount === CEPHALOMETRIC_LANDMARKS.length;

	// Landmark Placement Handlers
	const handleLandmarkChange = useCallback((key: LandmarkKey, point: Point2D) => {
		setLandmarks((prev) => ({
			...prev,
			[key]: point,
		}));
		void SoundFeedbackService.getInstance().playActionSuccess();

		// Auto advance to next unplaced landmark (searching ahead, then wrapping around)
		const currentIndex = CEPHALOMETRIC_LANDMARKS.findIndex((l) => l.key === key);
		if (currentIndex !== -1) {
			const count = CEPHALOMETRIC_LANDMARKS.length;
			const nextUnplaced = Array.from({ length: count }, (_, offset) => {
				const idx = (currentIndex + 1 + offset) % count;
				return CEPHALOMETRIC_LANDMARKS[idx]!;
			}).find((l) => l.key !== key && !landmarks[l.key]);

			if (nextUnplaced) {
				setActiveTargetKey(nextUnplaced.key);
			} else {
				setActiveTargetKey(null);
			}
		}
	}, [landmarks]);

	const handleRemoveLandmark = useCallback((key: LandmarkKey) => {
		setLandmarks((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
	}, []);

	// Listen to Voice Engine for Landmark selection
	useEffect(() => {
		if (!isOpen) return;

		const unsub = globalDentalVoiceEngine.addListener({
			onListeningChange: (isL) => {
				setIsVoiceListening(isL);
				if (!isL) setVoiceInterimText("");
			},
			onTranscriptChange: (interim, final) => {
				setVoiceInterimText(interim || final || "");
			},
			onIntentParsed: (intent) => {
				if (intent.cephLandmarks && intent.cephLandmarks.length > 0) {
					const firstL = intent.cephLandmarks[0];
					if (firstL) {
						const matchedDef = CEPHALOMETRIC_LANDMARKS.find(
							(l) => l.key.toLowerCase() === firstL.landmarkKey.toLowerCase(),
						);
						if (matchedDef) {
							if (firstL.action === "clear") {
								handleRemoveLandmark(matchedDef.key);
								showToast(`Голос: Сброшена ${matchedDef.nameRu}`, "info");
							} else {
								setActiveTargetKey(matchedDef.key);
								void SoundFeedbackService.getInstance().playActionSuccess();
								showToast(`Голос: Выбран ориентир ${matchedDef.nameRu}`, "success");
							}
						}
					}
				}
			},
		});

		return () => unsub();
	}, [isOpen, handleRemoveLandmark]);

	// 1-Click Clinical Presets Handler (Mandates 8e, 8k: Friction Eradication & 1-Click Normalcy)
	const handleApplyPreset = useCallback((preset: LandmarkMap, label: string) => {
		if (!imageUrl) {
			setImageUrl(SAMPLE_TRG_CEPHALOGRAM_URL);
		}
		setLandmarks(preset);
		setActiveTargetKey(null);
		showToast(`Применен пресет: ${label}`, "success");
		void SoundFeedbackService.getInstance().playActionSuccess();
	}, [imageUrl]);

	const handleResetLandmarks = useCallback(() => {
		setLandmarks({});
		setActiveTargetKey(null);
		showToast("Разметка ориентиров сброшена", "info");
	}, []);

	const handleLoadPreset = () => {
		setImageUrl(SAMPLE_TRG_CEPHALOGRAM_URL);
		setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
		setActiveTargetKey(null);
		showToast("Загружена эталонная анатомическая разметка ТРГ со снимком", "success");
	};

	// File Upload Handler for Custom Ceph X-ray
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			showToast("Пожалуйста, выберите файл изображения (JPG, PNG, WebP)", "error");
			return;
		}
		const reader = new FileReader();
		reader.onload = (ev) => {
			if (typeof ev.target?.result === "string") {
				setImageUrl(ev.target.result);
				if (Object.keys(landmarks).length === 0) {
					setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
				}
				showToast(`Снимок ТРГ "${file.name}" успешно загружен`, "success");
			}
		};
		reader.readAsDataURL(file);
	};

	// Form 043-1/u Consultation Synthesis without full Ceph requirement
	const generateConsultationNoteWithoutCeph = useCallback(() => {
		const dateStr = new Date().toLocaleDateString("ru-RU");
		const imageStatus = isImageLoaded
			? "Боковая ТРГ загружена в систему, прикреплена к электронной медицинской карте."
			: "Направлен на выполнение боковой ТРГ черепа (телерентгенографии).";

		const landmarkStatus =
			analysis.placedCount > 0
				? `Установлено анатомических ориентиров: ${analysis.placedCount} из ${analysis.totalCount}. `
				: "Ориентиры не расставлены (предварительный клинический осмотр). ";

		return `ПЕРВИЧНАЯ ОРТОДОНТИЧЕСКАЯ КОНСУЛЬТАЦИЯ
Дата приёма: ${dateStr}
Пациент: ${patientName || "Пациент"}

1. КЛИНИЧЕСКИЙ ОСМОТР И АНАМНЕЗ:
• Жалобы: нарушение эстетики улыбки, скученность зубных рядов, затрудненное пережёвывание пищи.
• Внешний осмотр: симметрия лица сохранена, носогубные складки умеренно выражены. Смыкание губ без выраженного напряжения.
• Визуальная оценка профиля: гармоничный / умеренно выпуклый профиль.
• Осмотр полости рта: слизистая оболочка бледно-розовая, умеренно увлажнена. Прикрепление уздечек губ и языка в пределах нормы.

2. ДИАГНОСТИЧЕСКИЙ СТАТУС (ТРГ / ТЕЛЕРЕНТГЕНОГРАФИЯ):
• ${imageStatus}
• ${landmarkStatus}Полный угловой цефалометрический расчет Штайнера/Твида/Риккетса отложен на этап детального цифрового моделирования (Setup) и не блокирует текущую консультацию.

3. ПРЕДВАРИТЕЛЬНЫЙ ДИАГНОЗ ПО МКБ-10:
• K07.2 Аномалии соотношений зубных дуг.
• K07.3 Аномалии положения зубов (скученное положение резцов).

4. ПЛАН ВЕДЕНИЯ И НАЗНАЧЕНИЯ:
• Фотометрический протокол лица и зубных рядов (8 стандартных проекций).
• Снятие диагностических оттисков / интраоральное 3D-сканирование для виртуального сетапа.
• Профессиональная гигиена полости рта и санация очагов кариеса перед фиксацией ортодонтической аппаратуры.
• Повторный приём: обсуждение 3D-плана перемещения зубов и выбор аппаратуры (брекеты / элайнеры).`;
	}, [isImageLoaded, analysis.placedCount, analysis.totalCount, patientName]);

	// Effective protocol text for Form 043/u
	const currentEffectiveProtocolText = useMemo(() => {
		if (analysis.placedCount >= 10) {
			return analysis.diagnosis.protocol043Text;
		}
		return generateConsultationNoteWithoutCeph();
	}, [analysis.placedCount, analysis.diagnosis.protocol043Text, generateConsultationNoteWithoutCeph]);

	// Insert into Form 043/y Callback
	const handleInsertToChart = () => {
		if (onInsertToProtocol) {
			onInsertToProtocol(currentEffectiveProtocolText);
		}
		// Direct populate visit store if active
		try {
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				setVisitNoteForm((prev) => ({
					...prev,
					complaint: prev.complaint
						? `${prev.complaint}\n\n[Ортодонтия] Ортодонтический прием (ТРГ)`
						: "Ортодонтический приём. Жалобы на скученность зубов и прикус.",
					objectiveStatus: prev.objectiveStatus
						? `${prev.objectiveStatus}\n\n${currentEffectiveProtocolText}`
						: currentEffectiveProtocolText,
					treatmentPlan: prev.treatmentPlan
						? `${prev.treatmentPlan}\n\n[Ортодонтия] Диагностический протокол ТРГ сохранен.`
						: "Ортодонтическое лечение: протокол ТРГ сохранен, согласование аппаратуры.",
				}));
			}
		} catch {
			// ignore
		}

		// Dispatch event
		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							protocolText: currentEffectiveProtocolText,
							title: "Протокол ТРГ (Медицинская карта)",
							soap: {
								treatmentDescription: currentEffectiveProtocolText,
							},
							mode: "smart_append",
						},
					}),
				);
			} catch {
				// ignore
			}
		}

		showToast("Протокол ТРГ успешно вставлен в медицинскую карту!", "success");
		onClose();
	};

	// Save Consultation without full Ceph calculations (Zero doctor blocking)
	const handleSaveConsultationWithoutCeph = useCallback(() => {
		const consultationText = generateConsultationNoteWithoutCeph();

		// 1. Trigger parent protocol callback if provided
		if (onInsertToProtocol) {
			onInsertToProtocol(consultationText);
		}

		// 2. Direct populate visit store if active
		try {
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				setVisitNoteForm((prev) => ({
					...prev,
					complaint: prev.complaint
						? `${prev.complaint}\n\n[Ортодонтия] Первичная консультация ортодонта`
						: "Консультация врача-ортодонта. Жалобы на скученность зубов и нарушение прикуса.",
					objectiveStatus: prev.objectiveStatus
						? `${prev.objectiveStatus}\n\n${consultationText}`
						: consultationText,
					treatmentPlan: prev.treatmentPlan
						? `${prev.treatmentPlan}\n\n[Ортодонтия] Направлен на диагностический сетап, санацию и профгигиену.`
						: "Ортодонтическое лечение: диагностический сетап, санация, согласование брекетов/элайнеров.",
				}));
			}
		} catch {
			// ignore
		}

		// 3. Dispatch global SOAP event for reactive note updating
		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							protocolText: consultationText,
							title: "Ортодонтическая консультация (без полного ТРГ-расчета)",
							soap: {
								treatmentDescription: consultationText,
							},
							mode: "smart_append",
						},
					}),
				);
			} catch {
				// ignore
			}
		}

		// 4. Copy to clipboard silently
		if (navigator?.clipboard?.writeText) {
			navigator.clipboard.writeText(consultationText).catch(() => {});
		}

		showToast("Консультация сохранена в карту (без полного ТРГ-расчета)", "success");
		onClose();
	}, [generateConsultationNoteWithoutCeph, onInsertToProtocol, onClose]);

	// Copy Protocol Text
	const handleCopyText = async () => {
		try {
			await navigator.clipboard.writeText(currentEffectiveProtocolText);
			setCopied(true);
			showToast("Протокол скопирован в буфер обмена", "success");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			showToast("Не удалось скопировать текст", "error");
		}
	};

	if (!isOpen) return null;

	const placedPercent = Math.round((analysis.placedCount / analysis.totalCount) * 100);

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden"
			role="dialog"
			aria-modal="true"
			aria-label="Ортодонтический цефалометрический анализ ТРГ"
			data-testid="cephalometric-analysis-modal"
		>
			<div
				className="relative w-full max-w-7xl max-h-[96vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
				style={{ backgroundColor: "var(--paper, #020617)", color: "var(--ink, #f8fafc)", borderColor: "var(--line, #1e293b)" }}
			>
				{/* ── Modal Header ────────────────────────────────────────────── */}
				<header
					className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-slate-800 bg-slate-900/95 shrink-0"
					style={{ backgroundColor: "var(--paper-panel, #0f172a)", borderColor: "var(--line, #1e293b)" }}
				>
					<div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
						<div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-teal-950/80 border border-teal-500/50 flex items-center justify-center text-teal-400 shadow-sm shrink-0">
							<Activity size={22} className="sm:w-6 sm:h-6" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
								<h2
									className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white m-0 truncate"
									style={{ color: "var(--ink, #ffffff)", margin: 0 }}
								>
									Цефалометрический анализ ТРГ (Телерентгенография)
								</h2>
								<span className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold bg-teal-950/80 text-teal-300 border border-teal-500/40 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg shrink-0">
									Steiner / Tweed / Downs / Ricketts / McNamara
								</span>
								<span className="text-xs text-teal-400 font-semibold hidden md:inline">
									· Цефалометрический трекер ТРГ
								</span>
							</div>
							<p
								className="text-xs sm:text-sm text-slate-400 m-0 mt-0.5 truncate"
								style={{ color: "var(--muted, #94a3b8)", margin: 0 }}
							>
								{patientName ? `Пациент: ${patientName}` : "Ортодонтический модуль"} {patientId ? `• ID: ${patientId}` : ""} · Медицинская карта
							</p>
						</div>
					</div>

					{/* ── Верхняя панель управления: Клинические пресеты ТРГ в 1 клик (Мандаты 8e, 8k) ── */}
					<div
						className="hidden md:flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800 shrink-0 mr-1"
						data-testid="header-ceph-presets-bar"
						style={{ backgroundColor: "var(--paper, #020617)", borderColor: "var(--line, #1e293b)" }}
					>
						<span className="text-[11px] font-bold text-slate-400 px-1.5 whitespace-nowrap">
							Пресеты:
						</span>
						<button
							type="button"
							onClick={() => handleApplyPreset(CLASS_I_NORMAL_LANDMARKS_PRESET, "★ I Класс (Норма)")}
							data-testid="header-preset-class-1"
							className="h-8 px-2.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-xs"
							title="★ I Класс (Норма) — выставляет все 16 ориентиров по анатомической норме I класса"
						>
							<Sparkles size={13} className="text-emerald-400 shrink-0" />
							<span>★ I Класс (Норма)</span>
						</button>
						<button
							type="button"
							onClick={() => handleApplyPreset(CLASS_II_DISTAL_LANDMARKS_PRESET, "II Класс (Дистальный)")}
							data-testid="header-preset-class-2"
							className="h-8 px-2.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/50 text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-xs"
							title="II Класс (Дистальный) — выставляет ориентиры дистального прикуса"
						>
							<span>II Класс (Дистальный)</span>
						</button>
						<button
							type="button"
							onClick={() => handleApplyPreset(CLASS_III_MESIAL_LANDMARKS_PRESET, "III Класс (Мезиальный)")}
							data-testid="header-preset-class-3"
							className="h-8 px-2.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-xs"
							title="III Класс (Мезиальный) — выставляет ориентиры мезиального прикуса"
						>
							<span>III Класс (Мезиальный)</span>
						</button>
						<button
							type="button"
							onClick={handleResetLandmarks}
							data-testid="header-preset-clear"
							className="h-8 px-2 rounded-lg bg-slate-800 hover:bg-rose-950/70 hover:border-rose-600/60 text-slate-300 hover:text-rose-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1"
							title="Очистить разметку ориентиров для ручной укладки"
						>
							<Trash2 size={12} className="text-slate-400 shrink-0" />
							<span>Очистить разметку</span>
						</button>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{isVoiceListening && (
							<div
								className="ceph-voice-bar hidden md:inline-flex"
								title="Идет голосовая диктовка ориентиров"
							>
								<Mic size={14} className="animate-pulse text-teal-400" />
								<span className="max-w-[180px] truncate">
									{voiceInterimText || "Слушаю («точка Назион», «точка А»)..."}
								</span>
							</div>
						)}

						<button
							type="button"
							onClick={async () => {
								if (isVoiceListening) {
									globalDentalVoiceEngine.stop();
								} else {
									const started = await globalDentalVoiceEngine.start();
									if (!started) {
										showToast("Не удалось запустить микрофон", "warning");
									}
								}
							}}
							className={`min-h-[44px] px-3 sm:px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
								isVoiceListening
									? "bg-teal-600/30 border-teal-500 text-teal-200 animate-pulse"
									: "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white"
							}`}
							title="Голосовая диктовка ориентиров цефалометрии"
							data-testid="ceph-voice-toggle-btn"
						>
							{isVoiceListening ? <MicOff size={16} /> : <Mic size={16} />}
							<span className="hidden sm:inline">
								{isVoiceListening ? "Стоп голос" : "Голос"}
							</span>
						</button>

						<button
							type="button"
							onClick={handleInsertToChart}
							data-testid="btn-insert-ceph-protocol"
							className="min-h-[44px] px-3 sm:px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border border-teal-400/50"
							title="Перенести расчеты цефалометрии в дневник приёма"
						>
							<FileText size={16} />
							<span>В карту</span>
						</button>

						<button
							type="button"
							onClick={handleSaveConsultationWithoutCeph}
							data-testid="save-consultation-without-ceph-btn"
							className="min-h-[44px] px-3 sm:px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border border-amber-500/50"
							title="Сохранить консультацию ортодонта в карту без полного расчерчивания ТРГ"
						>
							<Save size={16} />
							<span className="hidden sm:inline">Сохранить консультацию без ТРГ</span>
							<span className="sm:hidden">Без ТРГ</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							data-testid="ceph-modal-close-btn"
							aria-label="Закрыть окно цефалометрического анализа"
							className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
							style={{ backgroundColor: "var(--paper-subtle, #1e293b)", color: "var(--ink, #f8fafc)", borderColor: "var(--line, #334155)" }}
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* ── Mobile Viewport Tab Switcher (< lg / 390px) ─────────────── */}
				<div className="lg:hidden flex items-center gap-1 bg-slate-900 border-b border-slate-800 p-1.5 shrink-0 overflow-x-auto flex-nowrap whitespace-nowrap scrollbar-none">
					<button
						type="button"
						onClick={() => setMobileView("canvas")}
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
							mobileView === "canvas"
								? "bg-teal-600 text-white shadow-md font-extrabold"
								: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
						}`}
						data-testid="ceph-mobile-tab-canvas"
					>
						<Layers size={14} />
						<span>Снимок / Разметка</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setMobileView("landmarks");
							setActiveTab("landmarks");
						}}
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
							mobileView === "landmarks"
								? "bg-teal-600 text-white shadow-md font-extrabold"
								: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
						}`}
						data-testid="ceph-mobile-tab-landmarks"
					>
						<span>16 ориентиров (Точки: {isImageLoaded ? analysis.placedCount : 0}/16)</span>
					</button>

					<button
						type="button"
						onClick={() => {
							if (!isImageLoaded) {
								showToast("Сначала загрузите снимок ТРГ", "warning");
								return;
							}
							setMobileView("metrics");
							setActiveTab("metrics");
						}}
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
							mobileView === "metrics"
								? "bg-teal-600 text-white shadow-md font-extrabold"
								: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
						} ${!isImageLoaded ? "opacity-60 cursor-not-allowed" : ""}`}
						data-testid="ceph-mobile-tab-metrics"
					>
						<span>Расчет углов (Анализ)</span>
						{isImageLoaded && analysis.isComplete && (
							<CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
						)}
					</button>

					<button
						type="button"
						onClick={() => {
							setMobileView("report");
							setActiveTab("report");
						}}
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
							mobileView === "report"
								? "bg-teal-600 text-white shadow-md font-extrabold"
								: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
						}`}
						data-testid="ceph-mobile-tab-report"
					>
						<FileText size={14} />
						<span>Медицинская карта</span>
					</button>
				</div>

				{/* ── Main Content Body ───────────────────────────────────────── */}
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto lg:overflow-hidden min-h-0">
					{/* ── Left Column: Lateral Cephalogram Viewer & Unified 36px HUD Strip (7 Cols) ── */}
					<div
						className={`lg:col-span-7 flex-col p-2.5 sm:p-3 bg-slate-950 border-r border-slate-800 shrink-0 lg:overflow-hidden ${
							mobileView === "canvas" ? "flex flex-1 min-h-[360px]" : "hidden lg:flex"
						}`}
						style={{ backgroundColor: "var(--paper, #020617)", color: "var(--ink, #f8fafc)" }}
					>
						{/* X-ray Canvas Component with Unified 36px HUD Strip & Maximum Vertical Screen Utilization */}
						<div className="flex-1 min-h-[340px] sm:min-h-[440px] lg:min-h-[620px] flex items-center justify-center relative overflow-hidden">
							<CephalometricCanvas
								landmarks={landmarks}
								onLandmarkChange={handleLandmarkChange}
								onRemoveLandmark={handleRemoveLandmark}
								activeTargetKey={activeTargetKey}
								onSelectTargetKey={setActiveTargetKey}
								imageUrl={imageUrl}
								onImageUpload={(url) => {
									setImageUrl(url);
									if (Object.keys(landmarks).length === 0) {
										setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
									}
									showToast("Снимок ТРГ успешно загружен", "success");
								}}
								filterMode={filterMode}
								onFilterModeChange={setFilterMode}
								brightness={brightness}
								contrast={contrast}
								showPolygon={showPolygon}
								onTogglePolygon={() => setShowPolygon((prev) => !prev)}
								showPlanes={showPlanes}
								onTogglePlanes={() => setShowPlanes((prev) => !prev)}
								showLabels={showLabels}
								onToggleLabels={() => setShowLabels((prev) => !prev)}
								scaleMmPerPixel={scaleMmPerPixel}
								onScaleChange={setScaleMmPerPixel}
								onLoadPreset={handleLoadPreset}
								onResetLandmarks={handleResetLandmarks}
							/>
						</div>

						{/* Mobile Accordion: Таблица расчетов углов и 16 анатомических точек ТРГ под снимком */}
						<details className="lg:hidden mt-2.5 rounded-xl border border-slate-700 bg-slate-900/90 text-slate-100 overflow-hidden group shrink-0">
							<summary className="px-3.5 py-2.5 bg-slate-800/90 font-bold text-xs flex items-center justify-between cursor-pointer select-none text-slate-200 hover:text-white transition-colors">
								<div className="flex items-center gap-2">
									<Activity size={14} className="text-teal-400" />
									<span>Таблица расчетов углов (Steiner, Tweed, Downs, McNamara) & 16 точек</span>
								</div>
								<span className="text-[11px] font-mono font-bold text-teal-400 group-open:rotate-180 transition-transform duration-200">
									▼
								</span>
							</summary>
							<div className="p-3 space-y-3 max-h-[320px] overflow-y-auto">
								{/* Summary Diagnosis */}
								<div className="p-2.5 rounded-lg bg-teal-950/40 border border-teal-500/30 text-xs">
									<div className="font-bold text-teal-300">{analysis.diagnosis.skeletalClassRu}</div>
									<div className="text-[11px] text-slate-300 mt-0.5">{analysis.diagnosis.summaryRu}</div>
								</div>

								{/* Angles Table */}
								<div className="space-y-1.5">
									<div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
										Основные углы и параметры
									</div>
									<div className="grid grid-cols-1 gap-1.5">
										{analysis.measurements.map((m) => {
											const isValValid = m.value !== null && Number.isFinite(m.value);
											const missingKeys = getRequiredLandmarksForMeasurement(m.id).filter((k) => !landmarks[k]);
											return (
												<div
													key={m.id}
													className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
												>
													<div className="min-w-0 pr-2">
														<div className="font-bold text-white truncate">{m.name}</div>
														<div className="text-[10px] text-slate-400 truncate">
															{m.clinicalInterpretation} · Норма: {m.normText}
														</div>
													</div>
													<div className="text-right shrink-0 flex items-center gap-1.5">
														<span className="font-mono font-black text-xs text-white">
															{isValValid ? `${m.value}${m.unit}` : "—"}
														</span>
														<span
															className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
																isValValid
																	? m.status === "normal"
																		? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
																		: m.status === "increased"
																			? "bg-rose-950 text-rose-300 border border-rose-500/40"
																			: m.status === "decreased"
																				? "bg-sky-950 text-sky-300 border border-sky-500/40"
																				: "bg-slate-800 text-slate-400"
																	: "bg-slate-800 text-amber-300 border border-amber-500/30"
															}`}
														>
															{isValValid
																? m.status === "normal"
																	? "Норма"
																	: m.status === "increased"
																		? "Увелич."
																		: m.status === "decreased"
																			? "Уменьш."
																			: "—"
																: missingKeys.length > 0
																	? `Ждёт: ${missingKeys.join(",")}`
																	: "—"}
														</span>
													</div>
												</div>
											);
										})}
									</div>
								</div>

								{/* 16 Landmarks Quick List */}
								<div className="space-y-1.5 pt-1 border-t border-slate-800">
									<div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
										<span>16 анатомических ориентиров</span>
										<span className="text-teal-400 font-mono font-black">
											{analysis.placedCount}/16
										</span>
									</div>
									<div className="grid grid-cols-2 gap-1">
										{CEPHALOMETRIC_LANDMARKS.map((lm) => {
											const isPlaced = landmarks[lm.key] !== undefined;
											const isTarget = activeTargetKey === lm.key;
											return (
												<button
													key={lm.key}
													type="button"
													onClick={() => {
														setActiveTargetKey(lm.key);
														showToast(`Укажите точку «${lm.nameRu}» на снимке`, "info");
													}}
													className={`p-1.5 rounded-lg border text-left flex items-center gap-1.5 transition-all text-[11px] min-h-[36px] ${
														isTarget
															? "bg-teal-900/50 border-teal-400 text-teal-200 ring-1 ring-teal-400"
															: isPlaced
																? "bg-slate-800/80 border-slate-700 text-slate-200"
																: "bg-slate-900/40 border-dashed border-slate-700 text-slate-400"
													}`}
												>
													<span
														className="w-5 h-5 rounded flex items-center justify-center font-black text-[10px] shrink-0 text-white"
														style={{ backgroundColor: lm.color }}
													>
														{lm.code}
													</span>
													<span className="truncate flex-1 font-semibold">{lm.nameRu}</span>
													{isPlaced && <Check size={11} className="text-emerald-400 shrink-0" />}
												</button>
											);
										})}
									</div>
								</div>
							</div>
						</details>
					</div>

					{/* ── Right Column: Interactive Sidebar (Landmarks, Measurements & Form 043/y) (5 Cols) ── */}
					<div
						className={`lg:col-span-5 flex-col bg-slate-950 border-l border-slate-800 text-slate-100 overflow-hidden ${
							mobileView !== "canvas" ? "flex flex-1" : "hidden lg:flex"
						}`}
						style={{ backgroundColor: "var(--paper, #020617)", color: "var(--ink, #f8fafc)" }}
					>
						{/* Tab Navigation with Symmetric 3-Column Grid (Zero Truncation) */}
						<div className="grid grid-cols-3 border-b border-slate-800 bg-slate-900 px-2 pt-1.5 shrink-0 gap-1 w-full">
							<button
								type="button"
								onClick={() => {
									setActiveTab("landmarks");
									setMobileView("landmarks");
								}}
								className={`min-h-[44px] sm:min-h-0 sm:h-9 px-1 sm:px-2 py-1 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${
									activeTab === "landmarks"
										? "border-teal-400 text-teal-300 bg-slate-800 rounded-t-lg shadow-xs"
										: "border-transparent text-slate-400 hover:text-slate-100 bg-transparent"
								}`}
								title="Ориентиры ТРГ"
							>
								<span className="hidden sm:inline whitespace-nowrap">1. Ориентиры (Точки: {isImageLoaded ? analysis.placedCount : 0})</span>
								<span className="sm:hidden whitespace-nowrap">1. Точки ({isImageLoaded ? analysis.placedCount : 0})</span>
							</button>

							<button
								type="button"
								onClick={() => {
									if (isImageLoaded) {
										setActiveTab("metrics");
										setMobileView("metrics");
									} else {
										showToast("Сначала загрузите снимок ТРГ", "warning");
									}
								}}
								className={`min-h-[44px] sm:min-h-0 sm:h-9 px-1 sm:px-2 py-1 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${
									activeTab === "metrics"
										? "border-teal-400 text-teal-300 bg-slate-800 rounded-t-lg shadow-xs"
										: "border-transparent text-slate-400 hover:text-slate-100 bg-transparent"
								} ${!isImageLoaded ? "opacity-60 cursor-not-allowed" : ""}`}
								title="Расчет углов (Steiner, Tweed, Downs, McNamara)"
							>
								<span className="hidden sm:inline whitespace-nowrap">2. Расчет углов (Анализ)</span>
								<span className="sm:hidden whitespace-nowrap">2. Анализ</span>
								{isImageLoaded && analysis.isComplete && (
									<CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
								)}
							</button>

							<button
								type="button"
								onClick={() => {
									setActiveTab("report");
									setMobileView("report");
								}}
								className={`min-h-[44px] sm:min-h-0 sm:h-9 px-1 sm:px-2 py-1 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${
									activeTab === "report"
										? "border-teal-400 text-teal-300 bg-slate-800 rounded-t-lg shadow-xs"
										: "border-transparent text-slate-400 hover:text-slate-100 bg-transparent"
								}`}
								title="Ортодонтический протокол ТРГ для карты"
							>
								<FileText size={14} className="shrink-0" />
								<span className="hidden sm:inline whitespace-nowrap">3. Медицинская карта</span>
								<span className="sm:hidden whitespace-nowrap">3. Карта</span>
							</button>
						</div>

						{/* Tab 1: Landmarks List & Placement Guidance (All Landmarks with >= 44x44px Touch Targets) */}
						{activeTab === "landmarks" && (
							<div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden">
								{/* ── Тулбар клинических пресетов вкладки «1. Ориентиры» (Мандаты 8e, 8k) ── */}
								<div
									className="mb-3.5 p-3 rounded-xl bg-slate-900/95 border border-slate-800 shrink-0 flex flex-col gap-2"
									style={{ backgroundColor: "var(--paper-panel, #0f172a)", borderColor: "var(--line, #1e293b)" }}
									data-testid="tab1-ceph-presets-toolbar"
								>
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-1.5 min-w-0">
											<Sparkles size={14} className="text-teal-400 shrink-0" />
											<span className="text-xs font-black uppercase tracking-wider text-teal-300 truncate">
												Клинические пресеты (1 клик):
											</span>
										</div>
										<span className="text-[11px] text-slate-400 shrink-0 hidden sm:inline">
											Норма и патология
										</span>
									</div>

									<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
										<button
											type="button"
											onClick={() => handleApplyPreset(CLASS_I_NORMAL_LANDMARKS_PRESET, "★ I Класс (Норма)")}
											data-testid="tab1-preset-class-1"
											className="min-h-[40px] px-2 py-1.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 text-xs font-black transition-all text-center cursor-pointer flex items-center justify-center gap-1 shadow-xs"
											title="★ I Класс (Норма) — выставляет все 16 ориентиров по анатомической норме I класса"
										>
											<Sparkles size={13} className="text-emerald-400 shrink-0" />
											<span className="truncate">★ I Класс (Норма)</span>
										</button>

										<button
											type="button"
											onClick={() => handleApplyPreset(CLASS_II_DISTAL_LANDMARKS_PRESET, "II Класс (Дистальный)")}
											data-testid="tab1-preset-class-2"
											className="min-h-[40px] px-2 py-1.5 rounded-xl bg-amber-950/90 hover:bg-amber-900 text-amber-300 border border-amber-500/50 text-xs font-black transition-all text-center cursor-pointer flex items-center justify-center gap-1 shadow-xs"
											title="II Класс (Дистальный) — выставляет ориентиры дистального прикуса"
										>
											<span className="truncate">II Класс (Дистальный)</span>
										</button>

										<button
											type="button"
											onClick={() => handleApplyPreset(CLASS_III_MESIAL_LANDMARKS_PRESET, "III Класс (Мезиальный)")}
											data-testid="tab1-preset-class-3"
											className="min-h-[40px] px-2 py-1.5 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 text-xs font-black transition-all text-center cursor-pointer flex items-center justify-center gap-1 shadow-xs"
											title="III Класс (Мезиальный) — выставляет ориентиры мезиального прикуса"
										>
											<span className="truncate">III Класс (Мезиальный)</span>
										</button>

										<button
											type="button"
											onClick={handleResetLandmarks}
											data-testid="tab1-preset-clear"
											className="min-h-[40px] px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/70 hover:border-rose-600/60 text-slate-300 hover:text-rose-200 border border-slate-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1"
											title="Очистить разметку ориентиров для ручной укладки"
										>
											<Trash2 size={13} className="shrink-0 text-slate-400" />
											<span className="truncate">Очистить разметку</span>
										</button>
									</div>
								</div>

								{/* Progress Bar */}
								<div className="mb-3.5 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 shrink-0" style={{ backgroundColor: "var(--paper-panel, #0f172a)", borderColor: "var(--line, #334155)" }}>
									<div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5">
										<span className="text-slate-200" style={{ color: "var(--ink, #f8fafc)" }}>
											Прогресс разметки ТРГ
										</span>
										<span className="text-teal-400 font-extrabold">{placedPercent}%</span>
									</div>
									<div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
										<div
											className="h-full bg-teal-500 rounded-full transition-all duration-300"
											style={{ width: `${placedPercent}%` }}
										/>
									</div>
									<p className="text-xs text-slate-400 m-0 mt-2 min-w-0 break-words">
										{isImageLoaded
											? "Кликните ориентир ниже, затем укажите его положение на снимке ТРГ слева."
											: "Загрузите боковую ТРГ пациента или выберите эталонный снимок для начала анализа."}
									</p>
								</div>

								{/* Active Landmark Guidance Banner for Orthodontist */}
								{isImageLoaded && activeLm && !isAllPlaced && (
									<div
										data-testid="banner-active-landmark-guidance"
										className="mb-3 p-3 rounded-xl border border-teal-500/50 bg-teal-950/40 shadow-sm space-y-1.5 shrink-0"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2 min-w-0">
												<span
													className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm"
													style={{ backgroundColor: activeLm.color }}
												>
													{activeLm.code}
												</span>
												<span className="text-xs font-black text-teal-300 uppercase tracking-wide truncate">
													Цель: {activeLm.nameRu} ({activeLm.latinName})
												</span>
											</div>
											<button
												type="button"
												data-testid="btn-skip-next-landmark"
												onClick={() => {
													const count = CEPHALOMETRIC_LANDMARKS.length;
													const curIdx = CEPHALOMETRIC_LANDMARKS.findIndex((l) => l.key === activeLm.key);
													const next = Array.from({ length: count }, (_, offset) => {
														const idx = (curIdx + 1 + offset) % count;
														return CEPHALOMETRIC_LANDMARKS[idx]!;
													}).find((l) => l.key !== activeLm.key && !landmarks[l.key]);
													if (next) {
														setActiveTargetKey(next.key);
													}
												}}
												className="text-[11px] font-bold text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
												title="Перейти к следующему незаданному ориентиру"
											>
												След. точка →
											</button>
										</div>
										<p className="text-xs text-slate-200 leading-snug m-0">
											<span className="font-semibold text-teal-400">Анатомия: </span>
											{LANDMARK_CLINICAL_ROLES[activeLm.key]?.clinicalTip || activeLm.anatomicalDescription}
										</p>
										<p className="text-[11px] text-slate-400 leading-tight m-0">
											<span className="font-medium text-slate-300">Влияет на: </span>
											{LANDMARK_CLINICAL_ROLES[activeLm.key]?.depends || "Углы и плоскости черепа"}
										</p>
									</div>
								)}

								{isImageLoaded && isAllPlaced && (
									<div
										data-testid="banner-all-landmarks-placed"
										className="mb-3 p-3 rounded-xl border border-emerald-500/50 bg-emerald-950/40 text-xs text-emerald-200 flex items-center justify-between gap-2 shrink-0"
									>
										<div className="flex items-center gap-2">
											<Check size={16} className="text-emerald-400 shrink-0" />
											<span className="font-bold">Все 16 анатомических ориентиров расставлены!</span>
										</div>
										<button
											type="button"
											onClick={() => {
												setActiveTab("metrics");
												setMobileView("metrics");
											}}
											className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors shrink-0 cursor-pointer"
										>
											Смотреть углы →
										</button>
									</div>
								)}

								{/* Landmark Item Cards with Touch Targets >= 44x44px (min-h-[52px]) */}
								<div className="space-y-2 flex-1 overflow-y-auto pr-1 pb-4">
									{CEPHALOMETRIC_LANDMARKS.map((lm) => {
										const isPlaced = isImageLoaded && landmarks[lm.key] !== undefined;
										const isTarget = isImageLoaded && activeTargetKey === lm.key;

										return (
											<button
												key={lm.key}
												type="button"
												onClick={() => {
													if (!isImageLoaded) {
														showToast("Сначала загрузите снимок ТРГ", "warning");
														return;
													}
													setActiveTargetKey(lm.key);
													setMobileView("canvas");
													showToast(`Укажите точку «${lm.nameRu}» на снимке`, "info");
												}}
												className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[52px] ${
													isTarget
														? "bg-teal-950/80 border-teal-400 shadow-md ring-1 ring-teal-500/40"
														: isPlaced
															? "bg-slate-900/90 border-slate-700 hover:border-teal-400"
															: "bg-slate-900/90 border-slate-700 opacity-90 hover:opacity-100"
												}`}
												style={{
													backgroundColor: isTarget ? "rgba(4, 47, 46, 0.9)" : "var(--paper-panel, #0f172a)",
													borderColor: isTarget ? "var(--teal, #2dd4bf)" : "var(--line, #334155)",
												}}
											>
												<div className="flex items-center gap-3 min-w-0">
													<div
														className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 text-white shadow-sm"
														style={{ backgroundColor: isImageLoaded ? lm.color : "var(--muted, #475569)" }}
													>
														{lm.code}
													</div>
													<div className="min-w-0">
														<div className="text-sm font-bold min-w-0 break-words" style={{ color: "var(--ink, #ffffff)" }}>
															{lm.nameRu}
														</div>
														<div className="text-xs font-medium min-w-0 break-words leading-snug" style={{ color: "var(--muted, #cbd5e1)" }}>
															{lm.anatomicalDescription}
														</div>
													</div>
												</div>

												<div className="shrink-0 flex items-center gap-1.5">
													{isPlaced ? (
														<span className="text-xs font-bold text-teal-300 bg-teal-950/80 px-2.5 py-1 rounded-lg border border-teal-500/40 flex items-center gap-1">
															<Check size={13} /> Задана
														</span>
													) : (
														<span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
															Не задана
														</span>
													)}
												</div>
											</button>
										);
									})}
								</div>

								{/* Bottom Action */}
								<div className="mt-3 pt-3 border-t border-slate-800 shrink-0 flex flex-col gap-2">
									<button
										type="button"
										onClick={handleSaveConsultationWithoutCeph}
										data-testid="tab1-save-consultation-without-ceph-btn"
										className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
										title="Сохранить предварительную консультацию ортодонта в карту без ожидания расстановки всех 16 точек"
									>
										<Save size={16} />
										<span>Сохранить консультацию без полного ТРГ-расчета</span>
									</button>

									<button
										type="button"
										onClick={() => {
											setActiveTab("metrics");
											setMobileView("metrics");
										}}
										className="w-full min-h-[44px] py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all bg-[var(--teal)] hover:opacity-90 text-white cursor-pointer"
										data-testid="tab1-to-metrics-btn"
									>
										<span>Перейти к расчету углов (Steiner, Tweed, Downs, McNamara)</span>
										<ArrowRight size={16} />
									</button>
								</div>
							</div>
						)}

						{/* Tab 2: Cephalometric Measurements Table & Cards (Steiner, Tweed, Downs, Jacobson, Ricketts, McNamara) */}
						{activeTab === "metrics" && (
							<div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto bg-slate-950">
								{/* Quick Clinical Presets for Lab protocols (Mandate 8e) */}
								<div className="mb-3 p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2 shrink-0">
									<div className="text-xs font-bold text-slate-300 flex items-center justify-between">
										<span>Ввод по протоколу лаборатории (1 клик):</span>
										<span className="text-[11px] text-slate-400">Пикассо / Золотое Сечение / КЛКТ</span>
									</div>
									<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
										<button
											type="button"
											onClick={() => handleApplyPreset(CLASS_I_NORMAL_LANDMARKS_PRESET, "★ I Класс (Норма)")}
											className="min-h-[40px] px-2 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1 shadow-xs"
											data-testid="btn-ceph-preset-class-1"
											title="★ I Класс (Норма) — выставляет все 16 ориентиров по анатомической норме I класса"
										>
											<Sparkles size={12} className="text-emerald-400 shrink-0" />
											<span className="truncate">★ I Класс (Норма)</span>
										</button>
										<button
											type="button"
											onClick={() => handleApplyPreset(CLASS_II_DISTAL_LANDMARKS_PRESET, "II Класс (Дистальный)")}
											className="min-h-[40px] px-2 py-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1 shadow-xs"
											data-testid="btn-ceph-preset-class-2"
											title="II Класс (Дистальный) — выставляет ориентиры дистального прикуса"
										>
											<span className="truncate">II Класс (Дистальный)</span>
										</button>
										<button
											type="button"
											onClick={() => handleApplyPreset(CLASS_III_MESIAL_LANDMARKS_PRESET, "III Класс (Мезиальный)")}
											className="min-h-[40px] px-2 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1 shadow-xs"
											data-testid="btn-ceph-preset-class-3"
											title="III Класс (Мезиальный) — выставляет ориентиры мезиального прикуса"
										>
											<span className="truncate">III Класс (Мезиальный)</span>
										</button>
										<button
											type="button"
											onClick={handleResetLandmarks}
											className="min-h-[40px] px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/70 hover:border-rose-600/60 text-slate-300 hover:text-rose-200 border border-slate-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1"
											data-testid="btn-ceph-preset-clear"
											title="Очистить разметку ориентиров для ручной укладки"
										>
											<Trash2 size={12} className="text-slate-400 shrink-0" />
											<span className="truncate">Очистить разметку</span>
										</button>
									</div>
								</div>

								{/* Quick Diagnosis Banner */}
								<div className="mb-4 p-4 rounded-xl bg-teal-950/70 border border-teal-500/40 shadow-sm">
									<div className="text-xs font-black text-teal-400 uppercase tracking-wider">
										Клиническое резюме анализа
									</div>
									<div className="text-base font-black text-white mt-1 min-w-0 break-words">
										{analysis.diagnosis.skeletalClassRu}
									</div>
									<div className="text-sm text-slate-300 mt-1.5 leading-relaxed min-w-0 break-words">
										{analysis.diagnosis.summaryRu}
									</div>
								</div>

								{/* Core Cephalometric Angles Hero Showcase (Steiner Core: SNA, SNB, ANB, 1-NA, 1-NB) */}
								<div className="mb-4 space-y-2">
									<div className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
										<span>Ключевые углы Штайнера (Steiner Core)</span>
										<span className="text-[10px] text-teal-400 font-normal">Мандат 8e / Ортодонтия</span>
									</div>
									<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
										{/* SNA */}
										{(() => {
											const meas = analysis.measurements.find((m) => m.id === "SNA");
											const isValValid = meas?.value !== null && meas?.value !== undefined && Number.isFinite(meas.value);
											const missing = (["S", "N", "A"] as LandmarkKey[]).filter((k) => !landmarks[k]);
											return (
												<div
													data-testid="core-hero-SNA"
													className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col justify-between min-h-[76px]"
												>
													<div className="flex items-center justify-between gap-1">
														<span className="text-[11px] font-bold text-slate-300 truncate">SNA (ВЧ)</span>
														<span className="text-[9px] text-slate-400 font-mono">82° ± 2°</span>
													</div>
													<div className="my-1">
														{isValValid ? (
															<div
																className={`text-lg font-black font-mono leading-none ${
																	meas.status === "normal"
																		? "text-emerald-400"
																		: meas.status === "increased"
																			? "text-rose-400"
																			: meas.status === "decreased"
																				? "text-cyan-400"
																				: "text-white"
																}`}
															>
																{meas.value}{meas.unit}
															</div>
														) : (
															<div className="text-sm font-semibold text-slate-500 leading-none">—</div>
														)}
													</div>
													<div>
														{isValValid ? (
															<span
																className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
																	meas.status === "normal"
																		? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
																		: meas.status === "increased"
																			? "bg-rose-950 text-rose-300 border border-rose-500/40"
																			: meas.status === "decreased"
																				? "bg-cyan-950 text-cyan-300 border border-cyan-500/40"
																				: "bg-slate-800 text-slate-400"
																}`}
															>
																{meas.status === "normal" ? "Норма" : meas.status === "increased" ? "Увеличен" : "Уменьшен"}
															</span>
														) : (
															<span className="text-[9px] font-medium text-amber-400/90 truncate block">
																{missing.length > 0 ? `Ждёт: ${missing.join(",")}` : "Нет данных"}
															</span>
														)}
													</div>
												</div>
											);
										})()}

										{/* SNB */}
										{(() => {
											const meas = analysis.measurements.find((m) => m.id === "SNB");
											const isValValid = meas?.value !== null && meas?.value !== undefined && Number.isFinite(meas.value);
											const missing = (["S", "N", "B"] as LandmarkKey[]).filter((k) => !landmarks[k]);
											return (
												<div
													data-testid="core-hero-SNB"
													className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col justify-between min-h-[76px]"
												>
													<div className="flex items-center justify-between gap-1">
														<span className="text-[11px] font-bold text-slate-300 truncate">SNB (НЧ)</span>
														<span className="text-[9px] text-slate-400 font-mono">80° ± 2°</span>
													</div>
													<div className="my-1">
														{isValValid ? (
															<div
																className={`text-lg font-black font-mono leading-none ${
																	meas.status === "normal"
																		? "text-emerald-400"
																		: meas.status === "increased"
																			? "text-rose-400"
																			: meas.status === "decreased"
																				? "text-cyan-400"
																				: "text-white"
																}`}
															>
																{meas.value}{meas.unit}
															</div>
														) : (
															<div className="text-sm font-semibold text-slate-500 leading-none">—</div>
														)}
													</div>
													<div>
														{isValValid ? (
															<span
																className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
																	meas.status === "normal"
																		? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
																		: meas.status === "increased"
																			? "bg-rose-950 text-rose-300 border border-rose-500/40"
																			: meas.status === "decreased"
																				? "bg-cyan-950 text-cyan-300 border border-cyan-500/40"
																				: "bg-slate-800 text-slate-400"
																}`}
															>
																{meas.status === "normal" ? "Норма" : meas.status === "increased" ? "Увеличен" : "Уменьшен"}
															</span>
														) : (
															<span className="text-[9px] font-medium text-amber-400/90 truncate block">
																{missing.length > 0 ? `Ждёт: ${missing.join(",")}` : "Нет данных"}
															</span>
														)}
													</div>
												</div>
											);
										})()}

										{/* ANB */}
										{(() => {
											const meas = analysis.measurements.find((m) => m.id === "ANB");
											const isValValid = meas?.value !== null && meas?.value !== undefined && Number.isFinite(meas.value);
											const missing = (["S", "N", "A", "B"] as LandmarkKey[]).filter((k) => !landmarks[k]);
											return (
												<div
													data-testid="core-hero-ANB"
													className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col justify-between min-h-[76px]"
												>
													<div className="flex items-center justify-between gap-1">
														<span className="text-[11px] font-bold text-slate-300 truncate">ANB (Класс)</span>
														<span className="text-[9px] text-slate-400 font-mono">2° ± 2°</span>
													</div>
													<div className="my-1">
														{isValValid ? (
															<div
																className={`text-lg font-black font-mono leading-none ${
																	meas.status === "normal"
																		? "text-emerald-400"
																		: meas.status === "increased"
																			? "text-rose-400"
																			: meas.status === "decreased"
																				? "text-cyan-400"
																				: "text-white"
																}`}
															>
																{meas.value}{meas.unit}
															</div>
														) : (
															<div className="text-sm font-semibold text-slate-500 leading-none">—</div>
														)}
													</div>
													<div>
														{isValValid ? (
															<span
																className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
																	meas.status === "normal"
																		? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
																		: meas.status === "increased"
																			? "bg-rose-950 text-rose-300 border border-rose-500/40"
																			: meas.status === "decreased"
																				? "bg-cyan-950 text-cyan-300 border border-cyan-500/40"
																				: "bg-slate-800 text-slate-400"
																}`}
															>
																{meas.status === "normal" ? "Класс I" : meas.status === "increased" ? "Класс II" : "Класс III"}
															</span>
														) : (
															<span className="text-[9px] font-medium text-amber-400/90 truncate block">
																{missing.length > 0 ? `Ждёт: ${missing.join(",")}` : "Нет данных"}
															</span>
														)}
													</div>
												</div>
											);
										})()}

										{/* 1-NA */}
										{(() => {
											const angleMeas = analysis.measurements.find((m) => m.id === "1-NA-Angle");
											const distMeas = analysis.measurements.find((m) => m.id === "1-NA-Dist");
											const isAngleValid = angleMeas?.value !== null && angleMeas?.value !== undefined && Number.isFinite(angleMeas.value);
											const isDistValid = distMeas?.value !== null && distMeas?.value !== undefined && Number.isFinite(distMeas.value);
											const missing = (["N", "A", "U1t", "U1a"] as LandmarkKey[]).filter((k) => !landmarks[k]);
											return (
												<div
													data-testid="core-hero-1-NA"
													className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col justify-between min-h-[76px]"
												>
													<div className="flex items-center justify-between gap-1">
														<span className="text-[11px] font-bold text-slate-300 truncate">1 to NA</span>
														<span className="text-[9px] text-slate-400 font-mono">22°±2° / 4±1</span>
													</div>
													<div className="my-1 flex items-baseline gap-1">
														{isAngleValid ? (
															<span
																className={`text-base font-black font-mono leading-none ${
																	angleMeas.status === "normal"
																		? "text-emerald-400"
																		: angleMeas.status === "increased"
																			? "text-rose-400"
																			: "text-cyan-400"
																}`}
															>
																{angleMeas.value}°
															</span>
														) : (
															<span className="text-sm font-semibold text-slate-500 leading-none">—</span>
														)}
														{isDistValid && (
															<span className="text-[11px] font-bold text-slate-300 font-mono leading-none">
																({distMeas.value}мм)
															</span>
														)}
													</div>
													<div>
														{isAngleValid ? (
															<span
																className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
																	angleMeas.status === "normal"
																		? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
																		: angleMeas.status === "increased"
																			? "bg-rose-950 text-rose-300 border border-rose-500/40"
																			: "bg-cyan-950 text-cyan-300 border border-cyan-500/40"
																}`}
															>
																{angleMeas.status === "normal" ? "Норма" : angleMeas.status === "increased" ? "Протрузия" : "Ретрузия"}
															</span>
														) : (
															<span className="text-[9px] font-medium text-amber-400/90 truncate block">
																{missing.length > 0 ? `Ждёт: ${missing.join(",")}` : "Нет данных"}
															</span>
														)}
													</div>
												</div>
											);
										})()}

										{/* 1-NB */}
										{(() => {
											const angleMeas = analysis.measurements.find((m) => m.id === "1-NB-Angle");
											const distMeas = analysis.measurements.find((m) => m.id === "1-NB-Dist");
											const isAngleValid = angleMeas?.value !== null && angleMeas?.value !== undefined && Number.isFinite(angleMeas.value);
											const isDistValid = distMeas?.value !== null && distMeas?.value !== undefined && Number.isFinite(distMeas.value);
											const missing = (["N", "B", "L1t", "L1a"] as LandmarkKey[]).filter((k) => !landmarks[k]);
											return (
												<div
													data-testid="core-hero-1-NB"
													className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col justify-between min-h-[76px]"
												>
													<div className="flex items-center justify-between gap-1">
														<span className="text-[11px] font-bold text-slate-300 truncate">1 to NB</span>
														<span className="text-[9px] text-slate-400 font-mono">25°±2° / 4±1</span>
													</div>
													<div className="my-1 flex items-baseline gap-1">
														{isAngleValid ? (
															<span
																className={`text-base font-black font-mono leading-none ${
																	angleMeas.status === "normal"
																		? "text-emerald-400"
																		: angleMeas.status === "increased"
																			? "text-rose-400"
																			: "text-cyan-400"
																}`}
															>
																{angleMeas.value}°
															</span>
														) : (
															<span className="text-sm font-semibold text-slate-500 leading-none">—</span>
														)}
														{isDistValid && (
															<span className="text-[11px] font-bold text-slate-300 font-mono leading-none">
																({distMeas.value}мм)
															</span>
														)}
													</div>
													<div>
														{isAngleValid ? (
															<span
																className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
																	angleMeas.status === "normal"
																		? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
																		: angleMeas.status === "increased"
																			? "bg-rose-950 text-rose-300 border border-rose-500/40"
																			: "bg-cyan-950 text-cyan-300 border border-cyan-500/40"
																}`}
															>
																{angleMeas.status === "normal" ? "Норма" : angleMeas.status === "increased" ? "Протрузия" : "Ретрузия"}
															</span>
														) : (
															<span className="text-[9px] font-medium text-amber-400/90 truncate block">
																{missing.length > 0 ? `Ждёт: ${missing.join(",")}` : "Нет данных"}
															</span>
														)}
													</div>
												</div>
											);
										})()}
									</div>
								</div>

								{/* Measurements Grouped by Category */}
								<div className="space-y-4 flex-1 overflow-y-auto pr-1">
									{/* Category 1: Sagittal (Steiner, Downs, Jacobson Wits, McNamara) */}
									<div>
										<div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
											1. Сагиттальные параметры (Steiner, Downs, Jacobson, McNamara)
										</div>
										<div className="space-y-2">
											{analysis.measurements
												.filter((m) => m.category === "sagittal")
												.map((m) => {
													const isValValid = m.value !== null && Number.isFinite(m.value);
													const missingKeys = getRequiredLandmarksForMeasurement(m.id).filter((k) => !landmarks[k]);
													return (
														<div
															key={m.id}
															className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 min-h-[52px]"
														>
															<div className="min-w-0">
																<div className="text-sm font-bold text-white min-w-0 break-words">
																	{m.name}
																</div>
																<div className="text-xs text-slate-400 mt-0.5 min-w-0 break-words">
																	{m.clinicalInterpretation} · Норма: <span className="font-bold text-slate-200">{m.normText}</span>
																</div>
															</div>
															<div className="text-right shrink-0 flex flex-col items-end gap-1">
																<div
																	className={`text-base font-black ${
																		isValValid
																			? m.status === "normal"
																				? "text-emerald-400"
																				: m.status === "increased"
																					? "text-rose-400"
																					: m.status === "decreased"
																						? "text-cyan-400"
																						: "text-slate-400"
																			: "text-slate-500"
																	}`}
																>
																	{isValValid ? `${m.value}${m.unit}` : "—"}
																</div>
																<span
																	className={`text-xs uppercase font-black px-2.5 py-1 rounded-lg border ${
																		isValValid
																			? m.status === "normal"
																				? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
																				: m.status === "increased"
																					? "bg-rose-950 text-rose-300 border-rose-500/40"
																					: m.status === "decreased"
																						? "bg-cyan-950 text-cyan-300 border-cyan-500/40"
																						: "bg-slate-800 text-slate-400 border-slate-700"
																			: "bg-slate-800 text-amber-300 border border-amber-500/30"
																	}`}
																>
																	{isValValid
																		? m.status === "normal"
																			? "Норма"
																			: m.status === "increased"
																				? "Увеличен"
																				: m.status === "decreased"
																					? "Уменьшен"
																					: "Нет данных"
																		: missingKeys.length > 0
																			? `Ожидает: ${missingKeys.join(", ")}`
																			: "Нет данных"}
																</span>
															</div>
														</div>
													);
												})}
										</div>
									</div>

									{/* Category 2: Vertical & Growth Pattern (Tweed, Steiner, Downs, Ricketts) */}
									<div className="pt-2">
										<div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
											2. Вертикальные параметры и тип роста (Tweed, Steiner, Downs, Ricketts)
										</div>
										<div className="space-y-2">
											{analysis.measurements
												.filter((m) => m.category === "vertical")
												.map((m) => {
													const isValValid = m.value !== null && Number.isFinite(m.value);
													const missingKeys = getRequiredLandmarksForMeasurement(m.id).filter((k) => !landmarks[k]);
													return (
														<div
															key={m.id}
															className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 min-h-[52px]"
														>
															<div className="min-w-0">
																<div className="text-sm font-bold text-white min-w-0 break-words">
																	{m.name}
																</div>
																<div className="text-xs text-slate-400 mt-0.5 min-w-0 break-words">
																	{m.clinicalInterpretation} · Норма: <span className="font-bold text-slate-200">{m.normText}</span>
																</div>
															</div>
															<div className="text-right shrink-0 flex flex-col items-end gap-1">
																<div
																	className={`text-base font-black ${
																		isValValid
																			? m.status === "normal"
																				? "text-emerald-400"
																				: m.status === "increased"
																					? "text-rose-400"
																					: m.status === "decreased"
																						? "text-cyan-400"
																						: "text-slate-400"
																			: "text-slate-500"
																	}`}
																>
																	{isValValid ? `${m.value}${m.unit}` : "—"}
																</div>
																<span
																	className={`text-xs uppercase font-black px-2.5 py-1 rounded-lg border ${
																		isValValid
																			? m.status === "normal"
																				? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
																				: m.status === "increased"
																					? "bg-rose-950 text-rose-300 border-rose-500/40"
																					: m.status === "decreased"
																						? "bg-cyan-950 text-cyan-300 border-cyan-500/40"
																						: "bg-slate-800 text-slate-400 border-slate-700"
																			: "bg-slate-800 text-amber-300 border border-amber-500/30"
																	}`}
																>
																	{isValValid
																		? m.status === "normal"
																			? "Норма"
																			: m.status === "increased"
																				? "Увеличен"
																				: m.status === "decreased"
																					? "Уменьшен"
																					: "Нет данных"
																		: missingKeys.length > 0
																			? `Ожидает: ${missingKeys.join(", ")}`
																			: "Нет данных"}
																</span>
															</div>
														</div>
													);
												})}
										</div>
									</div>

									{/* Category 3: Dental & Incisors (Steiner, Tweed) */}
									<div className="pt-2">
										<div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
											3. Дентальные параметры резцов (Steiner, Tweed)
										</div>
										<div className="space-y-2">
											{analysis.measurements
												.filter((m) => m.category === "dental")
												.map((m) => {
													const isValValid = m.value !== null && Number.isFinite(m.value);
													const missingKeys = getRequiredLandmarksForMeasurement(m.id).filter((k) => !landmarks[k]);
													return (
														<div
															key={m.id}
															className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 min-h-[52px]"
														>
															<div className="min-w-0">
																<div className="text-sm font-bold text-white min-w-0 break-words">
																	{m.name}
																</div>
																<div className="text-xs text-slate-400 mt-0.5 min-w-0 break-words">
																	{m.clinicalInterpretation} · Норма: <span className="font-bold text-slate-200">{m.normText}</span>
																</div>
															</div>
															<div className="text-right shrink-0 flex flex-col items-end gap-1">
																<div
																	className={`text-base font-black ${
																		isValValid
																			? m.status === "normal"
																				? "text-emerald-400"
																				: m.status === "increased"
																					? "text-rose-400"
																					: m.status === "decreased"
																						? "text-cyan-400"
																						: "text-slate-400"
																			: "text-slate-500"
																	}`}
																>
																	{isValValid ? `${m.value}${m.unit}` : "—"}
																</div>
																<span
																	className={`text-xs uppercase font-black px-2.5 py-1 rounded-lg border ${
																		isValValid
																			? m.status === "normal"
																				? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
																				: m.status === "increased"
																					? "bg-rose-950 text-rose-300 border-rose-500/40"
																					: m.status === "decreased"
																						? "bg-cyan-950 text-cyan-300 border-cyan-500/40"
																						: "bg-slate-800 text-slate-400 border-slate-700"
																			: "bg-slate-800 text-amber-300 border border-amber-500/30"
																	}`}
																>
																	{isValValid
																		? m.status === "normal"
																			? "Норма"
																			: m.status === "increased"
																				? "Увеличен"
																				: m.status === "decreased"
																					? "Уменьшен"
																					: "Нет данных"
																		: missingKeys.length > 0
																			? `Ожидает: ${missingKeys.join(", ")}`
																			: "Нет данных"}
																</span>
															</div>
														</div>
													);
												})}
										</div>
									</div>
								</div>

								{/* Bottom Action */}
								<div className="mt-3 pt-3 border-t border-slate-800">
									<button
										type="button"
										onClick={() => {
											setActiveTab("report");
											setMobileView("report");
										}}
										className="w-full min-h-[48px] py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
									>
										<span>Сформировать протокол для карты</span>
										<ArrowRight size={16} />
									</button>
								</div>
							</div>
						)}

						{/* Tab 3: Structured Protocol for Form 043/y */}
						{activeTab === "report" && (
							<div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto bg-slate-950">
								<div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
									<div className="flex items-center gap-2 min-w-0">
										<FileText size={20} className="text-teal-400 shrink-0" />
										<span className="text-sm font-bold text-white min-w-0 break-words">
											Предпросмотр протокола для карты
										</span>
									</div>
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => {
												if (typeof window !== "undefined") {
													window.print();
												}
											}}
											data-testid="btn-print-ceph-protocol"
											className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2 transition-colors border border-slate-700 cursor-pointer shadow-sm"
											title="Распечатать протокол ТРГ для медицинской карты"
										>
											<Printer size={15} />
											<span>Печать заключения</span>
										</button>
										<button
											type="button"
											onClick={handleCopyText}
											className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2 transition-colors border border-slate-700 cursor-pointer shadow-sm"
										>
											{copied ? <Check size={15} className="text-emerald-400" /> : <Clipboard size={15} />}
											<span>{copied ? "Скопировано" : "Копировать"}</span>
										</button>
									</div>
								</div>

								{/* Protocol Text Area */}
								<textarea
									readOnly
									value={currentEffectiveProtocolText}
									aria-label="Текст протокола ТРГ для медицинской карты"
									className="flex-1 min-h-[320px] p-4 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs sm:text-sm text-slate-200 resize-none outline-none focus:border-teal-400 leading-relaxed shadow-inner"
								/>

								{/* Bottom Action: 1-Click Insert into Orthodontic Card */}
								<div className="mt-3 pt-3 border-t border-slate-800 flex flex-col gap-2">
									<button
										type="button"
										onClick={handleInsertToChart}
										className="w-full min-h-[48px] py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer border border-teal-400/40"
									>
										<Sparkles size={18} />
										<span>Вставить в ортодонтическую карту</span>
									</button>
									<button
										type="button"
										onClick={handleSaveConsultationWithoutCeph}
										data-testid="tab3-save-consultation-without-ceph-btn"
										className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
									>
										<Save size={16} />
										<span>Сохранить консультацию без полного ТРГ-расчета</span>
									</button>
									<p className="text-xs text-slate-400 text-center m-0 min-w-0 break-words">
										Текст и угловые расчеты будут добавлены в дневник приёма и историю болезни пациента
									</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
