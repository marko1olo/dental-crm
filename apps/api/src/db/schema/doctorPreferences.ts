import { sql, relations } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth.js";

/**
 * Doctor Clinical Preferences (anesthesia defaults, materials, presets for 6 specialties, 043/u templates)
 * Stored in PostgreSQL (127.0.0.1:5432) for cross-device persistence and remote server sync.
 */
export const doctorPreferences = pgTable(
	"doctor_preferences",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		doctorId: uuid("doctor_id").references(() => users.id, {
			onDelete: "cascade",
		}),
		specialty: text("specialty").notNull().default("therapist"),
		preferences: jsonb("preferences").notNull().default({}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		orgIdx: index("doctor_preferences_org_idx").on(table.organizationId),
		doctorIdx: index("doctor_preferences_doctor_idx").on(
			table.organizationId,
			table.doctorId,
		),
		uqOrgDoctor: uniqueIndex("uq_doctor_preferences_org_doctor").on(
			table.organizationId,
			sql`COALESCE(${table.doctorId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
		),
	}),
);

export const doctorPreferencesRelations = relations(
	doctorPreferences,
	({ one }) => ({
		organization: one(organizations, {
			fields: [doctorPreferences.organizationId],
			references: [organizations.id],
		}),
		doctor: one(users, {
			fields: [doctorPreferences.doctorId],
			references: [users.id],
		}),
	}),
);
