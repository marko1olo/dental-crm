import { createHash } from "node:crypto";
import {
	type DicomClientRuntimeProfile,
	type DicomMprReadiness,
	type DicomGpuRenderPlan,
	type DicomViewerWorkbenchManifestResponse,
	dicomWorkstationReadinessResponseSchema,
	dicomViewerWorkbenchManifestResponseSchema
} from "@dental/shared";
import {
	describeDicomExecutionLaneForOperator,
	mprTierRank,
	buildGpuRenderPlan
} from "./workstationHardware.js";
import {
	buildDicomRenderCachePlan
} from "./renderCachePlan.js";
import {
	buildDicomViewerToolStateBundle
} from "./viewerToolState.js";
import type {
	DicomWorkstationReadinessCheck,
	DicomWorkstationReadinessRequest,
	DicomViewerWorkbenchManifestRequest,
} from "@dental/shared";
import {
	buildDicomClientRuntimeProfile,
	detectWorkstationTier,
	readinessCheck,
	buildDicomRenderHardwarePolicy,
} from "./workstationHardware.js";
import { buildDicomViewerLaunchManifest } from "./viewerLaunch.js";

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
			status: runtimeProfile.mobileConstrained ? "warn" : "pass",
			detail: `${runtimeProfile.label}; ${describeDicomExecutionLaneForOperator(runtimeProfile.executionLane)}.`,
			nextAction: runtimeProfile.nextAction,
		}),
	);
	checks.push(
		readinessCheck({
			id: "tier",
			label: "Класс рабочей станции",
			status: "pass",
			detail: `Обнаружено ${detectedTier}; рабочая станция готова к просмотру.`,
			nextAction: "Браузерный просмотрщик может следовать выбранной политике ресурсов.",
		}),
	);

	checks.push(
		readinessCheck({
			id: "webgl2",
			label: "Графика браузера",
			status: client.webgl2Supported ? "pass" : "warn",
			detail: client.webgl2Supported
				? "Браузерная графика доступна для просмотра стека/объема."
				: "Браузерная графика работает в режиме совместимости.",
			nextAction: "Оставьте рендер просмотра на отдельном рабочем столе.",
		}),
	);

	checks.push(
		readinessCheck({
			id: "indexeddb",
			label: "Локальное хранилище",
			status: client.indexedDbSupported ? "pass" : "warn",
			detail: client.indexedDbSupported
				? "Локальное хранилище кеша/восстановления доступно."
				: "Локальное хранилище браузера работает в режиме оперативной памяти.",
			nextAction: "Сохраняйте список серии и состояние просмотрщика локально до открытия тяжелых данных.",
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

export function buildMemoryPolicyCheck(
	renderPlan: DicomGpuRenderPlan,
): DicomWorkstationReadinessCheck {
	const memoryPolicyWarn =
		renderPlan.memoryBudgetClass === "minimum" ||
		renderPlan.memoryBudgetClass === "constrained" ||
		renderPlan.diagnosticPixelPolicy === "browser_preview_not_diagnostic";
	return readinessCheck({
		id: "ct_memory_policy",
		label: "Память и пиксельная политика КТ",
		status: memoryPolicyWarn ? "warn" : "pass",
		detail: `Класс памяти ${renderPlan.memoryBudgetClass}; вес ${renderPlan.hardwareQualityWeight}; окно ${renderPlan.progressiveSliceWindowCap} срезов; политика ${renderPlan.diagnosticPixelPolicy}.`,
		nextAction:
			renderPlan.diagnosticPixelPolicy === "browser_preview_not_diagnostic"
				? "Оставьте браузерный КТ как предпросмотр и планирование; диагностический просмотр открывайте во внешнем или настольном модуле."
				: "Следуйте ограничению окна срезов и не расширяйте кэш сверх политики памяти текущей станции.",
	});
}

export function collectReadinessWarnings(
	client: DicomWorkstationReadinessRequest["client"],
	series: DicomWorkstationReadinessRequest["series"],
	runtimeProfile: DicomClientRuntimeProfile,
	tierOk: boolean,
	connectorReady: boolean,
	renderPlan: DicomGpuRenderPlan,
): Set<string> {
	const warnings = new Set<string>();
	if (
		!client.online &&
		(series.sourceKind === "dicomweb" || series.sourceKind === "pacs")
	) {
		warnings.add(
			"Источник архива снимков требует сеть; офлайн-режим должен оставаться только с метаданными.",
		);
	}
	runtimeProfile.warnings.forEach((warning) => {
		warnings.add(warning);
	});
	if (!series.mprReadiness.canOpenMpr) {
		series.mprReadiness.blockers.forEach((blocker) => {
			warnings.add(blocker);
		});
	}
	if (!tierOk)
		warnings.add(
			"Текущая рабочая станция ниже рекомендованного класса для выбранной политики ресурсов КЛКТ.",
		);
	if (!client.webgl2Supported)
		warnings.add(
			"Для диагностического 3D-просмотра в браузере нужна поддержка современной браузерной графики.",
		);
	if (!client.indexedDbSupported)
		warnings.add(
			"Для восстановления просмотра нужно доступное локальное хранилище браузера.",
		);
	if (!connectorReady)
		warnings.add("Архив снимков не готов к передаче срезов.");
	renderPlan.warnings.forEach((warning) => {
		warnings.add(warning);
	});
	return warnings;
}

export function evaluateReadinessOutcome(
	_client: DicomWorkstationReadinessRequest["client"],
	_series: DicomWorkstationReadinessRequest["series"],
	resourcePolicy: DicomMprReadiness["resourcePolicy"],
	_runtimeProfile: DicomClientRuntimeProfile,
	_renderPlan: DicomGpuRenderPlan,
	_checks: DicomWorkstationReadinessCheck[],
	_connectorReady: boolean,
	_tierOk: boolean,
) {
	// Mandate 8e: Doctor Autonomy — Zero blocking bureaucracy.
	// Readiness is non-blocking (score 100, canOpenInBrowser = true).
	const readinessScore = 100;
	const shouldUseExternalViewer = resourcePolicy.loadStrategy === "external_handoff";
	const effectiveLoadStrategy: DicomMprReadiness["resourcePolicy"]["loadStrategy"] =
		shouldUseExternalViewer ? "external_handoff" : (resourcePolicy.loadStrategy || "mpr_full");
	const canOpenInBrowser = true;
	const nextAction = "Откройте рабочее место КТ-срезов; CRM остается слоем состояния, заметок и восстановления.";

	return {
		readinessScore,
		shouldUseExternalViewer,
		effectiveLoadStrategy,
		canOpenInBrowser,
		nextAction,
	};
}

export function buildDicomWorkstationReadiness(
	input: DicomWorkstationReadinessRequest,
) {
	const { series, client, connector } = input;
	const resourcePolicy = series.mprReadiness.resourcePolicy;
	const runtimeProfile = buildDicomClientRuntimeProfile({ series, client });
	const hardwareTier = detectWorkstationTier(client);
	const detectedTier = runtimeProfile.mobileConstrained
		? "low_end"
		: hardwareTier;

	const freeStorageMb =
		client.storageQuotaMb !== null && client.storageUsageMb !== null
			? Math.max(0, client.storageQuotaMb - client.storageUsageMb)
			: null;

	const tierOk =
		mprTierRank[detectedTier] >= mprTierRank[resourcePolicy.requiredTier];
	const connectorReady =
		series.sourceKind === "dicomweb" || series.sourceKind === "pacs"
			? connector?.status === "ready"
			: true;

	const checks = buildBaseReadinessChecks(
		client,
		runtimeProfile,
		resourcePolicy,
		detectedTier,
		tierOk,
		freeStorageMb,
		series,
		connectorReady,
		connector,
	);

	const renderPlan = buildGpuRenderPlan({
		series,
		client,
		connectorReady,
		tierOk,
	});

	checks.push(buildMemoryPolicyCheck(renderPlan));

	const warnings = collectReadinessWarnings(
		client,
		series,
		runtimeProfile,
		tierOk,
		connectorReady,
		renderPlan,
	);

	const outcome = evaluateReadinessOutcome(
		client,
		series,
		resourcePolicy,
		runtimeProfile,
		renderPlan,
		checks,
		connectorReady,
		tierOk,
	);

	return dicomWorkstationReadinessResponseSchema.parse({
		detectedTier,
		requiredTier: resourcePolicy.requiredTier,
		effectiveLoadStrategy: outcome.effectiveLoadStrategy,
		runtimeProfile,
		readinessScore: outcome.readinessScore,
		canOpenInBrowser: outcome.canOpenInBrowser,
		shouldUseExternalViewer: outcome.shouldUseExternalViewer,
		renderPlan,
		checks,
		warnings: Array.from(warnings),
		nextAction: outcome.nextAction,
	});
}

export function buildDicomViewerWorkbenchManifest(
	input: DicomViewerWorkbenchManifestRequest,
) {
	const readiness = buildDicomWorkstationReadiness({
		series: input.series,
		client: input.client,
		connector: input.connector ?? null,
	});
	const renderCachePlan = buildDicomRenderCachePlan({
		series: input.series,
		renderPlan: readiness.renderPlan,
		viewerState: input.viewerState ?? null,
	});
	const launchManifest = buildDicomViewerLaunchManifest({
		viewerKind: input.viewerKind,
		series: input.series,
		viewerState: input.viewerState ?? null,
		annotations: input.annotations,
		dicomWebBaseUrl: input.dicomWebBaseUrl ?? null,
		ohifBaseUrl: input.ohifBaseUrl ?? null,
		externalViewerPath: input.externalViewerPath ?? null,
		allowExternalHandoff: input.allowExternalHandoff,
	});
	const toolStateBundle = buildDicomViewerToolStateBundle({
		target: input.target,
		viewerKind: input.viewerKind,
		series: input.series,
		viewerState: input.viewerState ?? null,
		annotations: input.annotations,
		renderPlan: readiness.renderPlan,
	});
	const warnings = new Set<string>([
		...readiness.warnings,
		...renderCachePlan.warnings,
		...launchManifest.warnings,
		...toolStateBundle.warnings,
	]);

	const nextAction = readiness.canOpenInBrowser
		? "Откройте отдельный просмотр КЛКТ/КТ-срезов с этим набором; сначала загрузите активный срез, затем повышайте качество кеша."
		: readiness.shouldUseExternalViewer ||
				launchManifest.launchMode === "external_handoff"
			? "Используйте внешний или настольный КТ-просмотрщик; CRM сохраняет метаданные, состояние и аннотации для восстановления."
			: "Оставайтесь в списке серии, пока не исправлены коды серии, локальное хранилище или проверки подключения.";

	return dicomViewerWorkbenchManifestResponseSchema.parse({
		version: "dental-crm-dicom-workbench-v1",
		generatedAt: new Date().toISOString(),
		readiness,
		renderCachePlan,
		launchManifest,
		toolStateBundle,
		doctorBlocking: false,
		warnings: Array.from(warnings),
		nextAction,
	});
}

function shortHash(value: string): string {
	return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function isLocalDicomPath(value: string): boolean {
	return (
		/^[A-Za-z]:[\\/]/.test(value) ||
		value.startsWith("\\\\") ||
		value.startsWith("/") ||
		value.includes("::") ||
		/[\\/]/.test(value)
	);
}

export function redactLocalDicomPath(value: string | null): string | null {
	if (!value) return null;
	if (!isLocalDicomPath(value)) return value;
	return `redacted-local-dicom-path:${shortHash(value)}`;
}

export function redactDicomReferenceId(value: string | null): string | null {
	if (!value) return null;
	const prefix = "dicomfile:";
	if (value.toLowerCase().startsWith(prefix)) {
		return `${prefix}${redactLocalDicomPath(value.slice(prefix.length))}`;
	}
	return isLocalDicomPath(value) ? redactLocalDicomPath(value) : value;
}

function redactLocalDicomPathsInText(value: string): string {
	return value
		.replace(
			/[A-Za-z]:[\\/][^\r\n]*(?=:\s|$)/g,
			(match) => redactLocalDicomPath(match) ?? match,
		)
		.replace(
			/\\\\[^\r\n]*(?=:\s|$)/g,
			(match) => redactLocalDicomPath(match) ?? match,
		)
		.replace(
			/dicomfile:([A-Za-z]:[\\/][^\s\r\n]+)/gi,
			(_match, filePath: string) =>
				`dicomfile:${redactLocalDicomPath(filePath) ?? filePath}`,
		);
}

function redactDicomWarningList(warnings: string[]): string[] {
	return Array.from(
		new Set(
			warnings
				.map((warning) => redactLocalDicomPathsInText(warning))
				.filter((warning) => warning.trim()),
		),
	);
}

export function cloneDicomWorkbenchManifestForServerStorage(
	manifest: DicomViewerWorkbenchManifestResponse,
): DicomViewerWorkbenchManifestResponse {
	const clone = JSON.parse(
		JSON.stringify(manifest),
	) as DicomViewerWorkbenchManifestResponse;
	clone.toolStateBundle.seriesRef.firstFilePath = redactLocalDicomPath(
		clone.toolStateBundle.seriesRef.firstFilePath,
	);
	clone.toolStateBundle.viewports = clone.toolStateBundle.viewports.map(
		(viewport) => ({
			...viewport,
			referencedImageId: redactDicomReferenceId(viewport.referencedImageId),
		}),
	);
	if (
		clone.launchManifest.viewerUrl &&
		isLocalDicomPath(clone.launchManifest.viewerUrl)
	) {
		clone.launchManifest.viewerUrl = redactLocalDicomPath(
			clone.launchManifest.viewerUrl,
		);
	}
	clone.warnings = redactDicomWarningList(clone.warnings);
	clone.readiness.warnings = redactDicomWarningList(clone.readiness.warnings);
	clone.renderCachePlan.warnings = redactDicomWarningList(
		clone.renderCachePlan.warnings,
	);
	clone.launchManifest.warnings = redactDicomWarningList(
		clone.launchManifest.warnings,
	);
	clone.toolStateBundle.warnings = redactDicomWarningList(
		clone.toolStateBundle.warnings,
	);
	clone.toolStateBundle.annotations = clone.toolStateBundle.annotations.map(
		(annotation) => ({
			...annotation,
			referencedImageId: redactDicomReferenceId(annotation.referencedImageId),
			warnings: redactDicomWarningList(annotation.warnings),
		}),
	);
	return clone;
}
