import type {
	SpeechGatewayHealthReport,
	SpeechGatewayProvider,
	SpeechGatewayStatus,
	SpeechProviderHealthLevel,
	SpeechProviderKind,
	SpeechProviderRuntimeStatus,
} from "@dental/shared";
import { getDentalSttPromptPolicy } from "../dentalPrompt.js";
import {
	getProviderAcceptedKeyEnvVars,
	getProviderKeyHealthSnapshots,
	getProviderKeyPoolSummary,
	numberFromEnv,
	providerKeyCount,
} from "../keyPool.js";
import { getSpeechPolishPolicy } from "../polish.js";
import { speechProviders } from "../providers.js";
import { getMaxChunkBytes, uniqueNonEmpty } from "./audioBufferUtils.js";
import {
	isLocalSpeechProvider,
	isWiredServerProvider,
	localSpeechBridgeProbeWarning,
	localSpeechBridgeReady,
	providerConfigMissingEnvVars,
	providerConfigReady,
} from "./localBridgeProbe.js";
import {
	localSpeechProviders,
	providerAliases,
	providerLabels,
	type SpeechResolvedProvider,
	wiredServerProviders,
} from "./types.js";

export function selectedProvider(): SpeechGatewayProvider {
	const rawProvider = (process.env.DENTAL_SPEECH_PROVIDER ?? "")
		.trim()
		.toLowerCase();
	return (
		providerAliases[rawProvider] ??
		(rawProvider in providerLabels
			? (rawProvider as SpeechGatewayProvider)
			: "none")
	);
}

export function providerConnector(
	providerId: SpeechGatewayProvider,
): SpeechProviderRuntimeStatus["connector"] {
	if (providerId === "browser_speech") return "client_only";
	if (isWiredServerProvider(providerId)) return "server_wired";
	if (isLocalSpeechProvider(providerId)) return "local_bridge";
	if (providerId === "mobile_native_speech") {
		return "local_planned";
	}
	return "server_cataloged";
}

export function providerMinimumChunkMs(providerId: SpeechGatewayProvider): number {
	return providerId === "groq_whisper" ? 10_000 : 1_000;
}

export function normalizeSpeechChunkTimings(input: {
	providerId: SpeechGatewayProvider;
	recommendedChunkMs: number;
	minChunkMs: number;
	maxChunkMs: number;
	warnings: string[];
}): { recommendedChunkMs: number; minChunkMs: number; maxChunkMs: number } {
	const rawMin = Math.min(input.minChunkMs, input.maxChunkMs);
	const rawMax = Math.max(input.minChunkMs, input.maxChunkMs);
	const providerFloor = providerMinimumChunkMs(input.providerId);
	const minChunkMs = Math.max(rawMin, providerFloor);
	const maxChunkMs = Math.max(rawMax, minChunkMs);
	const recommendedChunkMs = Math.min(
		Math.max(input.recommendedChunkMs, minChunkMs),
		maxChunkMs,
	);

	if (
		input.providerId === "groq_whisper" &&
		(rawMin < providerFloor || input.recommendedChunkMs < providerFloor)
	) {
		input.warnings.push(
			"Для Groq распознавания включен минимум 10 секунд на фрагмент, чтобы не тратить короткие запросы впустую.",
		);
	}
	if (
		input.recommendedChunkMs !== recommendedChunkMs ||
		rawMin !== minChunkMs ||
		rawMax !== maxChunkMs
	) {
		input.warnings.push(
			`Длительность аудиофрагментов нормализована до ${Math.round(minChunkMs / 1000)}-${Math.round(maxChunkMs / 1000)} сек.; рекомендовано ${Math.round(
				recommendedChunkMs / 1000,
			)} сек.`,
		);
	}

	return { recommendedChunkMs, minChunkMs, maxChunkMs };
}

export function providerTranscriptionCurrentlyAvailable(
	providerId: SpeechGatewayProvider,
): boolean {
	if (isWiredServerProvider(providerId)) {
		return (
			providerConfigReady(providerId) &&
			getProviderKeyPoolSummary(providerId).availableKeyCount > 0
		);
	}
	if (isLocalSpeechProvider(providerId)) {
		return (
			providerConfigReady(providerId) && localSpeechBridgeReady(providerId)
		);
	}
	return false;
}

export function anyProviderTranscriptionCurrentlyAvailable(
	providerIds: SpeechGatewayProvider[],
): boolean {
	return providerIds.some((providerId) =>
		providerTranscriptionCurrentlyAvailable(providerId),
	);
}

export function configuredWiredProviders(): SpeechProviderKind[] {
	return [...wiredServerProviders, ...localSpeechProviders].filter(
		(providerId) => providerConfigReady(providerId),
	);
}

export function fallbackLimit(): number {
	return Math.max(
		1,
		Math.min(
			numberFromEnv("DENTAL_SPEECH_FALLBACK_LIMIT", 2),
			wiredServerProviders.length,
		),
	);
}

export function resolveSpeechProvider(): SpeechResolvedProvider {
	const requestedProviderId = selectedProvider();
	const configuredProviderIds = configuredWiredProviders();
	const warnings: string[] = [];
	const requestedKeyPresent = providerKeyCount(requestedProviderId) > 0;
	const requestedConfigured = providerConfigReady(requestedProviderId);

	if (
		(isWiredServerProvider(requestedProviderId) ||
			isLocalSpeechProvider(requestedProviderId)) &&
		requestedConfigured
	) {
		const fallbackProviderIds: SpeechProviderKind[] = [
			requestedProviderId as SpeechProviderKind,
			...configuredProviderIds.filter(
				(providerId) => providerId !== requestedProviderId,
			),
		].slice(0, fallbackLimit());
		return {
			providerId: requestedProviderId,
			requestedProviderId,
			providerSelectionMode: "manual",
			configuredProviderIds,
			fallbackProviderIds,
			warnings,
			nextSetupStep: isLocalSpeechProvider(requestedProviderId)
				? `${providerLabels[requestedProviderId]}: локальный модуль указан в серверных настройках; перед отправкой аудио из очереди проверка доступности должна показать готовность.`
				: `${providerLabels[requestedProviderId]} готов: источник распознавания подключен, резервная цепочка ${fallbackProviderIds.map((providerId) => providerLabels[providerId]).join(" -> ")}.`,
		};
	}

	if (configuredProviderIds.length) {
		const providerId = configuredProviderIds[0] ?? "none";
		const fallbackProviderIds = configuredProviderIds.slice(0, fallbackLimit());
		const providerSelectionMode =
			requestedProviderId === "none" ? "auto" : "fallback";
		if (requestedProviderId === "none") {
			warnings.push(
				`${providerLabels[providerId]} выбран автоматически, потому что источник распознавания уже есть в серверных настройках.`,
			);
		} else {
			warnings.push(
				`${providerLabels[requestedProviderId]} сейчас не может принимать аудиофрагменты; временно используется ${providerLabels[providerId]}.`,
			);
		}
		return {
			providerId,
			requestedProviderId,
			providerSelectionMode,
			configuredProviderIds,
			fallbackProviderIds,
			warnings,
			nextSetupStep: `Активен ${providerLabels[providerId]}. Для ручного выбора откройте серверные настройки распознавания; для первого пилота достаточно одного подключенного облачного источника.`,
		};
	}

	const nextSetupStep =
		requestedProviderId === "none"
			? "Для серверного распознавания подключите один облачный источник в серверных настройках. Пока врач может печатать, использовать браузерную диктовку и офлайн-парсер."
			: isWiredServerProvider(requestedProviderId) &&
					requestedKeyPresent &&
					providerConfigMissingEnvVars(requestedProviderId).length
				? `${providerLabels[requestedProviderId]}: источник найден, но не хватает серверных настроек: ${providerConfigMissingEnvVars(requestedProviderId).length}.`
				: isLocalSpeechProvider(requestedProviderId)
					? `${providerLabels[requestedProviderId]} требует адрес локального модуля в серверных настройках: ${Math.max(1, providerConfigMissingEnvVars(requestedProviderId).length)} пункт.`
					: requestedKeyPresent && !isWiredServerProvider(requestedProviderId)
						? `${providerLabels[requestedProviderId]} есть в каталоге, но прямой серверный коннектор пока не включен; для рабочего распознавания подключите поддерживаемый облачный источник.`
						: `Для ${providerLabels[requestedProviderId]} нужен серверный ключ в серверных настройках. До подключения врач может использовать браузерную диктовку или печатный черновик.`;

	return {
		providerId: requestedProviderId,
		requestedProviderId,
		providerSelectionMode: "disabled",
		configuredProviderIds,
		fallbackProviderIds: [],
		warnings,
		nextSetupStep,
	};
}

export function getSpeechGatewayStatus(): SpeechGatewayStatus {
	const resolvedProvider = resolveSpeechProvider();
	const providerId = resolvedProvider.providerId;
	const keyPool = getProviderKeyPoolSummary(providerId);
	const missingConfigEnvVars = providerConfigMissingEnvVars(providerId);
	const providerReady = providerConfigReady(providerId);
	const keyConfigured =
		keyPool.configuredKeyCount > 0 ||
		(isLocalSpeechProvider(providerId) && providerReady);
	const serverTranscriptionCurrentlyAvailable =
		anyProviderTranscriptionCurrentlyAvailable(
			resolvedProvider.fallbackProviderIds.length
				? resolvedProvider.fallbackProviderIds
				: [providerId],
		);
	const maxChunkBytes = getMaxChunkBytes();
	const recommendedChunkMs = numberFromEnv(
		"DENTAL_SPEECH_RECOMMENDED_CHUNK_MS",
		15_000,
	);
	const minChunkMs = numberFromEnv("DENTAL_SPEECH_MIN_CHUNK_MS", 10_000);
	const maxChunkMs = numberFromEnv("DENTAL_SPEECH_MAX_CHUNK_MS", 25_000);
	const silenceMs = numberFromEnv("DENTAL_SPEECH_SILENCE_MS", 900);
	const monitorIntervalMs = numberFromEnv(
		"DENTAL_SPEECH_MONITOR_INTERVAL_MS",
		250,
	);
	const overlapMs = Math.min(
		numberFromEnv("DENTAL_SPEECH_CHUNK_OVERLAP_MS", 500),
		3_000,
	);
	const dedupeWindowChars = Math.min(
		numberFromEnv("DENTAL_SPEECH_DEDUPE_WINDOW_CHARS", 600),
		4_000,
	);
	const rmsThreshold = Number(process.env.DENTAL_SPEECH_RMS_THRESHOLD ?? 0.015);
	const warnings: string[] = [...resolvedProvider.warnings];
	const chunkTimings = normalizeSpeechChunkTimings({
		providerId,
		recommendedChunkMs,
		minChunkMs,
		maxChunkMs,
		warnings,
	});

	if (providerId === "none") {
		warnings.push(
			"Серверное распознавание не настроено: врач может печатать, использовать браузерную диктовку и офлайн-парсер.",
		);
	} else if (providerId === "browser_speech") {
		warnings.push(
			"Браузерная диктовка работает без серверного подключения и не отправляет аудио на сервер.",
		);
	} else if (isLocalSpeechProvider(providerId) && providerReady) {
		const localProbeWarning = localSpeechBridgeProbeWarning(providerId);
		if (localProbeWarning) warnings.push(localProbeWarning);
	} else if (isLocalSpeechProvider(providerId)) {
		warnings.push(
			`${providerLabels[providerId]} требует адрес локального модуля в серверных настройках перед офлайн-распознаванием фрагментов.`,
		);
	} else if (!keyConfigured) {
		warnings.push(
			`Для ${providerLabels[providerId]} нужен серверный доступ в настройках распознавания. До подключения врач может использовать локальный черновик.`,
		);
	}

	if (keyConfigured && missingConfigEnvVars.length) {
		warnings.push(
			`${providerLabels[providerId]} подключен частично: не хватает серверных настроек (${missingConfigEnvVars.length}).`,
		);
	}

	if (providerReady && !serverTranscriptionCurrentlyAvailable) {
		warnings.push(
			"Серверное распознавание настроено, но сейчас нет доступного резервного источника; аудио остается в локальной очереди до восстановления серверного доступа или локального модуля.",
		);
	}

	if (keyConfigured && keyPool.rotationEnabled) {
		warnings.push(
			`Резервное переключение распознавания активно: доступно ${keyPool.availableKeyCount}/${keyPool.configuredKeyCount}, лимит повторов ${keyPool.maxAttemptsPerProvider}.`,
		);
	} else if (
		keyConfigured &&
		!isLocalSpeechProvider(providerId) &&
		keyPool.availableKeyCount === 0
	) {
		warnings.push(
			"Выбранный источник распознавания временно на паузе из-за лимитов; локальный черновик остается доступен.",
		);
	}

	if (
		[
			"azure_speech",
			"google_speech",
			"huggingface_asr",
			"mobile_native_speech",
		].includes(providerId)
	) {
		warnings.push(
			`${providerLabels[providerId]} добавлен в каталог выбора, но прямое серверное распознавание пока не включено в текущий шлюз.`,
		);
	}

	return {
		providerId,
		requestedProviderId: resolvedProvider.requestedProviderId,
		providerLabel: providerLabels[providerId],
		providerSelectionMode: resolvedProvider.providerSelectionMode,
		serverTranscriptionEnabled: providerReady,
		serverTranscriptionCurrentlyAvailable,
		keyConfigured,
		keyPool,
		configuredProviderIds: resolvedProvider.configuredProviderIds,
		fallbackProviderIds: resolvedProvider.fallbackProviderIds,
		maxChunkBytes,
		recommendedChunkMs: chunkTimings.recommendedChunkMs,
		chunkingPolicy: {
			strategy: "time_and_silence",
			minChunkMs: chunkTimings.minChunkMs,
			maxChunkMs: chunkTimings.maxChunkMs,
			silenceMs,
			rmsThreshold:
				Number.isFinite(rmsThreshold) && rmsThreshold > 0
					? rmsThreshold
					: 0.015,
			monitorIntervalMs,
			overlapMs,
			dedupeWindowChars,
		},
		polishPolicy: getSpeechPolishPolicy(),
		promptPolicy: getDentalSttPromptPolicy(),
		audioRetention: "discard_after_transcription",
		nextSetupStep: resolvedProvider.nextSetupStep,
		warnings,
	};
}

export function getSpeechProviderRuntimeStatuses(): SpeechProviderRuntimeStatus[] {
	const gateway = getSpeechGatewayStatus();
	return speechProviders.map((provider) => {
		const providerId = provider.id;
		const keyPool = getProviderKeyPoolSummary(providerId);
		const acceptedEnvVars = getProviderAcceptedKeyEnvVars(providerId);
		const missingConfigEnvVars = providerConfigMissingEnvVars(providerId);
		const connector = providerConnector(providerId);
		const configured =
			provider.status === "usable_without_key" ||
			(connector === "local_bridge" && providerConfigReady(providerId)) ||
			(keyPool.configuredKeyCount > 0 && missingConfigEnvVars.length === 0);
		const localBridgeCurrentlyReady =
			connector === "local_bridge" &&
			providerTranscriptionCurrentlyAvailable(providerId);
		const canTranscribeChunks =
			provider.status === "usable_without_key" ||
			(connector === "server_wired" && configured) ||
			localBridgeCurrentlyReady;
		const missingEnvVars =
			provider.status === "usable_without_key"
				? []
				: [
						...(keyPool.configuredKeyCount > 0 || connector === "local_bridge"
							? []
							: acceptedEnvVars),
						...missingConfigEnvVars,
					].filter(
						(envName, index, envNames) => envNames.indexOf(envName) === index,
					);
		const warnings: string[] = [];

		if (connector === "server_wired" && keyPool.configuredKeyCount > 1) {
			warnings.push(
				`Резервное переключение включено: ${keyPool.availableKeyCount}/${keyPool.configuredKeyCount} доступно.`,
			);
		}
		if (
			connector === "server_wired" &&
			keyPool.configuredKeyCount > 0 &&
			keyPool.availableKeyCount === 0
		) {
			warnings.push(
				"Все ключи источника распознавания на временной паузе из-за лимитов; врач продолжит через локальный текст и очередь.",
			);
		}
		if (
			connector === "server_wired" &&
			keyPool.configuredKeyCount > 0 &&
			missingConfigEnvVars.length
		) {
			warnings.push(
				`Серверные настройки распознавания неполные: не хватает пунктов (${missingConfigEnvVars.length}) до приема аудиофрагментов этим маршрутом.`,
			);
		}
		if (connector === "server_cataloged" && keyPool.configuredKeyCount > 0) {
			warnings.push(
				"Ключ найден, но прямой серверный коннектор пока не включен в текущий шлюз.",
			);
		}
		if (connector === "local_planned") {
			warnings.push(
				"Нужен отдельный desktop/mobile модуль; браузерный интерфейс не должен получать локальные модели.",
			);
		}
		if (connector === "local_bridge" && configured) {
			const localProbeWarning = localSpeechBridgeProbeWarning(providerId);
			if (localProbeWarning) warnings.push(localProbeWarning);
		}

		const nextStep =
			provider.status === "usable_without_key"
				? "Можно использовать сразу как быстрый ввод, но врач всё равно проверяет текст."
				: connector === "local_bridge" && localBridgeCurrentlyReady
					? `${providerLabels[providerId]}: локальный модуль готов; сервер может отправлять фрагменты без облачного распознавания.`
					: connector === "local_bridge" && configured
						? `${providerLabels[providerId]} указан, но проверка доступности не готова; держите аудио в локальном восстановлении и запустите или исправьте локальный модуль.`
						: connector === "local_bridge"
							? `Заполните серверные настройки локального модуля (${Math.max(1, missingEnvVars.length)}). До этого врач может печатать или использовать браузерную диктовку.`
							: connector === "server_wired" && configured
								? `${providerLabels[providerId]} готов для серверных аудиофрагментов; повторов ${keyPool.maxAttemptsPerProvider}, ожидание ответа ${Math.round(keyPool.timeoutMs / 1000)} c.`
								: connector === "server_wired" && missingEnvVars.length
									? `Заполните серверные настройки распознавания (${missingEnvVars.length}). До этого врач может печатать или использовать браузерную диктовку.`
									: connector === "server_wired"
										? `Подключите один серверный источник распознавания. До этого врач печатает или использует браузерную диктовку.`
										: connector === "server_cataloged"
											? `Источник распознавания оставлен как админский вариант; для включения нужен отдельный маршрут и проверка тарифов/данных.`
											: "Запланировать локальный модуль после стабилизации серверного распознавания и офлайн-парсера.";

		return {
			providerId,
			providerLabel: providerLabels[providerId],
			connector,
			doctorFacing:
				providerId === "browser_speech" || providerId === gateway.providerId,
			canTranscribeChunks,
			configured,
			keyPool,
			acceptedSettingsCount: acceptedEnvVars.length,
			missingSettingsCount: missingEnvVars.length,
			recommendedUse:
				provider.recommendedFor[0] ?? "админский выбор источника распознавания",
			nextStep,
			warnings,
		};
	});
}

export function getSpeechGatewayHealthReport(): SpeechGatewayHealthReport {
	const gateway = getSpeechGatewayStatus();
	const runtimeStatuses = getSpeechProviderRuntimeStatuses();
	const providers = runtimeStatuses.map((runtime) => {
		const keyHealth = getProviderKeyHealthSnapshots(runtime.providerId);
		const connector = runtime.connector;
		const fallbackIndex = gateway.fallbackProviderIds.indexOf(
			runtime.providerId,
		);
		const fallbackRank = fallbackIndex >= 0 ? fallbackIndex : null;
		const hasAvailableServerKey =
			runtime.keyPool.configuredKeyCount > 0 &&
			runtime.keyPool.availableKeyCount > 0;
		const localBridgeReady =
			connector === "local_bridge" && runtime.canTranscribeChunks;
		const healthLevel: SpeechProviderHealthLevel =
			connector === "client_only"
				? "ready"
				: connector === "local_bridge"
					? localBridgeReady
						? "ready"
						: "setup_required"
					: connector === "local_planned" || connector === "server_cataloged"
						? "planned"
						: !runtime.configured
							? "setup_required"
							: hasAvailableServerKey
								? "ready"
								: "degraded";
		const safeToUseInVisit =
			runtime.providerId === "browser_speech" ||
			localBridgeReady ||
			(connector === "server_wired" &&
				runtime.canTranscribeChunks &&
				runtime.keyPool.availableKeyCount > 0);
		const warnings = [...runtime.warnings];

		if (
			connector === "server_wired" &&
			runtime.configured &&
			runtime.keyPool.availableKeyCount === 0
		) {
			warnings.push(
				"Все настроенные ключи на временной паузе из-за лимитов; прием сохраняет локальный черновик и очередь повтора без блокировки врача.",
			);
		}
		if (fallbackRank !== null && fallbackRank > 0) {
			warnings.push(
				`Резервный источник распознавания в очереди N ${fallbackRank + 1}; используется только после ошибки или паузы из-за лимитов у более ранних источников.`,
			);
		}

		return {
			providerId: runtime.providerId,
			providerLabel: runtime.providerLabel,
			connector,
			configured: runtime.configured,
			canTranscribeChunks: runtime.canTranscribeChunks,
			keyPool: runtime.keyPool,
			keyHealth,
			healthLevel,
			fallbackRank,
			safeToUseInVisit,
			warnings: uniqueNonEmpty(warnings),
			nextStep: runtime.nextStep,
		};
	});

	const totals = providers.reduce(
		(accumulator, provider) => ({
			configured: accumulator.configured + provider.keyPool.configuredKeyCount,
			available: accumulator.available + provider.keyPool.availableKeyCount,
			coolingDown:
				accumulator.coolingDown + provider.keyPool.coolingDownKeyCount,
		}),
		{ configured: 0, available: 0, coolingDown: 0 },
	);
	const warnings = [...gateway.warnings];

	if (
		gateway.serverTranscriptionEnabled &&
		!gateway.serverTranscriptionCurrentlyAvailable
	) {
		warnings.push(
			"Сейчас нет доступного источника распознавания; фрагменты остаются восстанавливаемыми и не блокируют врача.",
		);
	} else if (
		gateway.serverTranscriptionEnabled &&
		!isLocalSpeechProvider(gateway.providerId) &&
		gateway.keyPool.availableKeyCount === 0
	) {
		warnings.push(
			"Активный источник распознавания сейчас недоступен; перед повтором будут проверены резервные источники.",
		);
	}
	if (
		gateway.serverTranscriptionEnabled &&
		!isLocalSpeechProvider(gateway.providerId) &&
		gateway.fallbackProviderIds.length < 2
	) {
		warnings.push(
			"Настроен только один источник распознавания; добавьте второй источник для устойчивого резервирования.",
		);
	}
	if (!gateway.promptPolicy.enabled) {
		warnings.push(
			"Пакет стоматологических подсказок для распознавания отключен; материалы, номера зубов и процедуры будут распознаваться хуже.",
		);
	}
	if (!gateway.polishPolicy.deterministicEnabled) {
		warnings.push(
			"Детерминированный стоматологический парсер отключен; для работы без интернета его лучше держать включенным.",
		);
	}

	const activeLocalBridgeReady =
		isLocalSpeechProvider(gateway.providerId) &&
		gateway.serverTranscriptionCurrentlyAvailable;
	const nextAction = activeLocalBridgeReady
		? `${gateway.providerLabel}: локальный модуль готов; фрагменты остаются на localhost/private LAN, облачное распознавание не нужно.`
		: gateway.serverTranscriptionCurrentlyAvailable
			? `${gateway.providerLabel}: в резервной цепочке есть доступный путь распознавания, доступных маршрутов ${gateway.keyPool.availableKeyCount}/${gateway.keyPool.configuredKeyCount}, источников ${gateway.fallbackProviderIds.length}.`
			: totals.configured > 0 && totals.available === 0
				? "Все настроенные серверные маршруты распознавания на временной паузе из-за лимитов; держите браузерную или локальную диктовку активной и повторите очередь позже."
				: gateway.nextSetupStep;

	return {
		generatedAt: new Date().toISOString(),
		activeProviderId: gateway.providerId,
		activeProviderLabel: gateway.providerLabel,
		serverTranscriptionEnabled: gateway.serverTranscriptionEnabled,
		fallbackProviderIds: gateway.fallbackProviderIds,
		totalConfiguredKeys: totals.configured,
		totalAvailableKeys: totals.available,
		totalCoolingDownKeys: totals.coolingDown,
		timeoutMs: gateway.keyPool.timeoutMs,
		retryLimit: gateway.keyPool.maxAttemptsPerProvider,
		promptEnabled: gateway.promptPolicy.enabled,
		deterministicParserEnabled: gateway.polishPolicy.deterministicEnabled,
		providers,
		warnings: uniqueNonEmpty(warnings).slice(0, 10),
		nextAction,
	};
}
