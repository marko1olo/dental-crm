import { useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import type { DayGroupingDay, DayGroupingAppointment } from "../scheduleDayGrouping";

export interface QueueAppointmentInvoice {
  id?: string | null | undefined;
  appointmentId?: string | null | undefined;
  visitId?: string | null | undefined;
  status?: string | null | undefined;
  [key: string]: unknown;
}

export interface QueueAppointmentPayment {
  id?: string | null | undefined;
  appointmentId?: string | null | undefined;
  visitId?: string | null | undefined;
  invoiceId?: string | null | undefined;
  status?: string | null | undefined;
  [key: string]: unknown;
}

export interface QueueAppointmentVisit {
  id?: string | null | undefined;
  invoice?: QueueAppointmentInvoice | null | undefined;
  [key: string]: unknown;
}

export type ExtendedQueueAppointment = DayGroupingAppointment & {
  visitId?: string | null | undefined;
  paymentStatus?: string | null | undefined;
  payment_status?: string | null | undefined;
  isPaid?: boolean | null | undefined;
};

export interface ShiftQueueCounts {
  all: number;
  arrived: number;
  inTreatment: number;
  awaitingPayment: number;
}

export interface UseScheduleDayQueueParams {
  scheduleDayGroups: DayGroupingDay[];
  scheduleDateFilter: string;
  clinicToday: string;
  scheduleDoctorFilterId: string | null;
  scheduleChairFilterId: string | null;
  dashboard: Dashboard | null | undefined;
}

export function calculateShiftQueueCounts(
  visibleDayGroups: readonly DayGroupingDay[],
  scheduleDoctorFilterId: string | null,
  scheduleChairFilterId: string | null,
  dashboard: Dashboard | null | undefined,
): ShiftQueueCounts {
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
          const extAppt = appt as ExtendedQueueAppointment;
          const visitId = extAppt.visitId || extAppt.visit?.id;
          const rawInvoice = extAppt.invoice ?? extAppt.visit?.invoice;
          const invoice =
            (rawInvoice as QueueAppointmentInvoice | null | undefined) ??
            (Array.isArray(dashboard?.invoices)
              ? (dashboard.invoices.find(
                  (inv) =>
                    inv?.appointmentId === appt.id ||
                    (Boolean(inv?.visitId) &&
                      (inv.visitId === visitId)),
                ) as QueueAppointmentInvoice | undefined)
              : undefined);

          const invoiceStatus = String(invoice?.status || "")
            .toLowerCase()
            .trim();
          const isInvoicePaid =
            invoiceStatus === "paid" || invoiceStatus === "fully_paid";

          const directPaymentStatus = String(
            extAppt.paymentStatus ||
              extAppt.payment_status ||
              "",
          )
            .toLowerCase()
            .trim();
          const isDirectPaid =
            directPaymentStatus === "paid" ||
            directPaymentStatus === "fully_paid";

          const invoiceId = invoice?.id;
          const matchingPayments = Array.isArray(dashboard?.payments)
            ? dashboard.payments.filter((p) => {
                const paymentRecord = p as unknown as QueueAppointmentPayment;
                return (
                  (Boolean(paymentRecord.appointmentId) && paymentRecord.appointmentId === appt.id) ||
                  (Boolean(visitId) && p.visitId === visitId) ||
                  (Boolean(invoiceId) && paymentRecord.invoiceId === invoiceId)
                );
              })
            : [];
          const hasPaidPayment = matchingPayments.some((p) => {
            const st = String(p?.status || "")
              .toLowerCase()
              .trim();
            return st === "paid" || st === "completed" || st === "success";
          });

          const isPaid =
            isInvoicePaid ||
            isDirectPaid ||
            hasPaidPayment ||
            extAppt.isPaid === true;

          if (!isPaid) {
            awaitingPayment++;
          }
        }
      }
    }
  }
  return { all, arrived, inTreatment, awaitingPayment };
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

  const shiftQueueCounts = useMemo(
    () =>
      calculateShiftQueueCounts(
        visibleDayGroups,
        scheduleDoctorFilterId,
        scheduleChairFilterId,
        dashboard,
      ),
    [visibleDayGroups, scheduleDoctorFilterId, scheduleChairFilterId, dashboard],
  );

  return {
    effectiveSelectedDay,
    selectedDayKey,
    visibleDayGroups,
    visibleAppointmentCount,
    scheduleOverlapCount,
    shiftQueueCounts,
  };
}
