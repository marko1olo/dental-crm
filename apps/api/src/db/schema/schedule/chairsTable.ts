import { sql, relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { clinics, organizations } from "../auth.js";
import { appointments } from "./appointmentsTable.js";

export const chairs = pgTable(
	"chairs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id")
			.notNull()
			.references(() => clinics.id),
		name: text("name").notNull(),
		isActive: boolean("is_active").notNull().default(true),
		equipment: text("equipment"),
		specializations: text("specializations"),
		workingHours: jsonb("working_hours"),
	},
	(t) => ({
		organizationIdIdx: index("chairs_organization_id_idx").on(t.organizationId),
		clinicIdIdx: index("chairs_clinic_id_idx").on(t.clinicId),
		orgActiveIdx: index("chairs_org_active_idx").on(t.organizationId, t.isActive),
	}),
);

export const chairsRelations = relations(chairs, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [chairs.organizationId],
		references: [organizations.id],
	}),
	clinic: one(clinics, {
		fields: [chairs.clinicId],
		references: [clinics.id],
	}),
	appointments: many(appointments),
}));
