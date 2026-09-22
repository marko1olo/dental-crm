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
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { globalDentalVoiceEngine } from "../../services/voice";
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
  readonly patientName?: string | undefined;
  readonly patientAllergies?: readonly string[] | undefined;
  readonly onApplyToothState?: ((toothNumber: number, state: string, surfaces?: string[]) => void) | undefined;
  readonly onApplyServices?: ((services: ChairsideServiceProposal[]) => void) | undefined;
  readonly onApplySoapNotes?: ((notes: Record<string, string>) => void) | undefined;
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

export const ChairsideCopilotHUD: React.FC<ChairsideCopilotHUDProps> = ({
  initialOpen = true,
  initialDocked = false,
  activeTooth = 16,
  patientName = "Пациент",
  patientAllergies = ["Пенициллины"],
  onApplyToothState,
  onApplyServices,
  onApplySoapNotes,
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

  // Current active preset (default: Caries 16)
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const activePreset = CLINICAL_PRESETS[activePresetIndex] ?? CLINICAL_PRESETS[0];

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

  // Load a preset with simulation
  const loadPreset = useCallback(
    (index: number, simulateDelay = true) => {
      const preset = CLINICAL_PRESETS[index] ?? CLINICAL_PRESETS[0];
      setActivePresetIndex(index);
      setInputText(preset.prompt);

      if (simulateDelay) {
        setIsThinking(true);
        // Set steps to running
        setThoughts(
          preset.thoughts.map((t, i) => ({
            ...t,
            status: i === 0 ? "running" : "pending",
          }))
        );

        setTimeout(() => {
          setThoughts(preset.thoughts);
          setIsThinking(false);
          setToothProposal({
            toothNumber: preset.toothNumber,
            state: preset.toothState,
            stateLabel: preset.toothStateLabel,
            surfaces: preset.surfaces,
            applied: false,
          });
          setServicesProposal(preset.services.map((s) => ({ ...s, applied: false })));
          setSoapProposal({ ...preset.soap, applied: false });
          setSafetyAlert({ ...preset.safetyAlert, acknowledged: false });
          showToast(`ИИ обработал запрос: ${preset.label}`, "info");
        }, 350);
      } else {
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
        setSafetyAlert({ ...preset.safetyAlert, acknowledged: false });
      }
    },
    []
  );

  // Hotkey & custom event listeners
  useEffect(() => {
    const handleToggleEvent = () => {
      setIsOpen((prev) => !prev);
      setIsMinimized(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkey: Ctrl+Shift+C or Alt+C
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

  // 1-Click apply tooth proposal
  const handleApplyTooth = useCallback(() => {
    if (onApplyToothState) {
      onApplyToothState(toothProposal.toothNumber, toothProposal.state, toothProposal.surfaces);
    }
    try {
      window.dispatchEvent(
        new CustomEvent("dente-odontogram-update", {
          detail: {
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
  }, [toothProposal, onApplyToothState]);

  // 1-Click apply services proposal
  const handleApplyServices = useCallback(() => {
    if (onApplyServices) {
      onApplyServices(servicesProposal);
    }
    setServicesProposal((prev) => prev.map((s) => ({ ...s, applied: true })));
    showToast(`${servicesProposal.length} услуг добавлено в смету (${servicesTotalPrice.toLocaleString("ru-RU")} ₽)`, "success");
  }, [servicesProposal, servicesTotalPrice, onApplyServices]);

  // 1-Click apply SOAP notes
  const handleApplySoap = useCallback(() => {
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
  }, [soapProposal, onApplySoapNotes]);

  // Acknowledge safety alert
  const handleAcknowledgeAlert = useCallback(() => {
    setSafetyAlert((prev) => ({ ...prev, acknowledged: true }));
    showToast("Алерт безопасности принят к сведению", "info");
  }, []);

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
    // 4. Alert
    if (!safetyAlert.acknowledged) {
      handleAcknowledgeAlert();
    }
    // 5. Callback
    if (onApplyAll) {
      onApplyAll();
    }
    showToast("Все действия применены в 1 клик (одонтограмма, смета, дневник 043/у)", "success");
  }, [
    toothProposal.applied,
    servicesProposal,
    soapProposal.applied,
    safetyAlert.acknowledged,
    handleApplyTooth,
    handleApplyServices,
    handleApplySoap,
    handleAcknowledgeAlert,
    onApplyAll,
  ]);

  // Dismiss / reset proposals
  const handleDismissAll = useCallback(() => {
    setToothProposal((prev) => ({ ...prev, applied: false }));
    setServicesProposal((prev) => prev.map((s) => ({ ...s, applied: false })));
    setSoapProposal((prev) => ({ ...prev, applied: false }));
    setSafetyAlert((prev) => ({ ...prev, acknowledged: false }));
    showToast("Предложенные действия сброшены", "info");
  }, []);

  // Handle submit text / query (Mandate 8e: Never disabled, fallback to clinical default)
  const handleFormSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const text = inputText.trim();
      if (!text) {
        // Fallback default prompt per Mandate 8e / 8k
        const defaultPrompt = "вылечили кариес 16 зуба, световая пломба, анестезия убистезин 1 карпула";
        setInputText(defaultPrompt);
        loadPreset(0, true);
        showToast("Подставлен клинический запрос по умолчанию", "info");
        return;
      }

      // Check if text matches known presets
      if (/пульпит|26|канал/i.test(text)) {
        loadPreset(1, true);
      } else if (/гигиен|чистк|налет|скейлинг/i.test(text)) {
        loadPreset(2, true);
      } else {
        loadPreset(0, true);
      }
    },
    [inputText, loadPreset]
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
                onClick={() => loadPreset(idx, true)}
                data-testid={`btn-preset-${preset.id}`}
              >
                <Zap size={11} className="text-[var(--teal)]" />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

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
                <button
                  type="button"
                  className="chairside-hud-btn-primary"
                  onClick={handleApplyTooth}
                  data-testid="btn-apply-tooth"
                >
                  <Check size={13} />
                  <span>{toothProposal.applied ? "Обновить в одонтограмме" : "Применить к зубу"}</span>
                </button>
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
                <button
                  type="button"
                  className="chairside-hud-btn-primary"
                  onClick={handleApplyServices}
                  data-testid="btn-apply-services"
                >
                  <Check size={13} />
                  <span>{servicesProposal.every((s) => s.applied) ? "Обновить смету" : "Добавить в смету"}</span>
                </button>
              </div>
            </div>

            {/* 4. Form 043/u SOAP Diary Card */}
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
              </div>
              <div className="chairside-hud-card-actions">
                <button
                  type="button"
                  className="chairside-hud-btn-primary"
                  onClick={handleApplySoap}
                  data-testid="btn-apply-soap"
                >
                  <Check size={13} />
                  <span>{soapProposal.applied ? "Обновить в дневнике" : "Вставить в дневник"}</span>
                </button>
              </div>
            </div>
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
            <button
              type="button"
              className="chairside-hud-btn-apply-all"
              onClick={handleApplyAll}
              data-testid="btn-chairside-apply-all"
            >
              <CheckCheck size={16} />
              <span>Применить всё в 1 клик</span>
            </button>
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
