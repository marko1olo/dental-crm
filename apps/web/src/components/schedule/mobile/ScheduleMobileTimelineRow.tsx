import React from "react";
import { AlertTriangle, ChevronRight as ChevronRightIcon } from "lucide-react";
import type { Appointment, Dashboard } from "@dental/shared";
import { formatDoctorShortName } from "../GridAppointmentCard";
import { formatPatientDisplayFio } from "../appointmentCardHelpers";
import { type TimelineItem, extractToothBadge, resolveMobileAllergyBadge, getStatusTheme } from "./scheduleMobileAgendaTypes";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import { ScheduleMobileGapRow } from "./ScheduleMobileGapRow";

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

        <div className="schedule-mobile-card-content">
          <div className="schedule-mobile-card-header">
            <div className="schedule-mobile-patient-group">
              <span className="schedule-mobile-patient-name" title={fullPatientName}>{pName}</span>
              {toothBadge && <span className="schedule-mobile-tooth-badge">{toothBadge}</span>}
            </div>
            <span className={`schedule-mobile-status-badge ${statusTheme.badgeBg}`}>{statusTheme.label}</span>
          </div>

          <div className="schedule-mobile-procedure-row">
            <span className="schedule-mobile-procedure-text">{appt.reason || "Первичный осмотр / консультация"}</span>
          </div>

          <div className="schedule-mobile-meta-row">
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
        </div>

        <div className="flex items-center pl-1 text-[var(--muted,#64748b)]">
          <ChevronRightIcon size={18} />
        </div>
      </div>
    </div>
  );
};
