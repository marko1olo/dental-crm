import type { FastifyInstance } from "fastify";
import { requireClinicalReadAccess } from "../accessGuard.js";
import {
  localBridgeReadinessResponseSchema,
  localBridgeUsePlansResponseSchema,
  type LocalBridgeKind,
  type LocalBridgeReadinessItem,
  type LocalBridgeReadinessResponse,
  type LocalBridgeUsePath,
  type LocalBridgeUsePlan,
  type LocalBridgeUsePlanStep
} from "@dental/shared";
import { buildPersistentStateExport, getPersistentStateIntegrityReport } from "../persistentState.js";
import { recordAuditEvent } from "../sampleData.js";
import { getSpeechGatewayStatus } from "../speech/gateway.js";

function timestampForDownloadName(value = new Date()): string {
  return value.toISOString().slice(0, 19).replace(/[-:T]/g, "");
}

type LocalBridgeDefinition = {
  kind: LocalBridgeKind;
  title: string;
  acceptedEnvVars: string[];
  defaultHealthPath: string;
  deriveHealthFromConfiguredPath?: boolean;
  role: string;
  workload: string;
  privacyBoundary: string;
  setupHint: string;
};

const localBridgeTimeoutMs = 1400;

class LocalBridgeUrlProtocolError extends Error {}

const localBridgeDefinitions: LocalBridgeDefinition[] = [
  {
    kind: "speech_whisper",
    title: "Локальная диктовка Whisper.cpp",
    acceptedEnvVars: [
      "DENTAL_LOCAL_WHISPER_HEALTH_URL",
      "DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL",
      "DENTAL_LOCAL_WHISPER_URL",
      "WHISPER_CPP_HEALTH_URL",
      "WHISPER_CPP_TRANSCRIBE_URL",
      "WHISPER_CPP_URL",
      "LOCAL_WHISPER_HEALTH_URL",
      "LOCAL_WHISPER_TRANSCRIBE_URL",
      "LOCAL_WHISPER_URL"
    ],
    defaultHealthPath: "/health",
    deriveHealthFromConfiguredPath: true,
    role: "офлайн-распознавание диктовки",
    workload: "локальные аудиофрагменты без облачной оплаты распознавания",
    privacyBoundary: "аудио остается на рабочей станции или локальном сервере клиники",
    setupHint: "Запустите локальный модуль Whisper.cpp и укажите его адрес в серверных настройках."
  },
  {
    kind: "speech_vosk",
    title: "Локальное распознавание Vosk",
    acceptedEnvVars: [
      "DENTAL_VOSK_HEALTH_URL",
      "DENTAL_VOSK_TRANSCRIBE_URL",
      "DENTAL_VOSK_URL",
      "VOSK_HEALTH_URL",
      "VOSK_TRANSCRIBE_URL",
      "VOSK_SERVER_URL",
      "LOCAL_VOSK_HEALTH_URL",
      "LOCAL_VOSK_TRANSCRIBE_URL",
      "LOCAL_VOSK_URL"
    ],
    defaultHealthPath: "/health",
    deriveHealthFromConfiguredPath: true,
    role: "офлайн-диктовка и резерв для команд",
    workload: "легкое локальное распознавание речи на слабых ПК",
    privacyBoundary: "аудио остается внутри локального модуля Vosk",
    setupHint: "Запустите модуль Vosk и укажите его адрес в серверных настройках."
  },
  {
    kind: "dicom_cbct",
    title: "Локальный обработчик КЛКТ/КТ",
    acceptedEnvVars: ["DENTAL_DICOM_BRIDGE_URL", "DICOM_LOCAL_BRIDGE_URL", "DENTAL_DICOM_WORKER_URL"],
    defaultHealthPath: "/health",
    role: "подготовка КЛКТ/КТ-срезов и быстрая загрузка просмотра",
    workload: "серии КЛКТ/КТ, КТ-срезы, панорамная реконструкция и локальная подготовка просмотра",
    privacyBoundary: "тяжелые данные КЛКТ/КТ остаются в локальном просмотрщике или обработчике; CRM хранит список серии и состояние инструментов",
    setupHint: "Запустите локальный КЛКТ/КТ-обработчик или внешний просмотр и укажите его адрес в серверных настройках."
  },
  {
    kind: "ocr_vision",
    title: "Локальный OCR / Tesseract",
    acceptedEnvVars: ["DENTAL_OCR_BRIDGE_URL", "OCR_LOCAL_BRIDGE_URL", "TESSERACT_BRIDGE_URL"],
    defaultHealthPath: "/health",
    role: "офлайн OCR для PDF, фотографий и таблиц",
    workload: "сканы PDF, фото прайс-листов, бумажные журналы",
    privacyBoundary: "изображения документов остаются в локальном OCR-модуле",
    setupHint: "Запустите локальный OCR-обработчик и укажите его адрес в серверных настройках."
  },
  {
    kind: "ohif_viewer",
    title: "Внешний КТ-просмотрщик",
    acceptedEnvVars: ["DENTAL_OHIF_URL", "OHIF_BASE_URL"],
    defaultHealthPath: "/",
    role: "передача в диагностический просмотрщик",
    workload: "полный просмотрщик архива снимков вне экрана ведения приема",
    privacyBoundary: "исходные снимки остаются в просмотрщике; CRM только запускает и восстанавливает состояние",
    setupHint: "Настройте внешний просмотр поверх архива снимков и укажите его адрес в серверных настройках."
  },
  {
    kind: "migration_staging",
    title: "Локальный модуль миграции старых МИС",
    acceptedEnvVars: ["DENTAL_MIGRATION_BRIDGE_URL", "DENTAL_DB_BRIDGE_URL", "DENTAL_LEGACY_BRIDGE_URL"],
    defaultHealthPath: "/health",
    role: "разбор только для чтения для старых БД, сетевых папок и экспортов",
    workload: "старые базы, резервные копии, табличные выгрузки и списки ссылок на снимки",
    privacyBoundary: "старые базы пациентов, снимки и файлы клиники остаются на локальной машине или сервере клиники; CRM получает только проверочный список или табличный предпросмотр",
    setupHint: "Запустите локальный модуль миграции на машине администратора и укажите его адрес в серверных настройках."
  }
];

function envValue(names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

function bridgeRemoteProbeAllowed(): boolean {
  return /^(1|true|yes)$/i.test((process.env.DENTAL_ALLOW_REMOTE_LOCAL_BRIDGES ?? "").trim());
}

function isPrivateBridgeHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "::1" || host === "[::1]" || host.endsWith(".local")) return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d{1,2})\./);
  if (match) {
    const block = Number(match[1]);
    return block >= 16 && block <= 31;
  }
  return false;
}

function redactedUrl(url: URL): string {
  const copy = new URL(url.toString());
  copy.username = "";
  copy.password = "";
  copy.search = "";
  copy.hash = "";
  return copy.toString();
}

function healthUrl(rawUrl: string, defaultHealthPath: string, deriveHealthFromConfiguredPath = false): URL {
  const url = new URL(rawUrl);
  if (!/^https?:$/.test(url.protocol)) {
    throw new LocalBridgeUrlProtocolError();
  }
  const cleanPath = url.pathname.replace(/\/+$/g, "");
  if (!cleanPath) {
    url.pathname = defaultHealthPath;
  } else if (deriveHealthFromConfiguredPath && !/\/(?:health|healthz|status)$/i.test(cleanPath)) {
    if (/\/v1\/audio\/transcriptions$/i.test(cleanPath)) {
      url.pathname = `${cleanPath.replace(/\/v1\/audio\/transcriptions$/i, "")}${defaultHealthPath}`;
    } else {
      url.pathname = `${cleanPath}${defaultHealthPath}`;
    }
  }
  return url;
}

function localBridgeUrlWarning(error: unknown): string {
  if (error instanceof LocalBridgeUrlProtocolError) {
    return "Для локального модуля поддерживаются только URL http/https.";
  }
  return "Адрес локального модуля не читается. Проверьте URL в серверных настройках.";
}

function localBridgeProbeWarning(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return `Локальный модуль не ответил за ${localBridgeTimeoutMs} мс; проверьте, что служба запущена и доступна с сервера клиники.`;
  }
  return "Проверка локального модуля не завершилась; проверьте, что служба запущена и доступна с сервера клиники.";
}

async function probeBridge(definition: LocalBridgeDefinition, allowRemoteBridgeProbe: boolean): Promise<LocalBridgeReadinessItem> {
  const configuredUrl = envValue(definition.acceptedEnvVars);
  if (!configuredUrl) {
    return {
      kind: definition.kind,
      title: definition.title,
      status: "not_configured",
      configured: false,
      reachable: false,
      urlRedacted: null,
      setupSettingsCount: definition.acceptedEnvVars.length,
      latencyMs: null,
      role: definition.role,
      workload: definition.workload,
      privacyBoundary: definition.privacyBoundary,
      warnings: [],
      nextAction: definition.setupHint
    };
  }

  let url: URL;
  try {
    url = healthUrl(configuredUrl, definition.defaultHealthPath, definition.deriveHealthFromConfiguredPath);
  } catch (error) {
    return {
      kind: definition.kind,
      title: definition.title,
      status: "misconfigured",
      configured: true,
      reachable: false,
      urlRedacted: null,
      setupSettingsCount: definition.acceptedEnvVars.length,
      latencyMs: null,
      role: definition.role,
      workload: definition.workload,
      privacyBoundary: definition.privacyBoundary,
      warnings: [localBridgeUrlWarning(error)],
      nextAction: `Исправьте адрес локального модуля в серверных настройках. ${definition.setupHint}`
    };
  }

  const warnings: string[] = [];
  if (!allowRemoteBridgeProbe && !isPrivateBridgeHost(url.hostname)) {
    return {
      kind: definition.kind,
      title: definition.title,
      status: "blocked",
      configured: true,
      reachable: false,
      urlRedacted: redactedUrl(url),
      setupSettingsCount: definition.acceptedEnvVars.length,
      latencyMs: null,
      role: definition.role,
      workload: definition.workload,
      privacyBoundary: definition.privacyBoundary,
      warnings: ["Проверка удаленных локальных модулей отключена; по умолчанию проверяются только localhost и частная сеть клиники."],
      nextAction: "Используйте localhost/частный адрес локального модуля или разрешите проверку удаленного адреса в серверных настройках после проверки инфраструктуры."
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), localBridgeTimeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json,text/plain,*/*" },
      signal: controller.signal
    });
    const latencyMs = Date.now() - startedAt;
    if (response.ok) {
      return {
        kind: definition.kind,
        title: definition.title,
        status: "ready",
        configured: true,
        reachable: true,
        urlRedacted: redactedUrl(url),
        setupSettingsCount: definition.acceptedEnvVars.length,
        latencyMs,
        role: definition.role,
        workload: definition.workload,
        privacyBoundary: definition.privacyBoundary,
        warnings,
        nextAction: "Проверка доступности локального модуля прошла. Держите это как возможность администратора или локального рабочего места, а не как блокер приема."
      };
    }
    warnings.push(`Локальный модуль ответил кодом ${response.status}; проверьте адрес и страницу проверки.`);
    return {
      kind: definition.kind,
      title: definition.title,
      status: "unreachable",
      configured: true,
      reachable: false,
      urlRedacted: redactedUrl(url),
      setupSettingsCount: definition.acceptedEnvVars.length,
      latencyMs,
      role: definition.role,
      workload: definition.workload,
      privacyBoundary: definition.privacyBoundary,
      warnings,
      nextAction: "Проверьте, что локальный модуль запущен, отвечает и привязан к настроенному адресу и порту."
    };
  } catch (error) {
    warnings.push(localBridgeProbeWarning(error));
    return {
      kind: definition.kind,
      title: definition.title,
      status: "unreachable",
      configured: true,
      reachable: false,
      urlRedacted: redactedUrl(url),
      setupSettingsCount: definition.acceptedEnvVars.length,
      latencyMs: Date.now() - startedAt,
      role: definition.role,
      workload: definition.workload,
      privacyBoundary: definition.privacyBoundary,
      warnings,
      nextAction: "Запустите локальный модуль или продолжайте через облако, серверный режим либо ручной ввод; работа врача не блокируется."
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function buildLocalBridgeReadiness(): Promise<LocalBridgeReadinessResponse> {
  const allowRemoteBridgeProbe = bridgeRemoteProbeAllowed();
  const bridges = await Promise.all(localBridgeDefinitions.map((definition) => probeBridge(definition, allowRemoteBridgeProbe)));
  const configuredCount = bridges.filter((bridge) => bridge.configured).length;
  const readyCount = bridges.filter((bridge) => bridge.status === "ready").length;
  const warnings = bridges.flatMap((bridge) => bridge.warnings.map((warning) => `${bridge.title}: ${warning}`));
  const nextAction =
    readyCount > 0
      ? "Используйте готовые локальные модули для тяжелых и офлайн-задач; прием остается неблокирующим, очередь имеет приоритет."
      : configuredCount > 0
        ? "Настроенные локальные модули недоступны; используйте облачный или ручной режим и проверьте локальное рабочее место."
        : "Локальные модули пока не настроены; приложение продолжает работать через браузер, сервер и детерминированные разборщики.";

  return localBridgeReadinessResponseSchema.parse({
    generatedAt: new Date().toISOString(),
    allowRemoteBridgeProbe,
    configuredCount,
    readyCount,
    bridges,
    warnings,
    nextAction
  });
}

function readyBridge(readiness: LocalBridgeReadinessResponse, kind: LocalBridgeKind): LocalBridgeReadinessItem | null {
  return readiness.bridges.find((bridge) => bridge.kind === kind && bridge.status === "ready") ?? null;
}

function envConfigured(names: string[]): boolean {
  return names.some((name) => Boolean(process.env[name]?.trim()));
}

function numberedEnvConfigured(prefixes: string[], max = 20): boolean {
  for (const prefix of prefixes) {
    for (let index = 1; index <= max; index += 1) {
      if (process.env[`${prefix}_${index}`]?.trim()) return true;
    }
  }
  return false;
}

function groqVisionConfigured(): boolean {
  return (
    envConfigured(["GROQ_API_KEY", "GROQ_API_KEYS"]) ||
    numberedEnvConfigured(["GROQ_API_KEY"])
  );
}

function planStep(
  order: number,
  title: string,
  owner: LocalBridgeUsePlanStep["owner"],
  path: LocalBridgeUsePath,
  storesLocalFirst: boolean,
  blocking: boolean,
  detail: string
): LocalBridgeUsePlanStep {
  return { order, title, owner, path, storesLocalFirst, blocking, detail };
}

function buildVisitDictationPlan(readiness: LocalBridgeReadinessResponse): LocalBridgeUsePlan {
  const speech = getSpeechGatewayStatus();
  const whisper = readyBridge(readiness, "speech_whisper");
  const vosk = readyBridge(readiness, "speech_vosk");
  const localBridge = whisper ?? vosk;
  const serverSttAvailable = speech.serverTranscriptionCurrentlyAvailable;
  const primaryPath: LocalBridgeUsePath = localBridge ? "local_bridge" : serverSttAvailable ? "server_gateway" : "browser_local";
  const warnings = [
    ...(!localBridge ? ["Локальный модуль распознавания не готов; офлайн-диктовка остается через печать, браузерную диктовку и детерминированный парсер."] : []),
    ...(serverSttAvailable
      ? []
      : ["Серверное распознавание сейчас недоступно; аудиофрагменты должны оставаться локально восстановимыми до появления серверного маршрута или локального модуля."])
  ];

  return {
    scenario: "visit_dictation",
    title: "Диктовка приема",
    primaryPath,
    localBridgeKind: localBridge?.kind ?? null,
    canProceed: true,
    doctorBlocking: false,
    confidence: localBridge || serverSttAvailable ? 0.86 : 0.64,
    steps: [
      planStep(1, "Записать без блокировки приема", "doctor", "browser_local", true, false, "Печатный текст и браузерная диктовка добавляются в один автосохраняемый черновик."),
      planStep(
        2,
        localBridge ? `Использовать ${localBridge.title}` : serverSttAvailable ? `Использовать ${speech.providerLabel}` : "Оставить аудио и текст в очереди",
        "system",
        primaryPath,
        true,
        false,
        localBridge
          ? "Локальный модуль может распознавать фрагменты на рабочей станции клиники после подключения маршрута приема аудиофрагментов."
          : serverSttAvailable
            ? "Сервер клиники использует резервные маршруты распознавания и удаляет исходное аудио после обработки."
            : "Готового модуля распознавания нет; держите локальную очередь и используйте детерминированную очистку."
      ),
      planStep(3, "Черновик через детерминированный парсер", "system", "browser_local", true, false, "Общий парсер строит профильный черновик ЭМК без облачной зависимости."),
      planStep(4, "Проверка врачом и сохранение", "doctor", "manual_review", true, false, "Предупреждения не блокируют сохранение проверенной записи.")
    ],
    warnings,
    nextAction: localBridge
      ? "Подключайте локальное распознавание только после настройки доступа и лимитов аудиофрагментов на рабочей станции клиники."
      : serverSttAvailable
        ? "Можно использовать серверное распознавание фрагментами; локальный модуль держите как необязательное офлайн-ускорение."
        : "Добавьте серверное распознавание или локальный модуль Whisper/Vosk; до этого доступны печать и браузерная диктовка."
  };
}

function buildDocumentOcrPlan(readiness: LocalBridgeReadinessResponse): LocalBridgeUsePlan {
  const ocr = readyBridge(readiness, "ocr_vision");
  const groqReady = groqVisionConfigured();
  const primaryPath: LocalBridgeUsePath = ocr ? "local_bridge" : groqReady ? "cloud_provider" : "manual_review";

  return {
    scenario: "document_ocr",
    title: "OCR документов и сканов",
    primaryPath,
    localBridgeKind: ocr?.kind ?? null,
    canProceed: true,
    doctorBlocking: false,
    confidence: ocr || groqReady ? 0.82 : 0.58,
    steps: [
      planStep(1, "Сначала извлечь локальный текст", "administrator", "browser_local", true, false, "Встроенный извлекатель обрабатывает документы, архивы и таблицы до OCR."),
      planStep(
        2,
        ocr ? "Запустить локальный OCR-модуль" : groqReady ? "Использовать серверное распознавание изображений" : "Отметить, что нужен OCR",
        "system",
        primaryPath,
        true,
        false,
        ocr
          ? "Сканированные страницы остаются на локальном OCR-обработчике."
          : groqReady
            ? "Изображения проходят через серверный маршрут распознавания; результат все равно требует предпросмотра."
            : "OCR-движок не готов; администратор проверяет извлеченные поля вручную и может повторить позже."
      ),
      planStep(3, "Маршрут в предпросмотр", "administrator", "server_gateway", true, false, "Пациенты, список снимков, умный импорт или анализ прайса получают текст только после извлечения."),
      planStep(4, "Ручное подтверждение", "administrator", "manual_review", true, false, "Импортируемые строки не записываются без предпросмотра и подтверждения.")
    ],
    warnings: ocr || groqReady ? [] : ["OCR и распознавание изображений не готовы; сканированные документы требуют ручной проверки или повторной попытки позже."],
    nextAction: ocr
      ? "Держите OCR-модуль в админском контуре; не выносите настройку OCR на экран приема врача."
      : groqReady
        ? "Используйте серверное распознавание изображений для админских OCR/фото-задач с валидацией схемы и детерминированным резервом."
        : "Настройте локальный OCR или серверное распознавание изображений; текущий извлекатель продолжает обрабатывать текстовые и табличные файлы."
  };
}

function buildPricePhotoPlan(readiness: LocalBridgeReadinessResponse): LocalBridgeUsePlan {
  const ocr = readyBridge(readiness, "ocr_vision");
  const groqReady = groqVisionConfigured();
  const primaryPath: LocalBridgeUsePath = groqReady ? "cloud_provider" : ocr ? "local_bridge" : "manual_review";

  return {
    scenario: "price_photo_ocr",
    title: "Распознавание фото прайс-листа",
    primaryPath,
    localBridgeKind: ocr?.kind ?? null,
    canProceed: true,
    doctorBlocking: false,
    confidence: groqReady ? 0.84 : ocr ? 0.74 : 0.55,
    steps: [
      planStep(1, "Сжать изображение в браузере", "administrator", "browser_local", true, false, "Веб-клиент уменьшает фото перед загрузкой, чтобы не ломать слабую сеть."),
      planStep(
        2,
        groqReady ? "Классифицировать через серверное распознавание" : ocr ? "Считать текст локальным OCR" : "Использовать детерминированный разбор таблицы",
        "system",
        primaryPath,
        true,
        false,
        groqReady
          ? "Серверное распознавание изображений классифицирует лечение, материал, тип коронки или реставрации, бренд, единицу и цену."
          : ocr
            ? "Локальный OCR извлекает текст; детерминированная таксономия прайса сопоставляет поля после проверки."
            : "Скопированный текст или ручной ввод все равно проходят через детерминированную таксономию."
      ),
      planStep(3, "Проверка структуры", "system", "server_gateway", true, false, "Невалидная структура или поля с низкой уверенностью становятся предупреждениями, а не записью в каталог."),
      planStep(4, "Администратор сопоставляет услуги", "administrator", "manual_review", true, false, "Изменения каталога услуг требуют явного предпросмотра и подтверждения.")
    ],
    warnings: groqReady || ocr ? [] : ["Распознавание прайса по фото ограничено, пока не настроен серверный модуль распознавания изображений или локальный OCR."],
    nextAction: groqReady
      ? "Используйте серверное распознавание изображений как самый сильный текущий путь для фото прайс-листа; детерминированный разбор оставьте резервом."
      : ocr
        ? "Сначала используйте локальный OCR, затем детерминированную таксономию прайса."
        : "Сейчас используйте скопированные таблицы или текст; для фото настройте серверное распознавание изображений или локальный OCR."
  };
}

function buildCbctMprPlan(readiness: LocalBridgeReadinessResponse): LocalBridgeUsePlan {
  const dicom = readyBridge(readiness, "dicom_cbct");
  const ohif = readyBridge(readiness, "ohif_viewer");
  const primaryPath: LocalBridgeUsePath = dicom ? "local_bridge" : ohif ? "external_viewer" : "metadata_preview";

  return {
    scenario: "cbct_mpr",
    title: "Просмотр КЛКТ / КТ-срезов",
    primaryPath,
    localBridgeKind: dicom?.kind ?? ohif?.kind ?? null,
    canProceed: true,
    doctorBlocking: false,
    confidence: dicom ? 0.88 : ohif ? 0.78 : 0.52,
    steps: [
      planStep(1, "Сначала разобрать список серии", "system", "metadata_preview", true, false, "Предпросмотр папки, архива или списка снимков читает заголовки и группирует исследования/серии до открытия тяжелых данных."),
      planStep(
        2,
        dicom ? "Использовать локальный КТ-обработчик" : ohif ? "Открыть внешний просмотр" : "Остаться в режиме метаданных",
        "system",
        primaryPath,
        true,
        false,
        dicom
          ? "Локальный обработчик может взять на себя подготовку серии, быструю загрузку КТ-срезов и панорамную реконструкцию вне обычной оболочки CRM."
          : ohif
            ? "CRM передает план запуска и состояние инструментов; исходные снимки остаются у просмотрщика."
            : "Локальный обработчик или просмотрщик не готов: показываем предупреждения, план ресурсов и инструкции для внешней передачи."
      ),
      planStep(3, "Восстановить заметки CRM", "system", "server_gateway", true, false, "Состояние просмотра хранит курсор, окно, заметки и измерения отдельно от исходных файлов снимков."),
      planStep(4, "Врач интерпретирует в просмотрщике", "doctor", "manual_review", true, false, "Подсказки ИИ и снимков остаются черновиком; диагностическая интерпретация остается за врачом.")
    ],
    warnings: dicom || ohif ? [] : ["Локальный КТ-обработчик или внешний просмотр не готов; полный объем КЛКТ не загружается внутрь CRM."],
    nextAction: dicom
      ? "Настройте передачу данных в локальный КТ-обработчик с хэшированием файлов, лимитами ресурсов и аудитом."
      : ohif
        ? "Используйте план запуска внешнего просмотра для исходных снимков из архива."
        : "Оставьте предпросмотр метаданных и политику ресурсов; настройте КТ-обработчик или внешний просмотр перед диагностическим просмотром срезов."
  };
}

function buildImagingImportPlan(readiness: LocalBridgeReadinessResponse): LocalBridgeUsePlan {
  const dicom = readyBridge(readiness, "dicom_cbct");
  const ocr = readyBridge(readiness, "ocr_vision");
  const primaryPath: LocalBridgeUsePath = dicom ? "local_bridge" : "metadata_preview";

  return {
    scenario: "imaging_import",
    title: "Импорт снимков",
    primaryPath,
    localBridgeKind: dicom?.kind ?? null,
    canProceed: true,
    doctorBlocking: false,
    confidence: dicom ? 0.86 : 0.7,
    steps: [
      planStep(1, "Сканирование только для чтения", "administrator", "metadata_preview", true, false, "Предпросмотр папок наблюдения и архивов собирает пути и заголовки снимков до подтверждения."),
      planStep(
        2,
        dicom ? "Передать тяжелый архив снимков обработчику" : "Использовать встроенный разбор метаданных",
        "system",
        primaryPath,
        true,
        false,
        dicom
          ? "Локальный обработчик сможет раскрывать папки исследования/архивы и готовить быстрый просмотр без блокировки сервера."
          : "Встроенный парсер читает типовые заголовки снимков и обычные архивы; неподдержанные архивы становятся предупреждениями."
      ),
      planStep(
        3,
        ocr ? "OCR этикеток при необходимости" : "OCR этикеток остается необязательным",
        "system",
        ocr ? "local_bridge" : "manual_review",
        true,
        false,
        ocr ? "Локальный OCR может читать экспортированные этикетки или бумажные ссылки." : "Ручное сопоставление пациента остается доступным."
      ),
      planStep(4, "Подтвердить только готовые строки", "administrator", "manual_review", true, false, "Строки без пациента, типа или пути остаются предупреждениями либо заблокированными строками.")
    ],
    warnings: dicom ? [] : ["Тяжелым архивам снимков нужен внешний извлекатель или будущий локальный обработчик; текущий встроенный разбор читает метаданные первым проходом."],
    nextAction: dicom
      ? "Используйте локальный КТ-модуль для подготовки тяжелого импорта после добавления сверки файлов и аудита."
      : "Сейчас используйте существующий предпросмотр только для чтения; для больших архивов и быстрой загрузки КЛКТ добавьте КТ-модуль."
  };
}

async function buildLocalBridgeUsePlans() {
  const readiness = await buildLocalBridgeReadiness();
  const plans = [
    buildVisitDictationPlan(readiness),
    buildDocumentOcrPlan(readiness),
    buildPricePhotoPlan(readiness),
    buildCbctMprPlan(readiness),
    buildImagingImportPlan(readiness)
  ];
  const warningPlans = plans.filter((plan) => plan.warnings.length > 0);
  return localBridgeUsePlansResponseSchema.parse({
    generatedAt: new Date().toISOString(),
    readiness,
    plans,
    warnings: [
      ...readiness.warnings,
      ...warningPlans.map((plan) => `${plan.title}: ${plan.warnings[0]}`)
    ].slice(0, 12),
    nextAction:
      plans.some((plan) => plan.primaryPath === "local_bridge")
        ? "Локальное ускорение рабочей станции доступно для отдельных админских и тяжелых задач; рабочие процессы врача остаются очередью без блокировки."
        : "Готового локального модуля нет; рабочий путь сейчас: браузер, сервер или ручная проверка с детерминированными парсерами."
  });
}

export async function registerSystemRoutes(app: FastifyInstance) {
  app.get("/api/system/persistence/verify", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "persistence verify"))) return;
    return getPersistentStateIntegrityReport();
  });

  app.get("/api/system/local-bridges/readiness", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "local bridge readiness"))) return;
    return buildLocalBridgeReadiness();
  });

  app.get("/api/system/local-bridges/use-plans", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "local bridge use plans"))) return;
    return buildLocalBridgeUsePlans();
  });

  app.get("/api/system/persistence/export", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "persistence export"))) return;
    recordAuditEvent({
      entityType: "system",
      entityId: "persistence-export",
      action: "persistence_export_downloaded",
      reason: "Администратор клиники скачал резервную копию состояния прототипа для аварийного восстановления или проверки переноса."
    });
    const snapshot = buildPersistentStateExport();
    if (!snapshot.payload) {
      return reply.code(404).send({
        error: "PersistenceExportUnavailable",
        message: "Файл состояния не читается. Сначала запустите проверку резервных копий в настройках.",
        integrity: snapshot.integrity
      });
    }

    return reply
      .type("application/json; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="dental-crm-state-${timestampForDownloadName()}.json"`)
      .send(snapshot);
  });
}
