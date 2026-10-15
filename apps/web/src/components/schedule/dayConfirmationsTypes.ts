/**
 * apps/web/src/components/schedule/dayConfirmationsTypes.ts
 * Types and presentations for morning call confirmation panel.
 */

export type ReminderState =
  | "not_queued"
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "suppressed"
  | "cancelled";

export type ConfirmationRow = {
  appointmentId: string;
  startsAt: string;
  status: string;
  patientId: string | null;
  patientName: string;
  phone: string | null;
  doctorName: string | null;
  reminder: {
    state: ReminderState;
    channel: string | null;
    at: string | null;
    detail: string | null;
  };
  patientClickedAt: string | null;
  needsCall: boolean;
};

export type DayConfirmations = {
  date: string;
  timeZone: string;
  summary: {
    total: number;
    confirmed: number;
    awaiting: number;
    cancelled: number;
    noShow: number;
    needsCall: number;
    withoutPhone: number;
  };
  rows: ConfirmationRow[];
  isEmpty: boolean;
};

export const reminderPresentation: Record<
  ReminderState,
  { label: string; tone: "ok" | "warn" | "bad" | "info" | "muted" }
> = {
  delivered: { label: "доставлено", tone: "ok" },
  sent: { label: "отправлено", tone: "info" },
  queued: { label: "в очереди", tone: "info" },
  failed: { label: "не доставлено", tone: "bad" },
  suppressed: { label: "не отправлено", tone: "warn" },
  cancelled: { label: "снято", tone: "muted" },
  not_queued: { label: "не отправлялось", tone: "muted" },
};

export const appointmentStatusLabels: Record<string, string> = {
  planned: "Запланирован",
  confirmed: "Подтверждён",
  arrived: "Пришёл",
  in_treatment: "На лечении",
  completed: "Завершён",
  cancelled: "Отменён",
  no_show: "Не пришёл",
};

export function dayConfirmationsRequestPath(requestedDate: string): string {
  const base = "/api/schedule/day-confirmations";
  const trimmed = requestedDate.trim();
  return trimmed ? `${base}?date=${encodeURIComponent(trimmed)}` : base;
}

export function dayConfirmationsShownDay(
  requestedDate: string,
  loaded: { date: string } | null,
): string {
  return requestedDate.trim() || loaded?.date || "";
}

export function formatTime(value: string, timeZone: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", { timeZone, hour: "2-digit", minute: "2-digit" }).format(parsed);
  } catch {
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(parsed);
  }
}
