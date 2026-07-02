// @ts-nocheck
import { Dashboard, Appointment, StaffMember, Chair, StaffWorkingDay } from "@dental/shared";

interface ResourceRequirements {
  doctorId: string;
  assistantId?: string;
  chairId: string;
  durationMinutes: number;
  dateStr?: string; // YYYY-MM-DD
}

export interface Slot {
  startsAt: string; // ISO 8601
  endsAt: string;
  doctorId: string;
  assistantId?: string | null;
  chairId: string;
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getDayOfWeekIndex(dateStr: string): number {
  // JavaScript Date getDay: 0 = Sunday, 1 = Monday, ... 6 = Saturday
  // Our system (from schema): 1 = Monday ... 7 = Sunday
  const d = new Date(dateStr);
  let jsDay = d.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function getWorkingHoursForDay(staff: StaffMember | Chair, weekday: number): StaffWorkingDay | undefined {
  if (!staff.workingHours) return undefined;
  return staff.workingHours.find(day => day.enabled && day.weekday === weekday);
}

function parseStrictAppointmentDateTimeMs(value: string): number {
  return new Date(value).getTime();
}

/**
 * Finds available slots considering working hours and existing appointments.
 * It's a simplified algorithm for the MVP that searches day by day.
 */
export function findAvailableSlots(dashboard: Dashboard, req: ResourceRequirements, limit: number = 3): Slot[] {
  const { doctorId, assistantId, chairId, durationMinutes } = req;

  const doctor = dashboard.clinicSettings.staff.find(s => s.id === doctorId);
  const assistant = assistantId ? dashboard.clinicSettings.staff.find(s => s.id === assistantId) : null;
  const chair = dashboard.clinicSettings.chairs.find(c => c.id === chairId);

  if (!doctor || !chair) return [];

  // Sort appointments by start time
  const sortedAppointments = [...dashboard.appointments].sort((a, b) => 
    parseStrictAppointmentDateTimeMs(a.startsAt) - parseStrictAppointmentDateTimeMs(b.startsAt)
  );

  const availableSlots: Slot[] = [];
  
  // Start searching from today or the requested date
  const startDate = req.dateStr ? new Date(req.dateStr) : new Date();
  startDate.setHours(0, 0, 0, 0);

  // Search up to 14 days ahead
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    if (availableSlots.length >= limit) break;

    const currentDay = new Date(startDate);
    currentDay.setDate(currentDay.getDate() + dayOffset);
    const dateStr = currentDay.toISOString().split('T')[0];
    const weekday = getDayOfWeekIndex(dateStr);

    const docWH = getWorkingHoursForDay(doctor, weekday);
    const astWH = assistant ? getWorkingHoursForDay(assistant, weekday) : undefined;
    const chairWH = getWorkingHoursForDay(chair, weekday);

    if (!docWH || !chairWH) continue;
    if (assistant && !astWH) continue;

    // Find overlapping working hours
    const startMins = [timeToMinutes(docWH.start || "00:00"), timeToMinutes(chairWH.start || "00:00")];
    const endMins = [timeToMinutes(docWH.end || "00:00"), timeToMinutes(chairWH.end || "00:00")];
    
    if (astWH) {
      startMins.push(timeToMinutes(astWH.start || "00:00"));
      endMins.push(timeToMinutes(astWH.end || "00:00"));
    }

    let searchStartMin = Math.max(...startMins);
    let searchEndMin = Math.min(...endMins);

    if (searchStartMin >= searchEndMin) continue;

    // Filter appointments for this day involving these resources
    const dayAppointments = sortedAppointments.filter(app => {
      const appDateStr = app.startsAt.split('T')[0];
      if (appDateStr !== dateStr) return false;
      if (app.status === 'cancelled') return false;
      return app.doctorUserId === doctorId || app.chairId === chairId || (assistantId && app.assistantUserId === assistantId);
    });

    // Try to fit the appointment in 15-minute increments
    for (let time = searchStartMin; time <= searchEndMin - durationMinutes; time += 15) {
      if (availableSlots.length >= limit) break;

      const slotStart = new Date(`${dateStr}T${minutesToTime(time)}:00`);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      const slotStartMs = slotStart.getTime();
      const slotEndMs = slotEnd.getTime();

      // Check if slot is in the past
      if (slotStartMs < Date.now()) continue;

      // Check collisions with existing appointments
      let hasCollision = false;
      for (const app of dayAppointments) {
        const appStartMs = parseStrictAppointmentDateTimeMs(app.startsAt);
        const appEndMs = parseStrictAppointmentDateTimeMs(app.endsAt);
        
        // (StartA < EndB) and (EndA > StartB)
        if (slotStartMs < appEndMs && slotEndMs > appStartMs) {
          hasCollision = true;
          // Optimization: skip to the end of the colliding appointment
          time = Math.max(time, timeToMinutes(app.endsAt.split('T')[1].substring(0, 5)) - 15); // -15 because the loop adds 15
          break;
        }
      }

      if (!hasCollision) {
        // timezone handling for ISO strings (using Z for MVP)
        // Adjust for local time representation based on clinic timezone if necessary
        // For simplicity, we just use local JS timezone ISO string but replace Z
        const toIsoLocal = (d: Date) => {
          const pad = (n: number) => n.toString().padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+03:00`;
        };

        availableSlots.push({
          startsAt: toIsoLocal(slotStart),
          endsAt: toIsoLocal(slotEnd),
          doctorId,
          assistantId: assistantId ?? null,
          chairId
        });
        
        // Skip ahead to not overlap suggested slots with each other
        time += durationMinutes - 15; 
      }
    }
  }

  return availableSlots;
}

