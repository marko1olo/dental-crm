import React from "react";

export interface WaitlistExpiryAndNotesProps {
  expiryDays?: number | null;
  setExpiryDays?: (days: number | null) => void;
  customExpiryDate?: string;
  setCustomExpiryDate?: (date: string) => void;
  notes?: string;
  setNotes?: (notes: string) => void;
}

export const WaitlistExpiryAndNotes: React.FC<WaitlistExpiryAndNotesProps> = ({
  expiryDays = 7,
  setExpiryDays,
  customExpiryDate = "",
  setCustomExpiryDate,
  notes = "",
  setNotes,
}) => {
  return (
    <>
      {setExpiryDays && (
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-[var(--muted)] block">Срок ожидания (до даты)</span>
          <div className="flex flex-wrap gap-1.5 items-center">
            {[
              { days: 3, label: "3 дня" },
              { days: 7, label: "7 дней" },
              { days: 14, label: "14 дней" },
              { days: 30, label: "30 дней" },
            ].map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => { setExpiryDays(opt.days); setCustomExpiryDate?.(""); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer pointer-coarse:min-h-[44px] ${
                  expiryDays === opt.days && !customExpiryDate
                    ? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
                    : "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
            {setCustomExpiryDate && (
              <input
                type="date"
                value={customExpiryDate}
                onChange={(e) => { setCustomExpiryDate(e.target.value); setExpiryDays(null); }}
                className="h-7 px-2 bg-[var(--paper-soft)] border border-[var(--line)] rounded-md text-xs text-[var(--ink)]"
              />
            )}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="waitlist-notes" className="text-[11px] font-semibold text-[var(--muted)] block">
          Примечание администратора
        </label>
        <textarea
          id="waitlist-notes"
          value={notes}
          onChange={(e) => setNotes?.(e.target.value)}
          placeholder="Например: Пациент просил перезвонить после 15:00. Готов приехать за 30 минут."
          rows={2}
          className="w-full p-2 bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] resize-none"
        />
      </div>
    </>
  );
};
