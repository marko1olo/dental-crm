import React from "react";
import { AlertTriangle, Check, UserCheck } from "lucide-react";
import { formatDoctorShortName } from "../ScheduleGrid";
import { checkDoctorOnShift } from "./doctorChairResolution";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";

export function DoctorSelector({
  isSoloDoctor,
  dutyDoc,
  dutyDoctorId,
  dutyDocHours,
  doctors,
  doctorUserId,
  onDoctorChange,
  chairDoctorAssignments,
}: {
  isSoloDoctor: boolean;
  dutyDoc: { id: string; fullName: string } | null;
  dutyDoctorId: string | null;
  dutyDocHours: string | null;
  doctors: Array<{ id: string; fullName: string; specialties?: string[] }>;
  doctorUserId: string;
  onDoctorChange: (id: string) => void;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
}) {
  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block">
          Врач {isSoloDoctor ? "(соло-врач)" : "*"}
        </label>
        {dutyDoc && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--teal-dark,var(--teal))]"
            data-testid="duty-doctor-badge"
          >
            <UserCheck size={12} className="shrink-0 text-[var(--teal)]" />
            <span>
              Дежурный: {formatDoctorShortName(dutyDoc.fullName)} ({dutyDocHours || "смена"})
            </span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap" data-testid="appointment-doctor-chips-strip">
        {doctors.map((d) => {
          const isSelected = doctorUserId === d.id;
          const onShift = checkDoctorOnShift(d.id, dutyDoctorId, dutyDoc, chairDoctorAssignments);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onDoctorChange(d.id)}
              data-testid={`chip-doctor-${d.id}`}
              className={`appointment-modal-doctor-chip ${isSelected ? "active" : ""} shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer select-none`}
              style={{
                height: "32px",
                padding: "0 12px",
                borderRadius: "10px",
                border: isSelected ? "1px solid var(--teal)" : "1px solid var(--line-strong)",
                backgroundColor: isSelected ? "var(--teal)" : "var(--paper-soft)",
                color: isSelected ? "#ffffff" : "var(--ink)",
                fontWeight: isSelected ? 700 : 600,
              }}
              title={onShift ? "Врач на смене в клинике" : "Врач доступен для плановой записи"}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: isSelected ? "#ffffff" : onShift ? "#10b981" : "var(--teal)",
                  flexShrink: 0,
                }}
              />
              <span className="whitespace-nowrap">{formatDoctorShortName(d.fullName)}</span>
              {isSelected && <Check size={12} className="shrink-0 ml-0.5" />}
            </button>
          );
        })}
      </div>

      <select
        value={doctorUserId}
        onChange={(e) => onDoctorChange(e.target.value)}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        data-testid="select-appointment-doctor"
      >
        <option value="">-- Выберите врача --</option>
        {doctors.map((d) => (
          <option key={d.id} value={d.id}>
            {d.fullName}
          </option>
        ))}
      </select>

      {dutyDoc && doctorUserId && dutyDoc.id && doctorUserId !== dutyDoc.id && (
        <div
          className="mt-1 p-2 rounded-xl text-xs bg-amber-500/10 text-amber-900 dark:text-amber-100 border border-amber-500/30 flex items-start gap-1.5"
          data-testid="duty-doctor-override-note"
        >
          <AlertTriangle size={13} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">
              На кресле дежурит {formatDoctorShortName(dutyDoc.fullName)}. Запись доступна в штатном режиме.
            </span>
            <span className="text-[11px] text-[var(--muted)] block">
              Врач может принять пациента на этой установке. Запись не блокируется.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
