import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Stethoscope,
  Scissors,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  CreditCard,
  Printer,
  PenTool,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Play,
  Check,
} from 'lucide-react';
import { DentalCrown } from '../icons/DentalIcons.js';
import {
  STAGE_CATEGORY_META,
  recalculateTreatmentPlanTotals,
  map3StageKindTo4StageCategory,
  type TreatmentPlanStageCategory,
  type StageCategoryMetadata,
  type Kopecks,
  parseKopecks,
  sumKopecks,
} from '@dental/shared';
import type { TreatmentPlanStage } from './types';
import { isMicroConsumable } from './TreatmentPlanPresenterModal';
import { showToast } from '../GlobalToast';

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

export type PhasedStageStatus = 'draft' | 'agreed' | 'in_progress' | 'completed';

export interface TreatmentPlanPhased4StageViewProps {
  stages: readonly TreatmentPlanStage[];
  planTierTitle?: string | undefined;
  patientName?: string | undefined;
  planAgeDays?: number | undefined;
  planCreatedAtIso?: string | undefined;
  onExecuteStage?: ((category: TreatmentPlanStageCategory) => void) | undefined;
  onBookStageToVisit?: ((category: TreatmentPlanStageCategory, items: PhasedStageItem[]) => void) | undefined;
  onOpenStagePayment?: (() => void) | undefined;
  onOpenInstallment?: (() => void) | undefined;
  onApproveAndSign?: (() => void) | undefined;
  onPrintContract?: (() => void) | undefined;
  onToggleStage?: ((stageId?: string) => void) | undefined;
  onChangeStageStatus?: ((category: TreatmentPlanStageCategory, newStatus: PhasedStageStatus) => void) | undefined;
  className?: string | undefined;
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
  ortho_prosthetics: <DentalCrown className="w-4 h-4" />,
};

const STAGE_STATUS_BADGES: Record<
  PhasedStageStatus,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string; size?: number }> }
> = {
  completed: {
    label: 'Выполнено',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2,
  },
  in_progress: {
    label: 'В процессе',
    badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
    icon: Play,
  },
  agreed: {
    label: 'Запланировано',
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    icon: Clock,
  },
  draft: {
    label: 'Запланировано',
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
    icon: Clock,
  },
};

export const TreatmentPlanPhased4StageView: React.FC<TreatmentPlanPhased4StageViewProps> = ({
  stages,
  planTierTitle = 'Комплексный план лечения',
  patientName = 'Пациент',
  planAgeDays,
  planCreatedAtIso,
  onExecuteStage,
  onBookStageToVisit,
  onOpenStagePayment,
  onOpenInstallment,
  onApproveAndSign,
  onPrintContract,
  onToggleStage,
  onChangeStageStatus,
  className = '',
}) => {
  const effectivePlanAgeDays =
    typeof planAgeDays === 'number'
      ? planAgeDays
      : planCreatedAtIso
        ? Math.floor((Date.now() - new Date(planCreatedAtIso).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

  const [showMicroConsumables, setShowMicroConsumables] = useState(false);
  const [selectedInstallmentMonths, setSelectedInstallmentMonths] = useState<6 | 12 | 24>(12);

  const [expandedCategories, setExpandedCategories] = useState<Record<TreatmentPlanStageCategory, boolean>>({
    hygiene_sanitation: true,
    endo_therapy: true,
    surgery_implant: true,
    ortho_prosthetics: true,
  });

  // Track status for each clinical phase: defaults derived from stage data
  const [phaseStatuses, setPhaseStatuses] = useState<Record<TreatmentPlanStageCategory, PhasedStageStatus>>(() => {
    const initial: Record<TreatmentPlanStageCategory, PhasedStageStatus> = {
      hygiene_sanitation: 'agreed',
      endo_therapy: 'agreed',
      surgery_implant: 'draft',
      ortho_prosthetics: 'draft',
    };
    for (const stage of stages) {
      if (stage.stageKind === 'stage_1_therapy') {
        initial.hygiene_sanitation = stage.status || 'agreed';
        initial.endo_therapy = stage.status || 'agreed';
      } else if (stage.stageKind === 'stage_2_surgery') {
        initial.surgery_implant = stage.status || 'draft';
      } else if (stage.stageKind === 'stage_3_orthopedics') {
        initial.ortho_prosthetics = stage.status || 'draft';
      }
    }
    return initial;
  });

  const toggleCategory = (cat: TreatmentPlanStageCategory) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
    if (onToggleStage) {
      onToggleStage(cat);
    }
  };

  const handleCycleStageStatus = (cat: TreatmentPlanStageCategory, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const current = phaseStatuses[cat];
    const nextStatus: PhasedStageStatus =
      current === 'draft' || current === 'agreed'
        ? 'in_progress'
        : current === 'in_progress'
          ? 'completed'
          : 'agreed';

    setPhaseStatuses((prev) => ({ ...prev, [cat]: nextStatus }));
    onChangeStageStatus?.(cat, nextStatus);

    const statusNames: Record<PhasedStageStatus, string> = {
      completed: 'Выполнено',
      in_progress: 'В процессе',
      agreed: 'Запланировано',
      draft: 'Запланировано',
    };
    showToast(`Статус этапа изменён: «${statusNames[nextStatus]}»`, 'success', 2500);
  };

  const handleApproveStageClick = (cat: TreatmentPlanStageCategory, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPhaseStatuses((prev) => ({ ...prev, [cat]: 'agreed' }));
    onChangeStageStatus?.(cat, 'agreed');
    showToast('Этап успешно согласован с пациентом', 'success', 3000);
  };

  // Group raw items from stages into the 4 statutory clinical phases
  const categorizedData = useMemo(() => {
    const allItems = stages.flatMap((s) => s.items || []);

    const groups: Record<TreatmentPlanStageCategory, PhasedStageItem[]> = {
      hygiene_sanitation: [],
      endo_therapy: [],
      surgery_implant: [],
      ortho_prosthetics: [],
    };

    for (const it of allItems) {
      const targetCat: TreatmentPlanStageCategory = map3StageKindTo4StageCategory(
        it.stageKind || String(it.phase ?? ''),
        it.code804n,
        it.name,
        it.category,
      );

      const qty = it.quantity || 1;
      const unitPriceKop = parseKopecks(it.unitPriceRub || 0);
      const discountKop = parseKopecks(it.discountRub || 0);
      const lineTotalKop = Math.max(0, unitPriceKop * qty - discountKop) as Kopecks;
      const unitPrice = Math.round(unitPriceKop / 100);
      const discount = Math.round(discountKop / 100);
      const total = Math.round(lineTotalKop / 100);

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

    const stagesKopInput = CATEGORY_ORDER.map((cat, idx) => {
      const items = groups[cat];
      const stageItemsKop = items.map((it) => ({
        id: it.id,
        code804n: it.code804n,
        nameRu: it.name,
        toothNumber: it.toothNumber || null,
        quantity: it.quantity,
        unitPriceKopecks: parseKopecks(it.unitPriceRub),
        discountKopecks: parseKopecks(it.discountRub || 0),
        totalPriceKopecks: parseKopecks(it.totalPriceRub),
        status: 'pending' as const,
      }));

      const subtotalKop = sumKopecks(stageItemsKop.map((x) => x.totalPriceKopecks));

      return {
        id: `stage-${idx + 1}`,
        planId: 'plan-active',
        stageNumber: idx + 1,
        category: cat,
        titleRu: STAGE_CATEGORY_META[cat].defaultTitleRu,
        items: stageItemsKop,
        subtotalKopecks: subtotalKop,
        discountKopecks: 0 as Kopecks,
        totalPriceKopecks: subtotalKop,
        allocatedPaymentKopecks: subtotalKop,
        paidAmountKopecks: 0 as Kopecks,
      };
    });

    const pennySummary = recalculateTreatmentPlanTotals(stagesKopInput);

    return {
      groups,
      pennySummary,
      totalItemsCount: allItems.length,
    };
  }, [stages]);

  const grandTotalRub = Math.round((categorizedData.pennySummary?.grandTotalKopecks || 0) / 100);
  const monthlyPaymentRub = Math.round((grandTotalRub || 0) / selectedInstallmentMonths);

  return (
    <div
      className={`treatment-plan-phased-view flex flex-col gap-4 text-[var(--ink)] pb-48 sm:pb-36 ${className}`.trim()}
      style={{ scrollPaddingBottom: '220px' }}
      data-testid="treatment-plan-phased-4stage-view"
    >
      {/* Overview Banner */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-purple-500/10 border border-[var(--border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-[var(--teal)] text-white shadow-xs whitespace-nowrap">
              4 клинических этапа
            </span>
            <span className="font-bold text-sm sm:text-base text-[var(--ink)] break-words">
              {planTierTitle}
            </span>
            {effectivePlanAgeDays > 30 && (
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/30 whitespace-nowrap inline-flex items-center gap-1 shadow-2xs"
                title="План составлен более 30 дней назад, цены могут быть скорректированы. Создание нарядов ЗТЛ, оказание услуг и оплата не блокируются (согласовано врачом)."
                data-testid="phased-expired-unblocked-badge"
              >
                <Clock size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                План составлен более 30 дней назад, цены могут быть скорректированы
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted)] mt-1 m-0 break-words">
            Последовательный клинический протокол DENTE: 1. Неотложная помощь / гигиена → 2. Терапия → 3. Хирургия/Имплантация → 4. Ортопедия.
          </p>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <div className="text-xs text-[var(--muted)] font-medium">Полная стоимость плана:</div>
          <div className="text-2xl sm:text-3xl font-black text-[var(--teal)] font-mono whitespace-nowrap tracking-tight">
            {(grandTotalRub || 0).toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-[11px] text-[var(--muted)] font-semibold mt-0.5">
            Рассрочка 0-0-12: <strong className="font-mono text-[var(--ink)]">{Math.round(grandTotalRub / 12).toLocaleString('ru-RU')} ₽/мес</strong>
          </div>
        </div>
      </div>

      {/* Honest Empty State Banner if no procedures in plan */}
      {categorizedData.totalItemsCount === 0 && (
        <div className="p-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--paper-soft)] text-center text-xs text-[var(--muted)] space-y-2">
          <ShieldCheck className="w-10 h-10 mx-auto text-[var(--muted)] opacity-50" />
          <div className="font-bold text-sm text-[var(--ink)]">
            В плане лечения пока нет назначенных медицинских процедур
          </div>
          <p className="max-w-md mx-auto m-0 text-xs text-[var(--muted)]">
            Добавьте услуги из прейскуранта клиники или отметьте зубы на зубной формуле для формирования сметы по 4 клиническим этапам.
          </p>
        </div>
      )}

      {/* 4 Phased Stage Cards with Clear Statuses & Human Language */}
      <div className="flex flex-col gap-3">
        {CATEGORY_ORDER.map((cat, idx) => {
          const meta: StageCategoryMetadata = STAGE_CATEGORY_META[cat];
          const items = categorizedData.groups[cat];
          const isExpanded = expandedCategories[cat];
          const stageTotalKopecks = sumKopecks(items.map((x) => parseKopecks(x.totalPriceRub || 0)));
          const stageTotalRub = Math.round(stageTotalKopecks / 100);
          const percentOfPlan = grandTotalRub > 0 ? Math.round((stageTotalRub / grandTotalRub) * 100) : 0;

          const currentStatus: PhasedStageStatus = phaseStatuses[cat] || 'agreed';
          const statusConfig = STAGE_STATUS_BADGES[currentStatus] || STAGE_STATUS_BADGES.agreed;
          const StatusIcon = statusConfig.icon;

          // Clear Human Clinical Title per Stage
          const stageTitle =
            cat === 'hygiene_sanitation'
              ? (items.some((it) => {
                  const n = (it.name || '').toLowerCase();
                  const c = (it.code804n || '').toLowerCase();
                  return n.includes('неотложн') || n.includes('боль') || n.includes('дренирован') || c.includes('007') || c.includes('011') || c.includes('016');
                })
                ? 'Неотложная помощь и купирование боли / Санация'
                : '1. Неотложная помощь / гигиена')
              : cat === 'endo_therapy'
                ? '2. Терапия'
                : cat === 'surgery_implant'
                  ? '3. Хирургия/Имплантация'
                  : '4. Ортопедия';

          const stageSubtitle =
            cat === 'hygiene_sanitation'
              ? 'Купирование острой боли, устранение очагов инфекции и профессиональная гигиена полости рта.'
              : cat === 'endo_therapy'
                ? 'Терапевтическое лечение кариеса, механическая и медикаментозная обработка корневых каналов, световые реставрации.'
                : cat === 'surgery_implant'
                  ? 'Атравматичное удаление зубов/корней, костная пластика (синус-лифтинг), установка дентальных имплантатов.'
                  : 'Ортопедическая реабилитация: циркониевые коронки, керамика E.max, мостовидные протезы и виниры.';

          return (
            <div
              key={cat}
              className="rounded-2xl border border-[var(--border)] bg-[var(--paper-strong,var(--paper))] shadow-sm overflow-hidden transition-all duration-200"
              data-testid={`phased-stage-card-${cat}`}
            >
              {/* Card Header: Stage Number + Clinical Title + Status Badge + Total + Expand */}
              <div
                onClick={() => toggleCategory(cat)}
                className="flex items-center justify-between p-3.5 sm:p-4 cursor-pointer select-none hover:bg-[var(--paper-soft)] transition-colors border-b border-[var(--border)]/50 gap-2.5"
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: meta.badgeColor }}
                  >
                    {CATEGORY_ICONS[cat]}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[var(--muted)] whitespace-nowrap">
                        Этап {idx + 1}
                      </span>
                      <h4 className="font-extrabold text-sm sm:text-base text-[var(--ink)] m-0 break-words">
                        {stageTitle}
                      </h4>

                      {/* Explicit Interactive Stage Status Badge: «Выполнено» | «В процессе» | «Запланировано» */}
                      <button
                        type="button"
                        onClick={(e) => handleCycleStageStatus(cat, e)}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 cursor-pointer transition-transform hover:scale-105 active:scale-95 touch-manipulation ${statusConfig.badgeClass}`}
                        title="Нажмите для смены статуса (Запланировано → В процессе → Выполнено)"
                        data-testid={`phased-stage-status-${cat}`}
                      >
                        <StatusIcon size={12} className="shrink-0" />
                        <span>{statusConfig.label}</span>
                      </button>

                      <span className="text-[11px] text-[var(--muted)] font-medium whitespace-nowrap">
                        · {items.length} {items.length === 1 ? 'процедура' : items.length >= 2 && items.length <= 4 ? 'процедуры' : 'процедур'}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--muted)] m-0 mt-0.5 break-words max-w-xl">
                      {stageSubtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-1">
                  <div className="text-right">
                    <div className="font-mono font-extrabold text-sm sm:text-base text-[var(--ink)] whitespace-nowrap">
                      {(stageTotalRub || 0).toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="text-[10px] font-semibold text-[var(--muted)] whitespace-nowrap">
                      {percentOfPlan}% плана
                    </div>
                  </div>

                  <div className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)]">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Items Body: Flat list directly on stage surface without inner card box */}
              {isExpanded && (
                <div className="p-3 sm:p-3.5 space-y-2.5 bg-[var(--paper)] border-t border-[var(--border)]/50">
                  {items.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[var(--muted)]">
                      <span>На данном этапе нет назначенных процедур (санация не требуется).</span>
                      <div className="mt-1 text-[11px] text-[var(--muted)]">
                        Типичные манипуляции: {meta.typicalServicesRu.join(', ')}.
                      </div>
                    </div>
                  ) : (() => {
                    const displayItems = showMicroConsumables
                      ? items
                      : items.filter((it) => !isMicroConsumable(it));
                    const microCount = items.length - displayItems.length;

                    return (
                      <div className="space-y-2">
                        <div className="max-h-72 sm:max-h-80 overflow-y-auto min-h-0 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {displayItems.map((it, itemIdx) => (
                            <div
                              key={it.id || itemIdx}
                              className="py-2.5 px-1.5 flex items-center justify-between gap-3 hover:bg-[var(--paper-soft)] transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <span className="font-mono text-[11px] text-[var(--muted)] mt-0.5 shrink-0">
                                  {itemIdx + 1}.
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    {it.toothNumber && (
                                      <span className="font-bold text-xs px-2 py-0.5 rounded-lg bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal)]/30 whitespace-nowrap shadow-2xs">
                                        Зуб №{it.toothNumber}
                                      </span>
                                    )}
                                    <span className="font-semibold text-[var(--ink)] text-xs sm:text-sm leading-snug break-words">
                                      {it.name}
                                    </span>
                                    {it.code804n && (
                                      <span className="hidden sm:inline font-mono text-[10px] text-[var(--muted)] opacity-60">
                                        ({it.code804n})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0 font-mono">
                                <div className="font-bold text-xs sm:text-sm text-[var(--ink)] whitespace-nowrap">
                                  {(it.totalPriceRub || 0).toLocaleString('ru-RU')} ₽
                                </div>
                                {it.quantity > 1 && (
                                  <div className="text-[10px] text-[var(--muted)] whitespace-nowrap">
                                    {it.quantity} шт. × {(it.unitPriceRub || 0).toLocaleString('ru-RU')} ₽
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {microCount > 0 && (
                          <div className="flex items-center justify-between text-[11px] text-[var(--muted)] bg-[var(--paper-soft)] p-2 rounded-xl border border-[var(--border)]/40">
                            <span>
                              {showMicroConsumables
                                ? `Показаны микро-расходники (${microCount} поз.)`
                                : `Скрыты микро-расходники (${microCount} поз.: салфетки, валики, слюноотсосы)`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowMicroConsumables(!showMicroConsumables)}
                              className="min-h-[44px] sm:min-h-0 py-1.5 px-2.5 flex items-center font-bold text-[var(--teal)] hover:underline cursor-pointer"
                            >
                              {showMicroConsumables ? "Скрыть" : "Показать"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Stage Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[var(--border)]/50 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--muted)]">
                        Срок реализации: ~{idx === 0 ? '1-3 дня' : idx === 1 ? '1-2 нед.' : idx === 2 ? '2-3 мес.' : '3-4 нед.'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => handleApproveStageClick(cat, e)}
                        className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg font-bold text-xs bg-[var(--teal-soft)] text-[var(--teal)] hover:bg-[var(--teal)] hover:text-white border border-[var(--teal)]/30 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                        title="Согласовать данный клинический этап"
                        data-testid={`phased-approve-stage-${cat}`}
                      >
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Согласовать этап</span>
                      </button>

                      {onBookStageToVisit && (
                        <button
                          type="button"
                          onClick={() => onBookStageToVisit(cat, items)}
                          className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg font-bold text-xs bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal)] border border-[var(--border)] transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap min-w-0"
                          title="Записать пациента на прием по данному этапу (Мандат 8e)"
                          data-testid={`phased-book-stage-${cat}`}
                        >
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate min-w-0">Записать на приём</span>
                        </button>
                      )}

                      {onExecuteStage && (
                        <button
                          type="button"
                          onClick={() => onExecuteStage(cat)}
                          className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg font-bold text-xs bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] text-[var(--ink)] hover:text-[var(--teal)] border border-[var(--border)] transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap min-w-0"
                        >
                          <span className="truncate min-w-0">Приступить к этапу</span>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
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

      {/* Grand Total & Bank Installments 0-0-12 Section */}
      <div className="rounded-2xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line-subtle,#e2e8f0)] pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider font-bold text-[var(--muted,#64748b)]">
                Итоговая смета по 4 этапам лечения
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-200 border border-teal-500/30">
                Рассрочка 0% клиники и банков (Т-Банк / Сбер 0-0-12)
              </span>
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-[var(--teal)] tracking-tight mt-0.5">
              {(grandTotalRub || 0).toLocaleString('ru-RU')} ₽
            </div>
            <p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
              Точный расчет по клиническим стандартам СтАР без скрытых наценок. Доступна рассрочка 0% клиники или банков без переплат.
            </p>
          </div>

          {/* Installment Term Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] self-start sm:self-auto">
            {([6, 12, 24] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedInstallmentMonths(m)}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                  selectedInstallmentMonths === m
                    ? 'bg-[var(--teal)] text-white shadow-xs'
                    : 'text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]'
                }`}
              >
                {m === 12 ? '12 мес (0-0-12)' : `${m} мес`}
              </button>
            ))}
          </div>
        </div>

        {/* Bank Partner Cards: Т-Банк 0-0-12 & Сбер 0-0-12 */}
        {grandTotalRub > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Т-Банк 0-0-12 Card */}
            <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-950/20 flex flex-col justify-between gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                    Т
                  </span>
                  <span className="font-extrabold text-sm text-[var(--ink,#0f172a)]">
                    Т-Банк 0-0-12
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                  0% переплата
                </span>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-black text-[var(--ink,#0f172a)]">
                  {monthlyPaymentRub.toLocaleString('ru-RU')} ₽/мес
                </div>
                <div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
                  0 ₽ первый взнос · 0% ставка · Одобрение онлайн за 2 мин
                </div>
              </div>
            </div>

            {/* Сбер 0-0-12 Card */}
            <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col justify-between gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    С
                  </span>
                  <span className="font-extrabold text-sm text-[var(--ink,#0f172a)]">
                    Сбер 0-0-12
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                  По Сбер ID
                </span>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-black text-[var(--ink,#0f172a)]">
                  {monthlyPaymentRub.toLocaleString('ru-RU')} ₽/мес
                </div>
                <div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
                  Без визита в банк · 12 месяцев без первого взноса
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staged Payment Breakdown 30/40/30 */}
        {grandTotalRub > 0 && (
          <div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line-subtle,#e2e8f0)] text-xs text-[var(--muted,#64748b)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-bold text-[var(--ink,#0f172a)]">Этапы 30/40/30:</span>
            <div className="flex items-center gap-3 flex-wrap font-mono text-[11px]">
              <span>1. Терапия (30%): <strong className="text-[var(--ink,#0f172a)]">{Math.round(grandTotalRub * 0.3).toLocaleString('ru-RU')} ₽</strong></span>
              <span>2. Хирургия (40%): <strong className="text-[var(--ink,#0f172a)]">{Math.round(grandTotalRub * 0.4).toLocaleString('ru-RU')} ₽</strong></span>
              <span>3. Ортопедия (30%): <strong className="text-[var(--ink,#0f172a)]">{(grandTotalRub - Math.round(grandTotalRub * 0.3) - Math.round(grandTotalRub * 0.4)).toLocaleString('ru-RU')} ₽</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Desktop / Tablet Bottom Actions Card (>= 640px) */}
      <div className="hidden sm:flex rounded-2xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] p-4 shadow-xs items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] text-[var(--muted,#64748b)] font-medium leading-none">
            Итоговая смета:
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-mono text-2xl font-black text-[var(--teal)] whitespace-nowrap">
              {(grandTotalRub || 0).toLocaleString('ru-RU')} ₽
            </span>
            <span className="text-xs font-bold text-[var(--muted,#64748b)]">
              ({Math.round(grandTotalRub / 12).toLocaleString('ru-RU')} ₽/мес в рассрочку 0-0-12)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenInstallment && (
            <button
              type="button"
              onClick={onOpenInstallment}
              className="min-h-[40px] h-10 px-3.5 rounded-xl text-xs font-bold border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong,#ffffff)] text-[var(--ink,#0f172a)] flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs touch-manipulation"
              title="Оформить рассрочку 0% Т-Банк / Сбер"
            >
              <CreditCard size={14} className="text-[var(--teal)] shrink-0" />
              <span>Рассрочка 0% клиники</span>
            </button>
          )}

          {onOpenStagePayment && (
            <button
              type="button"
              onClick={onOpenStagePayment}
              className="min-h-[40px] h-10 px-3.5 rounded-xl text-xs font-bold border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong,#ffffff)] text-[var(--ink,#0f172a)] flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs touch-manipulation"
              title="Студия поэтапной оплаты и эскроу"
            >
              <Coins size={14} className="text-amber-500 shrink-0" />
              <span>Эскроу</span>
            </button>
          )}

          {onPrintContract && (
            <button
              type="button"
              onClick={onPrintContract}
              className="min-h-[40px] h-10 px-3.5 rounded-xl text-xs font-bold border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong,#ffffff)] text-[var(--ink,#0f172a)] flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs touch-manipulation"
              title="Печать договора и сметы"
            >
              <Printer size={14} className="shrink-0" />
              <span>Печать</span>
            </button>
          )}

          {onApproveAndSign && (
            <button
              type="button"
              onClick={onApproveAndSign}
              data-testid="phased-approve-plan-btn"
              className="min-h-[48px] h-12 px-5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 cursor-pointer touch-manipulation"
            >
              <PenTool size={16} className="shrink-0" />
              <span>Согласовать этап и подписать ИДС</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Bottom Bar in Natural Thumb Zone for Mobile (<= 640px / sm:hidden) */}
      <div
        className="sm:hidden fixed left-0 right-0 z-40 px-3.5 py-2.5 bg-[var(--paper-strong,var(--paper,#ffffff))]/95 backdrop-blur-xl border-t border-[var(--line,var(--border,#cbd5e1))] shadow-2xl flex flex-col gap-2"
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Top Summary Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] text-[var(--muted,#64748b)] font-medium leading-none">
              Итоговая смета:
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-mono text-xl font-black text-[var(--teal)] whitespace-nowrap">
                {(grandTotalRub || 0).toLocaleString('ru-RU')} ₽
              </span>
              <span className="text-[10px] font-bold text-[var(--muted,#64748b)]">
                ({Math.round(grandTotalRub / 12).toLocaleString('ru-RU')} ₽/мес)
              </span>
            </div>
          </div>

          {/* Auxiliary Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenInstallment && (
              <button
                type="button"
                onClick={onOpenInstallment}
                className="min-h-[40px] h-10 w-10 rounded-xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] flex items-center justify-center cursor-pointer shadow-2xs touch-manipulation"
                title="Оформить рассрочку 0% Т-Банк / Сбер"
              >
                <CreditCard size={15} className="text-[var(--teal)] shrink-0" />
              </button>
            )}

            {onOpenStagePayment && (
              <button
                type="button"
                onClick={onOpenStagePayment}
                className="min-h-[40px] h-10 w-10 rounded-xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] flex items-center justify-center cursor-pointer shadow-2xs touch-manipulation"
                title="Студия поэтапной оплаты и эскроу"
              >
                <Coins size={15} className="text-amber-500 shrink-0" />
              </button>
            )}

            {onPrintContract && (
              <button
                type="button"
                onClick={onPrintContract}
                className="min-h-[40px] h-10 w-10 rounded-xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] flex items-center justify-center cursor-pointer shadow-2xs touch-manipulation"
                title="Печать договора и сметы"
              >
                <Printer size={15} className="shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* Primary CTA: 52px Touch-Friendly Button in Thumb Zone */}
        {onApproveAndSign && (
          <button
            type="button"
            onClick={onApproveAndSign}
            data-testid="phased-approve-plan-btn"
            className="w-full min-h-[52px] h-[52px] px-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 cursor-pointer touch-manipulation"
          >
            <PenTool size={18} className="shrink-0" />
            <span>Согласовать этап и подписать ИДС</span>
          </button>
        )}
      </div>
    </div>
  );
};
