import React from "react";
import { AlertTriangle, ChevronRight as ChevronRightIcon, CreditCard, Stethoscope } from "lucide-react";
import type { Appointment, Dashboard } from "@dental/shared";
import { formatDoctorShortName } from "../GridAppointmentCard";
import { formatPatientDisplayFio } from "../appointmentCardHelpers";
import { type TimelineItem, extractToothBadge, resolveMobileAllergyBadge, getStatusTheme } from "./scheduleMobileAgendaTypes";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import { ScheduleMobileGapRow } from "./ScheduleMobileGapRow";
import { openVisitWithBackendSync } from "../appointmentCardActions/visitSyncHelper";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";

export interface ScheduleMobileTimelineRowProps {
  item: TimelineItem;
  effectiveDateKey: string;
  selectedDoctorId: string | null;
  selectedChairId: string | null;
  dashboard: Dashboard;
  patientName: (patients: any[], id: string | null) => string;
  appointmentLabels: Record<Appointment["status"], string>;
  onSlotClick?: ((slot: QuickBookingSlotInfo) => void) | undefined;
  onSelectMobileAppt: (appt: Appointment) => void;
  onQuickStatusChange?: ((appointmentId: string, status: Appointment["status"]) => void) | undefined;
  onOpenVisit?: ((appointment?: Appointment) => void) | undefined;
}

export const ScheduleMobileTimelineRow: React.FC<ScheduleMobileTimelineRowProps> = ({
  item,
  effectiveDateKey,
  selectedDoctorId,
  selectedChairId,
  dashboard,
  patientName,
  appointmentLabels,
  onSlotClick,
  onSelectMobileAppt,
  onQuickStatusChange,
  onOpenVisit,
}) => {
  if (item.type === "gap") {
    return (
      <ScheduleMobileGapRow
        item={item}
        effectiveDateKey={effectiveDateKey}
        selectedDoctorId={selectedDoctorId}
        selectedChairId={selectedChairId}
        onSlotClick={onSlotClick}
      />
    );
  }

  const appt = item.appointment;
  const pat = dashboard?.patients?.find((p: any) => p.id === appt.patientId);
  const fullPatientName = patientName(dashboard?.patients ?? [], appt.patientId);
  const pName = formatPatientDisplayFio(fullPatientName);
  const doc = dashboard?.clinicSettings?.staff?.find((s: any) => s.id === appt.doctorUserId);
  const chair = dashboard?.clinicSettings?.chairs?.find((c: any) => c.id === appt.chairId);
  const statusTheme = getStatusTheme(appt.status, appointmentLabels);
  const toothBadge = extractToothBadge(appt);
  const allergyText = resolveMobileAllergyBadge(appt, pat);
  const rawBal = pat?.balanceRub ?? (pat as any)?.balance;
  const balance = rawBal !== undefined && rawBal !== null && rawBal !== "" && Number.isFinite(Number(rawBal)) ? Number(rawBal) : null;

  const handleStartTreatment = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickStatusChange) {
      onQuickStatusChange(appt.id, "in_treatment");
    }
    await openVisitWithBackendSync(appt, pat, onOpenVisit ? () => onOpenVisit(appt) : undefined);
    showToast(`Пациент «${pName}» в кресле: открыта медкарта`, "success");
  };

  const handleOpenActiveVisit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await openVisitWithBackendSync(appt, pat, onOpenVisit ? () => onOpenVisit(appt) : undefined);
  };

  const handleOpenCheckout = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pid = pat?.id || appt.patientId;
    if (pid) {
      usePatientStore.getState().setSelectedPatientId(pid);
    }
    if (typeof window !== "undefined") {
      window.location.hash = "#finance";
    }
    useAppStore.getState().setCurrentView("finance");
    showToast(`Касса: расчёт «${pName}»`, "info");
  };

  return (
    <div className="schedule-mobile-appt-row">
      <div className="schedule-mobile-time-col">
        <span className="schedule-mobile-time-start">{item.startsAtLocal}</span>
        <span className="schedule-mobile-time-end">– {item.endsAtLocal}</span>
        <span className="schedule-mobile-time-duration">{item.durationMinutes} мин</span>
      </div>

      <div
        className="schedule-mobile-card"
        data-testid="schedule-mobile-appt-card"
        onClick={() => onSelectMobileAppt(appt)}
        role="button"
        tabIndex={0}
        aria-label={`Приём: ${fullPatientName}, ${item.startsAtLocal}, статус: ${statusTheme.label}`}
      >
        <div className={`schedule-mobile-status-stripe ${statusTheme.stripe}`} />

        <div className="schedule-mobile-card-content" data-testid={`appointment-card-clickable-${appt.id}`}>
          <div className="schedule-mobile-card-header">
            <div className="schedule-mobile-patient-group">
              <span className="schedule-mobile-patient-name" title={fullPatientName}>{pName}</span>
              {toothBadge && <span className="schedule-mobile-tooth-badge">{toothBadge}</span>}
            </div>
            <div className="schedule-mobile-header-end">
              <span className={`schedule-mobile-status-badge ${statusTheme.badgeBg}`}>{statusTheme.label}</span>
              <ChevronRightIcon size={18} className="text-[var(--muted,#64748b)] shrink-0" />
            </div>
          </div>

          <div className="schedule-mobile-procedure-row">
            <span className="schedule-mobile-procedure-text">{appt.reason || "Первичный осмотр / консультация"}</span>
          </div>

          <div className="schedule-mobile-card-footer">
            <div className="schedule-mobile-meta-chips">
              {(chair || doc) && (
                <span className="schedule-mobile-doctor-chair-chip">
                  {chair?.name || "Кабинет"}{doc ? ` · ${formatDoctorShortName(doc.fullName)}` : ""}
                </span>
              )}

              {balance !== null && (
                <span className={`schedule-mobile-balance-chip ${balance > 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" : balance < 0 ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30" : "bg-slate-500/10 text-slate-600 dark:text-slate-400"}`}>
                  {balance > 0 ? `+${balance.toLocaleString("ru-RU")} ₽` : balance < 0 ? `Долг: ${Math.abs(balance).toLocaleString("ru-RU")} ₽` : "Оплачено"}
                </span>
              )}

              {allergyText && (
                <span className="schedule-mobile-allergy-chip" title={allergyText}>
                  <AlertTriangle size={10} className="shrink-0" />
                  <span>{allergyText}</span>
                </span>
              )}
            </div>

            <div className="schedule-mobile-card-actions-col">
              {appt.status === "in_treatment" ? (
                <button
                  type="button"
                  className="schedule-mobile-chair-action-btn btn-active-visit"
                  onClick={handleOpenActiveVisit}
                  title="Открыть карту приёма"
                  data-testid={`mobile-chair-btn-${appt.id}`}
                >
                  <Stethoscope size={15} />
                  <span>В приём</span>
                </button>
              ) : appt.status === "completed" ? (
                <button
                  type="button"
                  className="schedule-mobile-chair-action-btn btn-pay"
                  onClick={handleOpenCheckout}
                  title="Принять оплату / Касса"
                  data-testid={`mobile-pay-btn-${appt.id}`}
                >
                  <CreditCard size={15} />
                  <span>Чек</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="schedule-mobile-chair-action-btn btn-chair"
                  onClick={handleStartTreatment}
                  title="Пациент в кресле (Начать приём)"
                  data-testid={`mobile-chair-btn-${appt.id}`}
                >
                  <Stethoscope size={15} />
                  <span>В кресло</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
