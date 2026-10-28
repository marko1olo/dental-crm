/**
 * @file scheduleAndTaskTools.ts
 * @description Layer 2: Clinic appointment booking, rescheduling, cancellations, staff tasks, and recalls tools facade.
 *
 * Decomposed under Mandate 8b into modular units:
 * - appointmentBookingTool.ts (book_visit)
 * - doctorScheduleLookupTool.ts (get_doctor_schedule)
 * - chairOccupancyTool.ts (reschedule_appointment, cancel_appointment)
 * - clinicalTaskDispatcherTool.ts (create_staff_task, get_patient_recalls, schedule_recall)
 */

export {
	bookVisitSchema,
	bookVisitTool,
} from "./schedule/appointmentBookingTool.js";

export {
	getDoctorScheduleSchema,
	getDoctorScheduleTool,
} from "./schedule/doctorScheduleLookupTool.js";

export {
	cancelAppointmentSchema,
	cancelAppointmentTool,
	rescheduleAppointmentSchema,
	rescheduleAppointmentTool,
} from "./schedule/chairOccupancyTool.js";

export {
	createStaffTaskSchema,
	createStaffTaskTool,
	getPatientRecallsSchema,
	getPatientRecallsTool,
	scheduleRecallSchema,
	scheduleRecallTool,
} from "./schedule/clinicalTaskDispatcherTool.js";
