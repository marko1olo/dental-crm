import React from 'react';
import type { EstimateTierData, EstimateTierOption } from '../cards/types';
import { EstimateTierCard } from '../cards/EstimateTierCard';
import { parseTierOption } from './estimateTierParser';

type Obj = Record<string, unknown>;

export function renderEstimateSection(tool: string, obj: Obj, result: unknown): React.ReactNode | null {
  const isEstimate =
    tool.includes('estimate') ||
    tool.includes('tier') ||
    tool.includes('treatment_plan') ||
    tool.includes('suggest_treatment_plan') ||
    tool.includes('calculate_treatment_estimate') ||
    obj.tiers !== undefined ||
    Array.isArray(obj.pricing_tiers) ||
    obj.estimate !== undefined;

  if (!isEstimate) return null;

  let rawTiers: EstimateTierOption[] | undefined;
  if (Array.isArray(obj.tiers)) {
    rawTiers = obj.tiers as unknown as EstimateTierOption[];
  } else if (obj.tiers && typeof obj.tiers === 'object') {
    rawTiers = Object.values(obj.tiers).map(parseTierOption);
  } else if (Array.isArray(obj.pricing_tiers)) {
    rawTiers = obj.pricing_tiers as unknown as EstimateTierOption[];
  } else if (Array.isArray(result) && result.length > 0 && ('tierKey' in (result[0] as Obj) || 'tierName' in (result[0] as Obj))) {
    rawTiers = result as unknown as EstimateTierOption[];
  }

  if (rawTiers || obj.items) {
    const estimateData: EstimateTierData = {
      patientId: typeof obj.patientId === 'string' ? obj.patientId : undefined,
      patientName: typeof obj.patientName === 'string' ? obj.patientName : typeof obj.patientFullName === 'string' ? obj.patientFullName : undefined,
      discountPercent: typeof obj.discountPercent === 'number' ? obj.discountPercent : undefined,
      teeth: Array.isArray(obj.teeth) ? (obj.teeth as (string | number)[]) : undefined,
      tiers: rawTiers || [],
    };
    return <EstimateTierCard data={estimateData} />;
  }

  return null;
}
