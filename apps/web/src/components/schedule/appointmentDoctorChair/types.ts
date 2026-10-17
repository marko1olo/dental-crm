import type { Appointment, Dashboard } from "@dental/shared";
import type { ResourceCollisionResult } from "../../../utils/scheduleCollisionUtils";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";

export interface AppointmentModalDoctorChairSectionProps {
  appointment: Appointment;
  dashboard: Dashboard;
  startsAtLocal: string;
  setStartsAtLocal: (val: string) => void;
  endsAtLocal: string;
  setEndsAtLocal: (val: string) => void;
  currentDurationMinutes: number;
  applyDuration: (minutes: number) => void;
  doctorUserId: string;
  setDoctorUserId: (id: string) => void;
  assistantUserId: string | null;
  setAssistantUserId: (id: string | null) => void;
  chairId: string;
  setChairId: (id: string) => void;
  isSoloDoctor: boolean;
  doctors: Array<{ id: string; fullName: string; specialties?: string[] }>;
  assistants: Array<{ id: string; fullName: string }>;
  chairs: Array<{ id: string; name: string; specialization?: string | null | undefined }>;
  dutyDoctorId: string | null;
  dutyDoc: { id: string; fullName: string } | null;
  dutyDocHours: string | null;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
  collision: ResourceCollisionResult;
  safeToDateTimeLocalValue: (iso: string | null | undefined, tz?: string | null) => string;
  timezone: string;
  hideAssistant?: boolean;
}
