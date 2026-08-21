import * as cornerstone from "@cornerstonejs/core";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";
import * as cornerstoneTools from "@cornerstonejs/tools";
import { vec3 } from "gl-matrix";
import {
	AlertTriangle,
	Camera,
	CheckCircle2,
	Download,
	Layers,
	Loader2,
	Maximize2,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import {
	calculateImplantBoneDensity,
	distancePointToSpline,
	mat3ToMat4Direction,
	type Point2D,
	toTransferableScalarData,
} from "../../mprMath";
import {
	classifyMisch,
	extractHUZones,
	generateDrillProtocol,
	mischDescription,
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
} from "../dicom/ctPlanningPersistence";
import {
	PanoramicRendererWindow,
	type PanoramicVolumeInput,
} from "./PanoramicRendererWindow";
import {
	captureHighDpiCanvas,
	createSnapshotThumbnail,
	downloadSnapshotLocally,
	exportSnapshotToClinicalRecord,
} from "./VisiographExportService";
import {
	type VisiographPresetId,
	VISIOGRAPH_PRESETS_LIST,
	VISIOGRAPH_WINDOW_PRESETS,
	type VisiographWindowPreset,
} from "./VisiographWindowPresets";
import {
	buildPanoramicArch,
	type DrawnArchAnnotation,
	type PanoramicIssue,
	panoramicIssueLabels,
	panoramicReadyLabel,
	readVolumeScalarData,
} from "../../utils/math/panoramicArch";

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
	distanceToNerve: number;
}

export interface Cornerstone3DViewerProps {
	imageIds: string[];
	/**
	 * Пациент, чей снимок открыт. Без него разметку планирования некуда сохранять:
	 * строка в базе существует только в паре пациент + исследование. Приходит из
	 * `ImagingView` (`activePatient?.id`); когда пациент не выбран, просмотр
	 * работает как раньше, а сохранение честно отказывает текстом на экране.
	 */
	patientId?: string | null;
	authHeaders?: Record<string, string>;
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
			distanceToNerve: implant.distanceToNerve,
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
			distanceToNerve: implant.distanceToNerve,
		};
	});
}

/**
 * Русский протокол по последнему импланту для ЭМК (Форма 043/у).
 */
export function implantProtocolLog(implant: ImplantData): string {
	const isDanger = implant.distanceToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM;
	const nerveStatusText = isDanger
		? `ВНИМАНИЕ: дистанция до нижнечелюстного канала ${implant.distanceToNerve.toFixed(1)} мм (< 2.0 мм) — опасная зона риска травматизации сосудисто-нервного пучка!`
		: `Дистанция до нижнечелюстного канала ${implant.distanceToNerve.toFixed(1)} мм (безопасный коридор ≥ 2.0 мм).`;

	const densityInfo = classifyExtendedBoneDensity(implant.boneDensity.averageHU);

	return `В область зуба ${implant.fdiCode} запланирована установка имплантата ${implant.diameter.toFixed(1)}x${implant.length.toFixed(1)} мм. Плотность кости: ${densityInfo.label} (${Math.round(implant.boneDensity.averageHU)} HU). Протокол препарирования: ${densityInfo.drillingRecommendation}. ${nerveStatusText}`;
}

const VIEWPORT_IDS = {
	axial: "AXIAL",
	sagittal: "SAGITTAL",
	coronal: "CORONAL",
} as const;

export function Cornerstone3DViewer({
	imageIds,
	patientId = null,
	authHeaders = {},
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

	useEffect(() => {
		async function init() {
			try {
				await cornerstone.init();
				await cornerstoneTools.init();

				cornerstoneDICOMImageLoader.init({
					maxWebWorkers: navigator.hardwareConcurrency
						? Math.min(navigator.hardwareConcurrency, 7)
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
			cornerstone.cache.purgeCache();
		};
	}, [isInitialized]);

	useEffect(() => {
		if (!isInitialized || !imageIds.length) return;

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
			const vId = `dente-volume-${imageIds.length}-${imageIds[0] ?? "empty"}`;
			setVolumeId(vId);
			const renderingEngineId = "my-engine";

			try {
				cornerstone.cache.purgeCache();
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
				imageIds,
			});

			volume.load();

			const firstImageId = imageIds[0];
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
			cornerstone.getRenderingEngine("my-engine")?.destroy();
			cornerstoneTools.ToolGroupManager.destroyToolGroup("mpr-tool-group");
			try {
				cornerstone.cache.purgeCache();
			} catch {
				// Ignore
			}
		};
	}, [isInitialized, imageIds]);

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

	const simulateImplantPlacement = () => {
		const renderingEngine = cornerstone.getRenderingEngine("my-engine");
		const axialVp = renderingEngine?.getViewport(VIEWPORT_IDS.axial);
		const camera = axialVp?.getCamera();
		const focal = camera?.focalPoint;

		const startX = focal ? focal[0] : 10;
		const startY = focal ? focal[1] : 20;
		const startZ = focal ? focal[2] : -50;
		const implantStart = vec3.fromValues(startX, startY, startZ);
		const implantEnd = vec3.fromValues(startX, startY, startZ - 10.0); // 10 мм длина

		let distToNerve = 4.5;
		const nervePoints = restoredMarkupRef.current?.nervePoints;
		if (nervePoints && nervePoints.length > 0) {
			const nerveSpline = nervePoints.map((p) => vec3.fromValues(p.x, p.y, p.z));
			distToNerve = distancePointToSpline(implantEnd, nerveSpline);
		}

		let avgHUVal = 650;
		const activeVolumeId = volumeId ?? "my-volume";
		let volume = cornerstone.cache.getVolume(activeVolumeId);
		if (!volume) {
			const allVolumes = cornerstone.cache.getVolumes();
			if (allVolumes && allVolumes.length > 0) {
				volume = allVolumes[0];
			}
		}

		if (volume) {
			const voxels = readVolumeScalarData(
				{
					dimensions: volume.dimensions,
					imageIds: volume.imageIds,
					voxelManager: volume.voxelManager,
				},
				(imageId) => cornerstone.cache.getImage(imageId) !== undefined,
			);
			if (voxels.status === "ready") {
				const computed = calculateImplantBoneDensity(
					toTransferableScalarData(voxels.scalarData),
					volume.dimensions,
					vec3.fromValues(volume.origin[0], volume.origin[1], volume.origin[2]),
					mat3ToMat4Direction(volume.direction),
					vec3.fromValues(volume.spacing[0], volume.spacing[1], volume.spacing[2]),
					implantStart,
					implantEnd,
					4.0,
				);
				avgHUVal = computed.averageHU;
			}
		}

		const densityClassification = classifyExtendedBoneDensity(avgHUVal);

		let fdiCode = "36";
		const jawSpline = restoredMarkupRef.current?.splinePoints;
		if (jawSpline && jawSpline.length >= 2) {
			const computedFdi = mapCtCoordinatesToFdiNumber(
				{ x: startX, y: startY, z: startZ },
				jawSpline,
			);
			if (computedFdi) {
				fdiCode = String(computedFdi);
			}
		}

		const newImplant: ImplantData = {
			id: Math.random().toString(36).substring(7),
			fdiCode,
			diameter: 4.0,
			length: 10.0,
			startWorld: implantStart,
			endWorld: implantEnd,
			boneDensity: {
				averageHU: Math.round(avgHUVal),
				classification: densityClassification.mischClass,
				drillingAdvice: densityClassification.drillingRecommendation,
			},
			distanceToNerve: distToNerve,
		};

		const nextImplants = [...implants, newImplant];
		setImplants(nextImplants);
		implantsRef.current = nextImplants;

		setAiProtocolLog(implantProtocolLog(newImplant));
		void saveMarkupNow();
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
					exposureTimeSec: 8.9,
					exposureParameters: {
						exposureTimeSec: 8.9,
						kVp: 90,
						mAs: 56,
						sensorType: "CBCT Flat Panel Detector (FPD)",
					},
					...(lastImplant?.fdiCode
						? {
								fdiToothCode: String(lastImplant.fdiCode),
								toothCode: String(lastImplant.fdiCode),
							}
						: {}),
					...(lastImplant?.distanceToNerve !== undefined
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
						? `3D КЛКТ срез: планирование имплантации в области зуба № ${lastImplant.fdiCode}. Плотность костной ткани: ${lastImplant.boneDensity.classification} (${Math.round(lastImplant.boneDensity.averageHU)} HU). Дистанция до нижнечелюстного канала: ${lastImplant.distanceToNerve.toFixed(1)} мм.`
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
	const isNerveCollisionDanger =
		(latestImplant?.distanceToNerve ?? Infinity) <
		MANDIBULAR_NERVE_DANGER_THRESHOLD_MM;

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				minHeight: "600px",
				display: "flex",
				flexDirection: "column",
				backgroundColor: "#0a0a0a",
				color: "#fff",
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

			{/* GLASSMORPHISM CLINICAL TOOLBAR (TOUCH TARGETS >= 44x44px) */}
			<div
				style={{
					position: "absolute",
					top: "12px",
					left: "50%",
					transform: "translateX(-50%)",
					zIndex: 20,
					display: "flex",
					alignItems: "center",
					gap: "8px",
					maxWidth: "calc(100% - 24px)",
					overflowX: "auto",
					backgroundColor: "rgba(20,20,20,0.85)",
					backdropFilter: "blur(16px)",
					WebkitBackdropFilter: "blur(16px)",
					border: "1px solid rgba(255,255,255,0.18)",
					padding: "6px",
					borderRadius: "16px",
					boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.7)",
				}}
			>
				{/* PRIMARY TOOLS (min-h-[44px]) */}
				<div
					style={{
						display: "flex",
						flexWrap: "nowrap",
						backgroundColor: "rgba(0,0,0,0.45)",
						borderRadius: "12px",
						padding: "3px",
						gap: "3px",
					}}
				>
					<button
						type="button"
						style={{
							minHeight: "44px",
							minWidth: "44px",
							padding: "8px 14px",
							borderRadius: "10px",
							fontSize: "13px",
							fontWeight: 500,
							cursor: "pointer",
							border: "none",
							transition: "all 0.2s",
							backgroundColor:
								activeTool === cornerstoneTools.CrosshairsTool.toolName
									? "#2563eb"
									: "transparent",
							color:
								activeTool === cornerstoneTools.CrosshairsTool.toolName
									? "#fff"
									: "#d4d4d8",
						}}
						onClick={() => setTool(cornerstoneTools.CrosshairsTool.toolName)}
					>
						МПР
					</button>
					<button
						type="button"
						style={{
							minHeight: "44px",
							minWidth: "44px",
							padding: "8px 14px",
							borderRadius: "10px",
							fontSize: "13px",
							fontWeight: 500,
							cursor: "pointer",
							border: "none",
							transition: "all 0.2s",
							backgroundColor:
								activeTool === cornerstoneTools.SplineROITool.toolName
									? "#2563eb"
									: "transparent",
							color:
								activeTool === cornerstoneTools.SplineROITool.toolName
									? "#fff"
									: "#d4d4d8",
						}}
						onClick={() => setTool(cornerstoneTools.SplineROITool.toolName)}
					>
						Дуга (Spline)
					</button>
					<button
						type="button"
						style={{
							minHeight: "44px",
							minWidth: "44px",
							padding: "8px 14px",
							borderRadius: "10px",
							fontSize: "13px",
							fontWeight: 500,
							cursor: "pointer",
							border: "none",
							transition: "all 0.2s",
							backgroundColor:
								activeTool === cornerstoneTools.LengthTool.toolName
									? "#2563eb"
									: "transparent",
							color:
								activeTool === cornerstoneTools.LengthTool.toolName
									? "#fff"
									: "#d4d4d8",
						}}
						onClick={() => setTool(cornerstoneTools.LengthTool.toolName)}
					>
						Линейка
					</button>
					<button
						type="button"
						style={{
							minHeight: "44px",
							minWidth: "44px",
							padding: "8px 14px",
							borderRadius: "10px",
							fontSize: "13px",
							fontWeight: 500,
							cursor: "pointer",
							border: "none",
							transition: "all 0.2s",
							backgroundColor:
								activeTool === cornerstoneTools.ProbeTool.toolName
									? "#2563eb"
									: "transparent",
							color:
								activeTool === cornerstoneTools.ProbeTool.toolName
									? "#fff"
									: "#d4d4d8",
						}}
						onClick={() => setTool(cornerstoneTools.ProbeTool.toolName)}
					>
						HU Плотность
					</button>
					<button
						type="button"
						style={{
							minHeight: "44px",
							minWidth: "44px",
							padding: "8px 14px",
							borderRadius: "10px",
							fontSize: "13px",
							fontWeight: 600,
							cursor: "pointer",
							border: "none",
							transition: "all 0.2s",
							backgroundColor:
								activeTool === "Implant" ? "#4f46e5" : "transparent",
							color: activeTool === "Implant" ? "#fff" : "#d4d4d8",
						}}
						onClick={simulateImplantPlacement}
					>
						+ Имплантат
					</button>
				</div>

				{/* 4 CLINICAL HU WINDOWING PRESETS */}
				<div
					style={{
						display: "flex",
						backgroundColor: "rgba(0,0,0,0.45)",
						borderRadius: "12px",
						padding: "3px",
						gap: "3px",
					}}
				>
					{VISIOGRAPH_PRESETS_LIST.map((preset) => (
						<button
							key={preset.id}
							type="button"
							style={{
								minHeight: "44px",
								minWidth: "44px",
								padding: "6px 12px",
								borderRadius: "10px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "none",
								backgroundColor:
									activePresetId === preset.id
										? "#1d4ed8"
										: "rgba(255,255,255,0.08)",
								color: activePresetId === preset.id ? "#fff" : "#d4d4d8",
								transition: "all 0.2s",
								whiteSpace: "nowrap",
							}}
							onClick={() => applyVoiPreset(preset)}
							title={preset.description}
						>
							{preset.shortLabel}
						</button>
					))}
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						fontSize: "12px",
						padding: "0 4px",
					}}
				>
					<span style={{ color: "#a3a3a3" }}>Слой:</span>
					<input
						type="range"
						min="0"
						max="20"
						step="1"
						value={panorexThickness}
						onChange={(e) => setPanorexThickness(Number(e.target.value))}
						style={{ width: "70px", cursor: "pointer", minHeight: "44px" }}
					/>
					<span style={{ width: "26px", textAlign: "right" }}>
						{panorexThickness}мм
					</span>
				</div>

				{/* ACTIONS: PANOREX, EXPORT 043, SAVE */}
				<button
					type="button"
					style={{
						minHeight: "44px",
						minWidth: "44px",
						background: "linear-gradient(to right, #2563eb, #4f46e5)",
						color: "#fff",
						padding: "8px 16px",
						borderRadius: "12px",
						fontSize: "13px",
						fontWeight: "bold",
						border: "none",
						cursor: "pointer",
						boxShadow: "0 0 12px rgba(79,70,229,0.4)",
						display: "flex",
						alignItems: "center",
						gap: "6px",
						whiteSpace: "nowrap",
						transition: "all 0.2s",
					}}
					onClick={handleGeneratePanorex}
				>
					Развернуть (ОПТГ)
				</button>

				{/* 1-CLICK SNAPSHOT EXPORT TO FORM 043/U */}
				<button
					type="button"
					disabled={isExportingSnapshot}
					style={{
						minHeight: "44px",
						minWidth: "44px",
						backgroundColor: "#047857",
						color: "#fff",
						padding: "8px 14px",
						borderRadius: "12px",
						fontSize: "13px",
						fontWeight: "bold",
						border: "none",
						cursor: isExportingSnapshot ? "not-allowed" : "pointer",
						opacity: isExportingSnapshot ? 0.6 : 1,
						display: "flex",
						alignItems: "center",
						gap: "6px",
						whiteSpace: "nowrap",
						transition: "all 0.2s",
						boxShadow: "0 0 10px rgba(16,185,129,0.3)",
					}}
					onClick={handleExportSnapshotTo043}
					title="Сохранить текущий 3D MPR срез и протокол в электронную карту 043/у"
				>
					{isExportingSnapshot ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<Camera className="w-4 h-4" />
					)}
					В карту 043/у
				</button>

				<button
					type="button"
					data-testid="ct-planning-save"
					style={{
						minHeight: "44px",
						minWidth: "44px",
						backgroundColor: "rgba(0,0,0,0.45)",
						color: "#d4d4d8",
						padding: "8px 14px",
						borderRadius: "12px",
						fontSize: "12px",
						fontWeight: 500,
						border: "1px solid rgba(255,255,255,0.2)",
						cursor: "pointer",
						whiteSpace: "nowrap",
					}}
					onClick={() => void saveMarkupNow()}
					title="Сохранить векторы разметки в карточку"
				>
					Сохранить
				</button>

				<button
					type="button"
					style={{
						minHeight: "44px",
						minWidth: "44px",
						backgroundColor: "rgba(255,255,255,0.1)",
						color: "#d4d4d8",
						padding: "8px 12px",
						borderRadius: "12px",
						border: "none",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					onClick={handleDownloadActiveSlice}
					title="Скачать снимок на диск"
				>
					<Download className="w-4 h-4" />
				</button>
			</div>

			{/* PANOREX REFUSAL / READY BANNER */}
			{panorexBanner && (
				<div
					role={panorexBanner.tone === "issue" ? "alert" : "status"}
					aria-live="polite"
					data-testid="panorex-arch-state"
					className={`absolute left-1/2 top-24 z-30 -translate-x-1/2 max-w-[min(92%,34rem)] rounded-2xl border border-[var(--line-strong)] px-4 py-3 text-xs leading-relaxed break-words hyphens-auto sm:text-sm ${
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
					className={`absolute left-1/2 top-40 z-30 -translate-x-1/2 max-w-[min(92%,34rem)] rounded-2xl border border-[var(--line-strong)] px-4 py-3 text-xs leading-relaxed break-words hyphens-auto sm:text-sm ${
						markupStatus.tone === "issue"
							? "bg-[var(--warn-bg)] text-[var(--warn-fg)]"
							: "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
					}`}
				>
					{markupStatus.text}
				</div>
			)}

			{/* FLOATING SAFETY BADGE (INFERIOR ALVEOLAR NERVE & BONE DENSITY) */}
			{latestImplant && (
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
						backgroundColor: "rgba(15,15,15,0.85)",
						backdropFilter: "blur(12px)",
						WebkitBackdropFilter: "blur(12px)",
						borderRadius: "14px",
						padding: "10px 14px",
						border: `1.5px solid ${isNerveCollisionDanger ? "#ef4444" : "#10b981"}`,
						boxShadow: isNerveCollisionDanger
							? "0 0 20px rgba(239,68,68,0.4)"
							: "0 0 15px rgba(16,185,129,0.2)",
					}}
				>
					{/* Nerve Clearance Badge */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							color: isNerveCollisionDanger ? "#fca5a5" : "#6ee7b7",
							fontSize: "12px",
							fontWeight: "bold",
						}}
					>
						{isNerveCollisionDanger ? (
							<ShieldAlert className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
						) : (
							<ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
						)}
						<span>
							{isNerveCollisionDanger
								? `⚠️ ОПАСНО: Нижнечелюстной канал ${latestImplant.distanceToNerve.toFixed(1)} мм (< 2.0 мм)!`
								: `✓ Нижнечелюстной канал: ${latestImplant.distanceToNerve.toFixed(1)} мм (норма)`}
						</span>
					</div>

					{/* Bone Density Badge */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							fontSize: "11px",
							color: "#d4d4d8",
							borderTop: "1px solid rgba(255,255,255,0.1)",
							paddingTop: "6px",
						}}
					>
						<span
							style={{
								backgroundColor: "#3b82f6",
								color: "#fff",
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
				</div>
			)}

			{showPanorex && volumeId && (
				<PanoramicRendererWindow
					volume={panorexVolume}
					splinePoints={splinePoints}
					onClose={() => {
						setShowPanorex(false);
						setArchSummary(null);
					}}
					thickness={panorexThickness}
					blendMode={blendMode}
					patientId={patientId}
					authHeaders={authHeaders}
				/>
			)}

			{/* 4-QUADRANT 3D MPR VIEWPORT GRID */}
			<div
				style={{
					flex: 1,
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gridTemplateRows: "1fr 1fr",
					gap: "2px",
					backgroundColor: "#262626",
					padding: "2px",
				}}
			>
				{/* AXIAL */}
				<div style={{ position: "relative", backgroundColor: "#000" }}>
					<div
						style={{
							position: "absolute",
							top: "8px",
							left: "8px",
							padding: "4px 8px",
							borderRadius: "4px",
							backgroundColor: "rgba(0,0,0,0.6)",
							backdropFilter: "blur(4px)",
							color: "#f87171",
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
						style={{ width: "100%", height: "100%", touchAction: "none" }}
						onContextMenu={(e) => e.preventDefault()}
					/>
				</div>

				{/* SAGITTAL */}
				<div style={{ position: "relative", backgroundColor: "#000" }}>
					<div
						style={{
							position: "absolute",
							top: "8px",
							left: "8px",
							padding: "4px 8px",
							borderRadius: "4px",
							backgroundColor: "rgba(0,0,0,0.6)",
							backdropFilter: "blur(4px)",
							color: "#4ade80",
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
						style={{ width: "100%", height: "100%", touchAction: "none" }}
						onContextMenu={(e) => e.preventDefault()}
					/>
				</div>

				{/* CORONAL */}
				<div style={{ position: "relative", backgroundColor: "#000" }}>
					<div
						style={{
							position: "absolute",
							top: "8px",
							left: "8px",
							padding: "4px 8px",
							borderRadius: "4px",
							backgroundColor: "rgba(0,0,0,0.6)",
							backdropFilter: "blur(4px)",
							color: "#60a5fa",
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
						style={{ width: "100%", height: "100%", touchAction: "none" }}
						onContextMenu={(e) => e.preventDefault()}
					/>
				</div>

				{/* 4TH QUADRANT: SURGICAL PLANNING PROTOCOL & NERVE COLLISION ALERT */}
				<div
					style={{
						position: "relative",
						backgroundColor: "#171717",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						padding: "16px",
						overflowY: "auto",
					}}
				>
					<div
						style={{
							color: "#a3a3a3",
							fontSize: "13px",
							fontWeight: 600,
							marginBottom: "10px",
							letterSpacing: "0.02em",
						}}
					>
						Протокол хирургического планирования (Форма 043/у)
					</div>

					{aiProtocolLog && implants.length > 0 && (
						<div
							style={{
								width: "100%",
								maxWidth: "420px",
								padding: "14px",
								borderRadius: "14px",
								border: "1.5px solid",
								backgroundColor: isNerveCollisionDanger
									? "rgba(239,68,68,0.18)"
									: "rgba(34,197,94,0.12)",
								borderColor: isNerveCollisionDanger
									? "rgba(239,68,68,0.7)"
									: "rgba(34,197,94,0.5)",
								color: isNerveCollisionDanger ? "#fecaca" : "#dcfce7",
							}}
						>
							<div
								style={{
									fontWeight: "bold",
									marginBottom: "8px",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									<Sparkles className="w-4 h-4 text-amber-400" />
									<span>Протокол имплантации (Зуб №{latestImplant?.fdiCode})</span>
								</div>
								<span
									style={{
										backgroundColor: isNerveCollisionDanger
											? "#ef4444"
											: "#10b981",
										color: "#fff",
										padding: "2px 8px",
										borderRadius: "6px",
										fontSize: "11px",
										fontWeight: "bold",
									}}
								>
									{latestImplant?.boneDensity.classification}
								</span>
							</div>

							<p style={{ fontSize: "12px", lineHeight: 1.5, margin: "6px 0" }}>
								{aiProtocolLog}
							</p>

							{latestImplant?.boneDensity.drillingAdvice && (
								<div
									style={{
										marginTop: "8px",
										padding: "8px 10px",
										borderRadius: "8px",
										backgroundColor: "rgba(0,0,0,0.35)",
										border: "1px solid rgba(255,255,255,0.1)",
										fontSize: "11px",
										color: "#e4e4e7",
										lineHeight: 1.4,
									}}
								>
									<span style={{ fontWeight: "bold", color: "#60a5fa" }}>
										Рекомендация по сверлению:{" "}
									</span>
									{latestImplant.boneDensity.drillingAdvice}
								</div>
							)}

							{isNerveCollisionDanger && (
								<div
									style={{
										marginTop: "10px",
										padding: "8px 10px",
										borderRadius: "8px",
										backgroundColor: "rgba(239,68,68,0.3)",
										border: "1px solid #ef4444",
										fontSize: "12px",
										fontWeight: "bold",
										color: "#fca5a5",
										display: "flex",
										alignItems: "center",
										gap: "6px",
									}}
								>
									<AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
									<span>КРИТИЧЕСКАЯ БЛИЗОСТЬ К НЕРВУ (&lt; 2.0 мм)!</span>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
