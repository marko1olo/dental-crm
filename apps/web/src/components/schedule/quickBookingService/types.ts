import type { Dashboard, DentalSpecialty } from "@dental/shared";
import type React from "react";
import type { DayFreeSlots } from "../doctorFreeSlotsEngine";
import type {
  AppointmentTypePreset,
  DurationPreset,
  QuickBookingAppointmentType,
} from "../patientReliabilityScore";
import type {
  QuickBookingSlotInfo,
  QuickBookingStageService,
} from "../QuickBookingDrawerTypes";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";

export type {
  AppointmentTypePreset,
  DurationPreset,
  QuickBookingAppointmentType,
  QuickBookingSlotInfo,
  QuickBookingStageService,
};

export interface QuickServicePreset {
  readonly id: string;
  readonly title: string;
  readonly specialty: DentalSpecialty | "general";
  readonly durationMinutes: number;
  readonly appointmentType: QuickBookingAppointmentType;
}

export interface QuickBookingDoctorOption {
  id: string;
  fullName: string;
  role?: string;
  specialties?: DentalSpecialty[];
}

export interface QuickBookingAssistantOption {
  id: string;
  fullName: string;
}

export interface QuickBookingChairOption {
  id: string;
  name: string;
}

export interface QuickBookingServiceSectionProps {
  appointmentType: QuickBookingAppointmentType;
  handleSelectAppointmentType: (type: QuickBookingAppointmentType) => void;
  startsAtLocal: string;
  setStartsAtLocal: (val: string) => void;
  durationMinutes: number;
  handleSelectDuration: (mins: number) => void;
  doctorUserId: string;
  setDoctorUserId: (id: string) => void;
  assistantUserId: string | null;
  setAssistantUserId: (id: string | null) => void;
  chairId: string;
  setChairId: (id: string) => void;
  // biome-ignore lint/suspicious/noExplicitAny: preserved prop signature
  status: any;
  // biome-ignore lint/suspicious/noExplicitAny: preserved prop signature
  setStatus: (s: any) => void;
  reason: string;
  setReason: (r: string) => void;
  comment: string;
  setComment: (c: string) => void;
  submitError: string | null;
  // biome-ignore lint/suspicious/noExplicitAny: preserved prop signature
  slotConflict: any;
  // biome-ignore lint/suspicious/noExplicitAny: preserved prop signature
  setSlotConflict: (c: any) => void;
  handleSubmitBooking: (
    e?: React.FormEvent,
    opts?: { overbookOverride?: boolean },
  ) => Promise<void>;
  doctors: Array<QuickBookingDoctorOption>;
  assistants: Array<QuickBookingAssistantOption>;
  chairs: Array<QuickBookingChairOption>;
  currentChair: QuickBookingChairOption | null;
  dutyDoc: { id: string; fullName: string } | null;
  dutyDoctorHours: string | null;
  isSoloClinic: boolean;
  selectedPatientName?: string | undefined;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
  dashboard?: Dashboard | undefined;
  initialSlot?: QuickBookingSlotInfo | null | undefined;
}

export interface QuickPresetChipsBarProps {
  appointmentType: QuickBookingAppointmentType;
  handleSelectAppointmentType: (type: QuickBookingAppointmentType) => void;
  // biome-ignore lint/suspicious/noExplicitAny: preserved prop signature
  status: any;
  // biome-ignore lint/suspicious/noExplicitAny: preserved prop signature
  setStatus: (s: any) => void;
  reason: string;
  setReason: (r: string) => void;
  comment: string;
  setComment: (c: string) => void;
}

export interface SelectedServicesSummaryCardProps {
  initialSlot?: QuickBookingSlotInfo | null | undefined;
  startsAtLocal: string;
  setStartsAtLocal: (val: string) => void;
  durationMinutes: number;
  handleSelectDuration: (mins: number) => void;
  chairId: string;
  setChairId: (id: string) => void;
  doctorUserId: string;
  setDoctorUserId: (id: string) => void;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
  isSearchingSlots: boolean;
  setIsSearchingSlots: (searching: boolean) => void;
  freeSlotsList: DayFreeSlots[];
  handleFindFreeSlots: () => void;
}
