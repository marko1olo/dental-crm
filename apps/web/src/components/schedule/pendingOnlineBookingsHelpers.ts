import type { Appointment, Dashboard } from "@dental/shared";
import type { PatientInfoResult } from "./pendingOnlineBookingsTypes";

export function formatDateTime(startsAt: string, endsAt?: string): string {
  try {
    const d = new Date(startsAt);
    const dateStr = d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      weekday: "short",
    });
    const startTime = d.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endTime = endsAt
      ? new Date(endsAt).toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    return `${dateStr}, ${startTime}${endTime ? ` - ${endTime}` : ""}`;
  } catch {
    return startsAt;
  }
}

export function getDoctorName(dashboard: Dashboard | null | undefined, doctorId?: string | null): string {
  if (!doctorId) return "Любой свободный врач";
  const doc = dashboard?.clinicSettings?.staff?.find((s) => s.id === doctorId);
  return doc?.fullName || "Врач клиники";
}

export function getChairName(dashboard: Dashboard | null | undefined, chairId?: string | null): string {
  if (!chairId) return "Кресло 1";
  const chair = dashboard?.clinicSettings?.chairs?.find((c) => c.id === chairId);
  return chair?.name || "Кресло";
}

export function getPatientInfo(dashboard: Dashboard | null | undefined, booking: Appointment): PatientInfoResult {
  const pat = dashboard?.patients?.find((p) => p.id === booking.patientId);
  if (pat) {
    return { name: pat.fullName, phone: pat.phone || null };
  }
  const comment = booking.comment || "";
  const phoneMatch = comment.match(/(?:\+7|8)[\d\s\-()]{9,15}/);
  const nameMatch = comment.match(/Пациент:\s*([^,\n]+)/i);
  return {
    name: nameMatch?.[1] ? nameMatch[1].trim() : booking.patientId || "Пациент онлайн",
    phone: phoneMatch ? phoneMatch[0].trim() : null,
  };
}
