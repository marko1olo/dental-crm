import { relations } from "drizzle-orm";
import { organizations } from "../auth.js";
import { patients } from "../patients.js";
import { appointments } from "../schedule.js";
import { visits } from "./visitsSchema.js";

export const visitsRelations = relations(visits, ({ one }) => ({
	organization: one(organizations, {
		fields: [visits.organizationId],
		references: [organizations.id],
	}),
	patient: one(patients, {
		fields: [visits.patientId],
		references: [patients.id],
	}),
	appointment: one(appointments, {
		fields: [visits.appointmentId],
		references: [appointments.id],
	}),
}));
