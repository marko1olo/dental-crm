# Handoff Report — EGISZ DB Schema Survey

## 1. Observation
Direct observation of database schema definitions in `apps/api/src/db/schema.ts` (lines 3828–3924):

### A. `schema.egiszBlankPermissions` (`egisz_blank_permissions`)
File: `apps/api/src/db/schema.ts` (lines 3828–3864)

```ts
export const egiszBlankPermissions = pgTable(
	"egisz_blank_permissions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		doctorId: uuid("doctor_id").notNull(),
		blankCode: text("blank_code").notNull(),
		blankTitle: text("blank_title").notNull(),
		isAllowed: boolean("is_allowed").notNull().default(true),
		patientOptOutRespect: boolean("patient_opt_out_respect")
			.notNull()
			.default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("egisz_blank_permissions_organizationId_idx").on(
			t.organizationId,
		),
	}),
);
```

**Columns Breakdown for `egiszBlankPermissions`:**
- `id`: `uuid("id")`, `.primaryKey()`, default `sql`uuidv7()`` (UUIDv7 generation).
- `organizationId`: `uuid("organization_id")`, `.notNull()`, foreign key `.references(() => organizations.id)`.
- `doctorId`: `uuid("doctor_id")`, `.notNull()`.
- `blankCode`: `text("blank_code")`, `.notNull()`.
- `blankTitle`: `text("blank_title")`, `.notNull()`.
- `isAllowed`: `boolean("is_allowed")`, `.notNull()`, default `true`.
- `patientOptOutRespect`: `boolean("patient_opt_out_respect")`, `.notNull()`, default `true`.
- `createdAt`: `timestamp("created_at", { withTimezone: true })`, `.notNull()`, default `.defaultNow()`.

**Indexes:**
- `organizationIdIdx`: `index("egisz_blank_permissions_organizationId_idx").on(t.organizationId)`

**Exports:**
- `export const egiszBlankPermissions` in `apps/api/src/db/schema.ts`.

---

### B. `schema.egiszStatus` (pgEnum)
File: `apps/api/src/db/schema.ts` (lines 3872–3877)

```ts
export const egiszStatus = pgEnum("egisz_status_enum", [
	"Pending",
	"Sent",
	"Error",
	"Accepted",
]);
```

- Enum name in PostgreSQL: `"egisz_status_enum"`
- Permitted values: `"Pending"`, `"Sent"`, `"Error"`, `"Accepted"`.
- Export: `export const egiszStatus`.

---

### C. `schema.egiszLogs` (`egisz_logs`)
File: `apps/api/src/db/schema.ts` (lines 3887–3924)

```ts
export const egiszLogs = pgTable(
	"egisz_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		visitId: uuid("visit_id")
			.notNull()
			.references(() => visits.id, { onDelete: "cascade" }),
		status: egiszStatus("status").notNull().default("Pending"),
		transactionId: text("transaction_id"),
		errorDetails: jsonb("error_details"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("egisz_logs_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("egisz_logs_patientId_idx").on(t.patientId),
		visitIdIdx: index("egisz_logs_visitId_idx").on(t.visitId),
	}),
);
```

**Columns Breakdown for `egiszLogs`:**
- `id`: `uuid("id")`, `.primaryKey()`, default `sql`uuidv7()`` (UUIDv7 generation).
- `organizationId`: `uuid("organization_id")`, `.notNull()`, foreign key `.references(() => organizations.id)`.
- `patientId`: `uuid("patient_id")`, `.notNull()`, foreign key `.references(() => patients.id, { onDelete: "cascade" })`.
- `visitId`: `uuid("visit_id")`, `.notNull()`, foreign key `.references(() => visits.id, { onDelete: "cascade" })`.
- `status`: `egiszStatus("status")`, `.notNull()`, default `"Pending"`. Type is `pgEnum("egisz_status_enum", ...)`.
- `transactionId`: `text("transaction_id")`, optional / nullable.
- `errorDetails`: `jsonb("error_details")`, optional / nullable.
- `createdAt`: `timestamp("created_at", { withTimezone: true })`, `.notNull()`, default `.defaultNow()`.

**Indexes:**
- `organizationIdIdx`: `index("egisz_logs_organizationId_idx").on(t.organizationId)`
- `patientIdIdx`: `index("egisz_logs_patientId_idx").on(t.patientId)`
- `visitIdIdx`: `index("egisz_logs_visitId_idx").on(t.visitId)`

**Exports:**
- `export const egiszLogs` in `apps/api/src/db/schema.ts`.

---

## 2. Logic Chain
1. Inspection of `apps/api/src/db/schema.ts` confirms that both `egiszBlankPermissions` and `egiszLogs` are defined using Drizzle ORM (`pgTable`).
2. ID generation for both tables uses `uuid("id").primaryKey().default(sql`uuidv7()`)`, generating UUIDv7 client/DB side defaults automatically upon insert unless overridden.
3. Multi-tenant organization isolation is enforced on both tables via `organizationId: uuid("organization_id").notNull().references(() => organizations.id)`.
4. `egiszLogs.status` uses the `egiszStatus` enum (`egisz_status_enum`), which defaults to `"Pending"` on insertion.
5. In routes (e.g. `apps/api/src/routes/egisz.ts`), schema definitions are imported via `import * as schema from "../db/schema.js"`, allowing direct access to `schema.egiszBlankPermissions` and `schema.egiszLogs`.

## 3. Caveats
- `egiszBlankPermissions` contains columns `blankCode`, `blankTitle`, `isAllowed`, `patientOptOutRespect`, `createdAt`, `doctorId`, `organizationId`, `id`. Notice `apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx` parses fields `id`, `formCode` (or `blankCode`), `fieldName` (or `blankTitle`), `isExportAllowed` (or `isAllowed`), `patientOptOutRespect`. When returning `schema.egiszBlankPermissions` rows for frontend endpoints, check whether mapping or key aliasing is expected by frontend components.
- No caveats regarding schema definition locations — all definitions are centralized in `apps/api/src/db/schema.ts`.

## 4. Conclusion
`schema.egiszBlankPermissions` and `schema.egiszLogs` (along with `schema.egiszStatus`) are fully defined, exported, indexed, and typed in `apps/api/src/db/schema.ts`.
- `id` generation: UUIDv7 (`sql`uuidv7()``).
- `organizationId`: Present, non-null UUID referencing `organizations.id` in both tables.
- `status`: Present in `egiszLogs`, defined via `egiszStatus` enum with default `"Pending"`.
- Exports: `egiszBlankPermissions`, `egiszStatus`, `egiszLogs` exported as named `const` exports from `apps/api/src/db/schema.ts`.

## 5. Verification Method
1. View `apps/api/src/db/schema.ts` lines 3828–3924 directly with `view_file`.
2. Run typecheck via `npm run typecheck` or test suite `npm run test` in `apps/api` to verify zero drift or missing exports.
