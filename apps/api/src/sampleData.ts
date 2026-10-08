/**
 * @file sampleData.ts
 * @description Canonical facade for sample data and in-memory domain state.
 * Decomposed per /decomposer skill into apps/api/src/sampleData/* modules.
 */

export * from "./sampleData/index.js";


// Disambiguate overlapping symbols between sampleData domain and telegram legacy memory store
export {
	persistMutableState,
	organizationId,
	doctorUserId,
	marinaPatientId,
	nowIso,
	appointmentReminderDispatchGraceMs,
	defaultClinicTimezone,
	inMemoryDomainState,
	type DomainState,
	clinicProfile,
	staffMembers,
	patients,
	appointments,
	validScheduleTimeZone,
	appointmentClinicDateKey,
	activeVisit,
	findVisitById,
	documents,
	communicationTasks,
	communicationEvents,
	isOpenCommunicationTask,
	auditEvents,
	recordAuditEvent,
} from "./sampleData/index.js";
