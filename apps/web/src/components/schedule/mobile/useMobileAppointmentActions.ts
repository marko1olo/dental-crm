import type { Appointment } from "@dental/shared";

interface MobileAppointmentActionParams {
  onAppointmentMove?: ((id: string, patch: any) => Promise<unknown> | void | any) | undefined;
}

export function useMobileAppointmentActions({ onAppointmentMove }: MobileAppointmentActionParams) {
  const handleAdjustDuration = async (appt: Appointment, delta: number) => {
    if (!onAppointmentMove) return;
    const start = new Date(appt.startsAt);
    const end = new Date(appt.endsAt);
    const newEnd = new Date(end.getTime() + delta * 60000);
    if (newEnd <= start) return;
    await onAppointmentMove(appt.id, { endsAt: newEnd.toISOString() });
  };

  const handleShiftLateness = async (appt: Appointment, shift: number) => {
    if (!onAppointmentMove) return;
    const start = new Date(appt.startsAt);
    const end = new Date(appt.endsAt);
    await onAppointmentMove(appt.id, {
      startsAt: new Date(start.getTime() + shift * 60000).toISOString(),
      endsAt: new Date(end.getTime() + shift * 60000).toISOString(),
    });
  };

  const handleReassignChair = async (appt: Appointment, chairId: string | null) => {
    if (!onAppointmentMove) return;
    await onAppointmentMove(appt.id, chairId ? { chairId } : {});
  };

  const handleReassignDoctor = async (appt: Appointment, doctorUserId: string) => {
    if (!onAppointmentMove) return;
    await onAppointmentMove(appt.id, { doctorUserId });
  };

  return {
    handleAdjustDuration,
    handleShiftLateness,
    handleReassignChair,
    handleReassignDoctor,
  };
}
