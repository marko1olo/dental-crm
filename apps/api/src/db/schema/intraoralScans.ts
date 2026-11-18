/**
 * apps/api/src/db/schema/intraoralScans.ts — Universal Intraoral Optical 3D Scan Sessions Schema.
 *
 * Implements SSOT relational schema for optical intraoral 3D scanners:
 * 3Shape TRIOS, Medit, iTero, Sirona, Runyes, Shining 3D, Panda, Carestream, Generic.
 *
 * Compliance: THE HAMMER, Mandates 8b (No loose any, ACID transactions), 8e (Doctor Autonomy), 8bg (Schema & DDL sync).
 */

import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./auth.js";
import { visits } from "./clinical.js";
import { labOrders } from "./dentalLabOrders.js";
import { patients } from "./patients.js";

export const intraoralScanSessions = pgTable(
	"intraoral_scan_sessions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		visitId: uuid("visit_id").references(() => visits.id),
		labOrderId: uuid("lab_order_id").references(() => labOrders.id),
		vendor: text("vendor").notNull(), // '3shape', 'medit', 'itero', 'sirona', 'runyes', 'shining3d', 'panda', 'carestream', 'generic'
		scannerModel: text("scanner_model"),
		upperJawMasterPath: text("upper_jaw_master_path"),
		upperJawMasterUrl: text("upper_jaw_master_url"),
		upperJawPreviewPath: text("upper_jaw_preview_path"),
		upperJawPreviewUrl: text("upper_jaw_preview_url"),
		lowerJawMasterPath: text("lower_jaw_master_path"),
		lowerJawMasterUrl: text("lower_jaw_master_url"),
		lowerJawPreviewPath: text("lower_jaw_preview_path"),
		lowerJawPreviewUrl: text("lower_jaw_preview_url"),
		buccalBite1Path: text("buccal_bite_1_path"),
		buccalBite2Path: text("buccal_bite_2_path"),
		preOpJawPath: text("pre_op_jaw_path"),
		scanbodyPath: text("scanbody_path"),
		occlusionMatrix: jsonb("occlusion_matrix").$type<number[]>(),
		isOcclusionPreAligned: boolean("is_occlusion_pre_aligned").notNull().default(false),
		screenshotFrontUrl: text("screenshot_front_url"),
		screenshotUpperUrl: text("screenshot_upper_url"),
		screenshotLowerUrl: text("screenshot_lower_url"),
		screenshotOcclusionUrl: text("screenshot_occlusion_url"),
		preparationTeethFdi: jsonb("preparation_teeth_fdi")
			.$type<number[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		implantTeethFdi: jsonb("implant_teeth_fdi")
			.$type<number[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		materialsPlanned: jsonb("materials_planned")
			.$type<Record<string, string>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		vitaShade: text("vita_shade"),
		status: text("status").notNull().default("ready"), // 'processing' | 'ready' | 'error'
		errorMessage: text("error_message"),
		capturedAt: timestamp("captured_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("intraoral_scan_sessions_organization_id_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("intraoral_scan_sessions_patient_id_idx").on(
			t.patientId,
		),
		visitIdIdx: index("intraoral_scan_sessions_visit_id_idx").on(t.visitId),
		labOrderIdIdx: index("intraoral_scan_sessions_lab_order_id_idx").on(
			t.labOrderId,
		),
		statusIdx: index("intraoral_scan_sessions_status_idx").on(t.status),
		createdAtIdx: index("intraoral_scan_sessions_created_at_idx").on(
			t.createdAt,
		),
	}),
);

export const intraoralScanSessionsRelations = relations(
	intraoralScanSessions,
	({ one }) => ({
		organization: one(organizations, {
			fields: [intraoralScanSessions.organizationId],
			references: [organizations.id],
		}),
		patient: one(patients, {
			fields: [intraoralScanSessions.patientId],
			references: [patients.id],
		}),
		visit: one(visits, {
			fields: [intraoralScanSessions.visitId],
			references: [visits.id],
		}),
		labOrder: one(labOrders, {
			fields: [intraoralScanSessions.labOrderId],
			references: [labOrders.id],
		}),
	}),
);

export type IntraoralScanSessionRecord = typeof intraoralScanSessions.$inferSelect;
export type NewIntraoralScanSessionRecord = typeof intraoralScanSessions.$inferInsert;
