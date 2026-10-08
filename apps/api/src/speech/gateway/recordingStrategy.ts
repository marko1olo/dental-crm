import type {
	SpeechRecordingStrategy,
	SpeechRecordingStrategyRequest,
} from "@dental/shared";
import { getSpeechGatewayStatus } from "./speechSessionManager.js";
import { providerLabels } from "./types.js";

export function buildSpeechRecordingStrategy(
	input: SpeechRecordingStrategyRequest,
): SpeechRecordingStrategy {
	const gateway = getSpeechGatewayStatus();
	const expectedDurationMs = input.expectedDurationMs ?? null;
	const estimatedChunkCount = expectedDurationMs
		? Math.max(1, Math.ceil(expectedDurationMs / gateway.recommendedChunkMs))
		: null;

	const baseStrategy = {
		chunkMs: gateway.recommendedChunkMs,
		minChunkMs: gateway.chunkingPolicy.minChunkMs,
		maxChunkMs: gateway.chunkingPolicy.maxChunkMs,
		estimatedChunkCount,
		maxChunkBytes: gateway.maxChunkBytes,
	};

	const steps: string[] = [];
	const warnings: string[] = [];
	const longRecording = Boolean(
		expectedDurationMs && expectedDurationMs > 20 * 60_000,
	);

	if (input.privacyMode === "local_only") {
		return {
			...baseStrategy,
			recommendedPath: "local_transcript_only",
			providerId: "browser_speech",
			providerLabel: providerLabels.browser_speech,
			serverUploadAllowed: false,
			localQueueRequired: true,
			deterministicParserRequired: true,
			neuralPolishAllowed: false,
			reason:
				"Режим приватности запрещает облачную отправку; держите текст локально и запускайте детерминированный стоматологический парсер.",
			steps: [
				"Используйте браузерную или мобильную диктовку, когда она доступна.",
				"Автосохраняйте текст локально после каждого изменения.",
				"Запускайте детерминированный профильный парсер до создания черновика ЭМК.",
				"Синхронизируйте только проверенный текст, когда клиника разрешает серверное хранение.",
			],
			warnings: [
				"Облачное распознавание и нейронная полировка отключены в локальном режиме.",
			],
		};
	}

	if (input.networkState === "offline") {
		return {
			...baseStrategy,
			recommendedPath: "offline_queue",
			providerId: gateway.providerId,
			providerLabel: gateway.providerLabel,
			serverUploadAllowed: false,
			localQueueRequired: true,
			deterministicParserRequired: true,
			neuralPolishAllowed: false,
			reason: "Сети нет; врач должен продолжать работу без блокирующего окна.",
			steps: [
				"Сохраняйте аудиофрагменты в IndexedDB, если аудио есть.",
				"Держите видимый текст в локальном черновике.",
				"Используйте детерминированный парсер для немедленной очистки черновика.",
				"После появления сети отправьте очередь и соберите серверный текст.",
			],
			warnings: [
				"Внешнее распознавание и нейронная полировка отложены до восстановления связи.",
			],
		};
	}

	if (!gateway.serverTranscriptionEnabled) {
		return {
			...baseStrategy,
			recommendedPath: "browser_live",
			providerId: "browser_speech",
			providerLabel: providerLabels.browser_speech,
			serverUploadAllowed: false,
			localQueueRequired: true,
			deterministicParserRequired: true,
			neuralPolishAllowed: false,
			reason:
				"Серверный источник распознавания не готов; браузерная диктовка и печать остаются самым быстрым режимом.",
			steps: [
				"Добавляйте распознанный браузером текст в автосохраняемое поле диктовки.",
				"Разрешайте ручной ввод в любой момент.",
				"Запускайте детерминированную очистку до черновика ЭМК.",
				"Показывайте выбор источника распознавания только в настройках, не на экране лечения.",
			],
			warnings: gateway.warnings,
		};
	}

	if (!gateway.serverTranscriptionCurrentlyAvailable) {
		return {
			...baseStrategy,
			recommendedPath: "offline_queue",
			providerId: gateway.providerId,
			providerLabel: gateway.providerLabel,
			serverUploadAllowed: false,
			localQueueRequired: true,
			deterministicParserRequired: true,
			neuralPolishAllowed: false,
			reason:
				"Серверное распознавание настроено, но текущие источники или ключи недоступны; записывайте локально и повторяйте без блокировки приема.",
			steps: [
				"Сохраняйте каждый аудиофрагмент в IndexedDB до любой попытки отправки.",
				"Не отправляйте аудиофрагменты, пока в резервной цепочке распознавания нет доступного источника.",
				"Держите видимый текст редактируемым и автосохраненным локально.",
				"Отправьте локальную очередь и соберите запись, когда появится ключ или локальный модуль.",
			],
			warnings: gateway.warnings,
		};
	}

	if (longRecording) {
		warnings.push(
			"Длинные записи нужно делить на фрагменты или переносить в async-задачу; не загружайте один большой файл всего приема.",
		);
	}
	if (gateway.keyPool.coolingDownKeyCount > 0) {
		warnings.push(
			`${gateway.keyPool.coolingDownKeyCount} ключ(а) распознавания на временной паузе из-за лимитов; повтор возьмет доступные ключи по резервному переключению.`,
		);
	}
	if (
		gateway.providerId === "groq_whisper" &&
		gateway.chunkingPolicy.minChunkMs < 10_000
	) {
		warnings.push(
			"Groq распознавание не должно получать слишком короткие фрагменты: короткие запросы могут расходовать минимальную длительность впустую.",
		);
	}

	steps.push(
		`Записывайте фрагменты около ${Math.round(gateway.recommendedChunkMs / 1000)} секунд с отсечкой тишины и жестким максимумом ${Math.round(gateway.chunkingPolicy.maxChunkMs / 1000)} секунд.`,
		`Убирайте дубли текста на границе фрагментов в последних ${gateway.chunkingPolicy.dedupeWindowChars} символах; ${gateway.chunkingPolicy.overlapMs} мс зарезервированы как будущий предзахват для мобильных и настольных рекордеров.`,
		"Сохраняйте каждый ожидающий аудиофрагмент в IndexedDB до отправки.",
		"Отправляйте фрагменты только через сервер приложения; никогда не раскрывайте ключи источников распознавания в браузере.",
		"Собирайте сохраненные фрагменты по recordingId после остановки или повтора очереди.",
		"Сначала запускайте детерминированный стоматологический парсер; нейронная полировка может менять только формулировки и не должна добавлять факты.",
	);

	return {
		...baseStrategy,
		recommendedPath: longRecording ? "async_long_recording" : "server_chunked",
		providerId: gateway.providerId,
		providerLabel: gateway.providerLabel,
		serverUploadAllowed: true,
		localQueueRequired: true,
		deterministicParserRequired: true,
		neuralPolishAllowed: gateway.polishPolicy.neuralEnabled,
		reason: longRecording
			? "Серверное распознавание настроено, но длинное аудио требует асинхронного потока."
			: "Серверное распознавание настроено; фрагментированная загрузка балансирует качество, лимиты источника и локальное восстановление.",
		steps,
		warnings,
	};
}
