/**
 * apps/web/src/components/visit/mobileChairside/ChairsideProtocolsSection.tsx
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Layer 2: Clinical Protocols & Steps)
 */

import React, { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Stethoscope,
  Trash2,
  Zap,
} from "lucide-react";
import { triggerHaptic } from "../../../native/mobileBridge";
import { MobileBottomSheet } from "../../mobile/MobileBottomSheet";
import { VisitPlanStageHandoffBanner } from "../VisitPlanStageHandoffBanner";
import { ChairsideTeethQuickSelector } from "./ChairsideTeethQuickSelector";
import {
  COMMON_DENTAL_DIAGNOSES,
  PAYMENT_METHOD_OPTIONS,
  QUICK_CHAIRSIDE_SERVICES,
  type ChairsideProtocolsSectionProps,
} from "./types";

export const ChairsideProtocolsSection: React.FC<ChairsideProtocolsSectionProps> = ({
  currentStep,
  visitNoteForm = {},
  updateVisitNoteField,
  activePatient,
  activeAppointment,
  loadedTreatmentPlan,
  isStageTaken,
  onTakeStage,
  activeQuadrant,
  onQuadrantChange,
  toothStateByCode,
  setToothState,
  billingItems,
  totalBillingAmountRub,
  onAddBillingItem,
  onRemoveBillingItem,
  isCheckoutSheetOpen,
  onCloseCheckoutSheet,
  onConfirmCheckout,
  testId = "mobile-chairside-workspace",
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"sbp" | "card" | "cash">("sbp");

  return (
    <>
      {/* ═══ STEP 1: ЖАЛОБЫ И АНАМНЕЗ ═══ */}
      {currentStep === "complaints" && (
        <div className="space-y-3" data-testid={`${testId}-step1-content`}>
          <div className="mobile-chairside-grouped-card">
            <div className="mobile-chairside-card-title">Жалобы пациента</div>
            <textarea
              value={visitNoteForm?.complaint || ""}
              onChange={(e) => updateVisitNoteField("complaint", e.target.value)}
              placeholder="Жалобы пациента (боли, реакция на холодное/горячее, скол, выпадение пломбы)..."
              className="mobile-chairside-textarea"
              data-testid={`${testId}-complaint-input`}
            />
            <div
              className="mobile-chairside-row-item"
              onClick={() =>
                updateVisitNoteField(
                  "complaint",
                  "Жалобы на кратковременные ноющие боли от холодного и сладкого в зубе верхней челюсти.",
                )
              }
            >
              <div className="flex items-center gap-3">
                <Stethoscope size={18} className="text-teal-600" />
                <div>
                  <div className="text-[14px] font-semibold text-[var(--ink)]">
                    Острая боль от температурных раздражителей
                  </div>
                  <div className="text-[12px] text-[var(--muted)]">Типовой шаблон жалоб</div>
                </div>
              </div>
              <ArrowRight size={16} className="text-[var(--muted)]" />
            </div>
          </div>

          <div className="mobile-chairside-grouped-card">
            <div className="mobile-chairside-card-title">Анамнез заболевания и жизни</div>
            <textarea
              value={visitNoteForm?.anamnesis || ""}
              onChange={(e) => updateVisitNoteField("anamnesis", e.target.value)}
              placeholder="Анамнез (со слов пациента, сопутствующие заболевания, перенесенные операции)..."
              className="mobile-chairside-textarea min-h-[90px]"
              data-testid={`${testId}-anamnesis-input`}
            />
          </div>
        </div>
      )}

      {/* ═══ STEP 2: ОБЪЕКТИВНЫЙ ОСМОТР И КВАДРАНТЫ ЗУБОВ ═══ */}
      {currentStep === "exam" && (
        <div className="space-y-3" data-testid={`${testId}-step2-content`}>
          <ChairsideTeethQuickSelector
            activeQuadrant={activeQuadrant}
            onQuadrantChange={onQuadrantChange}
            toothStateByCode={toothStateByCode ?? {}}
            setToothState={setToothState}
            testId={testId}
          />

          <div className="mobile-chairside-grouped-card">
            <div className="mobile-chairside-card-title">Объективный клинический статус</div>
            <textarea
              value={visitNoteForm?.objectiveStatus || ""}
              onChange={(e) => updateVisitNoteField("objectiveStatus", e.target.value)}
              placeholder="Данные осмотра слизистой, зубных рядов, зондирования, перкуссии..."
              className="mobile-chairside-textarea"
              data-testid={`${testId}-objective-input`}
            />
          </div>
        </div>
      )}

      {/* ═══ STEP 3: ДИАГНОЗ ═══ */}
      {currentStep === "diagnosis" && (
        <div className="space-y-3" data-testid={`${testId}-step3-content`}>
          <div className="mobile-chairside-grouped-card">
            <div className="mobile-chairside-card-title">Клинический диагноз</div>
            <div className="p-3">
              <input
                type="text"
                value={visitNoteForm?.diagnosis || ""}
                onChange={(e) => updateVisitNoteField("diagnosis", e.target.value)}
                placeholder="Диагноз и клиническое описание..."
                className="w-full min-h-[48px] px-3.5 text-[15px] font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none"
                data-testid={`${testId}-diagnosis-input`}
              />
            </div>

            {COMMON_DENTAL_DIAGNOSES.map((diag) => (
              <div
                key={diag.code}
                className="mobile-chairside-row-item"
                onClick={() => {
                  triggerHaptic("selection");
                  updateVisitNoteField("diagnosis", diag.full);
                }}
                data-testid={`${testId}-diag-${diag.code}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {diag.code}
                  </span>
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--ink)]">
                      {diag.title}
                    </div>
                    <div className="text-[12px] text-[var(--muted)]">{diag.full}</div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-[var(--muted)]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ STEP 4: ЛЕЧЕНИЕ И ПРОТОКОЛ ═══ */}
      {currentStep === "treatment" && (
        <div className="space-y-3" data-testid={`${testId}-step4-content`}>
          <VisitPlanStageHandoffBanner
            loadedTreatmentPlan={loadedTreatmentPlan}
            activeAppointment={activeAppointment}
            activePatient={activePatient}
            onTakeStage={onTakeStage}
          />

          <div className="mobile-chairside-grouped-card">
            <div className="mobile-chairside-card-title">
              Протокол лечения и выполненные манипуляции
            </div>
            <textarea
              value={visitNoteForm?.treatmentPlan || ""}
              onChange={(e) => updateVisitNoteField("treatmentPlan", e.target.value)}
              placeholder="Опишите выполненные манипуляции (препарирование, обработка, пломбирование, рекомендации)..."
              className="mobile-chairside-textarea min-h-[140px]"
              data-testid={`${testId}-treatment-input`}
            />
            <div
              className="mobile-chairside-row-item"
              onClick={() => {
                const preset =
                  "Проведено препарирование кариозной полости. Медикаментозная обработка 2% р-ром хлоргексидина. Изоляция OptiDam. Протравливание эмали 37% ортофосфорной кислотой 15 сек. Бондинг Prime&Bond universal. Пломбирование композитом светового отверждения Harmonize A3. Шлифовка, полировка дисками Enhance.";
                updateVisitNoteField("treatmentPlan", preset);
              }}
            >
              <div className="flex items-center gap-3">
                <Zap size={18} className="text-amber-500" />
                <div>
                  <div className="text-[14px] font-semibold text-[var(--ink)]">
                    Стандартный протокол световой реставрации
                  </div>
                  <div className="text-[12px] text-[var(--muted)]">
                    Изоляция + бондинг + шлифовка
                  </div>
                </div>
              </div>
              <ArrowRight size={16} className="text-[var(--muted)]" />
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 5: ИТОГ И ЧЕК ═══ */}
      {currentStep === "checkout" && (
        <div className="space-y-3" data-testid={`${testId}-step5-content`}>
          {/* Total Due Hero Card */}
          <div className="mobile-billing-hero-card">
            <div className="text-[12px] font-bold text-[var(--muted)] uppercase tracking-wider">
              К оплате по приёму
            </div>
            <div
              className="mobile-billing-total-amount"
              data-testid={`${testId}-billing-total`}
            >
              {totalBillingAmountRub.toLocaleString("ru-RU")} ₽
            </div>
            <div className="text-[12px] text-[var(--muted)] mt-1">
              {billingItems.length} позиций в чеке
            </div>
          </div>

          {/* In-Session Billing Items List */}
          <div className="mobile-chairside-grouped-card">
            <div className="mobile-chairside-card-title flex items-center justify-between">
              <span>Оказанные услуги и манипуляции</span>
              <span className="text-[11px] text-teal-600 font-bold">Стандарт услуг</span>
            </div>

            {billingItems.map((item) => (
              <div key={item.id} className="mobile-chairside-row-item">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="text-[13px] font-semibold text-[var(--ink)] leading-snug">
                    {item.title}
                  </div>
                  <div className="text-[12px] text-[var(--muted)] flex items-center gap-2 mt-0.5">
                    <span className="font-mono">{item.code804n}</span>
                    {item.toothCode && <span>· Зуб {item.toothCode}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[14px] font-bold font-mono text-[var(--ink)]">
                    {(item.priceRub * item.quantity).toLocaleString("ru-RU")} ₽
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveBillingItem(item.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500/10"
                    aria-label="Удалить услугу"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick 1-Tap Services Adding */}
          <div className="mobile-chairside-grouped-card p-3">
            <div className="text-[13px] font-bold text-[var(--muted)] uppercase mb-2">
              + Быстрое добавление услуг
            </div>
            <div className="mobile-quick-services-grid">
              {QUICK_CHAIRSIDE_SERVICES.map((srv) => (
                <button
                  key={srv.code804n}
                  type="button"
                  onClick={() => onAddBillingItem(srv)}
                  className="mobile-quick-service-btn"
                >
                  <span className="mobile-quick-service-title">{srv.shortTitle || srv.title}</span>
                  <span className="mobile-quick-service-price">
                    + {srv.priceRub.toLocaleString("ru-RU")} ₽
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NATIVE BOTTOM SHEET: ОПЛАТА И СЧЁТ */}
      <MobileBottomSheet
        isOpen={isCheckoutSheetOpen}
        onClose={onCloseCheckoutSheet}
        title="Оплата и формирование счёта"
        subtitle={`Пациент: ${activePatient?.fullName || "Пациент"}`}
        testId={`${testId}-final-checkout-sheet`}
        footer={
          <button
            type="button"
            className="mobile-chairside-primary-cta w-full"
            onClick={onConfirmCheckout}
            data-testid={`${testId}-confirm-checkout-btn`}
          >
            <CheckCircle2 size={20} />
            <span>Оплатить {totalBillingAmountRub.toLocaleString("ru-RU")} ₽ и закрыть</span>
          </button>
        }
      >
        <div className="space-y-3 py-2">
          <div className="text-center py-4 bg-[var(--paper-soft)] rounded-2xl border border-[var(--line)]">
            <div className="text-[12px] font-bold text-[var(--muted)] uppercase">
              Сумма к оплате
            </div>
            <div className="text-[32px] font-extrabold font-mono text-[var(--ink)] mt-1">
              {totalBillingAmountRub.toLocaleString("ru-RU")} ₽
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[13px] font-bold text-[var(--muted)] uppercase px-1">
              Способ оплаты
            </div>
            {PAYMENT_METHOD_OPTIONS.map((method) => (
              <div
                key={method.id}
                className={`mobile-chairside-row-item rounded-xl border ${
                  selectedPaymentMethod === method.id
                    ? "border-teal-500 bg-teal-500/10"
                    : "border-[var(--line)]"
                }`}
                onClick={() => {
                  triggerHaptic("selection");
                  setSelectedPaymentMethod(method.id as any);
                }}
              >
                <div>
                  <div className="text-[15px] font-bold text-[var(--ink)]">{method.label}</div>
                  <div className="text-[12px] text-[var(--muted)]">{method.desc}</div>
                </div>
                {selectedPaymentMethod === method.id ? (
                  <CheckCircle2 size={20} className="text-teal-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-[var(--line)]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </MobileBottomSheet>
    </>
  );
};
