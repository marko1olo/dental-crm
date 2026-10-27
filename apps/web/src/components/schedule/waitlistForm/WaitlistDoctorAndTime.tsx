import React from "react";
import type { PreferredTimeOfDay } from "../waitlistMatchScoring";

export interface WaitlistDoctorAndTimeProps {
  preferredDoctorId: string;
  handleDoctorSelect: (id: string) => void;
  doctors: readonly any[];
  addPreferredTime: string;
  onChangeAddPreferredTime?: (time: string) => void;
  setPreferredTimeOfDay?: (times: PreferredTimeOfDay[]) => void;
}

export const WaitlistDoctorAndTime: React.FC<WaitlistDoctorAndTimeProps> = ({
  preferredDoctorId,
  handleDoctorSelect,
  doctors,
  addPreferredTime,
  onChangeAddPreferredTime,
  setPreferredTimeOfDay,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div>
        <label htmlFor="waitlist-select-doctor" className="text-[11px] text-[var(--muted)] font-semibold block mb-0.5">
          Желаемый врач
        </label>
        <select
          id="waitlist-select-doctor"
          value={preferredDoctorId}
          onChange={(e) => handleDoctorSelect(e.target.value)}
          className="w-full h-8 px-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
        >
          <option value="">-- Любой врач клиники --</option>
          {doctors.map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.fullName || d.name} {d.specialty ? `(${d.specialty})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="waitlist-preferred-time" className="text-[11px] text-[var(--muted)] font-semibold block mb-0.5">
          Удобное время суток
        </label>
        <select
          id="waitlist-preferred-time"
          value={addPreferredTime}
          onChange={(e) => {
            if (onChangeAddPreferredTime) onChangeAddPreferredTime(e.target.value);
            if (setPreferredTimeOfDay) {
              const tMap: Record<string, PreferredTimeOfDay[]> = {
                morning: ["morning"],
                day: ["day"],
                evening: ["evening"],
                any: ["morning", "day", "evening"],
              };
              setPreferredTimeOfDay(tMap[e.target.value] || ["morning", "day"]);
            }
          }}
          className="w-full h-8 px-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
        >
          <option value="any">Любое время дня</option>
          <option value="morning">Утро (08:00–12:00)</option>
          <option value="day">День (12:00–17:00)</option>
          <option value="evening">Вечер (17:00–21:00)</option>
        </select>
      </div>
    </div>
  );
};
