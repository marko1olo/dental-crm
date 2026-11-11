import React from "react";

export interface QuickAssistantSelectorProps {
  isSoloClinic: boolean;
  assistantUserId: string | null;
  setAssistantUserId: (id: string | null) => void;
  assistants: Array<{ id: string; fullName: string }>;
}

export function QuickAssistantSelector({
  isSoloClinic,
  assistantUserId,
  setAssistantUserId,
  assistants,
}: QuickAssistantSelectorProps) {
  if (isSoloClinic || !assistants || assistants.length === 0) return null;

  return (
    <div className="sm:col-span-2">
      <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
        Ассистент
      </label>
      <select
        value={assistantUserId || ""}
        onChange={(e) => setAssistantUserId(e.target.value || null)}
        className="w-full px-3 py-2 h-11 min-h-[44px] leading-normal rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
        data-testid="select-booking-assistant"
      >
        <option value="">-- Без ассистента (соло-приём) --</option>
        {assistants.map((a) => (
          <option key={a.id} value={a.id}>{a.fullName}</option>
        ))}
      </select>
    </div>
  );
}
