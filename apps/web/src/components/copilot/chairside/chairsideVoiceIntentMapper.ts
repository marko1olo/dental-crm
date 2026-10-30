/**
 * chairsideVoiceIntentMapper.ts — Чистый маппер распознанных голосовых интентов в клинические предложения HUD.
 * Выделено из ChairsideCopilotHUD.tsx для соблюдения лимита Sweet Spot 300–480 строк (Мандат 8b).
 */

import type { DentalVoiceIntent } from "../../services/voice";
import type {
  ChairsideToothProposal,
  ChairsideSoapProposal,
  ChairsideAnestheticProposal,
  ChairsideServiceProposal,
} from "./chairsideTypes";

export interface MappedIntentProposals {
  toothProposal?: ChairsideToothProposal;
  soapPatch?: Partial<ChairsideSoapProposal>;
  anestheticProposal?: ChairsideAnestheticProposal;
  servicesProposal?: ChairsideServiceProposal[];
}

export function mapVoiceIntentToHUDProposals(
  intent: DentalVoiceIntent,
  currentSoap: ChairsideSoapProposal
): MappedIntentProposals {
  const result: MappedIntentProposals = {};

  if (!intent) return result;

  if (intent.teethUpdates && intent.teethUpdates.length > 0) {
    const first = intent.teethUpdates[0];
    if (first) {
      result.toothProposal = {
        toothNumber: first.toothNumber,
        state: first.state || "C2",
        stateLabel: first.icd10Title || first.clinicalStatus || "Кариес",
        surfaces: first.surfaces ? [...first.surfaces] : ["O"],
        applied: false,
      };
      if (first.icd10Code || first.icd10Title) {
        result.soapPatch = {
          diagnosis: `${first.icd10Code || ""} ${first.icd10Title || ""}`.trim() || currentSoap.diagnosis,
        };
      }
    }
  }

  if (intent.anesthesia) {
    result.anestheticProposal = {
      drugName: intent.anesthesia.displayName || intent.anesthesia.tradeName,
      carpulesCount: intent.anesthesia.cartridgeCount || 1,
      patientWeightKg: 70,
      maxCarpules: 4,
      epinephrineMcg: 10,
      isCardiovascularRisk: false,
      applied: false,
    };
  }

  const procs = intent.treatmentProcedures || intent.procedures804n;
  if (procs && procs.length > 0) {
    result.servicesProposal = procs.map((p: any, idx: number) => ({
      id: `proc-voice-${idx}-${Date.now()}`,
      serviceCode: p.serviceCode || p.code804n || "A16.07.001",
      code804n: p.serviceCode || p.code804n || "A16.07.001",
      title: p.name || p.title || "Медицинская услуга",
      priceRub: p.priceRub || 1500,
      quantity: p.quantity || 1,
      applied: false,
    }));
  }

  if (intent.soapNotes) {
    result.soapPatch = {
      ...(result.soapPatch || {}),
      complaint: intent.soapNotes.subjective || currentSoap.complaint,
      objectiveStatus: intent.soapNotes.objective || currentSoap.objectiveStatus,
      diagnosis: intent.soapNotes.assessment || (result.soapPatch?.diagnosis ?? currentSoap.diagnosis),
      treatmentPlan: intent.soapNotes.plan || currentSoap.treatmentPlan,
      recommendations: intent.soapNotes.recommendations || currentSoap.recommendations,
    };
  }

  return result;
}
