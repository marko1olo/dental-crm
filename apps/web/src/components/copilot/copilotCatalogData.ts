/**
 * copilotCatalogData.ts — Единый канонический SSOT-каталог быстрых клинических команд, навыков и инструментов.
 * Архитектура: Мандат 8b (300–350 строк), Мандат 8e (автономия), Мандат 8x (без канцелярита), Мандат 8wy.
 */

import type { SuggestionCategory } from "./types/proactiveHitLTypes";

export type CopilotRuntimeMode = "web_browser" | "desktop_native" | "mobile_tablet" | "both" | "all";

export type CapabilityStatus = "available" | "desktop_required" | "mobile_specific" | "unavailable";

export interface EnvironmentCapability {
  id: string;
  name: string;
  description: string;
  web: CapabilityStatus;
  desktop: CapabilityStatus;
  mobile: CapabilityStatus;
}

export const ENVIRONMENT_CAPABILITIES_MATRIX: EnvironmentCapability[] = [
  { id: "emr_diary", name: "Ведение дневников SOAP и медкарт", description: "Заполнение протоколов приёма по стандартам СтАР", web: "available", desktop: "available", mobile: "available" },
  { id: "voice_web_speech", name: "Голосовая диктовка (Web Speech)", description: "Стенографирование жалоб и объективного статуса", web: "available", desktop: "available", mobile: "available" },
  { id: "phi_masking", name: "Защита персональных данных", description: "Маскирование ФИО и телефонов перед отправкой в LLM", web: "available", desktop: "available", mobile: "available" },
  { id: "dicom_import", name: "Импорт DICOM и снимков КЛКТ", description: "Загрузка исследований с диска, дисковода или папки экспорта", web: "available", desktop: "available", mobile: "available" },
  { id: "fiscal_kassa", name: "Кассовые сметы и чеки", description: "Расчет скидок врача, сплит-оплата и печать кассовых чеков", web: "available", desktop: "available", mobile: "available" },
  { id: "treatment_plans", name: "Многоэтапные планы лечения", description: "Формирование вариантов терапии с автоматическим расчетом стоимости", web: "available", desktop: "available", mobile: "available" },
  { id: "odontogram_fdi", name: "Зубная формула FDI", description: "Интерактивная одонтограмма 11-48 / 51-85 с фиксацией патологий", web: "available", desktop: "available", mobile: "available" },
  { id: "deterministic_nlp", name: "Детерминированные локальные эвристики", description: "Мгновенный разбор формулы FDI и протоколов (<5 мс, 0 ₽)", web: "available", desktop: "available", mobile: "available" },
  { id: "global_hotkeys", name: "Системные горячие клавиши ОС", description: "Мгновенная диктовка поверх всех окон Windows", web: "desktop_required", desktop: "available", mobile: "unavailable" },
  { id: "glove_mode", name: "Режим в перчатках (>= 48px)", description: "Увеличенные тач-таргеты для работы у кресла", web: "unavailable", desktop: "unavailable", mobile: "mobile_specific" },
  { id: "screen_wake_lock", name: "Удержание экрана (Wake Lock)", description: "Защита от засыпания экрана во время манипуляций", web: "available", desktop: "unavailable", mobile: "mobile_specific" },
  { id: "haptic_feedback", name: "Тактильный виброотклик (Haptic)", description: "Вибрация при успешной фиксации голосовой команды", web: "unavailable", desktop: "unavailable", mobile: "mobile_specific" },
  { id: "auto_mic_open", name: "Авто-микрофон в карточке приёма", description: "Мгновенный старт записи при открытии визита", web: "unavailable", desktop: "unavailable", mobile: "mobile_specific" },
];

export interface CopilotCatalogItem {
  id: string;
  label: string;
  prompt: string;
  description: string;
  category: string;
  icon: string;
  mode: CopilotRuntimeMode;
  requiresConfirmation: boolean;
  targetTool?: string;
  shortVoiceTrigger?: string;
}

export interface CopilotCatalogCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  items: CopilotCatalogItem[];
}

export interface ClinicalQuickPreset {
  id: string;
  label: string;
  prompt: string;
  actionBadge: string;
  category: "odontogram" | "pharmacology" | "schedule" | "billing" | "soap";
}

export interface SpeechEngineHealthReport {
  engine: "webspeech" | "gemini_cloud" | "whisper_local" | "groq_cloud" | "unsupported";
  status: "operational" | "degraded" | "standby" | "unsupported";
  label: string;
  isCloudActive: boolean;
  activeProvider: string;
  details: string;
}

/** Реестр боевых инструментов Fastify API (Zero Fake, Мандат 8e) */
export const CRM_FASTIFY_TOOLS_REGISTRY = {
  updateToothStatus: "update_tooth_status",
  createAppointmentSlot: "create_appointment",
  generateSoapDiary: "generate_clinical_protocol_entry",
  calcInvoiceKopecks: "search_clinic_services_and_prices",
  createInvoiceDraft: "create_invoice_draft",
  applyDoctorDiscount: "create_invoice_draft",
  printConsentBlank: "print_document",
  captureScreen: "capture_workstation_screen",
  scanHotfolder: "search_workstation_files",
} as const;

/** Реестр быстрых клинических промптов в 1 клик (Мандат 8e & Voice-First) */
export const CLINICAL_QUICK_PRESETS: ClinicalQuickPreset[] = [
  { id: "preset-phys-norm", label: "Протокол осмотра (норма)", prompt: "Зафиксируй физиологическую норму: соматически здоров, зубные ряды санированы", actionBadge: "0-клик норма", category: "soap" },
  { id: "preset-caries-16", label: "Кариес 16", prompt: "Зафиксируй кариес дентина зуба 16, препарирование полости I класс и нанокомпозит", actionBadge: "Одонтограмма", category: "odontogram" },
  { id: "preset-caries-16-full", label: "Лечение кариеса 16", prompt: "Зафиксируй кариес дентина зуба 16, препарирование полости I класс и нанокомпозит", actionBadge: "Одонтограмма", category: "odontogram" },
  { id: "preset-extraction-38", label: "Удаление дистопированного 38", prompt: "Протокол операции: атипичное удаление ретинированного дистопированного зуба 38", actionBadge: "Хирургия", category: "soap" },
  { id: "preset-implant-turnkey", label: "Смета на имплантацию под ключ", prompt: "Сформируй комплексную смету на дентальную имплантацию под ключ с коронкой", actionBadge: "Касса и сметы", category: "billing" },
  { id: "preset-septanest", label: "Анестезия септанест", prompt: "Инфильтрационная анестезия: Септанест 1:100 000, 1.7 мл, без осложнений", actionBadge: "Анестезия", category: "pharmacology" },
  { id: "preset-cofferdam", label: "Коффердам", prompt: "Изоляция операционного поля коффердамом с клампом, фиксация надежная", actionBadge: "Изоляция", category: "soap" },
  { id: "preset-book-tomorrow", label: "Запиши на завтра в 14:00", prompt: "Запиши пациента на завтра в 14:00 на контрольный осмотр и полировку", actionBadge: "Расписание", category: "schedule" },
];

export const COPILOT_CATALOG_CATEGORIES: CopilotCatalogCategory[] = [
  {
    id: "chairside",
    title: "Клинический приём у кресла",
    description: "Протоколы осмотра, зубная формула, анестезия и дневники по стандартам СтАР",
    icon: "Stethoscope",
    items: [
      {
        id: "chairside-diary", label: "Заполнить дневник приёма",
        prompt: "Заполни медицинскую карту приёма по текущему пациенту по стандарту SOAP",
        description: "Формирование протокола осмотра, жалоб и плана лечения в карту приёма",
        category: "Клинический приём у кресла", icon: "FileText", mode: "both",
        requiresConfirmation: true, targetTool: CRM_FASTIFY_TOOLS_REGISTRY.generateSoapDiary,
        shortVoiceTrigger: "дневник приёма",
      },
      {
        id: "chairside-caries-stenograph", label: "Стенограф: кариес и пломба",
        prompt: "Зафиксируй кариес дентина зуба 46 и нанокомпозитную реставрацию",
        description: "Быстрая разметка одонтограммы и назначение манипуляций голосом",
        category: "Клинический приём у кресла", icon: "Activity", mode: "both",
        requiresConfirmation: true, targetTool: CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus,
        shortVoiceTrigger: "кариес 46 пломба",
      },
      {
        id: "chairside-anesthesia", label: "Анестезия и расходники",
        prompt: "Зафиксируй инфильтрационную анестезию Артикаин 1.7 мл и списание карпулы",
        description: "Автоматический учет анестетика с контролем сердечно-сосудистого риска",
        category: "Клинический приём у кресла", icon: "ShieldAlert", mode: "both",
        requiresConfirmation: false, targetTool: "crmPharmacologyTools.registerAnesthesia",
        shortVoiceTrigger: "анестезия артикаин",
      },
      {
        id: "chairside-norm", label: "Физиологическая норма в 1 клик",
        prompt: "Установи норму: соматически здоров, интактные зубы без патологий",
        description: "0-клик заполнение физиологической нормы без излишней бюрократии",
        category: "Клинический приём у кресла", icon: "ShieldCheck", mode: "both",
        requiresConfirmation: false, targetTool: "crmClinicalOdontogramTools.setPhysiologicalNorm",
        shortVoiceTrigger: "интактная норма",
      },
    ],
  },
  {
    id: "billing",
    title: "Финансы, сметы и касса",
    description: "Расчет прозрачных смет, альтернативные планы лечения и оформление чеков",
    icon: "CreditCard",
    items: [
      {
        id: "billing-estimate-3-tiers", label: "Рассчитать 3 тарифа сметы",
        prompt: "Рассчитай смету лечения на 3 тарифа: Базовый, Оптимальный и Премиум",
        description: "Параллельный расчет альтернативных планов для информированного выбора пациента",
        category: "Финансы, сметы и касса", icon: "Calculator", mode: "both",
        requiresConfirmation: false, targetTool: CRM_FASTIFY_TOOLS_REGISTRY.calcInvoiceKopecks,
        shortVoiceTrigger: "рассчитай 3 сметы",
      },
      {
        id: "billing-receipt-draft", label: "Сформировать предварительный счёт",
        prompt: "Сформируй предварительный счет на оказанные услуги текущего визита",
        description: "Подготовка прозрачного счета без требования лишних персональных данных",
        category: "Финансы, сметы и касса", icon: "Receipt", mode: "both",
        requiresConfirmation: true, targetTool: CRM_FASTIFY_TOOLS_REGISTRY.createInvoiceDraft,
        shortVoiceTrigger: "счет на оплату",
      },
      {
        id: "billing-warranty-discount", label: "Скидка на гарантию до 100%",
        prompt: "Примени гарантийную скидку 100% на перелечивание по гарантии",
        description: "Свобода врачебных решений при устранении осложнений",
        category: "Финансы, сметы и касса", icon: "ShieldCheck", mode: "both",
        requiresConfirmation: true, targetTool: CRM_FASTIFY_TOOLS_REGISTRY.applyDoctorDiscount,
        shortVoiceTrigger: "гарантийный случай",
      },
    ],
  },
  {
    id: "workstation",
    title: "Рабочая станция ОС и снимки",
    description: "Интеграция с Romexis, Ez3D, визиографами, Hotfolder и кассой по COM/USB",
    icon: "Monitor",
    items: [
      {
        id: "workstation-rvg-capture", label: "Оптический захват визиографа",
        prompt: "Захвати активное окно визиографа и прикрепи снимок к зубу в карте",
        description: "Мгновенный оптический захват экрана без ручного сохранения и экспорта файлов",
        category: "Рабочая станция ОС и снимки", icon: "Camera", mode: "desktop_native",
        requiresConfirmation: false, targetTool: CRM_FASTIFY_TOOLS_REGISTRY.captureScreen,
        shortVoiceTrigger: "захвати снимок",
      },
      {
        id: "workstation-hotfolder-scan", label: "Снимок из папки автоимпорта",
        prompt: "Проверь сетевую папку томографа на наличие новых снимков исследования",
        description: "Автоматический поиск и привязка свежих DICOM и RVG снимков пациента",
        category: "Рабочая станция ОС и снимки", icon: "FolderSearch", mode: "desktop_native",
        requiresConfirmation: false, targetTool: CRM_FASTIFY_TOOLS_REGISTRY.scanHotfolder,
        shortVoiceTrigger: "проверь снимки томографа",
      },
      {
        id: "workstation-launch-romexis", label: "Запустить Planmeca Romexis",
        prompt: "Открой 3D исследование пациента в Planmeca Romexis",
        description: "Нативный запуск десктопного просмотрщика томограмм с карточкой пациента",
        category: "Рабочая станция ОС и снимки", icon: "ExternalLink", mode: "desktop_native",
        requiresConfirmation: false, targetTool: "workstationTools.launchViewer",
        shortVoiceTrigger: "открой ромексис",
      },
      {
        id: "workstation-fiscal-printer", label: "Кассовый аппарат по COM/USB",
        prompt: "Проверь статус фискального регистратора и состояние рабочей смены",
        description: "Прямой контроль печати чеков и соединения с кассовым регистратором",
        category: "Рабочая станция ОС и снимки", icon: "Receipt", mode: "desktop_native",
        requiresConfirmation: false, targetTool: "workstationTools.checkFiscalPrinter",
        shortVoiceTrigger: "статус кассы",
      },
    ],
  },
  {
    id: "schedule",
    title: "Расписание и запись",
    description: "Поиск свободных окон, бронирование кресел и лист ожидания",
    icon: "Calendar",
    items: [
      {
        id: "schedule-free-slots", label: "Свободные окна сегодня",
        prompt: "Покажи все свободные слоты у терапевта на сегодня",
        description: "Мгновенный обзор доступных окон для экстренной или плановой записи",
        category: "Расписание и запись", icon: "Clock", mode: "both",
        requiresConfirmation: false, targetTool: "crmScheduleTools.getAvailableSlots",
        shortVoiceTrigger: "свободные окна",
      },
      {
        id: "schedule-book-appointment", label: "Записать на повторный приём",
        prompt: "Запиши пациента на следующий этап эндодонтии через 5 дней",
        description: "Бронирование кресла без обязательного ручного выбора начмедов и ассистентов",
        category: "Расписание и запись", icon: "CalendarPlus", mode: "both",
        requiresConfirmation: true, targetTool: CRM_FASTIFY_TOOLS_REGISTRY.createAppointmentSlot,
        shortVoiceTrigger: "записать через 5 дней",
      },
    ],
  },
  {
    id: "knowledge",
    title: "Стандарты и клинические протоколы",
    description: "Клинические рекомендации СтАР, согласия на приём и протоколы лечения",
    icon: "BookOpen",
    items: [
      {
        id: "knowledge-star-guidelines", label: "Клинические рекомендации СтАР",
        prompt: "Покажи клинические критерии препарирования и пломбирования по протоколам СтАР",
        description: "Клинические алгоритмы доказательной стоматологии без бюрократического канцелярита",
        category: "Стандарты и клинические протоколы", icon: "BookOpen", mode: "both",
        requiresConfirmation: false, shortVoiceTrigger: "стандарты стар",
      },
      {
        id: "knowledge-consent-forms", label: "Печать информированного согласия",
        prompt: "Подготовь информированное согласие на эндодонтическое лечение для подписи",
        description: "Печать бланка согласия в 1 клик с предзаполненными рисками и диагнозом",
        category: "Стандарты и клинические протоколы", icon: "FileText", mode: "both",
        requiresConfirmation: false, targetTool: CRM_FASTIFY_TOOLS_REGISTRY.printConsentBlank,
        shortVoiceTrigger: "согласие на приём",
      },
    ],
  },
];

export function getCatalogItemsByMode(mode: CopilotRuntimeMode): CopilotCatalogItem[] {
  return COPILOT_CATALOG_CATEGORIES.flatMap((c) =>
    c.items.filter((item) => item.mode === "both" || item.mode === "all" || item.mode === mode)
  );
}

export function findCatalogItemById(id: string): CopilotCatalogItem | undefined {
  for (const cat of COPILOT_CATALOG_CATEGORIES) {
    const found = cat.items.find((it) => it.id === id);
    if (found) return found;
  }
  return undefined;
}
/** Честная проверка статуса голосовых и ИИ-движков (Zero Fake) */
export function inspectSpeechEngineHealth(healthPayload?: Record<string, unknown>): SpeechEngineHealthReport {
  const hasBrowserSpeech = typeof window !== "undefined" && Boolean(
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );
  const healthObj = (healthPayload && typeof healthPayload === "object" && "health" in healthPayload)
    ? (healthPayload as { health?: Record<string, { consecutiveFailures?: number; cooldownUntil?: number }> }).health
    : null;

  let hasCloudOperational = false;
  let activeProvider = "Web Speech API (Browser)";

  if (healthObj) {
    for (const [key, val] of Object.entries(healthObj)) {
      if ((val.consecutiveFailures ?? 0) === 0 && (val.cooldownUntil ?? 0) < Date.now()) {
        hasCloudOperational = true;
        activeProvider = key.startsWith("gemini") ? "Google Gemini Live" : "Groq Voice / Whisper";
        break;
      }
    }
  }

  if (hasCloudOperational) {
    return {
      engine: activeProvider.includes("Gemini") ? "gemini_cloud" : "groq_cloud",
      status: "operational",
      label: activeProvider,
      isCloudActive: true,
      activeProvider,
      details: "Облачный нейросетевой шлюз активен со сквозным резервированием ключей",
    };
  }

  return {
    engine: hasBrowserSpeech ? "webspeech" : "unsupported",
    status: hasBrowserSpeech ? "operational" : "degraded",
    label: hasBrowserSpeech ? "Web Speech API (Нативный)" : "Голосовой ввод недоступен",
    isCloudActive: false,
    activeProvider: hasBrowserSpeech ? "WebkitSpeechRecognition" : "Локальный шаблонный ввод",
    details: hasBrowserSpeech
      ? "Автономное распознавание речи прямо в браузере (ноль задержек, офлайн-режим)"
      : "Служба распознавания речи не поддерживается браузером",
  };
}

export const DEFAULT_SUGGESTION_CATEGORIES: SuggestionCategory[] = COPILOT_CATALOG_CATEGORIES.map((cat) => ({
  category: cat.title,
  items: cat.items.map((item) => ({
    label: item.label,
    prompt: item.prompt,
    icon: item.icon,
  })),
}));