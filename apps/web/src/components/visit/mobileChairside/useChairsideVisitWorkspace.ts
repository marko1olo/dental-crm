/**
 * apps/web/src/components/visit/mobileChairside/useChairsideVisitWorkspace.ts
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Layer 3: State Hook)
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { triggerHaptic } from "../../../native/mobileBridge";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
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
  setToothState,
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
  const speechRecognitionRef = useRef<any>(null);

  // In-session chairside billing items (derived from treatment plan or completed store items)
  const [billingItems, setBillingItems] = useState<MobileChairsideBillingItem[]>(() => {
    try {
      const storeServices = useVisitStore.getState().completedServices;
      if (storeServices && storeServices.length > 0) {
        return storeServices.map((it, idx) => ({
          id: it.serviceId || `store-item-${idx}`,
          code804n: it.code804n || "A16.07.002",
          title: it.name || "Услуга приёма",
          priceRub: Number(it.priceRub || 0),
          quantity: Number(it.quantity || 1),
          toothCode: it.toothNumber ? String(it.toothNumber) : it.toothCode,
        }));
      }
    } catch {
      // ignore
    }

    if (loadedTreatmentPlan?.stages?.[0]?.items?.length) {
      return loadedTreatmentPlan.stages[0].items.map((it: any, idx: number) => ({
        id: it.id || `stage-item-${idx}`,
        code804n: it.code || it.code804n || "A16.07.002",
        title: it.name || it.title || "Услуга плана",
        priceRub: Number(it.price || it.priceRub || it.unitPriceRub || 0),
        quantity: Number(it.quantity || 1),
        toothCode: it.toothNumber ? String(it.toothNumber) : undefined,
      }));
    }
    if (loadedTreatmentPlan?.items?.length) {
      return loadedTreatmentPlan.items.map((it: any, idx: number) => ({
        id: it.id || `plan-item-${idx}`,
        code804n: it.code || it.code804n || "A16.07.002",
        title: it.name || it.title || "Услуга плана",
        priceRub: Number(it.price || it.priceRub || it.unitPriceRub || 0),
        quantity: Number(it.quantity || 1),
        toothCode: it.toothNumber ? String(it.toothNumber) : undefined,
      }));
    }

    return [];
  });

  // Listen to external billing items added from catalog or tooth protocol
  useEffect(() => {
    const handleAddBillingEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail) return;
      const it = detail.item || detail;
      if (!it) return;
      const newItem: MobileChairsideBillingItem = {
        id: it.id || `billing-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        code804n: it.code || it.code804n || "A16.07.002",
        title: it.title || it.name || "Услуга приёма",
        priceRub: Number(it.unitPriceRub || it.priceRub || it.price || 0),
        quantity: Number(it.quantity || 1),
        toothCode: it.toothNumber ? String(it.toothNumber) : it.toothCode,
      };
      setBillingItems((prev) => {
        const exists = prev.some(
          (p) =>
            p.id === newItem.id ||
            (p.toothCode === newItem.toothCode &&
              ((p.code804n && p.code804n === newItem.code804n) || p.title === newItem.title)),
        );
        if (exists) return prev;
        return [...prev, newItem];
      });
    };

    window.addEventListener("dente-add-billing-item", handleAddBillingEvent);
    return () => {
      window.removeEventListener("dente-add-billing-item", handleAddBillingEvent);
    };
  }, []);

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

  // 1-Tap Somatic Norm Action & All Teeth Healthy (Mandate 8e)
  const onApplyChairsideNorm = useCallback(() => {
    triggerHaptic("success");
    setIsNormApplied(true);
    if (setToothState) {
      const allTeeth = [
        "18", "17", "16", "15", "14", "13", "12", "11",
        "21", "22", "23", "24", "25", "26", "27", "28",
        "48", "47", "46", "45", "44", "43", "42", "41",
        "31", "32", "33", "34", "35", "36", "37", "38",
      ];
      for (const t of allTeeth) {
        setToothState(t, "Healthy");
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("dente-batch-update-tooth-state", {
            detail: { state: "Healthy", teeth: allTeeth },
          }),
        );
      }
    }
    if (handleApplySomaticNormQuick) {
      handleApplySomaticNormQuick();
    } else {
      updateVisitNoteField(
        "objectiveStatus",
        "Слизистая оболочка полости рта бледно-розовая, умеренно увлажнена. Зубные ряды интактны, кариозных полостей нет, патологических зубодесневых карманов нет. Прикус ортогнатический. Регионарные лимфоузлы не пальпируются. Перкуссия безболезненна.",
      );
      updateVisitNoteField(
        "anamnesis",
        "Соматически здоров. Хронические заболевания, гепатит, ВИЧ, туберкулез отрицает. Аллергоанамнез не отягощен.",
      );
    }
    if (flushPendingVisitSaves) {
      void flushPendingVisitSaves();
    }
    showToast("✓ Норма внесена: пациент соматически здоров, зубные ряды интактны", "success");
  }, [handleApplySomaticNormQuick, updateVisitNoteField, setToothState, flushPendingVisitSaves]);

  // Smart Microphone toggler with real Web Speech API (zero fake timeouts or mocks)
  const toggleVoiceRecording = useCallback(() => {
    triggerHaptic("selection");
    if (isRecording) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
      showToast("Диктовка завершена", "info");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsRecording(false);
      showToast("Голосовой ввод не поддерживается данным браузером", "warning");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      speechRecognitionRef.current = recognition;
      recognition.lang = "ru-RU";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        showToast("Слушаю клиническую речь...", "info");
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current]?.[0]?.transcript;
        if (!transcript) return;
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
        speechRecognitionRef.current = null;
      };

      recognition.onend = () => {
        setIsRecording(false);
        speechRecognitionRef.current = null;
      };

      recognition.start();
    } catch {
      setIsRecording(false);
      speechRecognitionRef.current = null;
      showToast("Не удалось запустить распознавание речи", "warning");
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

  // Synchronous double-click / in-flight request locks (Mandate 8e & idempotency)
  const inFlightStepRef = useRef(false);
  const inFlightCheckoutRef = useRef(false);

  const handleNextStep = () => {
    if (inFlightStepRef.current) return;
    inFlightStepRef.current = true;
    try {
      triggerHaptic("selection");
      if (flushPendingVisitSaves) void flushPendingVisitSaves();
      if (currentStep === "complaints") setCurrentStep("exam");
      else if (currentStep === "exam") setCurrentStep("diagnosis");
      else if (currentStep === "diagnosis") setCurrentStep("treatment");
      else if (currentStep === "treatment") setCurrentStep("checkout");
      else if (currentStep === "checkout") {
        setIsCheckoutSheetOpen(true);
      }
    } finally {
      setTimeout(() => {
        inFlightStepRef.current = false;
      }, 250);
    }
  };

  const handlePrevStep = () => {
    if (inFlightStepRef.current) return;
    inFlightStepRef.current = true;
    try {
      triggerHaptic("selection");
      if (flushPendingVisitSaves) void flushPendingVisitSaves();
      if (currentStep === "checkout") setCurrentStep("treatment");
      else if (currentStep === "treatment") setCurrentStep("diagnosis");
      else if (currentStep === "diagnosis") setCurrentStep("exam");
      else if (currentStep === "exam") setCurrentStep("complaints");
      else if (currentStep === "complaints") {
        if (onClose) onClose();
      }
    } finally {
      setTimeout(() => {
        inFlightStepRef.current = false;
      }, 250);
    }
  };

  // Quiet debounced auto-save of clinical draft notes (Mandate 8e)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (flushPendingVisitSaves) {
        void flushPendingVisitSaves();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [
    visitNoteForm?.complaint,
    visitNoteForm?.anamnesis,
    visitNoteForm?.objectiveStatus,
    visitNoteForm?.diagnosis,
    visitNoteForm?.treatmentPlan,
    flushPendingVisitSaves,
  ]);

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
    if (inFlightCheckoutRef.current) return;
    inFlightCheckoutRef.current = true;
    try {
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
    } finally {
      inFlightCheckoutRef.current = false;
    }
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
