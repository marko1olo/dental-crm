import React, { useState } from "react";
import {
  Phone,
  MessageSquare,
  Copy,
  Check,
  Clock,
  User,
  Armchair,
  X,
  FileText,
  AlertTriangle,
  ExternalLink,
  Edit3,
  Calendar,
} from "lucide-react";
import type { Appointment, Dashboard, Patient, StaffMember } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { usePatientStore } from "../../../store/patientStore";
import { useAppStore } from "../../../store/appStore";
import {
  formatDoctorShortName,
  getDoctorSpecialtyTheme,
  isAppointmentCito,
  resolvePatientBalance,
  getPatientAllergyAlert,
  extractTeethList,
  formatRussianAge,
  getNormalizedAppointmentStatusLabel,
  getAppointmentStatusBadgeClasses,
  isAppointmentInChair,
  sanitizeScheduleCardText,
} from "../appointmentCardHelpers";
import { DentalToothIcon } from "../DentalToothIcon";

export interface ScheduleInspectorAppointmentDetailsProps {
  appointment: Appointment;
  onDeselect: () => void;
  dashboard?: Dashboard | null;
  patientLookupMap: Map<string, Patient>;
  staffLookupMap: Map<string, StaffMember>;
  toDateTimeLocalValue: (iso: string, tz?: string | null) => string;
  timezone?: string;
  appointmentLabels?: Record<string, string>;
  onQuickStatusChange?: (id: string, status: Appointment["status"]) => Promise<void> | void;
  onOpenVisit?: (appointment: Appointment) => void;
  onEditAppointment?: (appointment: Appointment) => void;
}

export const ScheduleInspectorAppointmentDetails: React.FC<ScheduleInspectorAppointmentDetailsProps> = ({
  appointment: a,
  onDeselect,
  dashboard,
  patientLookupMap,
  staffLookupMap,
  toDateTimeLocalValue,
  timezone = "Europe/Moscow",
  appointmentLabels,
  onQuickStatusChange,
  onOpenVisit,
  onEditAppointment,
}) => {
  const [isCopiedPhone, setIsCopiedPhone] = useState(false);

  const patObj = a.patientId ? patientLookupMap.get(a.patientId) : undefined;
  const pName = patObj?.fullName || (a as any).patient?.fullName || (a as any).patientName || "Пациент";
  const pPhone = patObj?.phone || (a as any).patient?.phone || "";

  const aStart = toDateTimeLocalValue(a.startsAt, timezone).slice(11, 16);
  const aEnd = toDateTimeLocalValue(a.endsAt, timezone).slice(11, 16);

  const diffMs = Date.parse(a.endsAt) - Date.parse(a.startsAt);
  const durationMin = (Number.isFinite(diffMs) && diffMs > 0 ? Math.round(diffMs / 60000) : 0) || (a as any).durationMinutes || 30;

  const docObj = a.doctorUserId ? staffLookupMap.get(a.doctorUserId) : undefined;
  const doctorSpecialty = docObj?.specialty || (Array.isArray(docObj?.specialties) ? docObj?.specialties[0] : undefined) || docObj?.role;
  const docTheme = getDoctorSpecialtyTheme(doctorSpecialty);
  const docName = docObj?.fullName || a.doctorUserId || "Врач не назначен";

  const chairObj = dashboard?.clinicSettings?.chairs?.find((c) => c.id === a.chairId);
  const chairName = chairObj?.name || (a.chairId ? `Кресло ${a.chairId}` : "Кресло не указано");

  const isCito = isAppointmentCito(a);
  const pBalance = resolvePatientBalance(patObj);
  const pAllergyAlert = getPatientAllergyAlert(patObj, a?.reason);

  let patientAgeLabel: string | null = null;
  if (patObj?.birthDate) {
    const bDate = new Date(patObj.birthDate);
    if (!Number.isNaN(bDate.getTime())) {
      const ageYears = Math.floor((Date.now() - bDate.getTime()) / (365.25 * 24 * 3600 * 1000));
      if (ageYears > 0 && ageYears < 120) patientAgeLabel = formatRussianAge(ageYears);
    }
  }

  const teethList = extractTeethList(a);
  const procedureLabel = sanitizeScheduleCardText(a.reason || (a as any).serviceTitle || "Приём") || "Консультация и осмотр";
  const cleanComment = sanitizeScheduleCardText(a.comment);
  const normalizedStatus = getNormalizedAppointmentStatusLabel(a.status, appointmentLabels);

  const handleCopyPhone = () => {
    if (!pPhone) return;
    navigator.clipboard.writeText(pPhone);
    setIsCopiedPhone(true);
    showToast(`Телефон ${pPhone} скопирован`, "success", 2000);
    setTimeout(() => setIsCopiedPhone(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!pPhone) return;
    const cleanDigits = pPhone.replace(/\D/g, "");
    const formattedPhone = cleanDigits.startsWith("8") ? `7${cleanDigits.slice(1)}` : cleanDigits;
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
  };

  const handleOpenPatientCard = () => {
    if (a.patientId) {
      usePatientStore.getState().setSelectedPatientId(a.patientId);
      useAppStore.getState().setCurrentView("patients");
      showToast(`Открыта карта: ${pName}`, "info");
    }
  };

  const handleOpenVisitClick = () => {
    if (a.patientId) {
      usePatientStore.getState().setSelectedPatientId(a.patientId);
    }
    if (onOpenVisit) {
      onOpenVisit(a);
    } else {
      if (typeof window !== "undefined") {
        window.location.hash = "#visit";
      }
      useAppStore.getState().setCurrentView("visit");
      showToast(`Открыт приём: ${pName}`, "info");
    }
  };

  return (
    <div
      className="schedule-inspector-appointment flex flex-col gap-3 text-xs select-none"
      data-testid="schedule-inspector-appointment"
      data-appointment-id={a.id}
    >
      {/* 1. Header: Time & Chair Bar + Deselect Button */}
      <div className="flex items-center justify-between gap-1 border-b border-[var(--line)] pb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="font-extrabold text-[13px] text-[var(--ink)] font-mono flex items-center gap-1">
            <Clock size={13} className="text-sky-600 dark:text-sky-400 shrink-0" />
            <span>{`${aStart} – ${aEnd}`}</span>
          </span>
          <span className="text-[11px] font-medium text-[var(--muted)]">
            {`(${durationMin} мин)`}
          </span>
          {isCito && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-extrabold animate-pulse">
              СРОЧНО
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDeselect}
          className="w-6 h-6 rounded-md hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer transition-colors"
          title="Закрыть карточку приёма"
          aria-label="Закрыть инспектор приёма"
          data-testid="schedule-inspector-close-btn"
        >
          <X size={15} />
        </button>
      </div>

      {/* 2. Chair & Doctor Badge */}
      <div className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]/50 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1 text-[11px]">
          <span className="text-[var(--muted)] flex items-center gap-1">
            <Armchair size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Кабинет / Кресло:</span>
          </span>
          <span className="font-bold text-[var(--ink)]">{chairName}</span>
        </div>
        <div className="flex items-center justify-between gap-1 text-[11px]">
          <span className="text-[var(--muted)] flex items-center gap-1">
            <User size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Лечащий врач:</span>
          </span>
          <span className="font-bold text-[var(--ink)] truncate max-w-[170px]" title={docName}>
            {formatDoctorShortName(docName)}
          </span>
        </div>
        {docTheme && (
          <div className="self-end">
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${docTheme.badgeClass}`}>
              {docTheme.label}
            </span>
          </div>
        )}
      </div>

      {/* 3. Patient Info Card with Quick Actions */}
      <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span
              className="font-extrabold text-[14px] text-[var(--ink)] hover:text-sky-600 cursor-pointer tracking-tight transition-colors"
              onClick={handleOpenPatientCard}
              title="Открыть медицинскую карту пациента"
              data-testid="schedule-inspector-patient-fio"
            >
              {pName}
            </span>
            {patientAgeLabel && (
              <span className="text-[11px] text-[var(--muted)]">
                {patientAgeLabel} {patObj?.birthDate ? `(${new Date(patObj.birthDate).toLocaleDateString("ru-RU")})` : ""}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleOpenPatientCard}
            className="p-1 rounded-md text-[var(--muted)] hover:text-sky-600 hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
            title="Перейти в карту пациента"
          >
            <ExternalLink size={14} />
          </button>
        </div>

        {/* Phone & Communications Bar */}
        {pPhone ? (
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-[var(--line)]">
            <a
              href={`tel:${pPhone}`}
              className="text-[12px] font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1.5"
              title="Позвонить пациенту"
            >
              <Phone size={12} className="shrink-0" />
              <span>{pPhone}</span>
            </a>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyPhone}
                className="p-1 rounded hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                title="Скопировать номер телефона"
              >
                {isCopiedPhone ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
              <button
                type="button"
                onClick={handleWhatsApp}
                className="p-1 rounded hover:bg-[var(--paper-soft)] text-emerald-600 hover:text-emerald-500 transition-colors cursor-pointer"
                title="Написать в WhatsApp"
              >
                <MessageSquare size={13} />
              </button>
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-[var(--muted)] italic pt-1 border-t border-[var(--line)]">
            Телефон не указан
          </span>
        )}

        {/* Patient Financial Balance */}
        {pBalance !== null && (
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--line)]">
            <span className="text-[var(--muted)]">Баланс счёта:</span>
            <span
              className={`font-bold ${
                pBalance < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : pBalance > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-[var(--muted)]"
              }`}
            >
              {pBalance < 0
                ? `Долг: ${Math.abs(pBalance).toLocaleString("ru-RU")} ₽`
                : pBalance > 0
                  ? `Аванс: +${pBalance.toLocaleString("ru-RU")} ₽`
                  : "0 ₽"}
            </span>
          </div>
        )}

        {/* Patient Allergy Alert */}
        {pAllergyAlert && (
          <div className="flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-300 bg-rose-500/10 p-1.5 rounded-md border border-rose-500/30">
            <AlertTriangle size={12} className="shrink-0 text-rose-600" />
            <span className="truncate">{pAllergyAlert}</span>
          </div>
        )}
      </div>

      {/* 4. Procedure & Clinical Details */}
      <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/40 flex flex-col gap-1.5">
        <div className="flex items-start gap-1.5">
          <DentalToothIcon size={14} className="text-sky-600 shrink-0 mt-0.5" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-[12px] text-[var(--ink)] leading-snug">
              {procedureLabel}
            </span>
            {cleanComment && (
              <p className="text-[11px] text-[var(--muted)] mt-1 whitespace-pre-wrap leading-relaxed">
                {cleanComment}
              </p>
            )}
          </div>
        </div>

        {/* FDI Teeth list */}
        {teethList.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-[var(--line)]">
            <span className="text-[10px] text-[var(--muted)] font-medium">Зубы FDI:</span>
            {teethList.map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 5. 1-Click Status Transitions (StomX Flow) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--muted)] font-medium">Статус приёма:</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getAppointmentStatusBadgeClasses(
              a.status,
            )}`}
          >
            {normalizedStatus}
          </span>
        </div>

        {/* 1-Click Status Buttons Grid */}
        {onQuickStatusChange && (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => onQuickStatusChange(a.id, "confirmed")}
              className={`h-7 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                a.status === "confirmed"
                  ? "bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-500/40 ring-1 ring-teal-500/30"
                  : "bg-[var(--paper)] hover:bg-teal-500/10 text-[var(--ink)] border-[var(--line)] hover:border-teal-400"
              }`}
              title="Отметить как подтверждённый"
              data-testid="schedule-inspector-status-confirmed"
            >
              <Check size={12} className="text-teal-600" />
              <span>Подтверждён</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickStatusChange(a.id, "arrived")}
              className={`h-7 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                a.status === "arrived"
                  ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40 ring-1 ring-amber-500/30"
                  : "bg-[var(--paper)] hover:bg-amber-500/10 text-[var(--ink)] border-[var(--line)] hover:border-amber-400"
              }`}
              title="Пациент пришёл в клинику и ожидает в холле"
              data-testid="schedule-inspector-status-arrived"
            >
              <Clock size={12} className="text-amber-600" />
              <span>В холле</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickStatusChange(a.id, "in_treatment")}
              className={`h-7 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                isAppointmentInChair(a.status)
                  ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/50 ring-1 ring-emerald-500/30"
                  : "bg-[var(--paper)] hover:bg-emerald-500/10 text-[var(--ink)] border-[var(--line)] hover:border-emerald-400"
              }`}
              title="Пациент сидит в кресле врача"
              data-testid="schedule-inspector-status-in-chair"
            >
              <Armchair size={12} className="text-emerald-600" />
              <span>В кресле</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickStatusChange(a.id, "completed")}
              className={`h-7 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                a.status === "completed"
                  ? "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/40 ring-1 ring-violet-500/30"
                  : "bg-[var(--paper)] hover:bg-violet-500/10 text-[var(--ink)] border-[var(--line)] hover:border-violet-400"
              }`}
              title="Приём завершён"
              data-testid="schedule-inspector-status-completed"
            >
              <Check size={12} className="text-violet-600" />
              <span>Завершён</span>
            </button>
          </div>
        )}
      </div>

      {/* 6. Primary Action Buttons */}
      <div className="flex flex-col gap-1.5 pt-1">
        <button
          type="button"
          onClick={handleOpenVisitClick}
          className="schedule-inspector-start-visit-btn primary-button h-9 min-h-[36px] w-full rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm bg-sky-600 hover:bg-sky-500 text-white"
          data-testid="schedule-inspector-open-visit-btn"
          data-action-testid="schedule-inspector-start-visit-btn"
          title="Открыть карту приёма и начать приём"
          aria-label="Начать приём"
        >
          <Check size={14} className="shrink-0 stroke-[2.5]" />
          <span>✓ Начать приём</span>
        </button>

        {onEditAppointment && (
          <button
            type="button"
            onClick={() => onEditAppointment(a)}
            className="secondary-button h-8 min-h-[32px] w-full rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
            data-testid="schedule-inspector-edit-btn"
          >
            <Edit3 size={13} className="shrink-0 text-[var(--muted)]" />
            <span>Редактировать запись</span>
          </button>
        )}
      </div>

      {/* 7. Creation & Audit Footnote */}
      <div className="text-[10px] text-[var(--muted)] text-center pt-2 border-t border-[var(--line)]">
        Запись #{a.id.slice(0, 8)}
        {a.createdAt && (
          <span> · Создана {new Date(a.createdAt).toLocaleDateString("ru-RU")}</span>
        )}
      </div>
    </div>
  );
};
