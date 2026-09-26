import { dicomViewerLaunchManifestResponseSchema } from "@dental/shared";
import {
	DicomSeriesPreviewGroup,
	DicomViewerToolStateBundleRequest
} from "@dental/shared";
import {
	safeJoinUrl,
	addQueryParams
} from "./dicomwebConnector.js";
import {
	isDicomArchiveVirtualEntryPath,
	isDicomPixelPath
} from "./dicomParsing.js";
import type {
	DicomViewerDataSourceKind,
	DicomViewerKind,
	DicomViewerLaunchManifestRequest,
	DicomViewerLaunchMode,
	DicomViewerTargetTool,
	DicomViewerToolConfig,
	DicomViewerToolMode,
	DicomViewerViewportState,
} from "@dental/shared";

export function buildOhifViewerUrl(ohifBaseUrl: string, studyInstanceUid: string) {
	const viewerUrl = safeJoinUrl(ohifBaseUrl, "/viewer");
	return addQueryParams(viewerUrl, { StudyInstanceUIDs: studyInstanceUid });
}

export function viewerDataSourceKind(input: {
	launchMode: DicomViewerLaunchMode;
	viewerKind: DicomViewerKind;
	dicomWebBaseUrl: string | null | undefined;
	firstFilePath: string | null;
}): DicomViewerDataSourceKind {
	if (input.launchMode === "dicomweb_url" && input.dicomWebBaseUrl)
		return "dicomweb";
	if (
		input.launchMode === "local_manifest" &&
		isDicomArchiveVirtualEntryPath(input.firstFilePath)
	)
		return "external_viewer";
	if (input.launchMode === "local_manifest" && input.firstFilePath)
		return "local_files";
	if (input.launchMode === "external_handoff") return "external_viewer";
	return "none";
}

export function buildDicomViewerLaunchManifest(
	input: DicomViewerLaunchManifestRequest,
) {
	const series = input.series;
	const studyInstanceUid = series.studyInstanceUid;
	const seriesInstanceUid = series.seriesInstanceUid;
	const warnings = new Set<string>(series.warnings);
	const hasDicomWeb = Boolean(input.dicomWebBaseUrl && studyInstanceUid);
	const hasVirtualArchiveEntries = isDicomArchiveVirtualEntryPath(
		series.firstFilePath,
	);
	const hasLocalFiles =
		Boolean(series.firstFilePath) && !hasVirtualArchiveEntries;
	const canUseOhif =
		input.viewerKind === "ohif" && Boolean(input.ohifBaseUrl) && hasDicomWeb;
	const canUseCornerstoneLocal =
		input.viewerKind === "cornerstone3d" && hasLocalFiles;
	let launchMode: DicomViewerLaunchMode = "blocked";
	let viewerUrl: string | null = null;

	if (!studyInstanceUid || !seriesInstanceUid)
		warnings.add(
			"Идентификаторы исследования/серии отсутствуют; диагностический запуск требует стабильные идентификаторы.",
		);
	if (series.mprReadiness.resourcePolicy.loadStrategy === "external_handoff") {
		warnings.add(
			"Политика ресурсов предпочитает внешний или отдельный просмотрщик для такого размера стека.",
		);
	}
	if (hasVirtualArchiveEntries) {
		warnings.add(
			"ZIP-серия раскрыта как список снимков, но для запуска просмотра нужен распакованный локальный набор или внешний обработчик.",
		);
	}

	if (canUseOhif && studyInstanceUid && input.ohifBaseUrl) {
		launchMode = "dicomweb_url";
		viewerUrl = buildOhifViewerUrl(input.ohifBaseUrl, studyInstanceUid);
	} else if (canUseCornerstoneLocal) {
		launchMode = "local_manifest";
	} else if (
		input.allowExternalHandoff &&
		(input.externalViewerPath ||
			hasLocalFiles ||
			hasVirtualArchiveEntries ||
			hasDicomWeb)
	) {
		launchMode = "external_handoff";
		viewerUrl = input.externalViewerPath ?? null;
	} else {
		warnings.add("Безопасная цель просмотра пока недоступна.");
	}

	if (launchMode === "dicomweb_url" && !input.dicomWebBaseUrl)
		warnings.add("Для запуска внешнего просмотра нужен адрес архива снимков.");
	if (launchMode === "local_manifest" && series.mprReadiness.volumeCandidate) {
		warnings.add(
			"Локальный план только готовит открытие серии; тяжелые данные загружает отдельный обработчик или просмотрщик.",
		);
	}

	const dataSourceKind = viewerDataSourceKind({
		launchMode,
		viewerKind: input.viewerKind,
		dicomWebBaseUrl: input.dicomWebBaseUrl,
		firstFilePath: series.firstFilePath,
	});

	const cornerstoneVolumeId =
		studyInstanceUid && seriesInstanceUid
			? `cornerstoneStreamingImageVolume:${studyInstanceUid}:${seriesInstanceUid}`
			: null;

	const qidoRoot = input.dicomWebBaseUrl
		? safeJoinUrl(input.dicomWebBaseUrl, "/studies")
		: null;
	const wadoRoot = input.dicomWebBaseUrl
		? safeJoinUrl(input.dicomWebBaseUrl, "/studies")
		: null;
	const stowRoot = input.dicomWebBaseUrl
		? safeJoinUrl(input.dicomWebBaseUrl, "/studies")
		: null;

	const nextAction =
		launchMode === "dicomweb_url"
			? "Откройте внешний просмотр через архив снимков; CRM остается слоем метаданных, заметок и восстановления."
			: launchMode === "local_manifest"
				? "Откройте локальный план серии через обработчик перед загрузкой тяжелых данных."
				: launchMode === "external_handoff"
					? "Откройте настроенный внешний просмотр и сохраняйте аннотации/состояние просмотра в CRM."
					: "Исправьте подключение архива снимков или локальные идентификаторы пути перед запуском просмотрщика.";

	return dicomViewerLaunchManifestResponseSchema.parse({
		viewerKind: input.viewerKind,
		launchMode,
		viewerUrl,
		studyInstanceUid,
		seriesInstanceUid,
		dataSource: {
			kind: dataSourceKind,
			qidoRoot,
			wadoRoot,
			stowRoot,
			studyInstanceUid,
			seriesInstanceUid,
			sourceKind: series.sourceKind,
			sourceName: series.sourceName,
		},
		displaySetSelector: {
			preferredLayout: series.mprReadiness.recommendedLayout,
			projections: series.mprReadiness.projections,
			studyInstanceUid,
			seriesInstanceUid,
		},
		cornerstoneVolumeId,
		resourcePolicy: series.mprReadiness.resourcePolicy,
		viewerState: input.viewerState ?? null,
		annotations: input.annotations,
		warnings: Array.from(warnings),
		nextAction,
	});
}

export function cornerstoneVolumeIdForSeries(series: DicomSeriesPreviewGroup) {
	return series.studyInstanceUid && series.seriesInstanceUid
		? `cornerstoneStreamingImageVolume:${series.studyInstanceUid}:${series.seriesInstanceUid}`
		: null;
}

export function stableViewerIdPart(
	value: string | null | undefined,
	fallback: string,
) {
	return (
		(value ?? fallback).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 96) ||
		fallback
	);
}

export function targetToolForCrmTool(
	tool: DicomViewerToolConfig["crmTool"],
): DicomViewerTargetTool {
	switch (tool) {
		case "pan":
			return "PanTool";
		case "zoom":
			return "ZoomTool";
		case "rotate":
			return "StackScrollTool";
		case "measure_distance":
			return "LengthTool";
		case "measure_angle":
			return "AngleTool";
		case "measure_area":
			return "PlanarFreehandROITool";
		case "measure_volume":
			return "SplineROITool";
		case "bone_density_probe":
			return "ProbeTool";
		case "note":
			return "ArrowAnnotateTool";
		case "implant_axis":
			return "BidirectionalTool";
		case "implant_library":
			return "ArrowAnnotateTool";
		case "nerve_canal":
		case "panoramic_curve":
		case "surgical_guide":
			return "SplineROITool";
		default:
			return "WindowLevelTool";
	}
}

export function targetToolForAnnotation(
	annotation: DicomViewerToolStateBundleRequest["annotations"][number],
): DicomViewerTargetTool {
	switch (annotation.type) {
		case "distance":
			return "LengthTool";
		case "angle":
			return "AngleTool";
		case "roi":
			return "RectangleROITool";
		case "area_roi":
			return "PlanarFreehandROITool";
		case "volume_roi":
			return "SplineROITool";
		case "implant_axis":
			return "BidirectionalTool";
		case "nerve_canal":
		case "panoramic_curve":
		case "surgical_guide":
			return "SplineROITool";
		case "bone_density_probe":
		case "landmark":
			return "ProbeTool";
		default:
			return "ArrowAnnotateTool";
	}
}

export function toolModeForCrmTool(
	tool: DicomViewerToolConfig["crmTool"],
	activeTool: DicomViewerToolConfig["crmTool"] | undefined,
	series: DicomSeriesPreviewGroup,
): DicomViewerToolMode {
	const lacksUsableVolume =
		!series.mprReadiness.volumeCandidate || !series.mprReadiness.canOpenMpr;
	if (
		lacksUsableVolume &&
		(tool === "implant_axis" ||
			tool === "nerve_canal" ||
			tool === "panoramic_curve" ||
			tool === "measure_area" ||
			tool === "measure_volume" ||
			tool === "bone_density_probe" ||
			tool === "surgical_guide")
	) {
		return "disabled";
	}
	if (activeTool === tool) return "active";
	if (
		tool === "measure_distance" ||
		tool === "measure_angle" ||
		tool === "measure_area" ||
		tool === "measure_volume" ||
		tool === "bone_density_probe" ||
		tool === "implant_library" ||
		tool === "note"
	)
		return "passive";
	return "enabled";
}

export function buildToolConfigs(
	input: DicomViewerToolStateBundleRequest,
): DicomViewerToolConfig[] {
	const tools: Array<
		Pick<DicomViewerToolConfig, "crmTool" | "shortcut" | "reason">
	> = [
		{
			crmTool: "window_level",
			shortcut: "W",
			reason: "Настраивает яркость и контраст снимка.",
		},
		{
			crmTool: "pan",
			shortcut: "Space",
			reason: "Перемещает область просмотра без изменения исходного снимка.",
		},
		{
			crmTool: "zoom",
			shortcut: "Z",
			reason: "Увеличивает локальную деталь и сохраняет состояние просмотра.",
		},
		{
			crmTool: "measure_distance",
			shortcut: "D",
			reason: "Включает измерение расстояния на снимке.",
		},
		{
			crmTool: "measure_angle",
			shortcut: "A",
			reason: "Включает измерение угла на снимке.",
		},
		{
			crmTool: "measure_area",
			shortcut: null,
			reason:
				"Дает контур площади на срезе: дефект, окно синус-лифтинга или ROI.",
		},
		{
			crmTool: "measure_volume",
			shortcut: null,
			reason:
				"Дает объемный ROI для пазухи, графта, дефекта или дыхательных путей.",
		},
		{
			crmTool: "note",
			shortcut: "N",
			reason: "Добавляет врачебную заметку к выбранной области.",
		},
		{
			crmTool: "implant_axis",
			shortcut: "I",
			reason: "Помогает отметить предполагаемую ось импланта.",
		},
		{
			crmTool: "implant_library",
			shortcut: null,
			reason: "Переносит в план выбранный типоразмер импланта.",
		},
		{
			crmTool: "nerve_canal",
			shortcut: null,
			reason: "Помогает вручную провести канал нижнечелюстного нерва.",
		},
		{
			crmTool: "panoramic_curve",
			shortcut: null,
			reason: "Помогает построить панорамную кривую по КЛКТ.",
		},
		{
			crmTool: "bone_density_probe",
			shortcut: null,
			reason: "Показывает ориентир плотности кости в точке планирования.",
		},
		{
			crmTool: "surgical_guide",
			shortcut: null,
			reason: "Фиксирует требования к хирургическому шаблону и втулке.",
		},
		{
			crmTool: "reset",
			shortcut: "R",
			reason: "Возвращает вид к исходному состоянию без изменения снимка.",
		},
	];

	return tools.map((tool) => ({
		...tool,
		targetTool: targetToolForCrmTool(tool.crmTool),
		mode: toolModeForCrmTool(
			tool.crmTool,
			input.viewerState?.activeTool,
			input.series,
		),
	}));
}

export function safeCoordinate(value: number | null | undefined) {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function buildDicomViewerViewports(
	input: DicomViewerToolStateBundleRequest,
): DicomViewerViewportState[] {
	const series = input.series;
	const viewerState = input.viewerState;
	const volumeId = cornerstoneVolumeIdForSeries(series);
	const canOpenVolume =
		series.mprReadiness.volumeCandidate && series.mprReadiness.canOpenMpr;
	const canReferenceLocalPixels = series.firstFilePath
		? isDicomPixelPath(series.firstFilePath)
		: false;
	const projections: DicomViewerViewportState["projection"][] = series
		.mprReadiness.volumeCandidate
		? canOpenVolume && series.mprReadiness.projections.length
			? series.mprReadiness.projections
			: [viewerState?.projection ?? null]
		: [viewerState?.projection ?? null];

	return projections.map((projection, index) => ({
		viewportId: projection ? `crm-${projection}` : "crm-stack",
		viewportType: canOpenVolume
			? projection === "panoramic_reconstruction" || projection === "mip"
				? "derived"
				: "volume"
			: "stack",
		projection,
		volumeId: canOpenVolume ? volumeId : null,
		referencedImageId:
			canReferenceLocalPixels && index === 0
				? `dicomfile:${series.firstFilePath}`
				: null,
		sliceIndex: viewerState?.sliceIndex ?? null,
		windowPreset:
			viewerState?.windowPreset ?? (series.kind === "cbct" ? "bone" : "endo"),
		windowCenter: viewerState?.windowCenter ?? null,
		windowWidth: viewerState?.windowWidth ?? null,
		zoom: viewerState?.zoom ?? 1,
		rotationDeg: viewerState?.rotationDeg ?? 0,
		slabMm: viewerState?.slabMm ?? 1,
		axisDeg: viewerState?.axisDeg ?? 0,
		crosshair: viewerState?.crosshair ?? canOpenVolume,
		linkedPlanes: viewerState?.linkedPlanes ?? canOpenVolume,
	}));
}

export function viewportForAnnotation(
	annotation: DicomViewerToolStateBundleRequest["annotations"][number],
	viewports: DicomViewerViewportState[],
) {
	const firstPointPlane = annotation.points[0]?.plane ?? null;
	if (firstPointPlane) {
		const planeViewport = viewports.find(
			(viewport) => viewport.projection === firstPointPlane,
		);
		if (planeViewport) return planeViewport;
	}
	return viewports[0] ?? null;
}
