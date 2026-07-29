import fs from "node:fs";

const appSource = fs.readFileSync("apps/web/src/App.tsx", "utf8");
const settingsSource = fs.readFileSync("apps/web/src/SettingsView.tsx", "utf8");
const settingsTelegramTabSource = fs.readFileSync(
	"apps/web/src/components/settings/SettingsTelegramTab.tsx",
	"utf8",
);
const useAppLogicSource = fs.readFileSync(
	"apps/web/src/useAppLogic.tsx",
	"utf8",
);
const appHelpersSource = fs.readFileSync("apps/web/src/AppHelpers.tsx", "utf8");
/*
 * УПРАВЛЯЮЩИЙ СЛОЙ TELEGRAM ПЕРЕЕХАЛ В ОТДЕЛЬНЫЙ ХУК — ЕГО НАДО ЧИТАТЬ.
 *
 * Тринадцать требований этого стража описывают адреса и параметры управляющего
 * слоя Telegram (status, feature-plan, outbox, chat-links, приведение режима
 * бота, область organizationId/botConfigId). Всё это вынесено из монолита в
 * apps/web/src/hooks/useTelegramSettings.ts, которого в наборе стража не было.
 * На экране функции работают, человек ими пользуется, а страж сообщал «client UI
 * missing …» — то есть краснел на верном коде.
 *
 * Файл добавлен перечислением, а не обходом каталога hooks/: обход подхватил бы
 * новый хук молча, и требование считалось бы выполненным файлом, которого автор
 * требования не видел. Причина та же, что у перечисления вкладок настроек в
 * smoke-pricelist-analyzer.mjs.
 */
const telegramSettingsHookSource = fs.readFileSync(
	"apps/web/src/hooks/useTelegramSettings.ts",
	"utf8",
);
/*
 * Операторская копия про серверные настройки клиники переехала в доменный хук
 * авторизации: строка «если он включен в серверных настройках клиники» лежит
 * теперь в apps/web/src/hooks/domains/useAuthLogic.ts. Требование к ней —
 * читаемость формулировки для оператора, а не место её объявления, поэтому
 * правится набор файлов, а не требование.
 */
const authLogicSource = fs.readFileSync(
	"apps/web/src/hooks/domains/useAuthLogic.ts",
	"utf8",
);
const settingsStoreSource = fs.readFileSync(
	"apps/web/src/store/settingsStore.ts",
	"utf8",
);
const appStoreSource = fs.readFileSync(
	"apps/web/src/store/appStore.ts",
	"utf8",
);
const styleSource = fs.readFileSync("apps/web/src/styles/main.css", "utf8");
const sharedSource = fs.readFileSync("packages/shared/src/index.ts", "utf8");
const apiSource = fs.readFileSync("apps/api/src/sampleData.ts", "utf8");
const telegramRoutesSource = fs.readFileSync(
	"apps/api/src/routes/telegram.ts",
	"utf8",
);
const telegramTransportSource = fs.readFileSync(
	"apps/api/src/telegramTransport.ts",
	"utf8",
);
const qrSource = fs.readFileSync("apps/api/src/telegramQr.ts", "utf8");
const dbSource = fs.readFileSync("apps/api/src/db/schema.ts", "utf8");
/*
 * НАБОР МИГРАЦИЙ ЧИТАЕТСЯ ТАК ЖЕ, КАК ЕГО ЧИТАЕТ ЖИВОЙ ПРИМЕНЯТЕЛЬ.
 *
 * Здесь были перечислены пять файлов по именам: 0008_document_payload_storage,
 * 0015_telegram_welcome_image, 0021_telegram_visual_cards,
 * 0022_telegram_post_visit_checkup_delays, 0023_telegram_review_request_delay.
 * НИ ОДНОГО из них в дереве больше нет — линию миграций пересобрали, и, скажем,
 * номер 0008 занят теперь совсем другим файлом (0008_add_settings.sql). Страж
 * падал с ENOENT на первом же чтении и не доходил ни до одной проверки.
 *
 * Замечание к отчёту цикла 24: путь здесь собран ВЕРНО. Истинная ошибка —
 * `ENOENT ... 'C:\Clinic_MVP\dental-crm\apps\api\drizzle\0008_document_payload_storage.sql'`.
 * «dental-crmppspi» в отчёте — артефакт чтения лога: Node печатает путь с
 * двойными обратными слэшами, а слой, трактующий `\a` как escape (BEL, 0x07),
 * съедает букву «a» у «apps» и у «api». Конкатенации пути в этом файле нет.
 *
 * ПОЧЕМУ ЗДЕСЬ ОБХОД КАТАЛОГА, А НЕ НОВОЕ ПЕРЕЧИСЛЕНИЕ. Перечислять миграции по
 * именам нельзя: имена уже один раз сгнили и сгниют снова при следующей
 * пересборке линии. Требование при этом не «колонку добавил файл номер N», а
 * «колонку создаёт применяемая история миграций». Набор берётся ровно так, как
 * его берёт apps/api/src/scripts/migrate.ts:70 — readdirSync каталога drizzle с
 * фильтром .sql. Это тот самый набор, который реально применяется к базе.
 *
 * ЖУРНАЛ ЗДЕСЬ СОЗНАТЕЛЬНО НЕ ИСПОЛЬЗУЕТСЯ, и это не небрежность:
 * drizzle/meta/_journal.json описывает 28 миграций, ни один тег которых не
 * существует на диске, а на диске лежат 103 файла, ни один из которых в журнале
 * не зарегистрирован — два непересекающихся множества. Это известное и
 * задокументированное состояние (migrate.ts:12-14: журнал остался от удалённой
 * линии миграций), поэтому применятель обходит журнал, и страж обязан смотреть
 * туда же, куда смотрит применятель. Сверять с журналом значило бы проверять
 * метаданные, которые к живой базе отношения не имеют.
 */
const MIGRATIONS_DIR = "apps/api/drizzle";
const migrationFileNames = fs
	.readdirSync(MIGRATIONS_DIR)
	.filter((name) => name.endsWith(".sql"))
	.sort();
if (!migrationFileNames.length) {
	throw new Error(
		`В ${MIGRATIONS_DIR} нет ни одного .sql — проверять историю миграций нечем.`,
	);
}
const migrationSource = migrationFileNames
	.map((name) => fs.readFileSync(`${MIGRATIONS_DIR}/${name}`, "utf8"))
	.join("\n");

const secretPattern = /\b\d{8,12}:AA[A-Za-z0-9_-]{30,}\b/;
const missing = [];
const clientUiSource = `${appSource}\n${settingsSource}\n${settingsTelegramTabSource}\n${useAppLogicSource}\n${appHelpersSource}\n${settingsStoreSource}\n${appStoreSource}\n${telegramSettingsHookSource}\n${authLogicSource}`;

/*
 * СРАВНЕНИЕ ТЕРПИТ ПЕРЕНОСЫ СТРОК И `?.`, НО НЕ ТЕРПИТ ПОДМЕНУ ТОКЕНОВ.
 *
 * Замерено 29.07.2026: после снятия ENOENT из ~700 требований не прошли 32, и
 * настоящим дефектом продукта не было НИ ОДНО. Три причины, все — форма записи:
 *
 *  1. Biome перенёс аргументы. Нужен `fetch(`/api/telegram/outbox/send-due…`, а
 *     в исходнике `await fetch(\n\t\t\t\t`/api/telegram/outbox/send-due…`.
 *     useAppLogic.tsx:13460 — вызов на месте, `includes` его не видит.
 *  2. Продукт стал защищённее, и страж это наказывал. Нужен
 *     `dashboard.clinicSettings.profile.organizationId`, а в
 *     useTelegramSettings.ts:542 стоит
 *     `dashboard?.clinicSettings?.profile?.organizationId?.trim()` — то же
 *     обращение с опциональной цепочкой. Требовать отсутствия `?.` значит
 *     требовать менее безопасный код.
 *  3. Needle написаны по МЁРТВОЙ копии. Шесть требований к sampleData совпадали
 *     только с apps/api/src/sampleData_opt.ts — файлом, про который
 *     telegram/legacyMocks.ts:8 и money/patientDebt.ts:114 прямо говорят, что на
 *     него не ссылается никто. Отличие видно по отступу: в needle два пробела, в
 *     живом sampleData.ts табуляции. Страж читает ЖИВОЙ файл (это верно), а
 *     проверял форму мёртвого.
 *
 * Поэтому проверка сначала пробует точное вхождение, а если его нет — терпимый
 * шаблон: любой пробел между токенами, висячая запятая Biome, необязательный
 * `?.` вместо `.`. Имена, порядок аргументов, строковые литералы и адреса
 * маршрутов по-прежнему обязательны точно, поэтому подмена «read» на «update»
 * или чужой адрес маршрута шаблон НЕ пройдут.
 */
function flexibleSnippetPattern(snippet) {
	const tokens = snippet
		.split(/\s+/)
		.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join("\\s*");
	const flexible = tokens
		// `.foo` и `?.foo` — одно и то же обращение; перенос перед точкой разрешён
		.replace(/\\\./g, "\\s*\\??\\s*\\.")
		.replace(/(\\[({])/g, "$1\\s*")
		.replace(/(\\[)}])/g, "(?:\\s*,)?\\s*$1");
	return new RegExp(flexible);
}

function sourceHasSnippet(source, snippet) {
	if (source.includes(snippet)) return true;
	return flexibleSnippetPattern(snippet).test(source);
}

for (const [label, source] of [
	["App.tsx", appSource],
	["SettingsView.tsx", settingsSource],
	["SettingsTelegramTab.tsx", settingsTelegramTabSource],
	["main.css", styleSource],
	["shared schema", sharedSource],
	["sampleData", apiSource],
	["telegram routes", telegramRoutesSource],
	["telegram transport", telegramTransportSource],
	["telegramQr", qrSource],
	["db schema", dbSource],
]) {
	if (secretPattern.test(source))
		missing.push(`${label} contains a Telegram bot token`);
}

for (const forbiddenCopy of [
	"На API-сервере не настроен токен Telegram-бота.",
	"Проверьте токен, сеть и chat id.",
	"токен берется только из API-server env",
	"если он включен на API-сервере",
	"<span>Токен</span>",
	"В браузер и ответы API секрет не возвращается.",
	"серверном токене и зашифрованном transport-ref",
	"ID конфигурации бота клиники",
	"Webhook HTTPS",
	"<span>Вебхук</span>",
	"секрет вебхука",
	"нужен секрет вебхука",
	"настройка транспорта",
	"транспорт не готов",
	"Webhook Telegram",
]) {
	if (clientUiSource.includes(forbiddenCopy)) {
		missing.push(
			`Telegram UI still exposes operator-hostile technical copy: ${forbiddenCopy}`,
		);
	}
}

for (const readableCopy of [
	"В серверных настройках клиники не подключен бот Telegram.",
	"Проверьте подключение бота, сеть и связанный чат.",
	"секрет бота хранится в серверных настройках клиники",
	"если он включен в серверных настройках клиники",
	"<span>Бот клиники</span>",
	"Секрет бота хранится в серверных настройках и не показывается в приложении.",
	"подключенном боте и защищенной серверной связке",
	"Профиль бота клиники",
	"Адрес приема сообщений Telegram",
	"защита входящих сообщений включена",
	"нужно включить защиту входящих сообщений",
	"Публичный HTTPS-адрес CRM, который Telegram сможет открыть для входящих сообщений.",
	"отправка не готова",
	"нужна настройка отправки",
]) {
	if (!clientUiSource.includes(readableCopy)) {
		missing.push(`Telegram UI missing readable operator copy: ${readableCopy}`);
	}
}

for (const forbiddenCast of [
	"setTelegramModeDraft(event.target.value as DenteTelegramBotMode)",
	"setTelegramPrivacyModeDraft(event.target.value as DenteTelegramPrivacyMode)",
	"setTelegramLinkSubjectType(event.target.value as TelegramLinkSubjectType)",
	"setTelegramOutboxStatusFilter(event.target.value as TelegramOutboxStatusFilter)",
	"setTelegramOutboxTemplateFilter(event.target.value as TelegramOutboxTemplateFilter)",
]) {
	if (clientUiSource.includes(forbiddenCast))
		missing.push(
			`Telegram select still trusts raw DOM value: ${forbiddenCast}`,
		);
}

const appSnippets = [
	/*
	 * ВКЛАДКА ПЕРЕИМЕНОВАНА СОЗНАТЕЛЬНО, И ЭТО ЗАЩИЩЕНО ТЕСТОМ.
	 *
	 * Требование `{ id: "telegram", title: "ТГ-бот" }` снято не потому, что
	 * вкладка исчезла: AppHelpers.tsx:6121 объясняет переименование — за разделом
	 * давно живут ещё WhatsApp и MAX, и по названию «ТГ-бот» об этом никто не
	 * догадывался. Живая строка — AppHelpers.tsx:6151. Более того, требовать
	 * старое название теперь ЗАПРЕЩЕНО другим тестом:
	 * components/settings/settingsDeepLinks.test.ts:104 утверждает
	 * `assert.notEqual(settingsTabTitle(MESSENGERS_SETTINGS_TAB), "ТГ-бот")`.
	 * Страж, требующий «ТГ-бот», прямо противоречил бы этому тесту.
	 *
	 * Проверяется то, что важно и что ломалось раньше: идентификатор вкладки и её
	 * группа. Именно из-за отсутствия группы кнопка настроек Telegram однажды уже
	 * пропадала из левого меню молча (AppHelpers.tsx:6124-6134).
	 */
	'{ id: "telegram", title: "Мессенджеры", group: "main" }',
	/*
	 * А ВОТ ШАГ ОНБОРДИНГА «ТГ-бот» ЖИВ — AppHelpers.tsx:6183. Переименование
	 * доведено только до списка настроек, поэтому требование к нему оставлено
	 * отдельной строкой: если шаг переименуют вслед за вкладкой, страж упадёт и
	 * заставит обновить это место осознанно, а не молча.
	 */
	'{ id: "telegram", title: "ТГ-бот", detail: "бот, QR и отзывы" }',
	"type DenteTelegramBotStatus",
	"type DenteTelegramChatLinkListResponse",
	"type DenteTelegramChatLinkPublic",
	"type DenteTelegramLinkCodeCreated",
	"type DenteTelegramLinkCodeListResponse",
	"type DenteTelegramLinkCodePublic",
	"type DenteTelegramOutboxSendDueResponse",
	"loadTelegramControlPlane",
	"telegramStatusEndpoint",
	'return "/api/telegram/status";',
	"/api/telegram/status/${encodeURIComponent(organizationId)}/${encodeURIComponent(botConfigId)}",
	"telegramBotConfigId",
	"setTelegramBotConfigId",
	"Профиль бота клиники",
	'fetch("/api/telegram/feature-plan"',
	"telegramOutboxRequestParams",
	"appendTelegramRuntimeScopeParams",
	"telegramOutboxActionQueryString",
	'params.set("organizationId", organizationId);',
	'params.set("botConfigId", botConfigId);',
	"new URLSearchParams()",
	"fetch(`/api/telegram/outbox?${outboxParams.toString()}`",
	"fetch(`/api/telegram/outbox/send-due${telegramOutboxActionQueryString()}`",
	"fetch(`/api/telegram/outbox/${encodeURIComponent(itemId)}/send${telegramOutboxActionQueryString()}`",
	'fetch("/api/telegram/link-codes"',
	"Дождитесь завершения текущего создания Telegram-кода.",
	"Данные клиники еще не загружены. Повторите создание Telegram-кода после загрузки рабочего экрана.",
	"fetch(`/api/telegram/chat-links?${chatLinkParams.toString()}`",
	"telegramLinkCodeLedgerRequestParams",
	"telegramChatLinkLedgerRequestParams",
	"appendTelegramRuntimeScopeParams(params);",
	"organizationId: dashboard.clinicSettings.profile.organizationId",
	'botConfigId: telegramModeDraft === "clinic_owned_bot" ? telegramBotConfigId.trim() || undefined : undefined',
	"setTelegramLinkCodes",
	"setTelegramChatLinks",
	"setTelegramLinkCodeLedger",
	"setTelegramChatLinkLedger",
	"telegramLinkCodes",
	"telegramChatLinks",
	"telegramLinkCodeLedger?.nextCursor",
	"telegramChatLinkLedger?.nextCursor",
	"loadMoreTelegramLinkCodes",
	"loadMoreTelegramChatLinks",
	"telegramRevokingLinkId",
	"revokeTelegramChatLink",
	"Дождитесь завершения текущего отзыва Telegram-связки.",
	'disabled={link.status !== "active" || Boolean(telegramRevokingLinkId)}',
	"fetch(`/api/telegram/chat-links/${encodeURIComponent(linkId)}/revoke${telegramOutboxActionQueryString()}`",
	"telegram-link-ledger",
	"telegram-link-ledger-row",
	"telegram-link-ledger-codes",
	"clinicId: dashboard.clinicSettings.profile.organizationId",
	"telegramQrSvgToDataUrl",
	"telegramLinkCode.qrSvg",
	"telegramOutbox",
	"telegramOutbox?.dueCount",
	"telegramOutbox?.filteredCount",
	"typedTelegramOutbox.totalCount",
	"const telegramOutboxRemainingCount = typedTelegramOutbox",
	"typedTelegramOutbox.filteredCount - typedVisibleTelegramOutboxItems.length",
	"telegramOutboxRemainingCount > 0 || typedTelegramOutbox?.nextCursor",
	"telegramOutbox?.nextCursor",
	"telegramOutboxStatusFilter",
	"telegramOutboxTemplateFilter",
	"normalizedTelegramBotMode",
	"normalizedTelegramPrivacyMode",
	"normalizedTelegramLinkSubjectType",
	"normalizedTelegramOutboxStatusFilter",
	"normalizedTelegramOutboxTemplateFilter",
	"loadMoreTelegramOutbox",
	"isTelegramOutboxLoadingMore",
	"filteredTelegramOutboxItems",
	"visibleTelegramOutboxItems",
	"setTelegramOutboxStatusFilter",
	"setTelegramOutboxTemplateFilter",
	"telegramLinkStaffOptions",
	/*
	 * Живая форма — useAppLogic.tsx:4656-4660. Между `staff` и `.filter` теперь
	 * стоит `|| []`, то есть отсутствие списка сотрудников больше не роняет
	 * подбор: это защита, а не регресс, и терпимый шаблон её перепрыгнуть не
	 * может (вставлено выражение, а не пробел). Требование «варианты связки — это
	 * только активные сотрудники» сохранено дословно.
	 */
	"(dashboard?.clinicSettings?.staff || []).filter(",
	"(member) => member.active,",
	"Нет активных сотрудников",
	"isTelegramOutboxItemDueForUi",
	"telegramSendingItemId",
	"sendTelegramOutboxItem",
	"sendDueTelegramOutbox",
	"isTelegramSendingDue",
	"Дождитесь завершения текущей отправки Telegram.",
	"Telegram: готовых сообщений к отправке нет.",
	"isTelegramSendingDue || Boolean(telegramSendingItemId)",
	"telegramModeDraft",
	"telegramOwnBotUsernameDraft",
	/*
	 * Переменной `initialUiPreferences` больше нет: засев состояния идёт
	 * выражением `(loadUiPreferences() ?? defaultUiPreferences).<поле>` прямо в
	 * литерале initialSettingsState (store/settingsStore.ts:197 и :189). Это тот
	 * самый засев на этапе вычисления модуля, который описан в
	 * .agents/AGENTS.md, правило 11. Требование — «поле засевается из сохранённых
	 * настроек с падением на значения по умолчанию» — сохранено полностью.
	 */
	"(loadUiPreferences() ?? defaultUiPreferences).telegramBotConfigId",
	"telegramBotUsernameDraft",
	"telegramWebhookBaseUrlDraft",
	"telegramPatientPortalBaseUrlDraft",
	"telegramWelcomeImageUrlDraft",
	"telegramVisualCardUrlDrafts",
	"telegramVisualCardFields",
	"updateTelegramVisualCardUrlDraft",
	"telegramPostVisitCheckupDelayFields",
	"telegramPostVisitCheckupDelayDrafts",
	"updateTelegramPostVisitCheckupDelayDraft",
	"onboardingTelegramVisualCardKeys",
	"telegramReviewUrlDraft",
	"telegramMapsUrlDraft",
	"telegramEnabledFeaturesDraft",
	"telegramPrivacyModeDraft",
	"telegramReminderLeadTimesDraft",
	"telegramReviewRequestDelayDraft",
	"telegramSettingsDirty",
	"telegramSettingsSaveState",
	"telegramAdminSecretDraft",
	"telegramAdminSecretSession",
	"telegramControlPlaneHeaders",
	'"x-dente-admin-secret"',
	"unlockTelegramAdminSession",
	"lockTelegramAdminSession",
	"telegramFeatureLabels",
	"telegramFeatureHelp",
	"toggleTelegramFeature",
	"saveTelegramSettings",
	"patientLinkTokenTtlMinutes",
	"normalizeTelegramPublicHttpsUrlDraft",
	"normalizeTelegramVisualCardUrlDraftsForSave",
	"welcomeImageUrl,",
	"visualCardUrls,",
	"appointmentReminderLeadTimesHours",
	"reviewRequestDelayHours",
	"parseTelegramReviewRequestDelayHours",
	"Просьба оценить клинику",
	"postVisitCheckupDelayHoursByTopic",
	"Контроль после лечения",
	"enabledFeatures: telegramEnabledFeaturesDraft",
	"privacyMode: telegramPrivacyModeDraft",
	'telegramPrivacyModeDraft === "consented_phi_templates"',
	'value="consented_phi_templates" disabled',
	"Изменения будут сохранены автоматически",
	"telegram-outbox-panel",
	"telegram-outbox-controls",
	"telegram-outbox-summary-actions",
	"telegram-outbox-actions",
	"telegram-external-links",
	"telegram-visual-card-fields",
	"telegram-checkup-delay-fields",
	"onboarding-telegram-visual-cards",
	"telegram-settings-form",
	"telegram-feature-grid",
	"telegram-settings",
	"previewTelegramTemplate",
	"Выберите активного пациента перед предпросмотром Telegram-сообщения.",
	"Выберите сотрудника перед предпросмотром Telegram-дайджеста.",
	"telegramInlineButtonsFromPreview",
	"telegramInlineButtonsFromReplyMarkup",
	"telegramInlineButtonRowsFromReplyMarkup",
	"telegramInlineButtonKindLabels",
	"getTypedTelegramInlineButtonRows(typedTelegramPreview.replyMarkup)",
	"getTypedTelegramInlineButtonRows(item.replyMarkup)",
	"telegramLinkCodeStatusLabels",
	"telegramLinkSubjectType: TelegramLinkSubjectType",
	"telegramLinkStaffId: string | null",
	"(loadUiPreferences() ?? defaultUiPreferences).telegramLinkSubjectType",
	"telegramLinkStaffId: telegramLinkStaffId || null",
	"telegramLinkTargetKey",
	"previousTelegramLinkTargetKeyRef",
	"setTelegramLinkActionState",
	"copyTelegramTextToClipboard",
	"пустой. Сначала создайте новый Telegram-код или проверьте настройки бота.",
	"navigator.clipboard?.writeText",
	"downloadTelegramQrSvg",
	"QR-код недоступен. Используйте текстовый код или создайте новый Telegram-код.",
	"dente-telegram-qr-${telegramLinkCode.codeLast4}.svg",
	"disabled={!telegramLinkCode.code.trim()}",
	"disabled={!telegramLinkCode.shareText.trim()}",
	"telegram-link-actions",
	"telegram-link-action-state",
	"telegramHumanMessage(item.blockedReason)",
	"item.warnings.map((warning) => telegramHumanMessage(warning)).filter(Boolean)",
	"telegram-inline-button-row",
	"telegram-outbox-buttons",
	"telegram-outbox-notes",
	"telegram-preview-buttons",
	"telegram-visual-card-indicator",
	"telegram-visual-card-preview",
	'"payment_reminder_notice"',
	'"review_request"',
	'"post_visit_checkup"',
	'"recall_notice"',
	'"staff_daily_digest"',
	"staffId: isStaffPreview ? staffId : undefined",
	"fetch(`/api/telegram/messages/preview${telegramOutboxActionQueryString()}`",
];

const sharedSnippets = [
	"qrSvg",
	"shareText",
	'telegramLinkSubjectType: denteTelegramSubjectTypeSchema.default("patient")',
	'telegramBotConfigId: z.string().trim().max(160).default("")',
	"telegramLinkStaffId: z.string().uuid().nullable().default(null)",
	"clinicReviewUrl",
	"clinicMapsUrl",
	"reviewRequestDelayHours",
	"welcomeImageUrl",
	"visualCardUrls",
	"denteTelegramVisualCardUrlsSchema",
	"denteTelegramPostVisitCheckupDelayHoursByTopicSchema",
	'"review_requests"',
	'status: z.enum(["processing", "processed", "duplicate", "ignored", "rejected"])',
	"denteTelegramLinkCodeCreatedSchema",
	'botConfigId: z.string().trim().min(1).max(160).default("default")',
	"botConfigId: z.string().trim().min(1).max(160).optional()",
	"denteTelegramLinkCodeListResponseSchema",
	"denteTelegramChatLinkListResponseSchema",
	"denteTelegramOutboxResponseSchema",
	"denteTelegramAppointmentCallbackActionSchema",
	"denteTelegramAppointmentCallbackResultSchema",
	"denteTelegramOutboxSendRequestSchema",
	"denteTelegramOutboxSendResponseSchema",
	"denteTelegramOutboxSendDueResponseSchema",
	"totalCount: z.number().int().nonnegative()",
	"filteredCount: z.number().int().nonnegative()",
	"nextCursor: z.string().nullable()",
	"pendingCount: z.number().int().nonnegative()",
	"activeCount: z.number().int().nonnegative()",
	"dueCount: z.number().int().nonnegative()",
	"notDueCount: z.number().int().nonnegative()",
	"replyMarkup: z.record(z.unknown()).nullable()",
	"photoUrl: z.string().url().nullable().default(null)",
	'"payment_reminder"',
	'"recall"',
	'"payment_reminder_notice"',
	'"post_visit_checkup"',
	'"recall_notice"',
];
const apiSnippets = [
	"createTelegramQrSvg",
	"resolveDenteTelegramClinicId",
	"validateDenteTelegramSubject(input.subjectType, input.subjectId, organizationId)",
	"patient.organizationId === organizationScope",
	"staff.organizationId === organizationScope",
	"resolveDenteTelegramClinicId(input.clinicId, organizationId)",
	"deepLink",
	"shareText",
	"buildDenteTelegramOutbox",
	"buildDenteTelegramLinkCodeList",
	"buildDenteTelegramChatLinkList",
	"denteTelegramOutboxItemMatchesStatus",
	"filteredCount: filteredItems.length",
	"filteredCount: filteredCodes.length",
	"filteredCount: filteredLinks.length",
	"nextCursor",
	"buildDenteTelegramLinkedScheduleReply",
	"telegramScheduleVisibleStatuses",
	"encryptTelegramChatId",
	"prepareDenteTelegramOutboxDelivery",
	"claimDenteTelegramWebhookUpdate",
	"recordDenteTelegramOutboxDelivery",
	"telegramOutboxItemAlreadySent",
	"postVisitCheckupDelayHoursByTopic",
	"notDueCount: readyItems.length - dueCount",
	'blockedReason: "telegram_outbox_already_sent"',
	"replyMarkup,",
	"replyMarkup: item.replyMarkup",
	"replyMarkup: preview.allowedByDefault ? telegramReplyMarkupFor(input.templateKind, input.appointmentId ?? null, settings) : null",
	"photoUrl: preview.allowedByDefault ? photoUrl : null",
	"normalizeDenteTelegramAppointmentCallbackScope",
	"scoped.organizationId}:${scoped.clinicId}:${scoped.botConfigId}",
	"parseDenteTelegramAppointmentCallbackData(input.callbackData, callbackScope)",
	"clinicId?: string | null;",
	"buildDenteTelegramAppointmentCallbackData",
	"telegramScheduleReplyMarkupForPatientAppointment",
	"handleDenteTelegramAppointmentCallback",
	"appointmentId: input.appointmentId ?? input.task?.appointmentId ?? null",
	"entityId: input.item.id",
	"safeHttpsUrl",
	"export function safeDenteTelegramPublicHttpsUrl(",
	"configuredClinicTelegramBotFromJson",
	"DENTE_TELEGRAM_CLINIC_BOTS_JSON",
	"configuredTelegramBotConfigId",
	"normalizeDenteTelegramBotScopedLedgers",
	"linkCode.botConfigId === options.botConfigId",
	"link.botConfigId === options.botConfigId",
	"link.botConfigId === runtime.botConfigId",
	'normalizeTelegramPublicHttpsUrl("webhookBaseUrl"',
	"clinicReviewUrl",
	"clinicMapsUrl",
	"welcomeImageUrl",
	"visualCardUrls",
	"denteTelegramVisualCardUrlForTemplate",
	"denteTelegramMainMenuRow",
	"createDenteTelegramContactRequest",
	"createDenteTelegramDocumentRequest",
	"createDenteTelegramCareRequest",
	"findExistingTelegramDocumentRequestTask",
	"function findExistingTelegramDocumentRequestTask(\n  organizationScope: string,",
	"findExistingTelegramCareRequestTask",
	"function findExistingTelegramCareRequestTask(\n  organizationScope: string,",
	"findIssuedTelegramCareDocument",
	"function findIssuedTelegramCareDocument(\n  organizationScope: string,",
	"function findExistingTelegramContactRequestTask(organizationScope: string, patientId: string)",
	"const organizationScope = chatLink.organizationId;",
	"candidate.organizationId === organizationScope",
	"task.organizationId === organizationScope",
	"document.organizationId === organizationScope",
	"organizationId: organizationScope",
	"organizationId?: string | null | undefined;",
	"organizationId: input.organizationId?.trim() || organizationId",
	"telegram_tax_document_request_created",
	"telegram_billing_document_request",
	"telegram_billing_document_request_created",
	"telegram_medical_document_request_created",
	"telegram_patient_forms_request_created",
	"telegram_care_implant_request_created",
	"telegram_care_filling_request",
	"telegram_care_endo_request",
	"telegram_care_surgery_request",
	"telegram_care_anesthesia_request",
	"telegram_care_hygiene_request",
	"telegram_care_prosthetics_request",
	"telegram_care_orthodontics_request",
	"telegram_care_periodontology_request",
	"telegram_care_filling_request_created",
	"telegram_care_endo_request_created",
	"telegram_care_surgery_request_created",
	"telegram_care_anesthesia_request_created",
	"telegram_care_hygiene_request_created",
	"telegram_care_prosthetics_request_created",
	"telegram_care_orthodontics_request_created",
	"telegram_care_periodontology_request_created",
	"buildDenteTelegramPaymentReminderItems",
	"buildDenteTelegramRecallItems",
	"reviewRequestOutboxIdForVisit",
	"normalizeReviewRequestDelayHours",
	"reviewRequestClosedVisitCandidates",
	"reviewRequestScheduledAtForVisit",
	"reviewRequestVisitIsClosedByVisit",
	"payment_reminder_notice",
	"recall_notice",
	"review_request",
	"post_visit_checkup",
	'if (templateKind === "document_ready_notice")',
	'if (templateKind === "tax_document_request_status")',
	'if (templateKind === "post_visit_instruction_link" || templateKind === "post_visit_checkup")',
	"Оценить клинику",
];
const telegramRouteSnippets = [
	'"/api/telegram/outbox/:itemId/send"',
	'"/api/telegram/outbox/send-due"',
	"parseTelegramOutboxQuery",
	"parseTelegramLinkCodeListQuery",
	"parseTelegramChatLinkListQuery",
	"denteTelegramLinkCodeStatusSchema",
	"denteTelegramChatLinkStatusSchema",
	"denteTelegramSubjectTypeSchema",
	"denteTelegramOutboxDeliveryStatusSchema",
	"denteTelegramTemplateKindSchema",
	"parseTelegramOutboxSendDueInput",
	"dueOutboxClientMutationId",
	"isDenteTelegramOutboxItemDue",
	"denteTelegramOutboxSendRequestSchema",
	"denteTelegramOutboxSendDueResponseSchema.parse",
	"sendTelegramTextMessage",
	"sendTelegramPhotoMessage",
	"postVisitCheckupDelayHoursFromEnvConfig",
	"reviewRequestDelayHoursFromEnvConfig",
	"postVisitCheckupDelayHoursByTopic",
	"prepared.photoUrl",
	"telegramPhotoFallbackWarning",
	"telegramOutboxTransportFailureWarning",
	"telegramWebhookReplyFailureWarning",
	"telegramCallbackTransportFailureWarning",
	"retryAfterSeconds",
	"buildDenteTelegramLinkedScheduleReply",
	"scheduleReply.replyMarkup",
	"handleDenteTelegramAppointmentCallback",
	"clinicId: runtime.clinicId",
	"createDenteTelegramContactRequest",
	"createDenteTelegramDocumentRequest",
	"createDenteTelegramCareRequest",
	'createDenteTelegramDocumentRequest(chatFingerprintValue, "tax", scope)',
	'createDenteTelegramDocumentRequest(chatFingerprintValue, "billing", scope)',
	'createDenteTelegramDocumentRequest(chatFingerprintValue, "medical", scope)',
	'createDenteTelegramDocumentRequest(chatFingerprintValue, "patientForms", scope)',
	"createDenteTelegramCareRequest(chatFingerprintValue, callbackCareTopic, scope)",
	"telegramCareCallbackTopicByAction",
	"careTopicFromFreeText",
	"patientMenuCardPhoto",
	"Отсканируйте QR из приложения клиники",
	"Получить QR в клинике",
	"показать новый QR подключения",
	"documentSubmenuReplyFor",
	"careTopicReplyFor",
	"extractCallbackData",
	"replyMarkupWithNextActions",
	"telegramInlineKeyboardRows",
	"clinicOwnedBotReady",
	"DENTE_TELEGRAM_CLINIC_BOTS_JSON",
	"parseTelegramOutboxRuntimeScopeQuery",
	"resolveTelegramOutboxRuntimeScopeFromQuery",
	"denteTelegramOutboxRuntimeScope",
	"runtimeScope: denteTelegramOutboxRuntimeScope(runtime)",
	"renderDenteTelegramMessagePreview(input, runtimeResult.runtime.context.settings)",
	"buildDenteTelegramOutbox(parseTelegramOutboxQuery(request.query), runtimeResult.runtime.runtimeScope)",
	"executeTelegramOutboxSend(request.params.itemId, parsedInput.value, runtimeResult.runtime)",
	"executeDenteTelegramOutboxDueBatch(input, runtimeResult.runtime)",
	"runtimeSettingsForRequestedOrganization",
	"visualCardUrlsFromEnvConfig",
	'safeDenteTelegramPublicHttpsUrl("patientPortalBaseUrl"',
	'safeDenteTelegramPublicHttpsUrl("clinicReviewUrl"',
	"denteTelegramVisualCardUrlFor",
	"requestedClinicId && requestedClinicId !== runtime.clinicId",
	"consumeDenteTelegramLinkCode(linkCode, chatHash, chatId, {",
	"buildDenteTelegramLinkCodeList({",
	"buildDenteTelegramChatLinkList({",
	"revokeDenteTelegramChatLink(request.params.linkId, {",
	"botConfigId: runtime.botConfigId",
	"clinicId: runtime.clinicId",
	'"/api/telegram/status/:organizationId"',
	'"/api/telegram/status/:organizationId/:botConfigId"',
	'"/api/telegram/webhook/:organizationId/:botConfigId"',
	"readableTelegramSettingsValidationMessage(settingsError)",
	"telegramSettingsReasonLabels",
	"Подписанные кнопки приема отключены; включите секрет подписанных кнопок в серверных настройках.",
	"dente:schedule",
	"dente:documents",
	"dente:tax",
	"dente:billing",
	"dente:medical-docs",
	"dente:patient-forms",
	"dente:care",
	"dente:care-extraction",
	"dente:care-implant",
	"dente:care-filling",
	"dente:care-endo",
	"dente:care-surgery",
	"dente:care-anesthesia",
	"dente:care-hygiene",
	"dente:care-prosthetics",
	"dente:care-orthodontics",
	"dente:care-periodontology",
	"dente:contact",
	"/schedule",
	"configuredSendTimeoutMs",
	"telegramOutboxDeliveryClaims",
	"client_mutation_id_required",
	"telegram_delivery_in_progress",
	"repairMojibakeText(prepared.text)",
	"включите секрет подписанных кнопок в серверных настройках",
];
const telegramTransportSnippets = [
	"https://api.telegram.org/bot",
	"sendMessage",
	"sendPhoto",
	"protect_content: true",
	"link_preview_options",
	"AbortController",
];
const qrSnippets = [
	"QR_VERSION = 4",
	"reedSolomonRemainder",
	"createTelegramQrSvg",
];
const dbSnippets = [
	'taxPayerInn: text("tax_payer_inn")',
	'payloadJson: text("payload_json")',
	'welcomeImageUrl: text("welcome_image_url")',
	'visualCardUrls: jsonb("visual_card_urls").$type<DenteTelegramVisualCardUrls | null>()',
	'reviewRequestDelayHours: integer("review_request_delay_hours").notNull().default(2)',
	'postVisitCheckupDelayHoursJson: text("post_visit_checkup_delay_hours_json")',
];
const migrationSnippets = [
	'"tax_payer_inn"',
	'"payload_json"',
	'"welcome_image_url"',
	'"visual_card_urls"',
	'"post_visit_checkup_delay_hours_json"',
	'"review_request_delay_hours"',
];

for (const snippet of appSnippets) {
	if (!sourceHasSnippet(clientUiSource, snippet))
		missing.push(`client UI missing ${snippet}`);
}
for (const snippet of sharedSnippets) {
	if (!sourceHasSnippet(sharedSource, snippet))
		missing.push(`shared schema missing ${snippet}`);
}
for (const snippet of apiSnippets) {
	if (!sourceHasSnippet(apiSource, snippet))
		missing.push(`sampleData missing ${snippet}`);
}
for (const snippet of telegramRouteSnippets) {
	if (!sourceHasSnippet(telegramRoutesSource, snippet))
		missing.push(`telegram routes missing ${snippet}`);
}
for (const rawEnvUrlPattern of [
	"webhookBaseUrl: stringFromEnvConfig(record.webhookBaseUrl)",
	"patientPortalBaseUrl: stringFromEnvConfig(record.patientPortalBaseUrl)",
	"welcomeImageUrl: stringFromEnvConfig(record.welcomeImageUrl)",
	"clinicReviewUrl: stringFromEnvConfig(record.clinicReviewUrl)",
	"clinicMapsUrl: stringFromEnvConfig(record.clinicMapsUrl)",
	'assign("documents", stringFromEnvConfig(source.documents)',
	'assign("tax", stringFromEnvConfig(source.tax)',
	'assign("staff", stringFromEnvConfig(source.staff)',
]) {
	if (telegramRoutesSource.includes(rawEnvUrlPattern)) {
		missing.push(
			`clinic-owned bot env URL bypasses public URL normalizer: ${rawEnvUrlPattern}`,
		);
	}
}
for (const snippet of telegramTransportSnippets) {
	if (!telegramTransportSource.includes(snippet))
		missing.push(`telegram transport missing ${snippet}`);
}
for (const snippet of qrSnippets) {
	if (!qrSource.includes(snippet))
		missing.push(`telegramQr missing ${snippet}`);
}
for (const snippet of dbSnippets) {
	if (!dbSource.includes(snippet)) missing.push(`db schema missing ${snippet}`);
}
for (const snippet of migrationSnippets) {
	if (!migrationSource.includes(snippet))
		missing.push(`migration missing ${snippet}`);
}
if (
	!styleSource.includes(".telegram-status-grid") ||
	!styleSource.includes(".telegram-link-result img") ||
	!styleSource.includes(".telegram-link-ledger") ||
	!styleSource.includes(".telegram-link-ledger-row") ||
	!styleSource.includes(".telegram-link-ledger-codes") ||
	!styleSource.includes(".telegram-outbox-controls") ||
	!styleSource.includes(".telegram-outbox-item") ||
	!styleSource.includes(".telegram-inline-button-row") ||
	!styleSource.includes(".telegram-outbox-buttons") ||
	!styleSource.includes(".telegram-outbox-notes") ||
	!styleSource.includes(".telegram-outbox-actions") ||
	!styleSource.includes(".telegram-visual-card-indicator") ||
	!styleSource.includes(".telegram-visual-card-preview") ||
	!styleSource.includes(".telegram-visual-card-fields") ||
	!styleSource.includes(".onboarding-telegram-visual-cards") ||
	!styleSource.includes(".telegram-settings-form") ||
	!styleSource.includes(".telegram-feature-grid") ||
	!styleSource.includes(".telegram-save-state") ||
	!styleSource.includes(".telegram-external-links") ||
	!styleSource.includes(".telegram-preview-buttons")
) {
	missing.push("Telegram UI styles missing");
}

if (
	clientUiSource.includes(
		'telegramWarningLabels[value] ?? value.replaceAll("_", " ")',
	)
) {
	missing.push("Telegram human fallback still exposes raw underscore keys");
}
if (
	!clientUiSource.includes("if (!/^[a-z0-9_.:-]+$/.test(value)) return value;")
) {
	missing.push(
		"Telegram human fallback must show already human-readable API warnings",
	);
}

for (const rawTelegramSettingsMessage of [
	'message: settingsError instanceof Error ? settingsError.message : "telegram_settings_invalid"',
	"telegram_appointment_callback_secret_missing",
	"DENTE_TELEGRAM_CALLBACK_SECRET или DENTE_TELEGRAM_WEBHOOK_SECRET нужен",
	"настройте DENTE_TELEGRAM_CALLBACK_SECRET или DENTE_TELEGRAM_WEBHOOK_SECRET",
]) {
	if (
		apiSource.includes(rawTelegramSettingsMessage) ||
		telegramRoutesSource.includes(rawTelegramSettingsMessage)
	) {
		missing.push(
			`Telegram server can expose raw settings/callback copy: ${rawTelegramSettingsMessage}`,
		);
	}
}

for (const rawTelegramTransportWarning of [
	"telegram_photo_caption_split_text_",
	"telegram_photo_fallback_",
	"photo_retry_after_seconds:",
	"telegram_transport_${",
	"retry_after_seconds:",
	"Ответ Telegram не отправлен: ${result.errorClass",
	"Ответ на Telegram-кнопку не отправлен: ${callbackAnswer.errorClass",
]) {
	if (telegramRoutesSource.includes(rawTelegramTransportWarning)) {
		missing.push(
			`Telegram server can expose raw transport copy: ${rawTelegramTransportWarning}`,
		);
	}
}

for (const rawSettingsReason of [
	"invalid_url",
	"https_required",
	"credentials_not_allowed",
	"invalid_path_encoding",
	"patient_identifying_path_not_allowed",
	"patient_identifying_path_value_not_allowed",
	"patient_identifying_query_not_allowed",
	"patient_identifying_query_value_not_allowed",
]) {
	if (!telegramRoutesSource.includes(`${rawSettingsReason}:`)) {
		missing.push(
			`Telegram settings validation humanizer missing ${rawSettingsReason}`,
		);
	}
}

if (
	/localStorage\.[gs]etItem\([^)]*telegramAdminSecret/i.test(clientUiSource)
) {
	missing.push("Telegram admin secret must not be persisted in localStorage");
}

if (missing.length) {
	console.error(JSON.stringify({ ok: false, missing }, null, 2));
	process.exit(1);
}

console.log(
	JSON.stringify(
		{
			ok: true,
			checked:
				"telegram control UI, safe send route, QR package, and document payload DB columns",
			tokenPatternHits: 0,
		},
		null,
		2,
	),
);
