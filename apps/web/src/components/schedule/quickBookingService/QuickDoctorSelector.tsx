import { UserCheck } from "lucide-react";
import React from "react";
import { specialtyLabels } from "../../../workspaceUiLabels";
import { formatDoctorShortName } from "../ScheduleGrid";

export interface QuickDoctorSelectorProps {
  doctorUserId: string;
  setDoctorUserId: (id: string) => void;
  doctors: Array<{ id: string; fullName: string; specialties?: string[] }>;
  dutyDoc: { id: string; fullName: string } | null;
  dutyDoctorHours?: string | null;
  currentChair?: { id: string; name: string } | null;
}

export function QuickDoctorSelector({
  doctorUserId,
  setDoctorUserId,
  doctors,
  dutyDoc,
  dutyDoctorHours,
  currentChair,
}: QuickDoctorSelectorProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-[var(--muted)]">Врач</span>
        {dutyDoc && dutyDoc.id !== doctorUserId && (
          <button
            type="button"
            onClick={() => setDoctorUserId(dutyDoc.id)}
            className="text-[10px] text-[var(--teal)] font-bold hover:underline cursor-pointer"
            title="Выбрать дежурного врача по расписанию кресла"
          >
            Дежурный: {formatDoctorShortName(dutyDoc.fullName)}
          </button>
        )}
      </div>
      <select
        value={doctorUserId}
        onChange={(e) => setDoctorUserId(e.target.value)}
        className="w-full px-3 py-2 h-11 min-h-[44px] leading-normal rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
        data-testid="select-booking-doctor"
      >
        <option value="">-- Выберите врача --</option>
        {doctors.map((d) => (
          <option key={d.id} value={d.id}>
            {d.fullName} {d.specialties?.[0] ? `(${specialtyLabels[d.specialties[0]] || d.specialties[0]})` : ""}
          </option>
        ))}
      </select>
      {dutyDoc && (
        <div
          className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/20"
          data-testid="duty-doctor-badge"
        >
          <UserCheck size={13} className="shrink-0 text-[var(--teal)]" />
          <span>Дежурный врач: {formatDoctorShortName(dutyDoc.fullName)} ({dutyDoctorHours || "смена"})</span>
        </div>
      )}
      {dutyDoc && doctorUserId && doctorUserId !== dutyDoc.id && (
        <div
          className="mt-2 p-2 rounded-lg text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
          data-testid="duty-doctor-override-note"
        >
          <span>
            На кресле «{currentChair?.name || "Кресло"}» по графику дежурит {formatDoctorShortName(dutyDoc.fullName)}. Запись создаётся к выбранному врачу (выбор врача не блокируется).
          </span>
        </div>
      )}
    </div>
  );
}
