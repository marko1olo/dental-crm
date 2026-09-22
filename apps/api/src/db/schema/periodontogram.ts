import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth.js";
import { patients } from "./patients.js";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ADR 0013: PERIODONTOGRAM RELATIONAL SNAPSHOT MODEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements immutable dated snapshot model for periodontal exams (SEPA / WHO).
 * Three relational tables:
 * 1. periodontogram_snapshots (one draft allowed per patient; frozen indices on close)
 * 2. periodontogram_teeth (32 FDI permanent teeth 11..48, mobility, furcations)
 * 3. periodontogram_sites (6 sites per tooth: MV, V, DV, ML, L, DL)
 */

export const periodontogramSnapshots = pgTable(
	"periodontogram_snapshots",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		status: text("status").notNull().default("draft"), // 'draft' | 'closed'
		recordedAt: timestamp("recorded_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		recordedByUserId: uuid("recorded_by_user_id").references(() => users.id),
		closedAt: timestamp("closed_at", { withTimezone: true }),
		closedByUserId: uuid("closed_by_user_id").references(() => users.id),
		notes: text("notes"),
		// Frozen calculated indices upon closure (bop_pct, pi_pct, cal_mean_mm, deep_pockets_count, ohi_s, pma, psr)
		indices: jsonb("indices"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		// Partial unique index enforcing at most one draft per patient per clinic (ADR 0013 invariant)
		uqOneDraftPerPatient: uniqueIndex("uq_perio_snap_one_draft_per_patient")
			.on(table.organizationId, table.patientId)
			.where(sql`status = 'draft'`),
		organizationIdIdx: index("periodontogram_snapshots_org_idx").on(
			table.organizationId,
		),
		patientIdIdx: index("periodontogram_snapshots_patient_idx").on(
			table.patientId,
		),
		patientStatusIdx: index("periodontogram_snapshots_patient_status_idx").on(
			table.patientId,
			table.status,
		),
	}),
);

export const periodontogramTeeth = pgTable(
	"periodontogram_teeth",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		snapshotId: uuid("snapshot_id")
			.notNull()
			.references(() => periodontogramSnapshots.id, { onDelete: "cascade" }),
		toothNumber: integer("tooth_number").notNull(), // 11..48
		isPresent: boolean("is_present").notNull().default(true),
		isImplant: boolean("is_implant").notNull().default(false),
		mobility: integer("mobility"), // 0..3
		prognosis: text("prognosis"), // 'good' | 'fair' | 'poor' | 'hopeless'
		furcationBuccal: text("furcation_buccal"), // '0' | 'I' | 'II' | 'III'
		furcationLingual: text("furcation_lingual"), // '0' | 'I' | 'II' | 'III'
		keratinizedGingivaMm: integer("keratinized_gingiva_mm"), // 0..20
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		uqToothSnap: uniqueIndex("uq_perio_tooth_snap").on(
			table.snapshotId,
			table.toothNumber,
		),
		snapshotIdIdx: index("periodontogram_teeth_snapshot_id_idx").on(
			table.snapshotId,
		),
	}),
);

export const periodontogramSites = pgTable(
	"periodontogram_sites",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		snapshotId: uuid("snapshot_id")
			.notNull()
			.references(() => periodontogramSnapshots.id, { onDelete: "cascade" }),
		toothId: uuid("tooth_id").references(() => periodontogramTeeth.id, {
			onDelete: "cascade",
		}),
		toothNumber: integer("tooth_number").notNull(),
		siteCode: text("site_code").notNull(), // 'MV' | 'V' | 'DV' | 'ML' | 'L' | 'DL'
		probingDepthMm: integer("probing_depth_mm"), // 0..15
		gingivalMarginMm: integer("gingival_margin_mm"), // -5..10
		bleedingOnProbing: boolean("bleeding_on_probing").notNull().default(false),
		plaque: boolean("plaque").notNull().default(false),
		suppuration: boolean("suppuration").notNull().default(false),
		calculus: boolean("calculus").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		uqSiteSnapToothCode: uniqueIndex("uq_perio_site_snap_tooth_code").on(
			table.snapshotId,
			table.toothNumber,
			table.siteCode,
		),
		snapshotIdIdx: index("periodontogram_sites_snapshot_id_idx").on(
			table.snapshotId,
		),
		snapshotToothIdx: index("periodontogram_sites_tooth_idx").on(
			table.snapshotId,
			table.toothNumber,
		),
	}),
);

// ───────────────────────────────────────────────────────────────────────────
// RELATIONS
// ───────────────────────────────────────────────────────────────────────────

export const periodontogramSnapshotsRelations = relations(
	periodontogramSnapshots,
	({ one, many }) => ({
		organization: one(organizations, {
			fields: [periodontogramSnapshots.organizationId],
			references: [organizations.id],
		}),
		patient: one(patients, {
			fields: [periodontogramSnapshots.patientId],
			references: [patients.id],
		}),
		recordedByUser: one(users, {
			fields: [periodontogramSnapshots.recordedByUserId],
			references: [users.id],
		}),
		closedByUser: one(users, {
			fields: [periodontogramSnapshots.closedByUserId],
			references: [users.id],
		}),
		teeth: many(periodontogramTeeth),
		sites: many(periodontogramSites),
	}),
);

export const periodontogramTeethRelations = relations(
	periodontogramTeeth,
	({ one, many }) => ({
		snapshot: one(periodontogramSnapshots, {
			fields: [periodontogramTeeth.snapshotId],
			references: [periodontogramSnapshots.id],
		}),
		sites: many(periodontogramSites),
	}),
);

export const periodontogramSitesRelations = relations(
	periodontogramSites,
	({ one }) => ({
		snapshot: one(periodontogramSnapshots, {
			fields: [periodontogramSites.snapshotId],
			references: [periodontogramSnapshots.id],
		}),
		tooth: one(periodontogramTeeth, {
			fields: [periodontogramSites.toothId],
			references: [periodontogramTeeth.id],
		}),
	}),
);
