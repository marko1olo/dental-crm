/**
 * managementPresets.ts — Practice management presets (schedule, shift, revenue).
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 200 lines.
 * - Mandate 8bi: 0px noise, zero fake hardcoded numbers, ReAct clean state in idle.
 * - Zero cartoon emojis, 100% strict clinical models.
 */

export const MANAGEMENT_PRESETS = [
  {
    id: "schedule-today",
    label: "Пациенты сегодня",
    prompt: "Сколько пациентов сегодня? Кто следующий на приёме?",
    toothNumber: 0,
    toothState: "Healthy",
    toothStateLabel: "Расписание дня",
    surfaces: [],
    services: [],
    soap: {
      complaint: "Запрос расписания приёма врача на сегодня.",
      anamnesis: "Текущая смена врача в расписании клиники.",
      objectiveStatus: "Оперативная сводка приёмов: запланированные записи текущей смены.",
      diagnosis: "Оперативная сводка расписания",
      treatmentPlan: "Запланированные визиты по графику смены.",
      recommendations: "Подготовка инструментов и рабочих наборов к приёмам смены.",
    },
    anesthetic: undefined,
    consent: undefined,
    safetyAlert: {
      id: "alert-sched",
      severity: "info" as const,
      title: "График приёма на сегодня",
      description: "Сверка слотов расписания с текущей сменой врача.",
    },
    verdict: "Оперативная сводка расписания формируется на основе актуальных записей текущей смены.",
    thoughts: [],
  },
  {
    id: "doctor-shift",
    label: "Моя смена",
    prompt: "Какая у меня смена и график на этой неделе?",
    toothNumber: 0,
    toothState: "Healthy",
    toothStateLabel: "Табель смен",
    surfaces: [],
    services: [],
    soap: {
      complaint: "Запрос рабочего графика и сменности врача.",
      anamnesis: "Ставка врача по утвержденному штатному расписанию.",
      objectiveStatus: "График рабочих смен и кабинетов на текущую неделю.",
      diagnosis: "График работы",
      treatmentPlan: "Сменность актуальна, расписание кабинетов закреплено.",
      recommendations: "Соблюдение норм труда и отдыха медицинского персонала.",
    },
    anesthetic: undefined,
    consent: undefined,
    safetyAlert: {
      id: "alert-shift",
      severity: "info" as const,
      title: "Табель рабочего времени",
      description: "График сменности согласован в расписании клиники.",
    },
    verdict: "Информация о текущих смене и кабинете врача по штатному графику.",
    thoughts: [],
  },
  {
    id: "daily-revenue",
    label: "Выручка за сегодня",
    prompt: "Какая выручка и касса за сегодня?",
    toothNumber: 0,
    toothState: "Healthy",
    toothStateLabel: "Касса дня",
    surfaces: [],
    services: [],
    soap: {
      complaint: "Запрос финансовой сводки за текущий рабочий день.",
      anamnesis: "Открытая кассовая смена текущего дня.",
      objectiveStatus: "Оперативная сводка оплат и нарядов-заказов за текущую смену.",
      diagnosis: "Финансовый отчет",
      treatmentPlan: "Сверка фискальных данных, безналичного эквайринга СБП и наличных расчетов.",
      recommendations: "Итоговый Z-отчет формируется при закрытии смены кассиром/администратором.",
    },
    anesthetic: undefined,
    consent: undefined,
    safetyAlert: {
      id: "alert-fin",
      severity: "info" as const,
      title: "Финансовая сводка дня",
      description: "Сверка данных по закрытым заказ-нарядам и способам оплаты смены.",
    },
    verdict: "Оперативная финансовая сводка кассовой смены на основе данных кассового модуля.",
    thoughts: [],
  },
];
