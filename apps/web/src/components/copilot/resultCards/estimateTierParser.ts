import type { EstimateTierOption, EstimateStageBreakdown } from '../cards/types';

export function parseTierOption(rawT: unknown): EstimateTierOption {
  const t = (rawT && typeof rawT === 'object' ? rawT : {}) as Record<string, unknown>;
  const total = typeof t.totalRub === 'number'
    ? t.totalRub
    : typeof t.totalCostRub === 'number'
    ? t.totalCostRub
    : typeof t.totalCostKopecks === 'number'
    ? Math.round(t.totalCostKopecks / 100)
    : 0;
  const taxDed = typeof t.taxDeductionRub === 'number'
    ? t.taxDeductionRub
    : typeof t.taxDeduction13Rub === 'number'
    ? t.taxDeduction13Rub
    : Math.round(total * 0.13);
  const netCost = typeof t.netCostAfterDeductionRub === 'number'
    ? t.netCostAfterDeductionRub
    : Math.max(0, total - taxDed);
  const installmentsObj = t.monthlyInstallments as Record<string, number> | undefined;
  const installmentObj = t.installment as { monthlyPaymentKopecks?: number; months?: number } | undefined;
  const monthlyInst = typeof t.monthlyInstallmentRub === 'number'
    ? t.monthlyInstallmentRub
    : typeof installmentsObj?.months12Rub === 'number'
    ? installmentsObj.months12Rub
    : typeof installmentObj?.monthlyPaymentKopecks === 'number'
    ? Math.round(installmentObj.monthlyPaymentKopecks / 100)
    : Math.round(total / 12);

  const rawStages = Array.isArray(t.stages) ? (t.stages as Record<string, unknown>[]) : undefined;
  const stagesList: EstimateStageBreakdown[] | undefined = rawStages
    ? rawStages.map((st) => ({
        stageName: String(st.stageName || st.stageNameRu || st.titleRu || 'Этап лечения'),
        proceduresCount: typeof st.proceduresCount === 'number'
          ? st.proceduresCount
          : typeof st.itemCount === 'number'
          ? st.itemCount
          : Array.isArray(st.items)
          ? st.items.length
          : 1,
        totalRub: typeof st.totalRub === 'number'
          ? st.totalRub
          : typeof st.stageCostRub === 'number'
          ? st.stageCostRub
          : typeof st.stageCostKopecks === 'number'
          ? Math.round(st.stageCostKopecks / 100)
          : 0,
      }))
    : undefined;

  const rawKey = String(t.tierKey || 'optimum').toLowerCase();
  const tierKey: 'economy' | 'optimum' | 'premium' =
    rawKey === 'economy' || rawKey === 'optimum' || rawKey === 'premium' ? rawKey : 'optimum';

  return {
    tierKey,
    tierName: String(
      t.tierName ||
        t.tierNameRu ||
        (tierKey === 'economy' ? 'Тариф «Эконом»' : tierKey === 'premium' ? 'Тариф «Премиум»' : 'Тариф «Оптимум»')
    ),
    badge: String(
      t.badge ||
        t.badgeRu ||
        (tierKey === 'optimum' ? '★ Рекомендуемый (Выбор врачей)' : tierKey === 'premium' ? 'VIP' : 'Базовый')
    ),
    totalRub: total,
    taxDeductionRub: taxDed,
    netCostAfterDeductionRub: netCost,
    monthlyInstallmentRub: monthlyInst,
    installmentMonths: typeof t.installmentMonths === 'number'
      ? t.installmentMonths
      : typeof installmentObj?.months === 'number'
      ? installmentObj.months
      : 12,
    warrantyDescription: String(
      t.warrantyDescription ||
        t.warrantyRu ||
        (tierKey === 'premium' ? 'Пожизненная гарантия' : tierKey === 'optimum' ? '2 года расширенной гарантии' : '1 год официальной гарантии')
    ),
    materialsDescription: String(t.materialsDescription || t.materialsDescriptionRu || ''),
    keyAdvantages: Array.isArray(t.keyAdvantages)
      ? (t.keyAdvantages as string[])
      : Array.isArray(t.keyAdvantagesRu)
      ? (t.keyAdvantagesRu as string[])
      : [],
    stages: stagesList,
  };
}
