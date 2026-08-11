import path from "node:path";
import {
	type DicomClientRuntimeProfile,
	type DicomGpuRenderPlan,
	type DicomMprReadiness,
	type DicomProgressiveLoadStage,
	type DicomRenderCachePlanRequest,
	type DicomRenderCacheTask,
	type DicomRenderInteractionPhase,
	type DicomSeriesPreviewGroup,
	type DicomViewerDataSourceKind,
	type DicomViewerKind,
	type DicomViewerLaunchManifestRequest,
	type DicomViewerLaunchMode,
	type DicomViewerPlanningTask,
	type DicomViewerTargetTool,
	type DicomViewerToolConfig,
	type DicomViewerToolMode,
	type DicomViewerToolStateAnnotation,
	type DicomViewerToolStateBundleRequest,
	type DicomViewerViewportState,
	type DicomWorkstationReadinessCheck,
	type DicomWorkstationReadinessRequest,
	dicomRenderCachePlanResponseSchema,
	dicomViewerLaunchManifestResponseSchema,
	dicomViewerToolStateBundleResponseSchema,
	type ImagingSourceKind,
	type ImagingStudyKind,
} from "@dental/shared";

export const dicomArchiveExtensions = new Set([".zip", ".7z", ".rar"]);
export const dicomPixelFileExtensions = new Set([".dcm", ".dicom", ".ima"]);
export function isDicomArchivePath(filePath: string | null): boolean {
	if (!filePath) return false;
	if (filePath.includes("::")) return false;
	return dicomArchiveExtensions.has(
		path.extname(filePath.split("::")[0] ?? filePath).toLowerCase(),
	);
}
export function isDicomArchiveVirtualEntryPath(
	filePath: string | null,
): boolean {
	if (!filePath?.includes("::")) return false;
	const archivePath = filePath.split("::")[0] ?? "";
	return dicomArchiveExtensions.has(path.extname(archivePath).toLowerCase());
}
export function isDicomPixelPath(filePath: string): boolean {
	const normalized = filePath.replaceAll("\\", "/");
	const extension = path
		.extname(normalized.split("::")[0] ?? normalized)
		.toLowerCase();
	return (
		dicomPixelFileExtensions.has(extension) ||
		/(?:^|\/)DICOMDIR$/i.test(normalized)
	);
}
export function estimateDicomSeriesMemoryMb(input: {
	fileCount: number;
	estimatedPixelBytes: number | null;
}) {
	if (input.estimatedPixelBytes && input.estimatedPixelBytes > 0) {
		return Math.max(
			16,
			Math.ceil((input.estimatedPixelBytes / 1024 / 1024) * 1.35),
		);
	}
	const fileCount = input.fileCount;
	if (fileCount <= 0) return 0;
	return Math.max(16, Math.ceil(fileCount * 1.35));
}
export function buildMprResourcePolicy(input: {
	volumeCandidate: boolean;
	canOpenMpr: boolean;
	canBuildPanoramic: boolean;
	fileCount: number;
	estimatedPixelBytes: number | null;
	sourceKind: ImagingSourceKind;
	firstFilePath: string | null;
}): DicomMprReadiness["resourcePolicy"] {
	const estimatedMemoryMb = estimateDicomSeriesMemoryMb({
		fileCount: input.fileCount,
		estimatedPixelBytes: input.estimatedPixelBytes,
	});
	const dicomwebStream =
		input.sourceKind === "pacs" || input.sourceKind === "dicomweb";
	const archiveSource = isDicomArchivePath(input.firstFilePath);
	const archiveVirtualSource = isDicomArchiveVirtualEntryPath(
		input.firstFilePath,
	);
	const hugeStack = input.fileCount > 450 || estimatedMemoryMb > 640;
	const requiredTier: DicomMprReadiness["resourcePolicy"]["requiredTier"] =
		!input.volumeCandidate
			? "low_end"
			: input.fileCount <= 80
				? "standard"
				: input.fileCount <= 220
					? "workstation"
					: "diagnostic_workstation";
	const loadStrategy: DicomMprReadiness["resourcePolicy"]["loadStrategy"] =
		archiveVirtualSource
			? "external_handoff"
			: !input.volumeCandidate
				? input.fileCount > 1
					? "two_d_stack_stream"
					: "metadata_only"
				: !input.canOpenMpr || hugeStack
					? "external_handoff"
					: input.fileCount > 180
						? "mpr_downsampled"
						: "mpr_full";
	const maxClientSlices =
		requiredTier === "diagnostic_workstation"
			? 450
			: requiredTier === "workstation"
				? 300
				: 160;
	const cacheMode: DicomMprReadiness["resourcePolicy"]["cacheMode"] =
		dicomwebStream
			? "dicomweb_stream"
			: archiveVirtualSource
				? "metadata_only"
				: input.canOpenMpr
					? "bounded_disk"
					: input.fileCount > 1
						? "metadata_only"
						: "none";
	const safetyCaps = [
		"Загружайте список серии и миниатюры до тяжелых данных снимков.",
		`Ограничьте первичную загрузку браузера ${maxClientSlices} срезами; для большего объема требуется явное открытие рабочего места.`,
		"Не включайте тяжелые КЛКТ-инструменты в стандартный поток приема врача.",
	];

	if (dicomwebStream)
		safetyCaps.push(
			"Передавайте срезы через архив снимков с кешем; не копируйте полное исследование в состояние браузера.",
		);
	if (archiveSource)
		safetyCaps.push(
			"Распакуйте архивы в серверном или локальном обработчике до загрузки просмотра; не разбирайте большие ZIP в оболочке CRM.",
		);
	if (archiveVirtualSource)
		safetyCaps.push(
			"Записи внутри ZIP доступны как метаданные; для КТ-срезов нужен распакованный локальный набор или внешний просмотр.",
		);
	if (hugeStack)
		safetyCaps.push(
			"Для очень больших КЛКТ/КТ-стеков используйте внешний просмотр или отдельный обработчик объема.",
		);
	if (!input.canBuildPanoramic && input.volumeCandidate)
		safetyCaps.push(
			"Панорамная реконструкция отключена, пока не хватает срезов.",
		);

	const nextAction =
		loadStrategy === "external_handoff"
			? "Используйте внешний КТ-модуль или отдельный обработчик объема; CRM остается в режиме предпросмотра и восстановления."
			: loadStrategy === "mpr_downsampled"
				? "Откройте отдельное рабочее место КТ-срезов с первым проходом в пониженном качестве, затем повышайте качество на мощной станции."
				: loadStrategy === "mpr_full"
					? "Откройте отдельное рабочее место КТ-срезов со связанными плоскостями, оконными пресетами, измерениями и экспортом снимков."
					: loadStrategy === "two_d_stack_stream"
						? "Используйте легкий просмотрщик стека с яркостью/контрастом, масштабом и прокруткой срезов."
						: "Показывайте только метаданные, пока не выбрана пригодная серия снимков.";

	return {
		requiredTier,
		loadStrategy,
		estimatedMemoryMb,
		maxClientSlices,
		thumbnailFirst: true,
		downsampleRecommended:
			loadStrategy === "mpr_downsampled" || loadStrategy === "external_handoff",
		cacheMode,
		safetyCaps,
		nextAction,
	};
}
export function buildMprReadiness(input: {
	kind: ImagingStudyKind | null;
	modality: string | null;
	fileCount: number;
	estimatedPixelBytes: number | null;
	firstFilePath: string | null;
	sourceKind: ImagingSourceKind;
	hasStudySeriesUid: boolean;
}): DicomMprReadiness {
	const minSliceCount = 8;
	const modality = input.modality?.toUpperCase() ?? null;
	const volumeCandidate =
		input.kind === "cbct" ||
		modality === "CT" ||
		modality === "CBCT" ||
		modality === "MR";
	const archiveSource = isDicomArchivePath(input.firstFilePath);
	const archiveVirtualSource = isDicomArchiveVirtualEntryPath(
		input.firstFilePath,
	);
	const archiveExpanded = Boolean(input.firstFilePath?.includes("::"));
	const blockers: string[] = [];
	const warnings: string[] = [];

	if (!volumeCandidate)
		blockers.push("Серия не распознана как объемные данные КЛКТ/КТ.");
	if (!input.firstFilePath)
		blockers.push("Нет доступного локального файла или архива снимков.");
	if (input.fileCount < minSliceCount)
		blockers.push(
			`Для просмотра КТ-срезов нужно минимум ${minSliceCount} срезов/файлов в этом предпросмотре.`,
		);
	if (archiveSource && !archiveExpanded) {
		blockers.push(
			"Обнаружен путь к архиву, но записи снимков еще не раскрыты.",
		);
	}
	if (archiveVirtualSource) {
		blockers.push(
			"Записи ZIP распознаны, но пиксели еще не доступны как локальный набор КТ-срезов.",
		);
	}
	if (!input.hasStudySeriesUid)
		warnings.push(
			"Идентификаторы исследования/серии отсутствуют; группировка по папке временная.",
		);
	if (archiveVirtualSource)
		warnings.push(
			"ZIP-серия остается в режиме метаданных и передачи до распаковки или подключения локального обработчика.",
		);
	if (volumeCandidate && input.fileCount < 40)
		warnings.push(
			"Панорамная реконструкция КЛКТ может потребовать более полного стека срезов.",
		);
	if (input.sourceKind === "pacs" || input.sourceKind === "dicomweb") {
		warnings.push(
			"Архив снимков должен передавать срезы с кешем, а не копировать весь объем в состояние браузера.",
		);
	}

	const canOpenMpr =
		volumeCandidate &&
		input.fileCount >= minSliceCount &&
		Boolean(input.firstFilePath) &&
		!archiveVirtualSource &&
		!blockers.length;
	const canBuildPanoramic =
		canOpenMpr && input.kind === "cbct" && input.fileCount >= 40;
	const recommendedLayout: DicomMprReadiness["recommendedLayout"] = canOpenMpr
		? input.fileCount >= 40
			? "mpr_4up"
			: "mpr_3up"
		: archiveVirtualSource ||
				input.sourceKind === "pacs" ||
				input.sourceKind === "dicomweb"
			? "external_only"
			: input.fileCount > 1
				? "two_d_stack"
				: "none";

	const panoramicProjections: DicomMprReadiness["projections"] =
		canBuildPanoramic
			? ["panoramic_reconstruction", "three_d_volume", "mip"]
			: [];
	const volumePlanningTools: DicomMprReadiness["tools"] = canOpenMpr
		? [
				"measurement",
				"measure_distance",
				"measure_angle",
				"area_roi",
				"volume_roi",
				"implant_axis",
				"implant_library",
				"nerve_canal",
				"bone_density_probe",
				"surgical_guide",
			]
		: ["measurement", "measure_distance", "measure_angle", "implant_library"];
	const panoramicTools: DicomMprReadiness["tools"] = canBuildPanoramic
		? ["panoramic_curve", "export_snapshot"]
		: [];

	const projections: DicomMprReadiness["projections"] = canOpenMpr
		? ["axial", "coronal", "sagittal", "oblique", ...panoramicProjections]
		: archiveVirtualSource
			? []
			: input.fileCount > 1
				? ["axial"]
				: [];
	const tools: DicomMprReadiness["tools"] = canOpenMpr
		? [
				"window_level",
				"pan",
				"zoom",
				"slice_scroll",
				"crosshair",
				"rotate_axes",
				"oblique_planes",
				"mpr_3up",
				...volumePlanningTools,
				...panoramicTools,
				"reset",
				"external_open",
			]
		: archiveVirtualSource
			? ["external_open"]
			: input.fileCount > 1
				? [
						"window_level",
						"pan",
						"zoom",
						"slice_scroll",
						"reset",
						"external_open",
					]
				: ["window_level", "pan", "zoom", "reset", "external_open"];

	const nextAction = canOpenMpr
		? canBuildPanoramic
			? "Готово для просмотра КЛКТ/КТ-срезов: 3 проекции, косые оси, панорамная кривая, измерения и внешний КТ-модуль."
			: "Готово для 3-плоскостного предпросмотра КТ-срезов; для панорамной реконструкции нужен более полный КЛКТ/КТ-стек."
		: archiveVirtualSource
			? "Распакуйте ZIP или подключите локальный обработчик, чтобы открыть пиксели КТ-срезов; CRM сохраняет метаданные и пакет передачи."
			: archiveSource && !archiveExpanded
				? "Распакуйте ZIP или раскройте записи архива перед открытием КТ-срезов."
				: input.fileCount > 1
					? "Используйте 2D-предпросмотр стека или подключите локальный загрузчик объема после извлечения метаданных."
					: "Добавьте больше срезов серии или используйте 2D-просмотрщик.";
	const resourcePolicy = buildMprResourcePolicy({
		volumeCandidate,
		canOpenMpr,
		canBuildPanoramic,
		fileCount: input.fileCount,
		estimatedPixelBytes: input.estimatedPixelBytes,
		sourceKind: input.sourceKind,
		firstFilePath: input.firstFilePath,
	});

	return {
		volumeCandidate,
		canOpenMpr,
		canBuildPanoramic,
		recommendedLayout,
		minSliceCount,
		projections,
		tools,
		resourcePolicy,
		blockers,
		warnings,
		nextAction,
	};
}
export function safeJoinUrl(baseUrl: string, childPath: string) {
	const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
	const child = childPath.startsWith("/") ? childPath.slice(1) : childPath;
	return new URL(child, base).toString().replace(/\/$/, "");
}
export function addQueryParams(url: string, params: Record<string, string>) {
	const parsed = new URL(url);
	Object.entries(params).forEach(([key, value]) => {
		if (value) parsed.searchParams.set(key, value);
	});
	return parsed.toString();
}
export function buildOhifViewerUrl(
	ohifBaseUrl: string,
	studyInstanceUid: string,
) {
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
export function buildToolStateAnnotation(
	annotation: DicomViewerToolStateBundleRequest["annotations"][number],
	viewports: DicomViewerViewportState[],
): DicomViewerToolStateAnnotation {
	const viewport = viewportForAnnotation(annotation, viewports);
	const warnings = new Set<string>();
	if (!viewport) warnings.add("Целевая область просмотра недоступна.");
	if (annotation.points.length === 0) warnings.add("В аннотации нет точек.");
	if (
		(annotation.type === "distance" || annotation.type === "angle") &&
		annotation.measurementValue === null
	) {
		warnings.add(
			"Значение измерения отсутствует; viewer должен пересчитать его перед клиническим использованием.",
		);
	}

	return {
		id: `toolstate-${annotation.id}`,
		sourceAnnotationId: annotation.id,
		targetTool: targetToolForAnnotation(annotation),
		type: annotation.type,
		label: annotation.label,
		semanticRole: annotation.semanticRole ?? null,
		toothCode: annotation.toothCode,
		note: annotation.note,
		viewportId: viewport?.viewportId ?? "crm-stack",
		frameOfReferenceUid: null,
		referencedImageId: viewport?.referencedImageId ?? null,
		measurement: {
			value: annotation.measurementValue,
			unit: annotation.unit,
		},
		points: annotation.points.map((point, index) => ({
			world: [
				safeCoordinate(point.x),
				safeCoordinate(point.y),
				safeCoordinate(point.z),
			] as [number, number, number],
			canvas: [safeCoordinate(point.x), safeCoordinate(point.y)] as [
				number,
				number,
			],
			plane: point.plane ?? viewport?.projection ?? null,
			sourceIndex: index,
		})),
		locked: false,
		needsReview: warnings.size > 0,
		warnings: Array.from(warnings),
	};
}
export function planningTaskKindForQuickActionId(
	quickActionId: string | null | undefined,
): DicomViewerPlanningTask["kind"] | null {
	if (quickActionId === "opg_curve") return "panoramic_reconstruction";
	if (quickActionId === "ridge_ruler") return "distance_measurement";
	if (quickActionId === "implant_axis") return "implant_axis";
	if (quickActionId === "area_roi") return "area_roi";
	if (quickActionId === "volume_roi") return "volume_roi";
	if (quickActionId === "implant_library") return "implant_library";
	if (quickActionId === "nerve_canal") return "nerve_canal";
	if (quickActionId === "density_probe") return "bone_density_probe";
	if (quickActionId === "surgical_guide") return "surgical_guide";
	return null;
}
export function getDicomViewerPlanningTaskDefinitions(context: {
	slabMm: number;
	axisDeg: number;
	activeProjection: DicomViewerPlanningTask["projection"];
	activeWindowPreset: DicomViewerPlanningTask["windowPreset"];
	canBuildPanoramic: boolean;
}): Array<{
	kind: DicomViewerPlanningTask["kind"];
	title: string;
	crmTool: DicomViewerToolConfig["crmTool"];
	projection: DicomViewerPlanningTask["projection"];
	windowPreset: DicomViewerPlanningTask["windowPreset"];
	slabMm: number;
	axisDeg: number;
	requiresVolume: boolean;
	requiresPanoramic: boolean;
	outputUnit: string | null;
	reason: string;
}> {
	const {
		slabMm,
		axisDeg,
		activeProjection,
		activeWindowPreset,
		canBuildPanoramic,
	} = context;

	return [
		{
			kind: "panoramic_reconstruction",
			title: "ОПТГ-реконструкция",
			crmTool: "panoramic_curve",
			projection: "panoramic_reconstruction",
			windowPreset: "bone",
			slabMm: Math.max(3, slabMm),
			axisDeg,
			requiresVolume: true,
			requiresPanoramic: true,
			outputUnit: "panorama",
			reason:
				"Построить дугу зубного ряда и панорамный слой перед планированием имплантации.",
		},
		{
			kind: "cross_section_curve",
			title: "Серия поперечных срезов",
			crmTool: "panoramic_curve",
			projection: "oblique",
			windowPreset: "bone",
			slabMm: Math.max(1, slabMm),
			axisDeg,
			requiresVolume: true,
			requiresPanoramic: false,
			outputUnit: "curve_points",
			reason: "Связать поперечные срезы с выбранной дугой и косой плоскостью.",
		},
		{
			kind: "distance_measurement",
			title: "Линейная линейка",
			crmTool: "measure_distance",
			projection: activeProjection,
			windowPreset: activeWindowPreset,
			slabMm,
			axisDeg,
			requiresVolume: false,
			requiresPanoramic: false,
			outputUnit: "mm",
			reason:
				"Сохранить измерение длины для просмотра или передачи во внешний модуль.",
		},
		{
			kind: "angle_measurement",
			title: "Измерение угла",
			crmTool: "measure_angle",
			projection: activeProjection,
			windowPreset: activeWindowPreset,
			slabMm,
			axisDeg,
			requiresVolume: false,
			requiresPanoramic: false,
			outputUnit: "deg",
			reason: "Сохранить ось и угол наклона для восстановления в просмотре.",
		},
		{
			kind: "area_roi",
			title: "Контур площади",
			crmTool: "measure_area",
			projection: activeProjection,
			windowPreset: activeWindowPreset,
			slabMm,
			axisDeg,
			requiresVolume: true,
			requiresPanoramic: false,
			outputUnit: "mm2",
			reason:
				"Отметить область синус-лифта, дефекта, дыхательных путей или костной пластики.",
		},
		{
			kind: "volume_roi",
			title: "Контур объема",
			crmTool: "measure_volume",
			projection: "three_d_volume",
			windowPreset: "bone",
			slabMm: Math.max(1, slabMm),
			axisDeg,
			requiresVolume: true,
			requiresPanoramic: false,
			outputUnit: "mm3",
			reason:
				"Сохранить объемную область для дефекта, синуса, дыхательных путей или пластики.",
		},
		{
			kind: "implant_axis",
			title: "Ось импланта",
			crmTool: "implant_axis",
			projection: "oblique",
			windowPreset: "implant",
			slabMm: Math.max(1, slabMm),
			axisDeg,
			requiresVolume: true,
			requiresPanoramic: false,
			outputUnit: "deg/mm",
			reason:
				"Восстановить ось импланта по выбранной косой плоскости и толщине слоя.",
		},
		{
			kind: "implant_library",
			title: "Размер импланта",
			crmTool: "implant_library",
			projection: activeProjection,
			windowPreset: "implant",
			slabMm,
			axisDeg,
			requiresVolume: false,
			requiresPanoramic: false,
			outputUnit: "diameter_length",
			reason:
				"Передать выбранный диаметр и длину без передачи тяжелых файлов снимков.",
		},
		{
			kind: "nerve_canal",
			title: "Канал нижнечелюстного нерва",
			crmTool: "nerve_canal",
			projection: canBuildPanoramic ? "panoramic_reconstruction" : "oblique",
			windowPreset: "bone",
			slabMm: Math.max(1, slabMm),
			axisDeg,
			requiresVolume: true,
			requiresPanoramic: false,
			outputUnit: "mm_clearance",
			reason: "Сохранить трассировку канала для проверки отступа от импланта.",
		},
		{
			kind: "bone_density_probe",
			title: "Проверка плотности кости",
			crmTool: "bone_density_probe",
			projection: activeProjection,
			windowPreset: "implant",
			slabMm,
			axisDeg,
			requiresVolume: true,
			requiresPanoramic: false,
			outputUnit: "HU",
			reason:
				"Сохранить точку проверки плотности там, где калибровка снимка это допускает.",
		},
		{
			kind: "surgical_guide",
			title: "Маршрут хирургического шаблона",
			crmTool: "surgical_guide",
			projection: "three_d_volume",
			windowPreset: "implant",
			slabMm: Math.max(1, slabMm),
			axisDeg,
			requiresVolume: true,
			requiresPanoramic: false,
			outputUnit: "sleeve_axis",
			reason:
				"Сохранить втулку шаблона, ось импланта и цель экспорта без передачи снимков.",
		},
	];
}
export function buildDicomViewerPlanningTasks(
	input: DicomViewerToolStateBundleRequest,
): DicomViewerPlanningTask[] {
	const series = input.series;
	const viewerState = input.viewerState;
	const canOpenVolume =
		series.mprReadiness.canOpenMpr && series.mprReadiness.volumeCandidate;
	const canBuildPanoramic = series.mprReadiness.canBuildPanoramic;
	const activeProjection =
		viewerState?.projection ?? series.mprReadiness.projections[0] ?? "axial";
	const activeWindowPreset =
		viewerState?.windowPreset ?? (series.kind === "cbct" ? "bone" : "endo");
	const slabMm = viewerState?.slabMm ?? 1;
	const axisDeg = viewerState?.axisDeg ?? 0;
	const implantPlan = viewerState?.implantPlan ?? null;
	const activeQuickActionTaskKind = planningTaskKindForQuickActionId(
		viewerState?.activeQuickActionId ?? null,
	);

	const taskDefinitions = getDicomViewerPlanningTaskDefinitions({
		slabMm,
		axisDeg,
		activeProjection,
		activeWindowPreset,
		canBuildPanoramic,
	});

	return taskDefinitions.map((task) => {
		const warnings: string[] = [];
		if (task.requiresVolume && !canOpenVolume) {
			warnings.push(
				"Объемная серия еще не готова; сохраните задачу как метаданные до выбора полной КЛКТ/КТ-серии.",
			);
		}
		if (task.requiresPanoramic && !canBuildPanoramic) {
			warnings.push("Для ОПТГ-реконструкции нужна более полная КЛКТ/КТ-серия.");
		}
		if (
			(task.kind === "implant_axis" || task.kind === "surgical_guide") &&
			!implantPlan
		) {
			warnings.push(
				"Сначала выберите размер импланта для проверки оси и шаблона.",
			);
		}

		const blocked = warnings.length > 0;
		const activeByClinicalScenario = activeQuickActionTaskKind
			? task.kind === activeQuickActionTaskKind
			: viewerState?.activeTool === task.crmTool;
		const status: DicomViewerPlanningTask["status"] = blocked
			? "blocked"
			: activeByClinicalScenario
				? "active"
				: "ready";

		return {
			id: `ct-plan-${task.kind}`,
			kind: task.kind,
			title: task.title,
			targetTool: targetToolForCrmTool(task.crmTool),
			projection: task.projection,
			windowPreset: task.windowPreset,
			slabMm: task.slabMm,
			axisDeg: task.axisDeg,
			requiresVolume: task.requiresVolume,
			status,
			outputUnit: task.outputUnit,
			implantPlan,
			reason: task.reason,
			warnings,
		};
	});
}
export function buildDicomViewerToolStateBundle(
	input: DicomViewerToolStateBundleRequest,
) {
	const series = input.series;
	const warnings = new Set<string>(series.warnings);
	const volumeId = cornerstoneVolumeIdForSeries(series);
	const studyPart = stableViewerIdPart(series.studyInstanceUid, "study");
	const seriesPart = stableViewerIdPart(series.seriesInstanceUid, series.id);
	const toolGroupId = `dental-crm-tools-${seriesPart}`;
	const renderingEngineId = `dental-crm-renderer-${studyPart}`;
	const viewports = buildDicomViewerViewports(input);
	const annotations = input.annotations.map((annotation) =>
		buildToolStateAnnotation(annotation, viewports),
	);

	if (!series.studyInstanceUid || !series.seriesInstanceUid) {
		warnings.add(
			"Коды исследования/серии отсутствуют; адаптер должен привязать локальные файлы по пути из списка.",
		);
	}
	if (!series.mprReadiness.canOpenMpr && series.mprReadiness.volumeCandidate) {
		warnings.add(
			"Серия похожа на объемную, но еще не готова к просмотру КТ-срезов; держите аннотации как метаданные до выбора полной серии.",
		);
	}
	if (input.renderPlan?.textureStrategy === "external_viewer") {
		warnings.add(
			"План загрузки выбрал внешний просмотр; используйте этот файл только для передачи метаданных и аннотаций.",
		);
	}
	annotations.forEach((annotation) => {
		annotation.warnings.forEach((warning) => {
			warnings.add(warning);
		});
	});

	const target =
		input.target === "ohif"
			? "ohif"
			: input.target === "external_viewer" ||
					input.viewerKind === "weasis" ||
					input.viewerKind === "radiant"
				? "external_viewer"
				: input.target === "generic_json"
					? "generic_json"
					: "cornerstone3d";

	const nextAction =
		target === "cornerstone3d"
			? "Сначала загрузите серию снимков, затем примените инструменты просмотра и аннотации CRM."
			: target === "ohif"
				? "Подключите это как файл измерений и окон просмотра после открытия серии во внешнем просмотре."
				: target === "external_viewer"
					? "Передайте этот файл рядом с запуском внешнего просмотра; CRM остается слоем восстановления."
					: "Используйте этот файл как стабильный контракт для будущего адаптера просмотрщика.";

	return dicomViewerToolStateBundleResponseSchema.parse({
		version: "dental-crm-dicom-tool-state-v1",
		target,
		viewerKind: input.viewerKind,
		generatedAt: new Date().toISOString(),
		seriesRef: {
			studyInstanceUid: series.studyInstanceUid,
			seriesInstanceUid: series.seriesInstanceUid,
			sourceKind: series.sourceKind,
			sourceName: series.sourceName,
			cornerstoneVolumeId: volumeId,
			firstFilePath: series.firstFilePath,
		},
		adapterHints: {
			cornerstone3d: {
				toolGroupId,
				renderingEngineId,
				volumeId,
				viewportIds: viewports.map((viewport) => viewport.viewportId),
			},
			ohif: {
				measurementSourceName: "Dental CRM",
				displaySetInstanceUid: series.seriesInstanceUid,
				hangingProtocolStage: series.mprReadiness.recommendedLayout,
			},
		},
		viewports,
		tools: buildToolConfigs(input),
		annotations,
		planningTasks: buildDicomViewerPlanningTasks(input),
		activeQuickActionId: input.viewerState?.activeQuickActionId ?? null,
		implantPlan: input.viewerState?.implantPlan ?? null,
		resourcePolicy: series.mprReadiness.resourcePolicy,
		renderPlan: input.renderPlan ?? null,
		exportHints: [
			"Пакет содержит только состояние просмотрщика и метаданные разметки; тяжелые данные снимков в него не попадают.",
			"Применяйте после поиска в архиве или локального разрешения плана, когда уже есть идентификаторы изображений.",
			"Измерения остаются черновой разметкой просмотрщика, пока врач не проверит калибровку и не подпишет запись.",
			"Сохраняйте сеанс просмотра в CRM локально/на сервере, чтобы внешний просмотр не потерял состояние.",
		],
		warnings: Array.from(warnings),
		nextAction,
	});
}
export function isRemoteDicomSource(
	series: Pick<DicomSeriesPreviewGroup, "sourceKind">,
) {
	return series.sourceKind === "dicomweb" || series.sourceKind === "pacs";
}
export function hasExplicitDicomDesktopBridge(
	client: DicomWorkstationReadinessRequest["client"],
): boolean {
	return client.desktopShellBridgeSupported === true;
}
export function detectDicomClientRuntimeSurface(
	client: DicomWorkstationReadinessRequest["client"],
): DicomClientRuntimeProfile["surface"] {
	if (client.runtimeSurfaceHint === "desktop_app") {
		return hasExplicitDicomDesktopBridge(client)
			? "desktop_app"
			: "desktop_web";
	}
	if (
		client.runtimeSurfaceHint === "mobile_web" ||
		client.runtimeSurfaceHint === "tablet_web" ||
		client.runtimeSurfaceHint === "desktop_web"
	) {
		return client.runtimeSurfaceHint;
	}
	const text =
		`${client.platform ?? ""} ${client.userAgent ?? ""}`.toLowerCase();
	if (/ipad|tablet/.test(text)) return "tablet_web";
	if (/android|iphone|ipod|mobile|phone/.test(text)) return "mobile_web";
	if (
		/win|mac|linux|x11|desktop|electron|tauri|neutralino|dental-crm-desktop|desktop app|desktop-app/.test(
			text,
		)
	)
		return "desktop_web";
	return "unknown";
}
export function buildDicomClientRuntimeProfile(input: {
	series: DicomSeriesPreviewGroup;
	client: DicomWorkstationReadinessRequest["client"];
}): DicomClientRuntimeProfile {
	const { series, client } = input;
	const surface = detectDicomClientRuntimeSurface(client);
	const remoteSource = isRemoteDicomSource(series);
	const hasVirtualArchiveEntries = isDicomArchiveVirtualEntryPath(
		series.firstFilePath,
	);
	const mobileConstrained =
		surface === "mobile_web" || surface === "tablet_web";
	const desktopAppPreferred = surface === "desktop_app";
	const networkMode: DicomClientRuntimeProfile["networkMode"] = client.online
		? "online"
		: remoteSource
			? "offline_remote_blocked"
			: "offline_local";
	const canUseLocalFiles =
		!remoteSource &&
		!hasVirtualArchiveEntries &&
		Boolean(series.firstFilePath || series.sourceKind === "dicom_file");
	const canUseRemoteArchive = remoteSource && client.online;
	const canUseBrowserMpr =
		!mobileConstrained &&
		networkMode !== "offline_remote_blocked" &&
		client.webgl2Supported &&
		client.indexedDbSupported &&
		series.mprReadiness.canOpenMpr;
	const executionLane: DicomClientRuntimeProfile["executionLane"] =
		networkMode === "offline_remote_blocked" || !series.mprReadiness.canOpenMpr
			? "metadata_only"
			: mobileConstrained
				? "browser_preview"
				: desktopAppPreferred
					? "desktop_app_mpr"
					: canUseBrowserMpr
						? "browser_mpr"
						: "external_or_local_viewer";
	const warnings: string[] = [];
	if (mobileConstrained) {
		warnings.push(
			"Телефон или планшет остается маршрутом карточки, заметок и первого ориентира; тяжелый КТ-объем открывайте на ПК или в настольном модуле.",
		);
	}
	if (networkMode === "offline_remote_blocked") {
		warnings.push(
			"Архив снимков требует сеть; офлайн доступен только для сохраненного состояния, заметок и метаданных.",
		);
	}
	if (hasVirtualArchiveEntries) {
		warnings.push(
			"ZIP-серия пока не является локальным набором пикселей; откройте ее через внешний обработчик или распакуйте перед КТ-срезами.",
		);
	}
	if (desktopAppPreferred && canUseLocalFiles) {
		warnings.push(
			"Настольный режим может держать локальную папку и внешний просмотр рядом с CRM без отправки тяжелых данных снимков в браузер.",
		);
	}

	const label =
		surface === "desktop_app"
			? "настольное приложение"
			: surface === "desktop_web"
				? "ПК-браузер"
				: surface === "mobile_web"
					? "телефон"
					: surface === "tablet_web"
						? "планшет"
						: "неизвестное устройство";
	const nextAction =
		executionLane === "desktop_app_mpr"
			? "Открывайте КТ через настольный модуль или внешний просмотр, CRM хранит состояние и пакет передачи."
			: executionLane === "browser_mpr"
				? "Можно готовить отдельное рабочее место КТ-срезов в браузере с ограничениями по памяти и фазам загрузки."
				: executionLane === "browser_preview"
					? "На телефоне держите карточку, заметки, первый срез и передачу; полный объем переносите на ПК."
					: executionLane === "metadata_only"
						? "Оставайтесь в метаданных и восстановлении состояния, пока локальная серия или сеть архива не доступны."
						: "Используйте внешний или локальный просмотр, CRM остается слоем состояния и аннотаций.";

	return {
		surface,
		networkMode,
		executionLane,
		mobileConstrained,
		desktopAppPreferred,
		canUseLocalFiles,
		canUseRemoteArchive,
		canUseBrowserMpr,
		label,
		nextAction,
		warnings,
	};
}
export function describeDicomExecutionLaneForOperator(
	lane: DicomClientRuntimeProfile["executionLane"],
) {
	if (lane === "desktop_app_mpr") return "настольный КТ-модуль";
	if (lane === "browser_mpr") return "КТ-срезы в браузере";
	if (lane === "browser_preview") return "легкий просмотр в браузере";
	if (lane === "metadata_only") return "только метаданные";
	return "внешний или локальный просмотр";
}
export function readinessCheck(
	input: DicomWorkstationReadinessCheck,
): DicomWorkstationReadinessCheck {
	return input;
}
export function estimateGpuMemoryMb(series: DicomSeriesPreviewGroup) {
	const pixelMb =
		series.estimatedPixelBytes && series.estimatedPixelBytes > 0
			? series.estimatedPixelBytes / 1024 / 1024
			: series.fileCount * 0.72;
	const planningOverhead = series.mprReadiness.canBuildPanoramic ? 1.25 : 1;
	return Math.max(16, Math.ceil(pixelMb * planningOverhead * 1.35));
}
export function detectGpuClass(
	client: DicomWorkstationReadinessRequest["client"],
): DicomGpuRenderPlan["gpuClass"] {
	if (!client.webgl2Supported) return "none";
	const renderer =
		`${client.webglVendor ?? ""} ${client.webglRenderer ?? ""}`.toLowerCase();
	const memory = client.deviceMemoryGb ?? 0;
	const cores = client.hardwareConcurrency ?? 0;
	const max3d = client.max3dTextureSize ?? 0;
	const discreteHint =
		/nvidia|geforce|quadro|rtx|gtx|radeon|rx |arc|apple m[2-9]|apple gpu/i.test(
			renderer,
		);
	if (discreteHint && memory >= 16 && cores >= 8 && max3d >= 2048)
		return "diagnostic";
	if (
		(discreteHint && max3d >= 1024) ||
		(memory >= 8 && cores >= 8 && max3d >= 1024)
	)
		return "discrete_ok";
	if (memory >= 6 && cores >= 4 && max3d >= 512) return "integrated_ok";
	return "integrated_low";
}
export function policyRatio(
	value: number | null | undefined,
	min: number,
	max: number,
) {
	if (value === null || value === undefined || !Number.isFinite(value))
		return 0;
	if (max <= min) return 0;
	return clampNumber((value - min) / (max - min), 0, 1);
}
export function roundedPolicyWeight(value: number) {
	return Math.round(clampNumber(value, 0, 1) * 100) / 100;
}
export function freeClientStorageMb(
	client: DicomWorkstationReadinessRequest["client"],
) {
	if (client.storageQuotaMb === null || client.storageUsageMb === null)
		return null;
	return Math.max(0, client.storageQuotaMb - client.storageUsageMb);
}
export function detectRenderMemoryBudgetClass(input: {
	client: DicomWorkstationReadinessRequest["client"];
	runtimeProfile: DicomClientRuntimeProfile;
	gpuClass: DicomGpuRenderPlan["gpuClass"];
}): DicomGpuRenderPlan["memoryBudgetClass"] {
	const { client, runtimeProfile, gpuClass } = input;
	const memory = client.deviceMemoryGb ?? 0;
	const cores = client.hardwareConcurrency ?? 0;
	if (!client.webgl2Supported || gpuClass === "none" || memory < 3 || cores < 2)
		return "minimum";
	if (
		runtimeProfile.mobileConstrained ||
		memory < 6 ||
		cores < 4 ||
		gpuClass === "integrated_low"
	)
		return "constrained";
	if (
		runtimeProfile.executionLane === "desktop_app_mpr" &&
		gpuClass === "diagnostic" &&
		memory >= 16 &&
		cores >= 8
	)
		return "diagnostic";
	if (
		memory >= 8 &&
		cores >= 4 &&
		(gpuClass === "integrated_ok" ||
			gpuClass === "discrete_ok" ||
			gpuClass === "diagnostic")
	) {
		return "workstation";
	}
	return "standard";
}
export function buildDicomRenderHardwarePolicy(input: {
	series: DicomSeriesPreviewGroup;
	client: DicomWorkstationReadinessRequest["client"];
	runtimeProfile: DicomClientRuntimeProfile;
	gpuClass: DicomGpuRenderPlan["gpuClass"];
	pixelAccessBlocked: boolean;
}): Pick<
	DicomGpuRenderPlan,
	"memoryBudgetClass" | "hardwareQualityWeight" | "progressiveSliceWindowCap"
> {
	const { series, client, runtimeProfile, gpuClass, pixelAccessBlocked } =
		input;
	const memoryBudgetClass = detectRenderMemoryBudgetClass({
		client,
		runtimeProfile,
		gpuClass,
	});
	const graphicsWeight: Record<DicomGpuRenderPlan["gpuClass"], number> = {
		none: 0,
		integrated_low: 0.18,
		integrated_ok: 0.42,
		discrete_ok: 0.72,
		diagnostic: 1,
	};
	const workerWeight = client.webWorkerSupported
		? client.offscreenCanvasSupported
			? 1
			: 0.65
		: 0;
	const storageMb = freeClientStorageMb(client);
	const storageWeight =
		storageMb === null ? 0.4 : policyRatio(storageMb, 512, 4096);
	const rawWeight =
		policyRatio(client.deviceMemoryGb, 2, 16) * 0.36 +
		graphicsWeight[gpuClass] * 0.28 +
		policyRatio(client.hardwareConcurrency, 2, 8) * 0.18 +
		storageWeight * 0.1 +
		workerWeight * 0.08;
	const surfaceCap = runtimeProfile.mobileConstrained
		? 0.34
		: runtimeProfile.executionLane === "browser_mpr"
			? 0.82
			: 1;
	const hardwareQualityWeight = roundedPolicyWeight(
		Math.min(rawWeight, surfaceCap),
	);
	const classCap: Record<DicomGpuRenderPlan["memoryBudgetClass"], number> = {
		minimum: 8,
		constrained: 24,
		standard: 64,
		workstation: 128,
		diagnostic: 224,
	};
	const weightedCap = 8 + Math.round(hardwareQualityWeight * 216);
	let progressiveSliceWindowCap = Math.min(
		classCap[memoryBudgetClass],
		weightedCap,
	);
	if (!client.webWorkerSupported)
		progressiveSliceWindowCap = Math.min(progressiveSliceWindowCap, 24);
	else if (!client.offscreenCanvasSupported)
		progressiveSliceWindowCap = Math.min(progressiveSliceWindowCap, 64);
	if (runtimeProfile.mobileConstrained)
		progressiveSliceWindowCap = Math.min(progressiveSliceWindowCap, 8);
	if (pixelAccessBlocked) progressiveSliceWindowCap = 1;
	progressiveSliceWindowCap = Math.max(
		1,
		Math.min(
			progressiveSliceWindowCap,
			series.mprReadiness.resourcePolicy.maxClientSlices,
		),
	);

	return {
		memoryBudgetClass,
		hardwareQualityWeight,
		progressiveSliceWindowCap,
	};
}
export function diagnosticPixelPolicyFor(input: {
	runtimeProfile: DicomClientRuntimeProfile;
	textureStrategy: DicomGpuRenderPlan["textureStrategy"];
}): DicomGpuRenderPlan["diagnosticPixelPolicy"] {
	if (input.textureStrategy === "metadata_only")
		return "metadata_only_no_pixels";
	if (
		input.runtimeProfile.executionLane === "browser_mpr" ||
		input.runtimeProfile.executionLane === "browser_preview"
	) {
		return "browser_preview_not_diagnostic";
	}
	return "desktop_app_or_external_review";
}
export function buildGpuRenderPlan(input: {
	series: DicomSeriesPreviewGroup;
	client: DicomWorkstationReadinessRequest["client"];
	connectorReady: boolean;
	tierOk: boolean;
}): DicomGpuRenderPlan {
	const { series, client, connectorReady, tierOk } = input;
	const runtimeProfile = buildDicomClientRuntimeProfile({ series, client });
	const gpuClass = detectGpuClass(client);
	const estimatedGpuMemoryMb = estimateGpuMemoryMb(series);
	const maxTextureEdge = client.maxTextureSize ?? null;
	const max3dTextureEdge = client.max3dTextureSize ?? null;
	const warnings = new Set<string>();
	const sourceNeedsNetwork = isRemoteDicomSource(series);
	const forceMetadataOnly =
		runtimeProfile.networkMode === "offline_remote_blocked";
	const forceExternal =
		!forceMetadataOnly &&
		(gpuClass === "none" ||
			!client.indexedDbSupported ||
			runtimeProfile.mobileConstrained ||
			(sourceNeedsNetwork && !connectorReady) ||
			series.mprReadiness.resourcePolicy.loadStrategy === "external_handoff");
	const hardwarePolicy = buildDicomRenderHardwarePolicy({
		series,
		client,
		runtimeProfile,
		gpuClass,
		pixelAccessBlocked:
			forceMetadataOnly || forceExternal || !series.mprReadiness.canOpenMpr,
	});

	runtimeProfile.warnings.forEach((warning) => {
		warnings.add(warning);
	});
	if (gpuClass === "none")
		warnings.add(
			"Графика браузера недоступна: КТ-срезы не могут работать в этом браузере.",
		);
	if (!client.indexedDbSupported)
		warnings.add(
			"Локальное хранилище браузера недоступно: восстановление просмотра не будет надежным.",
		);
	if (sourceNeedsNetwork && !connectorReady)
		warnings.add(
			"Архив снимков не готов, поэтому потоковая передача срезов недоступна.",
		);
	if ((max3dTextureEdge ?? 0) > 0 && (max3dTextureEdge ?? 0) < 512)
		warnings.add(
			"Браузер сообщает слишком маленький лимит для объемного просмотра.",
		);
	if (runtimeProfile.executionLane === "browser_mpr") {
		warnings.add(
			"Браузерный режим КТ остается планировочным предпросмотром; диагностический пиксельный просмотр и CAD требуют внешнего или настольного модуля.",
		);
	}

	const canSingleTexture =
		!forceMetadataOnly &&
		!forceExternal &&
		!runtimeProfile.mobileConstrained &&
		series.fileCount <= 220 &&
		series.fileCount <= hardwarePolicy.progressiveSliceWindowCap &&
		(max3dTextureEdge ?? 0) >= 512 &&
		gpuClass !== "integrated_low";
	const shouldBrick =
		!forceMetadataOnly &&
		!forceExternal &&
		!runtimeProfile.mobileConstrained &&
		!canSingleTexture &&
		(max3dTextureEdge ?? 0) >= 512 &&
		series.fileCount <= series.mprReadiness.resourcePolicy.maxClientSlices;

	const textureStrategy: DicomGpuRenderPlan["textureStrategy"] =
		forceMetadataOnly
			? "metadata_only"
			: forceExternal
				? "external_viewer"
				: canSingleTexture
					? "single_3d_texture"
					: shouldBrick
						? "bricked_3d_textures"
						: runtimeProfile.mobileConstrained || series.fileCount > 1
							? "stack_2d_textures"
							: "metadata_only";

	const qualityMode: DicomGpuRenderPlan["qualityMode"] =
		textureStrategy === "external_viewer"
			? "external"
			: textureStrategy === "metadata_only"
				? "metadata_only"
				: runtimeProfile.executionLane === "desktop_app_mpr" &&
						gpuClass === "diagnostic" &&
						tierOk &&
						series.mprReadiness.resourcePolicy.loadStrategy === "mpr_full"
					? "diagnostic_full"
					: runtimeProfile.mobileConstrained ||
							gpuClass === "integrated_low" ||
							!tierOk
						? "interactive_low"
						: "balanced_mpr";

	const downsampleFactor =
		qualityMode === "diagnostic_full"
			? 1
			: qualityMode === "balanced_mpr"
				? series.fileCount > 180
					? 2
					: 1
				: qualityMode === "interactive_low"
					? 3
					: runtimeProfile.mobileConstrained
						? 4
						: 1;
	const rawTargetSliceBatch =
		textureStrategy === "external_viewer"
			? 1
			: textureStrategy === "metadata_only"
				? 1
				: textureStrategy === "single_3d_texture"
					? Math.min(series.fileCount, 220)
					: textureStrategy === "bricked_3d_textures"
						? 48
						: runtimeProfile.mobileConstrained
							? Math.min(8, Math.max(1, series.fileCount))
							: Math.min(24, Math.max(8, series.fileCount));
	const targetSliceBatch = Math.max(
		1,
		Math.min(rawTargetSliceBatch, hardwarePolicy.progressiveSliceWindowCap),
	);
	if (targetSliceBatch < rawTargetSliceBatch) {
		warnings.add(
			`Политика памяти ограничила первое окно КТ до ${targetSliceBatch} срезов из ${rawTargetSliceBatch}.`,
		);
	}
	const useOffscreenCanvas = Boolean(
		client.offscreenCanvasSupported &&
			client.webWorkerSupported &&
			textureStrategy !== "external_viewer",
	);
	const useWebWorker = Boolean(
		client.webWorkerSupported && textureStrategy !== "external_viewer",
	);
	const interactionBudgetMs =
		qualityMode === "diagnostic_full"
			? 12
			: qualityMode === "balanced_mpr"
				? 16
				: 24;
	const diagnosticPixelPolicy = diagnosticPixelPolicyFor({
		runtimeProfile,
		textureStrategy,
	});
	const firstPaintStrategy =
		textureStrategy === "external_viewer"
			? "Открыть внешний КТ-модуль; CRM остается в режиме метаданных и заметок."
			: textureStrategy === "metadata_only"
				? "Остаться в метаданных и восстановлении состояния; пиксели недоступны для текущего режима."
				: textureStrategy === "single_3d_texture"
					? "Передать список серии и первый аксиальный стек, затем подготовить общий 3D-объем для связанных КТ-срезов."
					: textureStrategy === "bricked_3d_textures"
						? "Сначала загрузить центральный фрагмент низкого разрешения, затем подгружать соседние фрагменты при прокрутке."
						: textureStrategy === "stack_2d_textures"
							? "Использовать легкий послойный 2D-просмотр, пока отдельный обработчик объема недоступен."
							: "Остаться в режиме метаданных.";

	const nextAction =
		qualityMode === "external"
			? "Используйте внешний КТ-модуль; не загружайте полный объем внутрь CRM."
			: qualityMode === "diagnostic_full"
				? "Используйте общий объем со связанными аксиальной, корональной и сагиттальной плоскостями и повышением до полного разрешения."
				: qualityMode === "balanced_mpr"
					? "Сначала используйте КТ-срезы с пониженным разрешением, затем разрешайте полное качество по запросу."
					: qualityMode === "interactive_low"
						? "Держите первый показ быстрым: понижайте разрешение, ограничивайте срезы и повышайте качество только по запросу."
						: "Оставайтесь в режиме метаданных, пока не выбрана пригодная серия или рабочая станция.";

	return {
		gpuClass,
		textureStrategy,
		qualityMode,
		downsampleFactor,
		targetSliceBatch,
		maxTextureEdge,
		max3dTextureEdge,
		estimatedGpuMemoryMb,
		...hardwarePolicy,
		diagnosticPixelPolicy,
		useWebWorker,
		useOffscreenCanvas,
		interactionBudgetMs,
		firstPaintStrategy,
		warnings: Array.from(warnings),
		nextAction,
	};
}
export function clampNumber(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}
export function taskMemoryForRange(
	start: number | null,
	end: number | null,
	perSliceMb: number,
) {
	if (start === null || end === null) return 1;
	return Math.max(1, Math.ceil((end - start + 1) * perSliceMb));
}
export function renderTask(input: {
	id: string;
	kind: DicomRenderCacheTask["kind"];
	target: DicomRenderCacheTask["target"];
	priority: DicomRenderCacheTask["priority"];
	sliceStart: number | null;
	sliceEnd: number | null;
	projection: DicomRenderCacheTask["projection"];
	estimatedMemoryMb: number;
	budgetMs: number;
	blocking: boolean;
	label: string;
	nextAction: string;
}): DicomRenderCacheTask {
	return input;
}
export function buildDicomRenderInteractionPhases(input: {
	fileCount: number;
	renderPlan: DicomGpuRenderPlan;
	firstBatch: number;
	maxResidentSlices: number;
	workerCount: number;
}): DicomRenderInteractionPhase[] {
	const { fileCount, renderPlan, firstBatch, maxResidentSlices, workerCount } =
		input;
	if (
		renderPlan.textureStrategy === "external_viewer" ||
		renderPlan.textureStrategy === "metadata_only"
	) {
		const metadataOnly = renderPlan.textureStrategy === "metadata_only";
		return [
			{
				id: "external_review",
				label: metadataOnly ? "только метаданные" : "внешний просмотр",
				trigger: metadataOnly
					? "пиксели недоступны для текущего режима"
					: "серия тяжелее или слабее текущего браузера",
				targetFrameMs: 100,
				downsampleFactor: 1,
				maxResidentSlices: 1,
				workerCount: 0,
				nextAction: metadataOnly
					? "Сохранить состояние, заметки и серию метаданных; пиксели открыть только после сети, локальной папки или настольного модуля."
					: "Открыть снимки через внешний КТ-модуль; CRM сохраняет состояние, заметки и пакет передачи.",
			},
		];
	}

	const movementDownsample =
		renderPlan.qualityMode === "diagnostic_full"
			? fileCount > 160
				? 2
				: 1
			: renderPlan.qualityMode === "balanced_mpr"
				? Math.max(renderPlan.downsampleFactor, fileCount > 120 ? 2 : 1)
				: renderPlan.qualityMode === "interactive_low"
					? Math.max(renderPlan.downsampleFactor, 3)
					: renderPlan.downsampleFactor;
	const idleDownsample =
		renderPlan.qualityMode === "interactive_low"
			? Math.max(2, renderPlan.downsampleFactor - 1)
			: renderPlan.downsampleFactor;
	const firstVisibleSlices = Math.max(
		1,
		Math.min(firstBatch, renderPlan.qualityMode === "diagnostic_full" ? 12 : 8),
	);
	const interactiveResidentSlices =
		renderPlan.textureStrategy === "single_3d_texture"
			? Math.min(maxResidentSlices, fileCount)
			: Math.max(firstBatch, Math.min(maxResidentSlices, firstBatch * 2));

	return [
		{
			id: "first_visible_slice",
			label: "первый видимый срез",
			trigger: "открытие серии или переход к другому пациенту",
			targetFrameMs: Math.min(renderPlan.interactionBudgetMs, 16),
			downsampleFactor: movementDownsample,
			maxResidentSlices: firstVisibleSlices,
			workerCount: Math.min(workerCount, 1),
			nextAction:
				"Показать один активный срез до подготовки соседнего окна, чтобы карточка приема не зависла.",
		},
		{
			id: "interactive_navigation",
			label: "быстрая прокрутка",
			trigger: "движение среза, оси, масштаба или окна плотности",
			targetFrameMs: renderPlan.interactionBudgetMs,
			downsampleFactor: movementDownsample,
			maxResidentSlices: interactiveResidentSlices,
			workerCount,
			nextAction:
				"Во время движения держать облегченное качество и видимый диапазон; уточнение запускать только после паузы.",
		},
		{
			id: "idle_refine",
			label: "уточнение в паузе",
			trigger: "врач остановил прокрутку или выбрал клинический пресет",
			targetFrameMs:
				renderPlan.qualityMode === "diagnostic_full"
					? 12
					: renderPlan.qualityMode === "balanced_mpr"
						? 16
						: 24,
			downsampleFactor: idleDownsample,
			maxResidentSlices,
			workerCount,
			nextAction:
				"После паузы повышать качество текущего окна, затем соседние срезы; не блокировать основной прием.",
		},
	];
}
export function progressiveStage(input: {
	id: string;
	kind: DicomProgressiveLoadStage["kind"];
	label: string;
	priority: DicomProgressiveLoadStage["priority"];
	target: DicomProgressiveLoadStage["target"];
	requestPattern: DicomProgressiveLoadStage["requestPattern"];
	cornerstoneRequestType?: DicomProgressiveLoadStage["cornerstoneRequestType"];
	cancelGroupId?: string | null;
	requiresStageIds?: string[];
	sliceStart: number | null;
	sliceEnd: number | null;
	sliceOrder?: number[];
	decimationFactor: number;
	offset: number;
	maxResidentSlices: number;
	budgetMs: number;
	blocking: boolean;
	nextAction: string;
}): DicomProgressiveLoadStage {
	return {
		...input,
		cornerstoneRequestType: input.cornerstoneRequestType ?? "none",
		cancelGroupId: input.cancelGroupId ?? null,
		requiresStageIds: input.requiresStageIds ?? [],
		sliceOrder: input.sliceOrder ?? [],
	};
}
export function boundedSliceOrder(
	values: number[],
	fileCount: number,
	maxItems = 96,
) {
	const seen = new Set<number>();
	const result: number[] = [];
	for (const value of values) {
		const slice = clampNumber(Math.round(value), 0, Math.max(0, fileCount - 1));
		if (seen.has(slice)) continue;
		seen.add(slice);
		result.push(slice);
		if (result.length >= maxItems) break;
	}
	return result;
}
export function interleavedSliceOrder(
	fileCount: number,
	decimationFactor: number,
	offset: number,
	maxItems = 128,
) {
	const values: number[] = [];
	for (let index = offset; index < fileCount; index += decimationFactor)
		values.push(index);
	return boundedSliceOrder(values, fileCount, maxItems);
}
export function windowSliceOrder(
	start: number,
	end: number,
	activeSliceIndex: number,
	fileCount: number,
	maxItems = 128,
) {
	const values = [activeSliceIndex];
	for (
		let distance = 1;
		values.length < Math.max(1, end - start + 1);
		distance += 1
	) {
		const left = activeSliceIndex - distance;
		const right = activeSliceIndex + distance;
		if (left >= start) values.push(left);
		if (right <= end) values.push(right);
		if (left < start && right > end) break;
	}
	return boundedSliceOrder(values, fileCount, maxItems);
}
export function chooseDicomAdjacentWindow(input: {
	fileCount: number;
	activeSliceIndex: number;
	firstWindowStart: number;
	firstWindowEnd: number;
	firstBatch: number;
}): { start: number; end: number } | null {
	const {
		fileCount,
		activeSliceIndex,
		firstWindowStart,
		firstWindowEnd,
		firstBatch,
	} = input;
	const maxIndex = Math.max(0, fileCount - 1);
	const candidates: Array<{
		side: "before" | "after";
		start: number;
		end: number;
		length: number;
		edgeDistance: number;
	}> = [];
	const beforeEnd = firstWindowStart - 1;
	if (beforeEnd >= 0) {
		const start = Math.max(0, beforeEnd - firstBatch + 1);
		candidates.push({
			side: "before",
			start,
			end: beforeEnd,
			length: beforeEnd - start + 1,
			edgeDistance: Math.abs(activeSliceIndex - beforeEnd),
		});
	}
	const afterStart = firstWindowEnd + 1;
	if (afterStart <= maxIndex) {
		const end = Math.min(maxIndex, afterStart + firstBatch - 1);
		candidates.push({
			side: "after",
			start: afterStart,
			end,
			length: end - afterStart + 1,
			edgeDistance: Math.abs(afterStart - activeSliceIndex),
		});
	}
	if (!candidates.length) return null;

	const leftEdgeDistance = activeSliceIndex - firstWindowStart;
	const rightEdgeDistance = firstWindowEnd - activeSliceIndex;
	const preferredSide =
		rightEdgeDistance < leftEdgeDistance
			? "after"
			: leftEdgeDistance < rightEdgeDistance
				? "before"
				: "after";
	candidates.sort((left, right) => {
		if (left.edgeDistance !== right.edgeDistance)
			return left.edgeDistance - right.edgeDistance;
		if (left.side === preferredSide && right.side !== preferredSide) return -1;
		if (right.side === preferredSide && left.side !== preferredSide) return 1;
		if (left.length !== right.length) return right.length - left.length;
		return left.side === "after" ? -1 : 1;
	});

	const selected = candidates[0];
	return selected ? { start: selected.start, end: selected.end } : null;
}
export function buildDicomProgressiveLoadStages(input: {
	fileCount: number;
	activeSliceIndex: number;
	firstWindowStart: number;
	firstWindowEnd: number;
	firstBatch: number;
	maxResidentSlices: number;
	workerCount: number;
	canUseWorker: boolean;
	renderPlan: DicomGpuRenderPlan;
}): DicomProgressiveLoadStage[] {
	const {
		fileCount,
		activeSliceIndex,
		firstWindowStart,
		firstWindowEnd,
		firstBatch,
		maxResidentSlices,
		workerCount,
		canUseWorker,
		renderPlan,
	} = input;
	if (renderPlan.textureStrategy === "external_viewer") {
		return [
			progressiveStage({
				id: "external-handoff",
				kind: "external_handoff",
				label: "передача во внешний просмотр",
				priority: "blocking",
				target: "external_viewer",
				requestPattern: "none",
				cornerstoneRequestType: "external",
				cancelGroupId: "external-handoff",
				sliceStart: null,
				sliceEnd: null,
				decimationFactor: 1,
				offset: 0,
				maxResidentSlices: 1,
				budgetMs: 100,
				blocking: true,
				nextAction:
					"Не планировать браузерную загрузку пикселей; передать серию, состояние и разметки во внешний или настольный просмотр.",
			}),
		];
	}
	if (renderPlan.textureStrategy === "metadata_only") {
		return [
			progressiveStage({
				id: "metadata-only",
				kind: "metadata_only",
				label: "только метаданные",
				priority: "blocking",
				target: "main_thread",
				requestPattern: "none",
				cornerstoneRequestType: "none",
				cancelGroupId: "metadata-only",
				sliceStart: null,
				sliceEnd: null,
				decimationFactor: 1,
				offset: 0,
				maxResidentSlices: 1,
				budgetMs: 80,
				blocking: true,
				nextAction:
					"Не запускать декодирование, пока пиксели недоступны; хранить состояние, заметки и индекс серии.",
			}),
		];
	}

	const baseDecimation =
		renderPlan.qualityMode === "diagnostic_full"
			? fileCount > 180
				? 4
				: 2
			: renderPlan.qualityMode === "balanced_mpr"
				? fileCount > 120
					? 4
					: 2
				: Math.max(4, renderPlan.downsampleFactor * 2);
	const interleavedDecimation = clampNumber(baseDecimation, 2, 8);
	const interleavedOffset = activeSliceIndex % interleavedDecimation;
	const activeWindowResident = Math.max(
		1,
		Math.min(maxResidentSlices, firstWindowEnd - firstWindowStart + 1),
	);
	const seedOrder = boundedSliceOrder(
		[activeSliceIndex, 0, fileCount - 1, Math.floor((fileCount - 1) / 2)],
		fileCount,
		4,
	);
	const interleavedOrder = interleavedSliceOrder(
		fileCount,
		interleavedDecimation,
		interleavedOffset,
		128,
	);
	const activeOrder = windowSliceOrder(
		firstWindowStart,
		firstWindowEnd,
		activeSliceIndex,
		fileCount,
		128,
	);
	const stages: DicomProgressiveLoadStage[] = [
		progressiveStage({
			id: "seed-orientation-slices",
			kind: "seed_slices",
			label: "опорные срезы",
			priority: "blocking",
			target: canUseWorker ? "web_worker" : "main_thread",
			requestPattern: "center_first",
			cornerstoneRequestType: "thumbnail",
			cancelGroupId: "ct-seed-slices",
			sliceStart: activeSliceIndex,
			sliceEnd: activeSliceIndex,
			sliceOrder: seedOrder,
			decimationFactor: 1,
			offset: activeSliceIndex,
			maxResidentSlices: Math.min(3, fileCount),
			budgetMs: Math.min(180, Math.max(80, renderPlan.interactionBudgetMs * 8)),
			blocking: true,
			nextAction:
				"Сначала показать активный, первый и последний ориентир, чтобы врач видел положение серии до тяжелой загрузки.",
		}),
		progressiveStage({
			id: "interleaved-low-resolution-volume",
			kind: "interleaved_decimation",
			label: "редкая сетка объема",
			priority: "interactive",
			target: canUseWorker ? "web_worker" : "main_thread",
			requestPattern: "interleaved",
			cornerstoneRequestType: "interaction",
			cancelGroupId: "ct-interleaved-volume",
			requiresStageIds: ["seed-orientation-slices"],
			sliceStart: 0,
			sliceEnd: fileCount - 1,
			sliceOrder: interleavedOrder,
			decimationFactor: interleavedDecimation,
			offset: interleavedOffset,
			maxResidentSlices: Math.min(
				maxResidentSlices,
				Math.max(1, Math.ceil(fileCount / interleavedDecimation)),
			),
			budgetMs:
				renderPlan.qualityMode === "diagnostic_full"
					? 650
					: renderPlan.qualityMode === "balanced_mpr"
						? 520
						: 360,
			blocking: false,
			nextAction:
				"Собирать грубый объем через каждый N-й срез; недостающие срезы уточнять только после интерактивного окна.",
		}),
		progressiveStage({
			id: "active-scroll-window",
			kind: "active_window",
			label: "активное окно прокрутки",
			priority: "interactive",
			target:
				renderPlan.textureStrategy === "single_3d_texture"
					? "gpu"
					: canUseWorker
						? "web_worker"
						: "main_thread",
			requestPattern: "active_window",
			cornerstoneRequestType: "interaction",
			cancelGroupId: "ct-active-window",
			requiresStageIds: ["seed-orientation-slices"],
			sliceStart: firstWindowStart,
			sliceEnd: firstWindowEnd,
			sliceOrder: activeOrder,
			decimationFactor: Math.max(1, renderPlan.downsampleFactor),
			offset: 0,
			maxResidentSlices: activeWindowResident,
			budgetMs: Math.max(
				220,
				Math.ceil((firstBatch * 14) / Math.max(1, workerCount)),
			),
			blocking: false,
			nextAction:
				"Держать в памяти только видимый диапазон и соседний запас; качество повышать после остановки прокрутки.",
		}),
	];

	const adjacentWindow = chooseDicomAdjacentWindow({
		fileCount,
		activeSliceIndex,
		firstWindowStart,
		firstWindowEnd,
		firstBatch,
	});
	if (adjacentWindow) {
		const adjacentStart = adjacentWindow.start;
		const adjacentEnd = adjacentWindow.end;
		const adjacentAnchor = Math.floor((adjacentStart + adjacentEnd) / 2);
		const adjacentOrder = windowSliceOrder(
			adjacentStart,
			adjacentEnd,
			adjacentAnchor,
			fileCount,
			128,
		);
		stages.push(
			progressiveStage({
				id: "adjacent-scroll-window",
				kind: "adjacent_window",
				label: "соседнее окно",
				priority: "prefetch",
				target: canUseWorker ? "web_worker" : "main_thread",
				requestPattern: "adjacent_window",
				cornerstoneRequestType: "prefetch",
				cancelGroupId: "ct-adjacent-window",
				requiresStageIds: ["active-scroll-window"],
				sliceStart: adjacentStart,
				sliceEnd: adjacentEnd,
				sliceOrder: adjacentOrder,
				decimationFactor: Math.max(1, renderPlan.downsampleFactor),
				offset: 0,
				maxResidentSlices: Math.max(
					1,
					Math.min(maxResidentSlices, adjacentEnd - adjacentStart + 1),
				),
				budgetMs: Math.max(
					260,
					Math.ceil((firstBatch * 16) / Math.max(1, workerCount)),
				),
				blocking: false,
				nextAction:
					"Подгружать соседний диапазон только после готовности активного окна; не вытеснять текущие срезы.",
			}),
		);
	}

	stages.push(
		progressiveStage({
			id: "idle-full-resolution-refine",
			kind: "idle_refine",
			label: "уточнение в паузе",
			priority:
				renderPlan.qualityMode === "interactive_low"
					? "deferred"
					: "background",
			target: renderPlan.useOffscreenCanvas
				? "offscreen_canvas"
				: canUseWorker
					? "web_worker"
					: "main_thread",
			requestPattern: "idle_full",
			cornerstoneRequestType: "compute",
			cancelGroupId: "ct-idle-refine",
			requiresStageIds: ["active-scroll-window"],
			sliceStart: firstWindowStart,
			sliceEnd: firstWindowEnd,
			sliceOrder: activeOrder,
			decimationFactor:
				renderPlan.qualityMode === "interactive_low"
					? Math.max(2, renderPlan.downsampleFactor)
					: 1,
			offset: 0,
			maxResidentSlices: activeWindowResident,
			budgetMs:
				renderPlan.qualityMode === "diagnostic_full"
					? 900
					: renderPlan.qualityMode === "balanced_mpr"
						? 700
						: 500,
			blocking: false,
			nextAction:
				"После паузы уточнять только текущее окно; полный объем не должен блокировать карточку приема.",
		}),
	);

	return stages;
}
export function buildDicomRenderCachePlan(input: DicomRenderCachePlanRequest) {
	const { series, renderPlan } = input;
	const warnings = new Set<string>();
	const fileCount = Math.max(1, series.fileCount);
	const centerSliceIndex = Math.floor((fileCount - 1) / 2);
	const requestedSlice = input.viewerState?.sliceIndex ?? centerSliceIndex;
	const activeSliceIndex = clampNumber(requestedSlice, 0, fileCount - 1);
	const firstBatch = clampNumber(
		Math.min(renderPlan.targetSliceBatch, renderPlan.progressiveSliceWindowCap),
		1,
		Math.max(1, series.mprReadiness.resourcePolicy.maxClientSlices),
	);
	const firstWindowSize = Math.min(firstBatch, fileCount);
	const halfWindow = Math.floor(firstWindowSize / 2);
	const firstWindowStart = clampNumber(
		activeSliceIndex - halfWindow,
		0,
		Math.max(0, fileCount - firstWindowSize),
	);
	const firstWindowEnd = clampNumber(
		firstWindowStart + firstWindowSize - 1,
		firstWindowStart,
		Math.max(0, fileCount - 1),
	);
	const totalBatches = Math.max(1, Math.ceil(fileCount / firstBatch));
	const downsampleDivisor = Math.max(
		1,
		renderPlan.downsampleFactor * renderPlan.downsampleFactor,
	);
	const perSliceMb = Math.max(
		1,
		Math.ceil(estimateGpuMemoryMb(series) / fileCount / downsampleDivisor),
	);
	const firstWindowMemoryMb = taskMemoryForRange(
		firstWindowStart,
		firstWindowEnd,
		perSliceMb,
	);
	const canUseWorker =
		renderPlan.useWebWorker && renderPlan.textureStrategy !== "external_viewer";
	const workerCount = !canUseWorker
		? 0
		: renderPlan.qualityMode === "diagnostic_full"
			? 3
			: renderPlan.qualityMode === "balanced_mpr"
				? 2
				: 1;
	const decodeConcurrency =
		workerCount > 0
			? Math.min(
					workerCount,
					renderPlan.qualityMode === "diagnostic_full" ? 3 : 2,
				)
			: 1;
	const uploadConcurrency =
		renderPlan.textureStrategy === "single_3d_texture"
			? 1
			: renderPlan.textureStrategy === "bricked_3d_textures"
				? 2
				: renderPlan.textureStrategy === "stack_2d_textures"
					? 1
					: 1;
	const residentSliceCap = Math.max(
		1,
		Math.min(fileCount, renderPlan.progressiveSliceWindowCap),
	);
	const maxResidentSlices =
		renderPlan.textureStrategy === "single_3d_texture"
			? Math.min(residentSliceCap, firstBatch)
			: renderPlan.textureStrategy === "bricked_3d_textures"
				? Math.min(residentSliceCap, Math.max(firstBatch * 3, 96))
				: renderPlan.textureStrategy === "stack_2d_textures"
					? Math.min(residentSliceCap, Math.max(firstBatch * 2, 32))
					: 1;
	const cpuMemoryBudgetMb = Math.max(
		32,
		Math.ceil(firstWindowMemoryMb * (workerCount > 1 ? 2.2 : 1.4)),
	);
	const gpuMemoryBudgetMb =
		renderPlan.textureStrategy === "external_viewer"
			? 0
			: Math.max(
					16,
					Math.min(
						renderPlan.estimatedGpuMemoryMb,
						Math.ceil(maxResidentSlices * perSliceMb * 1.4),
					),
				);
	const shouldPersistToIndexedDb =
		series.mprReadiness.resourcePolicy.cacheMode === "bounded_disk" ||
		series.mprReadiness.resourcePolicy.cacheMode === "dicomweb_stream";
	if (
		!canUseWorker &&
		renderPlan.textureStrategy !== "external_viewer" &&
		renderPlan.textureStrategy !== "metadata_only"
	) {
		warnings.add(
			"Фоновая подготовка КТ-срезов недоступна: план снижает параллельность и оставляет короткие порции работы.",
		);
	}
	if (renderPlan.progressiveSliceWindowCap < renderPlan.targetSliceBatch) {
		warnings.add(
			`Окно прогрессивной загрузки ограничено политикой памяти: ${renderPlan.progressiveSliceWindowCap} срезов за фазу.`,
		);
	}
	if (renderPlan.diagnosticPixelPolicy === "browser_preview_not_diagnostic") {
		warnings.add(
			"Браузерный КТ-план не является диагностическим пиксельным рендером; CAD/диагностика должны идти через внешний или настольный модуль.",
		);
	}
	const firstPaintBudgetMs =
		renderPlan.qualityMode === "diagnostic_full"
			? 1400
			: renderPlan.qualityMode === "balanced_mpr"
				? 1000
				: renderPlan.qualityMode === "interactive_low"
					? 650
					: 300;
	const interactionPhases = buildDicomRenderInteractionPhases({
		fileCount,
		renderPlan,
		firstBatch,
		maxResidentSlices,
		workerCount,
	});
	const progressiveStages = buildDicomProgressiveLoadStages({
		fileCount,
		activeSliceIndex,
		firstWindowStart,
		firstWindowEnd,
		firstBatch,
		maxResidentSlices,
		workerCount,
		canUseWorker,
		renderPlan,
	});
	const tasks: DicomRenderCacheTask[] = [];

	if (renderPlan.textureStrategy === "external_viewer") {
		tasks.push(
			renderTask({
				id: "external-handoff",
				kind: "external_handoff",
				target: "external_viewer",
				priority: "blocking",
				sliceStart: null,
				sliceEnd: null,
				projection: null,
				estimatedMemoryMb: 0,
				budgetMs: 100,
				blocking: true,
				label: "Передача во внешний просмотр",
				nextAction:
					"Откройте внешний или настольный просмотрщик; CRM хранит только метаданные, состояние и аннотации.",
			}),
		);
		warnings.add(
			"Быстрая загрузка браузера отключена, потому что план выбрал передачу во внешний просмотр.",
		);
	} else if (renderPlan.textureStrategy === "metadata_only") {
		tasks.push(
			renderTask({
				id: "metadata-only-index",
				kind: "metadata_index",
				target: "main_thread",
				priority: "blocking",
				sliceStart: null,
				sliceEnd: null,
				projection: null,
				estimatedMemoryMb: 1,
				budgetMs: 80,
				blocking: true,
				label: "Сохранить метаданные серии",
				nextAction:
					"Не планируйте декодирование или загрузку текстур, пока нет сети архива, локальной папки или настольного модуля.",
			}),
		);
		warnings.add(
			"Пиксели серии недоступны для текущего режима; CRM хранит только метаданные, заметки и восстановление состояния.",
		);
	} else {
		tasks.push(
			renderTask({
				id: "metadata-index",
				kind: "metadata_index",
				target: "main_thread",
				priority: "blocking",
				sliceStart: null,
				sliceEnd: null,
				projection: null,
				estimatedMemoryMb: 1,
				budgetMs: 80,
				blocking: true,
				label: "Индексировать метаданные",
				nextAction:
					"Отсортируйте срезы по номеру и положению в серии перед открытием первого окна.",
			}),
			renderTask({
				id: "thumbnail-first",
				kind: "thumbnail_first",
				target: canUseWorker ? "web_worker" : "main_thread",
				priority: "blocking",
				sliceStart: activeSliceIndex,
				sliceEnd: activeSliceIndex,
				projection: input.viewerState?.projection ?? "axial",
				estimatedMemoryMb: perSliceMb,
				budgetMs: Math.min(180, firstPaintBudgetMs),
				blocking: true,
				label: "Первый видимый срез",
				nextAction:
					"Покажите активный/центральный срез до готовности полного плана КТ-срезов.",
			}),
			renderTask({
				id: "decode-first-window",
				kind: "decode_slice_range",
				target: canUseWorker ? "web_worker" : "main_thread",
				priority: "interactive",
				sliceStart: firstWindowStart,
				sliceEnd: firstWindowEnd,
				projection: input.viewerState?.projection ?? "axial",
				estimatedMemoryMb: firstWindowMemoryMb,
				budgetMs: Math.max(
					240,
					Math.ceil((firstBatch * 18) / decodeConcurrency),
				),
				blocking: false,
				label: "Декодировать первое окно прокрутки",
				nextAction:
					"Декодируйте только видимое окно срезов, затем подгружайте соседние диапазоны.",
			}),
			renderTask({
				id: "upload-first-window",
				kind:
					renderPlan.textureStrategy === "single_3d_texture"
						? "build_volume_texture"
						: "upload_texture_range",
				target: "gpu",
				priority: "interactive",
				sliceStart: firstWindowStart,
				sliceEnd: firstWindowEnd,
				projection: input.viewerState?.projection ?? "axial",
				estimatedMemoryMb: firstWindowMemoryMb,
				budgetMs: Math.max(
					renderPlan.interactionBudgetMs,
					Math.ceil((firstBatch * 10) / uploadConcurrency),
				),
				blocking: false,
				label: "Подготовить первое окно объема",
				nextAction:
					"Сохраняйте отзывчивость просмотра, пока качество повышается.",
			}),
		);

		if (renderPlan.textureStrategy === "bricked_3d_textures") {
			const adjacentWindow = chooseDicomAdjacentWindow({
				fileCount,
				activeSliceIndex,
				firstWindowStart,
				firstWindowEnd,
				firstBatch,
			});
			if (adjacentWindow) {
				const nextStart = adjacentWindow.start;
				const nextEnd = adjacentWindow.end;
				tasks.push(
					renderTask({
						id: "build-adjacent-brick",
						kind: "build_texture_brick",
						target: "gpu",
						priority: "prefetch",
						sliceStart: nextStart,
						sliceEnd: nextEnd,
						projection: null,
						estimatedMemoryMb: taskMemoryForRange(
							nextStart,
							nextEnd,
							perSliceMb,
						),
						budgetMs: Math.max(
							320,
							Math.ceil((firstBatch * 14) / uploadConcurrency),
						),
						blocking: false,
						label: "Соседний фрагмент объема",
						nextAction:
							"Подгружайте следующий фрагмент только после того, как первое окно стало интерактивным.",
					}),
				);
			}
		}

		if (series.mprReadiness.canOpenMpr) {
			tasks.push(
				renderTask({
					id: "derive-linked-mpr",
					kind: "derive_mpr_plane",
					target: renderPlan.useOffscreenCanvas
						? "offscreen_canvas"
						: canUseWorker
							? "web_worker"
							: "main_thread",
					priority: "prefetch",
					sliceStart: firstWindowStart,
					sliceEnd: firstWindowEnd,
					projection: input.viewerState?.projection ?? "axial",
					estimatedMemoryMb: Math.max(4, Math.ceil(firstWindowMemoryMb * 0.35)),
					budgetMs: Math.max(260, renderPlan.interactionBudgetMs * 12),
					blocking: false,
					label: "Связанные плоскости КТ-срезов",
					nextAction:
						"Постройте аксиальный, корональный и сагиттальный предпросмотры из первого подготовленного окна.",
				}),
			);
		}

		if (series.mprReadiness.canBuildPanoramic) {
			tasks.push(
				renderTask({
					id: "derive-panoramic-curve",
					kind: "derive_panoramic_curve",
					target: canUseWorker ? "web_worker" : "main_thread",
					priority: "deferred",
					sliceStart: null,
					sliceEnd: null,
					projection: "panoramic_reconstruction",
					estimatedMemoryMb: Math.max(8, Math.ceil(firstWindowMemoryMb * 0.4)),
					budgetMs: 900,
					blocking: false,
					label: "Черновик панорамной реконструкции",
					nextAction:
						"Создавать только после выбора ручной кривой или пресета дуги.",
				}),
			);
		}

		if (shouldPersistToIndexedDb) {
			tasks.push(
				renderTask({
					id: "persist-cache-index",
					kind: "persist_cache_index",
					target: "indexeddb",
					priority: "background",
					sliceStart: firstWindowStart,
					sliceEnd: firstWindowEnd,
					projection: null,
					estimatedMemoryMb: 1,
					budgetMs: 120,
					blocking: false,
					label: "Сохранить ограниченный индекс кеша",
					nextAction:
						"Сохраняйте только список серии, контрольные суммы и ограниченные ссылки кеша, а не тяжелые данные снимков.",
				}),
			);
		}
	}

	if (renderPlan.qualityMode === "interactive_low")
		warnings.add(
			"Режим слабой станции: держите первый показ в пониженном разрешении и повышайте качество только по явному запросу.",
		);
	if (totalBatches > 8)
		warnings.add(
			"Большой стек: нужны инкрементальные пакеты и видимый прогресс; экран приема блокировать нельзя.",
		);

	const nextAction =
		renderPlan.textureStrategy === "external_viewer"
			? "Используйте внешний просмотр; CRM хранит восстановление состояния и аннотаций."
			: renderPlan.qualityMode === "diagnostic_full"
				? "Начните с активного среза, затем подготовьте полный объем, сохраняя отзывчивые связанные КТ-срезы."
				: renderPlan.qualityMode === "balanced_mpr"
					? "Декодируйте первое окно срезов, затем подгружайте соседние диапазоны по мере прокрутки врачом."
					: "Держите первый показ малым: один срез, одно видимое окно, пониженный кеш, явное повышение качества.";

	return dicomRenderCachePlanResponseSchema.parse({
		version: "dental-crm-dicom-render-cache-v1",
		generatedAt: new Date().toISOString(),
		textureStrategy: renderPlan.textureStrategy,
		qualityMode: renderPlan.qualityMode,
		memoryBudgetClass: renderPlan.memoryBudgetClass,
		hardwareQualityWeight: renderPlan.hardwareQualityWeight,
		progressiveSliceWindowCap: renderPlan.progressiveSliceWindowCap,
		diagnosticPixelPolicy: renderPlan.diagnosticPixelPolicy,
		activeSliceIndex,
		centerSliceIndex,
		firstWindowStart,
		firstWindowEnd,
		visibleSliceBudget: firstBatch,
		maxResidentSlices,
		totalBatches,
		decodeConcurrency,
		uploadConcurrency,
		workerCount,
		gpuMemoryBudgetMb,
		cpuMemoryBudgetMb,
		shouldPersistToIndexedDb,
		firstPaintBudgetMs,
		interactionBudgetMs: renderPlan.interactionBudgetMs,
		interactionPhases,
		progressiveStages,
		tasks,
		warnings: Array.from(warnings),
		nextAction,
	});
}
export function buildBaseReadinessChecks(
	client: DicomWorkstationReadinessRequest["client"],
	runtimeProfile: DicomClientRuntimeProfile,
	resourcePolicy: DicomMprReadiness["resourcePolicy"],
	detectedTier: DicomMprReadiness["resourcePolicy"]["requiredTier"],
	tierOk: boolean,
	freeStorageMb: number | null,
	series: DicomWorkstationReadinessRequest["series"],
	connectorReady: boolean,
	connector: DicomWorkstationReadinessRequest["connector"] | undefined,
): DicomWorkstationReadinessCheck[] {
	const checks: DicomWorkstationReadinessCheck[] = [];

	checks.push(
		readinessCheck({
			id: "runtime",
			label: "Режим запуска",
			status:
				runtimeProfile.networkMode === "offline_remote_blocked"
					? "fail"
					: runtimeProfile.mobileConstrained
						? "warn"
						: "pass",
			detail: `${runtimeProfile.label}; ${describeDicomExecutionLaneForOperator(runtimeProfile.executionLane)}.`,
			nextAction: runtimeProfile.nextAction,
		}),
	);
	checks.push(
		readinessCheck({
			id: "tier",
			label: "Класс рабочей станции",
			status: tierOk ? "pass" : "warn",
			detail: `Обнаружено ${detectedTier}; для выбранной стратегии загрузки требуется ${resourcePolicy.requiredTier}.`,
			nextAction: tierOk
				? "Браузерный просмотрщик может следовать выбранной политике ресурсов."
				: "Используйте предпросмотр в пониженном разрешении или внешний просмотр для этой станции.",
		}),
	);

	checks.push(
		readinessCheck({
			id: "webgl2",
			label: "Графика браузера",
			status: client.webgl2Supported ? "pass" : "fail",
			detail: client.webgl2Supported
				? "Браузерная графика доступна для просмотра стека/объема."
				: "Браузерная графика недоступна.",
			nextAction: client.webgl2Supported
				? "Оставьте рендер просмотра на отдельном рабочем столе."
				: "Используйте внешний КТ-модуль или другую рабочую станцию.",
		}),
	);

	checks.push(
		readinessCheck({
			id: "indexeddb",
			label: "Локальное хранилище",
			status: client.indexedDbSupported ? "pass" : "fail",
			detail: client.indexedDbSupported
				? "Локальное хранилище кеша/восстановления доступно."
				: "Локальное хранилище браузера недоступно.",
			nextAction: client.indexedDbSupported
				? "Сохраняйте список серии и состояние просмотрщика локально до открытия тяжелых данных."
				: "Не полагайтесь на кеш браузера; используйте передачу во внешний просмотр.",
		}),
	);

	const storageNeededMb = Math.max(
		512,
		Math.min(4096, resourcePolicy.estimatedMemoryMb * 2),
	);
	const storageOk = freeStorageMb === null || freeStorageMb >= storageNeededMb;
	checks.push(
		readinessCheck({
			id: "storage",
			label: "Хранилище браузера",
			status: storageOk ? "pass" : "warn",
			detail:
				freeStorageMb === null
					? "Браузер не раскрыл квоту хранилища."
					: `Оценка свободного места: ${freeStorageMb} МБ; для этого стека рекомендовано ${storageNeededMb} МБ.`,
			nextAction: storageOk
				? "Используйте ограниченный кеш согласно политике ресурсов серии."
				: "Оставьте режим миниатюр первым и избегайте полного кеша объема в браузере.",
		}),
	);

	checks.push(
		readinessCheck({
			id: "source",
			label: "Доступ к источнику",
			status: connectorReady ? "pass" : connector ? "warn" : "fail",
			detail:
				series.sourceKind === "dicomweb" || series.sourceKind === "pacs"
					? `Архив снимков: ${connector?.status ?? "не проверен"}.`
					: `Путь локального списка снимков: ${series.firstFilePath ? "доступен" : "отсутствует"}.`,
			nextAction: connectorReady
				? "Продолжайте через подготовку плана открытия."
				: "Проверьте архив снимков перед открытием диагностического просмотрщика.",
		}),
	);

	return checks;
}
