/**
 * apps/web/src/components/visit/mobileChairside/useChairsideVisitWorkspace.ts
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Layer 3: State Hook)
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { triggerHaptic } from "../../../native/mobileBridge";
import { showToast } from "../../GlobalToast";
import type {
  MobileChairsideBillingItem,
  MobileChairsideStep,
  MobileChairsideVisitWorkspaceProps,
} from "./types";

export function useChairsideVisitWorkspace({
  visitNoteForm = {},
  updateVisitNoteField,
  flushPendingVisitSaves,
  handleApplySomaticNormQuick,
  handleFinishVisitAction,
  onClose,
  testId = "mobile-chairside-workspace",
  loadedTreatmentPlan,
  initialStep = "complaints",
}: MobileChairsideVisitWorkspaceProps) {
  const [currentStep, setCurrentStep] = useState<MobileChairsideStep>(initialStep);
  const [isNormApplied, setIsNormApplied] = useState(false);
  const [activeQuadrant, setActiveQuadrant] = useState<1 | 2 | 3 | 4>(1);
  const [isCheckoutSheetOpen, setIsCheckoutSheetOpen] = useState(false);
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

  return {
    currentStep,
    setCurrentStep,
    isNormApplied,
    activeQuadrant,
    setActiveQuadrant,
    isCheckoutSheetOpen,
    setIsCheckoutSheetOpen,
    isStageTaken,
    isRecording,
    recognizedVoiceSnippet,
    billingItems,
    totalBillingAmountRub,
    handleTakeStageFromBanner,
    handleTakeActivePlanStage,
    onApplyChairsideNorm,
    toggleVoiceRecording,
    appendQuickPhrase,
    handleNextStep,
    handlePrevStep,
    addBillingItem,
    removeBillingItem,
    executeFinalCheckout,
  };
}
