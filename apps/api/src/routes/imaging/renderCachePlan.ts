import {
	type DicomGpuRenderPlan,
	dicomRenderCachePlanResponseSchema
} from "@dental/shared";
import {
	estimateGpuMemoryMb
} from "./workstationHardware.js";
import type {
	DicomRenderCachePlanRequest,
	DicomRenderCacheTask,
	DicomRenderInteractionPhase,
} from "@dental/shared";
import {
	buildDicomClientRuntimeProfile,
	buildGpuRenderPlan,
} from "./workstationHardware.js";
import {
	buildDicomProgressiveLoadStages,
	chooseDicomAdjacentWindow,
	clampNumber,
} from "./renderProgressiveStages.js";

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
