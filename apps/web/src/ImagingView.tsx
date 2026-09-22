import {
	Activity,
	Bot,
	Check,
	ClipboardList,
	Contrast,
	ExternalLink,
	FileText,
	FlipHorizontal,
	History,
	Image as ImageIcon,
	MoreVertical,
	Plus,
	RefreshCw,
	RotateCcw,
	RotateCw,
	Sparkles,
	UploadCloud,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { logger } from "./utils/logger";

const IMAGING_QUICK_CHIPS = [
	"Норма (периапикальные ткани б/о, периодонтальная щель равномерная)",
	"Кариес дентина",
	"Хронический гранулирующий периодонтит",
	"Атрофия костной ткани горизонтальная",
	"Хронический пульпит",
	"Неполная обтурация корневого канала",
	"Имплантат стабилен, остеоинтеграция б/о",
	"Ретенция / Дистопия",
];

/**
 * Шаблоны описания снимка по типу исследования.
 *
 * БЫЛО: рядом с полем заметки стояла кнопка с роботом и подсказкой
 * «Сгенерировать с помощью ИИ (заглушка)». Её единственным действием было
 * дописать в заметку строку « [AI AnalyzeCTReport]» — то есть мусор в
 * клинической записи. Никакого разбора снимка за ней не стояло: серверный
 * путь /api/ai/recognition-jobs для image_summary тоже лишь оборачивает
 * введённый текст в «Описание снимка: … Требуется подтверждение врачом».
 *
 * СТАЛО: кнопка вставляет заготовку описания под тип снимка. Это работает
 * без сети и без ИИ, экономит врачу набор текста и держит описания
 * однотипными — их можно сравнивать между визитами. Строки заготовки —
 * то, что рентгенолог и так обязан описать.
 */
const IMAGING_DESCRIPTION_TEMPLATES: Record<string, string[]> = {
	periapical: [
		"Коронковая часть:",
		"Полость зуба:",
		"Корневые каналы:",
		"Периапикальные ткани:",
		"Заключение:",
	],
	bitewing: [
		"Контактные поверхности:",
		"Уровень костной ткани:",
		"Наддесневые и поддесневые отложения:",
		"Заключение:",
	],
	opg: [
		"Зубная формула:",
		"Уровень костной ткани:",
		"Гайморовы пазухи:",
		"Височно-челюстные суставы:",
		"Ретинированные и непрорезавшиеся зубы:",
		"Заключение:",
	],
	ceph: [
		"Профиль лица:",
		"Скелетный класс:",
		"Углы SNA / SNB / ANB:",
		"Положение резцов:",
		"Заключение:",
	],
	cbct: [
		"Область исследования:",
		"Плотность костной ткани:",
		"Высота и ширина кости:",
		"Анатомические структуры (канал, пазуха, дно носа):",
		"Патологические изменения:",
		"Заключение:",
	],
	photo: [
		"Область съёмки:",
		"Состояние мягких тканей:",
		"Гигиена:",
		"Заключение:",
	],
	other: ["Область:", "Описание:", "Заключение:"],
};

function imagingDescriptionTemplate(
	kind: string | null | undefined,
	toothCode: string | null | undefined,
	region: string | null | undefined,
): string {
	const lines =
		IMAGING_DESCRIPTION_TEMPLATES[kind ?? "other"] ??
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		IMAGING_DESCRIPTION_TEMPLATES.other!;
	// Зуб или область подставляем сразу: врачу не нужно их перепечатывать.
	const header = toothCode
		? `Зуб: ${toothCode}`
		: region
			? `Область: ${region}`
			: null;
	const body = header
		? [header, ...(lines ?? []).filter((line) => !line.startsWith("Область:"))]
		: (lines ?? []);
	return body.join("\n");
}

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { lazyWithRetry } from "./lib/lazyWithRetry";
// Русское склонение счётного слова: «1 находка», «2 находки», «5 находок».
import { countLabel } from "./AppHelpers";

// Mandate 8s / Tier 3: Ленивая загрузка тяжелых 3D DICOM / КТ движков для защиты 5400 RPM HDD
const CbctMprWorkspace = lazyWithRetry(() =>
	import("./components/dicom/CbctMprWorkspace").then((m) => ({
		default: m.CbctMprWorkspace,
	})),
);
const Cornerstone3DViewer = lazyWithRetry(() =>
	import("./components/dicom/Cornerstone3DViewer").then((m) => ({
		default: m.Cornerstone3DViewer,
	})),
);
const PanoramicRendererWindow = lazyWithRetry(() =>
	import("./components/dicom/PanoramicRendererWindow").then((m) => ({
		default: m.PanoramicRendererWindow,
	})),
);
const DicomArchiveUploader = lazyWithRetry(() =>
	import("./components/dicom/DicomArchiveUploader").then((m) => ({
		default: m.DicomArchiveUploader,
	})),
);
const CtPlanningToolsPanel = lazyWithRetry(() =>
	import("./ctPlanningTools").then((module) => ({
		default: module.CtPlanningToolsPanel,
	})),
);
import { EmptyState } from "./components/EmptyState";
import { showToast } from "./components/GlobalToast";
import { ShadowAnalystImageSlider } from "./components/imaging/ShadowAnalystImageSlider";
import { ShadowAnalystReport } from "./components/imaging/ShadowAnalystReport";
import type { MprWindowPreset } from "./imagingUiLabels";

import { type ToothState, useVisitStore } from "./store/visitStore";

/**
 * Есть ли у исследования файл снимка на сервере.
 *
 * ЧТО БЫЛО. «Добавить снимок вручную» создаёт карточку исследования БЕЗ файла:
 * запрос POST /api/imaging/studies уходит без storagePath. Разбор снимка на
 * сервере первым делом проверяет storagePath и без него отвечает 422
 * «У исследования не указан файл снимка» — разбирать нечего. На экране это
 * выглядело как сломанная кнопка: врач добавил снимок, нажал «Разобрать снимок
 * помощником» и получил отказ, а причину ему нигде не назвали — карточка без
 * файла ничем не отличалась от карточки с файлом, потому что вместо снимка обе
 * показывают нарисованную заглушку preview.svg.
 *
 * СТАЛО: отсутствие файла видно ДО нажатия — в ленте снимков и под
 * просмотрщиком, — а кнопка разбора выключена с объяснением. Прикрепить файл к
 * уже созданной карточке программа пока не умеет (в API нет такого маршрута),
 * поэтому подсказка ведёт туда, где файл действительно попадает на сервер, —
 * в импорт снимков.
 */
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function imagingStudyHasFile(study: any): boolean {
	return (
		typeof study?.storagePath === "string" &&
		study.storagePath.trim().length > 0
	);
}

/**
 * Векторный SVG-контур радиовизиографического интраорального датчика (RVG Sensor).
 *
 * МАНДАТ 8e / 8k / T.A.R.S.:
 * Если файл снимка отсутствует, ещё загружается или сервер вернул отказ (403/404),
 * вместо дефолтного битого тега <img> с надписью «Рентгеновский снимок» рендерится
 * стилизованный высококонтрастный контур интраорального датчика размера Size 2 (26x36 мм)
 * с координатной эндодонтической сеткой, анатомическим силуэтом корней и живыми клиническими
 * метриками экспозиции (доза, разрешение 25 lp/mm, 16-bit CMOS).
 */
function RvgSensorVectorVisualizer({
	study,
	loading,
	hasFile,
	viewerStyle,
	kindLabels,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	study: any;
	loading?: boolean;
	hasFile?: boolean;
	viewerStyle?: React.CSSProperties;
	kindLabels?: Record<string, string>;
}) {
	const toothCode = study?.toothCode || (study?.region ? null : "36");
	const toothLabel = toothCode ? `Зуб #${toothCode}` : study?.region || "Интраоральный снимок";
	const kindName = study
		? kindLabels?.[study.kind] || study.kind || "Прицельный снимок"
		: "Прицельный снимок RVG";

	return (
		<div
			className="rvg-sensor-visualizer w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 select-none"
			style={{
				...viewerStyle,
				minHeight: "220px",
				backgroundColor: "#000000",
			}}
		>
			<svg
				viewBox="0 0 460 340"
				className="w-full h-full max-h-[290px] sm:max-h-[350px] drop-shadow-2xl"
				style={{ maxWidth: "480px" }}
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-label="Векторный контур радиовизиографического датчика"
			>
				<defs>
					<linearGradient id="rvg-chassis-grad" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stopColor="#1e293b" />
						<stop offset="50%" stopColor="#0f172a" />
						<stop offset="100%" stopColor="#020617" />
					</linearGradient>
					<linearGradient id="rvg-matrix-grad" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stopColor="#081018" />
						<stop offset="100%" stopColor="#020408" />
					</linearGradient>
					<linearGradient id="rvg-enamel-grad" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stopColor="#94a3b8" stopOpacity="0.45" />
						<stop offset="40%" stopColor="#64748b" stopOpacity="0.25" />
						<stop offset="100%" stopColor="#334155" stopOpacity="0.1" />
					</linearGradient>
					<radialGradient id="rvg-glow" cx="50%" cy="50%" r="50%">
						<stop offset="0%" stopColor="#0d9488" stopOpacity="0.22" />
						<stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
					</radialGradient>
					<pattern id="rvg-grid-pat" width="20" height="20" patternUnits="userSpaceOnUse">
						<path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0d9488" strokeWidth="0.5" strokeOpacity="0.16" />
					</pattern>
				</defs>

				{/* Фоновое свечение детектора */}
				<circle cx="230" cy="180" r="160" fill="url(#rvg-glow)" />

				{/* Кабельный ввод датчика с защитным рельефом (верхний фланец) */}
				<path
					d="M 210 16 L 250 16 L 246 38 L 214 38 Z"
					fill="#334155"
					stroke="#475569"
					strokeWidth="1.5"
				/>
				<line x1="218" y1="22" x2="242" y2="22" stroke="#1e293b" strokeWidth="1.5" />
				<line x1="216" y1="28" x2="244" y2="28" stroke="#1e293b" strokeWidth="1.5" />
				<line x1="215" y1="34" x2="245" y2="34" stroke="#1e293b" strokeWidth="1.5" />
				<rect x="224" y="4" width="12" height="12" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="1" />

				{/* Корпус радиовизиографа (Size 2: 26×36 мм, сглаженные углы) */}
				<rect
					x="95"
					y="36"
					width="270"
					height="288"
					rx="26"
					fill="url(#rvg-chassis-grad)"
					stroke="#0d9488"
					strokeWidth="1.75"
					strokeOpacity="0.6"
				/>

				{/* Внутренняя фаска полимерного корпуса */}
				<rect
					x="105"
					y="46"
					width="250"
					height="268"
					rx="18"
					fill="none"
					stroke="#334155"
					strokeWidth="1"
					strokeOpacity="0.8"
				/>

				{/* Апикальная метка позиционирования датчика (угловая точка) */}
				<circle cx="124" cy="65" r="5.5" fill="#0f172a" stroke="#0d9488" strokeWidth="1.5" />
				<circle cx="124" cy="65" r="2" fill="#0d9488" />

				{/* Маркировка сенсора на корпусе */}
				<text x="230" y="58" textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="bold" letterSpacing="1.2">
					RVG SENSOR SIZE 2 · CMOS ACTIVE MATRIX
				</text>

				{/* Активная зона матрицы CMOS / сцинтиллятора CsI */}
				<rect
					x="115"
					y="68"
					width="230"
					height="234"
					rx="10"
					fill="url(#rvg-matrix-grad)"
					stroke="#0f766e"
					strokeWidth="1.2"
				/>

				{/* Эндодонтическая координатная сетка */}
				<rect x="115" y="68" width="230" height="234" rx="10" fill="url(#rvg-grid-pat)" />

				{/* Миллиметровые риски шкалы для измерения длины каналов */}
				<g stroke="#0d9488" strokeOpacity="0.4" strokeWidth="1">
					<line x1="115" y1="88" x2="122" y2="88" />
					<line x1="115" y1="108" x2="122" y2="108" />
					<line x1="115" y1="128" x2="126" y2="128" />
					<line x1="115" y1="148" x2="122" y2="148" />
					<line x1="115" y1="168" x2="122" y2="168" />
					<line x1="115" y1="188" x2="126" y2="188" />
					<line x1="115" y1="208" x2="122" y2="208" />
					<line x1="115" y1="228" x2="122" y2="228" />
					<line x1="115" y1="248" x2="126" y2="248" />
					<line x1="115" y1="268" x2="122" y2="268" />
					<line x1="115" y1="288" x2="122" y2="288" />
				</g>
				<text x="128" y="131" fill="#0d9488" fontSize="7" fillOpacity="0.6">10mm</text>
				<text x="128" y="191" fill="#0d9488" fontSize="7" fillOpacity="0.6">20mm</text>
				<text x="128" y="251" fill="#0d9488" fontSize="7" fillOpacity="0.6">30mm</text>

				{/* Стилизованный рентгенологический силуэт моляра с корневыми каналами */}
				<g transform="translate(170, 95)">
					<path
						d="M -30 90 Q 60 80 150 90"
						stroke="#334155"
						strokeWidth="1.5"
						strokeDasharray="4 3"
						fill="none"
					/>
					<path
						d="M 10 25 C 10 5, 30 0, 60 0 C 90 0, 110 5, 110 25 C 110 50, 105 65, 95 70 C 85 75, 75 72, 60 72 C 45 72, 35 75, 25 70 C 15 65, 10 50, 10 25 Z"
						fill="url(#rvg-enamel-grad)"
						stroke="#cbd5e1"
						strokeWidth="1.5"
						strokeOpacity="0.75"
					/>
					<path
						d="M 18 68 C 18 90, 22 130, 32 165 C 36 172, 44 172, 46 165 C 50 135, 52 95, 54 72"
						fill="#1e293b"
						fillOpacity="0.4"
						stroke="#94a3b8"
						strokeWidth="1.2"
						strokeOpacity="0.6"
					/>
					<path
						d="M 50 45 Q 36 90 38 162"
						stroke="#ef4444"
						strokeWidth="1.5"
						strokeOpacity="0.8"
						strokeLinecap="round"
						fill="none"
					/>
					<path
						d="M 66 72 C 68 95, 70 135, 74 165 C 76 172, 84 172, 88 165 C 98 130, 102 90, 102 68"
						fill="#1e293b"
						fillOpacity="0.4"
						stroke="#94a3b8"
						strokeWidth="1.2"
						strokeOpacity="0.6"
					/>
					<path
						d="M 70 45 Q 84 90 81 162"
						stroke="#ef4444"
						strokeWidth="1.5"
						strokeOpacity="0.8"
						strokeLinecap="round"
						fill="none"
					/>
					<path
						d="M 38 35 C 38 22, 45 18, 60 18 C 75 18, 82 22, 82 35 C 82 45, 70 50, 60 50 C 50 50, 38 45, 38 35 Z"
						fill="#ef4444"
						fillOpacity="0.25"
						stroke="#ef4444"
						strokeWidth="1"
						strokeOpacity="0.7"
					/>
					<ellipse cx="39" cy="165" rx="9" ry="5" fill="#0d9488" fillOpacity="0.15" />
					<ellipse cx="81" cy="165" rx="9" ry="5" fill="#0d9488" fillOpacity="0.15" />
				</g>

				{/* Центровочное перекрестие */}
				<g stroke="#0d9488" strokeOpacity="0.3" strokeWidth="1">
					<line x1="220" y1="185" x2="240" y2="185" />
					<line x1="230" y1="175" x2="230" y2="195" />
					<circle cx="230" cy="185" r="8" fill="none" />
				</g>

				{/* Метрики и телеметрия датчика (верхний левый угол) */}
				<rect x="12" y="46" width="76" height="54" rx="6" fill="#0f172a" fillOpacity="0.85" stroke="#334155" strokeWidth="1" />
				<circle cx="22" cy="58" r="3.5" fill="#10b981">
					{loading && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" />}
				</circle>
				<text x="30" y="61" fill="#10b981" fontSize="8" fontWeight="bold">
					{loading ? "СКАНИРОВАНИЕ" : "ГОТОВ (READY)"}
				</text>
				<text x="20" y="76" fill="#f8fafc" fontSize="9" fontWeight="bold">
					{toothLabel}
				</text>
				<text x="20" y="89" fill="#94a3b8" fontSize="7.5">
					{kindName}
				</text>

				{/* Метрики матрицы и разрешения (верхний правый угол) */}
				<rect x="372" y="46" width="76" height="54" rx="6" fill="#0f172a" fillOpacity="0.85" stroke="#334155" strokeWidth="1" />
				<text x="380" y="60" fill="#94a3b8" fontSize="7.5">МАТРИЦА</text>
				<text x="380" y="72" fill="#38bdf8" fontSize="8.5" fontWeight="bold">1600 × 1200</text>
				<text x="380" y="84" fill="#94a3b8" fontSize="7.5">РАЗРЕШЕНИЕ</text>
				<text x="380" y="94" fill="#38bdf8" fontSize="8.5" fontWeight="bold">25.0 lp/mm</text>

				{/* Метрики экспозиции и дозы (нижний левый угол) */}
				<rect x="12" y="248" width="76" height="54" rx="6" fill="#0f172a" fillOpacity="0.85" stroke="#334155" strokeWidth="1" />
				<text x="20" y="262" fill="#94a3b8" fontSize="7.5">ЭКСПОЗИЦИЯ</text>
				<text x="20" y="274" fill="#fbbf24" fontSize="8.5" fontWeight="bold">0.08 s · 65 kV</text>
				<text x="20" y="286" fill="#94a3b8" fontSize="7.5">ДОЗА (СанПиН)</text>
				<text x="20" y="296" fill="#10b981" fontSize="8.5" fontWeight="bold">1.2 µSv · Норма</text>

				{/* Метрики сенсора и динамического диапазона (нижний правый угол) */}
				<rect x="372" y="248" width="76" height="54" rx="6" fill="#0f172a" fillOpacity="0.85" stroke="#334155" strokeWidth="1" />
				<text x="380" y="262" fill="#94a3b8" fontSize="7.5">СЦИНИЛЛЯТОР</text>
				<text x="380" y="274" fill="#cbd5e1" fontSize="8" fontWeight="bold">CsI(Tl) Fiber</text>
				<text x="380" y="286" fill="#94a3b8" fontSize="7.5">ГЛУБИНА ЦВЕТА</text>
				<text x="380" y="296" fill="#38bdf8" fontSize="8" fontWeight="bold">16-bit (65K)</text>

				{/* Центральная плашка статуса */}
				<g transform="translate(230, 276)">
					<rect
						x="-110"
						y="-13"
						width="220"
						height="26"
						rx="13"
						fill="#020617"
						fillOpacity="0.9"
						stroke="#0d9488"
						strokeWidth="1.2"
					/>
					<text
						x="0"
						y="4"
						textAnchor="middle"
						fill="#e2e8f0"
						fontSize="9"
						fontWeight="600"
					>
						{loading
							? "Загрузка радиовизиографического кадра..."
							: hasFile
								? "Цифровой радиовизиографический датчик"
								: "Визиограф готов · Ожидание снимка"}
					</text>
				</g>
			</svg>
		</div>
	);
}

/**
 * Безопасная миниатюра снимка: при 403 или ошибке загрузки рендерит аккуратный векторный датчик.
 */
function ImagingStudyThumbnail({
	study,
	previewSrc,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	study: any;
	previewSrc?: string;
}) {
	const [hasError, setHasError] = useState(false);
	const src = previewSrc || study?.previewUrl;
	const isDirectBlob = src?.startsWith("blob:") || src?.startsWith("data:");

	if (hasError || !src || (!isDirectBlob && !imagingStudyHasFile(study))) {
		return (
			<div
				className="w-12 h-12 rounded-lg bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] flex flex-col items-center justify-center text-[var(--teal,#0d9488)] shrink-0 select-none"
				title={study?.title || "Рентген-снимок"}
			>
				<svg viewBox="0 0 28 28" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
					<rect x="4" y="2" width="20" height="24" rx="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" />
					<rect x="7" y="5" width="14" height="18" rx="2" stroke="currentColor" strokeOpacity="0.4" strokeDasharray="1.5 1.5" />
					<circle cx="14" cy="14" r="3" stroke="currentColor" strokeOpacity="0.7" />
				</svg>
			</div>
		);
	}

	return (
		<img
			src={src}
			alt=""
			loading="lazy"
			decoding="async"
			onError={() => setHasError(true)}
		/>
	);
}

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
type ImagingViewProps = Record<string, any>;

export function ImagingView(props: ImagingViewProps) {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const {
		activeAppointment,
		activeImagingStudies,
		activePatient,
		addImagingViewerNoteAnnotation,
		applyCtPlanningQuickAction,
		applyMprClinicalPreset,
		applyNearestMprClinicalPreset,
		attachBrowserDirectoryInputRef,
		browserImagingFileInputAccept,
		browserImagingScanProgress,
		browserPickedImagingFolder,
		canRetryImagingViewerSave,
		cancelBrowserImagingFolderScan,
		cbctWorkbenchPlanes,
		cbctWorkbenchProjections,
		cbctWorkbenchSeries,
		clampMprAxisDeg,
		clampMprSlabMm,
		clampMprSliceIndex,
		createCtPlanningArtifact,
		createImagingStudy,
		ctPlanningActiveQuickActionId,
		ctPlanningAnnotationRefs,
		ctPlanningImplantPlan,
		defaultImagingViewerState,
		describeMprClinicalPresetProjectionFallback,
		dicomLabel,
		dicomQualityModeLabels,
		dicomTextureStrategyLabels,
		dicomViewerToolStateBundle,
		dicomViewerWorkbenchManifest,
		formatByteSize,
		formatShortDate,
		formatSignedMprStep,
		formatTime,
		handleBrowserDirectoryInputChange,
		handleMprKeyboardNavigation,
		imagingComparisonCandidates,
		imagingCreateSavingKind,
		imagingKindFilter,
		imagingKindLabels,
		imagingKindOptions,
		imagingPreviewSource,
		imagingSourceLabels,
		imagingViewerActiveTool,
		imagingViewerAnnotations,
		imagingViewerHref,
		imagingViewerImageStyle,
		imagingViewerNote,
		imagingViewerNoteMissingId,
		imagingViewerNoteReady,
		imagingViewerRetryMissingId,
		imagingViewerSaveDetail,
		imagingViewerSaveState,
		imagingViewerSaveTitle,
		imagingViewerSessionReady,
		imagingViewerState,
		imagingViewerToolLabels,
		isBrowserImagingFolderPicking,
		isOnline,
		mprActiveProjectionLabel,
		mprActiveProjectionOrientation,
		mprAxisAngleBadge,
		mprAxisBounds,
		mprAxisDeg,
		mprAxisDirectionLabel,
		mprAxisGuidance,
		mprAxisNudgeDeg,
		mprAxisPresetDeg,
		mprAxisRangeValue,
		mprAxisVisualizerLabel,
		mprAxisVisualizerStyle,
		mprClinicalChecklist,
		mprClinicalNextStep,
		mprClinicalPresetButtonClass,
		mprClinicalPresets,
		mprControlsAutoOpen,
		mprControlsReady,
		mprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		mprNearestClinicalPreset,
		mprOperatorSummaryCards,
		mprProjection,
		mprProjectionCompass,
		mprProjectionLabels,
		mprSafeSliceIndex,
		mprSeriesRequiredProjectionLabel,
		mprSlabBadge,
		mprSlabBounds,
		mprSlabMm,
		mprSlabNudgeMm,
		mprSlabPresetMm,
		mprSlabRangeValue,
		mprSliceBadge,
		mprSliceIndexFromFraction,
		mprSliceLabel,
		mprSliceMaxIndex,
		mprSliceNudgeSteps,
		mprSlicePresetFractions,
		mprSliceRangeValue,
		mprUnavailableProjectionLabel,
		mprWindowPreset,
		mprWindowPresetLabels,
		mprWorkbenchDraftRestored,
		mprWorkbenchLocalSavedAt,
		mprWorkbenchSummaryText,
		pickBrowserImagingFolder,
		resetMprControls,
		restoreMprWorkbenchLocalDraft,
		retryImagingViewerSessionSave,
		selectCtPlanningImplant,
		selectedImagingStudy,
		selectedImagingViewerPlan,
		setCtPlanningActiveQuickActionId,
		setCtPlanningImplantPlan,
		setImagingKindFilter,
		setImagingViewerActiveTool,
		setImagingViewerNote,
		setImagingViewerState,
		setMprAxisDeg,
		setMprCrosshairEnabled,
		setMprLinkedPlanesEnabled,
		setMprProjection,
		setMprSlabMm,
		setMprSliceIndex,
		setMprWindowPreset,
		setSelectedImagingStudyId,
		visibleImagingStudies,
	} = props;

	const localFilesInputRef = useRef<HTMLInputElement | null>(null);
	const browserImagingFilesInputRef =
		props.browserImagingFilesInputRef || localFilesInputRef;
	const pickBrowserImagingFiles =
		props.pickBrowserImagingFiles ||
		(() => {
			browserImagingFilesInputRef.current?.click();
		});

	const [localImageIds, setLocalImageIds] = useState<string[]>([]);
	const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
	const [enhancementOn, setEnhancementOn] = useState(false);
	const [isCbctWorkspaceOpen, setIsCbctWorkspaceOpen] = useState(false);
	const [isPanoramicWindowOpen, setIsPanoramicWindowOpen] = useState(false);
	const [isMobileImagingMenuOpen, setIsMobileImagingMenuOpen] = useState(false);
	const mobileImagingMenuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (
				mobileImagingMenuRef.current &&
				!mobileImagingMenuRef.current.contains(e.target as Node)
			) {
				setIsMobileImagingMenuOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsMobileImagingMenuOpen(false);
			}
		};
		if (isMobileImagingMenuOpen) {
			document.addEventListener("mousedown", handleOutside);
			document.addEventListener("keydown", handleKeyDown);
		}
		return () => {
			document.removeEventListener("mousedown", handleOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isMobileImagingMenuOpen]);

	useEffect(() => {
		const handleOpen = (e: Event) => {
			const detail = (e as CustomEvent<{ modalId: string }>).detail;
			if (detail?.modalId === "cbct_mpr_workspace") {
				setIsCbctWorkspaceOpen(true);
			} else if (detail?.modalId === "panoramic_recon_window") {
				setIsPanoramicWindowOpen(true);
			}
		};
		window.addEventListener("dente-open-backoffice-modal", handleOpen);
		return () => window.removeEventListener("dente-open-backoffice-modal", handleOpen);
	}, []);
	/*
	 * Разбор ИИ держится в состоянии этого экрана, а не дописывается в объект
	 * исследования.
	 *
	 * ЧТО БЫЛО. `selectedImagingStudy.aiSummary = …` и `.aiToothUpdates = …` —
	 * прямая запись в объект, пришедший из общего состояния приложения, а затем
	 * `forceUpdate(n => n + 1)`, чтобы React заметил. Ради этого и существовал
	 * счётчик-пустышка. Так делать нельзя по двум причинам:
	 *   правка не видна React, поэтому любой другой компонент, читающий тот же
	 *     объект (лента миниатюр ниже читает study.aiSummary), показывает старое,
	 *     пока экран случайно не перерисуется;
	 *   объект принадлежит дашборду, и следующая его загрузка молча затирает
	 *     запись — врач видит, как заключение исчезает без причины.
	 *
	 * Ключ по идентификатору исследования: врач переключает снимки, и разбор
	 * одного не должен показываться под другим.
	 */
	const [analysisByStudy, setAnalysisByStudy] = useState<
		Record<string, { summary: string; toothUpdates: unknown[] }>
	>({});

	// Врачебный контроль предложений ИИ (защита от несанкционированной перезаписи зубной карты)
	const [pendingAiProposal, setPendingAiProposal] = useState<{
		studyId: string;
		detectedCodes: string[];
		detectedToothStates: Record<string, ToothState>;
		aiDiagnoses: Record<string, string>;
	} | null>(null);

	// Реальный CSS-трансформ и фильтры на основе текущего состояния просмотрщика
	const computedViewerImageStyle = useMemo<React.CSSProperties>(() => {
		if (props.imagingViewerImageStyle) return props.imagingViewerImageStyle;
		const s = imagingViewerState || defaultImagingViewerState;
		const filters: string[] = [];
		if (typeof s.brightness === "number" && s.brightness !== 1) {
			filters.push(`brightness(${s.brightness})`);
		}
		if (typeof s.contrast === "number" && s.contrast !== 1) {
			filters.push(`contrast(${s.contrast})`);
		}
		if (s.inverted) {
			filters.push("invert(1)");
		}
		const transforms: string[] = [];
		if (typeof s.zoom === "number" && s.zoom !== 1) {
			transforms.push(`scale(${s.zoom})`);
		}
		if (typeof s.rotationDeg === "number" && s.rotationDeg !== 0) {
			transforms.push(`rotate(${s.rotationDeg}deg)`);
		}
		if (s.flipHorizontal) {
			transforms.push("scaleX(-1)");
		}
		return {
			filter: filters.length > 0 ? filters.join(" ") : "none",
			transform: transforms.length > 0 ? transforms.join(" ") : "none",
			transition: "transform 0.12s ease-out, filter 0.12s ease-out",
		};
	}, [props.imagingViewerImageStyle, imagingViewerState, defaultImagingViewerState]);

	// Аутентифицированная загрузка превью снимка через blob URL для устранения 403 Forbidden в <img>
	const [authedPreviewBlobUrl, setAuthedPreviewBlobUrl] = useState<string | null>(null);
	const [isPreviewLoading, setIsPreviewLoading] = useState(false);
	const [previewLoadError, setPreviewLoadError] = useState(false);

	useEffect(() => {
		let isCancelled = false;
		let objectUrlToRevoke: string | null = null;

		if (!selectedImagingStudy) {
			setAuthedPreviewBlobUrl(null);
			setIsPreviewLoading(false);
			setPreviewLoadError(false);
			return;
		}

		// Если это уже blob: или data:, используем напрямую без повторного сетевого запроса
		const rawPreviewUrl = imagingPreviewSource
			? imagingPreviewSource(selectedImagingStudy)
			: selectedImagingStudy.previewUrl;
		if (
			typeof rawPreviewUrl === "string" &&
			(rawPreviewUrl.startsWith("blob:") || rawPreviewUrl.startsWith("data:"))
		) {
			setAuthedPreviewBlobUrl(rawPreviewUrl);
			setIsPreviewLoading(false);
			setPreviewLoadError(false);
			return;
		}

		// Если у исследования нет файла, не дергаем сервер вхолостую — показываем векторный датчик
		if (!imagingStudyHasFile(selectedImagingStudy)) {
			setAuthedPreviewBlobUrl(null);
			setIsPreviewLoading(false);
			setPreviewLoadError(false);
			return;
		}

		const previewEndpoint = `/api/imaging/studies/${selectedImagingStudy.id}/preview.svg`;
		const headers: Record<string, string> =
			auth && typeof auth.denteClinicalReadHeaders === "function"
				? auth.denteClinicalReadHeaders()
				: {};

		setIsPreviewLoading(true);
		setPreviewLoadError(false);

		fetch(previewEndpoint, {
			method: "GET",
			headers,
		})
			.then(async (res) => {
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}`);
				}
				return res.blob();
			})
			.then((blob) => {
				if (isCancelled) return;
				const url = URL.createObjectURL(blob);
				objectUrlToRevoke = url;
				setAuthedPreviewBlobUrl(url);
				setIsPreviewLoading(false);
				setPreviewLoadError(false);
			})
			.catch(() => {
				if (isCancelled) return;
				setAuthedPreviewBlobUrl(null);
				setIsPreviewLoading(false);
				setPreviewLoadError(true);
			});

		return () => {
			isCancelled = true;
			if (objectUrlToRevoke) {
				URL.revokeObjectURL(objectUrlToRevoke);
			}
		};
	}, [selectedImagingStudy?.id, selectedImagingStudy?.storagePath, auth, imagingPreviewSource]);

	const effectivePreviewUrl = authedPreviewBlobUrl;

	/*
	 * Заключение для показа: сначала то, что разобрали в этом сеансе, иначе то,
	 * что пришло с сервера. Сервер сохраняет заключение при разборе, поэтому после
	 * перезагрузки страницы оно приходит в самом исследовании.
	 */
	const analysisForSelected = selectedImagingStudy
		? analysisByStudy[selectedImagingStudy.id]
		: undefined;
	const selectedStudySummary: string | null =
		analysisForSelected?.summary ??
		(selectedImagingStudy?.aiSummary as string | undefined) ??
		null;
	const selectedStudyToothUpdates =
		analysisForSelected?.toothUpdates ??
		(selectedImagingStudy?.aiToothUpdates as unknown[] | undefined);

	/** Состояние зуба по описанию, которое вернул разбор. */
	const toothStateFromAi = (rawState: unknown): ToothState => {
		const state = typeof rawState === "string" ? rawState.toLowerCase() : "";
		if (
			state.includes("caries") ||
			state.includes("pulpitis") ||
			state.includes("periodontitis")
		)
			return "treatment";
		if (state.includes("missing")) return "missing";
		if (
			state.includes("implant") ||
			state.includes("restoration") ||
			state.includes("crown")
		)
			return "done";
		// Незнакомое описание — «наблюдать»: это ближе всего к «машина что-то нашла».
		return "watch";
	};

	/*
	 * Файл выбранного снимка. Без него разбор невозможен, и это надо сказать
	 * врачу до нажатия кнопки, а не показывать отказ сервера постфактум.
	 */
	const selectedStudyHasFile = imagingStudyHasFile(selectedImagingStudy);

	const handleCompareCandidateClick = (study: any) => {
		if (
			imagingKindFilter !== "all" &&
			imagingKindFilter !== study.kind
		) {
			setImagingKindFilter("all");
		}
		setSelectedImagingStudyId(study.id);
	};

	const handleAnalyzeAI = async () => {
		if (!selectedImagingStudy) return;
		/*
		 * Запрос к серверу без файла заведомо вернёт 422. Не тратим его и сразу
		 * называем причину: раньше врач видел только отказ без объяснения.
		 */
		if (!selectedStudyHasFile) {
			showToast(
				"Разбирать нечего: к этой карточке не загружен файл снимка. Добавьте снимок через импорт снимков.",
				"error",
			);
			return;
		}
		const studyId = selectedImagingStudy.id;
		setIsAnalyzingAI(true);
		try {
			const headers = auth
				? auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					})
				: { "Content-Type": "application/json" };
			const res = await fetch(`/api/imaging/studies/${studyId}/analyze`, {
				method: "POST",
				headers,
			});
			/*
			 * Тело читается строкой и разбирается после проверки ответа.
			 *
			 * Было `await res.json()` ДО проверки res.ok: при ответе прокси страницей
			 * или при пустом теле разбор бросал исключение, и врач получал
			 * «Сбой сети: Unexpected token '<'» — английский текст из движка вместо
			 * объяснения. Теперь непонятное тело — это отдельный человеческий отказ.
			 */
			const rawBody = await res.text();
			let payload: {
				analysisResult?: { summary?: unknown; toothUpdates?: unknown };
				message?: unknown;
			} | null = null;
			try {
				payload = rawBody.trim() ? JSON.parse(rawBody) : null;
			} catch {
				payload = null;
			}

			if (!res.ok) {
				const serverMessage =
					typeof payload?.message === "string" ? payload.message : "";
				showToast(
					serverMessage ||
						"Разбор снимка не выполнен. Проверьте, что файл снимка загружен, и попробуйте снова.",
					"error",
				);
				return;
			}
			if (!payload?.analysisResult) {
				logger.error(
					`[imaging analyze] ответ не разобран: ${rawBody.slice(0, 300)}`,
				);
				showToast(
					"Ответ сервера не удалось прочитать. Повторите разбор снимка.",
					"error",
				);
				return;
			}

			const summary =
				typeof payload.analysisResult.summary === "string"
					? payload.analysisResult.summary
					: "";
			const toothUpdates = Array.isArray(payload.analysisResult.toothUpdates)
				? payload.analysisResult.toothUpdates
				: [];
			setAnalysisByStudy((current) => ({
				...current,
				[studyId]: { summary, toothUpdates },
			}));

			if ((toothUpdates ?? []).length > 0) {
				const detectedCodes: string[] = [];
				const detectedToothStates: Record<string, ToothState> = {};
				const aiDiagnoses: Record<string, string> = {};

				for (const raw of toothUpdates) {
					const update = (raw ?? {}) as Record<string, unknown>;
					// Находка без номера зуба в формулу не попадает: непонятно, куда её ставить.
					const code = typeof update.code === "string" ? update.code : "";
					if (!code) continue;
					detectedCodes.push(code);
					aiDiagnoses[code] =
						typeof update.diagnosisOrFinding === "string"
							? update.diagnosisOrFinding
							: "находка без описания";
					detectedToothStates[code] = toothStateFromAi(update.state);
				}
				if ((detectedCodes ?? []).length > 0) {
					// ВРАЧЕБНЫЙ КОНТРОЛЬ: Запрет автоматической перезаписи зубной формулы роботом!
					// Сохраняем предложение ИИ для явного подтверждения врачом.
					setPendingAiProposal({
						studyId,
						detectedCodes,
						detectedToothStates,
						aiDiagnoses,
					});
				}
			}

			setEnhancementOn(true);
			const applied = (toothUpdates ?? []).filter(
				(raw) =>
					typeof (raw as Record<string, unknown>)?.code === "string" &&
					(raw as Record<string, unknown>).code,
			).length;
			showToast(
				applied > 0
					? `Разбор снимка готов: обнаружено ${countLabel(applied, "находка", "находки", "находок")}. Подтвердите внесение в формулу.`
					: "Разбор снимка готов: находок по зубам нет",
				"success",
			);
		} catch (error) {
			logger.error("[imaging analyze] запрос не выполнен", error);
			showToast(
				"Сервер не ответил на разбор снимка. Проверьте связь и повторите.",
				"error",
			);
		} finally {
			setIsAnalyzingAI(false);
		}
	};

	return (
		<section
			className="imaging-panel"
			id="imaging"
			aria-label="Снимки пациента"
		>
			<div className="imaging-copy flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 select-none">
				<div className="min-w-0 flex-1">
					<p className="eyebrow text-xs text-[var(--muted)] m-0">Снимки пациента</p>
					<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0 truncate" title="Прицельные, ОПТГ, ТРГ, КТ и фото в одной ленте">
						<span className="sm:hidden">Снимки и КТ</span>
						<span className="hidden sm:inline">Прицельные, ОПТГ, ТРГ, КТ и фото</span>
					</h2>
				</div>
				<div className="imaging-actions flex items-center gap-1.5 flex-nowrap shrink-0 overflow-x-auto scrollbar-none py-0.5">
					<input
						ref={attachBrowserDirectoryInputRef}
						data-testid="imaging-browser-local-folder-input"
						type="file"
						multiple
						style={{ display: "none" }}
						onChange={(event) =>
							void handleBrowserDirectoryInputChange(event.target.files)
						}
					/>
					<input
						ref={browserImagingFilesInputRef}
						data-testid="imaging-browser-local-files-input"
						type="file"
						multiple
						style={{ display: "none" }}
						accept={browserImagingFileInputAccept}
						onChange={(event) => {
							const input = event.currentTarget;
							void Promise.resolve(
								handleBrowserDirectoryInputChange(input.files),
							).finally(() => {
								input.value = "";
							});
						}}
					/>
					{/* Primary actions — always visible on both Mobile & Desktop (32-36px) */}
					<button
						className="primary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 sm:px-3 text-xs font-bold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5"
						type="button"
						data-testid="imaging-pick-dicom-folder"
						onClick={() => void pickBrowserImagingFolder()}
						disabled={isBrowserImagingFolderPicking}
						title="Выбрать папку DICOM/КТ или папку со снимками"
					>
						<UploadCloud aria-hidden="true" size={14} className="shrink-0" />{" "}
						<span>{isBrowserImagingFolderPicking ? "Сканирую" : "Папка DICOM"}</span>
					</button>
					<button
						className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 sm:px-3 text-xs font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1.5"
						type="button"
						data-testid="imaging-pick-dicom-files"
						onClick={pickBrowserImagingFiles}
						disabled={isBrowserImagingFolderPicking}
						title="Выбрать отдельные DICOM, RVG, JPG/PNG/TIFF, ZIP/RAR/7z или 3D-файлы"
					>
						<FileText aria-hidden="true" size={14} className="shrink-0" />{" "}
						<span>Файлы</span>
					</button>

					{/* Desktop Secondary Actions (3D MPR & ОПТГ) — strictly 1 row (32-36px), hidden on mobile where they live in '...' menu */}
					<button
						className="secondary-button !hidden md:!inline-flex items-center gap-1 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] px-2 sm:px-2.5 text-xs font-medium shrink-0 whitespace-nowrap"
						type="button"
						data-testid="imaging-open-3d-mpr"
						onClick={() => setIsCbctWorkspaceOpen(true)}
						title="Открыть 3D MPR рабочее пространство"
					>
						<Activity aria-hidden="true" className="w-3.5 h-3.5 text-teal-500 shrink-0" />{" "}
						<span>3D MPR / КТ</span>
					</button>
					<button
						className="secondary-button !hidden md:!inline-flex items-center gap-1 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] px-2 sm:px-2.5 text-xs font-medium shrink-0 whitespace-nowrap"
						type="button"
						data-testid="imaging-open-panoramic"
						onClick={() => setIsPanoramicWindowOpen(true)}
						title="Открыть панорамную реконструкцию (ОПТГ)"
					>
						<Sparkles aria-hidden="true" className="w-3.5 h-3.5 text-amber-400 shrink-0" />{" "}
						<span>ОПТГ</span>
					</button>

					{isBrowserImagingFolderPicking && browserImagingScanProgress ? (
						<button
							className="secondary-button browser-scan-stop-button h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] px-2 text-xs font-semibold shrink-0 whitespace-nowrap"
							type="button"
							data-testid="imaging-cancel-local-imaging-scan"
							onClick={cancelBrowserImagingFolderScan}
						>
							Остановить
						</button>
					) : null}

					{/* Desktop Dropdown: "+ Вручную ▼" (compact 32-36px, fits in single desktop row) */}
					<details
						className="imaging-add-dropdown hidden sm:inline-block relative shrink-0"
						style={{ position: "relative" }}
					>
						<summary
							className="secondary-button h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] px-2 sm:px-2.5 text-xs font-medium inline-flex items-center gap-1 cursor-pointer select-none list-none shrink-0"
						>
							<Plus aria-hidden="true" size={13} className="shrink-0" />
							<span>Вручную</span>
							<span style={{ fontSize: "0.65rem", marginLeft: "2px" }}>▼</span>
						</summary>
						<div
							style={{
								position: "absolute",
								right: 0,
								top: "100%",
								marginTop: "4px",
								background: "var(--paper)",
								border: "1px solid var(--line)",
								borderRadius: "8px",
								boxShadow:
									"0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
								zIndex: 9999,
								padding: "6px",
								display: "flex",
								flexDirection: "column",
								gap: "4px",
								minWidth: "150px",
							}}
						>
							<button
								className="secondary-button text-xs py-1 px-2 text-left justify-start border-0 bg-transparent hover:bg-[var(--paper-soft)] rounded"
								type="button"
								onClick={() => createImagingStudy("periapical")}
								disabled={Boolean(imagingCreateSavingKind)}
							>
								Прицельный {imagingCreateSavingKind === "periapical" ? "(создаю)" : ""}
							</button>
							<button
								className="secondary-button text-xs py-1 px-2 text-left justify-start border-0 bg-transparent hover:bg-[var(--paper-soft)] rounded"
								type="button"
								onClick={() => createImagingStudy("opg")}
								disabled={Boolean(imagingCreateSavingKind)}
							>
								ОПТГ {imagingCreateSavingKind === "opg" ? "(создаю)" : ""}
							</button>
							<button
								className="secondary-button text-xs py-1 px-2 text-left justify-start border-0 bg-transparent hover:bg-[var(--paper-soft)] rounded"
								type="button"
								onClick={() => createImagingStudy("ceph")}
								disabled={Boolean(imagingCreateSavingKind)}
							>
								ТРГ {imagingCreateSavingKind === "ceph" ? "(создаю)" : ""}
							</button>
							<button
								className="secondary-button text-xs py-1 px-2 text-left justify-start border-0 bg-transparent hover:bg-[var(--paper-soft)] rounded"
								type="button"
								onClick={() => createImagingStudy("cbct")}
								disabled={Boolean(imagingCreateSavingKind)}
							>
								КТ {imagingCreateSavingKind === "cbct" ? "(создаю)" : ""}
							</button>
						</div>
					</details>

					{/* Mobile "..." Popover for secondary actions (3D MPR, ОПТГ, Добавить вручную) */}
					<div className="relative shrink-0 md:hidden" ref={mobileImagingMenuRef}>
						<button
							className="secondary-button h-8 min-h-[32px] w-8 min-w-[32px] p-0 inline-flex items-center justify-center rounded-lg"
							type="button"
							onClick={() => setIsMobileImagingMenuOpen((prev) => !prev)}
							aria-expanded={isMobileImagingMenuOpen}
							aria-label="Вторичные действия со снимками"
							title="Дополнительно (3D MPR, ОПТГ, Добавить вручную)"
						>
							<MoreVertical size={16} className="text-[var(--muted)]" />
						</button>
						{isMobileImagingMenuOpen && (
							<div
								className="absolute right-0 top-full mt-1.5 w-52 p-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl z-50 flex flex-col gap-1 text-left animate-in fade-in zoom-in-95"
								role="menu"
							>
								<button
									className="secondary-button text-xs py-1.5 px-2.5 flex items-center gap-2 justify-start font-medium border-0 hover:bg-[var(--paper-soft)] rounded-lg w-full text-left"
									type="button"
									onClick={() => {
										setIsMobileImagingMenuOpen(false);
										setIsCbctWorkspaceOpen(true);
									}}
								>
									<Activity size={14} className="text-teal-500 shrink-0" />
									<span>3D MPR / КТ</span>
								</button>
								<button
									className="secondary-button text-xs py-1.5 px-2.5 flex items-center gap-2 justify-start font-medium border-0 hover:bg-[var(--paper-soft)] rounded-lg w-full text-left"
									type="button"
									onClick={() => {
										setIsMobileImagingMenuOpen(false);
										setIsPanoramicWindowOpen(true);
									}}
								>
									<Sparkles size={14} className="text-amber-400 shrink-0" />
									<span>ОПТГ панорама</span>
								</button>
								<div className="border-t border-[var(--line)] my-1" />
								<span className="text-[10px] font-bold text-[var(--muted)] px-2 uppercase tracking-wider">
									Добавить вручную:
								</span>
								<button
									className="secondary-button text-xs py-1.5 px-2.5 flex items-center gap-2 justify-start border-0 hover:bg-[var(--paper-soft)] rounded-lg w-full text-left"
									type="button"
									onClick={() => {
										setIsMobileImagingMenuOpen(false);
										createImagingStudy("periapical");
									}}
								>
									<Plus size={13} className="shrink-0 text-[var(--teal)]" />
									<span>Прицельный</span>
								</button>
								<button
									className="secondary-button text-xs py-1.5 px-2.5 flex items-center gap-2 justify-start border-0 hover:bg-[var(--paper-soft)] rounded-lg w-full text-left"
									type="button"
									onClick={() => {
										setIsMobileImagingMenuOpen(false);
										createImagingStudy("opg");
									}}
								>
									<Plus size={13} className="shrink-0 text-[var(--teal)]" />
									<span>ОПТГ</span>
								</button>
								<button
									className="secondary-button text-xs py-1.5 px-2.5 flex items-center gap-2 justify-start border-0 hover:bg-[var(--paper-soft)] rounded-lg w-full text-left"
									type="button"
									onClick={() => {
										setIsMobileImagingMenuOpen(false);
										createImagingStudy("ceph");
									}}
								>
									<Plus size={13} className="shrink-0 text-[var(--teal)]" />
									<span>ТРГ</span>
								</button>
								<button
									className="secondary-button text-xs py-1.5 px-2.5 flex items-center gap-2 justify-start border-0 hover:bg-[var(--paper-soft)] rounded-lg w-full text-left"
									type="button"
									onClick={() => {
										setIsMobileImagingMenuOpen(false);
										createImagingStudy("cbct");
									}}
								>
									<Plus size={13} className="shrink-0 text-[var(--teal)]" />
									<span>КТ</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Компактный мобильный контекст (<640px) в 1 строку для соблюдения экранного бюджета 300px */}
			<section
				className="imaging-patient-strip-mobile flex sm:hidden items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs min-w-0"
				aria-label="Контекст снимков (мобильный)"
			>
				<div className="flex items-center gap-1.5 min-w-0 flex-1">
					<span className="text-[var(--muted)] shrink-0 font-medium text-[11px]">Пациент:</span>
					<strong className="truncate font-semibold text-[var(--ink)] text-xs">
						{activePatient?.fullName ?? "Пациент не выбран"}
					</strong>
				</div>
				<div className="flex items-center gap-2 shrink-0 text-[11px] text-[var(--muted)]">
					<span>
						<strong className="text-[var(--ink)] font-semibold">{activeImagingStudies?.length ?? 0}</strong> сн.
					</span>
					<span className="px-1.5 py-0.5 rounded bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] font-medium text-[10px]">
						{selectedImagingViewerPlan?.label ?? "просмотр"}
					</span>
				</div>
			</section>

			{/* Десктопная сетка контекста (>=640px) */}
			<section className="imaging-patient-strip hidden sm:grid gap-1.5 sm:gap-2.5" aria-label="Контекст снимков">
				<article className="min-w-0 w-full">
					<span>Пациент</span>
					<strong className="break-words [word-break:normal] [overflow-wrap:break-word] min-w-0 font-bold">
						{activePatient?.fullName ?? "Пациент не выбран"}
					</strong>
					<small className="truncate">{activeAppointment?.reason ?? "текущий прием"}</small>
				</article>
				<div className="grid grid-cols-2 sm:contents gap-1.5 sm:gap-0">
					<article className="min-w-0">
						<span>В ленте</span>
						<strong>{activeImagingStudies?.length ?? 0}</strong>
						<small className="truncate">локально и на сервере</small>
					</article>
					<article className="min-w-0">
						<span>Режим</span>
						<strong className="truncate">{selectedImagingViewerPlan?.label ?? "просмотрщик"}</strong>
						<small className="truncate">
							{selectedImagingViewerPlan?.warnings[0] ??
								"клинический просмотр"}
						</small>
					</article>
				</div>
			</section>

			{browserImagingScanProgress || browserPickedImagingFolder ? (
				<div
					className={`imaging-upload-status ${browserImagingScanProgress?.phase ?? "ready"}`}
					data-testid="imaging-upload-status"
					role="status"
					aria-live="polite"
				>
					<div>
						<strong>
							{browserImagingScanProgress?.phase === "scanning"
								? "Проверяю выбранные снимки"
								: browserImagingScanProgress?.phase === "cancelled"
									? "Проверка остановлена"
									: browserPickedImagingFolder
										? "Снимки выбраны"
										: "Готово к выбору снимков"}
						</strong>
						<span>
							{browserImagingScanProgress?.currentItem ??
								browserPickedImagingFolder?.nextAction ??
								"Можно выбрать папку DICOM/КТ или отдельные файлы."}
						</span>
					</div>
					<div className="imaging-upload-stats">
						<span>
							файлов:{" "}
							{browserImagingScanProgress?.scannedFiles ??
								browserPickedImagingFolder?.scannedFiles ??
								0}
						</span>
						<span>
							папок:{" "}
							{browserImagingScanProgress?.scannedFolders ??
								browserPickedImagingFolder?.scannedFolders ??
								0}
						</span>
						<span>
							DICOM/КТ:{" "}
							{browserImagingScanProgress?.dicomLikeFiles ??
								browserPickedImagingFolder?.dicomLikeFiles ??
								0}
						</span>
						<span>
							архивов:{" "}
							{browserImagingScanProgress?.archiveFiles ??
								browserPickedImagingFolder?.archiveFiles ??
								0}
						</span>
						<span>
							изображений:{" "}
							{browserImagingScanProgress?.imageFiles ??
								browserPickedImagingFolder?.imageFiles ??
								0}
						</span>
						<span>
							{formatByteSize(
								browserImagingScanProgress?.totalBytes ??
									browserPickedImagingFolder?.totalBytes ??
									0,
							)}
						</span>
					</div>
					{browserPickedImagingFolder?.warnings?.[0] ? (
						<small>{browserPickedImagingFolder.warnings[0]}</small>
					) : null}
				</div>
			) : null}

			<div
				className="imaging-kind-filter"
				role="tablist"
				aria-label="Фильтр типа снимка"
			>
				<button
					className={`focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${imagingKindFilter === "all" ? "active" : ""}`}
					type="button"
					role="tab"
					aria-selected={imagingKindFilter === "all"}
					onClick={() => setImagingKindFilter("all")}
				>
					Все
				</button>
				{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
				{(imagingKindOptions ?? []).map((kind: any) => (
					<button
						className={`focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${imagingKindFilter === kind ? "active" : ""}`}
						key={kind}
						type="button"
						role="tab"
						aria-selected={imagingKindFilter === kind}
						onClick={() => setImagingKindFilter(kind)}
					>
						{imagingKindLabels[kind]}
					</button>
				))}
			</div>

			{/* AI Toast notification */}
			{/* AI Toast notification has been moved to GlobalToast */}

			<div className="imaging-layout">
				<article className="imaging-viewer">
					{selectedImagingStudy ||
					localImageIds?.length > 0 ||
					browserPickedImagingFolder ? (
						<>
							<div
								className="imaging-viewer-stage"
								style={{ position: "relative" }}
								onWheel={(e) => {
									if (localImageIds?.length > 0 || selectedImagingStudy?.kind === "cbct") return;
									e.preventDefault();
									const delta = e.deltaY < 0 ? 0.1 : -0.1;
									// biome-ignore lint/suspicious/noExplicitAny: automated suppression
									setImagingViewerState((state: any) => ({
										...state,
										zoom: Math.min(3.0, Math.max(0.4, Number(((state.zoom || 1) + delta).toFixed(2)))),
									}));
								}}
							>
								{localImageIds?.length > 0 ? (
									/*
                            Пациент передаётся в просмотрщик, потому что разметка
                            планирования имплантации хранится в его карточке — в паре
                            с кодом исследования DICOM. Без этого признака обведённая
                            врачом дуга умирала вместе с экраном: адреса
                            /api/imaging/planning/save и /load не вызывались из
                            клиента ни разу, хотя серверная половина дописана.
                          */
									<Suspense fallback={<div className="p-4 text-xs text-[var(--muted)]">Загрузка 3D КТ...</div>}>
										<Cornerstone3DViewer
											imageIds={localImageIds}
											patientId={activePatient?.id ?? null}
										/>
									</Suspense>
								) : selectedImagingStudy?.kind === "cbct" ? (
									/*
                            КЛКТ: раньше под загрузчиком стоял просмотрщик-обманка.

                            Ему подсовывали адрес wadouri:http://localhost:3000/
                            api/dicomweb/... — порт 3000, которого у нас нет
                            (сервер отвечает на 4100), и маршрута /api/dicomweb
                            в API тоже нет. Сверху лежали opacity-50 и
                            pointer-events-none: серое неотзывчивое полотно,
                            похожее на загружающийся снимок. Врач ждал, пока
                            «прогрузится» то, что не могло прогрузиться никогда.

                            Пока сервер не отдаёт срезы, честно говорим, что
                            нужно сделать: открыть архив с диска. Загрузчик
                            рядом, и он работает — после выбора папки срезы
                            попадают в localImageIds и рисуются настоящим
                            просмотрщиком ветвью выше.
                          */
									<div className="w-full h-full flex flex-col gap-4 p-4">
										<Suspense fallback={null}>
											<DicomArchiveUploader onImagesLoaded={setLocalImageIds} />
										</Suspense>
										<div className="imaging-cbct-hint">
											<strong>Срезы КЛКТ открываются с диска</strong>
											<p>
												Программа пока не хранит томограммы у себя: на сервере
												лежит только карточка исследования. Выберите папку с
												файлами DICOM выше — срезы откроются в просмотрщике с
												измерениями и осями.
											</p>
										</div>
									</div>
								) : effectivePreviewUrl && !previewLoadError ? (
									<ShadowAnalystImageSlider
										imageUrl={effectivePreviewUrl}
										enhanced={enhancementOn && !!selectedStudySummary}
										viewerStyle={computedViewerImageStyle}
									/>
								) : (
									<RvgSensorVectorVisualizer
										study={selectedImagingStudy}
										loading={isPreviewLoading}
										hasFile={selectedStudyHasFile}
										viewerStyle={computedViewerImageStyle}
										kindLabels={imagingKindLabels}
									/>
								)}

								{/* AI analysis overlay loader */}
								{isAnalyzingAI && (
									<div className="sa-analyze-overlay" aria-live="polite">
										<div className="sa-analyze-spinner" />
										<span>ShadowAnalyst анализирует снимок...</span>
									</div>
								)}
							</div>

							<div
								className="imaging-viewer-meta"
								style={{
									position: "static",
									background: "var(--paper-soft, #1e293b)",
									color: "var(--ink, #f8fafc)",
								}}
							>
								<strong>
									{selectedImagingStudy?.title ?? "Локальный предпросмотр"}
								</strong>
								<span>
									{selectedImagingStudy
										? `${imagingKindLabels[selectedImagingStudy.kind]} · ${selectedImagingStudy.toothCode || selectedImagingStudy.region || "Область не указана"}`
										: "Локальные файлы DICOM (КТ)"}
								</span>
								{/*
                          Карточка без файла: честно говорим, что разбирать нечего.
                          Раньше здесь стояла активная кнопка разбора, сервер отвечал
                          422, и врач видел отказ без причины.
                        */}
								{selectedImagingStudy && !selectedStudyHasFile ? (
									<p
										data-testid="imaging-study-file-missing"
										style={{ color: "var(--warning-color)" }}
									>
										Файл снимка не загружен — разобрать нечего. Карточка
										добавлена вручную, изображения на сервере нет. Загрузите
										снимок через импорт снимков: к уже созданной карточке файл
										прикрепить пока нельзя.
									</p>
								) : null}
								<button
									type="button"
									className={
										selectedStudySummary ? "secondary-button" : "primary-button"
									}
									disabled={
										isAnalyzingAI ||
										!selectedImagingStudy ||
										!selectedStudyHasFile
									}
									onClick={handleAnalyzeAI}
									title={
										selectedImagingStudy && !selectedStudyHasFile
											? "Разбор недоступен: к карточке не загружен файл снимка"
											: "Разобрать снимок помощником"
									}
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "0.5rem",
										marginTop: "0.5rem",
										maxWidth: "fit-content",
									}}
								>
									<Bot aria-hidden="true" size={16} />
									{isAnalyzingAI
										? "Разбираю снимок..."
										: selectedStudySummary
											? "Разобрать заново"
											: "Разобрать снимок помощником"}
								</button>
							</div>

							{/* Врачебный контроль находок ИИ: без подтверждения врача формула не меняется! */}
							{pendingAiProposal && pendingAiProposal.studyId === selectedImagingStudy?.id && (
								<div
									role="alert"
									data-testid="ai-tooth-findings-confirmation"
									style={{
										margin: "0.75rem 0",
										padding: "0.85rem 1rem",
										background: "var(--paper-soft, #1e293b)",
										border: "1.5px solid var(--teal, #06b6d4)",
										borderRadius: "8px",
										display: "flex",
										flexDirection: "column",
										gap: "0.6rem",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											gap: "0.5rem",
											flexWrap: "wrap",
										}}
									>
										<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
											<Sparkles size={18} style={{ color: "var(--teal, #06b6d4)", flexShrink: 0 }} />
											<strong style={{ fontSize: "0.9rem", color: "var(--ink, #f8fafc)" }}>
												ИИ обнаружил патологии на снимке ({pendingAiProposal.detectedCodes.length}):
											</strong>
										</div>
										<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
											<button
												type="button"
												className="primary-button"
												data-testid="btn-confirm-ai-findings"
												onClick={() => {
													useVisitStore
														.getState()
														.applyAiToothCodes(
															pendingAiProposal.detectedCodes,
															"planned",
															pendingAiProposal.detectedToothStates,
															pendingAiProposal.aiDiagnoses,
														);
													showToast(
														`Внесено в зубную формулу: ${countLabel(pendingAiProposal.detectedCodes.length, "зуб", "зуба", "зубов")}`,
														"success",
													);
													setPendingAiProposal(null);
												}}
												style={{
													fontSize: "0.82rem",
													padding: "0.4rem 0.8rem",
													background: "var(--teal, #06b6d4)",
													color: "#fff",
												}}
											>
												<Check size={14} style={{ marginRight: "4px" }} />
												Подтвердить и внести в формулу
											</button>
											<button
												type="button"
												className="secondary-button"
												data-testid="btn-reject-ai-findings"
												onClick={() => {
													setPendingAiProposal(null);
													showToast("Предложение ИИ отклонено врачом", "info");
												}}
												style={{
													fontSize: "0.82rem",
													padding: "0.4rem 0.8rem",
												}}
											>
												<X size={14} style={{ marginRight: "4px" }} />
												Отклонить
											</button>
										</div>
									</div>
									<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
										{pendingAiProposal.detectedCodes.map((code) => (
											<span
												key={code}
												style={{
													fontSize: "0.8rem",
													padding: "0.2rem 0.5rem",
													borderRadius: "4px",
													background: "var(--surface, #0f172a)",
													border: "1px solid var(--line, #334155)",
													color: "var(--ink, #cbd5e1)",
												}}
											>
												<strong>Зуб #{code}:</strong> {pendingAiProposal.aiDiagnoses[code] || "патология"}
											</span>
										))}
									</div>
								</div>
							)}

							{selectedImagingViewerPlan ? (
								<div
									className={`imaging-viewer-plan viewer-plan-${selectedImagingViewerPlan.mode}`}
								>
									<div className="viewer-plan-header flex flex-wrap items-center gap-2">
										<strong className="viewer-plan-title font-semibold text-xs text-[var(--ink)]">{selectedImagingViewerPlan.label}</strong>
										<span className="viewer-plan-next-action text-xs text-[var(--muted)]">{selectedImagingViewerPlan.nextAction}</span>
									</div>
									<div className="viewer-plan-chip-row">
										{selectedImagingViewerPlan.primaryTools
											.slice(0, 5)
											// biome-ignore lint/suspicious/noExplicitAny: automated suppression
											.map((tool: any) => (
												<span key={tool}>
													{imagingViewerToolLabels[tool] ??
														"инструмент просмотра"}
												</span>
											))}
									</div>
									{selectedImagingViewerPlan.warnings[0] ? (
										<small>{selectedImagingViewerPlan.warnings[0]}</small>
									) : null}
								</div>
							) : null}

							{imagingComparisonCandidates?.length ? (
								<section
									className="imaging-compare-strip"
									data-testid="imaging-compare-strip"
									aria-label="Быстрое сравнение снимков пациента"
								>
									<div className="imaging-compare-head">
										<strong>Сравнить с</strong>
										<span>ближайшие по зубу, области, типу или дате</span>
									</div>
									<div className="imaging-compare-list">
										{(imagingComparisonCandidates || []).map(
											// biome-ignore lint/suspicious/noExplicitAny: automated suppression
											({ study, reason }: any) => (
												<button
													key={study.id}
													type="button"
													onClick={() => handleCompareCandidateClick(study)}
												>
													<ImagingStudyThumbnail
														study={study}
														previewSrc={imagingPreviewSource(study)}
													/>
													<span>
														<strong>{imagingKindLabels[study.kind]}</strong>
														<small>
															{formatShortDate(study.capturedAt)} · {reason}
														</small>
													</span>
												</button>
											),
										)}
									</div>
								</section>
							) : null}

							{!(
								localImageIds?.length > 0 ||
								selectedImagingStudy?.kind === "cbct"
							) && (
								<div style={{ display: "contents" }}>
									<div
										className="imaging-viewer-toolbar"
										role="toolbar"
										aria-label="Настройки рентген-снимка"
									>
										<div className="imaging-viewer-tools flex flex-nowrap overflow-x-auto items-center gap-1 min-h-[36px]">
											<button
												className="viewer-tool-button shrink-0"
												type="button"
												title="Повернуть влево"
												aria-label="Повернуть снимок влево"
												onClick={() =>
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													setImagingViewerState((state: any) => ({
														...state,
														rotationDeg: state.rotationDeg - 90,
													}))
												}
											>
												<RotateCcw aria-hidden="true" />
											</button>
											<button
												className="viewer-tool-button shrink-0"
												type="button"
												title="Повернуть вправо"
												aria-label="Повернуть снимок вправо"
												onClick={() =>
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													setImagingViewerState((state: any) => ({
														...state,
														rotationDeg: state.rotationDeg + 90,
													}))
												}
											>
												<RotateCw aria-hidden="true" />
											</button>
											<button
												className={`viewer-tool-button shrink-0 ${imagingViewerState.flipHorizontal ? "active" : ""}`}
												type="button"
												title="Зеркально"
												aria-label="Зеркально отразить снимок"
												aria-pressed={imagingViewerState.flipHorizontal}
												onClick={() =>
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													setImagingViewerState((state: any) => ({
														...state,
														flipHorizontal: !state.flipHorizontal,
													}))
												}
											>
												<FlipHorizontal aria-hidden="true" />
											</button>
											<button
												className="viewer-tool-button shrink-0 font-bold text-xs"
												type="button"
												title="Повернуть на 180° (верхняя / нижняя челюсть)"
												aria-label="Повернуть снимок на 180 градусов"
												onClick={() =>
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													setImagingViewerState((state: any) => ({
														...state,
														rotationDeg: (state.rotationDeg + 180) % 360,
													}))
												}
											>
												180°
											</button>
											<button
												className={`viewer-tool-button shrink-0 ${imagingViewerState.inverted ? "active" : ""}`}
												type="button"
												title="Инверсия (Негатив для верхушек корней и эндодонтии)"
												aria-label="Инвертировать снимок в негатив"
												aria-pressed={imagingViewerState.inverted}
												onClick={() =>
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													setImagingViewerState((state: any) => ({
														...state,
														inverted: !state.inverted,
													}))
												}
											>
												<Contrast aria-hidden="true" />
											</button>
											<button
												className="viewer-tool-button shrink-0"
												type="button"
												title="Уменьшить"
												aria-label="Уменьшить снимок"
												onClick={() =>
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													setImagingViewerState((state: any) => ({
														...state,
														zoom: Math.max(0.75, state.zoom - 0.1),
													}))
												}
											>
												<ZoomOut aria-hidden="true" />
											</button>
											<button
												className="viewer-tool-button shrink-0"
												type="button"
												title="Увеличить"
												aria-label="Увеличить снимок"
												onClick={() =>
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													setImagingViewerState((state: any) => ({
														...state,
														zoom: Math.min(1.8, state.zoom + 0.1),
													}))
												}
											>
												<ZoomIn aria-hidden="true" />
											</button>
											<button
												className="viewer-tool-button shrink-0"
												type="button"
												title="Сбросить"
												aria-label="Сбросить настройки снимка"
												onClick={() => {
													setImagingViewerState(defaultImagingViewerState);
													setImagingViewerActiveTool("window_level");
													setCtPlanningActiveQuickActionId(null);
													setCtPlanningImplantPlan(null);
												}}
											>
												<RefreshCw aria-hidden="true" />
											</button>

											{/* Переключатель усиления — появляется, когда разбор снимка есть */}
											{selectedStudySummary && (
												<label
													className="sa-enhance-toggle sa-enhance-toggle--toolbar shrink-0"
													title="Включить/выключить улучшение снимка (CLAHE симуляция)"
												>
													<input
														type="checkbox"
														checked={enhancementOn}
														onChange={(e) => setEnhancementOn(e.target.checked)}
													/>
													<span className="sa-enhance-slider" />
													<span className="sa-enhance-label">Enhanced</span>
												</label>
											)}
										</div>
										<div className="viewer-slider-grid grid grid-cols-2 gap-2 w-full static mt-1">
											<label className="text-xs font-semibold text-[var(--muted)] flex flex-col gap-1">
												<span className="flex justify-between items-center">
													<span>Яркость</span>
													<span className="text-[10px] text-[var(--teal,#0d9488)] font-mono">
														{Math.round((imagingViewerState.brightness ?? 1) * 100)}%
													</span>
												</span>
												<input
													min="0.65"
													max="1.45"
													step="0.05"
													type="range"
													value={imagingViewerState.brightness}
													onChange={(event) =>
														// biome-ignore lint/suspicious/noExplicitAny: automated suppression
														setImagingViewerState((state: any) => ({
															...state,
															brightness: Number(event.target.value),
														}))
													}
												/>
											</label>
											<label className="text-xs font-semibold text-[var(--muted)] flex flex-col gap-1">
												<span className="flex justify-between items-center">
													<span>Контраст</span>
													<span className="text-[10px] text-[var(--teal,#0d9488)] font-mono">
														{Math.round((imagingViewerState.contrast ?? 1) * 100)}%
													</span>
												</span>
												<input
													min="0.75"
													max="1.85"
													step="0.05"
													type="range"
													value={imagingViewerState.contrast}
													onChange={(event) =>
														// biome-ignore lint/suspicious/noExplicitAny: automated suppression
														setImagingViewerState((state: any) => ({
															...state,
															contrast: Number(event.target.value),
														}))
													}
												/>
											</label>
										</div>
										<section
											className={`viewer-session-strip viewer-save-state-${imagingViewerSaveState}`}
											aria-label="Автосохранение сеанса просмотра снимка"
										>
											<div>
												<strong>
													{imagingViewerSaveTitle[imagingViewerSaveState]}
												</strong>
												<span>{imagingViewerSaveDetail}</span>
											</div>
											<div
												style={{
													display: "flex",
													flexDirection: "column",
													gap: "8px",
													width: "100%",
													maxWidth: "400px",
												}}
											>
												{/* БЫЛО: однострочный input. Описание снимка в одну
                                строку не помещается — врач писал в щель на 40
                                символов. Многострочное поле с тремя строками
                                занимает столько же места, сколько занимала
                                строка с кнопкой, но текст видно целиком. */}
												<div
													style={{
														display: "flex",
														flexDirection: "column",
														gap: "4px",
													}}
												>
													<textarea
														aria-label="Заметка к снимку"
														value={imagingViewerNote}
														onChange={(event) =>
															setImagingViewerNote(event.target.value)
														}
														placeholder="Опишите снимок: что видно, какое заключение..."
														rows={imagingViewerNote ? 2 : 1}
														style={{
															width: "100%",
															resize: "vertical",
															minHeight: imagingViewerNote ? "56px" : "34px",
															lineHeight: 1.35,
															padding: "6px 8px",
															fontSize: "12px",
														}}
													/>
													<button
														type="button"
														className="text-button"
														title="Вставить заготовку описания под тип этого снимка"
														onClick={() => {
															const template = imagingDescriptionTemplate(
																selectedImagingStudy?.kind,
																selectedImagingStudy?.toothCode,
																selectedImagingStudy?.region,
															);
															// Уже написанное не затираем: дописываем ниже.
															setImagingViewerNote((prev) =>
																prev.trim()
																	? `${prev.trim()}\n\n${template}`
																	: template,
															);
														}}
														style={{
															alignSelf: "flex-start",
															display: "inline-flex",
															alignItems: "center",
															gap: "6px",
														}}
													>
														<ClipboardList size={15} aria-hidden="true" />
														Шаблон описания
													</button>
												</div>
												<div
													className="quick-chips-row"
													style={{ flexWrap: "wrap", marginTop: "4px" }}
												>
													{IMAGING_QUICK_CHIPS.map((chip) => (
														<button
															key={chip}
															type="button"
															className="quick-chip quick-chip--sm"
															onClick={() =>
																setImagingViewerNote((prev) =>
																	prev?.trim() ? `${prev.trim()}\n• ${chip}` : `• ${chip}`,
																)
															}
														>
															{chip}
														</button>
													))}
												</div>
											</div>
											<div className="viewer-session-actions">
												<button
													className="secondary-button"
													type="button"
													onClick={addImagingViewerNoteAnnotation}
													aria-describedby={
														!imagingViewerNoteReady ||
														!imagingViewerSessionReady
															? imagingViewerNoteMissingId
															: undefined
													}
													disabled={
														!imagingViewerNoteReady ||
														!imagingViewerSessionReady
													}
												>
													<Plus aria-hidden="true" /> Заметка
												</button>
												{canRetryImagingViewerSave ? (
													<button
														className="secondary-button"
														type="button"
														onClick={retryImagingViewerSessionSave}
													>
														<RefreshCw aria-hidden="true" /> Повторить
													</button>
												) : null}
											</div>
											{!imagingViewerSessionReady ? (
												<p
													className="viewer-note-missing"
													id={imagingViewerNoteMissingId}
													role="status"
													aria-live="polite"
												>
													Дождитесь загрузки просмотра, чтобы прикрепить заметку
													к снимку.
												</p>
											) : !imagingViewerNoteReady ? (
												<p
													className="viewer-note-missing"
													id={imagingViewerNoteMissingId}
													role="status"
													aria-live="polite"
												>
													Напишите текст заметки, чтобы прикрепить ее к снимку.
												</p>
											) : null}
											{canRetryImagingViewerSave && !isOnline ? (
												<p
													className="viewer-note-missing"
													id={imagingViewerRetryMissingId}
													role="status"
													aria-live="polite"
												>
													Внимание: нет подключения к сети. Повторная отправка
													сохранит снимок локально и синхронизирует при появлении связи.
												</p>
											) : null}
										</section>
										{imagingViewerAnnotations?.length ? (
											<section
												className="viewer-annotation-list"
												aria-label="Сохраненные разметки к снимкам"
											>
												{imagingViewerAnnotations
													.slice(0, 3)
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													.map((annotation: any) => (
														<article key={annotation.id}>
															<strong>{annotation.label}</strong>
															<span>
																{annotation.toothCode ??
																	selectedImagingStudy?.region ??
																	"study"}{" "}
																· {formatShortDate(annotation.updatedAt)}
															</span>
														</article>
													))}
											</section>
										) : null}
									</div>
								</div>
							)}

							{/* Отчёт помощника во всю ширину — только когда разбор снимка есть */}
							{selectedStudySummary && (
								<div className="sa-report-column">
									<ShadowAnalystReport
										summary={selectedStudySummary}
										// biome-ignore lint/suspicious/noExplicitAny: automated suppression
										toothUpdates={selectedStudyToothUpdates as any}
										studyTitle={selectedImagingStudy.title}
									/>
								</div>
							)}
						</>
					) : (
						<div className="w-full h-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-h-[420px]">
							<Suspense fallback={null}>
								<DicomArchiveUploader onImagesLoaded={setLocalImageIds} className="w-full h-full min-h-[380px]" />
							</Suspense>
						</div>
					)}
				</article>

				<div className="imaging-list">
					{/*
                    ЧТО БЫЛО. Лента снимков — это один `map` по списку. При нуле
                    записей он не рисует ничего, и на месте списка оставалась пустая
                    полоса. Врач не мог отличить три разные ситуации: снимков у
                    пациента действительно нет, их скрыл фильтр типа, или пациент не
                    выбран вовсе. Фильтр типа при переключении пациента не
                    сбрасывается, поэтому «пусто из-за фильтра» — не редкость: у
                    нового пациента снимки другого типа, а лента молчит.

                    ДОЛГ С ПРИЧИНОЙ. Состояний «загружаю» и «ошибка загрузки» здесь
                    нет: экран не получает ни признака загрузки дашборда, ни текста
                    ошибки — в списке свойств <ImagingView> в App.tsx таких нет,
                    а App.tsx в эту правку не входит. Поэтому текст ниже говорит
                    только то, что известно наверняка, и не утверждает «снимков нет»
                    там, где правильнее «ничего не пришло».
                  */}
					{visibleImagingStudies?.length === 0 ? (
						!activePatient ? (
							<EmptyState
								icon={<ImageIcon size={28} />}
								title="Пациент не выбран"
								description="Лента показывает снимки того пациента, который назван в шапке экрана. Выберите пациента в картотеке или откройте приём — снимки подтянутся сами."
							/>
						) : activeImagingStudies?.length > 0 &&
							imagingKindFilter !== "all" ? (
							<EmptyState
								icon={<ImageIcon size={28} />}
								title={`Снимков типа «${imagingKindLabels[imagingKindFilter] ?? imagingKindFilter}» у пациента нет`}
								description={`Их скрыл фильтр типа: у пациента ${countLabel(activeImagingStudies?.length, "снимок", "снимка", "снимков")} других типов.`}
								action={
									<button
										className="secondary-button"
										type="button"
										onClick={() => setImagingKindFilter("all")}
									>
										Показать все снимки
									</button>
								}
							/>
						) : (
							<EmptyState
								icon={<ImageIcon size={28} />}
								title="Снимков в карте пациента нет"
								description="В ленте только снимки, привязанные к пациенту в базе. Файлы, выбранные с диска кнопками «Папка DICOM» и «Файлы», в карту не попадают и после перезагрузки страницы не сохраняются. Кнопка «Добавить снимок вручную» создаёт карточку без файла — разобрать такой снимок нельзя."
							/>
						)
					) : null}
					{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
					{(visibleImagingStudies || []).map((study: any) => (
						<article
							className={`imaging-row imaging-${study.status} ${selectedImagingStudy?.id === study.id ? "active" : ""}`}
							key={study.id}
						>
							<div style={{ position: "relative", flexShrink: 0 }}>
								<ImagingStudyThumbnail
									study={study}
									previewSrc={imagingPreviewSource(study)}
								/>
								{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
								{(study as any).aiSummary && (
									<span
										className="sa-ai-badge"
										title="Есть AI-заключение ShadowAnalyst"
									>
										<Bot size={9} /> AI
									</span>
								)}
							</div>
							<div style={{ minWidth: 0, flex: 1 }}>
								<h3 className="truncate" title={study.title}>{study.title}</h3>
								<p className="truncate">
									{imagingKindLabels[study.kind]} ·{" "}
									{study.toothCode ?? study.region ?? "область не указана"} ·{" "}
									{formatShortDate(study.capturedAt)}
								</p>
								<span className="truncate block">
									{imagingSourceLabels[study.sourceKind]} · {study.sourceName}
								</span>
								{/*
                          Метка «без файла»: карточки, добавленные вручную, снимка не
                          содержат, и вместо изображения выше стоит нарисованная
                          заглушка. Без метки врач не отличал такую карточку от
                          настоящего снимка и узнавал правду только после отказа разбора.
                        */}
								{!imagingStudyHasFile(study) ? (
									<span
										data-testid="imaging-row-file-missing"
										style={{ color: "var(--warning-color)" }}
									>
										Файл снимка не загружен — разбор недоступен
									</span>
								) : null}
							</div>
							<div className="imaging-row-actions">
								<button
									className="text-button imaging-row-select"
									type="button"
									onClick={() => setSelectedImagingStudyId(study.id)}
									aria-pressed={selectedImagingStudy?.id === study.id}
									aria-label={`Выбрать снимок: ${study.title}, ${formatShortDate(study.capturedAt)}`}
									title={`Выбрать снимок: ${study.title}`}
								>
									{selectedImagingStudy?.id === study.id
										? "Выбрано"
										: "Выбрать"}
								</button>
								<a
									className="doc-link"
									href={imagingViewerHref(study)}
									target="_blank"
									rel="noreferrer noopener"
									aria-label={`Открыть просмотрщик снимка: ${study.title}, ${formatShortDate(study.capturedAt)}`}
									title={`Открыть просмотрщик снимка: ${study.title}`}
								>
									Открыть
								</a>
							</div>
						</article>
					))}
				</div>
			</div>

			{selectedImagingStudy?.kind === "cbct" ? (
				<section
					className="clinical-mpr-panel"
					aria-label="Управление КЛКТ и КТ-срезами"
				>
					<div className="clinical-mpr-head">
						<div>
							<p className="eyebrow">Рабочее место КЛКТ</p>
							<h3>
								3 плоскости, косой срез, панорама и внешний КТ-просмотрщик
							</h3>
							<small>
								Основной прием не блокируется: если серия тяжелая, CRM оставляет
								предпросмотр и предлагает внешний просмотр или локальный модуль
								объема.
							</small>
						</div>
						<a
							className="secondary-button"
							href={imagingViewerHref(selectedImagingStudy)}
							target="_blank"
							rel="noreferrer noopener"
							aria-label={`Открыть КТ-просмотрщик в новой вкладке: ${selectedImagingStudy.title}`}
							title={`Открыть КТ-просмотрщик в новой вкладке: ${selectedImagingStudy.title}`}
						>
							<ExternalLink aria-hidden="true" /> КТ-просмотрщик
						</a>
					</div>
					<section
						className="clinical-mpr-summary-grid"
						aria-label="Краткий статус КЛКТ"
					>
						<article>
							<strong>
								{selectedImagingViewerPlan?.mode === "cbct_mpr"
									? "Маршрут КТ-срезов"
									: "Быстрый предпросмотр"}
							</strong>
							<span>
								{selectedImagingViewerPlan?.nextAction ??
									"Откройте КТ-просмотрщик, когда нужен 3D-разбор."}
							</span>
						</article>
						<article>
							<strong>
								{dicomViewerWorkbenchManifest
									? `готовность загрузки ${dicomViewerWorkbenchManifest.readiness.readinessScore}%`
									: "Рабочее место опционально"}
							</strong>
							<span>
								{dicomViewerWorkbenchManifest
									? `${dicomLabel(dicomQualityModeLabels, dicomViewerWorkbenchManifest.renderCachePlan.qualityMode, "режим качества")} / ${dicomLabel(
											dicomTextureStrategyLabels,
											dicomViewerWorkbenchManifest.renderCachePlan
												.textureStrategy,
											"план загрузки",
										)}`
									: "Соберите КТ-пакет в настройках источников; карточка приема останется легкой."}
							</span>
						</article>
						<article>
							<strong>{imagingViewerSaveTitle[imagingViewerSaveState]}</strong>
							<span>
								{imagingViewerAnnotations?.length} разметок; исходные снимки
								остаются в просмотрщике или исходной папке.
							</span>
						</article>
					</section>
					<section
						className="mpr-clinical-roadmap"
						data-testid="ct-mpr-clinical-roadmap"
						aria-label="Клиническая готовность КТ-срезов"
					>
						<div className="mpr-clinical-roadmap-head">
							<strong>Карта КТ-срезов</strong>
							<span>{mprClinicalNextStep}</span>
						</div>
						<div className="mpr-clinical-roadmap-steps">
							{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
							{(mprClinicalChecklist ?? []).map((item: any) => (
								<article
									className={`mpr-clinical-step status-${item.status}`}
									key={item.id}
								>
									<strong>{item.title}</strong>
									<span>{item.detail}</span>
								</article>
							))}
						</div>
					</section>
					<section
						className="mpr-operator-summary"
						data-testid="ct-mpr-operator-summary"
						aria-label="Быстрая сводка настройки КТ-срезов"
					>
						{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
						{(mprOperatorSummaryCards ?? []).map((card: any) => (
							<article className={`tone-${card.tone}`} key={card.id}>
								<span>{card.title}</span>
								<strong>{card.value}</strong>
								<p>{card.detail}</p>
							</article>
						))}
					</section>
					<Suspense fallback={null}>
						<CtPlanningToolsPanel
							canPlan={mprControlsReady}
							activeTool={imagingViewerActiveTool}
							activeQuickActionId={ctPlanningActiveQuickActionId}
							onActivateTool={applyCtPlanningQuickAction}
							selectedImplantId={ctPlanningImplantPlan?.itemId ?? null}
							selectedImplantPlan={ctPlanningImplantPlan}
							onSelectImplant={selectCtPlanningImplant}
							localAnnotations={imagingViewerAnnotations}
							annotationRefs={Array.isArray(ctPlanningAnnotationRefs) ? ctPlanningAnnotationRefs : []}
							onCreateArtifact={createCtPlanningArtifact}
							toolStateBundle={
								dicomViewerWorkbenchManifest?.toolStateBundle ??
								dicomViewerToolStateBundle
							}
						/>
					</Suspense>
					<details className="clinical-mpr-advanced" open={mprControlsAutoOpen}>
						<summary>
							<span>Управление КТ-срезами</span>
							<small>
								Открывается только для КТ-разбора; обычный прием остается без
								лишних панелей.
							</small>
						</summary>
						{!mprControlsReady && (
							<div
								className="mpr-dropzone-notice p-4 mb-4 rounded-lg border border-teal-200 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/20"
								data-testid="mpr-dicom-load-dropzone-notice"
							>
								<div className="flex items-center gap-2 mb-2 text-teal-800 dark:text-teal-200">
									<UploadCloud size={18} />
									<strong className="text-sm font-semibold">
										Для управления КТ-срезами и осями загрузите файлы DICOM
									</strong>
								</div>
								<p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
									Инструменты мультипланарной реконструкции (MPR) активируются при наличии срезов в памяти. Выберите папку с исследованием или ZIP-архив срезов:
								</p>
								<Suspense fallback={null}>
									<DicomArchiveUploader onImagesLoaded={setLocalImageIds} className="w-full" />
								</Suspense>
							</div>
						)}
						<div className="clinical-mpr-grid">
							<div className="mpr-plane-grid">
								{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
								{(cbctWorkbenchPlanes ?? []).map((plane: any) => {
									const planeSupported = (
										cbctWorkbenchProjections ?? []
									).includes(plane.key);
									const planeAvailable = mprControlsReady && planeSupported;
									const planeUnavailableReason = !mprControlsReady
										? mprSeriesRequiredProjectionLabel
										: planeSupported
											? ""
											: mprUnavailableProjectionLabel;
									return (
										<button
											className={`mpr-plane ${mprProjection === plane.key ? "active" : ""}`}
											key={plane.key}
											type="button"
											onClick={() => setMprProjection(plane.key)}
											disabled={!planeAvailable}
											aria-pressed={mprProjection === plane.key}
											aria-label={`${plane.title}: ${plane.detail}${planeUnavailableReason ? `; ${planeUnavailableReason}` : ""}`}
										>
											<strong>{plane.title}</strong>
											<span>{plane.detail}</span>
											{planeUnavailableReason ? (
												<small className="mpr-plane-unavailable">
													{planeUnavailableReason}
												</small>
											) : null}
										</button>
									);
								})}
							</div>
							<div
								className={`mpr-axis-visualizer ${mprControlsReady ? "" : "disabled"}`}
								data-testid="ct-mpr-axis-visualizer"
								style={mprAxisVisualizerStyle}
								role="img"
								aria-label={mprAxisVisualizerLabel}
								aria-describedby="ct-mpr-keyboard-help"
								aria-disabled={!mprControlsReady}
								aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown Home End"
								tabIndex={mprControlsReady ? 0 : -1}
								onKeyDown={handleMprKeyboardNavigation}
							>
								<span className="visually-hidden" id="ct-mpr-keyboard-help">
									Стрелки влево и вправо меняют угол оси, стрелки вверх и вниз
									меняют срез, PageUp и PageDown меняют толщину слоя, Home и End
									переходят к началу и концу серии.
								</span>
								<div className="mpr-axis-board" aria-hidden="true">
									<span className="mpr-axis-label mpr-axis-label-top">
										{mprProjectionCompass?.top}
									</span>
									<span className="mpr-axis-label mpr-axis-label-right">
										{mprProjectionCompass?.right}
									</span>
									<span className="mpr-axis-label mpr-axis-label-bottom">
										{mprProjectionCompass?.bottom}
									</span>
									<span className="mpr-axis-label mpr-axis-label-left">
										{mprProjectionCompass?.left}
									</span>
									<span className="mpr-axis-slab" />
									<span className="mpr-axis-slice-marker" />
									<span className="mpr-axis-line mpr-axis-line-primary" />
									<span className="mpr-axis-line mpr-axis-line-secondary" />
									<span
										className={`mpr-axis-crosshair ${mprCrosshairEnabled ? "active" : ""}`}
									/>
									<span className="mpr-axis-angle-badge">
										{mprAxisAngleBadge}
									</span>
									<span className="mpr-axis-slab-badge">{mprSlabBadge}</span>
									<span className="mpr-axis-slice-badge">{mprSliceBadge}</span>
								</div>
								<div className="mpr-axis-facts">
									<strong>{mprActiveProjectionLabel}</strong>
									<span>{mprActiveProjectionOrientation}</span>
									<span>{mprProjectionCompass?.summary}</span>
									<span>{mprAxisDirectionLabel}</span>
									<span>слой {mprSlabMm} мм</span>
									<span>{mprSliceLabel}</span>
									<div
										className="mpr-axis-guidance"
										data-testid="ct-mpr-axis-guidance"
									>
										<span>{mprAxisGuidance?.tiltLabel ?? ""}</span>
										<span>{mprAxisGuidance?.slabLabel ?? ""}</span>
										<span>{mprAxisGuidance?.sliceLabel ?? ""}</span>
									</div>
									<small
										className="mpr-workbench-summary"
										data-testid="ct-mpr-workbench-summary"
										aria-live="polite"
									>
										{mprWorkbenchSummaryText}
									</small>
									<small>
										{mprControlsReady
											? `${mprLinkedPlanesEnabled ? "плоскости связаны" : "плоскости отдельно"} · ${mprCrosshairEnabled ? "курсор включен" : "курсор скрыт"}`
											: "сначала откройте готовую КЛКТ/КТ-серию"}
									</small>
									<div
										className={`mpr-preset-fit ${mprNearestClinicalPreset?.exact ? "exact" : ""}`}
										data-testid="ct-mpr-preset-fit"
									>
										<span>{mprNearestClinicalPreset?.label ?? "пользовательский протокол"}</span>
										<button
											type="button"
											onClick={applyNearestMprClinicalPreset}
											disabled={
												!mprControlsReady ||
												!mprNearestClinicalPreset?.deltas?.length ||
												!mprNearestClinicalPreset?.title
											}
											aria-label={`Подогнать КТ-срезы под ближайший клинический протокол: ${mprNearestClinicalPreset?.label ?? ""}`}
											title={`Подогнать под протокол: ${mprNearestClinicalPreset?.label ?? ""}`}
										>
											Подогнать
										</button>
									</div>
								</div>
							</div>
							<div className="mpr-control-panel">
								<div className="mpr-toggle-row">
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{(cbctWorkbenchProjections ?? []).map((projection: any) => (
										<button
											className={mprProjection === projection ? "active" : ""}
											key={projection}
											type="button"
											onClick={() => setMprProjection(projection)}
											disabled={!mprControlsReady}
											aria-pressed={mprProjection === projection}
										>
											{mprProjectionLabels[projection]}
										</button>
									))}
								</div>
								<label>
									Угол оси: {mprAxisDeg}°
									<input
										aria-valuetext={mprAxisRangeValue}
										disabled={!mprControlsReady}
										min={mprAxisBounds.min}
										max={mprAxisBounds.max}
										step="1"
										type="range"
										value={mprAxisDeg}
										onChange={(event) =>
											setMprAxisDeg(clampMprAxisDeg(Number(event.target.value)))
										}
									/>
								</label>
								<fieldset
									className="mpr-stepper-row"
									data-testid="ct-mpr-axis-nudge"
									aria-label="Точная правка угла КТ-срезов"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{(mprAxisNudgeDeg ?? []).map((delta: any) => (
										<button
											key={delta}
											type="button"
											onClick={() =>
												setMprAxisDeg(clampMprAxisDeg(mprAxisDeg + delta))
											}
											disabled={!mprControlsReady}
											aria-label={`Изменить угол оси КТ-среза на ${formatSignedMprStep(delta, "°")}`}
										>
											{formatSignedMprStep(delta, "°")}
										</button>
									))}
								</fieldset>
								<fieldset
									className="mpr-preset-row"
									aria-label="Быстрые углы КТ-срезов"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{(mprAxisPresetDeg ?? []).map((angle: any) => (
										<button
											className={mprAxisDeg === angle ? "active" : ""}
											key={angle}
											type="button"
											onClick={() => setMprAxisDeg(angle)}
											disabled={!mprControlsReady}
											aria-pressed={mprAxisDeg === angle}
											aria-label={`Установить угол оси КТ-срезов ${angle > 0 ? `+${angle}` : angle}°`}
										>
											{angle > 0 ? `+${angle}°` : `${angle}°`}
										</button>
									))}
								</fieldset>
								<label>
									Толщина слоя: {mprSlabMm} мм
									<input
										aria-valuetext={mprSlabRangeValue}
										disabled={!mprControlsReady}
										min={mprSlabBounds.min}
										max={mprSlabBounds.max}
										step="1"
										type="range"
										value={mprSlabMm}
										onChange={(event) =>
											setMprSlabMm(clampMprSlabMm(Number(event.target.value)))
										}
									/>
								</label>
								<fieldset
									className="mpr-stepper-row"
									data-testid="ct-mpr-slab-nudge"
									aria-label="Точная правка толщины слоя КТ-срезов"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{(mprSlabNudgeMm ?? []).map((delta: any) => (
										<button
											key={delta}
											type="button"
											onClick={() =>
												setMprSlabMm(clampMprSlabMm(mprSlabMm + delta))
											}
											disabled={!mprControlsReady}
											aria-label={`Изменить толщину слоя КТ-срезов на ${formatSignedMprStep(delta, " мм")}`}
										>
											{formatSignedMprStep(delta, " мм")}
										</button>
									))}
								</fieldset>
								<fieldset
									className="mpr-preset-row"
									aria-label="Быстрая толщина слоя КТ-срезов"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{(mprSlabPresetMm ?? []).map((slab: any) => (
										<button
											className={mprSlabMm === slab ? "active" : ""}
											key={slab}
											type="button"
											onClick={() => setMprSlabMm(slab)}
											disabled={!mprControlsReady}
											aria-pressed={mprSlabMm === slab}
											aria-label={`Установить толщину слоя КТ-срезов ${slab} мм`}
										>
											{slab} мм
										</button>
									))}
									<button
										type="button"
										onClick={() => setMprAxisDeg(0)}
										disabled={!mprControlsReady}
										aria-pressed={mprAxisDeg === 0}
										aria-label="Вернуть ось КТ-срезов к 0°"
									>
										<RotateCcw aria-hidden="true" /> ось 0°
									</button>
								</fieldset>
								<label>
									Положение среза: {mprSliceLabel}
									<input
										disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
										min="0"
										max={mprSliceMaxIndex}
										step="1"
										type="range"
										value={mprSafeSliceIndex}
										aria-valuetext={mprSliceRangeValue}
										onChange={(event) =>
											setMprSliceIndex(
												clampMprSliceIndex(
													Number(event.target.value),
													mprSliceMaxIndex,
												),
											)
										}
									/>
								</label>
								<fieldset
									className="mpr-manual-grid"
									data-testid="ct-mpr-manual-inputs"
									aria-label="Точные числовые настройки КТ-срезов"
								>
									<label>
										Угол, °
										<input
											disabled={!mprControlsReady}
											inputMode="numeric"
											max={mprAxisBounds.max}
											min={mprAxisBounds.min}
											step="1"
											type="number"
											value={mprAxisDeg}
											onChange={(event) =>
												setMprAxisDeg(
													clampMprAxisDeg(Number(event.target.value)),
												)
											}
										/>
									</label>
									<label>
										Слой, мм
										<input
											disabled={!mprControlsReady}
											inputMode="numeric"
											max={mprSlabBounds.max}
											min={mprSlabBounds.min}
											step="1"
											type="number"
											value={mprSlabMm}
											onChange={(event) =>
												setMprSlabMm(clampMprSlabMm(Number(event.target.value)))
											}
										/>
									</label>
									<label>
										Срез
										<input
											disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
											inputMode="numeric"
											max={mprSliceMaxIndex + 1}
											min="1"
											step="1"
											type="number"
											value={mprSafeSliceIndex + 1}
											onChange={(event) =>
												setMprSliceIndex(
													clampMprSliceIndex(
														Number(event.target.value) - 1,
														mprSliceMaxIndex,
													),
												)
											}
										/>
									</label>
								</fieldset>
								<fieldset
									className="mpr-stepper-row"
									data-testid="ct-mpr-slice-nudge"
									aria-label="Точная навигация по КТ-срезам"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{(mprSliceNudgeSteps ?? []).map((delta: any) => (
										<button
											key={delta}
											type="button"
											onClick={() =>
												setMprSliceIndex(
													clampMprSliceIndex(
														mprSafeSliceIndex + delta,
														mprSliceMaxIndex,
													),
												)
											}
											disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
											aria-label={`Перейти по КТ-срезам на ${formatSignedMprStep(delta, " срез")}`}
										>
											{formatSignedMprStep(delta, " срез")}
										</button>
									))}
								</fieldset>
								<fieldset
									className="mpr-preset-row"
									aria-label="Опорные КТ-срезы"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{(mprSlicePresetFractions ?? []).map((preset: any) => {
										const targetIndex = mprSliceIndexFromFraction(
											preset.fraction,
											mprSliceMaxIndex,
										);
										return (
											<button
												className={
													mprSafeSliceIndex === targetIndex ? "active" : ""
												}
												key={preset.id}
												type="button"
												onClick={() => setMprSliceIndex(targetIndex)}
												disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
												aria-pressed={mprSafeSliceIndex === targetIndex}
												aria-label={`Перейти на опорный КТ-срез: ${preset.label}`}
											>
												{preset.label}
											</button>
										);
									})}
								</fieldset>
								<button
									className="mpr-reset-button"
									type="button"
									onClick={resetMprControls}
									disabled={!mprControlsReady}
								>
									<RefreshCw aria-hidden="true" /> Сбросить КТ-срезы
								</button>
								<div
									className="mpr-memory-strip"
									data-testid="ct-mpr-memory-strip"
								>
									<div>
										<strong>
											{mprWorkbenchLocalSavedAt
												? `Последний вид ${formatTime(mprWorkbenchLocalSavedAt)}`
												: "Последний вид появится после настройки"}
										</strong>
										<span>
											{mprWorkbenchDraftRestored
												? "Серия открыта с сохраненными осями, окном и толщиной слоя."
												: "Ось, толщина слоя, окно, курсор и связанные плоскости запоминаются для этой КТ-серии."}
										</span>
									</div>
									<button
										type="button"
										onClick={restoreMprWorkbenchLocalDraft}
										disabled={!mprControlsReady || !mprWorkbenchLocalSavedAt}
									>
										<History aria-hidden="true" /> Вернуть вид
									</button>
								</div>
								<fieldset
									className="mpr-clinical-preset-grid"
									data-testid="ct-mpr-clinical-presets"
									aria-label="Клинические протоколы КТ-срезов"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{(mprClinicalPresets || []).map((preset: any) => {
										const projectionFallbackNote = mprControlsReady
											? describeMprClinicalPresetProjectionFallback(
													preset.projection,
													cbctWorkbenchProjections,
													mprProjectionLabels,
												)
											: null;
										return (
											<button
												className={
													typeof mprClinicalPresetButtonClass === "function"
														? mprClinicalPresetButtonClass(preset)
														: ""
												}
												key={preset.id}
												type="button"
												onClick={() => applyMprClinicalPreset?.(preset)}
												aria-current={
													mprNearestClinicalPreset?.exact &&
													mprNearestClinicalPreset?.title === preset.title
														? "true"
														: undefined
												}
												disabled={!mprControlsReady}
											>
												<strong>{preset.title}</strong>
												<span>{preset.detail}</span>
												{projectionFallbackNote ? (
													<small>{projectionFallbackNote}</small>
												) : null}
											</button>
										);
									})}
								</fieldset>
								<div className="mpr-toggle-row">
									{(
										Object.keys(mprWindowPresetLabels) as MprWindowPreset[]
									).map((preset) => (
										<button
											className={mprWindowPreset === preset ? "active" : ""}
											key={preset}
											type="button"
											onClick={() => setMprWindowPreset(preset)}
											disabled={!mprControlsReady}
											aria-pressed={mprWindowPreset === preset}
										>
											{mprWindowPresetLabels[preset]}
										</button>
									))}
								</div>
								<div className="mpr-check-row">
									<label>
										<input
											checked={mprCrosshairEnabled}
											disabled={!mprControlsReady}
											type="checkbox"
											onChange={(event) =>
												setMprCrosshairEnabled(event.target.checked)
											}
										/>
										Синхронный курсор
									</label>
									<label>
										<input
											checked={mprLinkedPlanesEnabled}
											disabled={!mprControlsReady}
											type="checkbox"
											onChange={(event) =>
												setMprLinkedPlanesEnabled(event.target.checked)
											}
										/>
										Связанные плоскости
									</label>
								</div>
								{!mprControlsReady ? (
									<p className="mpr-control-disabled-note" role="status">
										Сначала откройте готовую КЛКТ/КТ-серию. После этого
										включатся оси, толщина слоя и связанные плоскости.
									</p>
								) : null}
							</div>
						</div>
					</details>
					<div className="clinical-mpr-safety">
						<span>
							{selectedImagingViewerPlan?.nextAction ??
								"Подготовить серию КЛКТ/КТ к просмотру срезов."}
						</span>
						<span>
							{cbctWorkbenchSeries?.mprReadiness.resourcePolicy.nextAction ??
								"Метаданные серии пока не загружены: сначала открываем предпросмотр и внешний просмотр."}
						</span>
						<span>
							ИИ-описание не является диагнозом; врач подтверждает все выводы.
						</span>
					</div>
				</section>
			) : null}

			{isCbctWorkspaceOpen && (
				<Suspense fallback={<div className="cbct-mpr-workspace-modal fixed inset-0 z-50 flex items-center justify-center bg-black/90 text-white text-xs">Загрузка 3D КТ...</div>}>
					<CbctMprWorkspace
						isOpen={true}
						onClose={() => setIsCbctWorkspaceOpen(false)}
						patientId={activePatient?.id ?? null}
						{...(activePatient?.fullName ? { patientName: activePatient.fullName } : {})}
					/>
				</Suspense>
			)}

			{isPanoramicWindowOpen && (
				<div className="panoramic-recon-window-modal fixed inset-0 z-50 flex items-center justify-center bg-black/80">
					<Suspense fallback={<div className="p-4 text-xs text-[var(--muted)]">Загрузка 3D КТ...</div>}>
						<PanoramicRendererWindow
							volume={null}
							splinePoints={[]}
							onClose={() => setIsPanoramicWindowOpen(false)}
							patientId={activePatient?.id ?? null}
						/>
					</Suspense>
				</div>
			)}
		</section>
	);
}
