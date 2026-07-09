const fs = require('fs');
const schemaAddition = `

export const egiszStatusEnum = pgEnum('egisz_status_enum', [
  'Pending', 'Sent', 'Error', 'Accepted'
]);

export const egiszLogs = pgTable('egisz_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  visitId: uuid('visit_id').notNull().references(() => visits.id, { onDelete: 'cascade' }),
  status: egiszStatusEnum('status').notNull().default('Pending'),
  transactionId: varchar('transaction_id', { length: 255 }),
  errorDetails: jsonb('error_details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const visitDiaries = pgTable('visit_diaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  visitId: uuid('visit_id').notNull().references(() => visits.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  doctorId: uuid('doctor_id').references(() => users.id, { onDelete: 'set null' }),
  anamnesis: text('anamnesis'),
  statusLocalis: text('status_localis'),
  diagnosisIcd10: varchar('diagnosis_icd10', { length: 50 }),
  treatmentDescription: text('treatment_description'),
  isLocked: boolean('is_locked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const visitTemplates = pgTable('visit_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 255 }),
  prefilledAnamnesis: text('prefilled_anamnesis'),
  prefilledObjective: text('prefilled_objective'),
  prefilledTreatment: text('prefilled_treatment'),
  defaultIcd10: varchar('default_icd10', { length: 50 }),
  suggestedProcedureIds: jsonb('suggested_procedure_ids')
});
`;

fs.appendFileSync('src/db/schema.ts', schemaAddition);
console.log('EGISZ schema appended successfully.');
