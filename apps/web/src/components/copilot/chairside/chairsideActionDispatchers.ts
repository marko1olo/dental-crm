/**
 * chairsideActionDispatchers.ts — Event Dispatchers & State Synchronization for Chairside Copilot.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 500 lines.
 * - Mandate 8e: Doctor & Staff Autonomy (zero blocking gates, reversible actions).
 * - Mandate 8v & 8ab: Multi-functional copilot, background inventory & silent sync.
 */

import { useVisitStore } from "../../../store/visitStore";
import {
  type ChairsideToothProposal,
  type ChairsideServiceProposal,
  type ChairsideSoapProposal,
  type ChairsideAnestheticProposal,
  type ChairsideConsentProposal,
  mapToCanonicalToothState,
} from "./chairsideTypes";

export interface ToothDispatchCallbacks {
  onUpdateToothStatus?: ((toothNumber: number, status: string, surfaces?: string[]) => void) | undefined;
  onApplyToothState?: ((toothNumber: number, state: string, surfaces?: string[]) => void) | undefined;
}

export function dispatchApplyTooth(
  toothProposal: ChairsideToothProposal,
  patientId: string | undefined,
  callbacks: ToothDispatchCallbacks
): string {
  const canonicalState = mapToCanonicalToothState(toothProposal.state);
  if (callbacks.onUpdateToothStatus) {
    callbacks.onUpdateToothStatus(toothProposal.toothNumber, canonicalState, toothProposal.surfaces);
  }
  if (callbacks.onApplyToothState) {
    callbacks.onApplyToothState(toothProposal.toothNumber, canonicalState, toothProposal.surfaces);
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
  try {
    useVisitStore.getState().setToothState(String(toothProposal.toothNumber), canonicalState as any);
  } catch {
    // safe fallback
  }
  return canonicalState;
}

export function dispatchUndoTooth(
  toothNumber: number,
  previousToothState: string | null,
  patientId: string | undefined,
  callbacks: ToothDispatchCallbacks
): void {
  const revertState = mapToCanonicalToothState(previousToothState || "Healthy");
  if (callbacks.onUpdateToothStatus) {
    callbacks.onUpdateToothStatus(toothNumber, revertState);
  }
  if (callbacks.onApplyToothState) {
    callbacks.onApplyToothState(toothNumber, revertState);
  }
  try {
    window.dispatchEvent(
      new CustomEvent("dente-odontogram-update", {
        detail: {
          patientId,
          states: [{ toothNumber, state: revertState }],
        },
      })
    );
    window.dispatchEvent(
      new CustomEvent("dente-quick-tooth-apply", {
        detail: {
          toothNumber,
          state: revertState,
          patientId,
        },
      })
    );
  } catch {
    // safe fallback
  }
}

export interface ServicesDispatchCallbacks {
  onAddBillingItem?: ((services: ChairsideServiceProposal[]) => void) | undefined;
  onApplyServices?: ((services: ChairsideServiceProposal[]) => void) | undefined;
}

export function dispatchApplyServices(
  services: ChairsideServiceProposal[],
  callbacks: ServicesDispatchCallbacks
): void {
  if (callbacks.onAddBillingItem) {
    callbacks.onAddBillingItem(services);
  }
  if (callbacks.onApplyServices) {
    callbacks.onApplyServices(services);
  }
  try {
    window.dispatchEvent(
      new CustomEvent("dente-add-billing-item", {
        detail: { services },
      })
    );
  } catch {
    // safe fallback
  }
}

export function dispatchUndoServices(serviceIds: string[]): void {
  try {
    window.dispatchEvent(
      new CustomEvent("dente-remove-billing-items", {
        detail: { serviceIds },
      })
    );
  } catch {
    // safe fallback
  }
}

export interface SoapDispatchCallbacks {
  onApplySoapDiary?: ((soap: ChairsideSoapProposal) => void) | undefined;
  onApplySoapNotes?: ((notes: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    recommendations: string;
  }) => void) | undefined;
}

export function dispatchApplySoap(
  soap: ChairsideSoapProposal,
  callbacks: SoapDispatchCallbacks
): void {
  if (callbacks.onApplySoapDiary) {
    callbacks.onApplySoapDiary(soap);
  }
  if (callbacks.onApplySoapNotes) {
    callbacks.onApplySoapNotes({
      subjective: soap.complaint,
      objective: soap.objectiveStatus,
      assessment: soap.diagnosis,
      plan: soap.treatmentPlan,
      recommendations: soap.recommendations ?? "",
    });
  }
  try {
    window.dispatchEvent(
      new CustomEvent("dente-apply-soap-protocol", {
        detail: {
          soap: {
            complaint: soap.complaint,
            anamnesis: soap.anamnesis,
            statusLocalis: soap.objectiveStatus,
            diagnosisIcd10: soap.diagnosis,
            treatmentDescription: soap.treatmentPlan,
            recommendations: soap.recommendations,
          },
        },
      })
    );
  } catch {
    // safe fallback
  }
  try {
    useVisitStore.getState().setVisitNoteForm((prev) => ({
      ...prev,
      complaint: soap.complaint || prev.complaint || "",
      anamnesis: soap.anamnesis || prev.anamnesis || "",
      objectiveStatus: soap.objectiveStatus || prev.objectiveStatus || "",
      treatmentPlan: soap.treatmentPlan || prev.treatmentPlan || "",
      recommendations: soap.recommendations || prev.recommendations || "",
      diagnosis: soap.diagnosis || prev.diagnosis || "",
    }));
  } catch {
    // safe fallback
  }
}

export function dispatchUndoSoap(previousSoapSnapshot: Record<string, string> | null): void {
  try {
    window.dispatchEvent(
      new CustomEvent("dente-undo-soap-protocol", {
        detail: { previousSnapshot: previousSoapSnapshot },
      })
    );
  } catch {
    // safe fallback
  }
}

export interface AnestheticDispatchCallbacks {
  onDisposeCarpule?: ((drugName: string, count: number) => void) | undefined;
}

export function dispatchApplyCarpule(
  anesthetic: ChairsideAnestheticProposal,
  patientId: string | undefined,
  visitId: string | undefined,
  callbacks: AnestheticDispatchCallbacks
): void {
  if (callbacks.onDisposeCarpule) {
    callbacks.onDisposeCarpule(anesthetic.drugName, anesthetic.carpulesCount);
  }
  try {
    window.dispatchEvent(
      new CustomEvent("dente-carpule-disposed", {
        detail: {
          drugName: anesthetic.drugName,
          carpulesCount: anesthetic.carpulesCount,
          patientId,
          visitId,
        },
      })
    );
  } catch {
    // safe fallback
  }
}

export function dispatchUndoCarpule(
  anesthetic: ChairsideAnestheticProposal,
  patientId: string | undefined,
  visitId: string | undefined
): void {
  try {
    window.dispatchEvent(
      new CustomEvent("dente-undo-carpule-disposal", {
        detail: {
          drugName: anesthetic.drugName,
          carpulesCount: anesthetic.carpulesCount,
          patientId,
          visitId,
        },
      })
    );
  } catch {
    // safe fallback
  }
}

export interface ConsentDispatchCallbacks {
  onPrintInformedConsent?: ((consentCode: string) => void) | undefined;
}

export function dispatchApplyConsent(
  consent: ChairsideConsentProposal,
  patientId: string | undefined,
  visitId: string | undefined,
  callbacks: ConsentDispatchCallbacks
): void {
  if (callbacks.onPrintInformedConsent) {
    callbacks.onPrintInformedConsent(consent.consentCode);
  }
  try {
    window.dispatchEvent(
      new CustomEvent("dente-print-informed-consent", {
        detail: {
          consentCode: consent.consentCode,
          consentTitle: consent.consentTitle,
          regulatoryBasis: consent.regulatoryBasis,
          patientId,
          visitId,
        },
      })
    );
  } catch {
    // safe fallback
  }
}

export function dispatchUndoConsent(
  consent: ChairsideConsentProposal,
  patientId: string | undefined,
  visitId: string | undefined
): void {
  try {
    window.dispatchEvent(
      new CustomEvent("dente-undo-informed-consent", {
        detail: {
          consentCode: consent.consentCode,
          patientId,
          visitId,
        },
      })
    );
  } catch {
    // safe fallback
  }
}
