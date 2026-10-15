import React, { useState, useEffect } from "react";
import { Check, ChevronDown, SlidersHorizontal, Tag } from "lucide-react";
import { AppointmentModalDoctorChairSection } from "../AppointmentModalDoctorChairSection";
import { AppointmentModalQuickReasons } from "../AppointmentModalQuickReasons";
import { AppointmentModalStatusSection } from "../AppointmentModalStatusSection";
import { AppointmentModalLabSection } from "../AppointmentModalLabSection";
import type { AppointmentDetailsSectionProps } from "./appointmentModalTypes";

export type { AppointmentDetailsSectionProps };

export function AppointmentDetailsSection({
  props,
  state,
}: AppointmentDetailsSectionProps) {
  const { appointment, dashboard, appointmentLabels, activeVisitLockedAppointmentStatuses, chairDoctorAssignments, onClose } = props;
  const {
    startsAtLocal,
    setStartsAtLocal,
    endsAtLocal,
    setEndsAtLocal,
    currentDurationMinutes,
    applyDuration,
    doctorUserId,
    setDoctorUserId,
    assistantUserId,
    setAssistantUserId,
    chairId,
    setChairId,
    isSoloDoctor,
    doctors,
    assistants,
    chairs,
    dutyDoctorId,
    dutyDoc,
    dutyDocHours,
    collision,
    safeToDateTimeLocalValue,
    timezone,
    status,
    setStatus,
    reason,
    setReason,
    comment,
    setComment,
    hasOpenVisit,
    activeLabOrders,
    handleApplyReasonPreset,
    handleApplyTechnicalBreakPreset,
    handleApplyRefusalReason,
    handleOpenWaitlistForThisSlot,
  } = state;

  const [isAdditionalOpen, setIsAdditionalOpen] = useState(false);

  useEffect(() => {
    if (!appointment) return;
    const initialLab = Boolean(
      (appointment as any)?.labOrderId ||
        (appointment as any)?.labOrderNumber ||
        (activeLabOrders && activeLabOrders.length > 0),
    );
    const initialComment = Boolean(
      appointment.comment && appointment.comment.trim().length > 0,
    );
    const initialAssistant = Boolean(appointment.assistantUserId);
    setIsAdditionalOpen(initialLab || initialComment || initialAssistant);
  }, [appointment?.id]);

  const hasLabOrder = Boolean(
    (activeLabOrders && activeLabOrders.length > 0) ||
      (appointment as any)?.labOrderId ||
      (appointment as any)?.labOrderNumber,
  );

  return (
    <>
      {/* 1. Doctor, Chair, Times & Duration Selection */}
      <AppointmentModalDoctorChairSection
        appointment={appointment!}
        dashboard={dashboard}
        startsAtLocal={startsAtLocal}
        setStartsAtLocal={setStartsAtLocal}
        endsAtLocal={endsAtLocal}
        setEndsAtLocal={setEndsAtLocal}
        currentDurationMinutes={currentDurationMinutes}
        applyDuration={applyDuration}
        doctorUserId={doctorUserId}
        setDoctorUserId={setDoctorUserId}
        assistantUserId={assistantUserId}
        setAssistantUserId={setAssistantUserId}
        chairId={chairId}
        setChairId={setChairId}
        isSoloDoctor={isSoloDoctor}
        doctors={doctors}
        assistants={assistants}
        chairs={chairs}
        dutyDoctorId={dutyDoctorId}
        dutyDoc={dutyDoc}
        dutyDocHours={dutyDocHours}
        chairDoctorAssignments={chairDoctorAssignments}
        collision={collision}
        safeToDateTimeLocalValue={safeToDateTimeLocalValue}
        timezone={timezone}
        hideAssistant={true}
      />

      {/* 2. Reason & Quick Reasons (1-click chips) */}
      <div className="sm:col-span-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
          Повод обращения / Услуга
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] font-medium"
          placeholder="Например: Лечение кариеса, консультация, острая боль..."
          data-testid="appointment-modal-reason-input"
        />
        <AppointmentModalQuickReasons
          onApplyReasonPreset={handleApplyReasonPreset}
          onApplyTechnicalBreakPreset={handleApplyTechnicalBreakPreset}
        />
      </div>

      {/* 3. Status Section (1-click 6 status buttons) */}
      <AppointmentModalStatusSection
        status={status}
        setStatus={setStatus}
        appointmentLabels={appointmentLabels}
        activeVisitLockedAppointmentStatuses={
          activeVisitLockedAppointmentStatuses
        }
        hasOpenVisit={hasOpenVisit}
        comment={comment}
        handleApplyRefusalReason={handleApplyRefusalReason}
        handleOpenWaitlistForThisSlot={handleOpenWaitlistForThisSlot}
      />

      {/* 4. Layer B: Spoiler / Accordion «Дополнительные параметры ▾» */}
      <div className="sm:col-span-2 pt-2 border-t border-[var(--line)]/60">
        <button
          type="button"
          onClick={() => setIsAdditionalOpen((prev) => !prev)}
          className="w-full py-2.5 px-3.5 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] hover:bg-[var(--paper-subtle)] text-[var(--ink)] text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer select-none active:scale-[0.99] shadow-2xs min-h-[44px]"
          data-testid="appointment-modal-toggle-additional-btn"
          aria-expanded={isAdditionalOpen}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal size={14} className="text-[var(--teal)] shrink-0" />
            <span className="text-xs sm:text-sm font-bold">Дополнительные параметры</span>
            {/* Badges showing active parameters inside spoiler */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {hasLabOrder && (
                <span className="px-2 py-0.5 rounded-md bg-[var(--teal)]/15 border border-[var(--teal)]/30 text-[var(--teal-dark,var(--teal))] text-[10px] font-bold">
                  ЗТЛ наряд
                </span>
              )}
              {Boolean(comment?.trim()) && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                  Примечание
                </span>
              )}
              {Boolean(assistantUserId) && (
                <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                  Ассистент
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-[var(--muted)] text-xs shrink-0 font-medium">
            <span>{isAdditionalOpen ? "Свернуть" : "Развернуть"}</span>
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${isAdditionalOpen ? "rotate-180 text-[var(--teal)]" : ""}`}
            />
          </div>
        </button>

        {/* Spoiler container */}
        <div
          className={`transition-all duration-200 ${
            isAdditionalOpen
              ? "block mt-3 space-y-3.5 p-3.5 rounded-2xl bg-[var(--paper-soft)]/50 border border-[var(--line)] animate-in fade-in slide-in-from-top-1"
              : "hidden"
          }`}
          data-testid="appointment-modal-additional-content"
        >
          {/* 1. Зуботехническая лаборатория (ЗТЛ) */}
          <AppointmentModalLabSection
            appointment={appointment!}
            activeLabOrders={activeLabOrders}
            startsAtLocal={startsAtLocal}
            setStartsAtLocal={setStartsAtLocal}
            setEndsAtLocal={setEndsAtLocal}
            onClose={onClose}
          />

          {/* 2. Ассистент врача (если не соло-врач) */}
          {!isSoloDoctor && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center justify-between mb-1">
                <span>Ассистент врача</span>
                <span className="text-[10px] text-[var(--muted)] font-normal">
                  Опционально
                </span>
              </label>
              <select
                value={assistantUserId || ""}
                onChange={(e) => setAssistantUserId(e.target.value || null)}
                className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
                data-testid="select-appointment-assistant"
              >
                <option value="">-- Без ассистента (соло-приём) --</option>
                {assistants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Внутреннее примечание для клиники / комментарий администратора */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block">
                Внутреннее примечание для клиники / комментарий администратора
              </label>
              <span className="text-[10px] text-[var(--muted)] font-normal">
                Не видно пациенту
              </span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Служебные пометки для администраторов и врачей..."
              className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
              data-testid="appointment-modal-comment-textarea"
            />
          </div>

          {/* 4. Цветная метка / Тип визита */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5">
                <Tag size={13} className="text-[var(--teal)]" />
                <span>Цветная метка / Тип визита:</span>
              </span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap" data-testid="appointment-visit-type-tags">
              {[
                { id: "primary", label: "Первичный", tag: "[Первичный]", activeColor: "bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-500/40" },
                { id: "repeat", label: "Повторный", tag: "[Повторный]", activeColor: "bg-teal-500/20 text-teal-800 dark:text-teal-200 border-teal-500/40" },
                { id: "vip", label: "VIP", tag: "[VIP]", activeColor: "bg-purple-500/20 text-purple-800 dark:text-purple-200 border-purple-500/40" },
                { id: "consult", label: "Консультация", tag: "[Консультация]", activeColor: "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40" },
                { id: "warranty", label: "Гарантия", tag: "[Гарантия]", activeColor: "bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40" },
              ].map((tagItem) => {
                const isSelected = comment.includes(tagItem.tag);
                return (
                  <button
                    key={tagItem.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setComment((prev) => prev.replace(tagItem.tag, "").trim());
                      } else {
                        setComment((prev) => (prev.trim() ? `${prev.trim()} ${tagItem.tag}` : tagItem.tag));
                      }
                    }}
                    className={`h-7 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 ${
                      isSelected
                        ? `${tagItem.activeColor} ring-1 ring-current font-extrabold`
                        : "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line-strong)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)]"
                    }`}
                    data-testid={`appointment-tag-${tagItem.id}`}
                  >
                    <span>{tagItem.label}</span>
                    {isSelected && <Check size={11} className="stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
