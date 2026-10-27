import React from "react";
import { Phone, MessageSquare, Copy, Check, ExternalLink, AlertTriangle } from "lucide-react";
import type { Patient } from "@dental/shared";

export interface ScheduleInspectorPatientCardProps {
  pName: string;
  patientAgeLabel: string | null;
  patObj?: Patient | undefined;
  pPhone: string;
  isCopiedPhone: boolean;
  pBalance: number | null;
  pAllergyAlert: string | null;
  onOpenPatientCard: () => void;
  onCopyPhone: () => void;
  onWhatsApp: () => void;
}

export const ScheduleInspectorPatientCard: React.FC<ScheduleInspectorPatientCardProps> = ({
  pName,
  patientAgeLabel,
  patObj,
  pPhone,
  isCopiedPhone,
  pBalance,
  pAllergyAlert,
  onOpenPatientCard,
  onCopyPhone,
  onWhatsApp,
}) => (
  <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs flex flex-col gap-2">
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-col min-w-0">
        <span
          className="font-extrabold text-[14px] text-[var(--ink)] hover:text-sky-600 cursor-pointer tracking-tight transition-colors"
          onClick={onOpenPatientCard}
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
        onClick={onOpenPatientCard}
        className="p-1 rounded-md text-[var(--muted)] hover:text-sky-600 hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
        title="Перейти в карту пациента"
      >
        <ExternalLink size={14} />
      </button>
    </div>

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
            onClick={onCopyPhone}
            className="p-1 rounded hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            title="Скопировать номер телефона"
          >
            {isCopiedPhone ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>
          <button
            type="button"
            onClick={onWhatsApp}
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

    {pBalance !== null && (
      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--line)]">
        <span className="text-[var(--muted)]">Баланс счёта:</span>
        <span
          className={`font-bold ${pBalance < 0 ? "text-rose-600 dark:text-rose-400" : pBalance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted)]"}`}
        >
          {pBalance < 0 ? `Долг: ${Math.abs(pBalance).toLocaleString("ru-RU")} ₽` : pBalance > 0 ? `Аванс: +${pBalance.toLocaleString("ru-RU")} ₽` : "0 ₽"}
        </span>
      </div>
    )}

    {pAllergyAlert && (
      <div className="flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-300 bg-rose-500/10 p-1.5 rounded-md border border-rose-500/30">
        <AlertTriangle size={12} className="shrink-0 text-rose-600" />
        <span className="truncate">{pAllergyAlert}</span>
      </div>
    )}
  </div>
);
