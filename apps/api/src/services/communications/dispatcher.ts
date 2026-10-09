/**
 * Диспетчер исходящих сообщений: канонический фасад обратной совместимости.
 *
 * Полная реализация декомпозирована в директорию ./dispatch/
 * в соответствии со стандартом DAG Layering:
 *   - types.ts (Layer 0: контракты, типы, настройки)
 *   - templateRenderer.ts (Layer 1: парсинг и настройки)
 *   - channelAdapters.ts (Layer 1: адресация и каналы)
 *   - outboxRetryQueue.ts (Layer 2: очереди, блокировки, лимиты)
 *   - dispatcherCore.ts (Layer 3: ядро отправки и диспетчер)
 */

export type {
	CommunicationIntentCode,
	DispatchOptions,
	DispatchReport,
	EnqueueMessageInput,
	EnqueueMessageResult,
	ResolvedCommunicationSettings,
} from "./dispatch/index.js";

export {
	CommunicationsDispatcher,
	DEFAULT_COMMUNICATION_SETTINGS,
	dispatchDueMessages,
	enqueueMessage,
	parseLeadHours,
	resolveCommunicationSettings,
	resolveRecipientAddress,
} from "./dispatch/index.js";

export * from "./dispatch/index.js";
