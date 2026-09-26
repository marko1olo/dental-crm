import path from "node:path";
import {
	DicomSeriesPreviewRow,
	ImagingSourceKind,
	ImagingStudyKind
} from "@dental/shared";
import {
	isDicomArchivePath,
	isDicomArchiveVirtualEntryPath
} from "./dicomParsing.js";
import type { DicomMprReadiness, DicomSeriesViewer } from "@dental/shared";
import type { DicomHeaderMetadata } from "./imagingConstants.js";

export function dicomFallbackSeriesKey(
	filePath: string | null,
	row: Pick<DicomSeriesPreviewRow, "patientId" | "patientName" | "kind">,
) {
	const parsed = filePath ? path.parse(filePath) : null;
	const parent = parsed?.dir ? path.basename(parsed.dir) : "no-folder";
	const studyParent = parsed?.dir
		? path.basename(path.dirname(parsed.dir))
		: "no-study-folder";
	return [
		row.patientId ?? row.patientName ?? "unknown-patient",
		row.kind ?? "unknown-kind",
		studyParent,
		parent,
	].join("|");
}

export function recommendedViewerFor(input: {
	kind: ImagingStudyKind | null;
	modality: string | null;
	fileCount: number;
}): DicomSeriesViewer {
	if (!input.kind) return "none";
	if (
		input.kind === "cbct" ||
		input.modality === "CT" ||
		input.modality === "CBCT" ||
		input.modality === "MR"
	)
		return "cbct_mpr";
	if (input.fileCount > 1) return "two_d_stack";
	return "two_d_stack";
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
