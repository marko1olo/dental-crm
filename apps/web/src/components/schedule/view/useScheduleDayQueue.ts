import { useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import type { DayGroupingDay } from "../scheduleDayGrouping";

export interface UseScheduleDayQueueParams {
  scheduleDayGroups: DayGroupingDay[];
  scheduleDateFilter: string;
  clinicToday: string;
  scheduleDoctorFilterId: string | null;
  scheduleChairFilterId: string | null;
  dashboard: Dashboard | null | undefined;
}

export function useScheduleDayQueue({
  scheduleDayGroups,
  scheduleDateFilter,
  clinicToday,
  scheduleDoctorFilterId,
  scheduleChairFilterId,
  dashboard,
}: UseScheduleDayQueueParams) {
  const effectiveSelectedDay = scheduleDateFilter.trim() || clinicToday;
  const selectedDayKey = effectiveSelectedDay;
  const visibleDayGroups = selectedDayKey
    ? scheduleDayGroups.filter((group) => group.dateKey === selectedDayKey)
    : scheduleDayGroups;

  const visibleAppointmentCount = visibleDayGroups.reduce(
    (sum, group) => sum + group.appointmentCount,
    0,
  );

  const scheduleOverlapCount = visibleDayGroups.reduce(
    (sum, group) => sum + group.overlapCount,
    0,
  );

  const shiftQueueCounts = useMemo(() => {
    let all = 0;
    let arrived = 0;
    let inTreatment = 0;
    let awaitingPayment = 0;

    for (const g of visibleDayGroups) {
      for (const r of g.rows) {
        if (r.kind === "appointment") {
          const appt = r.appointment;
          if (
            scheduleDoctorFilterId &&
            appt.doctorUserId !== scheduleDoctorFilterId
          ) {
            continue;
          }
          if (scheduleChairFilterId && appt.chairId !== scheduleChairFilterId) {
            continue;
          }
          all++;
          if (appt.status === "arrived") arrived++;
          else if (appt.status === "in_treatment") inTreatment++;
          else if (appt.status === "completed") {
            const invoice =
              appt.invoice ??
              (appt as any)?.visit?.invoice ??
              (Array.isArray((dashboard as any)?.invoices)
                ? (dashboard as any).invoices.find(
                    (inv: any) =>
                      inv?.appointmentId === appt.id ||
                      (inv?.visitId &&
                        (inv.visitId === (appt as any)?.visitId ||
                          inv.visitId === (appt as any)?.visit?.id)),
                  )
                : undefined);

            const invoiceStatus = String(invoice?.status || "")
              .toLowerCase()
              .trim();
            const isInvoicePaid =
              invoiceStatus === "paid" || invoiceStatus === "fully_paid";

            const directPaymentStatus = String(
              (appt as any)?.paymentStatus ||
                (appt as any)?.payment_status ||
                "",
            )
              .toLowerCase()
              .trim();
            const isDirectPaid =
              directPaymentStatus === "paid" ||
              directPaymentStatus === "fully_paid";

            const visitId = (appt as any)?.visitId || (appt as any)?.visit?.id;
            const matchingPayments = Array.isArray((dashboard as any)?.payments)
              ? (dashboard as any).payments.filter(
                  (p: any) =>
                    (p?.appointmentId && p.appointmentId === appt.id) ||
                    (visitId && p?.visitId && p.visitId === visitId) ||
                    (invoice?.id && p?.invoiceId && p.invoiceId === invoice.id),
                )
              : [];
            const hasPaidPayment = matchingPayments.some((p: any) => {
              const st = String(p?.status || "")
                .toLowerCase()
                .trim();
              return st === "paid" || st === "completed" || st === "success";
            });

            const isPaid =
              isInvoicePaid ||
              isDirectPaid ||
              hasPaidPayment ||
              (appt as any)?.isPaid === true;

            if (!isPaid) {
              awaitingPayment++;
            }
          }
        }
      }
    }
    return { all, arrived, inTreatment, awaitingPayment };
  }, [
    visibleDayGroups,
    scheduleDoctorFilterId,
    scheduleChairFilterId,
    dashboard,
  ]);

  return {
    effectiveSelectedDay,
    selectedDayKey,
    visibleDayGroups,
    visibleAppointmentCount,
    scheduleOverlapCount,
    shiftQueueCounts,
  };
}
