import React from "react";
import { SlidersHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import { TREATMENT_CATEGORIES } from "../waitlistMatchScoring";
import { WaitlistExpiryAndNotes } from "./WaitlistExpiryAndNotes";

export interface WaitlistAdvancedParamsProps {
  showAdvancedParams: boolean;
  setShowAdvancedParams: React.Dispatch<React.SetStateAction<boolean>>;
  treatmentCategory?: string;
  setTreatmentCategory?: (cat: string) => void;
  preferredDays?: string[];
  setPreferredDays?: (days: string[]) => void;
  expiryDays?: number | null;
  setExpiryDays?: (days: number | null) => void;
  customExpiryDate?: string;
  setCustomExpiryDate?: (date: string) => void;
  notes?: string;
  setNotes?: (notes: string) => void;
}

export const WaitlistAdvancedParams: React.FC<WaitlistAdvancedParamsProps> = ({
  showAdvancedParams, setShowAdvancedParams, treatmentCategory, setTreatmentCategory,
  preferredDays = ["weekdays"], setPreferredDays, expiryDays = 7, setExpiryDays,
  customExpiryDate = "", setCustomExpiryDate, notes = "", setNotes,
}) => {
  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setShowAdvancedParams((prev) => !prev)}
        className="text-[11px] font-semibold text-[var(--teal)] hover:text-[var(--teal-dark)] inline-flex items-center gap-1 cursor-pointer select-none"
      >
        <SlidersHorizontal size={12} />
        <span>
          {showAdvancedParams ? "Скрыть клинические параметры" : "Дополнительные параметры (направление, дни, примечание)..."}
        </span>
        {showAdvancedParams ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {showAdvancedParams && (
        <div className="mt-2.5 p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-3 animate-in fade-in duration-100">
          <div className="space-y-1">
            <label htmlFor="waitlist-select-category" className="text-[11px] font-semibold text-[var(--muted)] block">
              Направление / Причина обращения
            </label>
            <select
              id="waitlist-select-category"
              value={treatmentCategory}
              onChange={(e) => setTreatmentCategory?.(e.target.value)}
              className="w-full h-8 px-2 bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
            >
              <option value="">-- Выберите направление --</option>
              {TREATMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {setPreferredDays && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[var(--muted)] block">Желаемые дни недели</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "weekdays", label: "Пн-Пт (Будни)" },
                  { id: "weekend", label: "Сб-Вс (Выходные)" },
                  { id: "any", label: "Любые дни" },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      if (preferredDays.includes(d.id)) setPreferredDays(preferredDays.filter((x) => x !== d.id));
                      else setPreferredDays([...preferredDays, d.id]);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer pointer-coarse:min-h-[44px] ${
                      preferredDays.includes(d.id)
                        ? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
                        : "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <WaitlistExpiryAndNotes
            expiryDays={expiryDays} setExpiryDays={setExpiryDays}
            customExpiryDate={customExpiryDate} setCustomExpiryDate={setCustomExpiryDate}
            notes={notes} setNotes={setNotes}
          />
        </div>
      )}
    </div>
  );
};
