import {
	denteTelegramBotStatusSchema,
	type DenteTelegramBotSettings,
} from "@dental/shared";
import {
	listDenteTelegramWebhookEvents,
	denteTelegramOutboxDeliveryReceipts,
	listDenteTelegramLinkCodes,
	getDenteTelegramBotSettings,
} from "../../services/telegram/telegramLegacyMemoryStore.js";
import {
	countActiveDenteTelegramChatLinks,
} from "../../telegram/chatLinks.js";
import type { TelegramRuntimeContext } from "./types.js";
import {
	resolveTelegramRuntimeContext,
	configuredBotUsername,
	configuredBotToken,
	configuredWebhookSecret,
} from "./telegramRuntimeContext.js";
import { readableTelegramPayload } from "./telegramUtils.js";

export async function buildStatus(
	requestedOrganizationId: string | null = null,
	requestedBotConfigId: string | null = null,
) {
	const runtimeResult = resolveTelegramRuntimeContext(
		requestedOrganizationId,
		requestedBotConfigId,
	);
	if (!runtimeResult.ok) {
		throw new Error(runtimeResult.message);
	}
	const runtime = runtimeResult.context;
	const settings = runtime.settings;
	const isPrimaryRuntime =
		runtime.organizationId === getDenteTelegramBotSettings().organizationId;
	const warnings: string[] = [];
	const nextActions: string[] = [];

	if (
		settings.mode !== "disabled" &&
		!runtime.tokenConfigured &&
		settings.mode !== "clinic_owned_bot"
	) {
		warnings.push("Бот Telegram не подключен в серверных настройках DENTE.");
		nextActions.push(
			"Подключите секрет бота в серверных настройках клиники; не храните его в браузере, документации или клиентском коде.",
		);
	}
	if (settings.mode !== "disabled" && !runtime.webhookSecretConfigured) {
		warnings.push(
			"Защита вебхука Telegram не включена; входящие события должны приниматься только с серверным секретом.",
		);
		nextActions.push(
			"Сгенерируйте секрет вебхука и подключите его в серверных настройках Telegram.",
		);
	}
	if (settings.mode === "clinic_owned_bot" && !runtime.clinicOwnedBotReady) {
		warnings.push(
			"Собственный бот клиники включен, но не готов: добавьте имя бота и его секрет в серверные настройки.",
		);
		nextActions.push(
			"Проверьте имя собственного бота и серверную запись с его секретом для выбранной клиники.",
		);
	}
	if (settings.privacyMode !== "no_phi_by_default") {
		warnings.push(
			"Telegram-шаблоны с медданными требуют авторизацию, согласия и tenant-policy до production.",
		);
	}
	if (!settings.patientPortalBaseUrl) {
		nextActions.push(
			"Укажите patientPortalBaseUrl перед отправкой ссылок на готовые документы и налоговые документы.",
		);
	}

	// Считает база, а не память: `where status = 'active'` вместо выборки
	// страницы и `filter` по ней — прежний вариант с лимитом 100 переставал
	// расти после сотой связки и молча занижал счётчик.
	//
	// Условие `isPrimaryRuntime` здесь снято намеренно. Оно существовало потому,
	// что реализация в памяти игнорировала запрошенную клинику и отдавала связки
	// основной: для второй клиники единственным безопасным ответом был ноль.
	// Запрос ниже отбирает по `organizationId`, поэтому число верно для любой
	// клиники, а ноль вместо него был бы уже неправдой.
	const activeChatLinkCount = await countActiveDenteTelegramChatLinks({
		organizationId: runtime.organizationId,
		clinicId: runtime.clinicId,
		botConfigId: runtime.botConfigId,
	});

	return denteTelegramBotStatusSchema.parse(
		readableTelegramPayload({
			settings,
			organizationId: runtime.organizationId,
			clinicId: runtime.clinicId,
			botConfigId: runtime.botConfigId,
			mode: settings.mode,
			botUsername: runtime.botUsername,
			tokenConfigured: runtime.tokenConfigured,
			webhookSecretConfigured: runtime.webhookSecretConfigured,
			webhookReady: runtime.webhookReady,
			clinicOwnedBotReady: runtime.clinicOwnedBotReady,
			warnings,
			nextActions,
			processedUpdateCount: listDenteTelegramWebhookEvents(
				300,
				runtime.organizationId,
				runtime.botConfigId,
			).filter((event) => event.status === "processed").length,
			pendingLinkCodeCount: isPrimaryRuntime
				? listDenteTelegramLinkCodes(100).filter(
						(code) => code.status === "pending",
					).length
				: 0,
			activeChatLinkCount,
			recentEvents: listDenteTelegramWebhookEvents(
				50,
				runtime.organizationId,
				runtime.botConfigId,
			),
		}),
	);
}

export function buildFeaturePlan(settings: DenteTelegramBotSettings) {
	return readableTelegramPayload({
		productName: "DENTE",
		botUsername: configuredBotUsername(settings),
		modes: [
			"shared_dente_bot: общий платформенный бот, клиника определяется по одноразовому коду",
			"clinic_owned_bot: собственный бот клиники; имя в настройках, секрет только в серверной конфигурации",
		],
		enabledFeatures: settings.enabledFeatures,
		releaseReadyLayers: [
			"linking: одноразовые QR/deep-link коды",
			"outbox: безопасная очередь напоминаний с причинами блокировки",
			"transport: отправка идет только через подключенного бота и защищенную связку чата",
			"audit: webhook-события и коммуникации остаются в DENTE",
		],
		patientSafeActions: [
			"одноразовый код привязки",
			"подтверждение приема",
			"перенос приема или запрос звонка",
			"уведомление о готовности документа через ссылку на защищенный портал",
			"статус налогового запроса без передачи PDF",
			"общие памятки после визита по утвержденным шаблонам",
		],
		staffSafeActions: [
			"ежедневная сводка расписания",
			"очередь подтверждений",
			"эскалация задач связи",
			"счетчики готовности документов без тела документов",
			"маршрутизация запросов обратного звонка",
		],
		blockedByDefault: [
			"текст диагноза",
			"номера зубов и детали лечения",
			"передача DICOM/КЛКТ/рентгена/фото",
			"налоговые PDF и копии медкарты как файлы Telegram",
			"свободные клинические рекомендации",
		],
	});
}