import {
	type DicomMprReadiness,
	type DicomSeriesPreviewGroup,
	type DicomWorkstationReadinessRequest,
	type DicomWorkstationReadinessCheck
} from "@dental/shared";
import {
	isDicomArchiveVirtualEntryPath
} from "./dicomParsing.js";
import {
	clampNumber
} from "./renderProgressiveStages.js";
import type {
	DicomClientRuntimeProfile,
	DicomGpuRenderPlan,
} from "@dental/shared";

export const mprTierRank: Record<
	DicomMprReadiness["resourcePolicy"]["requiredTier"],
	number
> = {
	low_end: 0,
	standard: 1,
	workstation: 2,
	diagnostic_workstation: 3,
};

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

export function detectWorkstationTier(
	input: DicomWorkstationReadinessRequest["client"],
): DicomMprReadiness["resourcePolicy"]["requiredTier"] {
	if (input.hardwareTier === "potato") {
		return "low_end";
	}
	const memory = input.deviceMemoryGb ?? 0;
	const cores = input.hardwareConcurrency ?? 0;
	const freeStorageMb =
		input.storageQuotaMb !== null && input.storageUsageMb !== null
			? Math.max(0, input.storageQuotaMb - input.storageUsageMb)
			: null;

	if (
		input.webgl2Supported &&
		input.indexedDbSupported &&
		(input.hardwareTier === "ultra" ||
			(memory >= 16 &&
				cores >= 8 &&
				(freeStorageMb === null || freeStorageMb >= 4096)))
	) {
		return "diagnostic_workstation";
	}
	if (
		input.webgl2Supported &&
		input.indexedDbSupported &&
		(input.hardwareTier === "balanced" ||
			(memory >= 8 &&
				cores >= 4 &&
				(freeStorageMb === null || freeStorageMb >= 2048)))
	) {
		return "workstation";
	}
	if (
		input.webgl2Supported &&
		input.indexedDbSupported &&
		memory >= 4 &&
		cores >= 4
	) {
		return "standard";
	}
	return "low_end";
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
	if (client.gpuType === "software") return "none";
	const renderer =
		`${client.webglVendor ?? ""} ${client.webglRenderer ?? ""}`.toLowerCase();
	const memory = client.deviceMemoryGb ?? 0;
	const cores = client.hardwareConcurrency ?? 0;
	const max3d = client.max3dTextureSize ?? 0;
	const discreteHint =
		client.gpuType === "discrete" ||
		client.gpuType === "apple_silicon" ||
		/nvidia|geforce|quadro|rtx|gtx|radeon|rx |arc|apple m[2-9]|apple gpu/i.test(
			renderer,
		);
	if (
		discreteHint &&
		(client.hardwareTier === "ultra" ||
			(memory >= 16 && cores >= 8 && max3d >= 2048))
	)
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
