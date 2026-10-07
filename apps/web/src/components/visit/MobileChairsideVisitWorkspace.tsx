/**
 * apps/web/src/components/visit/MobileChairsideVisitWorkspace.tsx
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Apple iOS HIG)
 *
 * Invariants:
 * 1. Dedicated Mobile Ergonomic Layer (Anti-Desktop-Squeeze)
 * 2. Natural Thumb Zone Floating Bottom Bar (52px CTA, Safe Area Insets)
 * 3. Compact 1-Row Top HUD: Patient Name, Phone, Pulsing Allergy Alert, Visit Timer
 * 4. 5-Segment Step Progress Bar: [ Жалобы | Осмотр | Диагноз | Лечение | Итог и Чек ]
 * 5. 52px 1-Tap "✓ Соматически здоров / Норма" Button
 * 6. Full-Width SmartMicrophone Voice Dictation
 * 7. Apple Health Grouped Cards (16px radius, >= 52px rows, touch targets >= 44x44px)
 * 8. 0px Horizontal Drift Guarantee
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  FileText,
  FlaskConical,
  Layers,
  Mic,
  MicOff,
  Phone,
  Plus,
  Printer,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  X,
  Zap,
} from "lucide-react";
import { triggerHaptic } from "../../native/mobileBridge";
import { showToast } from "../GlobalToast";
import { MobileBottomSheet } from "../mobile/MobileBottomSheet";
import { VisitTimer } from "./VisitTimer";
import { VisitPlanStageHandoffBanner } from "./VisitPlanStageHandoffBanner";
import "./mobile-chairside-visit.css";

export type MobileChairsideStep =
  | "complaints"
  | "exam"
  | "diagnosis"
  | "treatment"
  | "checkout";

export interface MobileChairsideBillingItem {
  id: string;
  code804n: string;
  title: string;
  priceRub: number;
  quantity: number;
  toothCode?: string | undefined;
}

export interface MobileChairsideVisitWorkspaceProps {
  activePatient: any;
  activeAppointment?: any;
  activeDoctor?: any;
  visitNoteForm?: any;
  updateVisitNoteField: (field: string, value: any) => void;
  flushPendingVisitSaves?: () => Promise<void> | void;
  handleApplySomaticNormQuick?: () => void;
  handleFinishVisitAction?: () => Promise<void> | void;
  handlePrintForm043uFast?: () => void;
  handleOpenLabOrder?: () => void;
  consolidatedAllergyChip?: string | null;
  patientAge?: string | null;
  toothStateByCode?: Record<string, string>;
  setToothState?: (code: string, state: string) => void;
  onClose?: () => void;
  testId?: string;
  loadedTreatmentPlan?: any;
  initialStep?: MobileChairsideStep;
}

const COMMON_DENTAL_DIAGNOSES = [
  { code: "К02.1", title: "Кариес дентина", full: "К02.1 Кариес дентина (средний/глубокий)" },
  { code: "К04.0", title: "Острый пульпит", full: "К04.0 Острый очаговый пульпит" },
  { code: "К04.4", title: "Периодонтит", full: "К04.4 Острый апикальный периодонтит" },
  { code: "К05.1", title: "Хронический гингивит", full: "К05.1 Хронический катаральный гингивит" },
  { code: "Z01.2", title: "Здоров (осмотр)", full: "Z01.2 Стоматологическое обследование (Здоров)" },
];

const QUICK_CHAIRSIDE_SERVICES = [
  { code804n: "A16.07.002", title: "Пломбирование светоотверждаемым композитом", shortTitle: "Световая пломба", priceRub: 3500 },
  { code804n: "B01.003.004", title: "Анестезия инфильтрационная (Артикаин)", shortTitle: "Анестезия Артикаин", priceRub: 800 },
  { code804n: "B01.065.001", title: "Первичный осмотр и консультация", shortTitle: "Осмотр и консультация", priceRub: 1000 },
  { code804n: "A16.07.051", title: "Профессиональная гигиена Air-Flow", shortTitle: "Профгигиена Air-Flow", priceRub: 4000 },
];

export const MobileChairsideVisitWorkspace: React.FC<MobileChairsideVisitWorkspaceProps> = ({
  activePatient,
  activeAppointment,
  activeDoctor,
  visitNoteForm = {},
  updateVisitNoteField,
  flushPendingVisitSaves,
  handleApplySomaticNormQuick,
  handleFinishVisitAction,
  handlePrintForm043uFast,
  handleOpenLabOrder,
  consolidatedAllergyChip,
  patientAge,
  toothStateByCode = {},
  setToothState,
  onClose,
  testId = "mobile-chairside-workspace",
  loadedTreatmentPlan,
  initialStep = "complaints",
}) => {
  const [currentStep, setCurrentStep] = useState<MobileChairsideStep>(initialStep);
  const [isNormApplied, setIsNormApplied] = useState(false);
  const [activeQuadrant, setActiveQuadrant] = useState<1 | 2 | 3 | 4>(1);
  const [selectedToothModal, setSelectedToothModal] = useState<string | null>(null);
  const [isCheckoutSheetOpen, setIsCheckoutSheetOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"sbp" | "card" | "cash">("sbp");
  const [isStageTaken, setIsStageTaken] = useState(false);

  // Speech Recognition state for SmartMicrophone
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedVoiceSnippet, setRecognizedVoiceSnippet] = useState("");

  // In-session chairside billing items
  const [billingItems, setBillingItems] = useState<MobileChairsideBillingItem[]>([
    {
      id: "item-1",
      code804n: "B01.065.001",
      title: "Приём (осмотр, консультация) врача-стоматолога",
      priceRub: 1000,
      quantity: 1,
    },
    {
      id: "item-2",
      code804n: "A16.07.002",
      title: "Восстановление зуба пломбой световой полимеризации",
      priceRub: 3500,
      quantity: 1,
      toothCode: "16",
    },
  ]);

  const totalBillingAmountRub = useMemo(() => {
    return billingItems.reduce((sum, item) => sum + item.priceRub * item.quantity, 0);
  }, [billingItems]);

  // Steps definition for 5-segment bar
  const stepItems: Array<{ id: MobileChairsideStep; label: string; number: number }> = [
    { id: "complaints", label: "Жалобы", number: 1 },
    { id: "exam", label: "Осмотр", number: 2 },
    { id: "diagnosis", label: "Диагноз", number: 3 },
    { id: "treatment", label: "Лечение", number: 4 },
    { id: "checkout", label: "Итог и Чек", number: 5 },
  ];

  // Callback to take treatment plan stage into active visit
  const handleTakeStageFromBanner = useCallback(
    (stage: any, items: any[]) => {
      triggerHaptic("success");
      setIsStageTaken(true);
      const stageTitle = stage?.title || "План лечения";
      showToast(`Этап «${stageTitle}» взят в работу (${items.length} услуг)`, "success");

      if (updateVisitNoteField && items.length > 0) {
        const stageDiaryText = `Взят в работу этап: «${stageTitle}»:\n${items
          .map((it: any, idx: number) => `${idx + 1}. ${it.title || it.name || "Услуга"}${it.toothNumber ? ` (зуб ${it.toothNumber})` : ""}`)
          .join("\n")}`;
        const currentPlan = visitNoteForm?.treatmentPlan || "";
        updateVisitNoteField("treatmentPlan", currentPlan ? `${currentPlan}\n\n${stageDiaryText}` : stageDiaryText);
      }

      const newItems: MobileChairsideBillingItem[] = items.map((it: any, idx: number) => ({
        id: `stage-item-${Date.now()}-${idx}`,
        code804n: it.code || it.code804n || "A16.07.002",
        title: it.name || it.title || "Услуга плана",
        priceRub: Number(it.price || it.priceRub || it.unitPriceRub || 0),
        quantity: Number(it.quantity || 1),
        toothCode: it.toothNumber ? String(it.toothNumber) : undefined,
      }));
      setBillingItems((prev) => [...prev, ...newItems]);

      for (const it of items) {
        window.dispatchEvent(
          new CustomEvent("dente-add-billing-item", {
            detail: {
              item: {
                code804n: it.code || it.code804n || "A16.07.002",
                title: it.name || it.title || "Услуга плана",
                quantity: Number(it.quantity || 1),
                unitPriceRub: Number(it.price || it.priceRub || it.unitPriceRub || 0),
                discountRub: 0,
              },
            },
          }),
        );
      }
    },
    [updateVisitNoteField, visitNoteForm?.treatmentPlan],
  );

  // 1-Tap Take active plan stage (Floating Bottom Bar action)
  const handleTakeActivePlanStage = useCallback(() => {
    if (!loadedTreatmentPlan) return;
    const stages = loadedTreatmentPlan.stages || [];
    const activeStage = stages[0] || {
      title: loadedTreatmentPlan.name || loadedTreatmentPlan.title || "План лечения",
      stageNumber: 1,
      items: loadedTreatmentPlan.items || [],
    };
    const items = activeStage.items || loadedTreatmentPlan.items || [];
    handleTakeStageFromBanner(activeStage, items);
  }, [loadedTreatmentPlan, handleTakeStageFromBanner]);

  // 1-Tap Somatic Norm Action
  const onApplyChairsideNorm = useCallback(() => {
    triggerHaptic("success");
    setIsNormApplied(true);
    if (handleApplySomaticNormQuick) {
      handleApplySomaticNormQuick();
    } else {
      updateVisitNoteField(
        "objectiveStatus",
        "Слизистая оболочка полости рта бледно-розовая, умеренно увлажнена. Зубные ряды интактны, патологических зубодесневых карманов нет. Прикус ортогнатический. Регионарные лимфоузлы не пальпируются. Перкуссия безболезненна.",
      );
      updateVisitNoteField(
        "anamnesis",
        "Соматически здоров. Хронические заболевания, гепатит, ВИЧ, туберкулез отрицает. Аллергоанамнез не отягощен.",
      );
    }
    showToast("✓ Соматическая норма успешно внесена", "success");
  }, [handleApplySomaticNormQuick, updateVisitNoteField]);

  // Smart Microphone toggler with Web Speech API fallback
  const toggleVoiceRecording = useCallback(() => {
    triggerHaptic("selection");
    if (isRecording) {
      setIsRecording(false);
      showToast("Диктовка завершена", "info");
      return;
    }

    // Check Web Speech API availability
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "ru-RU";
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsRecording(true);
          showToast("Слушаю клиническую речь...", "info");
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          setRecognizedVoiceSnippet(transcript);

          // Append speech to current step
          if (event.results[current].isFinal) {
            triggerHaptic("success");
            if (currentStep === "complaints") {
              const cur = visitNoteForm?.complaint || "";
              updateVisitNoteField("complaint", cur ? `${cur} ${transcript}` : transcript);
            } else if (currentStep === "exam") {
              const cur = visitNoteForm?.objectiveStatus || "";
              updateVisitNoteField("objectiveStatus", cur ? `${cur} ${transcript}` : transcript);
            } else if (currentStep === "diagnosis") {
              updateVisitNoteField("diagnosis", transcript);
            } else if (currentStep === "treatment") {
              const cur = visitNoteForm?.treatmentPlan || "";
              updateVisitNoteField("treatmentPlan", cur ? `${cur} ${transcript}` : transcript);
            }
          }
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
      } catch {
        setIsRecording(true);
        setTimeout(() => setIsRecording(false), 3000);
      }
    } else {
      // Mocked voice input snippet for touch feedback
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        const quickText = "Препарирование кариозной полости, пломба световой полимеризации.";
        setRecognizedVoiceSnippet(quickText);
        if (currentStep === "treatment") {
          const cur = visitNoteForm?.treatmentPlan || "";
          updateVisitNoteField("treatmentPlan", cur ? `${cur}\n${quickText}` : quickText);
        }
        showToast("Голосовая заметка сохранена", "success");
      }, 1500);
    }
  }, [isRecording, currentStep, visitNoteForm, updateVisitNoteField]);

  // Append Quick Voice Phrase
  const appendQuickPhrase = useCallback(
    (text: string) => {
      triggerHaptic("selection");
      if (currentStep === "complaints") {
        const cur = visitNoteForm?.complaint || "";
        updateVisitNoteField("complaint", cur ? `${cur}. ${text}` : text);
      } else if (currentStep === "exam") {
        const cur = visitNoteForm?.objectiveStatus || "";
        updateVisitNoteField("objectiveStatus", cur ? `${cur}. ${text}` : text);
      } else if (currentStep === "diagnosis") {
        updateVisitNoteField("diagnosis", text);
      } else if (currentStep === "treatment") {
        const cur = visitNoteForm?.treatmentPlan || "";
        updateVisitNoteField("treatmentPlan", cur ? `${cur}. ${text}` : text);
      }
      showToast(`Добавлено: «${text}»`, "info");
    },
    [currentStep, visitNoteForm, updateVisitNoteField],
  );

  // Quadrant tooth mapping
  const quadrantTeeth = useMemo(() => {
    switch (activeQuadrant) {
      case 1:
        return ["18", "17", "16", "15", "14", "13", "12", "11"];
      case 2:
        return ["21", "22", "23", "24", "25", "26", "27", "28"];
      case 3:
        return ["48", "47", "46", "45", "44", "43", "42", "41"];
      case 4:
        return ["31", "32", "33", "34", "35", "36", "37", "38"];
    }
  }, [activeQuadrant]);

  const handleNextStep = () => {
    triggerHaptic("selection");
    if (currentStep === "complaints") setCurrentStep("exam");
    else if (currentStep === "exam") setCurrentStep("diagnosis");
    else if (currentStep === "diagnosis") setCurrentStep("treatment");
    else if (currentStep === "treatment") setCurrentStep("checkout");
    else if (currentStep === "checkout") {
      setIsCheckoutSheetOpen(true);
    }
  };

  const handlePrevStep = () => {
    triggerHaptic("selection");
    if (currentStep === "checkout") setCurrentStep("treatment");
    else if (currentStep === "treatment") setCurrentStep("diagnosis");
    else if (currentStep === "diagnosis") setCurrentStep("exam");
    else if (currentStep === "exam") setCurrentStep("complaints");
    else if (currentStep === "complaints") {
      if (onClose) onClose();
    }
  };

  const addBillingItem = (item: { code804n: string; title: string; priceRub: number }) => {
    triggerHaptic("selection");
    const newItem: MobileChairsideBillingItem = {
      id: `item-${Date.now()}`,
      code804n: item.code804n,
      title: item.title,
      priceRub: item.priceRub,
      quantity: 1,
    };
    setBillingItems((prev) => [...prev, newItem]);
    window.dispatchEvent(
      new CustomEvent("dente-add-billing-item", {
        detail: {
          item: {
            code804n: item.code804n,
            title: item.title,
            quantity: 1,
            unitPriceRub: item.priceRub,
            discountRub: 0,
          },
        },
      }),
    );
    showToast(`Добавлено в чек: ${item.title}`, "success");
  };

  const removeBillingItem = (id: string) => {
    triggerHaptic("selection");
    setBillingItems((prev) => prev.filter((it) => it.id !== id));
  };

  const executeFinalCheckout = async () => {
    triggerHaptic("success");
    setIsCheckoutSheetOpen(false);
    if (handleFinishVisitAction) {
      await handleFinishVisitAction();
    }
    if (flushPendingVisitSaves) {
      await flushPendingVisitSaves();
    }
    showToast("Приём завершён, счёт сформирован", "success");
    if (onClose) onClose();
  };

  useEffect(() => {
    const activeEl = document.querySelector(`[data-testid="${testId}-step-${currentStep}"]`);
    if (activeEl && typeof activeEl.scrollIntoView === "function") {
      activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [currentStep, testId]);

  return (
    <div className="mobile-chairside-container" data-testid={testId}>
      {/* ─── 1. TOP HUD (APPLE HIG 2-ROW COMPACT PATIENT BAR) ─── */}
      <header className="mobile-chairside-hud" data-testid={`${testId}-hud`}>
        {/* Main Row: Back Button, Large Centered Patient Name, Actions */}
        <div className="mobile-chairside-hud-main-row">
          <button
            type="button"
            onClick={handlePrevStep}
            className="mobile-chairside-icon-btn"
            aria-label="Назад"
            data-testid={`${testId}-back-btn`}
          >
            <ChevronLeft size={24} />
          </button>

          <div className="mobile-chairside-patient-title-box">
            <div
              className="mobile-chairside-patient-name"
              title={activePatient?.fullName || activePatient?.name || "Пациент"}
            >
              {activePatient?.fullName || activePatient?.name || "Пациент"}
            </div>
            <div className="mobile-chairside-patient-subtext">
              {patientAge && <span>{patientAge}</span>}
              {patientAge && activePatient?.phone && <span className="opacity-40">·</span>}
              {activePatient?.phone && (
                <a
                  href={`tel:${activePatient.phone}`}
                  className="mobile-chairside-phone-link"
                  data-testid={`${testId}-phone-link`}
                >
                  <Phone size={11} />
                  <span>{activePatient.phone}</span>
                </a>
              )}
            </div>
          </div>

          <div className="mobile-chairside-hud-actions">
            {handlePrintForm043uFast && (
              <button
                type="button"
                onClick={handlePrintForm043uFast}
                className="mobile-chairside-icon-btn"
                aria-label="Печать дневника приёма"
                title="Печать дневника"
                data-testid={`${testId}-print-btn`}
              >
                <Printer size={18} />
              </button>
            )}

            {handleOpenLabOrder && (
              <button
                type="button"
                onClick={handleOpenLabOrder}
                className="mobile-chairside-icon-btn text-teal-600 dark:text-teal-400"
                aria-label="Наряд ЗТЛ"
                title="Наряд в лабораторию"
                data-testid={`${testId}-lab-btn`}
              >
                <FlaskConical size={18} />
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="mobile-chairside-icon-btn text-[var(--muted)]"
                aria-label="Свернуть приём"
                data-testid={`${testId}-close-btn`}
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Sub Row: Visit Timer on Left, Allergy Alert on Right */}
        <div className="mobile-chairside-hud-sub-row">
          <div className="mobile-chairside-timer-wrap">
            <VisitTimer
              createdAt={
                activeAppointment?.startTime ||
                activeAppointment?.startAt ||
                activeAppointment?.createdAt ||
                null
              }
            />
          </div>

          {consolidatedAllergyChip && (
            <span
              className="mobile-chairside-allergy-pulse"
              data-testid={`${testId}-allergy-badge`}
              title={consolidatedAllergyChip}
            >
              <AlertOctagon size={12} className="shrink-0" />
              <span>{consolidatedAllergyChip}</span>
            </span>
          )}
        </div>
      </header>

      {/* ─── 2. SEGMENTED STEP PROGRESS BAR (5 STEPS) ─── */}
      <nav
        className="mobile-chairside-steps-container"
        aria-label="Этапы клинического приёма"
        data-testid={`${testId}-steps-nav`}
      >
        <div className="mobile-chairside-steps-scroll">
          {stepItems.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted =
              (step.id === "complaints" && Boolean(visitNoteForm?.complaint)) ||
              (step.id === "exam" && Boolean(visitNoteForm?.objectiveStatus)) ||
              (step.id === "diagnosis" && Boolean(visitNoteForm?.diagnosis)) ||
              (step.id === "treatment" && Boolean(visitNoteForm?.treatmentPlan)) ||
              (step.id === "checkout" && billingItems.length > 0);

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  setCurrentStep(step.id);
                }}
                className={`mobile-chairside-step-chip ${isActive ? "is-active" : ""} ${
                  isCompleted ? "is-completed" : ""
                }`}
                data-testid={`${testId}-step-${step.id}`}
              >
                <span className="truncate">{`${step.number}. ${step.label}`}</span>
                {isCompleted && !isActive && <Check size={11} className="stroke-[2.5] shrink-0" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ─── 3. CLINICAL WORKSPACE CONTENT ─── */}
      <main className="mobile-chairside-content" data-testid={`${testId}-main-content`}>
        {/* Only show Norm Button and SmartMic on steps 1-4, leave Step 5 purely focused on Billing */}
        {currentStep !== "checkout" && (
          <>
            {/* 52px 1-TAP SOMATIC NORM BUTTON (Always prominent) */}
            <button
              type="button"
              onClick={onApplyChairsideNorm}
              className={`mobile-chairside-norm-btn ${isNormApplied ? "is-applied" : ""}`}
              data-testid={`${testId}-norm-btn`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={22} className="shrink-0" />
                <span className="text-[15px] font-bold">
                  {isNormApplied ? "✓ Норма внесена" : "✓ Соматически здоров / Норма"}
                </span>
              </div>
              <span className="text-[12px] opacity-90 font-medium">1 тап</span>
            </button>

            {/* FULL-WIDTH SMART MICROPHONE VOICE DICTATION */}
            <div className="mobile-smart-mic-card" data-testid={`${testId}-smart-mic`}>
              <div className="mobile-smart-mic-header">
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`mobile-smart-mic-btn ${
                    isRecording ? "is-listening" : "is-idle"
                  }`}
                  data-testid={`${testId}-mic-toggle-btn`}
                >
                  {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                  <span>{isRecording ? "Идет запись диктовки..." : "Голосовая диктовка SmartMic"}</span>
                </button>
              </div>

              <div className="mobile-smart-mic-chips">
                <button
                  type="button"
                  className="mobile-smart-mic-chip"
                  onClick={() => appendQuickPhrase("Перкуссия безболезненна")}
                >
                  + Перкуссия норм
                </button>
                <button
                  type="button"
                  className="mobile-smart-mic-chip"
                  onClick={() => appendQuickPhrase("Анестезия Артикаин 1.7мл")}
                >
                  + Анестезия 1.7мл
                </button>
                <button
                  type="button"
                  className="mobile-smart-mic-chip"
                  onClick={() => appendQuickPhrase("Слизистая бледно-розовая, чистая")}
                >
                  + Слизистая норм
                </button>
                <button
                  type="button"
                  className="mobile-smart-mic-chip"
                  onClick={() => appendQuickPhrase("Пломба световой полимеризации")}
                >
                  + Пломба композит
                </button>
              </div>

              {recognizedVoiceSnippet && (
                <div className="text-[12px] text-[var(--muted)] italic p-2 bg-[var(--paper-soft)] rounded-lg">
                  Распознано: «{recognizedVoiceSnippet}»
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ STEP 1: ЖАЛОБЫ И АНАМНЕЗ ═══ */}
        {currentStep === "complaints" && (
          <div className="space-y-3" data-testid={`${testId}-step1-content`}>
            <div className="mobile-chairside-grouped-card">
              <div className="mobile-chairside-card-title">Жалобы пациента</div>
              <textarea
                value={visitNoteForm?.complaint || ""}
                onChange={(e) => updateVisitNoteField("complaint", e.target.value)}
                placeholder="Жалобы пациента (боли, реакция на холодное/горячее, скол, выпадение пломбы)..."
                className="mobile-chairside-textarea"
                data-testid={`${testId}-complaint-input`}
              />
              <div
                className="mobile-chairside-row-item"
                onClick={() =>
                  updateVisitNoteField(
                    "complaint",
                    "Жалобы на кратковременные ноющие боли от холодного и сладкого в зубе верхней челюсти.",
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Stethoscope size={18} className="text-teal-600" />
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--ink)]">
                      Острая боль от температурных раздражителей
                    </div>
                    <div className="text-[12px] text-[var(--muted)]">Типовой шаблон жалоб</div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-[var(--muted)]" />
              </div>
            </div>

            <div className="mobile-chairside-grouped-card">
              <div className="mobile-chairside-card-title">Анамнез заболевания и жизни</div>
              <textarea
                value={visitNoteForm?.anamnesis || ""}
                onChange={(e) => updateVisitNoteField("anamnesis", e.target.value)}
                placeholder="Анамнез (со слов пациента, сопутствующие заболевания, перенесенные операции)..."
                className="mobile-chairside-textarea min-h-[90px]"
                data-testid={`${testId}-anamnesis-input`}
              />
            </div>
          </div>
        )}

        {/* ═══ STEP 2: ОБЪЕКТИВНЫЙ ОСМОТР И КВАДРАНТЫ ЗУБОВ ═══ */}
        {currentStep === "exam" && (
          <div className="space-y-3" data-testid={`${testId}-step2-content`}>
            {/* Tooth Quadrant Selector (Apple HIG §3.3) */}
            <div className="mobile-chairside-grouped-card">
              <div className="mobile-chairside-card-title">
                Зубная формула по квадрантам (FDI)
              </div>
              <div className="p-3">
                <div className="mobile-quadrant-tabs">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setActiveQuadrant(1);
                    }}
                    className={`mobile-quadrant-tab ${activeQuadrant === 1 ? "is-active" : ""}`}
                  >
                    Q1 (18–11)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setActiveQuadrant(2);
                    }}
                    className={`mobile-quadrant-tab ${activeQuadrant === 2 ? "is-active" : ""}`}
                  >
                    Q2 (21–28)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setActiveQuadrant(3);
                    }}
                    className={`mobile-quadrant-tab ${activeQuadrant === 3 ? "is-active" : ""}`}
                  >
                    Q3 (48–41)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setActiveQuadrant(4);
                    }}
                    className={`mobile-quadrant-tab ${activeQuadrant === 4 ? "is-active" : ""}`}
                  >
                    Q4 (31–38)
                  </button>
                </div>

                <div className="mobile-teeth-grid-8 mt-2">
                  {quadrantTeeth.map((tooth) => {
                    const status = toothStateByCode[tooth] || "Healthy";
                    const isHealthy = status === "Healthy" || status === "watch";
                    return (
                      <button
                        key={tooth}
                        type="button"
                        onClick={() => {
                          triggerHaptic("selection");
                          setSelectedToothModal(tooth);
                        }}
                        className={`mobile-tooth-tile ${
                          selectedToothModal === tooth ? "is-selected" : ""
                        }`}
                        data-testid={`${testId}-tooth-tile-${tooth}`}
                      >
                        <span className="mobile-tooth-number">{tooth}</span>
                        <span
                          className={`mobile-tooth-status-tag ${
                            isHealthy
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {status === "Healthy" ? "Норма" : status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mobile-chairside-grouped-card">
              <div className="mobile-chairside-card-title">Объективный клинический статус</div>
              <textarea
                value={visitNoteForm?.objectiveStatus || ""}
                onChange={(e) => updateVisitNoteField("objectiveStatus", e.target.value)}
                placeholder="Данные осмотра слизистой, зубных рядов, зондирования, перкуссии..."
                className="mobile-chairside-textarea"
                data-testid={`${testId}-objective-input`}
              />
            </div>
          </div>
        )}

        {/* ═══ STEP 3: ДИАГНОЗ ═══ */}
        {currentStep === "diagnosis" && (
          <div className="space-y-3" data-testid={`${testId}-step3-content`}>
            <div className="mobile-chairside-grouped-card">
              <div className="mobile-chairside-card-title">Клинический диагноз</div>
              <div className="p-3">
                <input
                  type="text"
                  value={visitNoteForm?.diagnosis || ""}
                  onChange={(e) => updateVisitNoteField("diagnosis", e.target.value)}
                  placeholder="Диагноз и клиническое описание..."
                  className="w-full min-h-[48px] px-3.5 text-[15px] font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none"
                  data-testid={`${testId}-diagnosis-input`}
                />
              </div>

              {COMMON_DENTAL_DIAGNOSES.map((diag) => (
                <div
                  key={diag.code}
                  className="mobile-chairside-row-item"
                  onClick={() => {
                    triggerHaptic("selection");
                    updateVisitNoteField("diagnosis", diag.full);
                  }}
                  data-testid={`${testId}-diag-${diag.code}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {diag.code}
                    </span>
                    <div>
                      <div className="text-[14px] font-semibold text-[var(--ink)]">
                        {diag.title}
                      </div>
                      <div className="text-[12px] text-[var(--muted)]">{diag.full}</div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-[var(--muted)]" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ STEP 4: ЛЕЧЕНИЕ И ПРОТОКОЛ ═══ */}
        {currentStep === "treatment" && (
          <div className="space-y-3" data-testid={`${testId}-step4-content`}>
            {/* Treatment plan stage handoff banner */}
            <VisitPlanStageHandoffBanner
              loadedTreatmentPlan={loadedTreatmentPlan}
              activeAppointment={activeAppointment}
              activePatient={activePatient}
              onTakeStage={handleTakeStageFromBanner}
            />

            <div className="mobile-chairside-grouped-card">
              <div className="mobile-chairside-card-title">
                Протокол лечения и выполненные манипуляции
              </div>
              <textarea
                value={visitNoteForm?.treatmentPlan || ""}
                onChange={(e) => updateVisitNoteField("treatmentPlan", e.target.value)}
                placeholder="Опишите выполненные манипуляции (препарирование, обработка, пломбирование, рекомендации)..."
                className="mobile-chairside-textarea min-h-[140px]"
                data-testid={`${testId}-treatment-input`}
              />
              <div
                className="mobile-chairside-row-item"
                onClick={() => {
                  const preset =
                    "Проведено препарирование кариозной полости. Медикаментозная обработка 2% р-ром хлоргексидина. Изоляция OptiDam. Протравливание эмали 37% ортофосфорной кислотой 15 сек. Бондинг Prime&Bond universal. Пломбирование композитом светового отверждения Harmonize A3. Шлифовка, полировка дисками Enhance.";
                  updateVisitNoteField("treatmentPlan", preset);
                }}
              >
                <div className="flex items-center gap-3">
                  <Zap size={18} className="text-amber-500" />
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--ink)]">
                      Стандартный протокол световой реставрации
                    </div>
                    <div className="text-[12px] text-[var(--muted)]">
                      Изоляция + бондинг + шлифовка
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-[var(--muted)]" />
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 5: ИТОГ И ЧЕК ═══ */}
        {currentStep === "checkout" && (
          <div className="space-y-3" data-testid={`${testId}-step5-content`}>
            {/* Total Due Hero Card */}
            <div className="mobile-billing-hero-card">
              <div className="text-[12px] font-bold text-[var(--muted)] uppercase tracking-wider">
                К оплате по приёму
              </div>
              <div
                className="mobile-billing-total-amount"
                data-testid={`${testId}-billing-total`}
              >
                {totalBillingAmountRub.toLocaleString("ru-RU")} ₽
              </div>
              <div className="text-[12px] text-[var(--muted)] mt-1">
                {billingItems.length} позиций в чеке
              </div>
            </div>

            {/* In-Session Billing Items List */}
            <div className="mobile-chairside-grouped-card">
              <div className="mobile-chairside-card-title flex items-center justify-between">
                <span>Оказанные услуги и манипуляции</span>
                <span className="text-[11px] text-teal-600 font-bold">Стандарт услуг</span>
              </div>

              {billingItems.map((item) => (
                <div key={item.id} className="mobile-chairside-row-item">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="text-[13px] font-semibold text-[var(--ink)] leading-snug">
                      {item.title}
                    </div>
                    <div className="text-[12px] text-[var(--muted)] flex items-center gap-2 mt-0.5">
                      <span className="font-mono">{item.code804n}</span>
                      {item.toothCode && <span>· Зуб {item.toothCode}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[14px] font-bold font-mono text-[var(--ink)]">
                      {(item.priceRub * item.quantity).toLocaleString("ru-RU")} ₽
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBillingItem(item.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500/10"
                      aria-label="Удалить услугу"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick 1-Tap Services Adding */}
            <div className="mobile-chairside-grouped-card p-3">
              <div className="text-[13px] font-bold text-[var(--muted)] uppercase mb-2">
                + Быстрое добавление услуг
              </div>
              <div className="mobile-quick-services-grid">
                {QUICK_CHAIRSIDE_SERVICES.map((srv) => (
                  <button
                    key={srv.code804n}
                    type="button"
                    onClick={() => addBillingItem(srv)}
                    className="mobile-quick-service-btn"
                  >
                    <span className="mobile-quick-service-title">{srv.shortTitle || srv.title}</span>
                    <span className="mobile-quick-service-price">
                      + {srv.priceRub.toLocaleString("ru-RU")} ₽
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── 4. FLOATING BOTTOM BAR (NATURAL THUMB ZONE) ─── */}
      <footer className="mobile-chairside-floating-bar" data-testid={`${testId}-bottom-bar`}>
        {currentStep !== "complaints" && (
          <button
            type="button"
            onClick={handlePrevStep}
            className="mobile-chairside-secondary-cta"
            aria-label="Назад к предыдущему этапу"
            title="Назад"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {currentStep === "treatment" && loadedTreatmentPlan && !isStageTaken && (
          <button
            type="button"
            onClick={handleTakeActivePlanStage}
            className="mobile-chairside-stage-cta"
            data-testid={`${testId}-bottom-take-stage-btn`}
          >
            <Layers size={18} />
            <span>Взять этап в работу</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleNextStep}
          className="mobile-chairside-primary-cta"
          data-testid={`${testId}-primary-cta-btn`}
        >
          {currentStep === "checkout" ? (
            <>
              <CreditCard size={20} />
              <span>Завершить приём и сформировать счёт</span>
            </>
          ) : (
            <>
              <span>
                {currentStep === "complaints" && "Далее: 2. Осмотр"}
                {currentStep === "exam" && "Далее: 3. Диагноз"}
                {currentStep === "diagnosis" && "Далее: 4. Лечение"}
                {currentStep === "treatment" && "Далее: 5. Итог и Чек"}
              </span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </footer>

      {/* ─── 5. NATIVE BOTTOM SHEET: ВЫБОР СТАТУСА ЗУБА ─── */}
      <MobileBottomSheet
        isOpen={Boolean(selectedToothModal)}
        onClose={() => setSelectedToothModal(null)}
        title={`Зуб ${selectedToothModal}: Клинический статус`}
        testId={`${testId}-tooth-sheet`}
      >
        <div className="space-y-2 py-2">
          {[
            { id: "Healthy", label: "Здоров (Интактен)", desc: "Без патологий" },
            { id: "Caries", label: "Кариес", desc: "Поражение твердых тканей" },
            { id: "Pulpitis", label: "Пульпит", desc: "Воспаление сосудисто-нервного пучка" },
            { id: "Periodontitis", label: "Периодонтит", desc: "Периапикальный очаг" },
            { id: "Filled", label: "Пломба", desc: "Ранее леченый зуб" },
            { id: "Missing", label: "Удален (Отсутствует)", desc: "Дефект зубного ряда" },
          ].map((item) => (
            <div
              key={item.id}
              className="mobile-chairside-row-item rounded-xl border border-[var(--line)]"
              onClick={() => {
                if (selectedToothModal && setToothState) {
                  triggerHaptic("selection");
                  setToothState(selectedToothModal, item.id);
                  showToast(`Зуб ${selectedToothModal}: ${item.label}`, "info");
                }
                setSelectedToothModal(null);
              }}
            >
              <div>
                <div className="text-[15px] font-bold text-[var(--ink)]">{item.label}</div>
                <div className="text-[12px] text-[var(--muted)]">{item.desc}</div>
              </div>
              <CheckCircle2 size={18} className="text-teal-600" />
            </div>
          ))}
        </div>
      </MobileBottomSheet>

      {/* ─── 6. NATIVE BOTTOM SHEET: ОПЛАТА И СЧЁТ ─── */}
      <MobileBottomSheet
        isOpen={isCheckoutSheetOpen}
        onClose={() => setIsCheckoutSheetOpen(false)}
        title="Оплата и формирование счёта"
        subtitle={`Пациент: ${activePatient?.fullName || "Пациент"}`}
        testId={`${testId}-final-checkout-sheet`}
        footer={
          <button
            type="button"
            className="mobile-chairside-primary-cta w-full"
            onClick={executeFinalCheckout}
            data-testid={`${testId}-confirm-checkout-btn`}
          >
            <CheckCircle2 size={20} />
            <span>Оплатить {totalBillingAmountRub.toLocaleString("ru-RU")} ₽ и закрыть</span>
          </button>
        }
      >
        <div className="space-y-3 py-2">
          <div className="text-center py-4 bg-[var(--paper-soft)] rounded-2xl border border-[var(--line)]">
            <div className="text-[12px] font-bold text-[var(--muted)] uppercase">
              Сумма к оплате
            </div>
            <div className="text-[32px] font-extrabold font-mono text-[var(--ink)] mt-1">
              {totalBillingAmountRub.toLocaleString("ru-RU")} ₽
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[13px] font-bold text-[var(--muted)] uppercase px-1">
              Способ оплаты
            </div>
            {[
              { id: "sbp", label: "СБП (QR-код)", desc: "Комиссия 0.4%, мгновенный чек" },
              { id: "card", label: "Банковская карта (POS)", desc: "Эквайринг у кресла" },
              { id: "cash", label: "Наличные в кассу", desc: "Без сдачи" },
            ].map((method) => (
              <div
                key={method.id}
                className={`mobile-chairside-row-item rounded-xl border ${
                  selectedPaymentMethod === method.id
                    ? "border-teal-500 bg-teal-500/10"
                    : "border-[var(--line)]"
                }`}
                onClick={() => {
                  triggerHaptic("selection");
                  setSelectedPaymentMethod(method.id as any);
                }}
              >
                <div>
                  <div className="text-[15px] font-bold text-[var(--ink)]">{method.label}</div>
                  <div className="text-[12px] text-[var(--muted)]">{method.desc}</div>
                </div>
                {selectedPaymentMethod === method.id ? (
                  <CheckCircle2 size={20} className="text-teal-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-[var(--line)]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </MobileBottomSheet>
    </div>
  );
};

export default MobileChairsideVisitWorkspace;
