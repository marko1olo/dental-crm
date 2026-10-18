export interface ScheduleGridDesktopLayoutProps {
  props: any;
  duty: any;
  interactions: any;
  gridData: any;
  timeSlots: string[];
  dateKey: string;
  isToday: boolean;
  currentHour: number;
  timezone: string;
  patientName: (patients: any, id: string | null) => string;
}
