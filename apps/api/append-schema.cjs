const fs = require("fs");
const schemaAddition = `

export const toothStateEnum = pgEnum('tooth_state_enum', [
  'Caries', 'Pulpitis', 'Missing', 'Crown', 'Implant', 'Filled', 'Healthy', 'Planned_Implant'
]);

export const toothStates = pgTable('tooth_states', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  toothNumber: integer('tooth_number').notNull(),
  state: toothStateEnum('state').notNull().default('Healthy'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    patientToothIdx: index('patient_tooth_idx').on(table.patientId, table.toothNumber)
  }
});

export const treatmentPlanStatusEnum = pgEnum('treatment_plan_status', [
  'Draft', 'Active', 'Approved', 'Completed', 'Rejected'
]);

export const treatmentPlans = pgTable('treatment_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  status: treatmentPlanStatusEnum('status').notNull().default('Draft'),
  totalPrice: numeric('total_price', { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const treatmentPlanItemsNew = pgTable('treatment_plan_items_new', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => treatmentPlans.id, { onDelete: 'cascade' }),
  toothNumber: integer('tooth_number'),
  priceId: text('price_id'),
  quantity: integer('quantity').notNull().default(1),
  price: numeric('price', { precision: 12, scale: 2 }).notNull().default('0'),
  discount: numeric('discount', { precision: 12, scale: 2 }).notNull().default('0'),
  phase: integer('phase').notNull().default(1)
});
`;
fs.appendFileSync("src/db/schema.ts", schemaAddition);
console.log("Schema appended successfully.");
