export type SmartClinicalProtocolKey =
  | "endo_stage_2"
  | "suture_removal"
  | "ortho_activation"
  | "implant_prosthetics"
  | "general_control"
  | "interval_3d"
  | "interval_7d"
  | "interval_14d"
  | "interval_6m";

export interface SmartClinicalProtocol {
  key: SmartClinicalProtocolKey;
  title: string;
  shortLabel: string;
  defaultIntervalDays: number;
  allowedIntervalDaysRange: [number, number];
  durationMinutes: number;
  nextStageName: string;
  description: string;
}

export interface RepeatIntervalPreset {
  id: "3d" | "7d" | "14d" | "6m";
  days: number;
  label: string;
  buttonLabel: string;
  protocolKey: SmartClinicalProtocolKey;
}

export const REPEAT_INTERVAL_PRESETS: RepeatIntervalPreset[] = [
  { id: "3d", days: 3, label: "Через 3 дня", buttonLabel: "+ Через 3 дня", protocolKey: "interval_3d" },
  { id: "7d", days: 7, label: "Через 7 дней", buttonLabel: "+ Через 7 дней", protocolKey: "interval_7d" },
  { id: "14d", days: 14, label: "Через 14 дней", buttonLabel: "+ Через 14 дней", protocolKey: "interval_14d" },
  { id: "6m", days: 180, label: "Через 6 месяцев", buttonLabel: "+ Через 6 месяцев", protocolKey: "interval_6m" },
];

export const SMART_CLINICAL_PROTOCOLS: Record<SmartClinicalProtocolKey, SmartClinicalProtocol> = {
  endo_stage_2: {
    key: "endo_stage_2",
    title: "Эндодонтия: этап 2 (обтурация)",
    shortLabel: "Эндо: Обтурация",
    defaultIntervalDays: 10,
    allowedIntervalDaysRange: [7, 14],
    durationMinutes: 45,
    nextStageName: "Этап 2: Обтурация корневых каналов",
    description: "Пломбирование каналов гуттаперчей после антисептического вложения",
  },
  suture_removal: {
    key: "suture_removal",
    title: "Хирургия: снятие швов",
    shortLabel: "Снятие швов",
    defaultIntervalDays: 10,
    allowedIntervalDaysRange: [7, 14],
    durationMinutes: 15,
    nextStageName: "Снятие швов и осмотр заживления",
    description: "Ревизия послеоперационной раны, бережное снятие швов",
  },
  ortho_activation: {
    key: "ortho_activation",
    title: "Ортодонтия: активация дуги",
    shortLabel: "Активация дуги",
    defaultIntervalDays: 21,
    allowedIntervalDaysRange: [21, 28],
    durationMinutes: 30,
    nextStageName: "Активация аппаратуры / замена дуги",
    description: "Плановая замена дуги, наложение эластических цепочек",
  },
  implant_prosthetics: {
    key: "implant_prosthetics",
    title: "Имплантация -> ортопедия (3 мес)",
    shortLabel: "Ортопедия (3 мес)",
    defaultIntervalDays: 90,
    allowedIntervalDaysRange: [80, 105],
    durationMinutes: 45,
    nextStageName: "Ортопедический этап (слепки / скан)",
    description: "Контроль остеоинтеграции, установка формирователя / снятие слепков",
  },
  general_control: {
    key: "general_control",
    title: "Контрольный осмотр",
    shortLabel: "Контроль (7 дн)",
    defaultIntervalDays: 7,
    allowedIntervalDaysRange: [5, 14],
    durationMinutes: 15,
    nextStageName: "Контрольный осмотр и пришлифовка",
    description: "Оценка окклюзионных контактов и адаптации реставрации",
  },
  interval_3d: {
    key: "interval_3d",
    title: "Повторный визит: через 3 дня",
    shortLabel: "Через 3 дня",
    defaultIntervalDays: 3,
    allowedIntervalDaysRange: [2, 5],
    durationMinutes: 30,
    nextStageName: "Повторный осмотр / продолжение лечения",
    description: "Промежуточный контроль состояния через 3 дня",
  },
  interval_7d: {
    key: "interval_7d",
    title: "Повторный визит: через 7 дней",
    shortLabel: "Через 7 дней",
    defaultIntervalDays: 7,
    allowedIntervalDaysRange: [5, 10],
    durationMinutes: 30,
    nextStageName: "Повторный осмотр / продолжение лечения",
    description: "Плановый повторный визит через неделю",
  },
  interval_14d: {
    key: "interval_14d",
    title: "Повторный визит: через 14 дней",
    shortLabel: "Через 14 дней",
    defaultIntervalDays: 14,
    allowedIntervalDaysRange: [12, 18],
    durationMinutes: 30,
    nextStageName: "Повторный прием / 2-й этап",
    description: "Повторный прием через две недели",
  },
  interval_6m: {
    key: "interval_6m",
    title: "Профосмотр: через 6 месяцев",
    shortLabel: "Через 6 месяцев",
    defaultIntervalDays: 180,
    allowedIntervalDaysRange: [170, 200],
    durationMinutes: 30,
    nextStageName: "Плановый профилактический осмотр и гигиена",
    description: "Диспансерный профосмотр через 6 месяцев",
  },
};

export function detectRecommendedProtocol(appointment: {
  diagnosisMkb10?: string | null;
  reason?: string | null;
  clinicalStage?: string | null;
  toothNumber?: number | null;
}): SmartClinicalProtocolKey {
  const mkb = (appointment.diagnosisMkb10 || "").toUpperCase();
  const reason = (appointment.reason || "").toLowerCase();
  const stage = (appointment.clinicalStage || "").toLowerCase();

  if (
    mkb.startsWith("K04") ||
    reason.includes("пульпит") ||
    reason.includes("периодонтит") ||
    reason.includes("эндо") ||
    reason.includes("каналы") ||
    stage.includes("канал")
  ) {
    return "endo_stage_2";
  }

  if (
    mkb.startsWith("K07") ||
    reason.includes("орто") ||
    reason.includes("брекет") ||
    reason.includes("дуг") ||
    reason.includes("элайнер") ||
    stage.includes("орто")
  ) {
    return "ortho_activation";
  }

  if (
    reason.includes("имплант") ||
    reason.includes("синус") ||
    reason.includes("удаление") ||
    reason.includes("резекция") ||
    reason.includes("швы") ||
    mkb.startsWith("K01")
  ) {
    if (reason.includes("имплант") && (stage.includes("2") || reason.includes("приживл"))) {
      return "implant_prosthetics";
    }
    return "suture_removal";
  }

  return "general_control";
}
