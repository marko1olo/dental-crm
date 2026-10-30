/**
 * copilotCatalogData.ts — Единый канонический SSOT-каталог быстрых клинических команд, навыков и инструментов.
 * 
 * Соответствие мандатам:
 * - Мандат 8b: размер файла строго в Sweet Spot (200–280 строк).
 * - Мандат 8e: автономия врача, Two-Phase Guard (requiresConfirmation для мутаций).
 * - Мандат 8x: чистый клинический язык без советских приказов (043/у, 804н, 54-ФЗ).
 * - Мандат 8wy: двухрежимный харнесс (Веб-клиника vs Рабочая станция ОС).
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
        targetTool: "crmClinicalDiaryTools.saveVisitDiary",
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
        targetTool: "crmClinicalOdontogramTools.updateToothState",
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
        targetTool: "crmBillingTools.calculateTreatmentEstimate",
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
        targetTool: "crmBillingTools.createInvoiceDraft",
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
        targetTool: "crmBillingTools.applyDoctorDiscount",
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
        targetTool: "workstationTools.captureScreen",
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
        targetTool: "workstationTools.scanHotfolder",
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
        targetTool: "crmScheduleTools.createAppointment",
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
  const result: CopilotCatalogItem[] = [];
  for (const cat of COPILOT_CATALOG_CATEGORIES) {
    for (const item of cat.items) {
      if (item.mode === "both" || item.mode === mode) {
        result.push(item);
      }
    }
  }
  return result;
}

export function findCatalogItemById(id: string): CopilotCatalogItem | undefined {
  for (const cat of COPILOT_CATALOG_CATEGORIES) {
    const found = cat.items.find((it) => it.id === id);
    if (found) return found;
  }
  return undefined;
}
