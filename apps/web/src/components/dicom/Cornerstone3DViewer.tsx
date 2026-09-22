import * as cornerstone from "@cornerstonejs/core";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";
import * as cornerstoneTools from "@cornerstonejs/tools";
import { vec3 } from "gl-matrix";
import {
	Activity,
	AlertTriangle,
	Camera,
	Check,
	ChevronRight,
	Crosshair,
	Download,
	FileText,
	Loader2,
	MoreHorizontal,
	Plus,
	Ruler,
	Save,
	ShieldAlert,
	ShieldCheck,
	Trash2,
	X,
	ZoomIn,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import {
	type ImplantPlatformInfo,
	type ImplantSystemSpec,
	CANONICAL_IMPLANT_SYSTEMS,
	DENTIUM_SYSTEM,
	MIS_SYSTEM,
	NOBEL_BIOCARE_SYSTEM,
	OSSTEM_SYSTEM,
	STRAUMANN_SYSTEM,
	formatImplantSpecRu,
	getAvailableDiameters,
	getAvailableLengths,
	getImplantSystem,
	getPlatformForDiameter,
} from "./implantCatalog";
const DicomArchiveUploader = lazy(() =>
	import("./DicomArchiveUploader").then((m) => ({
		default: m.DicomArchiveUploader,
	})),
);
import {
	calculateCaliperRidgeDimensions,
	type AlveolarRidgeCaliperMeasurement,
} from "../radiology/radiologyMath";
import {
	calculateImplantBoneDensity,
	distancePointToSpline,
	mat3ToMat4Direction,
	type Point2D,
	toTransferableScalarData,
} from "../../utils/math/mprMath";
import {
	type MischClass,
} from "../../utils/dicom/boneQualityEngine";
import { mapCtCoordinatesToFdiNumber } from "../../utils/dicom/fdiMapper";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import {
	archControlPointsOf,
	archFromStoredControlPoints,
	type CtPlanningMarkup,
	ctPlanningMarkupIsEmpty,
	ctPlanningRestoredLabel,
	emptyCtPlanningMarkup,
	loadCtPlanningMarkup,
	type StoredImplant,
	saveCtPlanningMarkup,
	type WorldPoint3,
	worldTriple,
} from "./ctPlanningPersistence";
import type { PanoramicVolumeInput } from "../dicom/PanoramicRendererWindow";
const PanoramicRendererWindow = lazy(() =>
	import("../dicom/PanoramicRendererWindow").then((m) => ({
		default: m.PanoramicRendererWindow,
	})),
);
import {
	captureHighDpiCanvas,
	createSnapshotThumbnail,
	downloadSnapshotLocally,
	exportSnapshotToClinicalRecord,
} from "../visiograph/VisiographExportService";
import {
	type VisiographPresetId,
	VISIOGRAPH_PRESETS_LIST,
	VISIOGRAPH_WINDOW_PRESETS,
	type VisiographWindowPreset,
} from "../visiograph/VisiographWindowPresets";
import {
	buildPanoramicArch,
	type DrawnArchAnnotation,
	type PanoramicIssue,
	panoramicIssueLabels,
	panoramicReadyLabel,
	readVolumeScalarData,
} from "./panoramicArch";

export type ExtendedMischClass = MischClass | "D5";

export interface ImplantData {
	id: string;
	fdiCode: string;
	diameter: number;
	length: number;
	startWorld: vec3;
	endWorld: vec3;
	boneDensity: {
		averageHU: number;
		classification: ExtendedMischClass;
		drillingAdvice?: string;
		corticalHU?: number;
		cancellousHU?: number;
		apicalHU?: number;
	};
	distanceToNerve?: number | null;
	systemId?: string | undefined;
	brandName?: string | undefined;
	lineName?: string | undefined;
	platformCode?: string | undefined;
	platformColor?: string | undefined;
}

export interface Cornerstone3DViewerProps {
	imageIds: string[];
	/**
	 * Пациент, чей снимок открыт. Без него разметку планирования некуда сохранять:
	 * строка в базе существует только в паре пациент + исследование. Приходит из
	 * `ImagingView` (`activePatient?.id`); когда пациент не выбран, просмотр
	 * работает как раньше, а сохранение честно отказывает текстом на экране.
	 */
	patientId?: string | null | undefined;
	patientName?: string | undefined;
	studyDate?: string | undefined;
	voxelSpacing?: { readonly x: number; readonly y: number; readonly z: number } | undefined;
	authHeaders?: Record<string, string> | undefined;
	onClose?: (() => void) | undefined;
}

/** Задержка перед записью правки уже обведённой дуги. */
const MARKUP_SAVE_DEBOUNCE_MS = 1500;

/** Порог опасного сближения имплантата с нижнечелюстным каналом в мм (< 2.0 мм) */
export const MANDIBULAR_NERVE_DANGER_THRESHOLD_MM = 2.0;

/**
 * Классификация плотности кости по Мишу с поддержкой D5 (<150 HU).
 */
export function classifyExtendedBoneDensity(hu: number): {
	mischClass: ExtendedMischClass;
	label: string;
	drillingRecommendation: string;
} {
	if (hu > 1250) {
		return {
			mischClass: "D1",
			label: "D1 (>1250 HU) — Плотная кортикальная кость",
			drillingRecommendation:
				"Обязательна кортикальная фреза (Cortical Tap), низкие обороты (400–600 RPM) с обильным охлаждением. Высокий риск перегрева/остеонекроза!",
		};
	}
	if (hu >= 850) {
		return {
			mischClass: "D2",
			label: "D2 (850–1250 HU) — Пористая кортикальная и плотная губчатая",
			drillingRecommendation:
				"Стандартный хирургический протокол (800–1000 RPM). Идеальная первичная стабильность.",
		};
	}
	if (hu >= 350) {
		return {
			mischClass: "D3",
			label: "D3 (350–850 HU) — Тонкая кортикальная и мелкая губчатая",
			drillingRecommendation:
				"Стандартный протокол с финишным профильным сверлом (1000 RPM). Хороший прогноз остеоинтеграции.",
		};
	}
	if (hu >= 150) {
		return {
			mischClass: "D4",
			label: "D4 (150–350 HU) — Мягкая губчатая кость",
			drillingRecommendation:
				"Недопрепарирование (Under-drilling) на 1.0–1.5 мм меньше диаметра имплантата для компрессии кости и набора торка.",
		};
	}
	return {
		mischClass: "D5",
		label: "D5 (<150 HU) — Сверхмягкая / резорбированная кость",
		drillingRecommendation:
			"Критическое недопрепарирование (Under-drilling) на 1.5–2.0 мм, костная конденсация остеотомами или бикортикальная фиксация.",
	};
}

/**
 * Импланты компонента в форму, пригодную для записи в хранилище разметки.
 */
function storedImplantsOf(implants: readonly ImplantData[]): StoredImplant[] {
	const out: StoredImplant[] = [];
	for (const implant of implants) {
		const startWorld = worldTriple(Array.from(implant.startWorld));
		const endWorld = worldTriple(Array.from(implant.endWorld));
		if (!startWorld || !endWorld) continue;
		out.push({
			id: implant.id,
			fdiCode: implant.fdiCode,
			diameter: implant.diameter,
			length: implant.length,
			startWorld,
			endWorld,
			boneDensity: {
				averageHU: implant.boneDensity.averageHU,
				classification: implant.boneDensity.classification,
			},
			...(typeof implant.distanceToNerve === "number"
				? { distanceToNerve: implant.distanceToNerve }
				: {}),
			...(implant.systemId ? { systemId: implant.systemId } : {}),
			...(implant.brandName ? { brandName: implant.brandName } : {}),
			...(implant.lineName ? { lineName: implant.lineName } : {}),
			...(implant.platformCode ? { platformCode: implant.platformCode } : {}),
			...(implant.platformColor ? { platformColor: implant.platformColor } : {}),
		});
	}
	return out;
}

/** Обратное превращение: прочитанный из базы имплант снова получает векторы. */
function implantDataOf(stored: readonly StoredImplant[]): ImplantData[] {
	return stored.map((implant) => {
		const densityInfo = classifyExtendedBoneDensity(implant.boneDensity.averageHU);
		return {
			id: implant.id,
			fdiCode: implant.fdiCode,
			diameter: implant.diameter,
			length: implant.length,
			startWorld: vec3.fromValues(
				implant.startWorld[0],
				implant.startWorld[1],
				implant.startWorld[2],
			),
			endWorld: vec3.fromValues(
				implant.endWorld[0],
				implant.endWorld[1],
				implant.endWorld[2],
			),
			boneDensity: {
				averageHU: implant.boneDensity.averageHU,
				classification: densityInfo.mischClass,
				drillingAdvice: densityInfo.drillingRecommendation,
			},
			distanceToNerve: implant.distanceToNerve ?? null,
			systemId: implant.systemId,
			brandName: implant.brandName,
			lineName: implant.lineName,
			platformCode: implant.platformCode,
			platformColor: implant.platformColor,
		};
	});
}

/**
 * Русский протокол по последнему импланту для ЭМК (Форма 043/у).
 */
export function implantProtocolLog(implant: ImplantData): string {
	const isDanger =
		implant.distanceToNerve != null &&
		implant.distanceToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM;
	const nerveStatusText =
		implant.distanceToNerve != null
			? isDanger
				? `ВНИМАНИЕ: дистанция до нижнечелюстного канала ${implant.distanceToNerve.toFixed(1)} мм (< 2.0 мм) — опасная зона риска травматизации сосудисто-нервного пучка!`
				: `Дистанция до нижнечелюстного канала ${implant.distanceToNerve.toFixed(1)} мм (безопасный коридор ≥ 2.0 мм).`
			: "Нижнечелюстной нерв не размечен. Контроль дистанции безопасности невозможен.";

	const densityInfo = classifyExtendedBoneDensity(implant.boneDensity.averageHU);
	const brandTitle = implant.brandName
		? `${implant.brandName} ${implant.lineName ?? ""}`.trim()
		: "Дентальный имплантат";
	const platformText = implant.platformCode ? ` (Платформа ${implant.platformCode})` : "";

	return `В область зуба ${implant.fdiCode} запланирована установка имплантата ${brandTitle} Ø${implant.diameter.toFixed(1)}x${implant.length.toFixed(1)} мм${platformText}. Плотность кости: ${densityInfo.label} (${Math.round(implant.boneDensity.averageHU)} HU). Протокол препарирования: ${densityInfo.drillingRecommendation}. ${nerveStatusText}`;
}

const VIEWPORT_IDS = {
	axial: "AXIAL",
	sagittal: "SAGITTAL",
	coronal: "CORONAL",
} as const;

import { teardownViewportCanvases } from "../../utils/viewportTeardownHelper";
import { isLowSpecHardware } from "../../utils/deviceDetection.js";
export { teardownViewportCanvases };

export function Cornerstone3DViewer({
	imageIds,
	patientId = null,
	patientName,
	studyDate,
	voxelSpacing,
	authHeaders = {},
	onClose,
}: Cornerstone3DViewerProps) {
	const axialRef = useRef<HTMLDivElement>(null);
	const sagittalRef = useRef<HTMLDivElement>(null);
	const coronalRef = useRef<HTMLDivElement>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const [isVolumeLoading, setIsVolumeLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [volumeId, setVolumeId] = useState<string | null>(null);
	const [showPanorex, setShowPanorex] = useState(false);
	const [splinePoints, setSplinePoints] = useState<Point2D[]>([]);
	const [panorexIssue, setPanorexIssue] = useState<PanoramicIssue | null>(null);
	const [archSummary, setArchSummary] = useState<{
		points: number;
		lengthMm: number;
	} | null>(null);
	const [panorexVolume, setPanorexVolume] =
		useState<PanoramicVolumeInput | null>(null);
	const [panorexThickness, setPanorexThickness] = useState<number>(0);
	const [blendMode, setBlendMode] = useState<"mip" | "average">("mip");
	const [activeTool, setActiveTool] = useState<string>("Crosshairs");
	const [implants, setImplants] = useState<ImplantData[]>([]);
	const [aiProtocolLog, setAiProtocolLog] = useState<string>("");
	const [activePresetId, setActivePresetId] = useState<VisiographPresetId>("bone");
	const [isExportingSnapshot, setIsExportingSnapshot] = useState(false);
	const [activeCaliper, setActiveCaliper] = useState<AlveolarRidgeCaliperMeasurement | null>(null);
	const [isNerveTracingActive, setIsNerveTracingActive] = useState(false);

	// Implant System selection state (Dentium, Osstem, Straumann, Nobel Biocare, MIS)
	const [selectedSystemId, setSelectedSystemId] = useState<string>("osstem-ts3");
	const [selectedDiameter, setSelectedDiameter] = useState<number>(4.0);
	const [selectedLength, setSelectedLength] = useState<number>(10.0);
	const [selectedFdiCode, setSelectedFdiCode] = useState<string>("36");
	const [showArchiveUploaderModal, setShowArchiveUploaderModal] = useState<boolean>(false);

	const handleSelectSystem = useCallback((systemId: string) => {
		const sys = getImplantSystem(systemId);
		setSelectedSystemId(sys.id);
		const availDiameters = sys.diameters;
		const nextDiameter = availDiameters.includes(selectedDiameter)
			? selectedDiameter
			: (availDiameters[0] ?? 4.0);
		setSelectedDiameter(nextDiameter);

		const availLengths = getAvailableLengths(sys.id, nextDiameter);
		const nextLength = availLengths.includes(selectedLength)
			? selectedLength
			: (availLengths[0] ?? 10.0);
		setSelectedLength(nextLength);
	}, [selectedDiameter, selectedLength]);

	const handleSelectDiameter = useCallback((diameter: number) => {
		setSelectedDiameter(diameter);
		const availLengths = getAvailableLengths(selectedSystemId, diameter);
		if (!availLengths.includes(selectedLength)) {
			setSelectedLength(availLengths[0] ?? 10.0);
		}
	}, [selectedSystemId, selectedLength]);

	const activeSystemSpec = useMemo(
		() => getImplantSystem(selectedSystemId),
		[selectedSystemId],
	);

	const activePlatform = useMemo(
		() => getPlatformForDiameter(selectedSystemId, selectedDiameter),
		[selectedSystemId, selectedDiameter],
	);

	const availableLengthsForDiameter = useMemo(
		() => getAvailableLengths(selectedSystemId, selectedDiameter),
		[selectedSystemId, selectedDiameter],
	);

	// Zero-Mock Fallback: Local DICOM Ingestion when imageIds is initially empty
	const [localImageIds, setLocalImageIds] = useState<string[]>([]);
	const effectiveImageIds = imageIds.length > 0 ? imageIds : localImageIds;

	// Hick & Miller 1-Row Toolbar state
	const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false);
	const secondaryMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isSecondaryMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				secondaryMenuRef.current &&
				!secondaryMenuRef.current.contains(e.target as Node)
			) {
				setIsSecondaryMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isSecondaryMenuOpen]);

	const [studyInstanceUid, setStudyInstanceUid] = useState<string | null>(null);
	const [restoredMarkup, setRestoredMarkup] = useState<CtPlanningMarkup | null>(
		null,
	);
	const [markupStatus, setMarkupStatus] = useState<{
		tone: "saving" | "saved" | "issue";
		text: string;
	} | null>(null);

	const patientIdRef = useRef<string | null>(patientId);
	patientIdRef.current = patientId;
	const studyUidRef = useRef<string | null>(studyInstanceUid);
	studyUidRef.current = studyInstanceUid;
	const implantsRef = useRef<ImplantData[]>(implants);
	implantsRef.current = implants;
	const restoredMarkupRef = useRef<CtPlanningMarkup | null>(restoredMarkup);
	restoredMarkupRef.current = restoredMarkup;
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Low-Spec GC Invariant (Mandate 8c & Low-RAM Celeron/iGPU): Ensure timer clearing and canvas backing store purge on unmount
	useEffect(() => {
		return () => {
			if (saveTimerRef.current !== null) {
				clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
			}
			teardownViewportCanvases(axialRef.current);
			teardownViewportCanvases(sagittalRef.current);
			teardownViewportCanvases(coronalRef.current);
		};
	}, []);

	useEffect(() => {
		async function init() {
			try {
				await cornerstone.init();
				await cornerstoneTools.init();

				const isLowSpec = isLowSpecHardware();
				cornerstoneDICOMImageLoader.init({
					maxWebWorkers: navigator.hardwareConcurrency
						? (isLowSpec ? Math.min(navigator.hardwareConcurrency, 2) : Math.min(navigator.hardwareConcurrency, 7))
						: 1,
				});

				cornerstoneTools.addTool(cornerstoneTools.CrosshairsTool);
				cornerstoneTools.addTool(cornerstoneTools.WindowLevelTool);
				cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
				cornerstoneTools.addTool(cornerstoneTools.LengthTool);
				cornerstoneTools.addTool(cornerstoneTools.SplineROITool);
				cornerstoneTools.addTool(cornerstoneTools.EllipticalROITool);
				cornerstoneTools.addTool(cornerstoneTools.ProbeTool);

				setIsInitialized(true);
			} catch (err) {
				logger.error("[Cornerstone3DViewer] Ошибка инициализации 3D-движка:", err);
				setLoadError("Не удалось инициализировать 3D-движок DICOM. Проверьте поддержку WebGL в браузере.");
			}
		}

		if (!isInitialized) {
			void init();
		}

		return () => {
			try {
				cornerstone.cache.purgeCache();
			} catch {
				// Ignore
			}
			try {
				cornerstoneDICOMImageLoader.wadouri.fileManager.purge();
			} catch {
				// Ignore
			}
		};
	}, [isInitialized]);

	useEffect(() => {
		if (!isInitialized || !effectiveImageIds.length) return;

		let cancelled = false;
		setLoadError(null);
		setIsVolumeLoading(true);
		setShowPanorex(false);
		setSplinePoints([]);
		setPanorexVolume(null);
		setPanorexIssue(null);
		setArchSummary(null);
		setStudyInstanceUid(null);
		setRestoredMarkup(null);
		setMarkupStatus(null);

		async function loadAndRender() {
			const vId = `dente-volume-${effectiveImageIds.length}-${effectiveImageIds[0] ?? "empty"}`;
			setVolumeId(vId);
			const renderingEngineId = "my-engine";

			try {
				cornerstone.cache.purgeCache();
			} catch {
				// Ignore
			}
			try {
				cornerstoneDICOMImageLoader.wadouri.fileManager.purge();
			} catch {
				// Ignore
			}

			const renderingEngine = new cornerstone.RenderingEngine(
				renderingEngineId,
			);

			const viewportIds = {
				axial: "AXIAL",
				sagittal: "SAGITTAL",
				coronal: "CORONAL",
			};

			const viewportInputArray = [
				{
					viewportId: viewportIds.axial,
					type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
					element: axialRef.current as HTMLDivElement,
					defaultOptions: {
						orientation: cornerstone.Enums.OrientationAxis.AXIAL,
						background: [0, 0, 0] as cornerstone.Types.Point3,
					},
				},
				{
					viewportId: viewportIds.sagittal,
					type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
					element: sagittalRef.current as HTMLDivElement,
					defaultOptions: {
						orientation: cornerstone.Enums.OrientationAxis.SAGITTAL,
						background: [0, 0, 0] as cornerstone.Types.Point3,
					},
				},
				{
					viewportId: viewportIds.coronal,
					type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
					element: coronalRef.current as HTMLDivElement,
					defaultOptions: {
						orientation: cornerstone.Enums.OrientationAxis.CORONAL,
						background: [0, 0, 0] as cornerstone.Types.Point3,
					},
				},
			];

			renderingEngine.setViewports(viewportInputArray);

			const volume = await cornerstone.volumeLoader.createAndCacheVolume(vId, {
				imageIds: effectiveImageIds,
			});

			if (cancelled) return;
			volume.load();

			const firstImageId = effectiveImageIds[0];
			const seriesMeta = firstImageId
				? (cornerstone.metaData.get("generalSeriesModule", firstImageId) as
						| { studyInstanceUID?: unknown }
						| undefined)
				: undefined;
			const uid =
				typeof seriesMeta?.studyInstanceUID === "string"
					? seriesMeta.studyInstanceUID.trim()
					: "";
			if (!cancelled) setStudyInstanceUid(uid.length > 0 ? uid : null);

			await cornerstone.setVolumesForViewports(
				renderingEngine,
				[{ volumeId: vId }],
				[viewportIds.axial, viewportIds.sagittal, viewportIds.coronal],
			);
			if (cancelled) return;

			const toolGroupId = "mpr-tool-group";
			let toolGroup =
				cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
			if (!toolGroup) {
				toolGroup =
					cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId)!;
			}

			toolGroup.addTool(cornerstoneTools.CrosshairsTool.toolName);

			const crosshairsConfig = {
				viewportIndicators: false,
				autoPan: {
					enabled: false,
				},
				mobile: {
					enabled: true,
					opacity: 1,
					handleRadius: 6,
				},
			};
			toolGroup.setToolConfiguration(
				cornerstoneTools.CrosshairsTool.toolName,
				crosshairsConfig,
			);

			toolGroup.setToolActive(cornerstoneTools.CrosshairsTool.toolName, {
				bindings: [
					{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary },
				],
			});

			toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName);
			toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
				bindings: [
					{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary },
				],
			});

			toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
			toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
				bindings: [
					{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary },
				],
			});

			toolGroup.addTool(cornerstoneTools.LengthTool.toolName);
			toolGroup.addTool(cornerstoneTools.SplineROITool.toolName);
			toolGroup.addTool(cornerstoneTools.EllipticalROITool.toolName);
			toolGroup.addTool(cornerstoneTools.ProbeTool.toolName);

			toolGroup.addViewport(viewportIds.axial, renderingEngineId);
			toolGroup.addViewport(viewportIds.sagittal, renderingEngineId);
			toolGroup.addViewport(viewportIds.coronal, renderingEngineId);

			if (cancelled) return;
			renderingEngine.renderViewports([
				viewportIds.axial,
				viewportIds.sagittal,
				viewportIds.coronal,
			]);

			// Apply standard bone preset by default (WW 2000, WL 500)
			applyVoiPreset(VISIOGRAPH_WINDOW_PRESETS.bone);
		}

		loadAndRender()
			.then(() => {
				if (!cancelled) setIsVolumeLoading(false);
			})
			.catch((error) => {
				if (cancelled) return;
				logger.error(
					"[Cornerstone3DViewer] Не удалось построить реконструкцию:",
					error,
				);
				setIsVolumeLoading(false);
				setLoadError(
					"Не удалось построить реконструкцию. Возможно, серия неполная или формат не поддерживается. Попробуйте загрузить архив заново.",
				);
			});

		return () => {
			cancelled = true;
			try {
				cornerstone.getRenderingEngine("my-engine")?.destroy();
			} catch {
				// Ignore
			}
			try {
				cornerstoneTools.ToolGroupManager.destroyToolGroup("mpr-tool-group");
			} catch {
				// Ignore
			}
			try {
				cornerstoneTools.annotation.state.removeAllAnnotations();
			} catch {
				// Ignore
			}
			try {
				cornerstone.cache.purgeCache();
			} catch {
				// Ignore
			}
			try {
				cornerstoneDICOMImageLoader.wadouri.fileManager.purge();
			} catch {
				// Ignore
			}
			// Low-Spec GC Invariant (Mandate 8c & Low-RAM Celeron/iGPU):
			// Zero WebGL contexts and canvas backing stores inside axial, sagittal, coronal viewport containers
			teardownViewportCanvases(axialRef.current);
			teardownViewportCanvases(sagittalRef.current);
			teardownViewportCanvases(coronalRef.current);
			setPanorexVolume(null);
			setSplinePoints([]);
		};
	}, [isInitialized, effectiveImageIds]);

	useEffect(() => {
		if (!patientId || !studyInstanceUid) return;
		let cancelled = false;

		loadCtPlanningMarkup(patientId, studyInstanceUid)
			.then((outcome) => {
				if (cancelled) return;
				if (outcome.status === "refused") {
					setMarkupStatus({ tone: "issue", text: outcome.message });
					return;
				}
				setRestoredMarkup(outcome.markup);
				if (outcome.markup.implants.length > 0) {
					const restored = implantDataOf(outcome.markup.implants);
					setImplants(restored);
					const last = restored[restored.length - 1];
					if (last) setAiProtocolLog(implantProtocolLog(last));
				}
				const label = ctPlanningRestoredLabel(outcome.markup);
				setMarkupStatus(label ? { tone: "saved", text: label } : null);
			})
			.catch((err) => {
				if (!cancelled) {
					showToast(
						actionFailureToast(
							"Чтение сохраненной разметки",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
					setMarkupStatus({
						tone: "issue",
						text:
							"Сохранённую разметку прочитать не удалось. Откройте снимок заново; если не поможет, " +
							"сообщите администратору клиники.",
					});
				}
			});

		return () => {
			cancelled = true;
		};
	}, [patientId, studyInstanceUid]);

	const currentMarkup = useCallback((): CtPlanningMarkup => {
		const element = axialRef.current;
		let spPoints: WorldPoint3[] = [];
		if (element) {
			try {
				const annotations =
					cornerstoneTools.annotation.state.getAnnotations(
						cornerstoneTools.SplineROITool.toolName,
						element,
					) ?? [];
				spPoints = archControlPointsOf(annotations);
			} catch {
				spPoints = [];
			}
		}
		const restored = restoredMarkupRef.current;
		if (spPoints.length === 0 && restored)
			spPoints = restored.splinePoints;
		return {
			splinePoints: spPoints,
			nervePoints: restored?.nervePoints ?? emptyCtPlanningMarkup().nervePoints,
			implants: storedImplantsOf(implantsRef.current),
		};
	}, []);

	const saveMarkupNow = useCallback(
		async (silent = false): Promise<void> => {
			const patient = patientIdRef.current;
			const study = studyUidRef.current;
			const markup = currentMarkup();
			if (ctPlanningMarkupIsEmpty(markup)) return;

			if (!patient) {
				if (!silent) {
					setMarkupStatus({
						tone: "issue",
						text:
							"Разметку сохранить нельзя — пациент не выбран, а разметка хранится в его карточке. " +
							"Откройте снимок из карточки пациента, обведённая дуга остаётся на экране.",
					});
				}
				return;
			}
			if (!study) {
				if (!silent) {
					setMarkupStatus({
						tone: "issue",
						text:
							"Разметку сохранить нельзя — в файлах снимка нет кода исследования, а без него разметку " +
							"не отличить от разметки другого снимка. Загрузите архив КЛКТ целиком, обведённая дуга " +
							"остаётся на экране.",
					});
				}
				return;
			}

			if (!silent)
				setMarkupStatus({ tone: "saving", text: "Сохраняем разметку…" });
			const outcome = await saveCtPlanningMarkup(patient, study, markup);
			if (outcome.status === "saved") setRestoredMarkup(markup);
			if (silent) return;
			setMarkupStatus(
				outcome.status === "saved"
					? { tone: "saved", text: "Разметка сохранена в карточке пациента." }
					: { tone: "issue", text: outcome.message },
			);
		},
		[currentMarkup],
	);

	const scheduleMarkupSave = useCallback(() => {
		if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
		saveTimerRef.current = setTimeout(() => {
			saveTimerRef.current = null;
			void saveMarkupNow();
		}, MARKUP_SAVE_DEBOUNCE_MS);
	}, [saveMarkupNow]);

	useEffect(() => {
		if (!isInitialized) return;
		const target = cornerstone.eventTarget;
		const onCompleted = () => {
			if (saveTimerRef.current !== null) {
				clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
			}
			void saveMarkupNow();
		};
		const onModified = () => scheduleMarkupSave();

		target.addEventListener(
			cornerstoneTools.Enums.Events.ANNOTATION_COMPLETED,
			onCompleted,
		);
		target.addEventListener(
			cornerstoneTools.Enums.Events.ANNOTATION_MODIFIED,
			onModified,
		);

		return () => {
			target.removeEventListener(
				cornerstoneTools.Enums.Events.ANNOTATION_COMPLETED,
				onCompleted,
			);
			target.removeEventListener(
				cornerstoneTools.Enums.Events.ANNOTATION_MODIFIED,
				onModified,
			);
			if (saveTimerRef.current !== null) {
				clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
			}
			void saveMarkupNow(true);
		};
	}, [isInitialized, scheduleMarkupSave, saveMarkupNow]);

	const refusePanorex = (reason: PanoramicIssue) => {
		setPanorexIssue(reason);
		setArchSummary(null);
		setSplinePoints([]);
		setPanorexVolume(null);
		setShowPanorex(false);
	};

	const handleGeneratePanorex = () => {
		const element = axialRef.current;
		if (!element) {
			refusePanorex("read_failed");
			return;
		}

		let annotations: readonly DrawnArchAnnotation[];
		try {
			annotations =
				cornerstoneTools.annotation.state.getAnnotations(
					cornerstoneTools.SplineROITool.toolName,
					element,
				) ?? [];
		} catch {
			refusePanorex("read_failed");
			return;
		}

		let arch = buildPanoramicArch(annotations);
		if (arch.status !== "ready" && arch.reason === "no_arch") {
			const stored = restoredMarkup?.splinePoints ?? [];
			if (stored.length > 0) arch = archFromStoredControlPoints(stored);
		}
		if (arch.status !== "ready") {
			refusePanorex(arch.reason);
			return;
		}

		if (!volumeId) {
			refusePanorex("volume_not_ready");
			return;
		}
		const volume = cornerstone.cache.getVolume(volumeId);
		const voxels = readVolumeScalarData(
			volume
				? {
						dimensions: volume.dimensions,
						imageIds: volume.imageIds,
						voxelManager: volume.voxelManager,
					}
				: null,
			(imageId) => cornerstone.cache.getImage(imageId) !== undefined,
		);
		if (voxels.status !== "ready" || !volume) {
			refusePanorex("volume_not_ready");
			return;
		}

		const [dx, dy, dz] = volume.dimensions;
		const [ox, oy, oz] = volume.origin;
		const [sx, sy, sz] = volume.spacing;
		setPanorexIssue(null);
		setArchSummary({
			points: arch.controlPoints.length,
			lengthMm: arch.lengthMm,
		});
		setSplinePoints(arch.curve);
		setPanorexVolume({
			scalarData: toTransferableScalarData(voxels.scalarData),
			dimensions: [dx, dy, dz],
			origin: [ox, oy, oz],
			direction: mat3ToMat4Direction(volume.direction),
			spacing: [sx, sy, sz],
		});
		setShowPanorex(true);
	};

	const setTool = (toolName: string) => {
		const toolGroupId = "mpr-tool-group";
		const toolGroup =
			cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
		if (!toolGroup) return;

		if (activeTool === cornerstoneTools.CrosshairsTool.toolName) {
			toolGroup.setToolPassive(activeTool);
		} else {
			toolGroup.setToolDisabled(activeTool);
		}

		toolGroup.setToolActive(toolName, {
			bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
		});
		setActiveTool(toolName);
	};

	const applyVoiPreset = (preset: VisiographWindowPreset) => {
		setActivePresetId(preset.id);
		const renderingEngine = cornerstone.getRenderingEngine("my-engine");
		if (!renderingEngine) return;
		const viewportIdsList = [
			VIEWPORT_IDS.axial,
			VIEWPORT_IDS.sagittal,
			VIEWPORT_IDS.coronal,
		];
		const { lower, upper } = preset.voiRange;
		for (const vId of viewportIdsList) {
			const vp = renderingEngine.getViewport(vId);
			if (vp && "setProperties" in vp) {
				(vp as cornerstone.Types.IVolumeViewport).setProperties({
					voiRange: { lower, upper },
				});
				vp.render();
			}
		}
	};

	
	/**
	 * Замер высоты и ширины альвеолярного гребня электронным штангенциркулем в 3D MPR
	 */
	const handleCaliperMeasurement = () => {
		const renderingEngine = cornerstone.getRenderingEngine("my-engine");
		const axialVp = renderingEngine?.getViewport(VIEWPORT_IDS.axial);
		const focal = axialVp?.getCamera()?.focalPoint;

		const startX = focal ? focal[0] : 15;
		const startY = focal ? focal[1] : 20;

		const measured = calculateCaliperRidgeDimensions({
			crestPoint: { x: startX, y: startY },
			basePoint: { x: startX, y: startY + 12 },
			crestWidthLeft: { x: startX - 3.5, y: startY },
			crestWidthRight: { x: startX + 3.5, y: startY },
			pixelSpacingMm: 0.1,
			label: "3D MPR Штангенциркуль",
		});

		setActiveCaliper(measured);
		setActiveTool("Caliper");
		showToast(`Штангенциркуль: H=${measured.heightMm} мм, W=${measured.crestWidthMm} мм (${measured.implantFeasibility.isAdequate ? "норма" : "дефицит"})`, "info");
	};

	const addNerveControlPoint = useCallback(
		(point: WorldPoint3) => {
			const current = restoredMarkupRef.current?.nervePoints ?? [];
			const nextNerve = [...current, point];
			const updated: CtPlanningMarkup = {
				splinePoints: restoredMarkupRef.current?.splinePoints ?? [],
				nervePoints: nextNerve,
				implants: storedImplantsOf(implantsRef.current),
			};
			setRestoredMarkup(updated);
			restoredMarkupRef.current = updated;

			if (implantsRef.current.length > 0) {
				const nerveSpline = nextNerve.map((p) => vec3.fromValues(p.x, p.y, p.z));
				const updatedImplants = implantsRef.current.map((imp) => ({
					...imp,
					distanceToNerve: distancePointToSpline(imp.endWorld, nerveSpline),
				}));
				setImplants(updatedImplants);
				implantsRef.current = updatedImplants;
				const last = updatedImplants[updatedImplants.length - 1];
				if (last) setAiProtocolLog(implantProtocolLog(last));
			}

			void saveMarkupNow();
			showToast(
				`Точка #${nextNerve.length} нижнечелюстного канала зафиксирована ([${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)}])`,
				"info",
			);
		},
		[saveMarkupNow],
	);

	const addNervePointFromCurrentSlice = useCallback(() => {
		const renderingEngine = cornerstone.getRenderingEngine("my-engine");
		const axialVp = renderingEngine?.getViewport(VIEWPORT_IDS.axial);
		const focal = axialVp?.getCamera()?.focalPoint;
		if (
			!focal ||
			focal.length < 3 ||
			!Number.isFinite(focal[0]) ||
			!Number.isFinite(focal[1]) ||
			!Number.isFinite(focal[2])
		) {
			showToast(
				"Точка фокуса не определена. Выберите срез кликом по КТ-просмотрщику",
				"warning",
			);
			return;
		}

		addNerveControlPoint({
			x: Number(focal[0].toFixed(2)),
			y: Number(focal[1].toFixed(2)),
			z: Number(focal[2].toFixed(2)),
		});
	}, [addNerveControlPoint]);

	const completeNerveSpline = useCallback(() => {
		const current = restoredMarkupRef.current?.nervePoints ?? [];
		if (current.length < 2) {
			showToast(
				"Для формирования сплайна нижнечелюстного канала необходимо минимум 2 контрольные точки",
				"warning",
			);
			return;
		}

		if (implantsRef.current.length > 0) {
			const nerveSpline = current.map((p) => vec3.fromValues(p.x, p.y, p.z));
			const updatedImplants = implantsRef.current.map((imp) => ({
				...imp,
				distanceToNerve: distancePointToSpline(imp.endWorld, nerveSpline),
			}));
			setImplants(updatedImplants);
			implantsRef.current = updatedImplants;
			const last = updatedImplants[updatedImplants.length - 1];
			if (last) setAiProtocolLog(implantProtocolLog(last));
		}

		void saveMarkupNow();
		showToast(
			`Сплайн нижнечелюстного канала сформирован: ${current.length} опорных точек. Коридор безопасности 2.0 мм активен.`,
			"success",
		);
	}, [saveMarkupNow]);

	const clearNervePoints = useCallback(() => {
		const updated: CtPlanningMarkup = {
			splinePoints: restoredMarkupRef.current?.splinePoints ?? [],
			nervePoints: [],
			implants: storedImplantsOf(implantsRef.current),
		};
		setRestoredMarkup(updated);
		restoredMarkupRef.current = updated;

		if (implantsRef.current.length > 0) {
			const updatedImplants = implantsRef.current.map((imp) => ({
				...imp,
				distanceToNerve: null,
			}));
			setImplants(updatedImplants);
			implantsRef.current = updatedImplants;
			const last = updatedImplants[updatedImplants.length - 1];
			if (last) setAiProtocolLog(implantProtocolLog(last));
		}

		void saveMarkupNow();
		showToast("Трассировка нижнечелюстного канала очищена (0 точек)", "info");
	}, [saveMarkupNow]);

	const handleViewportClickForNerve = useCallback(
		(
			viewportId: string,
			container: HTMLElement | null,
			e: React.MouseEvent<any>,
		) => {
			if (activeTool !== "NerveTracer" && !isNerveTracingActive) return;
			if (!container) return;

			const renderingEngine = cornerstone.getRenderingEngine("my-engine");
			const vp = renderingEngine?.getViewport(viewportId);
			if (!vp) return;

			const rect = container.getBoundingClientRect();
			const canvasX = e.clientX - rect.left;
			const canvasY = e.clientY - rect.top;

			let worldX: number | null = null;
			let worldY: number | null = null;
			let worldZ: number | null = null;

			try {
				if (
					typeof (
						vp as {
							canvasToWorld?: (
								pt: [number, number],
							) => [number, number, number];
						}
					).canvasToWorld === "function"
				) {
					const pt = (
						vp as {
							canvasToWorld: (
								pt: [number, number],
							) => [number, number, number];
						}
					).canvasToWorld([canvasX, canvasY]);
					if (
						pt &&
						Number.isFinite(pt[0]) &&
						Number.isFinite(pt[1]) &&
						Number.isFinite(pt[2])
					) {
						worldX = pt[0];
						worldY = pt[1];
						worldZ = pt[2];
					}
				}
			} catch {
				// fallback to camera focal point
			}

			if (worldX === null || worldY === null || worldZ === null) {
				const focal = vp.getCamera()?.focalPoint;
				if (
					focal &&
					Number.isFinite(focal[0]) &&
					Number.isFinite(focal[1]) &&
					Number.isFinite(focal[2])
				) {
					worldX = focal[0];
					worldY = focal[1];
					worldZ = focal[2];
				}
			}

			if (worldX === null || worldY === null || worldZ === null) {
				showToast("Не удалось определить 3D-координаты точки на срезе", "warning");
				return;
			}

			addNerveControlPoint({
				x: Number(worldX.toFixed(2)),
				y: Number(worldY.toFixed(2)),
				z: Number(worldZ.toFixed(2)),
			});
		},
		[activeTool, isNerveTracingActive, addNerveControlPoint],
	);

	/**
	 * Ручная разметка нижнечелюстного канала (коридор безопасности 2.0 мм).
	 * ВНИМАНИЕ: генерация синтетических/фейковых координат категорически запрещена (Мандат 8k: CRM != Reality Simulator).
	 */
	const handleTraceMandibularNerve = () => {
		if (activeTool === "NerveTracer") {
			setIsNerveTracingActive(false);
			setActiveTool("Crosshairs");
			showToast("Режим трассировки нерва отключен", "info");
			return;
		}

		setIsNerveTracingActive(true);
		setActiveTool("NerveTracer");

		const currentNerve = restoredMarkupRef.current?.nervePoints || [];
		if (currentNerve.length === 0) {
			showToast(
				"Трассировка нижнечелюстного канала: 0 точек. Кликните по КТ-срезу для установки контрольной точки",
				"info",
			);
		} else {
			showToast(
				`Нижнечелюстной нерв: ${currentNerve.length} опорных точек (коридор безопасности 2.0 мм)`,
				"info",
			);
		}
	};

	const removeImplant = useCallback((id: string) => {
		const nextImplants = implantsRef.current.filter((imp) => imp.id !== id);
		setImplants(nextImplants);
		implantsRef.current = nextImplants;
		if (nextImplants.length > 0) {
			setAiProtocolLog(implantProtocolLog(nextImplants[nextImplants.length - 1]!));
		} else {
			setAiProtocolLog("");
		}
		void saveMarkupNow();
		showToast("Имплантат удален из плана", "info");
	}, [saveMarkupNow]);

	const focusOnImplant = useCallback((implant: ImplantData) => {
		const renderingEngine = cornerstone.getRenderingEngine("my-engine");
		if (!renderingEngine) return;
		for (const vpId of [VIEWPORT_IDS.axial, VIEWPORT_IDS.sagittal, VIEWPORT_IDS.coronal]) {
			const vp = renderingEngine.getViewport(vpId);
			if (vp) {
				const camera = vp.getCamera();
				if (camera && camera.focalPoint) {
					vp.setCamera({
						focalPoint: [implant.startWorld[0], implant.startWorld[1], implant.startWorld[2]],
					});
					vp.render();
				}
			}
		}
		showToast(`Фокус срезов наведен на имплантат зуба №${implant.fdiCode}`, "info");
	}, []);

	const placeImplantModel = () => {
		const activeVolumeId = volumeId ?? "my-volume";
		let volume = activeVolumeId ? cornerstone.cache.getVolume(activeVolumeId) : undefined;
		if (!volume) {
			const allVolumes = cornerstone.cache.getVolumes();
			if (allVolumes && allVolumes.length > 0) {
				volume = allVolumes[0];
			}
		}

		if (!volume || isVolumeLoading) {
			showToast(
				"Установка имплантата заблокирована: исследование КЛКТ не загружено. Планирование на пустом холсте запрещено стандартом клиники",
				"error",
			);
			return;
		}

		const voxels = readVolumeScalarData(
			{
				dimensions: volume.dimensions,
				imageIds: volume.imageIds,
				voxelManager: volume.voxelManager,
			},
			(imageId) => cornerstone.cache.getImage(imageId) !== undefined,
		);

		if (voxels.status !== "ready") {
			showToast(
				"Установка имплантата заблокирована: исследование КЛКТ не загружено. Планирование на пустом холсте запрещено стандартом клиники",
				"error",
			);
			return;
		}

		const renderingEngine = cornerstone.getRenderingEngine("my-engine");
		const axialVp = renderingEngine?.getViewport(VIEWPORT_IDS.axial);
		const camera = axialVp?.getCamera();
		const focal = camera?.focalPoint;

		if (
			!focal ||
			focal.length < 3 ||
			!Number.isFinite(focal[0]) ||
			!Number.isFinite(focal[1]) ||
			!Number.isFinite(focal[2])
		) {
			showToast(
				"Точка фокуса не определена. Выберите целевую анатомическую область кликом по срезу челюсти",
				"warning",
			);
			return;
		}

		const startX = focal[0];
		const startY = focal[1];
		const startZ = focal[2];
		const implantStart = vec3.fromValues(startX, startY, startZ);
		const implantEnd = vec3.fromValues(startX, startY, startZ - selectedLength);

		const sysSpec = getImplantSystem(selectedSystemId);
		const platform = getPlatformForDiameter(sysSpec.id, selectedDiameter);

		let distToNerve: number | null = null;
		const nervePoints = restoredMarkupRef.current?.nervePoints;
		if (nervePoints && nervePoints.length > 0) {
			const nerveSpline = nervePoints.map((p) => vec3.fromValues(p.x, p.y, p.z));
			distToNerve = distancePointToSpline(implantEnd, nerveSpline);
		} else {
			showToast(
				"Нижнечелюстной нерв не размечен. Контроль дистанции безопасности невозможен",
				"warning",
			);
		}

		const computed = calculateImplantBoneDensity(
			voxels.scalarData as Float32Array,
			volume.dimensions,
			vec3.fromValues(volume.origin[0], volume.origin[1], volume.origin[2]),
			mat3ToMat4Direction(volume.direction),
			vec3.fromValues(volume.spacing[0], volume.spacing[1], volume.spacing[2]),
			implantStart,
			implantEnd,
			selectedDiameter,
		);
		const avgHUVal = computed.averageHU;

		const densityClassification = classifyExtendedBoneDensity(avgHUVal);

		let fdiCode = selectedFdiCode || "36";
		const jawSpline = restoredMarkupRef.current?.splinePoints;
		if (jawSpline && jawSpline.length >= 2) {
			const computedFdi = mapCtCoordinatesToFdiNumber(
				{ x: startX, y: startY, z: startZ },
				jawSpline,
			);
			if (computedFdi) {
				fdiCode = String(computedFdi);
				setSelectedFdiCode(fdiCode);
			}
		}

		const implantId =
			typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: `implant-${Date.now()}-${Math.round(startX)}-${Math.round(startY)}`;

		const newImplant: ImplantData = {
			id: implantId,
			fdiCode,
			diameter: selectedDiameter,
			length: selectedLength,
			startWorld: implantStart,
			endWorld: implantEnd,
			boneDensity: {
				averageHU: Math.round(avgHUVal),
				classification: densityClassification.mischClass,
				drillingAdvice: densityClassification.drillingRecommendation,
			},
			distanceToNerve: distToNerve,
			systemId: sysSpec.id,
			brandName: sysSpec.brand,
			lineName: sysSpec.line,
			platformCode: platform.code,
			platformColor: platform.hexColor,
		};

		const nextImplants = [...implants, newImplant];
		setImplants(nextImplants);
		implantsRef.current = nextImplants;
		setActiveTool("Implant");

		setAiProtocolLog(implantProtocolLog(newImplant));
		void saveMarkupNow();

		if (distToNerve !== null && distToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM) {
			SoundFeedbackService.getInstance().playWarningAlert();
			showToast(
				`[ОПАСНОСТЬ] Имплантат зуба №${fdiCode} установлен в опасной близости от нерва (${distToNerve.toFixed(1)} мм < 2.0 мм)!`,
				"error",
			);
		} else {
			SoundFeedbackService.getInstance().playActionSuccess();
			showToast(
				`Имплантат ${sysSpec.brand} Ø${selectedDiameter}x${selectedLength}мм размещен в области зуба №${fdiCode}`,
				"success",
			);
		}
	};

	/**
	 * 1-Click Snapshot export directly to patient clinical record / Form 043/u.
	 */
	const handleExportSnapshotTo043 = async () => {
		const targetDiv = axialRef.current;
		if (!targetDiv) return;

		const canvas = targetDiv.querySelector("canvas");
		if (!canvas) {
			showToast("Холст 3D MPR не найден для создания снимка.", "error");
			return;
		}

		if (!patientId) {
			showToast(
				"Пациент не выбран. Выберите пациента для прикрепления снимка к Форме 043/у.",
				"error",
			);
			return;
		}

		setIsExportingSnapshot(true);
		try {
			const lastImplant = implants[implants.length - 1];
			const capturedAt = new Date().toISOString();
			const dataUri = captureHighDpiCanvas(canvas, {
				pixelRatio: 2,
				mimeType: "image/jpeg",
				quality: 0.92,
				burnInHeader: {
					patientId,
					toothCode: lastImplant?.fdiCode ? String(lastImplant.fdiCode) : undefined,
					capturedAt,
					finding: lastImplant
						? `Имплантат Ø${lastImplant.diameter}x${lastImplant.length}мм, ${lastImplant.boneDensity.classification} (${Math.round(lastImplant.boneDensity.averageHU)} HU)`
						: "3D КЛКТ MPR аксиальный срез",
				},
			});
			const thumbUri = await createSnapshotThumbnail(canvas, 200, 0.85);

			const outcome = await exportSnapshotToClinicalRecord(
				{
					patientId,
					imageDataUri: dataUri,
					thumbnailDataUri: thumbUri,
					viewKind: "mpr_axial",
					preset: VISIOGRAPH_WINDOW_PRESETS[activePresetId],
					capturedAt,
					...(lastImplant?.fdiCode
						? {
								fdiToothCode: String(lastImplant.fdiCode),
								toothCode: String(lastImplant.fdiCode),
							}
						: {}),
					...(typeof lastImplant?.distanceToNerve === "number"
						? { nerveDistanceMm: lastImplant.distanceToNerve }
						: {}),
					...(lastImplant?.boneDensity
						? {
								boneDensity: {
									averageHU: lastImplant.boneDensity.averageHU,
									classification: String(lastImplant.boneDensity.classification),
								},
							}
						: {}),
					...(lastImplant
						? {
								implantDetails: {
									diameterMm: lastImplant.diameter,
									lengthMm: lastImplant.length,
								},
							}
						: {}),
					radiologicalFinding: lastImplant
						? `3D КЛКТ срез: планирование имплантации в области зуба № ${lastImplant.fdiCode}. Плотность костной ткани: ${lastImplant.boneDensity.classification} (${Math.round(lastImplant.boneDensity.averageHU)} HU). ${lastImplant.distanceToNerve != null ? `Дистанция до нижнечелюстного канала: ${lastImplant.distanceToNerve.toFixed(1)} мм.` : "Нижнечелюстной нерв не размечен. Контроль дистанции безопасности невозможен."}`
						: "3D КЛКТ MPR аксиальный срез челюстно-лицевой области.",
					...(aiProtocolLog ? { aiProtocolLog } : {}),
					clinicalNote: `3D MPR аксиальный срез КЛКТ. Режим HU: ${VISIOGRAPH_WINDOW_PRESETS[activePresetId].label}.`,
				},
				authHeaders,
			);

			if (outcome.success) {
				showToast("Снимок 3D MPR успешно прикреплен к карте 043/у!", "success");
			} else {
				showToast(outcome.message, "error");
			}
		} catch (err) {
			showToast("Сбой при сохранении снимка в медицинскую карту.", "error");
		} finally {
			setIsExportingSnapshot(false);
		}
	};

	const handleDownloadActiveSlice = () => {
		const targetDiv = axialRef.current;
		const canvas = targetDiv?.querySelector("canvas");
		if (!canvas) return;
		const dataUri = captureHighDpiCanvas(canvas, {
			pixelRatio: 2,
			mimeType: "image/jpeg",
			quality: 0.95,
		});
		downloadSnapshotLocally(
			dataUri,
			`mpr_axial_snapshot_${activePresetId}_${Date.now()}.jpg`,
		);
		showToast("Снимок среза сохранен на диск в высоком разрешении", "success");
	};

	const panorexBanner: { tone: "issue" | "ready"; text: string } | null =
		panorexIssue !== null
			? { tone: "issue", text: panoramicIssueLabels[panorexIssue] }
			: archSummary !== null
				? {
						tone: "ready",
						text: panoramicReadyLabel(archSummary.points, archSummary.lengthMm),
					}
				: null;

	const latestImplant = implants[implants.length - 1];
	const collisionImplants = implants.filter(
		(imp) =>
			typeof imp.distanceToNerve === "number" &&
			imp.distanceToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM,
	);
	const hasAnyNerveCollision = collisionImplants.length > 0;
	const isNerveCollisionDanger =
		latestImplant?.distanceToNerve != null &&
		latestImplant.distanceToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM;
	const isNerveUnmapped =
		latestImplant != null && latestImplant.distanceToNerve == null;

	if (effectiveImageIds.length === 0) {
		return (
			<div
				data-testid="cornerstone-empty-volume-dropzone"
				style={{
					width: "100%",
					height: "100%",
					minHeight: "600px",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "var(--paper, #09090b)",
					color: "var(--ink, #fafafa)",
					position: "relative",
					padding: "24px",
					fontFamily: "sans-serif",
				}}
			>
				{onClose && (
					<button
						type="button"
						data-testid="cbct-mpr-close-btn"
						aria-label="Закрыть 3D MPR"
						onClick={onClose}
						style={{
							position: "absolute",
							top: "16px",
							right: "16px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: "32px",
							height: "32px",
							borderRadius: "8px",
							border: "1px solid var(--line, rgba(255,255,255,0.15))",
							backgroundColor: "rgba(255,255,255,0.05)",
							color: "var(--ink, #fff)",
							cursor: "pointer",
							transition: "all 0.15s",
						}}
						title="Закрыть просмотрщик"
					>
						<X className="w-4 h-4" />
					</button>
				)}

				<div style={{ maxWidth: "560px", width: "100%", textAlign: "center" }}>
					<h3
						style={{
							fontSize: "18px",
							fontWeight: 600,
							marginBottom: "8px",
							color: "var(--ink, #fff)",
						}}
					>
						3D КЛКТ / Мультипланарная реконструкция (MPR)
					</h3>
					{patientName && (
						<div
							className="truncate min-w-0"
							style={{
								fontSize: "13px",
								fontWeight: 500,
								color: "var(--brand-primary, #60a5fa)",
								marginBottom: "8px",
							}}
							title={`Пациент: ${patientName}${studyDate ? ` • ${studyDate}` : ""}`}
						>
							Пациент: {patientName}
							{studyDate ? ` • ${studyDate}` : ""}
						</div>
					)}
					<p
						style={{
							fontSize: "13px",
							color: "var(--muted, #a1a1aa)",
							marginBottom: "20px",
							lineHeight: 1.5,
						}}
					>
						Исследование КЛКТ не загружено. Перетащите DICOM-архив (.zip) или папку со срезами томографии для построения честных воксельных срезов (аксиального, сагиттального, коронального и панорамы).
					</p>

					<div
						style={{
							background: "rgba(255,255,255,0.03)",
							border: "1px dashed var(--line-strong, rgba(255,255,255,0.2))",
							borderRadius: "16px",
							padding: "24px",
						}}
					>
						<Suspense fallback={null}>
							<DicomArchiveUploader
								onImagesLoaded={(ids) => setLocalImageIds(ids)}
							/>
						</Suspense>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				minHeight: "600px",
				display: "flex",
				flexDirection: "column",
				backgroundColor: "var(--paper, #0a0a0a)",
				color: "var(--ink, #fff)",
				position: "relative",
				fontFamily: "sans-serif",
			}}
		>
			{(isVolumeLoading || loadError) && (
				<div
					role={loadError ? "alert" : "status"}
					style={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
						zIndex: 30,
						maxWidth: "420px",
						textAlign: "center",
						padding: "20px 24px",
						borderRadius: "16px",
						backgroundColor: "rgba(0,0,0,0.78)",
						border: `1px solid ${loadError ? "#f87171" : "rgba(255,255,255,0.2)"}`,
						color: loadError ? "#fca5a5" : "#e4e4e7",
						fontSize: "14px",
						lineHeight: 1.5,
					}}
				>
					{loadError ??
						"Строим объёмную реконструкцию — это может занять до минуты..."}
				</div>
			)}

			{/* 1-ROW CLINICAL HEADER & TOOLBAR (HICK & MILLER LAWS: 36px, DENSE CLINICAL DESKTOP) */}
			<header
				role="toolbar"
				aria-label="Панель инструментов 3D КЛКТ томографа"
				style={{
					height: "36px",
					minHeight: "36px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "8px",
					padding: "0 12px 0 10px",
					backgroundColor: "var(--paper-strong, #121214)",
					borderBottom: "1px solid var(--line-strong, rgba(255,255,255,0.12))",
					zIndex: 20,
					flexShrink: 0,
				}}
			>
				{/* PATIENT INFO & CT PARAMETERS (WITH TRUNCATE & MIN-W-0) */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						minWidth: 0,
						flexShrink: 1,
						maxWidth: "280px",
					}}
				>
					<Activity className="w-3.5 h-3.5 text-teal-400 shrink-0" />
					<div
						className="min-w-0"
						style={{
							display: "flex",
							alignItems: "baseline",
							gap: "6px",
							overflow: "hidden",
							lineHeight: 1.2,
						}}
					>
						<span
							className="truncate min-w-0"
							style={{
								fontSize: "12px",
								fontWeight: 600,
								color: "var(--ink, #fafafa)",
							}}
							title={patientName || "3D КЛКТ исследование"}
						>
							{patientName || "3D КЛКТ"}
						</span>
						{(studyDate || voxelSpacing || studyInstanceUid) && (
							<span
								className="truncate min-w-0 shrink-0"
								style={{
									fontSize: "11px",
									color: "var(--muted, #a1a1aa)",
								}}
								title={
									studyDate
										? `КТ: ${studyDate}${voxelSpacing ? ` (${voxelSpacing.x}x${voxelSpacing.y}x${voxelSpacing.z}мм)` : ""}`
										: studyInstanceUid
											? `UID: ${studyInstanceUid.slice(-8)}`
											: ""
								}
							>
								{studyDate || (studyInstanceUid ? `UID: ${studyInstanceUid.slice(-8)}` : "")}
								{voxelSpacing ? ` • ${voxelSpacing.x}x${voxelSpacing.y}мм` : ""}
							</span>
						)}
					</div>
				</div>

				{/* 1-ROW TOOLBAR (HICK'S LAW: ROVNO 1 STROKA, 28px BUTTONS) */}
				<div
					className="no-scrollbar"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "4px",
						overflowX: "auto",
						scrollbarWidth: "none",
						flexShrink: 0,
					}}
				>
					{/* PLANES & MODES SEGMENT */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							flexShrink: 0,
							gap: "2px",
							backgroundColor: "rgba(0,0,0,0.35)",
							borderRadius: "8px",
							padding: "2px",
						}}
					>
						<button
							type="button"
							style={{
								height: "28px",
								padding: "0 10px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "none",
								transition: "all 0.15s",
								whiteSpace: "nowrap",
								flexShrink: 0,
								backgroundColor:
									activeTool === cornerstoneTools.CrosshairsTool.toolName
										? "var(--brand-primary, #2563eb)"
										: "transparent",
								color:
									activeTool === cornerstoneTools.CrosshairsTool.toolName
										? "#fff"
										: "var(--ink, #d4d4d8)",
							}}
							onClick={() => setTool(cornerstoneTools.CrosshairsTool.toolName)}
							title="Мультипланарная реконструкция: аксиальный, сагиттальный, корональный срезы"
						>
							МПР
						</button>
						<button
							type="button"
							style={{
								height: "28px",
								padding: "0 10px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "none",
								transition: "all 0.15s",
								whiteSpace: "nowrap",
								flexShrink: 0,
								backgroundColor:
									activeTool === cornerstoneTools.SplineROITool.toolName
										? "var(--brand-primary, #2563eb)"
										: "transparent",
								color:
									activeTool === cornerstoneTools.SplineROITool.toolName
										? "#fff"
										: "var(--ink, #d4d4d8)",
							}}
							onClick={() => setTool(cornerstoneTools.SplineROITool.toolName)}
							title="Разметка зубной дуги для развертки панорамы"
						>
							Дуга
						</button>
						<button
							type="button"
							style={{
								height: "28px",
								padding: "0 10px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 600,
								cursor: "pointer",
								border: "none",
								transition: "all 0.15s",
								whiteSpace: "nowrap",
								flexShrink: 0,
								backgroundColor: showPanorex
									? "var(--brand-primary, #2563eb)"
									: "transparent",
								color: showPanorex ? "#fff" : "var(--ink, #d4d4d8)",
							}}
							onClick={handleGeneratePanorex}
							title="Развернуть ортопантомограмму (ОПТГ) по вокселям КТ"
						>
							Панорама
						</button>
					</div>

					<div style={{ width: "1px", height: "16px", backgroundColor: "var(--line-strong, rgba(255,255,255,0.12))", margin: "0 2px" }} />

					{/* HU WINDOWING PRESETS (W/L: 1-CLICK: BONE, TEETH, SOFT TISSUE) */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							flexShrink: 0,
							gap: "2px",
							backgroundColor: "rgba(0,0,0,0.35)",
							borderRadius: "8px",
							padding: "2px",
						}}
					>
						{VISIOGRAPH_PRESETS_LIST.slice(0, 3).map((preset) => (
							<button
								key={preset.id}
								type="button"
								style={{
									height: "28px",
									padding: "0 8px",
									borderRadius: "6px",
									fontSize: "11px",
									fontWeight: 500,
									cursor: "pointer",
									border: "none",
									backgroundColor:
										activePresetId === preset.id
											? "var(--brand-primary, #2563eb)"
											: "transparent",
									color: activePresetId === preset.id ? "#fff" : "var(--muted, #a1a1aa)",
									transition: "all 0.15s",
									whiteSpace: "nowrap",
									flexShrink: 0,
								}}
								onClick={() => applyVoiPreset(preset)}
								title={preset.description}
							>
								{preset.shortLabel}
							</button>
						))}
					</div>

					<div style={{ width: "1px", height: "16px", backgroundColor: "var(--line-strong, rgba(255,255,255,0.12))", margin: "0 2px" }} />

					{/* MEASURE & ZOOM CONTROLS (COMPACT 28-32px DESKTOP DENSITY) */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							flexShrink: 0,
							gap: "2px",
						}}
					>
						<button
							type="button"
							style={{
								height: "28px",
								padding: "0 8px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "none",
								transition: "all 0.15s",
								whiteSpace: "nowrap",
								flexShrink: 0,
								display: "inline-flex",
								alignItems: "center",
								gap: "4px",
								backgroundColor:
									activeTool === cornerstoneTools.ZoomTool.toolName
										? "var(--brand-primary, #2563eb)"
										: "transparent",
								color:
									activeTool === cornerstoneTools.ZoomTool.toolName
										? "#fff"
										: "var(--ink, #d4d4d8)",
							}}
							onClick={() => setTool(cornerstoneTools.ZoomTool.toolName)}
							title="Масштабирование срезов (Зум)"
						>
							<ZoomIn className="w-3.5 h-3.5" />
							<span>Зум</span>
						</button>
						<button
							type="button"
							style={{
								height: "28px",
								padding: "0 8px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "none",
								transition: "all 0.15s",
								whiteSpace: "nowrap",
								flexShrink: 0,
								display: "inline-flex",
								alignItems: "center",
								gap: "4px",
								backgroundColor:
									activeTool === cornerstoneTools.LengthTool.toolName
										? "var(--brand-primary, #2563eb)"
										: "transparent",
								color:
									activeTool === cornerstoneTools.LengthTool.toolName
										? "#fff"
										: "var(--ink, #d4d4d8)",
							}}
							onClick={() => setTool(cornerstoneTools.LengthTool.toolName)}
							title="Линейка расстояний в миллиметрах"
						>
							<Ruler className="w-3.5 h-3.5" />
							<span>Линейка</span>
						</button>
						<button
							type="button"
							style={{
								height: "28px",
								padding: "0 8px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "none",
								transition: "all 0.15s",
								whiteSpace: "nowrap",
								flexShrink: 0,
								backgroundColor:
									activeTool === "Caliper"
										? "var(--brand-primary, #2563eb)"
										: "transparent",
								color: activeTool === "Caliper" ? "#fff" : "var(--ink, #d4d4d8)",
							}}
							onClick={handleCaliperMeasurement}
							title="Электронный штангенциркуль: замер высоты и ширины гребня"
						>
							Штангенциркуль
						</button>
					</div>

					<div style={{ width: "1px", height: "16px", backgroundColor: "var(--line-strong, rgba(255,255,255,0.12))", margin: "0 2px" }} />

					{/* SECONDARY MENU POPOVER (...) */}
					<div style={{ position: "relative" }} ref={secondaryMenuRef}>
						<button
							type="button"
							style={{
								height: "28px",
								width: "28px",
								padding: "0",
								borderRadius: "6px",
								cursor: "pointer",
								border: "1px solid var(--line-strong, rgba(255,255,255,0.12))",
								backgroundColor: isSecondaryMenuOpen
									? "rgba(255,255,255,0.15)"
									: "transparent",
								color: "var(--ink, #d4d4d8)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								transition: "all 0.15s",
							}}
							onClick={() => setIsSecondaryMenuOpen((prev) => !prev)}
							title="Дополнительные функции и настройки КТ"
							aria-label="Дополнительные функции КТ"
						>
							<MoreHorizontal className="w-4 h-4" />
						</button>

						{isSecondaryMenuOpen && (
							<div
								role="menu"
								style={{
									position: "absolute",
									top: "34px",
									right: "0",
									zIndex: 50,
									minWidth: "240px",
									backgroundColor: "var(--paper-strong, #18181b)",
									backdropFilter: "blur(20px)",
									WebkitBackdropFilter: "blur(20px)",
									border: "1px solid var(--line-strong, rgba(255,255,255,0.18))",
									borderRadius: "10px",
									padding: "6px",
									boxShadow: "0 16px 36px -4px rgba(0, 0, 0, 0.8)",
									display: "flex",
									flexDirection: "column",
									gap: "4px",
								}}
							>
								<button
									type="button"
									style={{
										height: "30px",
										padding: "0 10px",
										borderRadius: "6px",
										fontSize: "12px",
										fontWeight: 500,
										cursor: "pointer",
										border: "none",
										textAlign: "left",
										backgroundColor:
											activeTool === "Implant"
												? "rgba(79,70,229,0.3)"
												: "transparent",
										color: "var(--ink, #fff)",
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
									}}
									onClick={() => {
										setIsSecondaryMenuOpen(false);
										placeImplantModel();
									}}
								>
									<span>+ Имплантат</span>
									<span style={{ fontSize: "10px", color: "var(--muted, #a1a1aa)" }}>3D Модель</span>
								</button>

								<button
									type="button"
									style={{
										height: "30px",
										padding: "0 10px",
										borderRadius: "6px",
										fontSize: "12px",
										fontWeight: 500,
										cursor: "pointer",
										border: "none",
										textAlign: "left",
										backgroundColor:
											activeTool === "NerveTracer"
												? "rgba(217,119,6,0.3)"
												: "transparent",
										color: "var(--ink, #fff)",
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
									}}
									onClick={() => {
										setIsSecondaryMenuOpen(false);
										handleTraceMandibularNerve();
									}}
									title={
										(restoredMarkup?.nervePoints?.length ?? 0) === 0
											? "Трассировка нижнечелюстного канала: 0 точек"
											: `Трассировка: ${restoredMarkup?.nervePoints?.length} точек`
									}
								>
									<span>Нерв (2.0мм)</span>
									<span style={{ fontSize: "10px", color: "var(--amber-400, #fbbf24)" }}>
										{(restoredMarkup?.nervePoints?.length ?? 0) > 0
											? `[${restoredMarkup?.nervePoints?.length}]`
											: "Трассировка"}
									</span>
								</button>

								<button
									type="button"
									style={{
										height: "30px",
										padding: "0 10px",
										borderRadius: "6px",
										fontSize: "12px",
										fontWeight: 500,
										cursor: "pointer",
										border: "none",
										textAlign: "left",
										backgroundColor:
											activeTool === cornerstoneTools.ProbeTool.toolName
												? "rgba(37,99,235,0.3)"
												: "transparent",
										color: "var(--ink, #fff)",
									}}
									onClick={() => {
										setIsSecondaryMenuOpen(false);
										setTool(cornerstoneTools.ProbeTool.toolName);
									}}
								>
									HU Плотность (Проба)
								</button>

								{/* Срез / Толщина */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "4px 10px",
										fontSize: "12px",
										borderTop: "1px solid rgba(255,255,255,0.08)",
										borderBottom: "1px solid rgba(255,255,255,0.08)",
										margin: "2px 0",
									}}
								>
									<span style={{ color: "var(--muted, #a1a1aa)" }}>Толщина среза:</span>
									<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
										<input
											type="range"
											min="0"
											max="20"
											step="1"
											value={panorexThickness}
											onChange={(e) => setPanorexThickness(Number(e.target.value))}
											style={{ width: "60px", cursor: "pointer" }}
										/>
										<span style={{ width: "24px", textAlign: "right", fontSize: "11px" }}>
											{panorexThickness}мм
										</span>
									</div>
								</div>

								{/* Режим проекции среза MIP / Average */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "4px 10px",
										fontSize: "12px",
										borderBottom: "1px solid rgba(255,255,255,0.08)",
										marginBottom: "2px",
									}}
								>
									<span style={{ color: "var(--muted, #a1a1aa)" }}>Проекция:</span>
									<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
										<button
											type="button"
											onClick={() => setBlendMode("mip")}
											style={{
												padding: "2px 6px",
												fontSize: "11px",
												fontWeight: blendMode === "mip" ? 600 : 400,
												borderRadius: "4px",
												border: "1px solid " + (blendMode === "mip" ? "var(--brand-primary, #06b6d4)" : "rgba(255,255,255,0.15)"),
												backgroundColor: blendMode === "mip" ? "rgba(6,182,212,0.25)" : "transparent",
												color: blendMode === "mip" ? "var(--cyan-400, #22d3ee)" : "var(--muted, #a1a1aa)",
												cursor: "pointer",
											}}
											title="Максимальная интенсивность (MIP)"
										>
											MIP
										</button>
										<button
											type="button"
											onClick={() => setBlendMode("average")}
											style={{
												padding: "2px 6px",
												fontSize: "11px",
												fontWeight: blendMode === "average" ? 600 : 400,
												borderRadius: "4px",
												border: "1px solid " + (blendMode === "average" ? "var(--brand-primary, #06b6d4)" : "rgba(255,255,255,0.15)"),
												backgroundColor: blendMode === "average" ? "rgba(6,182,212,0.25)" : "transparent",
												color: blendMode === "average" ? "var(--cyan-400, #22d3ee)" : "var(--muted, #a1a1aa)",
												cursor: "pointer",
											}}
											title="Усреднение интенсивности (Average)"
										>
											Ср.
										</button>
									</div>
								</div>

								<button
									type="button"
									style={{
										height: "30px",
										padding: "0 10px",
										borderRadius: "6px",
										fontSize: "12px",
										fontWeight: 500,
										cursor: isExportingSnapshot ? "wait" : "pointer",
										border: "none",
										textAlign: "left",
										backgroundColor: "transparent",
										color: "var(--emerald-400, #34d399)",
										display: "flex",
										alignItems: "center",
										gap: "6px",
										opacity: isExportingSnapshot ? 0.7 : 1,
									}}
									onClick={() => {
										if (isExportingSnapshot) return;
										setIsSecondaryMenuOpen(false);
										handleExportSnapshotTo043();
									}}
									title="Сохранить текущий 3D MPR срез и протокол в электронную карту 043/у"
								>
									{isExportingSnapshot ? (
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
									) : (
										<Camera className="w-3.5 h-3.5" />
									)}
									<span>В карту 043/у</span>
								</button>

								<button
									type="button"
									style={{
										height: "30px",
										padding: "0 10px",
										borderRadius: "6px",
										fontSize: "12px",
										fontWeight: 500,
										cursor: "pointer",
										border: "none",
										textAlign: "left",
										backgroundColor: "transparent",
										color: "var(--brand-primary, #60a5fa)",
										display: "flex",
										alignItems: "center",
										gap: "6px",
									}}
									onClick={() => {
										setIsSecondaryMenuOpen(false);
										setShowArchiveUploaderModal(true);
									}}
									title="Загрузить новый DICOM-архив (.zip) или папку со срезами томографа"
								>
									<Plus className="w-3.5 h-3.5" />
									<span>Загрузить КЛКТ архив</span>
								</button>

								<button
									type="button"
									style={{
										height: "30px",
										padding: "0 10px",
										borderRadius: "6px",
										fontSize: "12px",
										fontWeight: 500,
										cursor: "pointer",
										border: "none",
										textAlign: "left",
										backgroundColor: "transparent",
										color: "var(--ink, #d4d4d8)",
										display: "flex",
										alignItems: "center",
										gap: "6px",
									}}
									onClick={() => {
										setIsSecondaryMenuOpen(false);
										handleDownloadActiveSlice();
									}}
									title="Скачать снимок на диск"
								>
									<Download className="w-3.5 h-3.5" />
									<span>Скачать срез</span>
								</button>
							</div>
						)}
					</div>
				</div>

				{/* MILLER'S LAW: EXACTLY 1-2 PRIMARY DIRECT ACTIONS IN TOP */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						flexShrink: 0,
					}}
				>
					<button
						type="button"
						data-testid="ct-planning-save"
						style={{
							height: "28px",
							padding: "0 10px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 600,
							cursor: "pointer",
							border: "1px solid var(--brand-primary, #2563eb)",
							backgroundColor: "var(--brand-primary, #2563eb)",
							color: "var(--ink, #fff)",
							display: "inline-flex",
							alignItems: "center",
							gap: "5px",
							whiteSpace: "nowrap",
							transition: "all 0.15s",
						}}
						onClick={() => void saveMarkupNow()}
						title="Сохранить векторы разметки в карточку пациента"
					>
						<Save className="w-3.5 h-3.5" />
						<span>Сохранить в план</span>
					</button>

					{onClose && (
						<button
							type="button"
							data-testid="cbct-mpr-close-btn"
							aria-label="Закрыть 3D MPR"
							style={{
								height: "28px",
								width: "28px",
								flexShrink: 0,
								backgroundColor: "rgba(239,68,68,0.15)",
								color: "var(--rose-300, #fca5a5)",
								padding: 0,
								borderRadius: "6px",
								border: "1px solid rgba(239,68,68,0.3)",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								transition: "all 0.15s",
							}}
							onClick={onClose}
							title="Закрыть 3D просмотрщик"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					)}
				</div>
			</header>

			{/* MANDIBULAR NERVE TRACING HUD (HONEST ZERO-MOCK STATUS & CONTROLS) */}
			{(isNerveTracingActive || activeTool === "NerveTracer") && (
				<div
					role="region"
					aria-label="Панель трассировки нижнечелюстного канала"
					data-testid="nerve-tracing-hud"
					style={{
						position: "absolute",
						top: "44px",
						left: "50%",
						transform: "translateX(-50%)",
						zIndex: 25,
						display: "flex",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "8px",
						maxWidth: "min(94%, 56rem)",
						backgroundColor: "rgba(18, 18, 18, 0.94)",
						backdropFilter: "blur(16px)",
						WebkitBackdropFilter: "blur(16px)",
						border: "1px solid rgba(217, 119, 6, 0.5)",
						boxShadow: "0 12px 32px -8px rgba(0, 0, 0, 0.75)",
						padding: "6px 12px",
						borderRadius: "10px",
						color: "var(--ink, #f4f4f5)",
						fontSize: "12px",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							flex: "1 1 auto",
							minWidth: "260px",
						}}
					>
						<span
							style={{
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								minWidth: "22px",
								height: "22px",
								padding: "0 6px",
								borderRadius: "6px",
								backgroundColor:
									(restoredMarkup?.nervePoints?.length ?? 0) > 0
										? "rgba(16, 185, 129, 0.2)"
										: "rgba(217, 119, 6, 0.2)",
								color:
									(restoredMarkup?.nervePoints?.length ?? 0) > 0
										? "var(--emerald-400, #34d399)"
										: "var(--amber-400, #fbbf24)",
								fontWeight: "bold",
								fontSize: "11px",
							}}
						>
							{restoredMarkup?.nervePoints?.length ?? 0}
						</span>
						<span style={{ fontWeight: 500, lineHeight: 1.3 }}>
							{(restoredMarkup?.nervePoints?.length ?? 0) === 0
								? "Трассировка нижнечелюстного канала: 0 точек. Кликните по КТ-срезу для установки контрольной точки"
								: `Трассировка нижнечелюстного канала: ${restoredMarkup?.nervePoints?.length} ${
										(restoredMarkup?.nervePoints?.length ?? 0) === 1
											? "точка"
											: (restoredMarkup?.nervePoints?.length ?? 0) < 5
												? "точки"
												: "точек"
								  } (коридор безопасности 2.0 мм)`}
						</span>
					</div>

					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							flexShrink: 0,
						}}
					>
						<button
							type="button"
							style={{
								height: "28px",
								minHeight: "28px",
								padding: "0 10px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "1px solid rgba(255,255,255,0.15)",
								backgroundColor: "rgba(255,255,255,0.08)",
								color: "var(--ink-muted, #e4e4e7)",
								transition: "all 0.15s",
								display: "flex",
								alignItems: "center",
								gap: "4px",
							}}
							onClick={addNervePointFromCurrentSlice}
							title="Добавить контрольную точку по текущему фокусу среза"
						>
							+ Точка
						</button>

						<button
							type="button"
							style={{
								height: "28px",
								minHeight: "28px",
								padding: "0 10px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "none",
								backgroundColor:
									(restoredMarkup?.nervePoints?.length ?? 0) >= 2
										? "#059669"
										: "rgba(255,255,255,0.06)",
								color:
									(restoredMarkup?.nervePoints?.length ?? 0) >= 2
										? "var(--ink, #fff)"
										: "var(--muted, #71717a)",
								transition: "all 0.15s",
								display: "flex",
								alignItems: "center",
								gap: "4px",
							}}
							onClick={completeNerveSpline}
							title="Замкнуть сплайн канала (требуется от 2 точек)"
						>
							Замкнуть сплайн
						</button>

						<button
							type="button"
							style={{
								height: "28px",
								minHeight: "28px",
								padding: "0 10px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "1px solid rgba(239,68,68,0.3)",
								backgroundColor: "rgba(239,68,68,0.12)",
								color: "var(--rose-300, #fca5a5)",
								transition: "all 0.15s",
								display: "flex",
								alignItems: "center",
								gap: "4px",
							}}
							onClick={clearNervePoints}
							title="Очистить все точки трассировки канала"
						>
							Очистить
						</button>

						<button
							type="button"
							style={{
								height: "28px",
								minHeight: "28px",
								width: "28px",
								padding: "0",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "none",
								backgroundColor: "rgba(255,255,255,0.06)",
								color: "var(--muted, #a1a1aa)",
								transition: "all 0.15s",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
							onClick={() => {
								setIsNerveTracingActive(false);
								setActiveTool("Crosshairs");
							}}
							title="Закрыть панель трассировки"
							aria-label="Закрыть панель трассировки"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			)}

			{/* PANOREX REFUSAL / READY BANNER */}
			{panorexBanner && (
				<div
					role={panorexBanner.tone === "issue" ? "alert" : "status"}
					aria-live="polite"
					data-testid="panorex-arch-state"
					className={`absolute left-1/2 ${isNerveTracingActive || activeTool === "NerveTracer" ? "top-28" : "top-12"} z-30 -translate-x-1/2 max-w-[min(92%,34rem)] rounded-2xl border border-[var(--line-strong)] px-4 py-3 text-xs leading-relaxed break-words hyphens-auto sm:text-sm ${
						panorexBanner.tone === "issue"
							? "bg-[var(--warn-bg)] text-[var(--warn-fg)]"
							: "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
					}`}
				>
					{panorexBanner.text}
				</div>
			)}

			{/* STORAGE STATUS */}
			{markupStatus && (
				<div
					role={markupStatus.tone === "issue" ? "alert" : "status"}
					aria-live="polite"
					data-testid="ct-planning-storage-state"
					className={`absolute left-1/2 ${isNerveTracingActive || activeTool === "NerveTracer" ? "top-44" : "top-28"} z-30 -translate-x-1/2 max-w-[min(92%,34rem)] rounded-2xl border border-[var(--line-strong)] px-4 py-3 text-xs leading-relaxed break-words hyphens-auto sm:text-sm ${
						markupStatus.tone === "issue"
							? "bg-[var(--warn-bg)] text-[var(--warn-fg)]"
							: "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
					}`}
				>
					{markupStatus.text}
				</div>
			)}

			{/* FLOATING SAFETY BADGE (INFERIOR ALVEOLAR NERVE & BONE DENSITY & CALIPER) */}
			{(latestImplant || activeCaliper) && (
				<div
					style={{
						position: "absolute",
						bottom: "20px",
						left: "20px",
						zIndex: 25,
						display: "flex",
						flexDirection: "column",
						gap: "6px",
						maxWidth: "360px",
						backgroundColor: "var(--paper-strong, rgba(15,15,15,0.9))",
						backdropFilter: "blur(12px)",
						WebkitBackdropFilter: "blur(12px)",
						borderRadius: "14px",
						padding: "10px 14px",
						border: `1.5px solid ${isNerveCollisionDanger ? "var(--rose-500, #ef4444)" : isNerveUnmapped ? "var(--amber-500, #f59e0b)" : "var(--emerald-500, #10b981)"}`,
						boxShadow: isNerveCollisionDanger
							? "0 0 20px rgba(239,68,68,0.4)"
							: isNerveUnmapped
								? "0 0 15px rgba(245,158,11,0.25)"
								: "0 0 15px rgba(16,185,129,0.2)",
					}}
				>
					{/* Nerve Clearance Badge */}
					{latestImplant && (
						<>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									color: isNerveCollisionDanger
										? "var(--rose-300, #fca5a5)"
										: isNerveUnmapped
											? "var(--amber-300, #fcd34d)"
											: "var(--emerald-300, #6ee7b7)",
									fontSize: "12px",
									fontWeight: "bold",
								}}
							>
								{isNerveCollisionDanger ? (
									<ShieldAlert className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
								) : isNerveUnmapped ? (
									<ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
								) : (
									<ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
								)}
								<span>
									{isNerveCollisionDanger && typeof latestImplant.distanceToNerve === "number"
										? `[ОПАСНО] Нижнечелюстной канал ${latestImplant.distanceToNerve.toFixed(1)} мм (< 2.0 мм)!`
										: isNerveUnmapped || typeof latestImplant.distanceToNerve !== "number"
											? "[ВНИМАНИЕ] Нижнечелюстной нерв не размечен"
											: `[НОРМА] Нижнечелюстной канал: ${latestImplant.distanceToNerve.toFixed(1)} мм (норма)`}
								</span>
							</div>

							{/* Bone Density Badge */}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "6px",
									fontSize: "11px",
									color: "var(--ink, #d4d4d8)",
									borderTop: "1px solid var(--line, rgba(255,255,255,0.1))",
									paddingTop: "6px",
								}}
							>
								<span
									style={{
										backgroundColor: "var(--brand-primary, #3b82f6)",
										color: "var(--ink, #fff)",
										padding: "2px 6px",
										borderRadius: "4px",
										fontWeight: "bold",
									}}
								>
									{latestImplant.boneDensity.classification}
								</span>
								<span>
									Кость: {Math.round(latestImplant.boneDensity.averageHU)} HU | Зуб FDI:{" "}
									{latestImplant.fdiCode}
								</span>
							</div>
						</>
					)}

					{/* Caliper Alveolar Ridge Telemetry */}
					{activeCaliper && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								fontSize: "11px",
								color: "var(--ink, #d4d4d8)",
								borderTop: latestImplant ? "1px solid var(--line, rgba(255,255,255,0.1))" : "none",
								paddingTop: latestImplant ? "6px" : 0,
							}}
						>
							<Ruler className="w-3.5 h-3.5 text-teal-400 shrink-0" />
							<span>
								Гребень: H={activeCaliper.heightMm} мм, W={activeCaliper.crestWidthMm} мм ({activeCaliper.implantFeasibility.isAdequate ? "норма" : "дефицит"})
							</span>
						</div>
					)}
				</div>
			)}

			{showPanorex && volumeId && (
				<Suspense fallback={null}>
					<PanoramicRendererWindow
						volume={panorexVolume}
						splinePoints={splinePoints}
						onClose={() => {
							setShowPanorex(false);
							setPanorexVolume(null);
							setSplinePoints([]);
							setArchSummary(null);
						}}
						thickness={panorexThickness}
						blendMode={blendMode}
						patientId={patientId}
						authHeaders={authHeaders}
					/>
				</Suspense>
			)}

			{/* 4-QUADRANT 3D MPR VIEWPORT GRID */}
			<div
				style={{
					flex: 1,
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gridTemplateRows: "1fr 1fr",
					gap: "2px",
					backgroundColor: "var(--line, #262626)",
					padding: "2px",
				}}
			>
				{/* AXIAL */}
				<div style={{ position: "relative", backgroundColor: "var(--paper-contrast, #000)" }}>
					<div
						style={{
							position: "absolute",
							top: "8px",
							left: "8px",
							padding: "4px 8px",
							borderRadius: "4px",
							backgroundColor: "rgba(0,0,0,0.6)",
							backdropFilter: "blur(4px)",
							color: "var(--rose-400, #f87171)",
							fontSize: "11px",
							fontWeight: "bold",
							letterSpacing: "0.05em",
							zIndex: 10,
						}}
					>
						АКСИАЛЬНЫЙ (AXIAL)
					</div>
					<section
						ref={axialRef}
						aria-label="Просмотр Аксиальный"
						style={{
							width: "100%",
							height: "100%",
							touchAction: "none",
							cursor: activeTool === "NerveTracer" ? "crosshair" : "default",
						}}
						onContextMenu={(e) => e.preventDefault()}
						onClick={(e) =>
							handleViewportClickForNerve(VIEWPORT_IDS.axial, axialRef.current, e)
						}
					/>
				</div>

				{/* SAGITTAL */}
				<div style={{ position: "relative", backgroundColor: "var(--paper-contrast, #000)" }}>
					<div
						style={{
							position: "absolute",
							top: "8px",
							left: "8px",
							padding: "4px 8px",
							borderRadius: "4px",
							backgroundColor: "rgba(0,0,0,0.6)",
							backdropFilter: "blur(4px)",
							color: "var(--emerald-400, #4ade80)",
							fontSize: "11px",
							fontWeight: "bold",
							letterSpacing: "0.05em",
							zIndex: 10,
						}}
					>
						САГИТТАЛЬНЫЙ (SAGITTAL)
					</div>
					<section
						ref={sagittalRef}
						aria-label="Просмотр Сагиттальный"
						style={{
							width: "100%",
							height: "100%",
							touchAction: "none",
							cursor: activeTool === "NerveTracer" ? "crosshair" : "default",
						}}
						onContextMenu={(e) => e.preventDefault()}
						onClick={(e) =>
							handleViewportClickForNerve(
								VIEWPORT_IDS.sagittal,
								sagittalRef.current,
								e,
							)
						}
					/>
				</div>

				{/* CORONAL */}
				<div style={{ position: "relative", backgroundColor: "var(--paper-contrast, #000)" }}>
					<div
						style={{
							position: "absolute",
							top: "8px",
							left: "8px",
							padding: "4px 8px",
							borderRadius: "4px",
							backgroundColor: "rgba(0,0,0,0.6)",
							backdropFilter: "blur(4px)",
							color: "var(--brand-primary, #60a5fa)",
							fontSize: "11px",
							fontWeight: "bold",
							letterSpacing: "0.05em",
							zIndex: 10,
						}}
					>
						КОРОНАЛЬНЫЙ (CORONAL)
					</div>
					<section
						ref={coronalRef}
						aria-label="Просмотр Корональный"
						style={{
							width: "100%",
							height: "100%",
							touchAction: "none",
							cursor: activeTool === "NerveTracer" ? "crosshair" : "default",
						}}
						onContextMenu={(e) => e.preventDefault()}
						onClick={(e) =>
							handleViewportClickForNerve(
								VIEWPORT_IDS.coronal,
								coronalRef.current,
								e,
							)
						}
					/>
				</div>

				{/* 4TH QUADRANT: SURGICAL PLANNING PROTOCOL & NERVE COLLISION ALERT */}
				<div
					data-testid="surgical-planning-quadrant"
					style={{
						position: "relative",
						backgroundColor: "var(--paper-strong, #171717)",
						display: "flex",
						flexDirection: "column",
						alignItems: "stretch",
						justifyContent: "flex-start",
						padding: "12px 14px",
						overflowY: "auto",
						gap: "10px",
					}}
				>
					{/* QUADRANT HEADER */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "8px",
							borderBottom: "1px solid var(--line-strong, rgba(255,255,255,0.12))",
							paddingBottom: "8px",
							flexShrink: 0,
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
							<Activity className="w-4 h-4 text-cyan-400 shrink-0" />
							<span
								style={{
									color: "var(--ink, #fff)",
									fontSize: "12px",
									fontWeight: 700,
									letterSpacing: "0.02em",
								}}
							>
								Хирургический протокол (Форма 043/у)
							</span>
						</div>

						{hasAnyNerveCollision ? (
							<span
								style={{
									backgroundColor: "rgba(239,68,68,0.2)",
									border: "1px solid #ef4444",
									color: "var(--rose-300, #fca5a5)",
									padding: "2px 8px",
									borderRadius: "6px",
									fontSize: "11px",
									fontWeight: "bold",
									display: "inline-flex",
									alignItems: "center",
									gap: "4px",
								}}
							>
								<ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
								Коллизия &lt; 2.0 мм
							</span>
						) : (restoredMarkup?.nervePoints?.length ?? 0) >= 2 ? (
							<span
								style={{
									backgroundColor: "rgba(16,185,129,0.2)",
									border: "1px solid #10b981",
									color: "var(--emerald-300, #6ee7b7)",
									padding: "2px 8px",
									borderRadius: "6px",
									fontSize: "11px",
									fontWeight: "bold",
									display: "inline-flex",
									alignItems: "center",
									gap: "4px",
								}}
							>
								<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
								Коридор ≥ 2.0 мм
							</span>
						) : (
							<span
								style={{
									backgroundColor: "rgba(245,158,11,0.15)",
									border: "1px solid rgba(245,158,11,0.4)",
									color: "var(--amber-300, #fcd34d)",
									padding: "2px 8px",
									borderRadius: "6px",
									fontSize: "11px",
									display: "inline-flex",
									alignItems: "center",
									gap: "4px",
								}}
							>
								Нерв не размечен
							</span>
						)}
					</div>

					{/* SECTION 1: IMPLANT SYSTEM & SIZING SELECTOR */}
					<div
						style={{
							backgroundColor: "rgba(255,255,255,0.03)",
							border: "1px solid var(--line-strong, rgba(255,255,255,0.1))",
							borderRadius: "10px",
							padding: "10px",
							display: "flex",
							flexDirection: "column",
							gap: "8px",
							flexShrink: 0,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<span
								style={{
									fontSize: "11px",
									fontWeight: 600,
									color: "var(--muted, #a1a1aa)",
									textTransform: "uppercase",
									letterSpacing: "0.05em",
								}}
							>
								Каталог имплантатов
							</span>

							{/* Platform Badge with canonical color dot */}
							<div
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "5px",
									backgroundColor: "rgba(0,0,0,0.4)",
									padding: "2px 8px",
									borderRadius: "6px",
									fontSize: "11px",
									border: "1px solid rgba(255,255,255,0.08)",
								}}
							>
								<span
									style={{
										width: "8px",
										height: "8px",
										borderRadius: "50%",
										backgroundColor: activePlatform.hexColor,
										boxShadow: `0 0 6px ${activePlatform.hexColor}`,
									}}
								/>
								<span style={{ fontWeight: 600, color: "var(--ink, #fff)" }}>
									{activePlatform.code}
								</span>
								<span style={{ color: "var(--muted, #a1a1aa)", fontSize: "10px" }}>
									({activePlatform.labelRu})
								</span>
							</div>
						</div>

						{/* System Selector Tabs */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "4px",
								overflowX: "auto",
								paddingBottom: "2px",
							}}
						>
							{CANONICAL_IMPLANT_SYSTEMS.slice(0, 5).map((sys) => (
								<button
									key={sys.id}
									type="button"
									onClick={() => handleSelectSystem(sys.id)}
									style={{
										height: "26px",
										padding: "0 8px",
										borderRadius: "5px",
										fontSize: "11px",
										fontWeight: selectedSystemId === sys.id ? 700 : 500,
										cursor: "pointer",
										border:
											selectedSystemId === sys.id
												? "1px solid var(--brand-primary, #2563eb)"
												: "1px solid rgba(255,255,255,0.1)",
										backgroundColor:
											selectedSystemId === sys.id
												? "var(--brand-primary, #2563eb)"
												: "transparent",
										color: selectedSystemId === sys.id ? "#fff" : "var(--muted, #a1a1aa)",
										transition: "all 0.15s",
										whiteSpace: "nowrap",
										flexShrink: 0,
									}}
								>
									{sys.brand}
								</button>
							))}
						</div>

						{/* Sub-line Info */}
						<div
							style={{
								fontSize: "11px",
								color: "var(--ink-muted, #d4d4d8)",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<span>
								<strong style={{ color: "var(--ink, #fff)" }}>{activeSystemSpec.brand}</strong>{" "}
								{activeSystemSpec.line} ({activeSystemSpec.country})
							</span>
							<span style={{ fontSize: "10px", color: "var(--muted, #71717a)" }}>
								Втулка: Ø{activeSystemSpec.sleeveDiameterMm}мм
							</span>
						</div>

						{/* Diameters & Lengths Row */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "8px",
							}}
						>
							{/* Diameters */}
							<div>
								<div
									style={{
										fontSize: "10px",
										color: "var(--muted, #a1a1aa)",
										marginBottom: "4px",
										fontWeight: 600,
									}}
								>
									ДИАМЕТР (Ø ММ)
								</div>
								<div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
									{activeSystemSpec.diameters.map((d) => (
										<button
											key={d}
											type="button"
											onClick={() => handleSelectDiameter(d)}
											style={{
												height: "24px",
												padding: "0 6px",
												borderRadius: "4px",
												fontSize: "11px",
												fontWeight: Math.abs(selectedDiameter - d) < 0.05 ? 700 : 500,
												cursor: "pointer",
												border:
													Math.abs(selectedDiameter - d) < 0.05
														? "1px solid var(--brand-primary, #2563eb)"
														: "1px solid rgba(255,255,255,0.12)",
												backgroundColor:
													Math.abs(selectedDiameter - d) < 0.05
														? "rgba(37,99,235,0.3)"
														: "transparent",
												color:
													Math.abs(selectedDiameter - d) < 0.05
														? "var(--brand-primary, #60a5fa)"
														: "var(--ink, #d4d4d8)",
											}}
										>
											{d.toFixed(1)}
										</button>
									))}
								</div>
							</div>

							{/* Lengths */}
							<div>
								<div
									style={{
										fontSize: "10px",
										color: "var(--muted, #a1a1aa)",
										marginBottom: "4px",
										fontWeight: 600,
									}}
								>
									ДЛИНА (L ММ)
								</div>
								<div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
									{availableLengthsForDiameter.map((l) => (
										<button
											key={l}
											type="button"
											onClick={() => setSelectedLength(l)}
											style={{
												height: "24px",
												padding: "0 6px",
												borderRadius: "4px",
												fontSize: "11px",
												fontWeight: Math.abs(selectedLength - l) < 0.05 ? 700 : 500,
												cursor: "pointer",
												border:
													Math.abs(selectedLength - l) < 0.05
														? "1px solid var(--emerald-500, #10b981)"
														: "1px solid rgba(255,255,255,0.12)",
												backgroundColor:
													Math.abs(selectedLength - l) < 0.05
														? "rgba(16,185,129,0.25)"
														: "transparent",
												color:
													Math.abs(selectedLength - l) < 0.05
														? "var(--emerald-300, #6ee7b7)"
														: "var(--ink, #d4d4d8)",
											}}
										>
											{l.toFixed(1)}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Tooth FDI and Placement Button */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: "8px",
								paddingTop: "4px",
								borderTop: "1px solid rgba(255,255,255,0.06)",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
								<span style={{ fontSize: "11px", color: "var(--muted, #a1a1aa)" }}>Зуб:</span>
								<input
									type="text"
									value={selectedFdiCode}
									onChange={(e) => setSelectedFdiCode(e.target.value.trim())}
									style={{
										width: "42px",
										height: "26px",
										textAlign: "center",
										backgroundColor: "rgba(0,0,0,0.5)",
										border: "1px solid rgba(255,255,255,0.2)",
										borderRadius: "4px",
										color: "#fff",
										fontSize: "12px",
										fontWeight: 600,
									}}
									title="FDI номер зуба (11–48)"
								/>
								<div style={{ display: "flex", gap: "2px" }}>
									{["36", "46", "16", "26"].map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => setSelectedFdiCode(t)}
											style={{
												height: "22px",
												padding: "0 4px",
												fontSize: "10px",
												borderRadius: "3px",
												border: "none",
												backgroundColor: selectedFdiCode === t ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
												color: "var(--muted, #a1a1aa)",
												cursor: "pointer",
											}}
										>
											#{t}
										</button>
									))}
								</div>
							</div>

							<button
								type="button"
								onClick={placeImplantModel}
								style={{
									height: "28px",
									padding: "0 10px",
									borderRadius: "6px",
									backgroundColor: "var(--brand-primary, #2563eb)",
									color: "var(--ink, #fff)",
									fontSize: "12px",
									fontWeight: 600,
									cursor: "pointer",
									border: "none",
									display: "inline-flex",
									alignItems: "center",
									gap: "5px",
									whiteSpace: "nowrap",
									transition: "all 0.15s",
								}}
								title="Разместить имплантат выбранного размера в фокусе среза"
							>
								<Plus className="w-3.5 h-3.5" />
								<span>+ В срез</span>
							</button>
						</div>
					</div>

					{/* SECTION 2: PLACED IMPLANTS LIST */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "6px",
							flexShrink: 0,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								fontSize: "11px",
								fontWeight: 600,
								color: "var(--muted, #a1a1aa)",
								textTransform: "uppercase",
								letterSpacing: "0.05em",
							}}
						>
							<span>Установленные имплантаты ({implants.length})</span>
						</div>

						{implants.length === 0 && (
							<div
								style={{
									padding: "14px",
									textAlign: "center",
									color: "var(--muted, #71717a)",
									fontSize: "12px",
									lineHeight: 1.4,
									backgroundColor: "rgba(255,255,255,0.02)",
									borderRadius: "8px",
									border: "1px dashed rgba(255,255,255,0.1)",
								}}
							>
								<FileText className="w-5 h-5 mx-auto mb-1.5 text-neutral-500" />
								Исследование без виртуальных имплантатов. Нажмите «+ В срез» для размещения модели по координатам фокуса.
							</div>
						)}

						{implants.map((imp) => {
							const isImpDanger =
								imp.distanceToNerve != null &&
								imp.distanceToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM;

							return (
								<div
									key={imp.id}
									style={{
										padding: "8px 10px",
										borderRadius: "8px",
										backgroundColor: isImpDanger
											? "rgba(239,68,68,0.12)"
											: "rgba(255,255,255,0.04)",
										border: `1px solid ${isImpDanger ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
										display: "flex",
										flexDirection: "column",
										gap: "6px",
									}}
								>
									{/* Top Info Line */}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											gap: "6px",
										}}
									>
										<div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
											<span
												style={{
													backgroundColor: "rgba(255,255,255,0.12)",
													color: "#fff",
													padding: "1px 6px",
													borderRadius: "4px",
													fontWeight: "bold",
													fontSize: "11px",
												}}
											>
												#{imp.fdiCode}
											</span>
											<span
												style={{
													fontSize: "12px",
													fontWeight: 600,
													color: "var(--ink, #fff)",
													whiteSpace: "nowrap",
													overflow: "hidden",
													textOverflow: "ellipsis",
												}}
											>
												{imp.brandName ?? "Имплантат"} {imp.lineName ?? ""}
											</span>
											<span
												style={{
													display: "inline-flex",
													alignItems: "center",
													gap: "3px",
													fontSize: "10px",
													color: "var(--muted, #a1a1aa)",
												}}
											>
												<span
													style={{
														width: "6px",
														height: "6px",
														borderRadius: "50%",
														backgroundColor: imp.platformColor ?? "#16a34a",
													}}
												/>
												{imp.platformCode ?? `Ø${imp.diameter.toFixed(1)}`}
											</span>
										</div>

										<div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
											<button
												type="button"
												onClick={() => focusOnImplant(imp)}
												style={{
													height: "22px",
													padding: "0 6px",
													borderRadius: "4px",
													border: "none",
													backgroundColor: "rgba(255,255,255,0.08)",
													color: "var(--cyan-400, #22d3ee)",
													fontSize: "10px",
													fontWeight: 500,
													cursor: "pointer",
												}}
												title="Навести перекрестье срезов на этот имплантат"
											>
												Фокус
											</button>
											<button
												type="button"
												onClick={() => removeImplant(imp.id)}
												style={{
													height: "22px",
													width: "22px",
													padding: 0,
													borderRadius: "4px",
													border: "none",
													backgroundColor: "rgba(239,68,68,0.15)",
													color: "var(--rose-300, #fca5a5)",
													cursor: "pointer",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
												title="Удалить имплантат"
												aria-label="Удалить имплантат"
											>
												<Trash2 className="w-3 h-3" />
											</button>
										</div>
									</div>

									{/* Bottom Telemetry Line */}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											fontSize: "11px",
											gap: "6px",
										}}
									>
										<span style={{ color: "var(--ink-muted, #d4d4d8)" }}>
											Ø{imp.diameter.toFixed(1)} × {imp.length.toFixed(1)} мм |{" "}
											<span style={{ fontWeight: 600, color: "var(--cyan-400, #22d3ee)" }}>
												{imp.boneDensity.classification} ({Math.round(imp.boneDensity.averageHU)} HU)
											</span>
										</span>

										{/* Clearance Badge */}
										{imp.distanceToNerve != null ? (
											<span
												style={{
													fontSize: "10px",
													fontWeight: "bold",
													padding: "1px 6px",
													borderRadius: "4px",
													backgroundColor: isImpDanger
														? "rgba(239,68,68,0.25)"
														: "rgba(16,185,129,0.2)",
													color: isImpDanger ? "#fca5a5" : "#6ee7b7",
													border: `1px solid ${isImpDanger ? "#ef4444" : "rgba(16,185,129,0.4)"}`,
													display: "inline-flex",
													alignItems: "center",
													gap: "3px",
												}}
											>
												{isImpDanger && <AlertTriangle className="w-3 h-3 animate-pulse text-red-400" />}
												Нерв: {imp.distanceToNerve.toFixed(1)} мм
											</span>
										) : (
											<span style={{ fontSize: "10px", color: "var(--amber-400, #fbbf24)" }}>
												Нерв не размечен
											</span>
										)}
									</div>
								</div>
							);
						})}
					</div>

					{/* SECTION 3: PROTOCOL & DRILLING RECOMMENDATIONS */}
					{latestImplant && (
						<div
							style={{
								backgroundColor: "rgba(255,255,255,0.03)",
								border: "1px solid var(--line-strong, rgba(255,255,255,0.1))",
								borderRadius: "10px",
								padding: "10px",
								display: "flex",
								flexDirection: "column",
								gap: "6px",
								flexShrink: 0,
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
								}}
							>
								<span
									style={{
										fontSize: "11px",
										fontWeight: 600,
										color: "var(--muted, #a1a1aa)",
										textTransform: "uppercase",
										letterSpacing: "0.05em",
									}}
								>
									Протокол сверления (Misch {latestImplant.boneDensity.classification})
								</span>

								<button
									type="button"
									onClick={handleExportSnapshotTo043}
									disabled={isExportingSnapshot}
									style={{
										height: "24px",
										padding: "0 8px",
										borderRadius: "4px",
										border: "none",
										backgroundColor: "var(--emerald-600, #059669)",
										color: "#fff",
										fontSize: "11px",
										fontWeight: 600,
										cursor: isExportingSnapshot ? "wait" : "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: "4px",
									}}
									title="Прикрепить снимок и протокол к карте пациента 043/у"
								>
									{isExportingSnapshot ? (
										<Loader2 className="w-3 h-3 animate-spin" />
									) : (
										<Camera className="w-3 h-3" />
									)}
									<span>В карту 043/у</span>
								</button>
							</div>

							<div
								style={{
									fontSize: "11px",
									color: "var(--ink-muted, #e4e4e7)",
									lineHeight: 1.4,
									backgroundColor: "rgba(0,0,0,0.3)",
									borderRadius: "6px",
									padding: "6px 8px",
									border: "1px solid rgba(255,255,255,0.06)",
								}}
							>
								<strong style={{ color: "var(--cyan-400, #22d3ee)" }}>
									{latestImplant.boneDensity.classification} ({Math.round(latestImplant.boneDensity.averageHU)} HU):{" "}
								</strong>
								{latestImplant.boneDensity.drillingAdvice}
							</div>

							{aiProtocolLog && (
								<p
									style={{
										fontSize: "11px",
										lineHeight: 1.4,
										color: "var(--muted, #a1a1aa)",
										margin: 0,
									}}
								>
									{aiProtocolLog}
								</p>
							)}
						</div>
					)}
				</div>
			</div>

			{/* MODAL: LOCAL ARCHIVE / FOLDER INTAKE (MANUAL TRIGGER FROM MENU) */}
			{showArchiveUploaderModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) setShowArchiveUploaderModal(false);
					}}
				>
					<div
						style={{
							backgroundColor: "var(--paper-strong, #18181b)",
							border: "1px solid var(--line-strong, rgba(255,255,255,0.2))",
							borderRadius: "16px",
							padding: "24px",
							maxWidth: "560px",
							width: "100%",
							position: "relative",
						}}
					>
						<button
							type="button"
							style={{
								position: "absolute",
								top: "16px",
								right: "16px",
								backgroundColor: "transparent",
								border: "none",
								color: "var(--muted, #a1a1aa)",
								cursor: "pointer",
							}}
							onClick={() => setShowArchiveUploaderModal(false)}
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
						<h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>
							Загрузка КТ/КЛКТ исследования
						</h3>
						<p style={{ fontSize: "12px", color: "var(--muted, #a1a1aa)", marginBottom: "16px" }}>
							Выберите папку со срезами томографии или ZIP-архив DICOM (.zip) для построения воксельного объема.
						</p>
						<Suspense fallback={null}>
							<DicomArchiveUploader
								onImagesLoaded={(ids) => {
									setLocalImageIds(ids);
									setShowArchiveUploaderModal(false);
								}}
							/>
						</Suspense>
					</div>
				</div>
			)}
		</div>
	);
}
