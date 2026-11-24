/**
 * apps/web/src/components/visit/mobileChairside/useChairsideVisitWorkspace.ts
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Layer 3: State Hook)
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { triggerHaptic } from "../../../native/mobileBridge";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import { useUnifiedDictation } from "../../../hooks/useUnifiedDictation";
import type { PlanStageItem } from "../visitPlanStageHandoff";
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
  const [isDiarySheetOpen, setIsDiarySheetOpen] = useState(false);
  const [isStageTaken, setIsStageTaken] = useState(false);

  // Speech Recognition state for SmartMicrophone via Unified Dictation (Mandate 8e, zero fake timeouts)
  const [recognizedVoiceSnippet, setRecognizedVoiceSnippet] = useState("");
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;
  const visitNoteFormRef = useRef(visitNoteForm);
  visitNoteFormRef.current = visitNoteForm;
  const dictationBaselineRef = useRef<{ step: MobileChairsideStep; text: string } | null>(null);

  const {
    isRecording,
    toggleDictation: toggleVoiceRecordingInternal,
  } = useUnifiedDictation({
    context: "visit",
    onInterim: (text) => {
      if (text) setRecognizedVoiceSnippet(text);
    },
    onResult: (transcript) => {
      if (!transcript) return;
      triggerHaptic("success");
      setRecognizedVoiceSnippet(transcript);
      const step = currentStepRef.current;
      const form = visitNoteFormRef.current;

      let baseline = "";
      if (dictationBaselineRef.current && dictationBaselineRef.current.step === step) {
        baseline = dictationBaselineRef.current.text;
      } else {
        if (step === "complaints") baseline = typeof form?.complaint === "string" ? form.complaint : "";
        else if (step === "exam") baseline = typeof form?.objectiveStatus === "string" ? form.objectiveStatus : "";
        else if (step === "diagnosis") baseline = typeof form?.diagnosis === "string" ? form.diagnosis : "";
        else if (step === "treatment") baseline = typeof form?.treatmentPlan === "string" ? form.treatmentPlan : "";
        dictationBaselineRef.current = { step, text: baseline };
      }

      const merged = baseline.trim() ? `${baseline.trim()} ${transcript.trim()}` : transcript.trim();

      if (step === "complaints") {
        updateVisitNoteField("complaint", merged);
      } else if (step === "exam") {
        updateVisitNoteField("objectiveStatus", merged);
      } else if (step === "diagnosis") {
        updateVisitNoteField("diagnosis", merged);
      } else if (step === "treatment") {
        updateVisitNoteField("treatmentPlan", merged);
      }
    },
  });

  // Reset dictation baseline when recording stops to eliminate snowball compounding
  useEffect(() => {
    if (!isRecording) {
      dictationBaselineRef.current = null;
    }
  }, [isRecording]);

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
      return loadedTreatmentPlan.stages[0].items.map((it: PlanStageItem, idx: number) => ({
        id: it.id || `stage-item-${idx}`,
        code804n: it.serviceCode || it.code804n || "A16.07.002",
        title: it.name || it.title || "Услуга плана",
        priceRub: Number(it.price || it.priceRub || it.unitPriceRub || 0),
        quantity: Number(it.quantity || 1),
        toothCode: it.toothNumber ? String(it.toothNumber) : undefined,
      }));
    }
    if (loadedTreatmentPlan?.items?.length) {
      return loadedTreatmentPlan.items.map((it: PlanStageItem, idx: number) => ({
        id: it.id || `plan-item-${idx}`,
        code804n: it.serviceCode || it.code804n || "A16.07.002",
        title: it.name || it.title || "Услуга плана",
        priceRub: Number(it.price || it.priceRub || it.unitPriceRub || 0),
        quantity: Number(it.quantity || 1),
        toothCode: it.toothNumber ? String(it.toothNumber) : undefined,
      }));
    }

    return [];
  });

  // Listen to external billing items added from catalog, tooth protocol or Copilot HUD
  useEffect(() => {
    const handleAddBillingEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail) return;

      const rawItems: unknown[] = Array.isArray(detail.items)
        ? detail.items
        : Array.isArray(detail)
          ? detail
          : detail.item
            ? [detail.item]
            : [detail];

      const parsedNewItems: MobileChairsideBillingItem[] = [];

      for (let idx = 0; idx < rawItems.length; idx++) {
        const raw = rawItems[idx] as Record<string, unknown> | null | undefined;
        if (!raw || typeof raw !== "object") continue;

        const titleCandidate =
          (typeof raw.title === "string" && raw.title.trim()) ||
          (typeof raw.name === "string" && raw.name.trim()) ||
          (typeof raw.serviceName === "string" && raw.serviceName.trim()) ||
          (typeof raw.shortTitle === "string" && raw.shortTitle.trim()) ||
          "";

        if (!titleCandidate && !raw.code && !raw.code804n && !raw.priceRub && !raw.price && !raw.unitPriceRub) {
          continue;
        }

        const title = titleCandidate || "Услуга приёма";
        const code804n =
          (typeof raw.code === "string" && raw.code) ||
          (typeof raw.code804n === "string" && raw.code804n) ||
          (typeof raw.serviceCode === "string" && raw.serviceCode) ||
          "A16.07.002";

        const priceRub = Number(
          raw.unitPriceRub ??
          raw.priceRub ??
          (typeof raw.priceKopecks === "number" ? kopecksToRubles(raw.priceKopecks) : undefined) ??
          raw.price ??
          0
        );

        const quantity = Math.max(1, Number(raw.quantity ?? 1));
        const toothCandidate = raw.toothNumber ?? raw.toothCode;
        const toothCode = toothCandidate !== undefined && toothCandidate !== null ? String(toothCandidate) : undefined;
        const serviceId =
          (typeof raw.id === "string" && raw.id) ||
          (typeof raw.serviceId === "string" && raw.serviceId) ||
          `billing-${toothCode || "gen"}-${code804n.replace(/[^a-zA-Z0-9]/g, "_")}-${Date.now()}-${idx}`;

        const item: MobileChairsideBillingItem = {
          id: serviceId,
          code804n,
          title,
          priceRub,
          quantity,
          toothCode,
        };

        parsedNewItems.push(item);

        // Mandate 8e & 8bm: Directly synchronize into global visit store
        try {
          useVisitStore.getState().addCompletedService({
            serviceId,
            code804n,
            name: title,
            title,
            priceRub,
            priceKopecks: rublesToKopecks(priceRub),
            quantity,
            toothNumber: toothCode,
            toothCode,
          });
        } catch {
          // ignore
        }
      }

      if (parsedNewItems.length === 0) return;

      setBillingItems((prev) => {
        const next = [...prev];
        for (const newItem of parsedNewItems) {
          const exists = next.some(
            (p) =>
              p.id === newItem.id ||
              (p.toothCode === newItem.toothCode &&
                ((p.code804n && p.code804n === newItem.code804n) || p.title === newItem.title)),
          );
          if (!exists) {
            next.push(newItem);
          }
        }
        return next;
      });
    };

    window.addEventListener("dente-add-billing-item", handleAddBillingEvent);
    return () => {
      window.removeEventListener("dente-add-billing-item", handleAddBillingEvent);
    };
  }, []);

  // Mandate 8bm: Exact integer kopecks arithmetic without floating point drift
  const totalBillingAmountKopecks = useMemo(() => {
    return billingItems.reduce((sumKop, item) => {
      const itemKop = rublesToKopecks(item.priceRub);
      return sumKop + itemKop * (item.quantity || 1);
    }, 0);
  }, [billingItems]);

  const totalBillingAmountRub = useMemo(() => {
    return kopecksToRubles(totalBillingAmountKopecks);
  }, [totalBillingAmountKopecks]);

  // Callback to take treatment plan stage into active visit
  const handleTakeStageFromBanner = useCallback(
    (
      stage: { title: string; stageNumber: number; items: readonly PlanStageItem[] | PlanStageItem[] },
      items: readonly PlanStageItem[] | PlanStageItem[],
    ) => {
      triggerHaptic("success");
      setIsStageTaken(true);
      const stageTitle = stage?.title || "План лечения";
      showToast(`Этап «${stageTitle}» взят в работу (${items.length} услуг)`, "success");

      if (updateVisitNoteField && items.length > 0) {
        const stageDiaryText = `Взят в работу этап: «${stageTitle}»:\n${items
          .map((it: PlanStageItem, idx: number) => `${idx + 1}. ${it.title || it.name || "Услуга"}${it.toothNumber ? ` (зуб ${it.toothNumber})` : ""}`)
          .join("\n")}`;
        const currentPlan = typeof visitNoteForm?.treatmentPlan === "string" ? visitNoteForm.treatmentPlan : "";
        updateVisitNoteField("treatmentPlan", currentPlan ? `${currentPlan}\n\n${stageDiaryText}` : stageDiaryText);
      }

      const newItems: MobileChairsideBillingItem[] = items.map((it: PlanStageItem, idx: number) => ({
        id: `stage-item-${Date.now()}-${idx}`,
        code804n: it.serviceCode || it.code804n || (typeof it["code"] === "string" ? it["code"] : "") || "A16.07.002",
        title: it.name || it.title || "Услуга плана",
        priceRub: Number(it.price || it.priceRub || it.unitPriceRub || 0),
        quantity: Number(it.quantity || 1),
        toothCode: it.toothNumber ? String(it.toothNumber) : undefined,
      }));
      setBillingItems((prev) => [...prev, ...newItems]);

      for (const it of items) {
        const serviceId = `stage-${Date.now()}-${it.id || it.serviceCode || "srv"}`;
        const priceRub = Number(it.price || it.priceRub || it.unitPriceRub || 0);
        const code804n = it.serviceCode || it.code804n || (typeof it["code"] === "string" ? it["code"] : "") || "A16.07.002";
        const title = it.name || it.title || "Услуга плана";
        const toothNumber = it.toothNumber ? String(it.toothNumber) : undefined;

        try {
          useVisitStore.getState().addCompletedService({
            serviceId,
            code804n,
            name: title,
            title,
            priceRub,
            priceKopecks: rublesToKopecks(priceRub),
            quantity: Number(it.quantity || 1),
            toothNumber,
            toothCode: toothNumber,
          });
        } catch {
          // ignore
        }

        window.dispatchEvent(
          new CustomEvent("dente-add-billing-item", {
            detail: {
              item: {
                id: serviceId,
                code804n,
                title,
                name: title,
                quantity: Number(it.quantity || 1),
                unitPriceRub: priceRub,
                priceRub,
                priceKopecks: rublesToKopecks(priceRub),
                discountRub: 0,
                toothNumber,
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
    const rawStage = stages[0];
    const activeStage = {
      title:
        (rawStage && (rawStage.title || ("titleRu" in rawStage ? String(rawStage.titleRu) : undefined) || ("name" in rawStage ? String(rawStage.name) : undefined))) ||
        loadedTreatmentPlan.name ||
        loadedTreatmentPlan.title ||
        "План лечения",
      stageNumber: (rawStage && rawStage.stageNumber) ?? 1,
      items: (rawStage && rawStage.items) || loadedTreatmentPlan.items || [],
    };
    const items = activeStage.items;
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

  // Smart Microphone toggler via useUnifiedDictation (zero fake timeouts or mocks)
  const toggleVoiceRecording = useCallback(async () => {
    triggerHaptic("selection");
    await toggleVoiceRecordingInternal();
  }, [toggleVoiceRecordingInternal]);

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

  const addBillingItem = (item: { code804n: string; title: string; priceRub: number; toothCode?: string }) => {
    triggerHaptic("selection");
    const serviceId = `item-${Date.now()}`;
    const priceKopecks = rublesToKopecks(item.priceRub);
    const newItem: MobileChairsideBillingItem = {
      id: serviceId,
      code804n: item.code804n,
      title: item.title,
      priceRub: item.priceRub,
      quantity: 1,
      toothCode: item.toothCode,
    };
    setBillingItems((prev) => [...prev, newItem]);

    // Mandate 8e & 8bm: Directly synchronize into global visit store
    try {
      useVisitStore.getState().addCompletedService({
        serviceId,
        code804n: item.code804n,
        name: item.title,
        title: item.title,
        priceRub: item.priceRub,
        priceKopecks,
        quantity: 1,
        toothNumber: item.toothCode,
        toothCode: item.toothCode,
      });
    } catch {
      // ignore
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dente-add-billing-item", {
          detail: {
            item: {
              id: serviceId,
              code804n: item.code804n,
              title: item.title,
              name: item.title,
              quantity: 1,
              unitPriceRub: item.priceRub,
              priceRub: item.priceRub,
              priceKopecks,
              discountRub: 0,
              toothNumber: item.toothCode,
            },
          },
        }),
      );
    }
    showToast(`Добавлено в чек: ${item.title}`, "success");
  };

  const removeBillingItem = (id: string) => {
    triggerHaptic("selection");
    setBillingItems((prev) => prev.filter((it) => it.id !== id));
    try {
      useVisitStore.getState().setCompletedServices((prev) =>
        prev.filter((it) => (it.serviceId ? it.serviceId !== id : true))
      );
    } catch {
      // ignore
    }
  };

  const executeFinalCheckout = async (paymentMethod: "sbp" | "card" | "cash" = "sbp") => {
    if (inFlightCheckoutRef.current) return;
    inFlightCheckoutRef.current = true;
    try {
      triggerHaptic("success");
      setIsCheckoutSheetOpen(false);

      // Save preferred payment method for cashier
      try {
        const stored = sessionStorage.getItem("dente_pending_checkout");
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, unknown>;
          parsed.paymentMethod = paymentMethod;
          sessionStorage.setItem("dente_pending_checkout", JSON.stringify(parsed));
          localStorage.setItem("dente_pending_checkout", JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }

      if (handleFinishVisitAction) {
        await handleFinishVisitAction();
      }
      if (flushPendingVisitSaves) {
        await flushPendingVisitSaves();
      }

      // Reinforce payment method in pending checkout after handleFinishVisitAction runs
      try {
        const stored = sessionStorage.getItem("dente_pending_checkout");
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, unknown>;
          parsed.paymentMethod = paymentMethod;
          sessionStorage.setItem("dente_pending_checkout", JSON.stringify(parsed));
          localStorage.setItem("dente_pending_checkout", JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }

      showToast("Приём завершён, счёт сформирован", "success");
      // Do not call onClose() when navigating to finance - handleFinishVisitAction navigates to #finance
      if (typeof window !== "undefined" && window.location.hash !== "#finance" && onClose) {
        onClose();
      }
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
    isDiarySheetOpen,
    setIsDiarySheetOpen,
    isStageTaken,
    isRecording,
    recognizedVoiceSnippet,
    billingItems,
    totalBillingAmountRub,
    totalBillingAmountKopecks,
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
