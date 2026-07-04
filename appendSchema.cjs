const fs = require('fs');

const appendText = `
export const imagingViewerSessions = pgTable("imaging_viewer_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  studyId: uuid("study_id").notNull().references(() => imagingStudies.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  visitId: uuid("visit_id").references(() => visits.id),
  state: jsonb("state").notNull(),
  annotations: jsonb("annotations").notNull().default([]),
  warnings: jsonb("warnings").notNull().default([]),
  clientSavedAt: timestamp("client_saved_at", { withTimezone: true }),
  serverSavedAt: timestamp("server_saved_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const dicomWorkbenchBundles = pgTable("dicom_workbench_bundles", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  seriesKey: text("series_key").notNull(),
  patientId: uuid("patient_id").references(() => patients.id),
  studyInstanceUid: text("study_instance_uid"),
  seriesInstanceUid: text("series_instance_uid"),
  sourceName: text("source_name").notNull(),
  sourceKind: imagingSourceKind("source_kind").notNull(),
  pixelPolicy: text("pixel_policy").notNull().default("metadata_and_tool_state_only_no_pixels"),
  manifest: jsonb("manifest").notNull(),
  warnings: jsonb("warnings").notNull().default([]),
  clientSavedAt: timestamp("client_saved_at", { withTimezone: true }),
  serverSavedAt: timestamp("server_saved_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
`;

fs.appendFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/db/schema.ts', appendText);
console.log("Appended successfully");
