import React from 'react';
import type { BookSlotHandler, SlotResult, AppointmentResult, SelectIdHandler } from '../copilotTypes';
import type { ScheduleSlotPickerData, ScheduleSlotOption } from '../cards/types';
import { ScheduleSlotPickerCard } from '../cards/ScheduleSlotPickerCard';
import { CopilotSlotCard } from '../CopilotSlotCard';
import { CopilotAppointmentCard } from '../CopilotAppointmentCard';

type Obj = Record<string, unknown>;

export function renderScheduleSection(
  tool: string,
  obj: Obj,
  result: unknown,
  onBookSlot?: BookSlotHandler,
  onSelectAppointment?: SelectIdHandler,
): React.ReactNode | null {
  // Schedule Slot Picker Card
  if (
    (tool.includes('picker') ||
      tool.includes('schedule_picker') ||
      tool.includes('schedule') ||
      tool.includes('free_slots') ||
      tool.includes('get_doctor_schedule') ||
      (Array.isArray(obj.slots) && obj.slots.length > 0 && typeof (obj.slots[0] as Obj).time === 'string')) &&
    (typeof obj.doctorName === 'string' || typeof obj.doctor_name === 'string' || Array.isArray(obj.slots) || Array.isArray(obj.appointments))
  ) {
    const rawSlotsList = Array.isArray(obj.slots)
      ? (obj.slots as unknown as ScheduleSlotOption[])
      : Array.isArray(obj.free_windows)
      ? (obj.free_windows as unknown as ScheduleSlotOption[])
      : Array.isArray(obj.freeWindows)
      ? (obj.freeWindows as unknown as ScheduleSlotOption[])
      : [];

    const pickerData: ScheduleSlotPickerData = {
      doctorId: typeof obj.doctorId === 'string' ? obj.doctorId : typeof obj.doctor_id === 'string' ? obj.doctor_id : undefined,
      doctorName: typeof obj.doctorName === 'string' ? obj.doctorName : typeof obj.doctor_name === 'string' ? obj.doctor_name : undefined,
      doctorSpecialty: typeof obj.doctorSpecialty === 'string' ? obj.doctorSpecialty : typeof obj.doctor_specialty === 'string' ? obj.doctor_specialty : undefined,
      cabinet: typeof obj.cabinet === 'string' ? obj.cabinet : undefined,
      date: typeof obj.date === 'string' ? obj.date : typeof obj.dateFrom === 'string' ? obj.dateFrom.slice(0, 10) : undefined,
      availableDates: Array.isArray(obj.availableDates) ? (obj.availableDates as string[]) : undefined,
      slots: rawSlotsList,
    };

    if (pickerData.slots.length > 0) {
      return (
        <ScheduleSlotPickerCard
          data={pickerData}
          onBookSlot={(slot) =>
            onBookSlot?.({
              start_time: slot.startTime || slot.time,
              end_time: slot.endTime,
              doctor_name: pickerData.doctorName,
              cabinet: slot.cabinet || pickerData.cabinet,
            })
          }
        />
      );
    }
  }

  // Slots list
  if (Array.isArray(obj.slots) || Array.isArray(obj.free_windows) || tool.includes('slot') || tool.includes('free_slots') || tool.includes('availability')) {
    const slots: SlotResult[] = Array.isArray(obj.slots)
      ? (obj.slots as SlotResult[])
      : Array.isArray(obj.free_windows)
      ? (obj.free_windows as SlotResult[])
      : Array.isArray(result)
      ? (result as SlotResult[])
      : [];
    return <CopilotSlotCard slots={slots} onBookSlot={onBookSlot} />;
  }

  // Appointments list
  if (Array.isArray(obj.appointments) || tool.includes('appointment') || tool.includes('day_overview') || (obj.id && obj.patient_name)) {
    const appts: AppointmentResult[] = Array.isArray(obj.appointments)
      ? (obj.appointments as AppointmentResult[])
      : Array.isArray(result)
      ? (result as AppointmentResult[])
      : (obj.id && obj.patient_name)
      ? [obj as unknown as AppointmentResult]
      : [];

    if (appts.length > 0) {
      return (
        <div className="space-y-2">
          {appts.map((a) => (
            <CopilotAppointmentCard key={a.id} appointment={a} onSelectAppointment={onSelectAppointment} />
          ))}
        </div>
      );
    }
  }

  return null;
}
