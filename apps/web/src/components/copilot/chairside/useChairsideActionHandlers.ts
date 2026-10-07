/**
 * useChairsideActionHandlers.ts — 1-Click Action Handlers & Undo Tracking Hook.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 500 lines.
 * - Mandate 8e: Doctor & Staff Autonomy (zero blocking gates, reversible actions).
 * - Mandate 8k: 1-Click Apply All and individual action cards.
 */

import { useState, useCallback, useMemo } from "react";
import { showToast } from "../../GlobalToast";
import type {
  ChairsideToothProposal,
  ChairsideServiceProposal,
  ChairsideSoapProposal,
  ChairsideAnestheticProposal,
  ChairsideConsentProposal,
  ChairsideSafetyAlert,
} from "./chairsideTypes";
import {
  dispatchApplyTooth,
  dispatchUndoTooth,
  dispatchApplyServices,
  dispatchUndoServices,
  dispatchApplySoap,
  dispatchUndoSoap,
  dispatchApplyCarpule,
  dispatchUndoCarpule,
  dispatchApplyConsent,
  dispatchUndoConsent,
} from "./chairsideActionDispatchers";

export interface UseChairsideActionHandlersOptions {
  patientId?: string | undefined;
  visitId?: string | undefined;
  toothProposal: ChairsideToothProposal;
  setToothProposal: React.Dispatch<React.SetStateAction<ChairsideToothProposal>>;
  servicesProposal: ChairsideServiceProposal[];
  setServicesProposal: React.Dispatch<React.SetStateAction<ChairsideServiceProposal[]>>;
  soapProposal: ChairsideSoapProposal;
  setSoapProposal: React.Dispatch<React.SetStateAction<ChairsideSoapProposal>>;
  anestheticProposal: ChairsideAnestheticProposal | null;
  setAnestheticProposal: React.Dispatch<React.SetStateAction<ChairsideAnestheticProposal | null>>;
  consentProposal: ChairsideConsentProposal | null;
  setConsentProposal: React.Dispatch<React.SetStateAction<ChairsideConsentProposal | null>>;
  safetyAlert: ChairsideSafetyAlert;
  setSafetyAlert: React.Dispatch<React.SetStateAction<ChairsideSafetyAlert>>;
  servicesTotalPrice: number;
  onApplyToothState?: ((toothNumber: number, state: string, surfaces?: string[]) => void) | undefined;
  onUpdateToothStatus?: ((toothNumber: number, status: string, surfaces?: string[]) => void) | undefined;
  onApplyServices?: ((services: ChairsideServiceProposal[]) => void) | undefined;
  onAddBillingItem?: ((services: ChairsideServiceProposal[]) => void) | undefined;
  onApplySoapNotes?: ((notes: any) => void) | undefined;
  onApplySoapDiary?: ((soap: ChairsideSoapProposal) => void) | undefined;
  onDisposeCarpule?: ((drugName: string, count: number) => void) | undefined;
  onPrintInformedConsent?: ((consentCode: string) => void) | undefined;
  onApplyAll?: (() => void) | undefined;
}

export function useChairsideActionHandlers(options: UseChairsideActionHandlersOptions) {
  const {
    patientId,
    visitId,
    toothProposal,
    setToothProposal,
    servicesProposal,
    setServicesProposal,
    soapProposal,
    setSoapProposal,
    anestheticProposal,
    setAnestheticProposal,
    consentProposal,
    setConsentProposal,
    safetyAlert,
    setSafetyAlert,
    servicesTotalPrice,
    onApplyToothState,
    onUpdateToothStatus,
    onApplyServices,
    onAddBillingItem,
    onApplySoapNotes,
    onApplySoapDiary,
    onDisposeCarpule,
    onPrintInformedConsent,
    onApplyAll,
  } = options;

  const [previousToothState, setPreviousToothState] = useState<string | null>(null);
  const [previousSoapSnapshot, setPreviousSoapSnapshot] = useState<Record<string, string> | null>(null);
  const [addedServiceIds, setAddedServiceIds] = useState<string[]>([]);

  // 1-Click apply tooth proposal with undo tracking (Mandate 8e)
  const handleApplyTooth = useCallback(() => {
    if (!toothProposal.toothNumber || !toothProposal.state) return;
    setPreviousToothState(toothProposal.state);
    const canonicalState = dispatchApplyTooth(toothProposal, patientId, {
      onUpdateToothStatus,
      onApplyToothState,
    });
    setToothProposal((prev) => ({ ...prev, applied: true }));
    showToast(`Зуб ${toothProposal.toothNumber} обновлен: ${toothProposal.stateLabel || canonicalState}`, "success");
  }, [toothProposal, patientId, onUpdateToothStatus, onApplyToothState, setToothProposal]);

  const handleUndoTooth = useCallback(() => {
    dispatchUndoTooth(toothProposal.toothNumber, previousToothState, patientId, {
      onUpdateToothStatus,
      onApplyToothState,
    });
    setToothProposal((prev) => ({ ...prev, applied: false }));
    showToast(`Откат статуса зуба ${toothProposal.toothNumber} выполнен`, "info");
  }, [toothProposal.toothNumber, previousToothState, patientId, onUpdateToothStatus, onApplyToothState, setToothProposal]);

  // 1-Click apply services proposal with undo tracking (Mandate 8e)
  const handleApplyServices = useCallback(() => {
    dispatchApplyServices(servicesProposal, { onAddBillingItem, onApplyServices });
    setAddedServiceIds(servicesProposal.map((s) => s.id));
    setServicesProposal((prev) => prev.map((s) => ({ ...s, applied: true })));
    showToast(`${servicesProposal.length} услуг добавлено в смету (${servicesTotalPrice.toLocaleString("ru-RU")} ₽)`, "success");
  }, [servicesProposal, servicesTotalPrice, onAddBillingItem, onApplyServices, setServicesProposal]);

  const handleUndoServices = useCallback(() => {
    dispatchUndoServices(addedServiceIds);
    setServicesProposal((prev) => prev.map((s) => ({ ...s, applied: false })));
    showToast("Откат услуг из сметы выполнен", "info");
  }, [addedServiceIds, setServicesProposal]);

  // 1-Click apply SOAP notes with undo tracking (Mandate 8e)
  const handleApplySoap = useCallback(() => {
    setPreviousSoapSnapshot({
      complaint: soapProposal.complaint,
      objective: soapProposal.objectiveStatus,
      assessment: soapProposal.diagnosis,
      plan: soapProposal.treatmentPlan,
      recommendations: soapProposal.recommendations ?? "",
    });
    dispatchApplySoap(soapProposal, { onApplySoapDiary, onApplySoapNotes });
    setSoapProposal((prev) => ({ ...prev, applied: true }));
    showToast("Дневник приёма сохранён в медицинской карте", "success");
  }, [soapProposal, onApplySoapDiary, onApplySoapNotes, setSoapProposal]);

  const handleUndoSoap = useCallback(() => {
    dispatchUndoSoap(previousSoapSnapshot);
    setSoapProposal((prev) => ({ ...prev, applied: false }));
    showToast("Откат вставки дневника SOAP выполнен", "info");
  }, [previousSoapSnapshot, setSoapProposal]);

  // 1-Click clinical anesthesia protocol (Mandates 8e, 8v, 8ab)
  const handleApplyCarpule = useCallback(() => {
    if (!anestheticProposal) return;
    dispatchApplyCarpule(anestheticProposal, patientId, visitId, { onDisposeCarpule });
    setAnestheticProposal((prev) => (prev ? { ...prev, applied: true } : null));
    showToast(`Анестезия внесена в протокол: ${anestheticProposal.drugName} (${anestheticProposal.carpulesCount} карп., автосписание выполнено фоном)`, "success");
  }, [anestheticProposal, patientId, visitId, onDisposeCarpule, setAnestheticProposal]);

  const handleUndoCarpule = useCallback(() => {
    if (!anestheticProposal) return;
    dispatchUndoCarpule(anestheticProposal, patientId, visitId);
    setAnestheticProposal((prev) => (prev ? { ...prev, applied: false } : null));
    showToast(`Откат протокола анестезии ${anestheticProposal.drugName} выполнен`, "info");
  }, [anestheticProposal, patientId, visitId, setAnestheticProposal]);

  // 1-Click statutory informed consent printing (Mandate 8e & 8d)
  const handleApplyConsent = useCallback(() => {
    if (!consentProposal) return;
    dispatchApplyConsent(consentProposal, patientId, visitId, { onPrintInformedConsent });
    setConsentProposal((prev) => (prev ? { ...prev, applied: true } : null));
    showToast(`Бланк ИДС направлен на печать: ${consentProposal.consentCode}`, "success");
  }, [consentProposal, patientId, visitId, onPrintInformedConsent, setConsentProposal]);

  const handleUndoConsent = useCallback(() => {
    if (!consentProposal) return;
    dispatchUndoConsent(consentProposal, patientId, visitId);
    setConsentProposal((prev) => (prev ? { ...prev, applied: false } : null));
    showToast(`Откат печати ИДС ${consentProposal.consentCode} выполнен`, "info");
  }, [consentProposal, patientId, visitId, setConsentProposal]);

  // Acknowledge safety alert
  const handleAcknowledgeAlert = useCallback(() => {
    setSafetyAlert((prev) => ({ ...prev, acknowledged: true }));
    showToast("Алерт безопасности принят к сведению", "info");
  }, [setSafetyAlert]);

  const allApplied: boolean = useMemo(() => {
    const toothDone = Boolean(toothProposal.applied);
    const servicesDone = servicesProposal.every((s) => Boolean(s.applied));
    const soapDone = Boolean(soapProposal.applied);
    const carpuleDone = !anestheticProposal || Boolean(anestheticProposal.applied);
    const consentDone = !consentProposal || Boolean(consentProposal.applied);
    return Boolean(toothDone && servicesDone && soapDone && carpuleDone && consentDone);
  }, [toothProposal.applied, servicesProposal, soapProposal.applied, anestheticProposal, consentProposal]);

  // MANDATE 8e / 8k: 1-CLICK APPLY ALL (Zero modal barriers, frictionless)
  const handleApplyAll = useCallback(() => {
    if (!toothProposal.applied) handleApplyTooth();
    if (!servicesProposal.every((s) => s.applied)) handleApplyServices();
    if (!soapProposal.applied) handleApplySoap();
    if (anestheticProposal && !anestheticProposal.applied) handleApplyCarpule();
    if (consentProposal && !consentProposal.applied) handleApplyConsent();
    if (!safetyAlert.acknowledged) handleAcknowledgeAlert();
    if (onApplyAll) onApplyAll();
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
    if (toothProposal.applied) handleUndoTooth();
    if (servicesProposal.some((s) => s.applied)) handleUndoServices();
    if (soapProposal.applied) handleUndoSoap();
    if (anestheticProposal?.applied) handleUndoCarpule();
    if (consentProposal?.applied) handleUndoConsent();
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
  }, [anestheticProposal, consentProposal, setToothProposal, setServicesProposal, setSoapProposal, setAnestheticProposal, setConsentProposal, setSafetyAlert]);

  // 1-Click interactive live pill tag removal handlers (Mandate 8l: Doctor Autonomy)
  const handleRemoveToothPill = useCallback(() => {
    setToothProposal((prev) => ({ ...prev, toothNumber: 0, state: "", stateLabel: "", surfaces: [], applied: false }));
    showToast("Зуб исключён из предложений", "info");
  }, [setToothProposal]);

  const handleRemoveDiagnosisPill = useCallback(() => {
    setSoapProposal((prev) => ({ ...prev, diagnosis: "" }));
    showToast("Диагноз исключён из предложений", "info");
  }, [setSoapProposal]);

  const handleRemoveAnestheticPill = useCallback(() => {
    setAnestheticProposal(null);
    showToast("Анестезия исключена из предложений", "info");
  }, [setAnestheticProposal]);

  const handleRemoveServicesPill = useCallback(() => {
    setServicesProposal([]);
    showToast("Смета услуг очищена", "info");
  }, [setServicesProposal]);

  return {
    handleApplyTooth,
    handleUndoTooth,
    handleApplyServices,
    handleUndoServices,
    handleApplySoap,
    handleUndoSoap,
    handleApplyCarpule,
    handleUndoCarpule,
    handleApplyConsent,
    handleUndoConsent,
    handleAcknowledgeAlert,
    allApplied,
    handleApplyAll,
    handleUndoAll,
    handleDismissAll,
    handleRemoveToothPill,
    handleRemoveDiagnosisPill,
    handleRemoveAnestheticPill,
    handleRemoveServicesPill,
  };
}
