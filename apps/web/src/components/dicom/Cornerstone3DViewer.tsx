import * as cornerstone from "@cornerstonejs/core";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";
import * as cornerstoneTools from "@cornerstonejs/tools";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import {
	CANONICAL_IMPLANT_SYSTEMS,
	getAvailableLengths,
	getImplantSystem,
	getPlatformForDiameter,
} from "./implantCatalog";
import {
	calculateCaliperRidgeDimensions,
	type AlveolarRidgeCaliperMeasurement,
} from "../radiology/radiologyMath";
import {
	distancePointToSpline,
	type Point2D,
} from "../../utils/math/mprMath";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import {
	archControlPointsOf,
	type CtPlanningMarkup,
	ctPlanningMarkupIsEmpty,
	ctPlanningRestoredLabel,
	emptyCtPlanningMarkup,
	loadCtPlanningMarkup,
	saveCtPlanningMarkup,
	type WorldPoint3,
} from "./ctPlanningPersistence";
import type { PanoramicVolumeInput } from "./PanoramicRendererWindow";
import {
	captureHighDpiCanvas,
	downloadSnapshotLocally,
} from "../visiograph/VisiographExportService";
import {
	type VisiographPresetId,
	VISIOGRAPH_WINDOW_PRESETS,
	type VisiographWindowPreset,
} from "../visiograph/VisiographWindowPresets";
import {
	type PanoramicIssue,
	panoramicIssueLabels,
	panoramicReadyLabel,
} from "./panoramicArch";
import { isLowSpecHardware } from "../../utils/deviceDetection.js";
import {
	type ExtendedMischClass,
	type ImplantData,
	type Cornerstone3DViewerProps,
	MARKUP_SAVE_DEBOUNCE_MS,
	MANDIBULAR_NERVE_DANGER_THRESHOLD_MM,
	VIEWPORT_IDS,
	classifyExtendedBoneDensity,
	implantDataOf,
	implantProtocolLog,
	storedImplantsOf,
	teardownViewportCanvases,
} from "./cornerstoneTypes";
import { CornerstoneToolbar } from "./CornerstoneToolbar";
import { CornerstoneHudOverlays } from "./CornerstoneHudOverlays";
import { CornerstonePlanningQuadrant } from "./CornerstonePlanningQuadrant";
import { CornerstoneEmptyDropzone } from "./CornerstoneEmptyDropzone";
import { CornerstoneMprViewports } from "./CornerstoneMprViewports";
import {
	setupMprToolGroup,
	computeImplantPlacement,
	exportCornerstoneSnapshot,
	computeClickWorldCoords,
	generatePanorexVolumeInput,
} from "./cornerstoneEngineHelper";

export type { ExtendedMischClass, ImplantData, Cornerstone3DViewerProps };
export { MANDIBULAR_NERVE_DANGER_THRESHOLD_MM, classifyExtendedBoneDensity, implantProtocolLog, teardownViewportCanvases };

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
	const [archSummary, setArchSummary] = useState<{ points: number; lengthMm: number } | null>(null);
	const [panorexVolume, setPanorexVolume] = useState<PanoramicVolumeInput | null>(null);
	const [panorexThickness, setPanorexThickness] = useState<number>(0);
	const [blendMode, setBlendMode] = useState<"mip" | "average">("mip");
	const [activeTool, setActiveTool] = useState<string>("Crosshairs");
	const [implants, setImplants] = useState<ImplantData[]>([]);
	const [aiProtocolLog, setAiProtocolLog] = useState<string>("");
	const [activePresetId, setActivePresetId] = useState<VisiographPresetId>("bone");
	const [isExportingSnapshot, setIsExportingSnapshot] = useState(false);
	const [activeCaliper, setActiveCaliper] = useState<AlveolarRidgeCaliperMeasurement | null>(null);
	const [isNerveTracingActive, setIsNerveTracingActive] = useState(false);
	const [selectedSystemId, setSelectedSystemId] = useState<string>("osstem-ts3");
	const [selectedDiameter, setSelectedDiameter] = useState<number>(4.0);
	const [selectedLength, setSelectedLength] = useState<number>(10.0);
	const [selectedFdiCode, setSelectedFdiCode] = useState<string>("36");
	const [showArchiveUploaderModal, setShowArchiveUploaderModal] = useState<boolean>(false);
	const [localImageIds, setLocalImageIds] = useState<string[]>([]);
	const effectiveImageIds = imageIds.length > 0 ? imageIds : localImageIds;

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

	const activeSystemSpec = useMemo(() => getImplantSystem(selectedSystemId), [selectedSystemId]);
	const activePlatform = useMemo(() => getPlatformForDiameter(selectedSystemId, selectedDiameter), [selectedSystemId, selectedDiameter]);
	const availableLengthsForDiameter = useMemo(() => getAvailableLengths(selectedSystemId, selectedDiameter), [selectedSystemId, selectedDiameter]);

	const [studyInstanceUid, setStudyInstanceUid] = useState<string | null>(null);
	const [restoredMarkup, setRestoredMarkup] = useState<CtPlanningMarkup | null>(null);
	const [markupStatus, setMarkupStatus] = useState<{ tone: "saving" | "saved" | "issue"; text: string } | null>(null);

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
		if (!isInitialized) void init();
		return () => {
			try { cornerstone.cache.purgeCache(); } catch { /* Ignore */ }
			try { cornerstoneDICOMImageLoader.wadouri.fileManager.purge(); } catch { /* Ignore */ }
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
			try { cornerstone.cache.purgeCache(); } catch { /* Ignore */ }
			try { cornerstoneDICOMImageLoader.wadouri.fileManager.purge(); } catch { /* Ignore */ }

			const renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);
			const viewportInputArray = [
				{
					viewportId: VIEWPORT_IDS.axial,
					type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
					element: axialRef.current as HTMLDivElement,
					defaultOptions: { orientation: cornerstone.Enums.OrientationAxis.AXIAL, background: [0, 0, 0] as cornerstone.Types.Point3 },
				},
				{
					viewportId: VIEWPORT_IDS.sagittal,
					type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
					element: sagittalRef.current as HTMLDivElement,
					defaultOptions: { orientation: cornerstone.Enums.OrientationAxis.SAGITTAL, background: [0, 0, 0] as cornerstone.Types.Point3 },
				},
				{
					viewportId: VIEWPORT_IDS.coronal,
					type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
					element: coronalRef.current as HTMLDivElement,
					defaultOptions: { orientation: cornerstone.Enums.OrientationAxis.CORONAL, background: [0, 0, 0] as cornerstone.Types.Point3 },
				},
			];

			renderingEngine.setViewports(viewportInputArray);
			const volume = await cornerstone.volumeLoader.createAndCacheVolume(vId, { imageIds: effectiveImageIds });
			if (cancelled) return;
			volume.load();

			const firstImageId = effectiveImageIds[0];
			const seriesMeta = firstImageId
				? (cornerstone.metaData.get("generalSeriesModule", firstImageId) as { studyInstanceUID?: unknown } | undefined)
				: undefined;
			const uid = typeof seriesMeta?.studyInstanceUID === "string" ? seriesMeta.studyInstanceUID.trim() : "";
			if (!cancelled) setStudyInstanceUid(uid.length > 0 ? uid : null);

			await cornerstone.setVolumesForViewports(
				renderingEngine,
				[{ volumeId: vId }],
				[VIEWPORT_IDS.axial, VIEWPORT_IDS.sagittal, VIEWPORT_IDS.coronal],
			);
			if (cancelled) return;

			setupMprToolGroup("mpr-tool-group", renderingEngineId);

			if (cancelled) return;
			renderingEngine.renderViewports([VIEWPORT_IDS.axial, VIEWPORT_IDS.sagittal, VIEWPORT_IDS.coronal]);
			applyVoiPreset(VISIOGRAPH_WINDOW_PRESETS.bone);
		}

		loadAndRender()
			.then(() => { if (!cancelled) setIsVolumeLoading(false); })
			.catch((error) => {
				if (cancelled) return;
				logger.error("[Cornerstone3DViewer] Не удалось построить реконструкцию:", error);
				setIsVolumeLoading(false);
				setLoadError("Не удалось построить реконструкцию. Возможно, серия неполная или формат не поддерживается. Попробуйте загрузить архив заново.");
			});

		return () => {
			cancelled = true;
			try { cornerstone.getRenderingEngine("my-engine")?.destroy(); } catch { /* Ignore */ }
			try { cornerstoneTools.ToolGroupManager.destroyToolGroup("mpr-tool-group"); } catch { /* Ignore */ }
			try { cornerstoneTools.annotation.state.removeAllAnnotations(); } catch { /* Ignore */ }
			try { cornerstone.cache.purgeCache(); } catch { /* Ignore */ }
			try { cornerstoneDICOMImageLoader.wadouri.fileManager.purge(); } catch { /* Ignore */ }
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
					showToast(actionFailureToast("Чтение сохраненной разметки", (err as { status?: number })?.status ?? null), "error");
					setMarkupStatus({
						tone: "issue",
						text: "Сохранённую разметку прочитать не удалось. Откройте снимок заново; если не поможет, сообщите администратору клиники.",
					});
				}
			});

		return () => { cancelled = true; };
	}, [patientId, studyInstanceUid]);

	const currentMarkup = useCallback((): CtPlanningMarkup => {
		const element = axialRef.current;
		let spPoints: WorldPoint3[] = [];
		if (element) {
			try {
				const annotations = cornerstoneTools.annotation.state.getAnnotations(
					cornerstoneTools.SplineROITool.toolName,
					element,
				) ?? [];
				spPoints = archControlPointsOf(annotations);
			} catch {
				spPoints = [];
			}
		}
		const restored = restoredMarkupRef.current;
		if (spPoints.length === 0 && restored) spPoints = restored.splinePoints;
		return {
			splinePoints: spPoints,
			nervePoints: restored?.nervePoints ?? emptyCtPlanningMarkup().nervePoints,
			implants: storedImplantsOf(implantsRef.current),
		};
	}, []);

	const saveMarkupNow = async (silent = false): Promise<void> => {
		const patient = patientIdRef.current;
		const study = studyUidRef.current;
		const markup = currentMarkup();
		if (ctPlanningMarkupIsEmpty(markup)) return;

		if (!patient) {
			if (!silent) {
				setMarkupStatus({
					tone: "issue",
					text: "Разметку сохранить нельзя — пациент не выбран, а разметка хранится в его карточке. Откройте снимок из карточки пациента, обведённая дуга остаётся на экране.",
				});
			}
			return;
		}
		if (!study) {
			if (!silent) {
				setMarkupStatus({
					tone: "issue",
					text: "Разметку сохранить нельзя — в файлах снимка нет кода исследования, а без него разметку не отличить от разметки другого снимка. Загрузите архив КЛКТ целиком, обведённая дуга остаётся на экране.",
				});
			}
			return;
		}

		if (!silent) setMarkupStatus({ tone: "saving", text: "Сохраняем разметку…" });
		const outcome = await saveCtPlanningMarkup(patient, study, markup);
		if (outcome.status === "saved") setRestoredMarkup(markup);
		if (silent) return;
		setMarkupStatus(
			outcome.status === "saved"
				? { tone: "saved", text: "Разметка сохранена в карточке пациента." }
				: { tone: "issue", text: outcome.message },
		);
	};

	const scheduleMarkupSave = useCallback(() => {
		if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
		saveTimerRef.current = setTimeout(() => {
			saveTimerRef.current = null;
			void saveMarkupNow();
		}, MARKUP_SAVE_DEBOUNCE_MS);
	}, []);

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

		target.addEventListener(cornerstoneTools.Enums.Events.ANNOTATION_COMPLETED, onCompleted);
		target.addEventListener(cornerstoneTools.Enums.Events.ANNOTATION_MODIFIED, onModified);

		return () => {
			target.removeEventListener(cornerstoneTools.Enums.Events.ANNOTATION_COMPLETED, onCompleted);
			target.removeEventListener(cornerstoneTools.Enums.Events.ANNOTATION_MODIFIED, onModified);
			if (saveTimerRef.current !== null) {
				clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
			}
			void saveMarkupNow(true);
		};
	}, [isInitialized, scheduleMarkupSave]);

	const refusePanorex = (reason: PanoramicIssue) => {
		setPanorexIssue(reason);
		setArchSummary(null);
		setSplinePoints([]);
		setPanorexVolume(null);
		setShowPanorex(false);
	};

	const handleGeneratePanorex = () => {
		const res = generatePanorexVolumeInput({
			element: axialRef.current,
			volumeId,
			restoredMarkup: restoredMarkupRef.current,
		});
		if (res.issue) {
			refusePanorex(res.issue);
			return;
		}
		setPanorexIssue(null);
		if (res.archSummary) setArchSummary(res.archSummary);
		if (res.splinePoints) setSplinePoints(res.splinePoints);
		if (res.panorexVolume) setPanorexVolume(res.panorexVolume);
		setShowPanorex(true);
	};

	const setTool = (toolName: string) => {
		const toolGroupId = "mpr-tool-group";
		const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
		if (!toolGroup) return;
		if (activeTool === cornerstoneTools.CrosshairsTool.toolName) {
			toolGroup.setToolPassive(activeTool);
		} else {
			toolGroup.setToolDisabled(activeTool);
		}
		toolGroup.setToolActive(toolName, { bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }] });
		setActiveTool(toolName);
	};

	const applyVoiPreset = (preset: VisiographWindowPreset) => {
		setActivePresetId(preset.id);
		const renderingEngine = cornerstone.getRenderingEngine("my-engine");
		if (!renderingEngine) return;
		for (const vId of [VIEWPORT_IDS.axial, VIEWPORT_IDS.sagittal, VIEWPORT_IDS.coronal]) {
			const vp = renderingEngine.getViewport(vId);
			if (vp && "setProperties" in vp) {
				(vp as cornerstone.Types.IVolumeViewport).setProperties({ voiRange: preset.voiRange });
				vp.render();
			}
		}
	};

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

	const addNerveControlPoint = useCallback((point: WorldPoint3) => {
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
			const nerveSpline = nextNerve.map((p) => [p.x, p.y, p.z] as any);
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
		showToast(`Точка #${nextNerve.length} нижнечелюстного канала зафиксирована ([${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)}])`, "info");
	}, []);

	const addNervePointFromCurrentSlice = useCallback(() => {
		const renderingEngine = cornerstone.getRenderingEngine("my-engine");
		const axialVp = renderingEngine?.getViewport(VIEWPORT_IDS.axial);
		const focal = axialVp?.getCamera()?.focalPoint;
		if (!focal || focal.length < 3 || !Number.isFinite(focal[0]) || !Number.isFinite(focal[1]) || !Number.isFinite(focal[2])) {
			showToast("Точка фокуса не определена. Выберите срез кликом по КТ-просмотрщику", "warning");
			return;
		}
		addNerveControlPoint({ x: Number(focal[0].toFixed(2)), y: Number(focal[1].toFixed(2)), z: Number(focal[2].toFixed(2)) });
	}, [addNerveControlPoint]);

	const completeNerveSpline = useCallback(() => {
		const current = restoredMarkupRef.current?.nervePoints ?? [];
		if (current.length < 2) {
			showToast("Для формирования сплайна нижнечелюстного канала необходимо минимум 2 контрольные точки", "warning");
			return;
		}
		if (implantsRef.current.length > 0) {
			const nerveSpline = current.map((p) => [p.x, p.y, p.z] as any);
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
		showToast(`Сплайн нижнечелюстного канала сформирован: ${current.length} опорных точек. Коридор безопасности 2.0 мм активен.`, "success");
	}, []);

	const clearNervePoints = useCallback(() => {
		const updated: CtPlanningMarkup = {
			splinePoints: restoredMarkupRef.current?.splinePoints ?? [],
			nervePoints: [],
			implants: storedImplantsOf(implantsRef.current),
		};
		setRestoredMarkup(updated);
		restoredMarkupRef.current = updated;
		if (implantsRef.current.length > 0) {
			const updatedImplants = implantsRef.current.map((imp) => ({ ...imp, distanceToNerve: null }));
			setImplants(updatedImplants);
			implantsRef.current = updatedImplants;
			const last = updatedImplants[updatedImplants.length - 1];
			if (last) setAiProtocolLog(implantProtocolLog(last));
		}
		void saveMarkupNow();
		showToast("Трассировка нижнечелюстного канала очищена (0 точек)", "info");
	}, []);

	const handleViewportClickForNerve = useCallback((viewportId: string, container: HTMLElement | null, e: React.MouseEvent<any>) => {
		if (activeTool !== "NerveTracer" && !isNerveTracingActive) return;
		if (!container) return;
		const renderingEngine = cornerstone.getRenderingEngine("my-engine");
		const vp = renderingEngine?.getViewport(viewportId);
		if (!vp) return;
		const pt = computeClickWorldCoords(vp, container, e.clientX, e.clientY);
		if (!pt) {
			showToast("Не удалось определить 3D-координаты точки на срезе", "warning");
			return;
		}
		addNerveControlPoint(pt);
	}, [activeTool, isNerveTracingActive, addNerveControlPoint]);

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
	}, []);

	const focusOnImplant = useCallback((implant: ImplantData) => {
		const renderingEngine = cornerstone.getRenderingEngine("my-engine");
		if (!renderingEngine) return;
		for (const vpId of [VIEWPORT_IDS.axial, VIEWPORT_IDS.sagittal, VIEWPORT_IDS.coronal]) {
			const vp = renderingEngine.getViewport(vpId);
			if (vp && vp.getCamera()?.focalPoint) {
				vp.setCamera({ focalPoint: [implant.startWorld[0], implant.startWorld[1], implant.startWorld[2]] });
				vp.render();
			}
		}
		showToast(`Фокус срезов наведен на имплантат зуба №${implant.fdiCode}`, "info");
	}, []);

	const placeImplantModel = () => {
		const { result, error, warning } = computeImplantPlacement({
			volumeId,
			selectedSystemId,
			selectedDiameter,
			selectedLength,
			selectedFdiCode,
			restoredMarkup: restoredMarkupRef.current,
		});

		if (error) { showToast(error, "error"); return; }
		if (warning) { showToast(warning, "warning"); return; }
		if (!result) return;

		const { implant: newImplant, fdiCode, distToNerve } = result;
		setSelectedFdiCode(fdiCode);
		const nextImplants = [...implants, newImplant];
		setImplants(nextImplants);
		implantsRef.current = nextImplants;
		setActiveTool("Implant");
		setAiProtocolLog(implantProtocolLog(newImplant));
		void saveMarkupNow();

		if (distToNerve !== null && distToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM) {
			SoundFeedbackService.getInstance().playWarningAlert();
			showToast(`[ОПАСНОСТЬ] Имплантат зуба №${fdiCode} установлен в опасной близости от нерва (${distToNerve.toFixed(1)} мм < 2.0 мм)!`, "error");
		} else {
			SoundFeedbackService.getInstance().playActionSuccess();
			const sysSpec = getImplantSystem(selectedSystemId);
			showToast(`Имплантат ${sysSpec.brand} Ø${selectedDiameter}x${selectedLength}мм размещен в области зуба №${fdiCode}`, "success");
		}
	};

	const handleExportSnapshotTo043 = async () => {
		setIsExportingSnapshot(true);
		try {
			const outcome = await exportCornerstoneSnapshot({
				targetDiv: axialRef.current,
				patientId,
				implants,
				activePresetId,
				aiProtocolLog,
				authHeaders,
			});
			if (outcome.success) showToast("Снимок 3D MPR успешно прикреплен к карте 043/у!", "success");
			else showToast(outcome.message ?? "Сбой при экспорте снимка", "error");
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
		const dataUri = captureHighDpiCanvas(canvas, { pixelRatio: 2, mimeType: "image/jpeg", quality: 0.95 });
		downloadSnapshotLocally(dataUri, `mpr_axial_snapshot_${activePresetId}_${Date.now()}.jpg`);
		showToast("Снимок среза сохранен на диск в высоком разрешении", "success");
	};

	const panorexBanner = panorexIssue !== null
		? { tone: "issue" as const, text: panoramicIssueLabels[panorexIssue] }
		: archSummary !== null
			? { tone: "ready" as const, text: panoramicReadyLabel(archSummary.points, archSummary.lengthMm) }
			: null;

	const latestImplant = implants[implants.length - 1];
	const collisionImplants = implants.filter((imp) => typeof imp.distanceToNerve === "number" && imp.distanceToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM);
	const hasAnyNerveCollision = collisionImplants.length > 0;
	const isNerveCollisionDanger = latestImplant?.distanceToNerve != null && latestImplant.distanceToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM;
	const isNerveUnmapped = latestImplant != null && latestImplant.distanceToNerve == null;

	if (effectiveImageIds.length === 0) {
		return (
			<CornerstoneEmptyDropzone
				patientName={patientName}
				studyDate={studyDate}
				onClose={onClose}
				onImagesLoaded={(ids) => setLocalImageIds(ids)}
			/>
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
					{loadError ?? "Строим объёмную реконструкцию — это может занять до минуты..."}
				</div>
			)}

			<CornerstoneToolbar
				patientName={patientName}
				studyDate={studyDate}
				voxelSpacing={voxelSpacing}
				studyInstanceUid={studyInstanceUid}
				activeTool={activeTool}
				setTool={setTool}
				showPanorex={showPanorex}
				handleGeneratePanorex={handleGeneratePanorex}
				activePresetId={activePresetId}
				applyPreset={(pid) => applyVoiPreset(VISIOGRAPH_WINDOW_PRESETS[pid])}
				isInverted={false}
				toggleInvert={() => {}}
				blendMode={blendMode}
				setBlendMode={setBlendMode}
				isExportingSnapshot={isExportingSnapshot}
				handleExportSnapshotTo043={handleExportSnapshotTo043}
				setShowArchiveUploaderModal={setShowArchiveUploaderModal}
				handleDownloadActiveSlice={handleDownloadActiveSlice}
				onSaveMarkup={() => { void saveMarkupNow(); }}
				onClose={onClose}
			/>

			<CornerstoneHudOverlays
				isNerveTracingActive={isNerveTracingActive}
				activeTool={activeTool}
				restoredMarkup={restoredMarkup}
				addNervePointFromCurrentSlice={addNervePointFromCurrentSlice}
				completeNerveSpline={completeNerveSpline}
				clearNervePoints={clearNervePoints}
				setIsNerveTracingActive={setIsNerveTracingActive}
				setActiveTool={setActiveTool}
				panorexBanner={panorexBanner}
				markupStatus={markupStatus}
				latestImplant={latestImplant ?? null}
				activeCaliper={activeCaliper}
				isNerveCollisionDanger={isNerveCollisionDanger}
				isNerveUnmapped={isNerveUnmapped}
				showPanorex={showPanorex}
				volumeId={volumeId}
				panorexVolume={panorexVolume}
				splinePoints={splinePoints}
				panorexThickness={panorexThickness}
				blendMode={blendMode}
				patientId={patientId}
				authHeaders={authHeaders}
				setShowPanorex={setShowPanorex}
				setPanorexVolume={setPanorexVolume}
				setSplinePoints={setSplinePoints}
				setArchSummary={setArchSummary}
				showArchiveUploaderModal={showArchiveUploaderModal}
				setShowArchiveUploaderModal={setShowArchiveUploaderModal}
				setLocalImageIds={setLocalImageIds}
			/>

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
				<CornerstoneMprViewports
					axialRef={axialRef}
					sagittalRef={sagittalRef}
					coronalRef={coronalRef}
					activeTool={activeTool}
					onViewportClickForNerve={handleViewportClickForNerve}
				/>

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
					<CornerstonePlanningQuadrant
						hasAnyNerveCollision={hasAnyNerveCollision}
						restoredMarkup={restoredMarkup}
						activePlatform={activePlatform}
						activeSystemSpec={activeSystemSpec}
						selectedSystemId={selectedSystemId}
						handleSelectSystem={handleSelectSystem}
						selectedDiameter={selectedDiameter}
						handleSelectDiameter={handleSelectDiameter}
						availableLengthsForDiameter={availableLengthsForDiameter}
						selectedLength={selectedLength}
						setSelectedLength={setSelectedLength}
						selectedFdiCode={selectedFdiCode}
						setSelectedFdiCode={setSelectedFdiCode}
						placeImplantModel={placeImplantModel}
						implants={implants}
						focusOnImplant={focusOnImplant}
						removeImplant={removeImplant}
						latestImplant={latestImplant ?? null}
						handleExportSnapshotTo043={handleExportSnapshotTo043}
						isExportingSnapshot={isExportingSnapshot}
						aiProtocolLog={aiProtocolLog}
					/>
				</div>
			</div>
		</div>
	);
}
