import React from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  PhoneCall,
  UserCheck,
} from "lucide-react";
import type { Appointment } from "@dental/shared";

export interface AppointmentMobileStatusButtonsProps {
  handleQuickStatusChange: (status: Appointment["status"]) => Promise<void>;
  onClose: () => void;
}

export function AppointmentMobileStatusButtons({
  handleQuickStatusChange,
  onClose,
}: AppointmentMobileStatusButtonsProps) {
  return (
    <div className="space-y-2">
      <div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
        Сменить статус визита:
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="mobile-sheet-status-planned"
          onClick={() => {
            void handleQuickStatusChange("planned");
            onClose();
          }}
          className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-sky-500/15 border border-sky-500/40 text-sky-800 dark:text-sky-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
        >
          <Clock size={14} />
          <span>Запланирован</span>
        </button>
        <button
          type="button"
          data-testid="mobile-sheet-status-confirmed"
          onClick={() => {
            void handleQuickStatusChange("confirmed");
            onClose();
          }}
          className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-violet-500/15 border border-violet-500/40 text-violet-800 dark:text-violet-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
        >
          <PhoneCall size={14} />
          <span>Подтвержден</span>
        </button>
        <button
          type="button"
          data-testid="mobile-sheet-status-arrived"
          onClick={() => {
            void handleQuickStatusChange("arrived");
            onClose();
          }}
          className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
        >
          <UserCheck size={14} />
          <span>В клинике</span>
        </button>
        <button
          type="button"
          data-testid="mobile-sheet-status-in-treatment"
          onClick={() => {
            void handleQuickStatusChange("in_treatment");
            onClose();
          }}
          className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-[var(--teal-soft)] border border-[var(--teal)]/40 text-[var(--teal-dark)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
        >
          <CalendarCheck size={14} />
          <span>В кресле</span>
        </button>
        <button
          type="button"
          data-testid="mobile-sheet-status-completed"
          onClick={() => {
            void handleQuickStatusChange("completed");
            onClose();
          }}
          className="col-span-2 min-h-[44px] px-3 rounded-xl text-xs font-bold bg-slate-500/15 border border-slate-500/40 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
        >
          <CheckCircle2 size={14} />
          <span>Завершен</span>
        </button>
      </div>
    </div>
  );
}
