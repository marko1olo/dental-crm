import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Stethoscope,
  Scissors,
  Crown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  STAGE_CATEGORY_META,
  recalculateTreatmentPlanTotals,
  type TreatmentPlanStageCategory,
  type StageCategoryMetadata,
  type StagedTreatmentPlan,
} from '@dental/shared';
import type { TreatmentPlanStage, TreatmentPlanTierId } from './types';

export interface PhasedStageItem {
  id: string;
  code804n: string;
  name: string;
  toothNumber?: number | null;
  quantity: number;
  unitPriceRub: number;
  discountRub?: number;
  totalPriceRub: number;
  phaseCategory: TreatmentPlanStageCategory;
  isCompleted?: boolean;
}

export interface TreatmentPlanPhased4StageViewProps {
  stages: readonly TreatmentPlanStage[];
  planTierTitle?: string;
  patientName?: string;
  onExecuteStage?: (category: TreatmentPlanStageCategory) => void;
  onOpenStagePayment?: () => void;
  onOpenInstallment?: () => void;
  className?: string;
}

const CATEGORY_ORDER: readonly TreatmentPlanStageCategory[] = [
  'hygiene_sanitation',
  'endo_therapy',
  'surgery_implant',
  'ortho_prosthetics',
];

const CATEGORY_ICONS: Record<TreatmentPlanStageCategory, React.ReactNode> = {
  hygiene_sanitation: <ShieldCheck className="w-4 h-4" />,
  endo_therapy: <Stethoscope className="w-4 h-4" />,
  surgery_implant: <Scissors className="w-4 h-4" />,
  ortho_prosthetics: <Crown className="w-4 h-4" />,
};

export const TreatmentPlanPhased4StageView: React.FC<TreatmentPlanPhased4StageViewProps> = ({
  stages,
  planTierTitle = 'Комплексный план лечения',
  patientName = 'Пациент',
  onExecuteStage,
  onOpenStagePayment,
  onOpenInstallment,
  className = '',
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<TreatmentPlanStageCategory, boolean>>({
    hygiene_sanitation: true,
    endo_therapy: true,
    surgery_implant: true,
    ortho_prosthetics: true,
  });

  const toggleCategory = (cat: TreatmentPlanStageCategory) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Group raw items from stages into the 4 statutory clinical phases
  const categorizedData = useMemo(() => {
    const allItems = stages.flatMap((s) => s.items || []);
    
    // Map items to categories
    const groups: Record<TreatmentPlanStageCategory, PhasedStageItem[]> = {
      hygiene_sanitation: [],
      endo_therapy: [],
      surgery_implant: [],
      ortho_prosthetics: [],
    };

    for (const it of allItems) {
      const name = (it.name || '').toLowerCase();
      const code = (it.code804n || '').toLowerCase();
      const phase = String(it.phase ?? '').toLowerCase();

      let targetCat: TreatmentPlanStageCategory = 'endo_therapy';

      if (
        phase.includes('hygiene') ||
        phase.includes('sanitation') ||
        code.includes('051') ||
        code.includes('050') ||
        name.includes('гигиен') ||
        name.includes('чистк') ||
        name.includes('air-flow') ||
        name.includes('ультразвук') ||
        name.includes('пародонт') ||
        name.includes('отложени')
      ) {
        targetCat = 'hygiene_sanitation';
      } else if (
        phase.includes('surgery') ||
        phase.includes('implant') ||
        code.includes('001') && name.includes('удален') ||
        code.includes('054') ||
        code.includes('041') ||
        name.includes('удален') ||
        name.includes('имплант') ||
        name.includes('синус') ||
        name.includes('костн') ||
        name.includes('пластик')
      ) {
        targetCat = 'surgery_implant';
      } else if (
        phase.includes('ortho') ||
        phase.includes('prosthet') ||
        code.includes('004') ||
        code.includes('006') ||
        name.includes('коронк') ||
        name.includes('протез') ||
        name.includes('винир') ||
        name.includes('e.max') ||
        name.includes('циркон') ||
        name.includes('брекет') ||
        name.includes('элайнер')
      ) {
        targetCat = 'ortho_prosthetics';
      } else {
        targetCat = 'endo_therapy';
      }

      const qty = it.quantity || 1;
      const unitPrice = it.unitPriceRub || 0;
      const discount = it.discountRub || 0;
      const total = Math.max(0, unitPrice * qty - discount);

      groups[targetCat].push({
        id: it.id,
        code804n: it.code804n || 'A16.07',
        name: it.name,
        toothNumber: it.toothNumber ?? null,
        quantity: qty,
        unitPriceRub: unitPrice,
        discountRub: discount,
        totalPriceRub: total,
        phaseCategory: targetCat,
      });
    }

    // Convert items into kopeck representation for penny-exact summary
    const stagesKopInput = CATEGORY_ORDER.map((cat, idx) => {
      const items = groups[cat];
      const stageItemsKop = items.map((it) => ({
        id: it.id,
        code804n: it.code804n,
        nameRu: it.name,
        toothNumber: it.toothNumber || null,
        quantity: it.quantity,
        unitPriceKopecks: Math.round(it.unitPriceRub * 100),
        discountKopecks: Math.round((it.discountRub || 0) * 100),
        totalPriceKopecks: Math.round(it.totalPriceRub * 100),
        status: 'pending' as const,
      }));

      const subtotalKop = stageItemsKop.reduce((acc, x) => acc + x.totalPriceKopecks, 0);

      return {
        id: `stage-${idx + 1}`,
        planId: 'plan-active',
        stageNumber: idx + 1,
        category: cat,
        titleRu: STAGE_CATEGORY_META[cat].defaultTitleRu,
        items: stageItemsKop,
        subtotalKopecks: subtotalKop,
        discountKopecks: 0,
        totalPriceKopecks: subtotalKop,
        allocatedPaymentKopecks: subtotalKop,
        paidAmountKopecks: 0,
      };
    });

    const pennySummary = recalculateTreatmentPlanTotals(stagesKopInput);

    return {
      groups,
      pennySummary,
    };
  }, [stages]);

  const grandTotalRub = categorizedData.pennySummary.grandTotalKopecks / 100;

  return (
    <div
      className={`treatment-plan-phased-view flex flex-col gap-4 text-[var(--ink,#0f172a)] ${className}`.trim()}
      data-testid="treatment-plan-phased-4stage-view"
    >
      {/* Overview Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-purple-500/10 border border-[var(--border,#cbd5e1)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-[var(--teal,#0d9488)] text-white shadow-xs">
              4 Клинических этапа
            </span>
            <span className="font-bold text-sm sm:text-base text-[var(--ink,#0f172a)]">
              {planTierTitle}
            </span>
          </div>
          <p className="text-xs text-[var(--muted,#64748b)] mt-1 m-0">
            Последовательный клинический протокол DENTE & Минздрава РФ с точной финансовой разбивкой по этапам.
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xs text-[var(--muted,#64748b)]">Полная стоимость плана:</div>
          <div className="text-xl sm:text-2xl font-black text-[var(--teal,#0d9488)] font-mono">
            {grandTotalRub.toLocaleString('ru-RU')} ₽
          </div>
        </div>
      </div>

      {/* 4 Phased Stage Cards */}
      <div className="flex flex-col gap-3">
        {CATEGORY_ORDER.map((cat, idx) => {
          const meta: StageCategoryMetadata = STAGE_CATEGORY_META[cat];
          const items = categorizedData.groups[cat];
          const isExpanded = expandedCategories[cat];
          const stageTotalRub = items.reduce((acc, x) => acc + x.totalPriceRub, 0);
          const percentOfPlan = grandTotalRub > 0 ? Math.round((stageTotalRub / grandTotalRub) * 100) : 0;

          return (
            <div
              key={cat}
              className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] shadow-sm overflow-hidden transition-all duration-200"
              data-testid={`phased-stage-card-${cat}`}
            >
              {/* Header */}
              <div
                onClick={() => toggleCategory(cat)}
                className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-[var(--paper-soft,#f8fafc)] transition-colors border-b border-[var(--border,#cbd5e1)]/50"
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: meta.badgeColor }}
                  >
                    {CATEGORY_ICONS[cat]}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--muted,#64748b)]">
                        Этап {idx + 1}
                      </span>
                      <h4 className="font-extrabold text-sm sm:text-base text-[var(--ink,#0f172a)] m-0 truncate">
                        {meta.shortLabelRu}
                      </h4>
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: meta.badgeColor }}
                      >
                        {items.length} {items.length === 1 ? 'услуга' : items.length >= 2 && items.length <= 4 ? 'услуги' : 'услуг'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5 truncate max-w-xl">
                      {meta.descriptionRu}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <div className="text-right">
                    <div className="font-mono font-extrabold text-sm sm:text-base text-[var(--ink,#0f172a)]">
                      {stageTotalRub.toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="text-[10px] font-semibold text-[var(--muted,#64748b)]">
                      {percentOfPlan}% от общего плана
                    </div>
                  </div>

                  <div className="p-1 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Items Body */}
              {isExpanded && (
                <div className="p-4 space-y-3 bg-[var(--paper,#ffffff)]">
                  {items.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-dashed border-[var(--border,#cbd5e1)] text-center text-xs text-[var(--muted,#64748b)]">
                      <span>На данном этапе нет назначенных процедур (санация не требуется).</span>
                      <div className="mt-1 text-[11px] text-[var(--muted,#64748b)]">
                        Типичные услуги этапа: {meta.typicalServicesRu.join(', ')}.
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--line,#e2e8f0)] border border-[var(--border,#cbd5e1)] rounded-xl overflow-hidden text-xs">
                      {items.map((it, itemIdx) => (
                        <div
                          key={it.id || itemIdx}
                          className="p-3 flex items-center justify-between gap-3 hover:bg-[var(--paper-soft,#f8fafc)] transition-colors"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="font-mono text-[10px] text-[var(--muted,#64748b)] mt-0.5">
                              {itemIdx + 1}.
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)]">
                                  {it.code804n}
                                </span>
                                {it.toothNumber && (
                                  <span className="font-bold text-[11px] px-1.5 py-0.5 rounded bg-[var(--teal-soft,#ccfbf1)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30">
                                    Зуб №{it.toothNumber}
                                  </span>
                                )}
                                <span className="font-semibold text-[var(--ink,#0f172a)] text-xs">
                                  {it.name}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono">
                            <div className="font-bold text-xs sm:text-sm text-[var(--ink,#0f172a)]">
                              {it.totalPriceRub.toLocaleString('ru-RU')} ₽
                            </div>
                            {it.quantity > 1 && (
                              <div className="text-[10px] text-[var(--muted,#64748b)]">
                                {it.quantity} шт. &times; {it.unitPriceRub.toLocaleString('ru-RU')} ₽
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stage Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border,#cbd5e1)] text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--muted,#64748b)]">
                        Срок реализации: ~{idx === 0 ? '1-3 дня' : idx === 1 ? '1-2 нед.' : idx === 2 ? '2-3 мес.' : '3-4 нед.'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onExecuteStage && items.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onExecuteStage(cat)}
                          className="px-3 py-1.5 rounded-lg font-bold text-xs bg-[var(--teal-soft,#ccfbf1)] text-[var(--teal,#0d9488)] hover:bg-[var(--teal,#0d9488)] hover:text-white border border-[var(--teal,#0d9488)]/30 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Приступить к этапу</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
