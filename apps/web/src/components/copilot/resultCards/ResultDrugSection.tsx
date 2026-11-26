import React from 'react';
import type { DdiSafetyAlertData, DrugInteractionItem } from '../copilotTypes';
import { CopilotDdiSafetyCard } from '../cards/CopilotDdiSafetyCard';

type Obj = Record<string, unknown>;

export function renderDrugSection(tool: string, obj: Obj, result: unknown): React.ReactNode | null {
  const isDrug =
    tool.includes('drug') ||
    tool.includes('interaction') ||
    tool.includes('allergy') ||
    tool.includes('ddi') ||
    obj.ddiAlert !== undefined ||
    obj.alertType === 'ddi_allergy' ||
    Array.isArray(obj.interactions) ||
    Array.isArray(obj.contraindications) ||
    typeof obj.medical_advice === 'string';

  if (!isDrug) return null;

  const interactions: DrugInteractionItem[] = Array.isArray(obj.interactions)
    ? (obj.interactions as DrugInteractionItem[])
    : Array.isArray(obj.contraindications)
    ? (obj.contraindications as DrugInteractionItem[])
    : Array.isArray(result) && result.length > 0 && ('severity' in (result[0] as Obj) || 'description' in (result[0] as Obj))
    ? (result as DrugInteractionItem[])
    : typeof obj.medical_advice === 'string'
    ? [
        {
          severity: String(obj.severity || 'warning'),
          title: String(obj.title || 'Клиническое предупреждение'),
          description: String(obj.description || obj.message || 'Обнаружен фармакологический риск'),
          medical_advice: String(obj.medical_advice),
          drugs: Array.isArray(obj.drugs) ? (obj.drugs as string[]) : undefined,
        },
      ]
    : [];

  const patientAllergies = Array.isArray(obj.patient_allergies)
    ? (obj.patient_allergies as string[])
    : Array.isArray(obj.allergies)
    ? (obj.allergies as string[])
    : undefined;

  const safeAlternatives = Array.isArray(obj.safe_alternatives)
    ? (obj.safe_alternatives as string[])
    : Array.isArray(obj.alternatives)
    ? (obj.alternatives as string[])
    : undefined;

  const safeAllergies = Array.isArray(patientAllergies) ? patientAllergies : [];
  const hasInteractions = interactions.length > 0;
  const hasAllergies = safeAllergies.length > 0;
  const hasDdiAlert = Boolean(obj.ddiAlert);

  // 0px visual noise invariant (Mandate 8ba / 8y):
  // When there are no allergies, no drug interactions, and no critical contraindications,
  // return null — absolutely 0px noise for 99% normal state!
  if (!hasInteractions && !hasAllergies && !hasDdiAlert) {
    return null;
  }

  if (obj.ddiAlert && typeof obj.ddiAlert === 'object') {
    return <CopilotDdiSafetyCard data={obj.ddiAlert as DdiSafetyAlertData} />;
  }

  const first = interactions[0];
  const severity = first?.severity || (hasAllergies ? 'warning' : 'info');
  const title =
    first?.title ||
    (hasAllergies
      ? 'Аллергологический статус / Анамнез'
      : 'Сведения о лекарственной совместимости');
  const description =
    interactions.map((i) => i.description).filter(Boolean).join('. ') ||
    (hasAllergies
      ? `В анамнезе пациента зафиксированы аллергии: ${safeAllergies.join(', ')}`
      : 'Клинические рекомендации по лекарственной безопасности');
  const clinicalRecommendation = first?.clinical_recommendation || first?.medical_advice;
  const contraindicatedDrug = first?.medicationA || first?.drugs?.[0];

  const ddiData: DdiSafetyAlertData = {
    severity,
    title,
    description,
    ...(patientAllergies && patientAllergies.length > 0 ? { patientAllergies } : {}),
    safeAlternatives: safeAlternatives ?? [],
    ...(safeAlternatives && safeAlternatives.length > 0 ? { recommendedAlternative: safeAlternatives[0] } : {}),
    ...(clinicalRecommendation ? { clinicalRecommendation } : {}),
    ...(contraindicatedDrug ? { contraindicatedDrug } : {}),
  };

  return <CopilotDdiSafetyCard data={ddiData} />;
}
