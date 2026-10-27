import type { WaitlistUrgency } from "./waitlistTypes";

export function detectWaitlistUrgency(
  item?:
    | {
        priorityLevel?: string | null;
        urgency?: string | null;
        notes?: string | null;
        treatmentCategory?: string | null;
      }
    | string
    | null,
  explicitPriority?: string | null,
): WaitlistUrgency {
  if (!item && !explicitPriority) return "routine";

  if (typeof item === "string") {
    const text = item.toLowerCase();
    if (
      explicitPriority === "urgent" ||
      explicitPriority === "acute_pain" ||
      explicitPriority === "high" ||
      text.includes("острая") ||
      text.includes("боль") ||
      text.includes("cito") ||
      text.includes("неотложн") ||
      text.includes("пульпит")
    ) {
      return "acute_pain";
    }
    if (
      text.includes("орто") ||
      text.includes("эндо") ||
      text.includes("канал") ||
      text.includes("коронк") ||
      text.includes("брекет") ||
      text.includes("элайнер") ||
      text.includes("слепок")
    ) {
      return "ortho_endo";
    }
    if (
      text.includes("гигиен") ||
      text.includes("чистк") ||
      text.includes("airflow") ||
      text.includes("air-flow") ||
      text.includes("уз") ||
      text.includes("отбеливан") ||
      text.includes("налет")
    ) {
      return "hygiene";
    }
    return "routine";
  }

  const prio = item?.priorityLevel || explicitPriority;
  if (
    item?.urgency === "acute_pain" ||
    prio === "urgent" ||
    prio === "acute_pain" ||
    prio === "high"
  ) {
    return "acute_pain";
  }
  if (item?.urgency === "ortho_endo" || prio === "treatment_plan") {
    return "ortho_endo";
  }
  if (item?.urgency === "hygiene") {
    return "hygiene";
  }

  const text = `${item?.notes || ""} ${item?.treatmentCategory || ""}`.toLowerCase();
  if (
    text.includes("острая") ||
    text.includes("боль") ||
    text.includes("cito") ||
    text.includes("неотложн") ||
    text.includes("пульпит")
  ) {
    return "acute_pain";
  }
  if (
    text.includes("орто") ||
    text.includes("эндо") ||
    text.includes("канал") ||
    text.includes("коронк") ||
    text.includes("брекет") ||
    text.includes("элайнер") ||
    text.includes("слепок")
  ) {
    return "ortho_endo";
  }
  if (
    text.includes("гигиен") ||
    text.includes("чистк") ||
    text.includes("airflow") ||
    text.includes("air-flow") ||
    text.includes("уз") ||
    text.includes("отбеливан") ||
    text.includes("налет")
  ) {
    return "hygiene";
  }

  return "routine";
}
