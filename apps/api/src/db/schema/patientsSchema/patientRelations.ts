import { relations } from "drizzle-orm";
import { organizations } from "../auth.js";
import { visits } from "../clinical.js";
import { appointments } from "../schedule.js";
import { patients } from "./patientCore.js";
import { patientConsents } from "./patientPassportAndLegal.js";

export const patientsRelations = relations(patients, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [patients.organizationId],
		references: [organizations.id],
	}),
	appointments: many(appointments),
	consents: many(patientConsents),
	visits: many(visits),
}));
