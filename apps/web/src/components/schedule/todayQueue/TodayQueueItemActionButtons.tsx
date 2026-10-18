import React from "react";
import { CheckCircle2, CreditCard, DoorOpen, RotateCcw, UserCheck, UserX, XCircle } from "lucide-react";
import type { PatientQueueAction, PatientQueueItem } from "@dental/shared";

export interface TodayQueueItemActionButtonsProps {
  item: PatientQueueItem;
  inFlightActionId: string | null;
  onOpenVisit?: ((appointmentId: string) => void) | undefined;
  onOpenPayment?: ((appointmentId: string) => void) | undefined;
  handleActionClick: (item: PatientQueueItem, action: PatientQueueAction) => Promise<void>;
}

export function TodayQueueItemActionButtons({
  item,
  inFlightActionId,
  onOpenVisit,
  onOpenPayment,
  handleActionClick,
}: TodayQueueItemActionButtonsProps) {
  const isPrimaryBusy = inFlightActionId === `${item.id}-${item.primaryAction?.actionId}`;

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {onOpenVisit && (
        <button
          type="button"
          onClick={() => onOpenVisit(item.id)}
          className="inline-flex h-9 min-h-[36px] sm:h-9 min-h-[44px] sm:min-h-[36px] items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer select-none transition-colors"
          title="Открыть медицинскую карту / дневник визита"
        >
          Прием
        </button>
      )}

      {onOpenPayment && item.operationalStatus === "ready_for_checkout" && (
        <button
          type="button"
          onClick={() => onOpenPayment(item.id)}
          className="inline-flex h-9 min-h-[36px] sm:h-9 min-h-[44px] sm:min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-bold text-amber-800 hover:bg-amber-500/20 dark:text-amber-200 cursor-pointer select-none transition-colors"
          title="Открыть кассу для оплаты"
        >
          <CreditCard size={13} />
          Касса
        </button>
      )}

      {item.primaryAction && (
        <button
          type="button"
          disabled={isPrimaryBusy}
          data-testid={`queue-primary-action-${item.id}`}
          onClick={() => handleActionClick(item, item.primaryAction!)}
          className={`inline-flex h-9 min-h-[36px] sm:h-9 min-h-[44px] sm:min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all shadow-2xs select-none ${
            item.primaryAction.buttonVariant === "primary"
              ? "bg-[var(--teal,var(--brand-primary))] text-white hover:opacity-90"
              : item.primaryAction.buttonVariant === "success"
                ? "bg-green-600 text-white hover:bg-green-700"
                : item.primaryAction.buttonVariant === "warning"
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-slate-700 text-white hover:bg-slate-800"
          } ${isPrimaryBusy ? "opacity-60 cursor-not-allowed" : ""}`}
          title={item.primaryAction.descriptionRu}
        >
          {item.primaryAction.iconName === "UserCheck" && <UserCheck size={14} className="shrink-0" />}
          {item.primaryAction.iconName === "DoorOpen" && <DoorOpen size={14} className="shrink-0" />}
          {item.primaryAction.iconName === "CreditCard" && <CreditCard size={14} className="shrink-0" />}
          {item.primaryAction.iconName === "CheckCircle2" && <CheckCircle2 size={14} className="shrink-0" />}
          {item.primaryAction.iconName === "RotateCcw" && <RotateCcw size={14} className="shrink-0" />}
          <span>{item.primaryAction.labelRu}</span>
        </button>
      )}

      {item.secondaryActions.length > 0 &&
        item.secondaryActions.slice(0, 1).map((secAction) => (
          <button
            key={secAction.actionId}
            type="button"
            data-testid={`queue-secondary-action-${item.id}-${secAction.actionId}`}
            onClick={() => handleActionClick(item, secAction)}
            className="inline-flex h-9 min-h-[36px] sm:h-9 min-h-[44px] sm:min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-2.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--paper-soft)] hover:text-[var(--ink)] cursor-pointer select-none transition-colors"
            title={secAction.labelRu}
          >
            {secAction.iconName === "RotateCcw" && <RotateCcw size={12} />}
            {secAction.iconName === "UserX" && <UserX size={12} />}
            {secAction.iconName === "XCircle" && <XCircle size={12} />}
            {secAction.iconName === "CheckCircle2" && <CheckCircle2 size={12} />}
            <span>{secAction.labelRu}</span>
          </button>
        ))}
    </div>
  );
}
