/**
 * DENTE Dental CRM — Sovereign Mobile Chairside EHR (Apple HIG §3.2)
 * Invariants:
 * 1. Compact 1-row Top Bar: Patient name, age, red allergy alert, back/minimize button
 * 2. Segmented Step Bar: [ 1. Жалобы | 2. Осмотр | 3. Диагноз | 4. План ]
 * 3. 1-Tap "✓ Физиологическая норма" banner at chairside
 * 4. Grouped Inset Cards for clinical fields
 * 5. Floating Bottom Bar in Natural Thumb Zone: "Далее →" or "Завершить приём и чек (54-ФЗ)"
 * 6. 0px horizontal drift, touch targets >= 44x44px.
 */

import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  FileText,
  Sparkles,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { triggerHaptic } from "../../native/mobileBridge";
import { MobileBottomSheet } from "./MobileBottomSheet";
import { MobileFloatingBottomBar } from "./MobileFloatingBottomBar";
import { MobileGroupedList, MobileGroupedListItem } from "./MobileGroupedList";
import { MobileSegmentedControl } from "./MobileSegmentedControl";
import "./mobileHigPrimitives.css";

export type EhrStep = "complaints" | "exam" | "diagnosis" | "plan";

export interface MobileChairsideEHRProps {
  patientName: string;
  patientAge?: number | null | undefined;
  allergyNotice?: string | null | undefined;
  visitReason?: string | undefined;
  toothCode?: string | undefined;
  onClose: () => void;
  onFinishVisit: (data: {
    step: EhrStep;
    complaints: string;
    objectiveExam: string;
    diagnosis: string;
    treatmentPlan: string;
  }) => void;
  testId?: string | undefined;
}

function formatAgeRu(age: number): string {
  const mod10 = age % 10;
  const mod100 = age % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${age} лет`;
  if (mod10 === 1) return `${age} год`;
  if (mod10 >= 2 && mod10 <= 4) return `${age} года`;
  return `${age} лет`;
}

export const MobileChairsideEHR: React.FC<MobileChairsideEHRProps> = ({
  patientName,
  patientAge,
  allergyNotice,
  visitReason = "Первичный осмотр",
  toothCode,
  onClose,
  onFinishVisit,
  testId = "mobile-chairside-ehr",
}) => {
  const [currentStep, setCurrentStep] = useState<EhrStep>("complaints");
  const [complaints, setComplaints] = useState<string>(visitReason);
  const [objectiveExam, setObjectiveExam] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState<string>("К02.1 Кариес дентина");
  const [treatmentPlan, setTreatmentPlan] = useState<string>(
    "Препарирование, медикаментозная обработка, пломбирование светоотверждаемым композитом"
  );
  const [isNormApplied, setIsNormApplied] = useState(false);
  const [isReceiptSheetOpen, setIsReceiptSheetOpen] = useState(false);

  // 1-Tap Normal Protocol Fill
  const handleApplyNorm = () => {
    triggerHaptic("success");
    setIsNormApplied(true);
    if (!objectiveExam.trim()) {
      setObjectiveExam(
        "Слизистая оболочка полости рта бледно-розового цвета, увлажнена, без патологических изменений. Зубные ряды интактны. Прикус ортогнатический. Лимфоузлы не увеличены, пальпация безболезненна."
      );
    }
  };

  const stepsList: Array<{ id: EhrStep; label: string }> = [
    { id: "complaints", label: "1. Жалобы" },
    { id: "exam", label: "2. Осмотр" },
    { id: "diagnosis", label: "3. Диагноз" },
    { id: "plan", label: "4. План" },
  ];

  const handleNextStep = () => {
    triggerHaptic("selection");
    if (currentStep === "complaints") setCurrentStep("exam");
    else if (currentStep === "exam") setCurrentStep("diagnosis");
    else if (currentStep === "diagnosis") setCurrentStep("plan");
    else if (currentStep === "plan") {
      setIsReceiptSheetOpen(true);
    }
  };

  const handlePrevStep = () => {
    triggerHaptic("selection");
    if (currentStep === "plan") setCurrentStep("diagnosis");
    else if (currentStep === "diagnosis") setCurrentStep("exam");
    else if (currentStep === "exam") setCurrentStep("complaints");
    else if (currentStep === "complaints") onClose();
  };

  return (
    <div className="mobile-hig-viewport" data-testid={testId}>
      {/* ─── 1. COMPACT TOP APP BAR ─── */}
      <header className="mobile-top-bar">
        <button
          type="button"
          className="mobile-top-bar-action"
          onClick={handlePrevStep}
          aria-label="Назад"
          data-testid={`${testId}-back-btn`}
        >
          <ChevronLeft size={24} />
        </button>

        <div className="min-w-0 flex-1 px-1 text-center">
          <div className="text-[16px] font-bold text-[var(--ink,#0f172a)] truncate">
            {patientName}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[12px] text-[var(--muted,#64748b)]">
            {patientAge ? <span>{formatAgeRu(patientAge)}</span> : null}
            {toothCode ? <span>{`· Зуб ${toothCode}`}</span> : null}
            {allergyNotice ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                <AlertTriangle size={10} /> {allergyNotice}
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="mobile-top-bar-action text-[var(--muted,#64748b)]"
          onClick={onClose}
          aria-label="Свернуть приём"
          data-testid={`${testId}-close-btn`}
        >
          <X size={20} />
        </button>
      </header>

      {/* ─── 2. SEGMENTED STEP PROGRESS BAR ─── */}
      <div className="px-4 py-2 bg-[var(--paper,#ffffff)] border-b border-[var(--line-subtle,#f1f5f9)] shrink-0">
        <MobileSegmentedControl<EhrStep>
          options={stepsList}
          activeId={currentStep}
          onChange={(step) => setCurrentStep(step)}
          testId={`${testId}-step-segments`}
        />
      </div>

      {/* ─── 3. CLINICAL CONTENT WORKSPACE ─── */}
      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-4 pb-4">
        {/* Chairside 1-Tap Quick Norm Banner */}
        <div className="p-3.5 rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--teal,#0d9488)]/30 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--teal,#0d9488)] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles size={17} />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-[var(--ink,#0f172a)] leading-tight">
                Автонорма
              </div>
              <div className="text-[12px] text-[var(--muted,#64748b)] leading-tight mt-0.5">
                Протокол без патологий
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleApplyNorm}
            className={`min-h-[44px] px-3.5 rounded-xl text-[13px] font-bold shrink-0 transition-all ${
              isNormApplied
                ? "bg-emerald-600 text-white"
                : "bg-[var(--teal,#0d9488)] text-white shadow-xs"
            }`}
            data-testid={`${testId}-apply-norm-btn`}
          >
            {isNormApplied ? "✓ Внесено" : "✓ Заполнить нормой"}
          </button>
        </div>

        {/* Step 1: Жалобы и Анамнез */}
        {currentStep === "complaints" && (
          <MobileGroupedList label="Жалобы и повод обращения">
            <div className="p-3 bg-[var(--paper,#ffffff)]">
              <textarea
                value={complaints}
                onChange={(e) => setComplaints(e.target.value)}
                placeholder="Опишите жалобы пациента (боли, эстетика, дискомфорт)..."
                className="w-full min-h-[120px] p-3 text-[15px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] focus:outline-none focus:border-[var(--teal,#0d9488)] resize-none"
                data-testid={`${testId}-complaints-input`}
              />
            </div>
            <MobileGroupedListItem
              title="Повод: Острая боль"
              subtitle="Быстрый шаблон жалоб на температурные раздражители"
              icon={<Clock size={16} />}
              onClick={() => {
                setComplaints("Жалобы на кратковременные ноющие боли от холодного и сладкого.");
              }}
            />
          </MobileGroupedList>
        )}

        {/* Step 2: Объективный осмотр */}
        {currentStep === "exam" && (
          <MobileGroupedList label="Объективный клинический статус">
            <div className="p-3 bg-[var(--paper,#ffffff)]">
              <textarea
                value={objectiveExam}
                onChange={(e) => setObjectiveExam(e.target.value)}
                placeholder="Опишите состояние слизистой, зубных рядов, зондирование, перкуссию..."
                className="w-full min-h-[140px] p-3 text-[15px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] focus:outline-none focus:border-[var(--teal,#0d9488)] resize-none"
                data-testid={`${testId}-exam-input`}
              />
            </div>
            <MobileGroupedListItem
              title="Перкуссия безболезненна"
              subtitle="Зондирование кариозной полости по эмалево-дентинной границе"
              icon={<Stethoscope size={16} />}
              onClick={() => {
                setObjectiveExam((prev) =>
                  prev ? `${prev} Перкуссия безболезненна.` : "Перкуссия безболезненна."
                );
              }}
            />
          </MobileGroupedList>
        )}

        {/* Step 3: Диагноз (МКБ-10) */}
        {currentStep === "diagnosis" && (
          <MobileGroupedList label="Клинический диагноз (МКБ-10)">
            <div className="p-3 bg-[var(--paper,#ffffff)] space-y-2">
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full min-h-[44px] px-3.5 text-[15px] font-semibold rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] focus:outline-none focus:border-[var(--teal,#0d9488)]"
                data-testid={`${testId}-diagnosis-input`}
              />
            </div>
            <MobileGroupedListItem
              title="К02.1 Кариес дентина"
              subtitle="МКБ-10 стоматологический стандарт"
              icon={<FileText size={16} />}
              onClick={() => setDiagnosis("К02.1 Кариес дентина")}
            />
            <MobileGroupedListItem
              title="К04.0 Пульпит"
              subtitle="Острый очаговый пульпит"
              icon={<FileText size={16} />}
              onClick={() => setDiagnosis("К04.0 Острый пульпит")}
            />
          </MobileGroupedList>
        )}

        {/* Step 4: План лечения и манипуляции */}
        {currentStep === "plan" && (
          <MobileGroupedList label="Выполненные манипуляции и план">
            <div className="p-3 bg-[var(--paper,#ffffff)]">
              <textarea
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                className="w-full min-h-[120px] p-3 text-[15px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] focus:outline-none focus:border-[var(--teal,#0d9488)] resize-none"
                data-testid={`${testId}-plan-input`}
              />
            </div>
            <MobileGroupedListItem
              title="Анестезия Артикаин 1:100 000"
              subtitle="Инфильтрационная анестезия 1.7 мл"
              icon={<CheckCircle2 size={16} />}
              onClick={() => {
                setTreatmentPlan((prev) =>
                  prev ? `${prev} + Анестезия Артикаин 1:100000 1.7мл` : "Анестезия Артикаин"
                );
              }}
            />
          </MobileGroupedList>
        )}
      </main>

      {/* ─── 4. NATURAL THUMB ZONE FLOATING BOTTOM BAR ─── */}
      <MobileFloatingBottomBar
        primaryLabel={
          currentStep === "plan" ? "Завершить приём и чек (54-ФЗ)" : "Далее к следующему этапу"
        }
        primaryIcon={currentStep === "plan" ? <CreditCard size={18} /> : <ArrowRight size={18} />}
        onPrimaryClick={handleNextStep}
        testId={`${testId}-bottom-bar`}
      />

      {/* ─── 5. NATIVE BOTTOM SHEET: ЧЕКАУТ И 54-ФЗ ─── */}
      <MobileBottomSheet
        isOpen={isReceiptSheetOpen}
        onClose={() => setIsReceiptSheetOpen(false)}
        title="Завершение приёма и чек"
        subtitle={`Пациент: ${patientName}`}
        testId={`${testId}-checkout-sheet`}
        footer={
          <button
            type="button"
            className="mobile-primary-cta"
            onClick={() => {
              triggerHaptic("success");
              setIsReceiptSheetOpen(false);
              onFinishVisit({
                step: currentStep,
                complaints,
                objectiveExam,
                diagnosis,
                treatmentPlan,
              });
            }}
            data-testid={`${testId}-confirm-checkout-btn`}
          >
            <CheckCircle2 size={18} />
            <span>Фискализировать и закрыть приём</span>
          </button>
        }
      >
        <div className="space-y-4 py-2">
          <div className="text-center py-4 bg-[var(--paper-soft,#f8fafc)] rounded-2xl border border-[var(--line,#e2e8f0)]">
            <div className="text-xs font-semibold text-[var(--muted,#64748b)] uppercase tracking-wider">
              К оплате по приёму
            </div>
            <div className="text-3xl font-extrabold text-[var(--ink,#0f172a)] font-mono mt-1">
              4 500 ₽
            </div>
          </div>

          <MobileGroupedList label="Способ оплаты">
            <MobileGroupedListItem
              title="СБП (QR-код)"
              subtitle="Комиссия 0.4%, мгновенно на счет клиники"
              icon={<Sparkles size={16} />}
              onClick={() => {}}
            />
            <MobileGroupedListItem
              title="Банковская карта (POS-терминал)"
              subtitle="Эквайринг по терминалу у кресла"
              icon={<CreditCard size={16} />}
              onClick={() => {}}
            />
          </MobileGroupedList>
        </div>
      </MobileBottomSheet>
    </div>
  );
};
