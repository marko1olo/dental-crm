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
  role: string;
  workload: string;
  privacyBoundary: string;
  setupHint: string;
};

const localBridgeTimeoutMs = 1400;

const localBridgeDefinitions: LocalBridgeDefinition[] = [
  {
    kind: "speech_whisper",
    title: "Локальная диктовка Whisper.cpp",
    acceptedEnvVars: ["DENTAL_LOCAL_WHISPER_URL", "WHISPER_CPP_URL", "LOCAL_WHISPER_URL"],
    defaultHealthPath: "/health",
    role: "офлайн-распознавание диктовки",
    workload: "локальные аудиофрагменты без облачной оплаты STT",
    privacyBoundary: "аудио остается на рабочей станции или локальном сервере клиники",
    setupHint: "Запустите локальный мост Whisper.cpp и задайте DENTAL_LOCAL_WHISPER_URL=http://127.0.0.1:<port>."
  },
  {
    kind: "speech_vosk",
    title: "Локальное распознавание Vosk",
    acceptedEnvVars: ["DENTAL_VOSK_URL", "VOSK_SERVER_URL", "LOCAL_VOSK_URL"],
    defaultHealthPath: "/health",
    role: "офлайн-диктовка и резерв для команд",
    workload: "легкое локальное распознавание речи на слабых ПК",
    privacyBoundary: "аудио остается внутри локального моста Vosk",
    setupHint: "Запустите мост Vosk и задайте DENTAL_VOSK_URL=http://127.0.0.1:<port>."
  },
  {
    kind: "dicom_cbct",
    title: "Локальный обработчик DICOM/CBCT",
    acceptedEnvVars: ["DENTAL_DICOM_BRIDGE_URL", "DICOM_LOCAL_BRIDGE_URL", "DENTAL_DICOM_WORKER_URL"],
    defaultHealthPath: "/health",
    role: "декодирование пикселей CBCT/MPR и кэш",
    workload: "DICOM-срезы, MPR, панорамная реконструкция, кэш с учетом GPU",
    privacyBoundary: "DICOM-пиксели остаются в локальном просмотрщике или обработчике; CRM хранит метаданные и состояние инструментов",
    setupHint: "Запустите локальный DICOM-обработчик или OHIF-sidecar и задайте DENTAL_DICOM_BRIDGE_URL=http://127.0.0.1:<port>."
  },
  {
    kind: "ocr_vision",
    title: "Локальный OCR / Tesseract",
    acceptedEnvVars: ["DENTAL_OCR_BRIDGE_URL", "OCR_LOCAL_BRIDGE_URL", "TESSERACT_BRIDGE_URL"],
    defaultHealthPath: "/health",
    role: "офлайн OCR для PDF, фотографий и таблиц",
    workload: "сканы PDF, фото прайс-листов, бумажные журналы",
    privacyBoundary: "изображения документов остаются в локальном OCR-мосте",
    setupHint: "Запустите локальный OCR-обработчик и задайте DENTAL_OCR_BRIDGE_URL=http://127.0.0.1:<port>."
  },
  {
    kind: "ohif_viewer",
    title: "OHIF / внешний DICOM-просмотрщик",
    acceptedEnvVars: ["DENTAL_OHIF_URL", "OHIF_BASE_URL"],
    defaultHealthPath: "/",
    role: "передача в диагностический просмотрщик",
    workload: "полный DICOMweb-просмотрщик вне экрана ведения приема",
    privacyBoundary: "диагностические пиксели остаются в просмотрщике; CRM только запускает и восстанавливает состояние",
    setupHint: "Запустите OHIF/Cornerstone поверх DICOMweb и задайте DENTAL_OHIF_URL=http://127.0.0.1:<port>."
  },
  {
    kind: "migration_staging",
    title: "Локальный мост миграции старых МИС",
    acceptedEnvVars: ["DENTAL_MIGRATION_BRIDGE_URL", "DENTAL_DB_BRIDGE_URL", "DENTAL_LEGACY_BRIDGE_URL"],
    defaultHealthPath: "/health",
    role: "read-only staging для старых БД, сетевых папок и экспортов",
    workload: "Firebird/InterBase, Access, SQLite, SQL Server, 1C export, DBF/таблицы, manifest ссылок на снимки",
    privacyBoundary: "старые БД пациентов, DICOM и файлы клиники остаются на локальной машине или сервере клиники; CRM получает только staging manifest/CSV preview",
    setupHint: "Запустите локальный migration bridge на машине администратора и задайте DENTAL_MIGRATION_BRIDGE_URL=http://127.0.0.1:<port>."
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

function healthUrl(rawUrl: string, defaultHealthPath: string): URL {
  const url = new URL(rawUrl);
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("Для локального моста поддерживаются только URL http/https.");
  }
  if (!url.pathname || url.pathname === "/") {
    url.pathname = defaultHealthPath;
  }
  return url;
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
      acceptedEnvVars: definition.acceptedEnvVars,
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
    url = healthUrl(configuredUrl, definition.defaultHealthPath);
  } catch (error) {
    return {
      kind: definition.kind,
      title: definition.title,
      status: "misconfigured",
      configured: true,
      reachable: false,
      urlRedacted: null,
      acceptedEnvVars: definition.acceptedEnvVars,
      latencyMs: null,
      role: definition.role,
      workload: definition.workload,
      privacyBoundary: definition.privacyBoundary,
      warnings: [error instanceof Error ? error.message : "Некорректный URL локального моста."],
      nextAction: `Исправьте одну из переменных ${definition.acceptedEnvVars.join(", ")}. ${definition.setupHint}`
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
      acceptedEnvVars: definition.acceptedEnvVars,
      latencyMs: null,
      role: definition.role,
      workload: definition.workload,
      privacyBoundary: definition.privacyBoundary,
      warnings: ["Проверка удаленных мостов отключена; по умолчанию проверяются только localhost и частная сеть клиники."],
      nextAction: "Используйте localhost/частный адрес моста или включите DENTAL_ALLOW_REMOTE_LOCAL_BRIDGES=true после проверки инфраструктуры."
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
        acceptedEnvVars: definition.acceptedEnvVars,
        latencyMs,
        role: definition.role,
        workload: definition.workload,
        privacyBoundary: definition.privacyBoundary,
        warnings,
        nextAction: "Проверка доступности моста прошла. Держите это как возможность администратора или локального рабочего места, а не как блокер приема."
      };
    }
    warnings.push(`Проверка доступности вернула HTTP ${response.status}.`);
    return {
      kind: definition.kind,
      title: definition.title,
      status: "unreachable",
      configured: true,
      reachable: false,
      urlRedacted: redactedUrl(url),
      acceptedEnvVars: definition.acceptedEnvVars,
      latencyMs,
      role: definition.role,
      workload: definition.workload,
      privacyBoundary: definition.privacyBoundary,
      warnings,
      nextAction: "Проверьте, что локальный мост запущен, отвечает и привязан к настроенному адресу и порту."
    };
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "Проверка локального моста не выполнена.");
    return {
      kind: definition.kind,
      title: definition.title,
      status: "unreachable",
      configured: true,
      reachable: false,
      urlRedacted: redactedUrl(url),
      acceptedEnvVars: definition.acceptedEnvVars,
      latencyMs: Date.now() - startedAt,
      role: definition.role,
      workload: definition.workload,
      privacyBoundary: definition.privacyBoundary,
      warnings,
      nextAction: "Запустите локальный мост или продолжайте через облако, серверный режим либо ручной ввод; работа врача не блокируется."
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
      ? "Используйте готовые локальные мосты для тяжелых и офлайн-задач; прием остается неблокирующим, очередь имеет приоритет."
      : configuredCount > 0
        ? "Настроенные мосты недоступны; используйте облачный или ручной режим и проверьте локальное рабочее место."
        : "Локальные мосты пока не настроены; приложение продолжает работать через браузер, сервер и детерминированные разборщики.";

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
    ...(!localBridge ? ["Локальный STT-мост не готов; офлайн-диктовка остается через печать, браузерную диктовку и детерминированный парсер."] : []),
    ...(serverSttAvailable
      ? []
      : ["Серверное STT сейчас недоступно; аудиофрагменты должны оставаться локально восстановимыми до появления ключа провайдера или локального моста."])
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
          ? "Локальный мост может распознавать фрагменты на рабочей станции клиники после подключения маршрута приема аудиофрагментов."
          : serverSttAvailable
            ? "API-сервер ротирует настроенные STT-ключи и удаляет исходное аудио после отправки провайдеру."
            : "Готового STT-движка нет; держите локальную очередь и используйте детерминированную очистку."
      ),
      planStep(3, "Черновик через детерминированный парсер", "system", "browser_local", true, false, "Общий парсер строит профильный черновик ЭМК без облачной зависимости."),
      planStep(4, "Проверка врачом и сохранение", "doctor", "manual_review", true, false, "Предупреждения не блокируют сохранение проверенной записи.")
    ],
    warnings,
    nextAction: localBridge
      ? "Подключайте proxy локального STT payload только после определения auth/payload-лимитов моста на рабочей станции клиники."
      : serverSttAvailable
        ? "Можно использовать серверное chunked STT; локальный мост держите как необязательное офлайн-ускорение."
        : "Добавьте пул ключей Groq/OpenAI/Deepgram или локальный мост Whisper/Vosk; до этого безопасны печать и браузерная диктовка."
  };
}

function buildDocumentOcrPlan(readiness: LocalBridgeReadinessResponse): LocalBridgeUsePlan {
  const ocr = readyBridge(readiness, "ocr_vision");
  const groqReady = groqVisionConfigured();
  const primaryPath: LocalBridgeUsePath = ocr ? "local_bridge" : groqReady ? "cloud_provider" : "manual_review";

  return {
    scenario: "document_ocr",
    title: "OCR документов и PDF",
    primaryPath,
    localBridgeKind: ocr?.kind ?? null,
    canProceed: true,
    doctorBlocking: false,
    confidence: ocr || groqReady ? 0.82 : 0.58,
    steps: [
      planStep(1, "Сначала извлечь локальный текст", "administrator", "browser_local", true, false, "Встроенный извлекатель обрабатывает текстовые PDF, ZIP, DOCX, XLSX, ODT/ODS и таблицы до OCR."),
      planStep(
        2,
        ocr ? "Запустить локальный OCR-мост" : groqReady ? "Использовать серверный Groq Vision" : "Отметить, что нужен OCR",
        "system",
        primaryPath,
        true,
        false,
        ocr
          ? "Сканированные страницы остаются на локальном OCR-обработчике."
          : groqReady
            ? "Изображения проходят через серверную ротацию ключей; результат все равно требует предпросмотра."
            : "OCR-движок не готов; администратор проверяет извлеченные поля вручную и может повторить позже."
      ),
      planStep(3, "Маршрут в предпросмотр", "administrator", "server_gateway", true, false, "Пациенты, manifest снимков, умный импорт или анализ прайса получают текст только после извлечения."),
      planStep(4, "Ручное подтверждение", "administrator", "manual_review", true, false, "Импортируемые строки не записываются без предпросмотра и подтверждения.")
    ],
    warnings: ocr || groqReady ? [] : ["OCR/vision-провайдер не готов; сканированные документы требуют ручной проверки или повторной попытки позже."],
    nextAction: ocr
      ? "Держите OCR-мост в админском контуре; не выносите настройку OCR на экран приема врача."
      : groqReady
        ? "Используйте Groq Vision для админских OCR/фото-задач с валидацией схемы и детерминированным резервом."
        : "Настройте локальный OCR или Groq vision; текущий извлекатель продолжает обрабатывать текстовые и табличные файлы."
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
        groqReady ? "Классифицировать через Groq JSON" : ocr ? "Считать текст локальным OCR" : "Использовать детерминированный разбор таблицы",
        "system",
        primaryPath,
        true,
        false,
        groqReady
          ? "Серверный Groq vision классифицирует лечение, материал, тип коронки или реставрации, бренд, единицу и цену."
          : ocr
            ? "Локальный OCR извлекает текст; детерминированная таксономия прайса сопоставляет поля после проверки."
            : "Скопированный текст или ручной ввод все равно проходят через детерминированную таксономию."
      ),
      planStep(3, "Проверка схемы", "system", "server_gateway", true, false, "Невалидный JSON или поля с низкой уверенностью становятся предупреждениями, а не записью в каталог."),
      planStep(4, "Администратор сопоставляет услуги", "administrator", "manual_review", true, false, "Изменения каталога услуг требуют явного предпросмотра и подтверждения.")
    ],
    warnings: groqReady || ocr ? [] : ["Распознавание прайса по фото ограничено, пока не настроен Groq vision или локальный OCR."],
    nextAction: groqReady
      ? "Используйте Groq Vision как самый сильный текущий путь для фото прайс-листа; детерминированный разбор оставьте резервом."
      : ocr
        ? "Сначала используйте локальный OCR, затем детерминированную таксономию прайса."
        : "Сейчас используйте скопированные таблицы или текст; для фото настройте Groq или локальный OCR."
  };
}

function buildCbctMprPlan(readiness: LocalBridgeReadinessResponse): LocalBridgeUsePlan {
  const dicom = readyBridge(readiness, "dicom_cbct");
  const ohif = readyBridge(readiness, "ohif_viewer");
  const primaryPath: LocalBridgeUsePath = dicom ? "local_bridge" : ohif ? "external_viewer" : "metadata_preview";

  return {
    scenario: "cbct_mpr",
    title: "Просмотр CBCT / MPR",
    primaryPath,
    localBridgeKind: dicom?.kind ?? ohif?.kind ?? null,
    canProceed: true,
    doctorBlocking: false,
    confidence: dicom ? 0.88 : ohif ? 0.78 : 0.52,
    steps: [
      planStep(1, "Сначала разобрать метаданные", "system", "metadata_preview", true, false, "Предпросмотр папки/ZIP/DICOM manifest читает заголовки и группирует Study/Series до загрузки пикселей."),
      planStep(
        2,
        dicom ? "Использовать локальный DICOM-обработчик" : ohif ? "Открыть OHIF или внешний просмотрщик" : "Остаться в режиме метаданных",
        "system",
        primaryPath,
        true,
        false,
        dicom
          ? "Локальный обработчик может взять на себя декодирование, кэш, MPR и панорамную реконструкцию вне обычной оболочки CRM."
          : ohif
            ? "CRM передает манифест запуска и состояния инструментов; диагностические пиксели остаются у просмотрщика."
            : "Обработчик пикселей или просмотрщик не готов: показываем предупреждения, план ресурсов и инструкции для внешней передачи."
      ),
      planStep(3, "Восстановить заметки CRM", "system", "server_gateway", true, false, "Пакет состояния инструментов хранит курсор, окно, заметки и измерения отдельно от сырых DICOM-пикселей."),
      planStep(4, "Врач интерпретирует в просмотрщике", "doctor", "manual_review", true, false, "Подсказки ИИ и снимков остаются черновиком; диагностическая интерпретация остается за врачом.")
    ],
    warnings: dicom || ohif ? [] : ["Локальный DICOM-обработчик или OHIF-просмотрщик не готов; полные CBCT-пиксели не загружаются внутрь CRM."],
    nextAction: dicom
      ? "Настройте передачу данных в локальный DICOM-обработчик с хэшированием файлов, лимитами ресурсов и аудитом."
      : ohif
        ? "Используйте манифест запуска OHIF или внешнего просмотрщика для реальных DICOMweb-пикселей."
        : "Оставьте предпросмотр метаданных и политику ресурсов; настройте DICOM-обработчик или OHIF перед диагностическим MPR."
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
      planStep(1, "Сканирование только для чтения", "administrator", "metadata_preview", true, false, "Предпросмотр папок наблюдения и архивов собирает пути и DICOM-заголовки до подтверждения."),
      planStep(
        2,
        dicom ? "Передать тяжелый DICOM-архив обработчику" : "Использовать встроенный разбор метаданных",
        "system",
        primaryPath,
        true,
        false,
        dicom
          ? "Локальный обработчик сможет раскрывать DICOMDIR/архивы и готовить кэш без блокировки сервера."
          : "Встроенный парсер читает типовые DICOM/IMA-заголовки и обычные записи ZIP; неподдержанные архивы становятся предупреждениями."
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
    warnings: dicom ? [] : ["Тяжелым DICOM-архивам нужен внешний извлекатель или будущий локальный обработчик; текущий встроенный разбор читает метаданные первым проходом."],
    nextAction: dicom
      ? "Используйте локальный DICOM-мост для подготовки тяжелого импорта после добавления договора хэша файлов и аудита."
      : "Сейчас используйте существующий предпросмотр только для чтения; для больших архивов и кэша CBCT добавьте DICOM-мост."
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
        : "Готового локального моста нет; безопасный путь сейчас: браузер, сервер или ручная проверка с детерминированными парсерами."
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
      reason: "Owner/admin downloaded prototype JSON state export for emergency backup or migration review."
    });
    const snapshot = buildPersistentStateExport();
    if (!snapshot.payload) {
      return reply.code(404).send({
        error: "PersistenceExportUnavailable",
        message: "State file is not readable; run /api/system/persistence/verify for details.",
        integrity: snapshot.integrity
      });
    }

    return reply
      .type("application/json; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="dental-crm-state-${timestampForDownloadName()}.json"`)
      .send(snapshot);
  });
}
