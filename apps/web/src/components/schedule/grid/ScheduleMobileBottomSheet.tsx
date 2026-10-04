import React from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FastForward,
  MessageSquare,
  Phone,
  PhoneCall,
  User,
  UserCheck,
  UserMinus,
  X,
  XCircle,
} from "lucide-react";
import type { Appointment, Dashboard } from "@dental/shared";
import {
  isAppointmentInChair,
  getNormalizedAppointmentStatusLabel,
  formatDoctorShortName,
} from ".././GridAppointmentCard";
import { extractTeethList } from "./gridSlotMath";
import { DEFAULT_SOLO_CHAIR } from "./gridConstants";
import { generateAppointmentWhatsAppMessage } from "../generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import { isNegativeAllergyStatement } from "../../../utils/somaticNorm";
import { showToast } from "../../GlobalToast";

export interface ScheduleMobileBottomSheetProps {
  selectedMobileAppt: Appointment | null;
  onClose: () => void;
  patientName: (
    patients: Dashboard["patients"],
    patientId: string | null,
  ) => string;
  dashboard: Dashboard;
  timezone: string;
  toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
  appointmentLabels: Record<Appointment["status"], string>;
  effectiveChairs: Array<any>;
  doctors: Array<any>;
  onAppointmentClick: (appointment: Appointment) => void;
  onQuickStatusChange?:
    | ((appointmentId: string, status: Appointment["status"]) => void)
    | undefined;
  handleAdjustAppointmentDuration: (appt: Appointment, delta: number) => void;
  handleShiftAppointmentLateness: (appt: Appointment, shift: number) => void;
  handleReassignAppointmentChair: (
    appt: Appointment,
    chairId: string | null,
  ) => void;
  handleReassignAppointmentDoctor: (
    appt: Appointment,
    doctorUserId: string,
  ) => void;
  handleFreeSlotToWaitlist: (appt: Appointment) => void;
}

export function ScheduleMobileBottomSheet({
  selectedMobileAppt,
  onClose,
  patientName,
  dashboard,
  timezone,
  toDateTimeLocalValue,
  appointmentLabels,
  effectiveChairs,
  doctors,
  onAppointmentClick,
  onQuickStatusChange,
  handleAdjustAppointmentDuration,
  handleShiftAppointmentLateness,
  handleReassignAppointmentChair,
  handleReassignAppointmentDoctor,
  handleFreeSlotToWaitlist,
}: ScheduleMobileBottomSheetProps) {
  if (!selectedMobileAppt) return null;

          const mPatName = patientName(
            dashboard.patients,
            selectedMobileAppt.patientId,
          );
          const mPatObj = dashboard.patients?.find(
            (p) => p.id === selectedMobileAppt.patientId,
          );
          const mDocObj = dashboard.clinicSettings?.staff?.find(
            (s) => s.id === selectedMobileAppt.doctorUserId,
          );
          const mChairObj =
            dashboard.clinicSettings?.chairs?.find(
              (c) => c.id === selectedMobileAppt.chairId,
            ) ||
            (selectedMobileAppt.chairId === DEFAULT_SOLO_CHAIR.id
              ? DEFAULT_SOLO_CHAIR
              : undefined);
          const mRawBal =
            mPatObj?.balanceRub ??
            (mPatObj as { balance?: number | string | null } | undefined)
              ?.balance;
          const mBalance =
            mRawBal !== undefined &&
            mRawBal !== null &&
            mRawBal !== "" &&
            Number.isFinite(Number(mRawBal))
              ? Number(mRawBal)
              : null;
          const mTeeth = extractTeethList(selectedMobileAppt);
          const mStart = toDateTimeLocalValue(
            selectedMobileAppt.startsAt,
            timezone,
          ).slice(11, 16);
          const mEnd = toDateTimeLocalValue(
            selectedMobileAppt.endsAt,
            timezone,
          ).slice(11, 16);
          const mAllergyAlert = (() => {
            const rawAllergies =
              (mPatObj as { allergies?: string | null } | undefined)
                ?.allergies ||
              (
                mPatObj as
                  { anamnesis?: { allergies?: string | null } } | undefined
              )?.anamnesis?.allergies;
            if (
              rawAllergies &&
              typeof rawAllergies === "string" &&
              rawAllergies.trim() &&
              !isNegativeAllergyStatement(rawAllergies)
            ) {
              return `Внимание: ${rawAllergies.trim()}`;
            }
            const notes = mPatObj?.notes || "";
            const match = notes.match(/аллерги[яеи][^.;\n]*/i);
            if (match && !isNegativeAllergyStatement(match[0])) {
              return `Внимание: ${match[0].trim()}`;
            }
            const reason = selectedMobileAppt?.reason || "";
            if (
              (/лидокаин/i.test(reason) || /аллерги/i.test(reason)) &&
              !isNegativeAllergyStatement(reason)
            ) {
              return "Внимание: Аллергия на лидокаин";
            }
            return null;
          })();

          return (
            <div
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
              onClick={() => onClose()}
              role="dialog"
              aria-modal="true"
              aria-label="Подробности приёма"
              data-testid="schedule-grid-mobile-bottom-sheet"
            >
              <div
                className="bg-[var(--paper-strong)] rounded-t-3xl border-t border-[var(--line)] p-5 pb-28 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200 text-xs text-[var(--ink)]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Top Grab Handle */}
                <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-black text-[var(--ink)] truncate">
                      {mPatName}
                    </div>
                    <div className="text-xs text-[var(--muted)] font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span>
                        {mStart} – {mEnd} ·{" "}
                        {selectedMobileAppt.reason || "Прием"}
                      </span>
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1 ${
                          isAppointmentInChair(selectedMobileAppt.status)
                            ? "bg-[var(--teal,var(--brand-primary))] text-white"
                            : selectedMobileAppt.status === "arrived"
                              ? "bg-amber-500 text-white"
                              : selectedMobileAppt.status === "confirmed"
                                ? "bg-emerald-600 text-white"
                                : selectedMobileAppt.status === "completed"
                                  ? "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                  : "bg-[var(--paper-soft)] text-[var(--ink)]"
                        }`}
                      >
                        {isAppointmentInChair(selectedMobileAppt.status) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                        )}
                        <span>
                          {selectedMobileAppt.status === "arrived"
                            ? "В холле"
                            : getNormalizedAppointmentStatusLabel(
                                selectedMobileAppt.status,
                                appointmentLabels,
                              )}
                        </span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onClose()}
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                    aria-label="Закрыть"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* 54-FZ Payment status & Balance banner */}
                <div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-2">
                  <span className="font-bold text-[var(--muted)]">
                    Статус оплаты / Баланс:
                  </span>
                  {mBalance !== null ? (
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono whitespace-nowrap shrink-0 ${
                        mBalance > 0
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
                          : mBalance < 0
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
                            : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                      }`}
                    >
                      {mBalance > 0
                        ? `Депозит: +${mBalance.toLocaleString("ru-RU")} ₽`
                        : mBalance < 0
                          ? `Долг: ${Math.abs(mBalance).toLocaleString("ru-RU")} ₽`
                          : "0 ₽ (Оплачено)"}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--muted)] whitespace-nowrap shrink-0">
                      0 ₽ (Оплачено)
                    </span>
                  )}
                </div>

                {/* Phone & WhatsApp */}
                {mPatObj?.phone && (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
                    <div className="flex items-center gap-2 font-mono text-sm font-semibold text-[var(--ink)]">
                      <Phone className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
                      <span>{mPatObj.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const text = generateAppointmentWhatsAppMessage({
                            patientName: mPatName,
                            doctorName: mDocObj?.fullName,
                            doctorSpecialty: mDocObj?.role,
                            appointmentStartsAt: selectedMobileAppt.startsAt,
                            clinicName:
                              dashboard.clinicSettings?.profile?.clinicName,
                            clinicAddress:
                              dashboard.clinicSettings?.profile?.address,
                            clinicPhone:
                              dashboard.clinicSettings?.profile?.phone,
                            treatmentReason: selectedMobileAppt.reason,
                          });
                          openWhatsAppChat(mPatObj.phone!, text);
                        }}
                        className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                      >
                        <MessageSquare
                          size={15}
                          className="text-emerald-600 dark:text-emerald-400"
                        />
                        <span>WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const text = generateAppointmentWhatsAppMessage({
                            patientName: mPatName,
                            doctorName: mDocObj?.fullName,
                            doctorSpecialty: mDocObj?.role,
                            appointmentStartsAt: selectedMobileAppt.startsAt,
                            clinicName:
                              dashboard.clinicSettings?.profile?.clinicName,
                            clinicAddress:
                              dashboard.clinicSettings?.profile?.address,
                            clinicPhone:
                              dashboard.clinicSettings?.profile?.phone,
                            treatmentReason: selectedMobileAppt.reason,
                          });
                          if (
                            typeof navigator !== "undefined" &&
                            navigator.clipboard
                          ) {
                            void navigator.clipboard.writeText(text);
                            showToast(
                              `Текст напоминания скопирован`,
                              "success",
                            );
                          }
                        }}
                        className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center cursor-pointer"
                        title="Скопировать SMS"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Allergy alert */}
                {mAllergyAlert && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-2">
                    <AlertTriangle
                      size={16}
                      className="text-amber-600 shrink-0 animate-bounce"
                    />
                    <span>{mAllergyAlert}</span>
                  </div>
                )}

                {/* Teeth List */}
                {mTeeth.length > 0 && (
                  <div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5">
                    <div className="font-bold text-[var(--muted)]">
                      Список зубов:
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {mTeeth.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-1 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/30 text-xs font-black font-mono"
                        >
                          Зуб {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Doctor & Assistant */}
                <div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5 text-xs text-[var(--ink)]">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-[var(--muted)] shrink-0">Врач:</span>
                    <span
                      className="font-bold truncate"
                      title={mDocObj?.fullName || "Не назначен"}
                    >
                      {mDocObj?.fullName || "Не назначен"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-[var(--muted)] shrink-0">
                      Ассистент:
                    </span>
                    <span
                      className="truncate"
                      title={(() => {
                        const asst = selectedMobileAppt.assistantUserId
                          ? dashboard.clinicSettings?.staff?.find(
                              (s) =>
                                s.id === selectedMobileAppt.assistantUserId,
                            )
                          : null;
                        return asst?.fullName || "Не назначен";
                      })()}
                    >
                      {(() => {
                        const asst = selectedMobileAppt.assistantUserId
                          ? dashboard.clinicSettings?.staff?.find(
                              (s) =>
                                s.id === selectedMobileAppt.assistantUserId,
                            )
                          : null;
                        return asst?.fullName || "Не назначен";
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">Кабинет:</span>
                    <span className="font-mono font-semibold">
                      {mChairObj?.name || "Кабинет 1"}
                    </span>
                  </div>
                </div>

                {/* Quick Status Buttons */}
                {onQuickStatusChange && (
                  <div className="space-y-2">
                    <div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
                      Сменить статус визита:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onQuickStatusChange(
                            selectedMobileAppt.id,
                            "confirmed",
                          );
                          onClose();
                        }}
                        className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-violet-500/15 border border-violet-500/40 text-violet-800 dark:text-violet-200 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <PhoneCall size={14} />
                        <span>Подтвержден</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onQuickStatusChange(selectedMobileAppt.id, "arrived");
                          onClose();
                        }}
                        className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <UserCheck size={14} />
                        <span>В холле</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onQuickStatusChange(
                            selectedMobileAppt.id,
                            "in_treatment",
                          );
                          onClose();
                        }}
                        className={`min-h-[44px] px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                          isAppointmentInChair(selectedMobileAppt.status)
                            ? "bg-[var(--teal,var(--brand-primary))] text-white border border-[var(--teal)] font-bold shadow-xs"
                            : "bg-[var(--teal-soft)] border border-[var(--teal)]/40 text-[var(--teal-dark)]"
                        }`}
                      >
                        <CalendarCheck size={14} />
                        <span>В кресле</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onQuickStatusChange(
                            selectedMobileAppt.id,
                            "completed",
                          );
                          onClose();
                        }}
                        className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-slate-500/15 border border-slate-500/40 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 size={14} />
                        <span>Завершен</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Duration & Lateness Adjustment (Wave 58) */}
                <div className="space-y-2 pt-2 border-t border-[var(--line)]">
                  <div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
                    Длительность приема:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      data-testid={`mobile-duration-plus-15-${selectedMobileAppt.id}`}
                      onClick={() =>
                        handleAdjustAppointmentDuration(selectedMobileAppt, 15)
                      }
                      className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--paper)] transition-colors"
                      title="+15 минут"
                    >
                      <Clock
                        size={13}
                        className="text-[var(--teal)] shrink-0"
                      />
                      <span>+15 мин</span>
                    </button>
                    <button
                      type="button"
                      data-testid={`mobile-duration-plus-30-${selectedMobileAppt.id}`}
                      onClick={() =>
                        handleAdjustAppointmentDuration(selectedMobileAppt, 30)
                      }
                      className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--paper)] transition-colors"
                      title="+30 минут"
                    >
                      <Clock
                        size={13}
                        className="text-[var(--teal)] shrink-0"
                      />
                      <span>+30 мин</span>
                    </button>
                    <button
                      type="button"
                      data-testid={`mobile-duration-minus-15-${selectedMobileAppt.id}`}
                      onClick={() =>
                        handleAdjustAppointmentDuration(selectedMobileAppt, -15)
                      }
                      className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--paper)] transition-colors"
                      title="-15 минут"
                    >
                      <Clock
                        size={13}
                        className="text-[var(--teal)] shrink-0"
                      />
                      <span>-15 мин</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      data-testid={`mobile-shift-late-15-${selectedMobileAppt.id}`}
                      onClick={() =>
                        handleShiftAppointmentLateness(selectedMobileAppt, 15)
                      }
                      className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-center justify-center gap-1 cursor-pointer hover:bg-amber-500/25 transition-colors"
                      title="Сдвинуть на +15 мин при опоздании"
                    >
                      <FastForward
                        size={14}
                        className="text-amber-600 dark:text-amber-400 shrink-0"
                      />
                      <span>Сдвиг +15 мин</span>
                    </button>
                    <button
                      type="button"
                      data-testid={`mobile-free-slot-waitlist-${selectedMobileAppt.id}`}
                      onClick={() =>
                        handleFreeSlotToWaitlist(selectedMobileAppt)
                      }
                      className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-200 flex items-center justify-center gap-1 cursor-pointer hover:bg-rose-500/25 transition-colors"
                      title="Освободить слот -> в лист ожидания"
                    >
                      <UserMinus
                        size={14}
                        className="text-rose-600 dark:text-rose-400 shrink-0"
                      />
                      <span>В лист ожидания</span>
                    </button>
                  </div>
                </div>

                {/* Mobile: 1-Click Reassign Chair without modal */}
                {effectiveChairs.length > 1 && (
                  <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
                    <div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
                      Сменить кресло (1 клик):
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {effectiveChairs.map((ch) => {
                        const isCurrent = selectedMobileAppt.chairId === ch.id;
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            data-testid={`mobile-reassign-chair-${selectedMobileAppt.id}-${ch.id}`}
                            onClick={() =>
                              handleReassignAppointmentChair(
                                selectedMobileAppt,
                                ch.id,
                              )
                            }
                            className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isCurrent
                                ? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs"
                                : "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  ch.color || "var(--teal, #0d9488)",
                              }}
                            />
                            <span>{ch.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mobile: 1-Click Reassign Doctor without modal */}
                {doctors.length > 1 && (
                  <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
                    <div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
                      Сменить врача (1 клик):
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {doctors.slice(0, 4).map((doc) => {
                        const isCurrent =
                          selectedMobileAppt.doctorUserId === doc.id;
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            data-testid={`mobile-reassign-doctor-${selectedMobileAppt.id}-${doc.id}`}
                            onClick={() =>
                              handleReassignAppointmentDoctor(
                                selectedMobileAppt,
                                doc.id,
                              )
                            }
                            className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isCurrent
                                ? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs"
                                : "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
                            }`}
                          >
                            <span>{formatDoctorShortName(doc.fullName)}</span>
                          </button>
                        );
                      })}
                      {doctors.length > 4 && (
                        <select
                          value={selectedMobileAppt.doctorUserId || ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleReassignAppointmentDoctor(
                                selectedMobileAppt,
                                e.target.value,
                              );
                            }
                          }}
                          className="min-h-[44px] text-xs font-semibold border border-[var(--line)] rounded-xl px-2.5 bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer"
                          title="Выбрать другого врача"
                          data-testid={`mobile-reassign-doctor-select-${selectedMobileAppt.id}`}
                        >
                          <option value="">Все врачи...</option>
                          {doctors.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.fullName}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* Primary Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAppointmentClick(selectedMobileAppt);
                    }}
                    className="w-full min-h-[48px] rounded-2xl bg-[var(--teal,var(--brand-primary))] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
                  >
                    <User size={16} />
                    <span>Открыть карту приема</span>
                  </button>
                </div>
              </div>
            </div>
          );

}
