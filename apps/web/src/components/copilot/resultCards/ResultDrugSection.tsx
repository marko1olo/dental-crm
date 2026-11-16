import React from 'react';
import type { DrugInteractionItem } from '../copilotTypes';
import { CopilotDrugInteractionCard } from '../CopilotDrugInteractionCard';

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

  return (
    <CopilotDrugInteractionCard
      interactions={interactions}
      patientAllergies={patientAllergies}
      safeAlternatives={safeAlternatives}
    />
  );
}
