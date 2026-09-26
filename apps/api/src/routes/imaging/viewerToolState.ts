import {
	type DicomViewerViewportState,
	type DicomViewerToolConfig,
	dicomViewerToolStateBundleResponseSchema
} from "@dental/shared";
import {
	safeCoordinate,
	targetToolForCrmTool,
	stableViewerIdPart
} from "./viewerLaunch.js";
import type {
	DicomViewerPlanningTask,
	DicomViewerToolStateAnnotation,
	DicomViewerToolStateBundleRequest,
} from "@dental/shared";
import {
	targetToolForAnnotation,
	viewportForAnnotation,
	cornerstoneVolumeIdForSeries,
	buildToolConfigs,
	buildDicomViewerViewports,
} from "./viewerLaunch.js";

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
