/**
 * copilotCatalogData.ts — Единый канонический SSOT-каталог быстрых клинических команд, навыков и инструментов.
 * Соответствие: Мандат 8b (280–350 строк), Мандат 8e (автономия), Мандат 8x (без канцелярита), Мандат 8wy (двухрежимность).
 */

export type CopilotRuntimeMode = "web_browser" | "desktop_native" | "both";

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
  engine: "webspeech" | "gemini_cloud" | "whisper_local" | "groq_cloud";
  status: "operational" | "degraded" | "standby" | "unsupported";
  label: string;
  isCloudActive: boolean;
  activeProvider: string;
  details: string;
}

/** Реестр боевых инструментов Fastify API (Zero Fake, Мандат 8e) */
export const CRM_FASTIFY_TOOLS_REGISTRY = {
  updateToothStatus: "crmClinicalOdontogramTools.updateToothState",
  createAppointmentSlot: "crmScheduleTools.createAppointment",
  generateSoapDiary: "crmClinicalDiaryTools.saveVisitDiary",
  calcInvoiceKopecks: "crmBillingTools.calculateTreatmentEstimate",
  createInvoiceDraft: "crmBillingTools.createInvoiceDraft",
  applyDoctorDiscount: "crmBillingTools.applyDoctorDiscount",
  captureScreen: "workstationTools.captureScreen",
  scanHotfolder: "workstationTools.scanHotfolder",
} as const;

/** Пресеты клинических фраз для быстрого ввода (Мандат 8e & Voice-First) */
export const CLINICAL_QUICK_PRESETS: ClinicalQuickPreset[] = [
  { id: "preset-caries-16", label: "Кариес 16", prompt: "Зафиксируй кариес дентина зуба 16, полость I класс по Блэку", actionBadge: "Одонтограмма", category: "odontogram" },
  { id: "preset-septanest", label: "Анестезия септанест", prompt: "Инфильтрационная анестезия: Септанест 1:100 000, 1.7 мл", actionBadge: "Анестезия", category: "pharmacology" },
  { id: "preset-cofferdam", label: "Коффердам", prompt: "Изоляция рабочего поля: коффердам, кламп №2, без осложнений", actionBadge: "Изоляция", category: "soap" },
  { id: "preset-book-tomorrow", label: "Запиши на завтра в 14:00", prompt: "Запиши пациента на завтра в 14:00 на терапевтический приём", actionBadge: "Расписание", category: "schedule" },
  { id: "preset-phys-norm", label: "Интактная норма", prompt: "Установи физиологическую норму: соматически здоров, интактные зубы", actionBadge: "0-клик норма", category: "odontogram" },
  { id: "preset-invoice-draft", label: "Счёт на терапию", prompt: "Сформируй предварительный счёт на лечение кариеса с нанокомпозитом", actionBadge: "Касса", category: "billing" },
];

export const COPILOT_CATALOG_CATEGORIES: CopilotCatalogCategory[] = [
  {
    id: "chairside",
    title: "Клинический приём у кресла",
    description: "Протоколы осмотра, зубная формула, анестезия и дневники по стандартам СтАР",
    icon: "Stethoscope",
    items: [
      {
        id: "chairside-diary",
        label: "Заполнить дневник приёма",
        prompt: "Заполни дневник приёма по текущему пациенту по стандарту SOAP",
        description: "Формирование протокола осмотра, жалоб и плана лечения в карту приёма",
        category: "Клинический приём у кресла",
        icon: "FileText",
        mode: "both",
        requiresConfirmation: true,
        targetTool: CRM_FASTIFY_TOOLS_REGISTRY.generateSoapDiary,
        shortVoiceTrigger: "дневник приёма",
      },
      {
        id: "chairside-caries-stenograph",
        label: "Стенограф: кариес и пломба",
        prompt: "Зафиксируй кариес дентина зуба 46 и световую реставрацию",
        description: "Быстрая разметка одонтограммы и назначение манипуляций голосом",
        category: "Клинический приём у кресла",
        icon: "Activity",
        mode: "both",
        requiresConfirmation: true,
        targetTool: CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus,
        shortVoiceTrigger: "кариес 46 пломба",
      },
      {
        id: "chairside-anesthesia",
        label: "Анестезия и расходники",
        prompt: "Зафиксируй инфильтрационную анестезию Артикаин 1.7 мл и списание карпулы",
        description: "Автоматический учет анестетика с контролем сердечно-сосудистого риска",
        category: "Клинический приём у кресла",
        icon: "ShieldAlert",
        mode: "both",
        requiresConfirmation: false,
        targetTool: "crmPharmacologyTools.registerAnesthesia",
        shortVoiceTrigger: "анестезия артикаин",
      },
      {
        id: "chairside-norm",
        label: "Физиологическая норма в 1 клик",
        prompt: "Установи норму: соматически здоров, интактные зубы без патологий",
        description: "0-клик заполнение физиологической нормы без излишней бюрократии (Мандат 8e)",
        category: "Клинический приём у кресла",
        icon: "ShieldCheck",
        mode: "both",
        requiresConfirmation: false,
        targetTool: "crmClinicalOdontogramTools.setPhysiologicalNorm",
        shortVoiceTrigger: "интактная норма",
      },
    ],
  },
  {
    id: "billing",
    title: "Финансы, сметы и касса",
    description: "Расчет прозрачных смет, 3 тарифа лечения и оформление чеков",
    icon: "CreditCard",
    items: [
      {
        id: "billing-estimate-3-tiers",
        label: "Рассчитать 3 тарифа сметы",
        prompt: "Рассчитай смету лечения на 3 тарифа: Эконом, Оптимум и Премиум",
        description: "Параллельный расчет альтернативных планов для информированного выбора пациента",
        category: "Финансы, сметы и касса",
        icon: "Calculator",
        mode: "both",
        requiresConfirmation: false,
        targetTool: CRM_FASTIFY_TOOLS_REGISTRY.calcInvoiceKopecks,
        shortVoiceTrigger: "рассчитай 3 сметы",
      },
      {
        id: "billing-receipt-draft",
        label: "Сформировать чек и пречек",
        prompt: "Сформируй предварительный счет на оказанные услуги текущего визита",
        description: "Подготовка прозрачного счета без требования лишних персональных данных",
        category: "Финансы, сметы и касса",
        icon: "Receipt",
        mode: "both",
        requiresConfirmation: true,
        targetTool: CRM_FASTIFY_TOOLS_REGISTRY.createInvoiceDraft,
        shortVoiceTrigger: "счет на оплату",
      },
      {
        id: "billing-warranty-discount",
        label: "Скидка на гарантию до 100%",
        prompt: "Примени гарантийную скидку 100% на перелечивание по гарантии",
        description: "Свобода врачебных решений при устранении осложнений (Мандат 8e)",
        category: "Финансы, сметы и касса",
        icon: "ShieldCheck",
        mode: "both",
        requiresConfirmation: true,
        targetTool: CRM_FASTIFY_TOOLS_REGISTRY.applyDoctorDiscount,
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
        id: "workstation-rvg-capture",
        label: "Оптический захват визиографа",
        prompt: "Захвати активное окно визиографа и прикрепи снимок к зубу в карте",
        description: "Мгновенный оптический захват экрана без ручного сохранения и экспорта файлов",
        category: "Рабочая станция ОС и снимки",
        icon: "Camera",
        mode: "desktop_native",
        requiresConfirmation: false,
        targetTool: CRM_FASTIFY_TOOLS_REGISTRY.captureScreen,
        shortVoiceTrigger: "захвати снимок",
      },
      {
        id: "workstation-hotfolder-scan",
        label: "Снимок из папки автоимпорта",
        prompt: "Проверь сетевую папку томографа (Hotfolder) на наличие новых снимков КЛКТ",
        description: "Автоматический поиск и привязка свежих DICOM/RVG снимков пациента",
        category: "Рабочая станция ОС и снимки",
        icon: "FolderSearch",
        mode: "desktop_native",
        requiresConfirmation: false,
        targetTool: CRM_FASTIFY_TOOLS_REGISTRY.scanHotfolder,
        shortVoiceTrigger: "проверь снимки томографа",
      },
      {
        id: "workstation-launch-romexis",
        label: "Запустить Planmeca Romexis",
        prompt: "Открой 3D исследование пациента в Planmeca Romexis",
        description: "Нативный запуск десктопного просмотрщика КЛКТ с карточкой пациента",
        category: "Рабочая станция ОС и снимки",
        icon: "ExternalLink",
        mode: "desktop_native",
        requiresConfirmation: false,
        targetTool: "workstationTools.launchViewer",
        shortVoiceTrigger: "открой ромексис",
      },
      {
        id: "workstation-fiscal-printer",
        label: "Кассовый аппарат по COM/USB",
        prompt: "Проверь статус фискального регистратора Атол / Штрих-М и состояние смены",
        description: "Прямой контроль печати чеков и соединения с кассовым регистратором",
        category: "Рабочая станция ОС и снимки",
        icon: "Receipt",
        mode: "desktop_native",
        requiresConfirmation: false,
        targetTool: "workstationTools.checkFiscalPrinter",
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
        id: "schedule-free-slots",
        label: "Свободные окна сегодня",
        prompt: "Покажи все свободные слоты у терапевта на сегодня",
        description: "Мгновенный обзор доступных окон для экстренной или плановой записи",
        category: "Расписание и запись",
        icon: "Clock",
        mode: "both",
        requiresConfirmation: false,
        targetTool: "crmScheduleTools.getAvailableSlots",
        shortVoiceTrigger: "свободные окна",
      },
      {
        id: "schedule-book-appointment",
        label: "Записать на повторный приём",
        prompt: "Запиши пациента на следующий этап эндодонтии через 5 дней",
        description: "Бронирование кресла без обязательного ручного выбора начмедов и ассистентов",
        category: "Расписание и запись",
        icon: "CalendarPlus",
        mode: "both",
        requiresConfirmation: true,
        targetTool: CRM_FASTIFY_TOOLS_REGISTRY.createAppointmentSlot,
        shortVoiceTrigger: "записать через 5 дней",
      },
    ],
  },
  {
    id: "knowledge",
    title: "Стандарты и клинические протоколы",
    description: "Клинические рекомендации СтАР, согласия и гарантийные нормативы",
    icon: "BookOpen",
    items: [
      {
        id: "knowledge-star-guidelines",
        label: "Протоколы СтАР по кариесу",
        prompt: "Покажи клинические критерии препарирования и пломбирования по СтАР",
        description: "Клинические алгоритмы доказательной стоматологии без бюрократического канцелярита",
        category: "Стандарты и клинические протоколы",
        icon: "BookOpen",
        mode: "both",
        requiresConfirmation: false,
        shortVoiceTrigger: "стандарты стар",
      },
      {
        id: "knowledge-consent-forms",
        label: "Бланк согласия на приём",
        prompt: "Подготовь информированное согласие на эндодонтическое лечение для подписи",
        description: "Печать бланка согласия в 1 клик с предзаполненными рисками и диагнозом",
        category: "Стандарты и клинические протоколы",
        icon: "FileText",
        mode: "both",
        requiresConfirmation: false,
        shortVoiceTrigger: "согласие на приём",
      },
    ],
  },
];

export function getCatalogItemsByMode(mode: CopilotRuntimeMode): CopilotCatalogItem[] {
  return COPILOT_CATALOG_CATEGORIES.flatMap((c) =>
    c.items.filter((item) => item.mode === "both" || item.mode === mode)
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
