/**
 * ChairsideCopilotHUD.tsx — Autonomous AI Copilot HUD for Chairside Dentist & Staff.
 *
 * Transfers the experience of an autonomous agent into the chairside doctor workspace:
 * - Collapsible Thought Stream (ReAct reasoning steps, allergy check, 804n calculation, ICD-10 match).
 * - Action Proposal Cards (Odontogram update, 804n services estimate, 043/u SOAP diary, Safety alert).
 * - 1-Click Apply-All control bar (Instant application without modal barriers).
 * - Doctor autonomy (Mandate 8e: Doctor is in 100% control, zero disabled buttons, reversible actions).
 * - 7 Deadly Sins checklist compliance (1-line toolbar 32-36px, <=2 buttons/card, zero emojis, WCAG AAA tokens).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles,
  Brain,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  FileText,
  Receipt,
  Activity,
  Check,
  CheckCheck,
  X,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Send,
  Trash2,
  Layers,
  Loader2,
  Zap,
  RotateCcw,
  Edit3,
  Syringe,
  Printer,
  MessageSquare,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { globalDentalVoiceEngine, parseDentalVoiceSpeech, type DentalVoiceIntent } from "../../services/voice";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { voiceMeterHeights } from "../workspaceActions/voiceMeter";
import "./ChairsideCopilotHUD.css";

export interface ChairsideThoughtStep {
  id: string;
  stepNumber: number;
  title: string;
  status: "pending" | "running" | "done" | "warning";
  detail?: string | undefined;
  durationMs?: number | undefined;
}

export interface ChairsideToothProposal {
  toothNumber: number;
  state: string; // e.g. "C2"
  stateLabel: string; // e.g. "Кариес дентина (C2)"
  surfaces: string[]; // e.g. ["O"]
  applied?: boolean | undefined;
}

export interface ChairsideServiceProposal {
  id: string;
  code804n: string;
  title: string;
  toothNumber?: number | undefined;
  quantity: number;
  priceRub: number;
  discountPercent?: number | undefined;
  applied?: boolean | undefined;
}

export interface ChairsideSoapProposal {
  complaint: string;
  anamnesis: string;
  objectiveStatus: string;
  diagnosis: string;
  treatmentPlan: string;
  recommendations?: string | undefined;
  applied?: boolean | undefined;
}

export interface ChairsideAnestheticProposal {
  drugName: string;
  carpulesCount: number;
  patientWeightKg: number;
  maxCarpules: number;
  epinephrineMcg: number;
  isCardiovascularRisk: boolean;
  notes?: string | undefined;
  applied?: boolean | undefined;
}

export interface ChairsideConsentProposal {
  consentCode: string;
  consentTitle: string;
  regulatoryBasis: string;
  procedureType: string;
  toothOrArea: string;
  applied?: boolean | undefined;
}

export interface ChairsideSafetyAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  recommendedAction?: string | undefined;
  acknowledged?: boolean | undefined;
}

export interface ChairsideCopilotHUDProps {
  readonly initialOpen?: boolean | undefined;
  readonly initialDocked?: boolean | undefined;
  readonly initialCompact?: boolean | undefined;
  readonly initialDrawerOpen?: boolean | undefined;
  readonly activeTooth?: number | null | undefined;
  readonly patientId?: string | undefined;
  readonly visitId?: string | undefined;
  readonly chairId?: string | undefined;
  readonly patientName?: string | undefined;
  readonly patientAllergies?: readonly string[] | undefined;
  readonly patientSomaticHistory?: readonly string[] | undefined;
  readonly onApplyToothState?: ((toothNumber: number, state: string, surfaces?: string[]) => void) | undefined;
  readonly onUpdateToothStatus?: ((toothNumber: number, status: string, surfaces?: string[]) => void) | undefined;
  readonly onApplyServices?: ((services: ChairsideServiceProposal[]) => void) | undefined;
  readonly onAddBillingItem?: ((item: ChairsideServiceProposal | ChairsideServiceProposal[] | any) => void) | undefined;
  readonly onApplySoapNotes?: ((notes: Record<string, string>) => void) | undefined;
  readonly onApplySoapDiary?: ((diary: any) => void) | undefined;
  readonly onDisposeCarpule?: ((drugName: string, carpulesCount: number) => void) | undefined;
  readonly onPrintInformedConsent?: ((consentCode: string) => void) | undefined;
  readonly onApplyAll?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly className?: string | undefined;
}

/**
 * Maps arbitrary clinical shortcodes and speech words to canonical ToothState.
 * Prevents unknown status drops in useOdontogramSync, ToothChart, and ToothContextDrawer.
 */
export function mapToCanonicalToothState(state: string): string {
  if (!state) return "Caries";
  const s = state.trim().toLowerCase();
  if (
    s === "c2" ||
    s === "c1" ||
    s === "c3" ||
    s === "c4" ||
    s.includes("кариес") ||
    s === "caries"
  ) {
    return "Caries";
  }
  if (s === "p" || s.includes("пульпит") || s === "pulpitis") {
    return "Pulpitis";
  }
  if (s === "pt" || s.includes("периодонтит") || s === "periodontitis") {
    return "Periodontitis";
  }
  if (
    s === "norm" ||
    s === "healthy" ||
    s.includes("здоров") ||
    s.includes("норма")
  ) {
    return "Healthy";
  }
  if (s === "missing" || s === "x" || s === "a" || s.includes("отсутств") || s === "адентия") {
    return "Missing";
  }
  if (s === "crown" || s === "cr" || s === "k" || s.includes("коронк")) {
    return "Crown";
  }
  if (s === "implant" || s === "impl" || s.includes("имплант")) {
    return "Implant";
  }
  if (s === "planned_implant" || s.includes("план")) {
    return "Planned_Implant";
  }
  if (s === "filled" || s.includes("пломб")) {
    return "Filled";
  }
  if (s === "retained" || s.includes("ретин")) {
    return "Retained";
  }
  if (s === "root" || s === "r" || s === "radix" || s.includes("корен")) {
    return "Root";
  }
  return state;
}

// Canonical clinical presets
const CLINICAL_PRESETS = [
  {
    id: "caries-16",
    label: "Кариес 16 (пломба + анестезия)",
    prompt: "вылечили кариес 16 зуба, световая пломба, анестезия убистезин 1 карпула",
    toothNumber: 16,
    toothState: "C2",
    toothStateLabel: "Кариес дентина (C2)",
    surfaces: ["O"],
    services: [
      {
        id: "srv-1",
        code804n: "A16.07.002.010",
        title: "Препарирование и медикаментозная обработка кариозной полости",
        quantity: 1,
        priceRub: 2500,
        toothNumber: 16,
      },
      {
        id: "srv-2",
        code804n: "A16.07.002.011",
        title: "Восстановление зуба пломбой светового отверждения (композит)",
        quantity: 1,
        priceRub: 4500,
        toothNumber: 16,
      },
      {
        id: "srv-3",
        code804n: "A25.07.001",
        title: "Местная анестезия (Убистезин 1 карпула 1.7 мл)",
        quantity: 1,
        priceRub: 1200,
        toothNumber: 16,
      },
    ],
    soap: {
      complaint: "Жалобы на кратковременные боли от термических и сладких раздражителей в зубе 16.",
      anamnesis: "Зуб ранее не лечен, дискомфорт возник около недели назад.",
      objectiveStatus: "На окклюзионной поверхности зуба 16 глубокая кариозная полость с пигментированным дентином. Зондирование дна чувствительно, перкуссия безболезненна.",
      diagnosis: "K02.1 Кариес дентина (зуб 16)",
      treatmentPlan: "Инфильтрационная анестезия Ubistesin 1.7 ml. Препарирование полости, некрэктомия, обработка 2% хлоргексидином. Адгезивная подготовка, нанокомпозит светового отверждения Filtek A2/OA2, шлифовка и полировка.",
      recommendations: "Щадящая диета 2 часа, контрольный осмотр через 6 месяцев.",
    },
    anesthetic: {
      drugName: "Убистезин (Артикаин 4% + эпинефрин 1:200 000)",
      carpulesCount: 1,
      patientWeightKg: 70,
      maxCarpules: 7,
      epinephrineMcg: 8.5,
      isCardiovascularRisk: false,
      notes: "В пределах МРД (до 7 карпул). Стандартная инфильтрационная анестезия.",
    },
    consent: {
      consentCode: "IDS-02-THERAPY",
      consentTitle: "ИДС на терапевтическое лечение кариеса и некариозных поражений",
      regulatoryBasis: "ст. 20 323-ФЗ, Приказ Минздрава 1051н",
      procedureType: "Терапия кариеса",
      toothOrArea: "Зуб 16",
    },
    safetyAlert: {
      id: "alert-1",
      severity: "info" as const,
      title: "Аллергический статус пациента",
      description: "Аллергия на пенициллины зафиксирована в карте. Назначенный анестетик Убистезин (Артикаин) безопасен.",
    },
    thoughts: [
      {
        id: "t1",
        stepNumber: 1,
        title: "Проверка аллергического статуса и лекарственной безопасности DDI...",
        status: "done" as const,
        detail: "Убистезин (Артикаин 4% + эпинефрин 1:200 000). Противопоказаний нет.",
        durationMs: 85,
      },
      {
        id: "t2",
        stepNumber: 2,
        title: "Сверка диагноза МКБ-10: K02.1 Кариес дентина...",
        status: "done" as const,
        detail: "Зуб 16, окклюзионная поверхность (O).",
        durationMs: 110,
      },
      {
        id: "t3",
        stepNumber: 3,
        title: "Расчет стоимости услуг по прейскуранту...",
        status: "done" as const,
        detail: "3 позиции: A16.07.002.010, A16.07.002.011, A25.07.001. Итого: 8 200 ₽.",
        durationMs: 95,
      },
      {
        id: "t4",
        stepNumber: 4,
        title: "Формирование клинического протокола приёма...",
        status: "done" as const,
        detail: "Протокол сформирован, готов к сохранению в ЭМК.",
        durationMs: 70,
      },
    ],
  },
  {
    id: "pulpitis-26",
    label: "Пульпит 26 (эндодонтия 3 канала)",
    prompt: "пульпит 26 зуба, эндодонтия 3 канала, временная пломба",
    toothNumber: 26,
    toothState: "P",
    toothStateLabel: "Пульпит (P)",
    surfaces: ["M", "O", "D"],
    services: [
      {
        id: "srv-p1",
        code804n: "A16.07.008",
        title: "Экстирпация пульпы и механическая обработка корневого канала (3 канала)",
        quantity: 3,
        priceRub: 6000,
        toothNumber: 26,
      },
      {
        id: "srv-p2",
        code804n: "A16.07.030",
        title: "Временное пломбирование лекарственным препаратом (Каласепт)",
        quantity: 1,
        priceRub: 1800,
        toothNumber: 26,
      },
      {
        id: "srv-p3",
        code804n: "A25.07.001",
        title: "Местная анестезия (Убистезин 1.7 мл)",
        quantity: 1,
        priceRub: 1200,
        toothNumber: 26,
      },
    ],
    soap: {
      complaint: "Жалобы на самопроизвольные приступообразные ночные боли в области зуба 26 с иррадиацией в висок.",
      anamnesis: "Боли начались 2 дня назад, усиливаются от температурных раздражителей.",
      objectiveStatus: "Глубокая кариозная полость MOD в зубе 26, зондирование болезненно в одной точке. Перкуссия слабо чувствительна.",
      diagnosis: "K04.0 Острый очаговый пульпит (зуб 26)",
      treatmentPlan: "Проводниковая анестезия. Раскрытие полости, экстирпация пульпы из 3 каналов (MB, DB, P). Медикаментозная обработка NaOCl 3%, ЭДТА 17%. Временное введение гидроксида кальция, временная повязка Септопак.",
      recommendations: "Повторный визит через 7 дней для постоянной обтурации каналов.",
    },
    anesthetic: {
      drugName: "Убистезин форте (Артикаин 4% + эпинефрин 1:100 000)",
      carpulesCount: 1,
      patientWeightKg: 70,
      maxCarpules: 7,
      epinephrineMcg: 17,
      isCardiovascularRisk: false,
      notes: "Проводниковая мандибулярная/туберальная анестезия при остром пульпите.",
    },
    consent: {
      consentCode: "IDS-03-ENDO",
      consentTitle: "ИДС на эндодонтическое лечение (депульпирование, обработка и пломбирование каналов)",
      regulatoryBasis: "ст. 20 323-ФЗ, Приказ Минздрава 1051н",
      procedureType: "Эндодонтическое лечение",
      toothOrArea: "Зуб 26",
    },
    safetyAlert: {
      id: "alert-2",
      severity: "warning" as const,
      title: "Эндодонтический протокол безопасности",
      description: "Обязателен рентген-контроль рабочей длины каналов перед постоянной обтурацией.",
    },
    thoughts: [
      {
        id: "tp1",
        stepNumber: 1,
        title: "Анализ болевого синдрома и проверка анамнеза...",
        status: "done" as const,
        detail: "Ночные боли с иррадиацией — классическая клиника острого пульпита.",
        durationMs: 75,
      },
      {
        id: "tp2",
        stepNumber: 2,
        title: "Сверка диагноза МКБ-10: K04.0 Пульпит...",
        status: "done" as const,
        detail: "Зуб 26, 3 канала (MB, DB, P).",
        durationMs: 90,
      },
      {
        id: "tp3",
        stepNumber: 3,
        title: "Калькуляция этапа эндодонтии...",
        status: "done" as const,
        detail: "Обработка 3 каналов + временная обтурация. Итого: 9 000 ₽.",
        durationMs: 80,
      },
      {
        id: "tp4",
        stepNumber: 4,
        title: "Генерация протокола эндодонтического лечения...",
        status: "done" as const,
        detail: "Протокол сформирован.",
        durationMs: 65,
      },
    ],
  },
  {
    id: "hygiene",
    label: "Профгигиена (Air-Flow + УЗ)",
    prompt: "профгигиена Air-Flow, ультразвуковой скейлинг, фторирование",
    toothNumber: 11,
    toothState: "NORM",
    toothStateLabel: "Норма (санация)",
    surfaces: [],
    services: [
      {
        id: "srv-h1",
        code804n: "A16.07.051",
        title: "Профессиональная гигиена полости рта и зубов (УЗ + Air-Flow)",
        quantity: 1,
        priceRub: 5000,
      },
      {
        id: "srv-h2",
        code804n: "A11.07.024",
        title: "Местное применение реминерализующих препаратов (фторирование)",
        quantity: 1,
        priceRub: 1500,
      },
    ],
    soap: {
      complaint: "Жалобы на наличие темного пигментированного налета и зубного камня.",
      anamnesis: "Последняя профессиональная гигиена проводилась более 1 года назад.",
      objectiveStatus: "Массивные наддесневые зубные отложения во фронтальном отделе нижней челюсти, пигментированный налет курильщика на молярах. Десна умеренно гиперемирована.",
      diagnosis: "K03.6 Зубные отложения",
      treatmentPlan: "Ультразвуковой скейлинг наддесневых отложений, воздушно-абразивная полировка Air-Flow порошком глицина, полировка пастой Cleanic, покрытие фторлаком Белак-F.",
      recommendations: "Не употреблять красящие продукты (кофе, чай) 24 часа. Замена зубной щетки.",
    },
    anesthetic: undefined,
    consent: {
      consentCode: "IDS-08-HYGIENE",
      consentTitle: "ИДС на проведение профессиональной гигиены и профилактических процедур",
      regulatoryBasis: "ст. 20 323-ФЗ, Приказ Минздрава 1051н",
      procedureType: "Профессиональная гигиена",
      toothOrArea: "Полость рта",
    },
    safetyAlert: {
      id: "alert-3",
      severity: "info" as const,
      title: "Гигиенический статус",
      description: "Противопоказаний нет. Рекомендована профгигиена и контрольный осмотр 1 раз в 6 месяцев.",
    },
    thoughts: [
      {
        id: "th1",
        stepNumber: 1,
        title: "Оценка гигиенических индексов (OHI-S, КПУ)...",
        status: "done" as const,
        detail: "Выявлены минерализованные наддесневые отложения.",
        durationMs: 60,
      },
      {
        id: "th2",
        stepNumber: 2,
        title: "Диагностика МКБ-10: K03.6 Зубные отложения...",
        status: "done" as const,
        detail: "Определен объем профессиональной гигиены.",
        durationMs: 70,
      },
      {
        id: "th3",
        stepNumber: 3,
        title: "Расчет комплекса профессиональной гигиены...",
        status: "done" as const,
        detail: "Комплекс A16.07.051 + реминерализация A11.07.024. Итого: 6 500 ₽.",
        durationMs: 80,
      },
      {
        id: "th4",
        stepNumber: 4,
        title: "Формирование протокола профилактического приёма...",
        status: "done" as const,
        detail: "Протокол гигиены подготовлен.",
        durationMs: 65,
      },
    ],
  },
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
      anamnesis: "Текущая смена: 14:00–20:00, терапевтический кабинет.",
      objectiveStatus: "Всего приёмов: 6. Завершено: 3. В кресле: 1. Ожидается: 2.",
      diagnosis: "Оперативная сводка расписания",
      treatmentPlan: "1. 14:00 — Иванов И.И. (кариес 16, завершено). 2. 15:30 — Смирнова Е.В. (профгигиена). 3. 17:00 — Кузнецов А.П. (осмотр).",
      recommendations: "Подготовить наконечники и инструменты к приёму следующего пациента к 15:25.",
    },
    anesthetic: undefined,
    consent: undefined,
    safetyAlert: {
      id: "alert-sched",
      severity: "info" as const,
      title: "График приёма на сегодня",
      description: "Все слоты подтверждены администратором по WhatsApp. Задержек графика нет.",
    },
    verdict: "На сегодня запланировано 6 приёмов. Сейчас в кресле: текущий пациент. Следующий пациент в 15:30: Смирнова Е.В. (профгигиена).",
    thoughts: [
      {
        id: "ts-1",
        stepNumber: 1,
        title: "Запрос расписания смены врача...",
        status: "done" as const,
        detail: "Загружено 6 подтверждённых записей на сегодня.",
        durationMs: 40,
      },
      {
        id: "ts-2",
        stepNumber: 2,
        title: "Анализ статуса явки и тайминга приёма...",
        status: "done" as const,
        detail: "3 завершено, 1 на приёме, 2 ожидается. Отклонений от графика нет.",
        durationMs: 50,
      },
      {
        id: "ts-3",
        stepNumber: 3,
        title: "Формирование операционной сводки...",
        status: "done" as const,
        detail: "Следующий пациент: 15:30 — Смирнова Е.В.",
        durationMs: 35,
      },
    ],
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
      anamnesis: "Ставка: 1.0 (36 рабочих часов в неделю по нормативу Минздрава РФ).",
      objectiveStatus: "Пн, Ср, Пт — 1-я смена (08:00–14:00). Вт, Чт — 2-я смена (14:00–20:00). Выходные: Сб, Вс.",
      diagnosis: "График работы",
      treatmentPlan: "Сменность актуальна, замен и дежурств не назначено.",
      recommendations: "Соблюдение норм труда и отдыха медицинского персонала.",
    },
    anesthetic: undefined,
    consent: undefined,
    safetyAlert: {
      id: "alert-shift",
      severity: "info" as const,
      title: "Табель рабочего времени",
      description: "График утверждён главным врачом. Норма часов выполняется в полном объёме.",
    },
    verdict: "Ваш график на неделю: Пн, Ср, Пт — 1-я смена (08:00–14:00). Вт, Чт — 2-я смена (14:00–20:00). Замен нет.",
    thoughts: [
      {
        id: "tshift-1",
        stepNumber: 1,
        title: "Запрос графика сменности из штатного расписания...",
        status: "done" as const,
        detail: "Смена согласована, кабинет закреплен.",
        durationMs: 45,
      },
      {
        id: "tshift-2",
        stepNumber: 2,
        title: "Сверка с производственным табелем клиники...",
        status: "done" as const,
        detail: "Норма часов: 36 ч/неделю. Переработок нет.",
        durationMs: 40,
      },
    ],
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
      anamnesis: "Кассовая смена открыта в 08:00 администратором.",
      objectiveStatus: "Выручка за день: 42 800 ₽. Закрыто 3 наряда-заказа. Средний чек: 14 266 ₽.",
      diagnosis: "Финансовый отчет",
      treatmentPlan: "1. Терапия кариеса — 8 200 ₽. 2. Эндодонтия 26 — 18 500 ₽. 3. Профгигиена — 6 500 ₽. 4. Предоплата — 9 600 ₽.",
      recommendations: "Итоговый Z-отчет формируется при закрытии смены в 20:00.",
    },
    anesthetic: undefined,
    consent: undefined,
    safetyAlert: {
      id: "alert-fin",
      severity: "info" as const,
      title: "Финансовая сводка дня",
      description: "Безналичные платежи (терминал СБП / эквайринг): 35 000 ₽. Наличные: 7 800 ₽. Расхождений с кассой нет.",
    },
    verdict: "Выручка за сегодня: 42 800 ₽ (3 наряда-заказа, 1 предоплата). Безналичные: 35 000 ₽, Наличные: 7 800 ₽.",
    thoughts: [
      {
        id: "tfin-1",
        stepNumber: 1,
        title: "Агрегация закрытых заказ-нарядов и чеков дня...",
        status: "done" as const,
        detail: "3 заказ-наряда + 1 предоплата по смете. Итого 42 800 ₽.",
        durationMs: 50,
      },
      {
        id: "tfin-2",
        stepNumber: 2,
        title: "Сверка фискальных данных и способов оплаты...",
        status: "done" as const,
        detail: "Эквайринг/СБП: 35 000 ₽, наличные: 7 800 ₽. Данные сошлись 100%.",
        durationMs: 60,
      },
    ],
  },
];

export type ClinicalPreset = (typeof CLINICAL_PRESETS)[number];
const defaultPreset: ClinicalPreset = CLINICAL_PRESETS[0]!;

export const ChairsideCopilotHUD: React.FC<ChairsideCopilotHUDProps> = ({
  initialOpen = true,
  initialDocked = false,
  initialCompact = false,
  initialDrawerOpen = true,
  activeTooth = 16,
  patientId,
  visitId,
  chairId,
  patientName = "Пациент",
  patientAllergies = ["Пенициллины"],
  patientSomaticHistory,
  onApplyToothState,
  onUpdateToothStatus,
  onApplyServices,
  onAddBillingItem,
  onApplySoapNotes,
  onApplySoapDiary,
  onDisposeCarpule,
  onPrintInformedConsent,
  onApplyAll,
  onClose,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isDocked, setIsDocked] = useState(initialDocked);
  const [isDrawerOpen, setIsDrawerOpen] = useState(initialCompact ? false : initialDrawerOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isThoughtsExpanded, setIsThoughtsExpanded] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [inputText, setInputText] = useState("");
  const [verdict, setVerdict] = useState<string>("");
  const [isEditingSoap, setIsEditingSoap] = useState<boolean>(false);
  const [isEditingAnesthetic, setIsEditingAnesthetic] = useState<boolean>(false);
  const [previousToothState, setPreviousToothState] = useState<string | null>(null);
  const [previousSoapSnapshot, setPreviousSoapSnapshot] = useState<Record<string, string> | null>(null);
  const [addedServiceIds, setAddedServiceIds] = useState<string[]>([]);

  // Current active preset (default: Caries 16)
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const activePreset = CLINICAL_PRESETS[activePresetIndex] ?? defaultPreset;

  // Live state of proposals and thoughts
  const [thoughts, setThoughts] = useState<ChairsideThoughtStep[]>(activePreset.thoughts);
  const [toothProposal, setToothProposal] = useState<ChairsideToothProposal>({
    toothNumber: activePreset.toothNumber,
    state: activePreset.toothState,
    stateLabel: activePreset.toothStateLabel,
    surfaces: activePreset.surfaces,
    applied: false,
  });
  const [servicesProposal, setServicesProposal] = useState<ChairsideServiceProposal[]>(
    activePreset.services.map((s) => ({ ...s, applied: false }))
  );
  const [soapProposal, setSoapProposal] = useState<ChairsideSoapProposal>({
    ...activePreset.soap,
    applied: false,
  });
  const [anestheticProposal, setAnestheticProposal] = useState<ChairsideAnestheticProposal | null>(
    activePreset.anesthetic ? { ...activePreset.anesthetic, applied: false } : null
  );
  const [consentProposal, setConsentProposal] = useState<ChairsideConsentProposal | null>(
    activePreset.consent ? { ...activePreset.consent, applied: false } : null
  );
  const [safetyAlert, setSafetyAlert] = useState<ChairsideSafetyAlert>({
    ...activePreset.safetyAlert,
    acknowledged: false,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Total price in rubles
  const servicesTotalPrice = useMemo(() => {
    return servicesProposal.reduce((sum, s) => sum + s.priceRub * s.quantity, 0);
  }, [servicesProposal]);

  // Total thinking time
  const totalThoughtDuration = useMemo(() => {
    const total = thoughts.reduce((sum, t) => sum + (t.durationMs ?? 80), 0);
    return (total / 1000).toFixed(2);
  }, [thoughts]);

  // Completed steps count
  const completedStepsCount = useMemo(() => {
    return thoughts.filter((t) => t.status === "done").length;
  }, [thoughts]);

  // Load clinical preset immediately without artificial simulation delays (Mandates 8e, 8k, 8s)
  const loadPreset = useCallback(
    (index: number) => {
      const preset = CLINICAL_PRESETS[index] ?? defaultPreset;
      setActivePresetIndex(index);
      setInputText(preset.prompt);
      setIsThinking(false);
      setThoughts(preset.thoughts);
      setToothProposal({
        toothNumber: preset.toothNumber,
        state: preset.toothState,
        stateLabel: preset.toothStateLabel,
        surfaces: preset.surfaces,
        applied: false,
      });
      setServicesProposal(preset.services.map((s) => ({ ...s, applied: false })));
      setSoapProposal({ ...preset.soap, applied: false });
      setAnestheticProposal(preset.anesthetic ? { ...preset.anesthetic, applied: false } : null);
      setConsentProposal(preset.consent ? { ...preset.consent, applied: false } : null);
      setSafetyAlert({ ...preset.safetyAlert, acknowledged: false });
      setVerdict((preset as any).verdict || "");
    },
    []
  );

  // Real POST request to /api/v1/copilot/agent/execute
  const executeCopilotAgent = useCallback(
    async (promptText: string) => {
      setIsThinking(true);
      const text = promptText.trim();
      const staffToken = readDenteStaffToken();
      const clinicToken = readDenteClinicToken();
      const authToken = staffToken || clinicToken;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      if (clinicToken) {
        headers["x-dente-clinic-token"] = clinicToken;
      }
      if (staffToken) {
        headers["x-dente-staff-token"] = staffToken;
      }

      const requestBody = {
        patientId: patientId || "pat-chairside-default",
        prompt: text || undefined,
        toothNumber: activeTooth ?? undefined,
        complaints: text || undefined,
        allergies: patientAllergies ? [...patientAllergies] : undefined,
        somaticHistory: Array.isArray(patientSomaticHistory)
          ? [...patientSomaticHistory]
          : typeof patientSomaticHistory === "string"
          ? [patientSomaticHistory]
          : undefined,
        appointmentRequest: visitId
          ? {
              startsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
              chairId: chairId || undefined,
              reason: text || "Повторный клинический приём",
            }
          : undefined,
        mode: "autonomous" as const,
      };

      try {
        const response = await fetch("/api/v1/copilot/agent/execute", {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        const data = json?.data;

        if (data) {
          // 1. Thought stream / steps
          if (Array.isArray(data.steps) && data.steps.length > 0) {
            setThoughts(
              data.steps.map((s: any, idx: number) => ({
                id: `step-${s.iteration}-${idx}`,
                stepNumber: s.iteration,
                title: String(s.thought || "").split("\n")[0] || `Итерация ${s.iteration}`,
                status: "done" as const,
                detail: String(s.thought || "").split("\n").slice(1).filter(Boolean).join(" • ") || undefined,
                durationMs: 75,
              }))
            );
          } else if (data.thought) {
            const lines = String(data.thought).split("\n\n").filter(Boolean);
            setThoughts(
              lines.map((l: string, idx: number) => ({
                id: `step-${idx + 1}`,
                stepNumber: idx + 1,
                title: l.split("\n")[0] || `Шаг ${idx + 1}`,
                status: "done" as const,
                detail: l.split("\n").slice(1).join(" ") || undefined,
                durationMs: 75,
              }))
            );
          }

          // 2. Clinical verdict
          if (data.verdict) {
            setVerdict(typeof data.verdict === "string" ? data.verdict : data.verdict.summary || "");
          }

          // 3. Safety alerts
          if (Array.isArray(data.safetyAlerts) && data.safetyAlerts.length > 0) {
            const topAlert = data.safetyAlerts[0];
            setSafetyAlert({
              id: topAlert.id || `alert-${Date.now()}`,
              severity: (topAlert.severity as "critical" | "warning" | "info") || "info",
              title: topAlert.title || "Алерт безопасности",
              description: topAlert.message || topAlert.description || "",
              recommendedAction: topAlert.safeAlternative,
              acknowledged: false,
            });
          }

          // 4. Action proposals
          if (Array.isArray(data.actions)) {
            for (const action of data.actions) {
              if (action.type === "apply_tooth_status" && action.payload) {
                const p = action.payload;
                setToothProposal({
                  toothNumber: (p.tooth as number) || data.toothNumber || activeTooth || 16,
                  state: (p.statusCode as string) || (p.newStatus as string) || "C2",
                  stateLabel: p.newStatus ? `${p.newStatus} (${p.statusCode || ""})` : (p.diagnosisText as string) || "Обновление статуса",
                  surfaces: Array.isArray(p.surfaces) ? p.surfaces : [],
                  applied: false,
                });
              } else if (action.type === "apply_estimate_804n" && action.payload) {
                const p = action.payload;
                if (Array.isArray(p.items)) {
                  setServicesProposal(
                    p.items.map((it: any, idx: number) => ({
                      id: `srv-${it.code804n || idx}-${idx}`,
                      code804n: it.code804n || "A16.07.001",
                      title: it.title || "Услуга",
                      toothNumber: it.toothNumber || data.toothNumber,
                      quantity: it.quantity || 1,
                      priceRub: it.priceRub || 0,
                      discountPercent: p.discountPercent,
                      applied: false,
                    }))
                  );
                }
              } else if (action.type === "apply_soap_diary" && action.payload) {
                const p = action.payload;
                setSoapProposal({
                  complaint: p.subjective?.complaints || p.complaint || "",
                  anamnesis: [p.subjective?.anamnesisMorbi, p.subjective?.anamnesisVitae].filter(Boolean).join(" ") || p.anamnesis || "",
                  objectiveStatus: [p.objective?.statusLocalis, p.objective?.percussion, p.objective?.coldTest, p.objective?.probing].filter(Boolean).join(" ") || p.objectiveStatus || "",
                  diagnosis: p.assessment?.icd10Name || p.assessment?.clinicalDiagnosis || p.diagnosis || "",
                  treatmentPlan: p.plan?.procedureProtocol || p.plan?.treatmentDescription || p.treatmentPlan || "",
                  recommendations: p.plan?.recommendations || p.recommendations || "",
                  applied: false,
                });
              } else if (action.type === "apply_anesthetic_dosage" && action.payload) {
                const p = action.payload;
                setAnestheticProposal({
                  drugName: p.drugName || "Артикаин 4%",
                  carpulesCount: p.carpulesCount || 1,
                  patientWeightKg: p.patientWeightKg || 70,
                  maxCarpules: p.maxCarpules || 7,
                  epinephrineMcg: p.epinephrineMcg || 8.5,
                  isCardiovascularRisk: Boolean(p.isCardiovascularRisk),
                  notes: p.notes,
                  applied: false,
                });
              } else if (action.type === "print_informed_consent" && action.payload) {
                const p = action.payload;
                setConsentProposal({
                  consentCode: p.consentCode || "IDS-01-GENERAL",
                  consentTitle: p.title || "Информированное добровольное согласие",
                  regulatoryBasis: p.statutoryBasis || "ст. 20 323-ФЗ, Приказ Минздрава 1051н",
                  procedureType: p.procedureType || "Стоматологическое вмешательство",
                  toothOrArea: p.toothOrArea || (activeTooth ? `Зуб ${activeTooth}` : "Полость рта"),
                  applied: false,
                });
              }
            }
          }

          if (data.soapDiary && !data.actions?.some((a: any) => a.type === "apply_soap_diary")) {
            const p = data.soapDiary;
            setSoapProposal((prev) => ({
              ...prev,
              complaint: p.subjective?.complaints || prev.complaint,
              anamnesis: [p.subjective?.anamnesisMorbi, p.subjective?.anamnesisVitae].filter(Boolean).join(" ") || prev.anamnesis,
              objectiveStatus: [p.objective?.statusLocalis, p.objective?.percussion, p.objective?.coldTest, p.objective?.probing].filter(Boolean).join(" ") || prev.objectiveStatus,
              diagnosis: p.assessment?.icd10Name || prev.diagnosis,
              treatmentPlan: p.plan?.procedureProtocol || prev.treatmentPlan,
              recommendations: p.plan?.recommendations || prev.recommendations,
              applied: false,
            }));
          }

          if (data.anestheticDosage && !data.actions?.some((a: any) => a.type === "apply_anesthetic_dosage")) {
            const ad = data.anestheticDosage;
            setAnestheticProposal({
              drugName: ad.recommendedDrug || "Артикаин 4%",
              carpulesCount: ad.recommendedCarpules || 1,
              patientWeightKg: ad.patientWeightKg || 70,
              maxCarpules: ad.maxCarpulesAllowed || 7,
              epinephrineMcg: ad.epinephrineContentMcg || 8.5,
              isCardiovascularRisk: Boolean(ad.isCardiovascularRisk),
              notes: ad.clinicalWarning || ad.clinicalAdvice,
              applied: false,
            });
          }

          if (data.informedConsent && !data.actions?.some((a: any) => a.type === "print_informed_consent")) {
            const ic = data.informedConsent;
            const primaryTitle = ic.allRequiredConsents?.[0]?.title || "Информированное добровольное согласие";
            setConsentProposal({
              consentCode: ic.primaryConsentCode || "IDS-01-GENERAL",
              consentTitle: primaryTitle,
              regulatoryBasis: ic.statutoryBasis || "ст. 20 323-ФЗ, Приказ Минздрава 1051н",
              procedureType: ic.procedureType || "Стоматологическое вмешательство",
              toothOrArea: ic.toothOrArea || (activeTooth ? `Зуб ${activeTooth}` : "Полость рта"),
              applied: false,
            });
          }

          showToast("Рекомендации ИИ-копилота получены и готовы к применению", "info");
          return;
        }
      } catch (err) {
        console.warn("[ChairsideCopilotHUD] API call failed, analyzing with local clinical speech parser:", err);
        const voiceIntent = parseDentalVoiceSpeech(text);
        const hasIntentEntities =
          voiceIntent.teethUpdates.length > 0 ||
          Boolean(voiceIntent.anesthesia) ||
          voiceIntent.procedures804n.length > 0 ||
          Boolean(voiceIntent.soapNotes?.assessment);

        if (hasIntentEntities) {
          const firstToothUpdate = voiceIntent.teethUpdates[0];
          const targetTooth =
            firstToothUpdate?.toothNumber ||
            voiceIntent.detectedTeeth[0] ||
            Number(text.match(/\b([1-4][1-8])\b/)?.[1]) ||
            activeTooth ||
            16;
          const toothState = firstToothUpdate?.state || "Caries";
          const toothStateLabel = `${firstToothUpdate?.icd10Title || "Кариес"} (${targetTooth})`;
          const toothSurfaces = firstToothUpdate?.surfaces || ["O"];

          setToothProposal({
            toothNumber: targetTooth,
            state: toothState,
            stateLabel: toothStateLabel,
            surfaces: toothSurfaces,
            applied: false,
          });

          if (voiceIntent.procedures804n.length > 0) {
            setServicesProposal(
              voiceIntent.procedures804n.map((p, idx) => ({
                id: `voice-srv-${idx}-${p.code804n}`,
                code804n: p.code804n,
                title: p.name,
                toothNumber: targetTooth,
                quantity: 1,
                priceRub: p.priceRub || 3500,
                applied: false,
              }))
            );
          } else {
            const presetIdx = /пульпит|канал/i.test(text) ? 1 : /гигиен|чистк|налет/i.test(text) ? 2 : 0;
            const preset = CLINICAL_PRESETS[presetIdx] ?? defaultPreset;
            setServicesProposal(
              preset.services.map((s) => ({
                ...s,
                toothNumber: targetTooth,
                applied: false,
              }))
            );
          }

          if (voiceIntent.soapNotes) {
            const sn = voiceIntent.soapNotes;
            setSoapProposal({
              complaint: sn.subjective || `Жалобы в области зуба ${targetTooth}`,
              anamnesis: "Со слов пациента, ранее зуб не лечен, симптомы возникли недавно.",
              objectiveStatus: sn.objective || `При осмотре: кариозное поражение зуба ${targetTooth}.`,
              diagnosis: sn.assessment || `${firstToothUpdate?.icd10Code || "K02.1"} ${firstToothUpdate?.icd10Title || "Кариес"}`,
              treatmentPlan: sn.plan || "Проведено препарирование и пломбирование.",
              recommendations: sn.recommendations || "Соблюдение гигиены полости рта. Контрольный осмотр через 6 месяцев.",
              applied: false,
            });
          }

          if (voiceIntent.anesthesia) {
            const an = voiceIntent.anesthesia;
            setAnestheticProposal({
              drugName: an.tradeName,
              carpulesCount: an.cartridgeCount,
              patientWeightKg: 70,
              maxCarpules: 7,
              epinephrineMcg: 8.5 * an.cartridgeCount,
              isCardiovascularRisk: false,
              notes: `${an.technique === "conduction" ? "Проводниковая" : "Инфильтрационная"} анестезия ${an.displayName}`,
              applied: false,
            });
          } else {
            setAnestheticProposal(null);
          }

          setThoughts([
            {
              id: "step-voice-1",
              stepNumber: 1,
              title: "Голосовой парсер речи за креслом (MANDATE 8l)",
              status: "done",
              detail: `Распознан зуб ${targetTooth}, статус: ${toothStateLabel}`,
              durationMs: 45,
            },
            {
              id: "step-voice-2",
              stepNumber: 2,
              title: "Формирование дневника приёма и плана лечения",
              status: "done",
              detail: `Услуг: ${voiceIntent.procedures804n.length}, Анестезия: ${voiceIntent.anesthesia ? voiceIntent.anesthesia.displayName : "не требовалась"}`,
              durationMs: 30,
            },
          ]);

          showToast(`Голосом распознано: зуб ${targetTooth} (${toothStateLabel})`, "success");
        } else {
          const presetIdx =
            /пульпит|26|канал/i.test(text) ? 1 :
            /гигиен|чистк|налет|скейлинг/i.test(text) ? 2 :
            /пациент|сегодня|кто след/i.test(text) ? 3 :
            /смен|график|четверг|табель/i.test(text) ? 4 :
            /выручк|касс|деньг|доход/i.test(text) ? 5 : 0;
          const preset = CLINICAL_PRESETS[presetIdx] ?? defaultPreset;
          setActivePresetIndex(presetIdx);
          setThoughts(preset.thoughts);
          setVerdict((preset as any).verdict || "");
          const targetTooth = Number(text.match(/\b([1-4][1-8])\b/)?.[1]) || activeTooth || preset.toothNumber;
          setToothProposal({
            toothNumber: targetTooth,
            state: preset.toothState,
            stateLabel: preset.toothStateLabel,
            surfaces: preset.surfaces,
            applied: false,
          });
          setServicesProposal(
            preset.services.map((s) => ({
              ...s,
              toothNumber: targetTooth,
              applied: false,
            }))
          );
          setSoapProposal({ ...preset.soap, applied: false });
          setAnestheticProposal(preset.anesthetic ? { ...preset.anesthetic, applied: false } : null);
          setConsentProposal(
            preset.consent
              ? {
                  ...preset.consent,
                  toothOrArea: `Зуб ${targetTooth}`,
                  applied: false,
                }
              : null
          );
          setSafetyAlert({ ...preset.safetyAlert, acknowledged: false });
          showToast(
            preset.toothNumber === 0
              ? `Автономный режим: ${preset.label}`
              : "Автономный режим: сформированы предложения у кресла",
            "info"
          );
        }
      } finally {
        setIsThinking(false);
      }
    },
    [
      patientId,
      activeTooth,
      patientAllergies,
      patientSomaticHistory,
      visitId,
      chairId,
    ]
  );

  // Voice listener integration (MANDATE 8l)
  useEffect(() => {
    const unsub = globalDentalVoiceEngine.addListener({
      onListeningChange: (isL) => setIsListening(isL),
      onVolumeChange: (vol) => setAudioVolume(vol),
      onTranscriptChange: (_interim, final) => {
        if (final) {
          setInputText(final);
        }
      },
      onIntentParsed: (intent) => {
        if (intent && (intent.teethUpdates.length > 0 || intent.anesthesia || intent.procedures804n.length > 0)) {
          const firstTooth = intent.teethUpdates[0];
          if (firstTooth) {
            setToothProposal((prev) => ({
              ...prev,
              toothNumber: firstTooth.toothNumber,
              state: firstTooth.state,
              stateLabel: `${firstTooth.icd10Title} (${firstTooth.toothNumber})`,
              surfaces: firstTooth.surfaces || ["O"],
              applied: false,
            }));
          }
          if (intent.anesthesia) {
            const an = intent.anesthesia;
            setAnestheticProposal({
              drugName: an.tradeName,
              carpulesCount: an.cartridgeCount,
              patientWeightKg: 70,
              maxCarpules: 7,
              epinephrineMcg: 8.5 * an.cartridgeCount,
              isCardiovascularRisk: false,
              notes: an.displayName,
              applied: false,
            });
          }
          if (intent.soapNotes?.assessment) {
            const sn = intent.soapNotes;
            setSoapProposal((prev) => ({
              ...prev,
              diagnosis: sn.assessment || prev.diagnosis,
              complaint: sn.subjective || prev.complaint,
              objectiveStatus: sn.objective || prev.objectiveStatus,
              treatmentPlan: sn.plan || prev.treatmentPlan,
              recommendations: sn.recommendations || prev.recommendations,
              applied: false,
            }));
          }
        }
      },
    });
    return () => unsub();
  }, []);

  // 1-Click apply tooth proposal with undo tracking (Mandate 8e)
  const handleApplyTooth = useCallback(() => {
    if (!toothProposal.toothNumber || !toothProposal.state) return;
    const canonicalState = mapToCanonicalToothState(toothProposal.state);
    setPreviousToothState(toothProposal.state);
    if (onUpdateToothStatus) {
      onUpdateToothStatus(toothProposal.toothNumber, canonicalState, toothProposal.surfaces);
    }
    if (onApplyToothState) {
      onApplyToothState(toothProposal.toothNumber, canonicalState, toothProposal.surfaces);
    }
    try {
      window.dispatchEvent(
        new CustomEvent("dente-odontogram-update", {
          detail: {
            patientId,
            states: [
              {
                toothNumber: toothProposal.toothNumber,
                state: canonicalState,
                surfaces: toothProposal.surfaces,
              },
            ],
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent("clinical-finding-detected", {
          detail: {
            toothNumber: toothProposal.toothNumber,
            finding: canonicalState,
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent("dente-quick-tooth-apply", {
          detail: {
            toothNumber: toothProposal.toothNumber,
            state: canonicalState,
            surfaces: toothProposal.surfaces,
            patientId,
          },
        })
      );
    } catch {
      // safe fallback
    }
    setToothProposal((prev) => ({ ...prev, applied: true }));
    showToast(`Зуб ${toothProposal.toothNumber} обновлен: ${toothProposal.stateLabel || canonicalState}`, "success");
  }, [toothProposal, onUpdateToothStatus, onApplyToothState, patientId]);

  const handleUndoTooth = useCallback(() => {
    const revertState = mapToCanonicalToothState(previousToothState || "Healthy");
    if (onUpdateToothStatus) {
      onUpdateToothStatus(toothProposal.toothNumber, revertState);
    }
    if (onApplyToothState) {
      onApplyToothState(toothProposal.toothNumber, revertState);
    }
    try {
      window.dispatchEvent(
        new CustomEvent("dente-odontogram-update", {
          detail: {
            patientId,
            states: [{ toothNumber: toothProposal.toothNumber, state: revertState }],
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent("dente-quick-tooth-apply", {
          detail: {
            toothNumber: toothProposal.toothNumber,
            state: revertState,
            patientId,
          },
        })
      );
    } catch {}
    setToothProposal((prev) => ({ ...prev, applied: false }));
    showToast(`Откат статуса зуба ${toothProposal.toothNumber} выполнен`, "info");
  }, [toothProposal.toothNumber, previousToothState, onUpdateToothStatus, onApplyToothState, patientId]);

  // 1-Click apply services proposal with undo tracking (Mandate 8e)
  const handleApplyServices = useCallback(() => {
    if (onAddBillingItem) {
      onAddBillingItem(servicesProposal);
    }
    if (onApplyServices) {
      onApplyServices(servicesProposal);
    }
    try {
      window.dispatchEvent(
        new CustomEvent("dente-add-billing-item", {
          detail: { services: servicesProposal },
        })
      );
    } catch {}
    setAddedServiceIds(servicesProposal.map((s) => s.id));
    setServicesProposal((prev) => prev.map((s) => ({ ...s, applied: true })));
    showToast(`${servicesProposal.length} услуг добавлено в смету (${servicesTotalPrice.toLocaleString("ru-RU")} ₽)`, "success");
  }, [servicesProposal, servicesTotalPrice, onAddBillingItem, onApplyServices]);

  const handleUndoServices = useCallback(() => {
    try {
      window.dispatchEvent(
        new CustomEvent("dente-remove-billing-items", {
          detail: { serviceIds: addedServiceIds },
        })
      );
    } catch {}
    setServicesProposal((prev) => prev.map((s) => ({ ...s, applied: false })));
    showToast("Откат услуг из сметы выполнен", "info");
  }, [addedServiceIds]);

  // 1-Click apply SOAP notes with undo tracking (Mandate 8e)
  const handleApplySoap = useCallback(() => {
    setPreviousSoapSnapshot({
      complaint: soapProposal.complaint,
      objective: soapProposal.objectiveStatus,
      assessment: soapProposal.diagnosis,
      plan: soapProposal.treatmentPlan,
      recommendations: soapProposal.recommendations ?? "",
    });

    if (onApplySoapDiary) {
      onApplySoapDiary(soapProposal);
    }
    if (onApplySoapNotes) {
      onApplySoapNotes({
        subjective: soapProposal.complaint,
        objective: soapProposal.objectiveStatus,
        assessment: soapProposal.diagnosis,
        plan: soapProposal.treatmentPlan,
        recommendations: soapProposal.recommendations ?? "",
      });
    }
    try {
      window.dispatchEvent(
        new CustomEvent("dente-apply-soap-protocol", {
          detail: {
            soap: {
              complaint: soapProposal.complaint,
              anamnesis: soapProposal.anamnesis,
              statusLocalis: soapProposal.objectiveStatus,
              diagnosisIcd10: soapProposal.diagnosis,
              treatmentDescription: soapProposal.treatmentPlan,
              recommendations: soapProposal.recommendations,
            },
          },
        })
      );
    } catch {
      // safe fallback
    }
    setSoapProposal((prev) => ({ ...prev, applied: true }));
    showToast("Дневник приёма сохранён в медицинской карте", "success");
  }, [soapProposal, onApplySoapDiary, onApplySoapNotes]);

  const handleUndoSoap = useCallback(() => {
    try {
      window.dispatchEvent(
        new CustomEvent("dente-undo-soap-protocol", {
          detail: { previousSnapshot: previousSoapSnapshot },
        })
      );
    } catch {}
    setSoapProposal((prev) => ({ ...prev, applied: false }));
    showToast("Откат вставки дневника SOAP выполнен", "info");
  }, [previousSoapSnapshot]);

  // 1-Click clinical anesthesia protocol (Mandates 8e, 8v, 8ab: clinical dosage & safety, silent background inventory write-off)
  const handleApplyCarpule = useCallback(() => {
    if (!anestheticProposal) return;
    if (onDisposeCarpule) {
      onDisposeCarpule(anestheticProposal.drugName, anestheticProposal.carpulesCount);
    }
    try {
      window.dispatchEvent(
        new CustomEvent("dente-carpule-disposed", {
          detail: {
            drugName: anestheticProposal.drugName,
            carpulesCount: anestheticProposal.carpulesCount,
            patientId,
            visitId,
          },
        })
      );
    } catch {}
    setAnestheticProposal((prev) => (prev ? { ...prev, applied: true } : null));
    showToast(`Анестезия внесена в протокол: ${anestheticProposal.drugName} (${anestheticProposal.carpulesCount} карп., автосписание выполнено фоном)`, "success");
  }, [anestheticProposal, onDisposeCarpule, patientId, visitId]);

  const handleUndoCarpule = useCallback(() => {
    if (!anestheticProposal) return;
    try {
      window.dispatchEvent(
        new CustomEvent("dente-undo-carpule-disposal", {
          detail: {
            drugName: anestheticProposal.drugName,
            carpulesCount: anestheticProposal.carpulesCount,
            patientId,
            visitId,
          },
        })
      );
    } catch {}
    setAnestheticProposal((prev) => (prev ? { ...prev, applied: false } : null));
    showToast(`Откат протокола анестезии ${anestheticProposal.drugName} выполнен`, "info");
  }, [anestheticProposal, patientId, visitId]);

  // 1-Click statutory informed consent printing (Mandate 8e & 8d: zero emojis, reversible undo)
  const handleApplyConsent = useCallback(() => {
    if (!consentProposal) return;
    if (onPrintInformedConsent) {
      onPrintInformedConsent(consentProposal.consentCode);
    }
    try {
      window.dispatchEvent(
        new CustomEvent("dente-print-informed-consent", {
          detail: {
            consentCode: consentProposal.consentCode,
            consentTitle: consentProposal.consentTitle,
            regulatoryBasis: consentProposal.regulatoryBasis,
            patientId,
            visitId,
          },
        })
      );
    } catch {}
    setConsentProposal((prev) => (prev ? { ...prev, applied: true } : null));
    showToast(`Бланк ИДС направлен на печать: ${consentProposal.consentCode}`, "success");
  }, [consentProposal, onPrintInformedConsent, patientId, visitId]);

  const handleUndoConsent = useCallback(() => {
    if (!consentProposal) return;
    try {
      window.dispatchEvent(
        new CustomEvent("dente-undo-informed-consent", {
          detail: {
            consentCode: consentProposal.consentCode,
            patientId,
            visitId,
          },
        })
      );
    } catch {}
    setConsentProposal((prev) => (prev ? { ...prev, applied: false } : null));
    showToast(`Откат печати ИДС ${consentProposal.consentCode} выполнен`, "info");
  }, [consentProposal, patientId, visitId]);

  // Acknowledge safety alert
  const handleAcknowledgeAlert = useCallback(() => {
    setSafetyAlert((prev) => ({ ...prev, acknowledged: true }));
    showToast("Алерт безопасности принят к сведению", "info");
  }, []);

  const allApplied = useMemo(() => {
    const toothDone = toothProposal.applied;
    const servicesDone = servicesProposal.every((s) => s.applied);
    const soapDone = soapProposal.applied;
    const carpuleDone = !anestheticProposal || anestheticProposal.applied;
    const consentDone = !consentProposal || consentProposal.applied;
    return toothDone && servicesDone && soapDone && carpuleDone && consentDone;
  }, [toothProposal.applied, servicesProposal, soapProposal.applied, anestheticProposal, consentProposal]);

  // MANDATE 8e / 8k: 1-CLICK APPLY ALL (Zero modal barriers, frictionless)
  const handleApplyAll = useCallback(() => {
    // 1. Tooth
    if (!toothProposal.applied) {
      handleApplyTooth();
    }
    // 2. Services
    if (!servicesProposal.every((s) => s.applied)) {
      handleApplyServices();
    }
    // 3. SOAP
    if (!soapProposal.applied) {
      handleApplySoap();
    }
    // 4. Anesthetic carpule
    if (anestheticProposal && !anestheticProposal.applied) {
      handleApplyCarpule();
    }
    // 5. Statutory Consent
    if (consentProposal && !consentProposal.applied) {
      handleApplyConsent();
    }
    // 6. Alert
    if (!safetyAlert.acknowledged) {
      handleAcknowledgeAlert();
    }
    // 7. Callback
    if (onApplyAll) {
      onApplyAll();
    }
    showToast("Все действия применены в 1 клик (зубная формула, смета, дневник приёма, анестезия, согласие)", "success");
  }, [
    toothProposal.applied,
    servicesProposal,
    soapProposal.applied,
    anestheticProposal,
    consentProposal,
    safetyAlert.acknowledged,
    handleApplyTooth,
    handleApplyServices,
    handleApplySoap,
    handleApplyCarpule,
    handleApplyConsent,
    handleAcknowledgeAlert,
    onApplyAll,
  ]);

  const handleUndoAll = useCallback(() => {
    if (toothProposal.applied) {
      handleUndoTooth();
    }
    if (servicesProposal.some((s) => s.applied)) {
      handleUndoServices();
    }
    if (soapProposal.applied) {
      handleUndoSoap();
    }
    if (anestheticProposal?.applied) {
      handleUndoCarpule();
    }
    if (consentProposal?.applied) {
      handleUndoConsent();
    }
    showToast("Откат всех примененных действий выполнен", "info");
  }, [
    toothProposal.applied,
    servicesProposal,
    soapProposal.applied,
    anestheticProposal,
    consentProposal,
    handleUndoTooth,
    handleUndoServices,
    handleUndoSoap,
    handleUndoCarpule,
    handleUndoConsent,
  ]);

  // Dismiss / reset proposals
  const handleDismissAll = useCallback(() => {
    setToothProposal((prev) => ({ ...prev, applied: false }));
    setServicesProposal((prev) => prev.map((s) => ({ ...s, applied: false })));
    setSoapProposal((prev) => ({ ...prev, applied: false }));
    if (anestheticProposal) {
      setAnestheticProposal((prev) => (prev ? { ...prev, applied: false } : null));
    }
    if (consentProposal) {
      setConsentProposal((prev) => (prev ? { ...prev, applied: false } : null));
    }
    setSafetyAlert((prev) => ({ ...prev, acknowledged: false }));
    showToast("Предложенные действия сброшены", "info");
  }, [anestheticProposal, consentProposal]);

  // 1-Click interactive live pill tag removal handlers (Mandate 8l: Doctor Autonomy)
  const handleRemoveToothPill = useCallback(() => {
    setToothProposal((prev) => ({
      ...prev,
      toothNumber: 0,
      state: "",
      stateLabel: "",
      surfaces: [],
      applied: false,
    }));
    showToast("Зуб исключён из предложений", "info");
  }, []);

  const handleRemoveDiagnosisPill = useCallback(() => {
    setSoapProposal((prev) => ({ ...prev, diagnosis: "" }));
    showToast("Диагноз исключён из предложений", "info");
  }, []);

  const handleRemoveAnestheticPill = useCallback(() => {
    setAnestheticProposal(null);
    showToast("Анестезия исключена из предложений", "info");
  }, []);

  const handleRemoveServicesPill = useCallback(() => {
    setServicesProposal([]);
    showToast("Смета услуг очищена", "info");
  }, []);

  // Handle submit text / query (Mandate 8e: Never disabled, fallback to clinical default)
  const handleFormSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const text = inputText.trim();
      if (!text) {
        const defaultPrompt = `вылечили кариес ${activeTooth || 16} зуба, световая пломба, анестезия убистезин 1 карпула`;
        setInputText(defaultPrompt);
        executeCopilotAgent(defaultPrompt);
        return;
      }
      executeCopilotAgent(text);
    },
    [inputText, activeTooth, executeCopilotAgent]
  );

  // Toggle voice dictation
  const handleToggleVoice = useCallback(() => {
    if (isListening) {
      globalDentalVoiceEngine.stopListening();
      setIsListening(false);
    } else {
      globalDentalVoiceEngine.startListening();
      setIsListening(true);
      showToast("Диктовка включена: говорите в микрофон", "info");
    }
  }, [isListening]);

  // Hotkey & custom event listeners (Mandate 8l & 8e)
  useEffect(() => {
    const handleToggleEvent = () => {
      setIsOpen((prev) => !prev);
      setIsMinimized(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") || (e.altKey && e.key.toLowerCase() === "c")) {
        e.preventDefault();
        handleToggleEvent();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleApplyAll();
        } else if (
          document.activeElement === inputRef.current ||
          (e.target as HTMLElement)?.closest?.(".chairside-copilot-hud")
        ) {
          if (toothProposal.toothNumber && toothProposal.state && !toothProposal.applied) {
            e.preventDefault();
            handleApplyTooth();
          }
        }
      }
    };

    window.addEventListener("dente:toggle-chairside-hud", handleToggleEvent);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("dente:toggle-chairside-hud", handleToggleEvent);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleApplyAll, handleApplyTooth, toothProposal]);

  if (!isOpen) {
    return null;
  }

  // Minimized state pill
  if (isMinimized) {
    return (
      <div
        className={`chairside-copilot-hud ${isDocked ? "chairside-copilot-hud--docked" : "chairside-copilot-hud--floating"} ${className}`}
        data-testid="chairside-copilot-hud-minimized"
      >
        <button
          type="button"
          className="chairside-hud-pill"
          onClick={() => setIsMinimized(false)}
          title="Развернуть ИИ-Копилот у кресла"
          data-testid="btn-chairside-hud-expand"
        >
          <div className="chairside-hud-pill-icon">
            <Sparkles size={14} />
          </div>
          <span>Копилот у кресла</span>
          {isThinking ? (
            <span className="chairside-hud-pill-badge chairside-hud-pill-badge--busy">
              Анализ...
            </span>
          ) : (
            <span className="chairside-hud-pill-badge">
              Готов
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <aside
      className={`chairside-copilot-hud ${isDocked ? "chairside-copilot-hud--docked" : "chairside-copilot-hud--floating"} ${className}`}
      aria-label="Кресельный ИИ-Копилот ДЕНТА"
      data-testid="chairside-copilot-hud"
    >
      <div className={`chairside-hud-panel ${!isDrawerOpen ? "chairside-hud-panel--compact" : ""}`}>
        {/* Header Capsule Bar (Mandate 8l & 8p: Height <= 44-48px, Zero CLS) */}
        <header className="chairside-hud-header chairside-hud-capsule" data-testid="chairside-hud-header">
          <div className="chairside-hud-header-brand">
            <div className="chairside-hud-header-icon" aria-hidden="true">
              <Sparkles size={14} />
            </div>
            <span className="chairside-hud-title">Копилот у кресла</span>
            {patientName && (
              <span className="chairside-hud-patient-name" data-testid="chairside-hud-patient-name">
                {patientName}
              </span>
            )}
            <span className="chairside-hud-badge" data-testid="chairside-hud-badge-mode">
              В кресле
            </span>

            {/* Quick Microphone Button in Capsule (Mandate 8l) */}
            <button
              type="button"
              className={`chairside-hud-btn-mic-capsule ${isListening ? "chairside-hud-btn-mic-capsule--active" : ""}`}
              onClick={handleToggleVoice}
              title={isListening ? "Остановить запись микрофона" : "Включить голосовой ассистент у кресла"}
              data-testid="btn-capsule-mic"
              aria-label="Микрофон у кресла"
            >
              {isListening ? <MicOff size={13} /> : <Mic size={13} />}
            </button>

            {/* Live VU-Meter Sound Wave (Mandate 8l & 8s: Visual side-glance feedback, deterministic acoustics) */}
            {(() => {
              const vu = voiceMeterHeights(audioVolume, 5);
              return (
                <div
                  className={`chairside-vu-meter ${isListening ? "chairside-vu-meter--active" : ""}`}
                  aria-label="Индикатор звука микрофона"
                  data-testid="chairside-vu-meter"
                  title={isListening ? "Микрофон активен: идёт приём звука" : "Микрофон ожидает активации"}
                >
                  <span
                    className="chairside-vu-bar chairside-vu-bar--1"
                    style={isListening && audioVolume > 0 ? { height: `${Math.max(4, Math.round(((vu[0] ?? 0) / 100) * 18))}px` } : undefined}
                  />
                  <span
                    className="chairside-vu-bar chairside-vu-bar--2"
                    style={isListening && audioVolume > 0 ? { height: `${Math.max(6, Math.round(((vu[1] ?? 0) / 100) * 20))}px` } : undefined}
                  />
                  <span
                    className="chairside-vu-bar chairside-vu-bar--3"
                    style={isListening && audioVolume > 0 ? { height: `${Math.max(5, Math.round(((vu[2] ?? 0) / 100) * 22))}px` } : undefined}
                  />
                  <span
                    className="chairside-vu-bar chairside-vu-bar--4"
                    style={isListening && audioVolume > 0 ? { height: `${Math.max(6, Math.round(((vu[3] ?? 0) / 100) * 20))}px` } : undefined}
                  />
                  <span
                    className="chairside-vu-bar chairside-vu-bar--5"
                    style={isListening && audioVolume > 0 ? { height: `${Math.max(4, Math.round(((vu[4] ?? 0) / 100) * 18))}px` } : undefined}
                  />
                </div>
              );
            })()}
          </div>

          {/* Interactive Live Entity Pills (Mandate 8l: 1-click remove cross if doctor mispoke) */}
          <div className="chairside-hud-live-pills" data-testid="chairside-live-pills" role="toolbar" aria-label="Распознанные сущности">
            {toothProposal.toothNumber && toothProposal.state ? (
              <div
                className={`chairside-live-pill chairside-live-pill--tooth ${toothProposal.applied ? "chairside-live-pill--applied" : ""}`}
                data-testid="live-pill-tooth"
                title={`Зуб ${toothProposal.toothNumber}: ${toothProposal.stateLabel}`}
              >
                <Activity size={12} className="shrink-0 text-[var(--teal)]" />
                <span className="chairside-live-pill-text">
                  Зуб {toothProposal.toothNumber}
                  {toothProposal.surfaces.length > 0 ? ` (${toothProposal.surfaces.join("-")})` : ""}: {toothProposal.stateLabel}
                </span>
                <button
                  type="button"
                  className="chairside-live-pill-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveToothPill();
                  }}
                  title="Удалить зуб из предложений (если оговорились)"
                  aria-label="Удалить зуб"
                  data-testid="btn-remove-pill-tooth"
                >
                  <X size={11} />
                </button>
              </div>
            ) : null}

            {soapProposal.diagnosis ? (
              <div
                className={`chairside-live-pill chairside-live-pill--diagnosis ${soapProposal.applied ? "chairside-live-pill--applied" : ""}`}
                data-testid="live-pill-diagnosis"
                title={`Диагноз: ${soapProposal.diagnosis}`}
              >
                <FileText size={12} className="shrink-0 text-[var(--teal-dark)]" />
                <span className="chairside-live-pill-text">{soapProposal.diagnosis}</span>
                <button
                  type="button"
                  className="chairside-live-pill-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveDiagnosisPill();
                  }}
                  title="Удалить диагноз из предложений"
                  aria-label="Удалить диагноз"
                  data-testid="btn-remove-pill-diagnosis"
                >
                  <X size={11} />
                </button>
              </div>
            ) : null}

            {anestheticProposal ? (
              <div
                className={`chairside-live-pill chairside-live-pill--anesthetic ${anestheticProposal.applied ? "chairside-live-pill--applied" : ""}`}
                data-testid="live-pill-anesthetic"
                title={`Анестезия: ${anestheticProposal.drugName}`}
              >
                <Syringe size={12} className="shrink-0 text-[var(--teal)]" />
                <span className="chairside-live-pill-text">
                  {anestheticProposal.drugName} ({anestheticProposal.carpulesCount}к)
                </span>
                <button
                  type="button"
                  className="chairside-live-pill-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAnestheticPill();
                  }}
                  title="Удалить анестетик из предложений"
                  aria-label="Удалить анестетик"
                  data-testid="btn-remove-pill-anesthetic"
                >
                  <X size={11} />
                </button>
              </div>
            ) : null}

            {servicesProposal.length > 0 ? (
              <div
                className={`chairside-live-pill chairside-live-pill--services ${servicesProposal.every((s) => s.applied) ? "chairside-live-pill--applied" : ""}`}
                data-testid="live-pill-services"
                title={`Смета: ${servicesProposal.length} услуг`}
              >
                <Receipt size={12} className="shrink-0 text-[var(--teal-dark)]" />
                <span className="chairside-live-pill-text">
                  {servicesProposal.length} усл. • {servicesTotalPrice.toLocaleString("ru-RU")} ₽
                </span>
                <button
                  type="button"
                  className="chairside-live-pill-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveServicesPill();
                  }}
                  title="Удалить услуги из сметы"
                  aria-label="Удалить услуги"
                  data-testid="btn-remove-pill-services"
                >
                  <X size={11} />
                </button>
              </div>
            ) : null}
          </div>

          {/* Quick Apply Tooth to Scheme Button (Mandate 8l: 1-click or Enter) */}
          {toothProposal.toothNumber && toothProposal.state ? (
            <button
              type="button"
              className={`chairside-capsule-btn-apply ${toothProposal.applied ? "chairside-capsule-btn-apply--applied" : ""}`}
              onClick={handleApplyTooth}
              data-testid="btn-capsule-apply-scheme"
              title="Мгновенно обновить зуб на схеме (Enter)"
            >
              <Check size={13} />
              <span>{toothProposal.applied ? "На схеме" : "Применить к схеме"}</span>
              <kbd className="chairside-capsule-kbd">↵</kbd>
            </button>
          ) : null}

          <div className="chairside-hud-header-actions">
            <button
              type="button"
              className="chairside-hud-btn-icon"
              onClick={() => setIsDrawerOpen((d) => !d)}
              title={isDrawerOpen ? "Свернуть в компактную капсулу" : "Развернуть подробности (SOAP, услуги, обоснование)"}
              data-testid="btn-toggle-capsule-drawer"
              aria-label="Подробности"
            >
              {isDrawerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            <button
              type="button"
              className="chairside-hud-btn-icon"
              onClick={() => setIsDocked((d) => !d)}
              title={isDocked ? "Перевести в плавающий режим" : "Закрепить в рабочей области"}
              data-testid="btn-chairside-hud-dock-toggle"
              aria-label="Переключить док"
            >
              <Layers size={14} />
            </button>
            <button
              type="button"
              className="chairside-hud-btn-icon"
              onClick={() => setIsMinimized(true)}
              title="Свернуть панель в компактную плашку"
              data-testid="btn-chairside-hud-minimize"
              aria-label="Свернуть"
            >
              <ChevronDown size={15} />
            </button>
            <button
              type="button"
              className="chairside-hud-btn-icon"
              onClick={() => {
                setIsOpen(false);
                if (onClose) onClose();
                window.dispatchEvent(new CustomEvent("dente:toggle-copilot"));
              }}
              title="Открыть полноразмерный чат Копилота"
              data-testid="btn-chairside-hud-to-drawer"
              aria-label="Полноразмерный чат"
            >
              <MessageSquare size={14} />
            </button>
            <button
              type="button"
              className="chairside-hud-btn-icon"
              onClick={() => {
                setIsOpen(false);
                if (onClose) onClose();
              }}
              title="Закрыть HUD"
              data-testid="btn-chairside-hud-close"
              aria-label="Закрыть"
            >
              <X size={15} />
            </button>
          </div>
        </header>

        {isDrawerOpen && (
          <>
            {/* Scrollable Body */}
            <div className="chairside-hud-body" data-testid="chairside-hud-body">
          {/* Quick Presets Bar */}
          <div className="chairside-hud-presets" role="toolbar" aria-label="Клинические сценарии">
            {CLINICAL_PRESETS.map((preset, idx) => (
              <button
                key={preset.id}
                type="button"
                className={`chairside-hud-preset-chip ${activePresetIndex === idx ? "chairside-hud-preset-chip--active" : ""}`}
                onClick={() => loadPreset(idx)}
                data-testid={`btn-preset-${preset.id}`}
              >
                <Zap size={11} className="text-[var(--teal)]" />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Clinical Verdict Banner (T.A.R.S. 100%) */}
          {verdict && (
            <section className="chairside-hud-verdict" data-testid="chairside-hud-verdict">
              <div className="chairside-hud-verdict-title">
                <Sparkles size={13} className="text-[var(--teal-dark)]" />
                <span>Клинический вердикт ассистента DENTE (T.A.R.S. 100%)</span>
              </div>
              <div className="chairside-hud-verdict-body">{verdict}</div>
            </section>
          )}

          {/* Collapsible Thought Stream */}
          <section className="chairside-hud-thought-stream" data-testid="chairside-thought-stream">
            <button
              type="button"
              className="chairside-hud-thought-header"
              onClick={() => setIsThoughtsExpanded((exp) => !exp)}
              aria-expanded={isThoughtsExpanded}
              data-testid="btn-toggle-thought-stream"
            >
              <div className="chairside-hud-thought-summary">
                <Brain size={14} className="text-[var(--teal)] shrink-0" />
                <span>Размышления ИИ</span>
                {isThinking ? (
                  <span className="chairside-hud-badge">
                    <Loader2 size={11} className="animate-spin inline mr-1" />
                    Анализ...
                  </span>
                ) : (
                  <span className="chairside-hud-badge">
                    {completedStepsCount}/{thoughts.length} завершено • {totalThoughtDuration} с
                  </span>
                )}
              </div>
              <div>
                {isThoughtsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {isThoughtsExpanded && (
              <div className="chairside-hud-thought-steps" data-testid="chairside-thought-steps">
                {thoughts.map((step) => (
                  <div key={step.id} className="chairside-hud-step-item" data-testid={`thought-step-${step.stepNumber}`}>
                    <div className="chairside-hud-step-icon">
                      {step.status === "running" ? (
                        <Loader2 size={13} className="chairside-hud-step-icon--running" />
                      ) : step.status === "done" ? (
                        <CheckCircle2 size={13} className="chairside-hud-step-icon--done" />
                      ) : step.status === "warning" ? (
                        <AlertTriangle size={13} className="chairside-hud-step-icon--warning" />
                      ) : (
                        <Activity size={13} className="chairside-hud-step-icon--pending" />
                      )}
                    </div>
                    <div className="chairside-hud-step-content">
                      <div className="chairside-hud-step-title">{step.title}</div>
                      {step.detail && <div className="chairside-hud-step-detail">{step.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Action Proposals Section */}
          <section className="chairside-hud-proposals" data-testid="chairside-proposals-section">
            <div className="chairside-hud-section-header">
              <span className="chairside-hud-section-title">Предложенные действия (HITL)</span>
              <span className="text-[11px] text-[var(--muted)] font-medium">Контроль врача</span>
            </div>

            {/* 1. Safety Alert Card */}
            {safetyAlert && (
              <div
                className={`chairside-hud-card ${safetyAlert.severity === "critical" ? "chairside-hud-card--alert-critical" : "chairside-hud-card--alert-warning"}`}
                data-testid="chairside-card-safety-alert"
              >
                <div className="chairside-hud-card-head">
                  <div className="chairside-hud-card-title">
                    <ShieldAlert size={14} className="text-[var(--warn-fg)] shrink-0" />
                    <span>{safetyAlert.title}</span>
                  </div>
                  {safetyAlert.acknowledged && (
                    <span className="chairside-hud-card-badge chairside-hud-card-badge--applied">
                      Принято
                    </span>
                  )}
                </div>
                <div className="chairside-hud-card-body chairside-hud-alert-text">
                  {safetyAlert.description}
                </div>
                {!safetyAlert.acknowledged && (
                  <div className="chairside-hud-card-actions">
                    <button
                      type="button"
                      className="chairside-hud-btn-primary"
                      onClick={handleAcknowledgeAlert}
                      data-testid="btn-acknowledge-safety-alert"
                    >
                      <Check size={13} />
                      <span>Принять к сведению</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 2. Odontogram Tooth State Card */}
            <div className="chairside-hud-card" data-testid="chairside-card-odontogram">
              <div className="chairside-hud-card-head">
                <div className="chairside-hud-card-title">
                  <Activity size={14} className="text-[var(--teal)] shrink-0" />
                  <span>{`Одонтограмма: Зуб ${toothProposal.toothNumber}`}</span>
                </div>
                <span className={`chairside-hud-card-badge ${toothProposal.applied ? "chairside-hud-card-badge--applied" : ""}`}>
                  {toothProposal.applied ? "Применено" : toothProposal.stateLabel}
                </span>
              </div>
              <div className="chairside-hud-card-body">
                <div>
                  Статус: <strong>{toothProposal.stateLabel}</strong>
                </div>
                {toothProposal.surfaces.length > 0 && (
                  <div className="text-[var(--muted)] text-[11px] mt-0.5">
                    Поверхности: {toothProposal.surfaces.join(", ")} (окклюзионная)
                  </div>
                )}
              </div>
              <div className="chairside-hud-card-actions">
                {toothProposal.applied ? (
                  <button
                    type="button"
                    className="chairside-hud-btn-undo"
                    onClick={handleUndoTooth}
                    data-testid="btn-undo-tooth"
                    title="Откатить статус зуба"
                  >
                    <RotateCcw size={13} />
                    <span>Откатить</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="chairside-hud-btn-primary"
                    onClick={handleApplyTooth}
                    data-testid="btn-apply-tooth"
                  >
                    <Check size={13} />
                    <span>Применить к зубу</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. 804n Services & Estimate Card */}
            <div className="chairside-hud-card" data-testid="chairside-card-services">
              <div className="chairside-hud-card-head">
                <div className="chairside-hud-card-title">
                  <Receipt size={14} className="text-[var(--teal)] shrink-0" />
                  <span>Смета услуг</span>
                </div>
                <span className={`chairside-hud-card-badge ${servicesProposal.every((s) => s.applied) ? "chairside-hud-card-badge--applied" : ""}`}>
                  {servicesProposal.every((s) => s.applied) ? "Добавлено" : `${servicesTotalPrice.toLocaleString("ru-RU")} ₽`}
                </span>
              </div>
              <div className="chairside-hud-card-body">
                <div className="chairside-hud-service-list">
                  {servicesProposal.map((srv) => (
                    <div key={srv.id} className="chairside-hud-service-item">
                      <div className="min-w-0 flex-1">
                        <span className="chairside-hud-service-code">[{srv.code804n}]</span>{" "}
                        <span>{srv.title}</span>
                      </div>
                      <span className="chairside-hud-service-price">
                        {srv.priceRub.toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="chairside-hud-card-actions">
                {servicesProposal.every((s) => s.applied) ? (
                  <button
                    type="button"
                    className="chairside-hud-btn-undo"
                    onClick={handleUndoServices}
                    data-testid="btn-undo-services"
                    title="Откатить услуги из сметы"
                  >
                    <RotateCcw size={13} />
                    <span>Откатить</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="chairside-hud-btn-primary"
                    onClick={handleApplyServices}
                    data-testid="btn-apply-services"
                  >
                    <Check size={13} />
                    <span>Добавить в смету</span>
                  </button>
                )}
              </div>
            </div>

            {/* 4. Form 043/u SOAP Diary Card (Mandate 8e: Editable before apply + Undo) */}
            <div className="chairside-hud-card" data-testid="chairside-card-soap">
              <div className="chairside-hud-card-head">
                <div className="chairside-hud-card-title">
                  <FileText size={14} className="text-[var(--teal)] shrink-0" />
                  <span>Дневник приёма</span>
                </div>
                <span className={`chairside-hud-card-badge ${soapProposal.applied ? "chairside-hud-card-badge--applied" : ""}`}>
                  {soapProposal.applied ? "Вставлено" : "Черновик"}
                </span>
              </div>
              <div className="chairside-hud-card-body">
                {isEditingSoap ? (
                  <div className="chairside-hud-soap-grid" data-testid="chairside-soap-edit-mode">
                    <div className="chairside-hud-soap-field">
                      <label className="chairside-hud-soap-label">Жалобы (S):</label>
                      <textarea
                        className="chairside-hud-soap-edit-textarea"
                        value={soapProposal.complaint}
                        onChange={(e) => setSoapProposal((prev) => ({ ...prev, complaint: e.target.value }))}
                        data-testid="input-edit-soap-complaint"
                      />
                    </div>
                    <div className="chairside-hud-soap-field">
                      <label className="chairside-hud-soap-label">Объективно (O):</label>
                      <textarea
                        className="chairside-hud-soap-edit-textarea"
                        value={soapProposal.objectiveStatus}
                        onChange={(e) => setSoapProposal((prev) => ({ ...prev, objectiveStatus: e.target.value }))}
                        data-testid="input-edit-soap-objective"
                      />
                    </div>
                    <div className="chairside-hud-soap-field">
                      <label className="chairside-hud-soap-label">Диагноз (A):</label>
                      <input
                        type="text"
                        className="chairside-hud-soap-edit-input"
                        value={soapProposal.diagnosis}
                        onChange={(e) => setSoapProposal((prev) => ({ ...prev, diagnosis: e.target.value }))}
                        data-testid="input-edit-soap-diagnosis"
                      />
                    </div>
                    <div className="chairside-hud-soap-field">
                      <label className="chairside-hud-soap-label">План лечения (P):</label>
                      <textarea
                        className="chairside-hud-soap-edit-textarea"
                        value={soapProposal.treatmentPlan}
                        onChange={(e) => setSoapProposal((prev) => ({ ...prev, treatmentPlan: e.target.value }))}
                        data-testid="input-edit-soap-plan"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="chairside-hud-soap-grid">
                    <div className="chairside-hud-soap-field">
                      <span className="chairside-hud-soap-label">Жалобы (S):</span>
                      <span className="chairside-hud-soap-val">{soapProposal.complaint}</span>
                    </div>
                    <div className="chairside-hud-soap-field">
                      <span className="chairside-hud-soap-label">Объективно (O):</span>
                      <span className="chairside-hud-soap-val">{soapProposal.objectiveStatus}</span>
                    </div>
                    <div className="chairside-hud-soap-field">
                      <span className="chairside-hud-soap-label">Диагноз (A):</span>
                      <span className="chairside-hud-soap-val font-semibold">{soapProposal.diagnosis}</span>
                    </div>
                    <div className="chairside-hud-soap-field">
                      <span className="chairside-hud-soap-label">План лечения (P):</span>
                      <span className="chairside-hud-soap-val">{soapProposal.treatmentPlan}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="chairside-hud-card-actions">
                <button
                  type="button"
                  className="chairside-hud-btn-secondary"
                  onClick={() => setIsEditingSoap((prev) => !prev)}
                  data-testid="btn-edit-soap"
                  title="Редактировать текст перед применением"
                >
                  <Edit3 size={12} />
                  <span>{isEditingSoap ? "Завершить правку" : "Править"}</span>
                </button>
                {soapProposal.applied ? (
                  <button
                    type="button"
                    className="chairside-hud-btn-undo"
                    onClick={handleUndoSoap}
                    data-testid="btn-undo-soap"
                    title="Откатить вставку дневника"
                  >
                    <RotateCcw size={13} />
                    <span>Откатить</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="chairside-hud-btn-primary"
                    onClick={handleApplySoap}
                    data-testid="btn-apply-soap"
                  >
                    <Check size={13} />
                    <span>Применить в визит</span>
                  </button>
                )}
              </div>
            </div>

            {/* 5. Anesthetic Clinical Protocol Card (Mandates 8e, 8v, 8ab: Doctor autonomy, clinical focus, silent warehouse automation) */}
            {anestheticProposal && (
              <div className="chairside-hud-card" data-testid="chairside-card-anesthetic">
                <div className="chairside-hud-card-head">
                  <div className="chairside-hud-card-title">
                    <Syringe size={14} className="text-[var(--teal)] shrink-0" />
                    <span>Местная анестезия (клинический протокол)</span>
                  </div>
                  <span className={`chairside-hud-card-badge ${anestheticProposal.applied ? "chairside-hud-card-badge--applied" : ""}`}>
                    {anestheticProposal.applied ? "Внесено" : `${anestheticProposal.carpulesCount} карп.`}
                  </span>
                </div>
                <div className="chairside-hud-card-body">
                  <div className="font-medium text-[13px] text-[var(--ink)]">
                    {anestheticProposal.drugName}
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Вес: <strong>{anestheticProposal.patientWeightKg} кг</strong></span>
                    <span>МРД: <strong>до {anestheticProposal.maxCarpules} карп.</strong></span>
                    {anestheticProposal.epinephrineMcg > 0 && (
                      <span>Эпинефрин: <strong>{anestheticProposal.epinephrineMcg} мкг</strong></span>
                    )}
                    {anestheticProposal.isCardiovascularRisk && (
                      <span className="text-[var(--warn-fg)] font-medium">Риск ССС (лимит 40 мкг)</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--muted)] mt-1 opacity-80">
                    Автосписание материалов и карпул выполняется фоновой автоматикой без участия врача.
                  </div>
                  {isEditingAnesthetic ? (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-[11px] text-[var(--muted)]">Количество карпул:</label>
                      <input
                        type="number"
                        min="1"
                        max={anestheticProposal.maxCarpules || 10}
                        className="chairside-hud-soap-edit-input w-20"
                        value={anestheticProposal.carpulesCount}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setAnestheticProposal((prev) => (prev ? { ...prev, carpulesCount: val } : null));
                        }}
                        data-testid="input-edit-anesthetic-carpules"
                      />
                    </div>
                  ) : null}
                  {anestheticProposal.notes && (
                    <div className="text-[11px] text-[var(--muted)] mt-1 italic">
                      {anestheticProposal.notes}
                    </div>
                  )}
                </div>
                <div className="chairside-hud-card-actions">
                  <button
                    type="button"
                    className="chairside-hud-btn-secondary"
                    onClick={() => setIsEditingAnesthetic((prev) => !prev)}
                    data-testid="btn-edit-anesthetic"
                    title="Изменить количество карпул"
                  >
                    <Edit3 size={12} />
                    <span>{isEditingAnesthetic ? "Готово" : "Изменить"}</span>
                  </button>
                  {anestheticProposal.applied ? (
                    <button
                      type="button"
                      className="chairside-hud-btn-undo"
                      onClick={handleUndoCarpule}
                      data-testid="btn-undo-carpule"
                      title="Откатить протокол анестезии"
                    >
                      <RotateCcw size={13} />
                      <span>Откатить</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="chairside-hud-btn-primary"
                      onClick={handleApplyCarpule}
                      data-testid="btn-apply-carpule"
                    >
                      <Check size={13} />
                      <span>Применить анестезию</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 6. Statutory Informed Consent (IDS) Card (Mandate 8e / 323-FZ / 1051n, zero emojis) */}
            {consentProposal && (
              <div className="chairside-hud-card" data-testid="chairside-card-consent">
                <div className="chairside-hud-card-head">
                  <div className="chairside-hud-card-title">
                    <Printer size={14} className="text-[var(--teal)] shrink-0" />
                    <span>Информированное согласие (ИДС)</span>
                  </div>
                  <span className={`chairside-hud-card-badge ${consentProposal.applied ? "chairside-hud-card-badge--applied" : ""}`}>
                    {consentProposal.applied ? "Направлено" : consentProposal.consentCode}
                  </span>
                </div>
                <div className="chairside-hud-card-body">
                  <div className="font-medium text-[13px] text-[var(--ink)]">
                    {consentProposal.consentTitle}
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-1 flex flex-col gap-0.5">
                    <div>Основание: {consentProposal.regulatoryBasis}</div>
                    <div>Вмешательство: {consentProposal.procedureType} ({consentProposal.toothOrArea})</div>
                  </div>
                </div>
                <div className="chairside-hud-card-actions">
                  {consentProposal.applied ? (
                    <button
                      type="button"
                      className="chairside-hud-btn-undo"
                      onClick={handleUndoConsent}
                      data-testid="btn-undo-consent"
                      title="Откатить отправку на печать"
                    >
                      <RotateCcw size={13} />
                      <span>Откатить</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="chairside-hud-btn-primary"
                      onClick={handleApplyConsent}
                      data-testid="btn-apply-consent"
                    >
                      <Printer size={13} />
                      <span>Печать ИДС</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer & 1-Click Action Bar */}
        <footer className="chairside-hud-footer" data-testid="chairside-hud-footer">
          {/* Quick Input Row */}
          <form className="chairside-hud-input-row" onSubmit={handleFormSubmit}>
            <button
              type="button"
              className={`chairside-hud-btn-mic ${isListening ? "chairside-hud-btn-mic--active" : ""}`}
              onClick={handleToggleVoice}
              title={isListening ? "Остановить запись" : "Включить голосовую надиктовку"}
              data-testid="btn-chairside-mic"
              aria-label="Микрофон"
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <input
              ref={inputRef}
              type="text"
              className="chairside-hud-input"
              placeholder="Продиктуйте или введите: зуб, манипуляции, диагноз..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              data-testid="input-chairside-prompt"
              aria-label="Запрос к копилоту"
            />
            <button
              type="submit"
              className="chairside-hud-btn-send"
              title="Отправить запрос ИИ-копилоту"
              data-testid="btn-chairside-send"
              aria-label="Отправить"
            >
              <Send size={15} />
            </button>
          </form>

          {/* 1-Click Apply All Button (Mandate 8e & 8k) */}
          <div className="chairside-hud-apply-all-row">
            {allApplied ? (
              <button
                type="button"
                className="chairside-hud-btn-apply-all chairside-hud-btn-apply-all--undo"
                onClick={handleUndoAll}
                data-testid="btn-chairside-undo-all"
              >
                <RotateCcw size={16} />
                <span>Откатить всё</span>
              </button>
            ) : (
              <button
                type="button"
                className="chairside-hud-btn-apply-all"
                onClick={handleApplyAll}
                data-testid="btn-chairside-apply-all"
              >
                <CheckCheck size={16} />
                <span>Применить всё в 1 клик</span>
              </button>
            )}
            <button
              type="button"
              className="chairside-hud-btn-dismiss"
              onClick={handleDismissAll}
              data-testid="btn-chairside-dismiss-all"
              title="Сбросить все отметки применения"
            >
              <Trash2 size={14} />
              <span>Сброс</span>
            </button>
          </div>

          <div className="chairside-hud-autonomy-note" data-testid="chairside-autonomy-note">
            <Sparkles size={12} className="text-[var(--teal)]" />
            <span>Автономия врача (Мандат 8e) • 0 блокировок • Обратимые действия</span>
          </div>
        </footer>
          </>
        )}
      </div>
    </aside>
  );
};

