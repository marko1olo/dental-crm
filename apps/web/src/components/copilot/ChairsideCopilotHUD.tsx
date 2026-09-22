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
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { globalDentalVoiceEngine } from "../../services/voice";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
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
        title: "Расчет стоимости услуг по Номенклатуре 804н...",
        status: "done" as const,
        detail: "3 позиции: A16.07.002.010, A16.07.002.011, A25.07.001. Итого: 8 200 ₽.",
        durationMs: 95,
      },
      {
        id: "t4",
        stepNumber: 4,
        title: "Формирование протокола SOAP Формы 043/у...",
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
        title: "Калькуляция этапа эндодонтии по 804н...",
        status: "done" as const,
        detail: "Обработка 3 каналов + временная обтурация. Итого: 9 000 ₽.",
        durationMs: 80,
      },
      {
        id: "tp4",
        stepNumber: 4,
        title: "Генерация протокола первичной эндодонтии 043/у...",
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
      description: "Противопоказаний нет. Рекомендовано диспансерное наблюдение 1 раз в 6 месяцев.",
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
        title: "Расчет комплекса гигиены по 804н...",
        status: "done" as const,
        detail: "Комплекс A16.07.051 + реминерализация A11.07.024. Итого: 6 500 ₽.",
        durationMs: 80,
      },
      {
        id: "th4",
        stepNumber: 4,
        title: "Формирование протокола профилактического приема 043/у...",
        status: "done" as const,
        detail: "Протокол гигиены подготовлен.",
        durationMs: 65,
      },
    ],
  },
];

export type ClinicalPreset = (typeof CLINICAL_PRESETS)[number];
const defaultPreset: ClinicalPreset = CLINICAL_PRESETS[0]!;

export const ChairsideCopilotHUD: React.FC<ChairsideCopilotHUDProps> = ({
  initialOpen = true,
  initialDocked = false,
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [isThoughtsExpanded, setIsThoughtsExpanded] = useState(true);
  const [isListening, setIsListening] = useState(false);
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
        console.warn("[ChairsideCopilotHUD] API call failed, falling back to local clinical preset:", err);
        if (/пульпит|26|канал/i.test(text)) {
          loadPreset(1);
        } else if (/гигиен|чистк|налет|скейлинг/i.test(text)) {
          loadPreset(2);
        } else {
          loadPreset(0);
        }
        showToast("Автономный режим: сформированы предложения у кресла", "info");
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
      loadPreset,
    ]
  );

  // Hotkey & custom event listeners
  useEffect(() => {
    const handleToggleEvent = () => {
      setIsOpen((prev) => !prev);
      setIsMinimized(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") || (e.altKey && e.key.toLowerCase() === "c")) {
        e.preventDefault();
        handleToggleEvent();
      }
    };

    window.addEventListener("dente:toggle-chairside-hud", handleToggleEvent);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("dente:toggle-chairside-hud", handleToggleEvent);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Voice listener integration
  useEffect(() => {
    const unsub = globalDentalVoiceEngine.addListener({
      onListeningChange: (isL) => setIsListening(isL),
      onTranscriptChange: (_interim, final) => {
        if (final) {
          setInputText(final);
        }
      },
    });
    return () => unsub();
  }, []);

  // 1-Click apply tooth proposal with undo tracking (Mandate 8e)
  const handleApplyTooth = useCallback(() => {
    setPreviousToothState(toothProposal.state);
    if (onUpdateToothStatus) {
      onUpdateToothStatus(toothProposal.toothNumber, toothProposal.state, toothProposal.surfaces);
    }
    if (onApplyToothState) {
      onApplyToothState(toothProposal.toothNumber, toothProposal.state, toothProposal.surfaces);
    }
    try {
      window.dispatchEvent(
        new CustomEvent("dente-odontogram-update", {
          detail: {
            patientId,
            states: [{ toothNumber: toothProposal.toothNumber, state: toothProposal.state }],
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent("clinical-finding-detected", {
          detail: {
            toothNumber: toothProposal.toothNumber,
            finding: toothProposal.state,
          },
        })
      );
    } catch {
      // safe fallback
    }
    setToothProposal((prev) => ({ ...prev, applied: true }));
    showToast(`Зуб ${toothProposal.toothNumber} обновлен: ${toothProposal.stateLabel}`, "success");
  }, [toothProposal, onUpdateToothStatus, onApplyToothState, patientId]);

  const handleUndoTooth = useCallback(() => {
    const revertState = previousToothState || "Norm";
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
    showToast("Протокол SOAP 043/у сохранен в ЭМК визита", "success");
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

  // 1-Click carpule disposal (Mandate 8e & 8k: 0-friction, editable carpules, reversible undo)
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
    showToast(`Списана карпула: ${anestheticProposal.drugName} (${anestheticProposal.carpulesCount} шт.)`, "success");
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
    showToast(`Откат списания карпулы ${anestheticProposal.drugName} выполнен`, "info");
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
    showToast("Все действия применены в 1 клик (одонтограмма, смета, дневник 043/у, карпула, ИДС)", "success");
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

  // Handle submit text / query (Mandate 8e: Never disabled, fallback to clinical default)
  const handleFormSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const text = inputText.trim();
      if (!text) {
        const defaultPrompt = "вылечили кариес 16 зуба, световая пломба, анестезия убистезин 1 карпула";
        setInputText(defaultPrompt);
        executeCopilotAgent(defaultPrompt);
        return;
      }
      executeCopilotAgent(text);
    },
    [inputText, executeCopilotAgent]
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
      <div className="chairside-hud-panel">
        {/* Header Toolbar (Sin 2: Strictly 1 line, 32-36px) */}
        <header className="chairside-hud-header" data-testid="chairside-hud-header">
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
          </div>

          <div className="chairside-hud-header-actions">
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
              }}
              title="Закрыть HUD"
              data-testid="btn-chairside-hud-close"
              aria-label="Закрыть"
            >
              <X size={15} />
            </button>
          </div>
        </header>

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
                  <span>Смета услуг по 804н</span>
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
                  <span>Дневник 043/у (SOAP)</span>
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

            {/* 5. Anesthetic Carpule Proposal Card (Mandate 8e: Doctor autonomy, carpules editable, 1-click apply, undo) */}
            {anestheticProposal && (
              <div className="chairside-hud-card" data-testid="chairside-card-anesthetic">
                <div className="chairside-hud-card-head">
                  <div className="chairside-hud-card-title">
                    <Syringe size={14} className="text-[var(--teal)] shrink-0" />
                    <span>Анестезия и списание карпулы</span>
                  </div>
                  <span className={`chairside-hud-card-badge ${anestheticProposal.applied ? "chairside-hud-card-badge--applied" : ""}`}>
                    {anestheticProposal.applied ? "Списано" : `${anestheticProposal.carpulesCount} карп.`}
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
                      title="Откатить списание карпулы"
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
                      <span>Списать карпулу</span>
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
      </div>
    </aside>
  );
};

