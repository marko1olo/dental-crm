# Handoff Report — Database & State Machine Analysis (`sberbankTransactions` & `payments`)

**Agent**: teamwork_preview_explorer (Explorer 2)  
**Working Directory**: `C:/Clinic_MVP/dental-crm/.agents/explorer_db_schema`  
**Target Scope**: `apps/api/src/db/schema.ts`, `apps/api/src/routes/sberbank.ts`, `apps/api/src/db/billingQuery.ts`, `apps/api/src/db/client.ts`

---

## 1. Observation

Direct observations from inspecting codebase files:

### A. Table Definition: `sberbankTransactions`
Location: `apps/api/src/db/schema.ts` (lines 3804–3825)

```typescript
export const sberbankTransactions = pgTable(
	"sberbank_transactions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		orderId: text("order_id").notNull(),
		amount: integer("amount").notNull(),
		status: text("status").notNull(),
		patientId: uuid("patient_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(t) => ({
		organizationIdIdx: index("sberbank_transactions_organizationId_idx").on(
			t.organizationId,
		),
	}),
);
```

**Observed Columns & Attributes (`sberbankTransactions`)**:
- `id`: `uuid("id").primaryKey().default(sql`uuidv7()`)` — Primary Key, auto-generated UUIDv7.
- `organizationId`: `uuid("organization_id").notNull().references(() => organizations.id)` — FK to `organizations.id`.
- `orderId`: `text("order_id").notNull()` — Sberbank acquiring order ID string.
- `amount`: `integer("amount").notNull()` — Integer value stored in **kopecks** (e.g. 150000 = 1500.00 ₽).
- `status`: `text("status").notNull()` — String status (`"pending"`, `"success"`, `"failed"`). Note: `text` type, not an enum.
- `patientId`: `uuid("patient_id").notNull()` — Patient identifier (UUID).
- `createdAt`: `timestamp("created_at", { withTimezone: true }).notNull().defaultNow()`
- `updatedAt`: `timestamp("updated_at", { withTimezone: true })` — Nullable timestamp.

---

### B. Table Definition: `payments`
Location: `apps/api/src/db/schema.ts` (lines 972–1037)

```typescript
export const payments = pgTable(
	"payments",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		visitId: uuid("visit_id").references(() => visits.id),
		documentId: uuid("document_id"),
		clientMutationId: text("client_mutation_id"),
		amountRub: numeric("amount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		method: paymentMethod("method").notNull().default("card"),
		status: paymentStatus("status").notNull().default("paid"),
		paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
		fiscalReceiptNumber: text("fiscal_receipt_number"),
		fiscalReceiptIssuedAt: text("fiscal_receipt_issued_at"),
		fiscalReceiptUrl: text("fiscal_receipt_url"),
		fiscalReceipt: jsonb("fiscal_receipt").$type<FiscalReceiptDetails | null>(),
		payerFullName: text("payer_full_name"),
		payerInn: text("payer_inn"),
		payerBirthDate: text("payer_birth_date"),
		payerIdentityDocument: text("payer_identity_document"),
		payerRelationship: text("payer_relationship"),
		taxDeductionCode: text("tax_deduction_code"),
		note: text("note"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			idxPaymentsOrgPaidAt: index("idx_payments_org_paid_at").on(
				table.organizationId,
				table.paidAt,
			),
			paymentsOrgClientMutationUnique: unique(
				"payments_org_client_mutation_unique",
			).on(table.organizationId, table.clientMutationId),
			patientIdIdx: index("payments_patientId_idx").on(table.patientId),
			visitIdIdx: index("payments_visitId_idx").on(table.visitId),
		};
	},
);
```

**Observed Columns & Attributes (`payments`)**:
- `id`: `uuid("id").primaryKey().default(sql`uuidv7()`)` — Primary Key, auto-generated UUIDv7.
- `organizationId`: `uuid("organization_id").notNull().references(() => organizations.id)` — FK to `organizations.id`.
- `patientId`: `uuid("patient_id").notNull().references(() => patients.id)` — FK to `patients.id`.
- `visitId`: `uuid("visit_id").references(() => visits.id)` — Optional FK to `visits.id`.
- `documentId`: `uuid("document_id")` — Optional UUID for associated document.
- `clientMutationId`: `text("client_mutation_id")` — Optional client idempotency key.
- `amountRub`: `numeric("amount_rub", { precision: 12, scale: 2, mode: "number" }).notNull()` — Decimal Rubles as JS `number`.
- `method`: `paymentMethod("method").notNull().default("card")` — Enum (`"cash" | "card" | "bank_transfer" | "online" | "insurance" | "family_wallet" | "other"`).
- `status`: `paymentStatus("status").notNull().default("paid")` — Enum (`"planned" | "paid" | "refunded" | "voided"`).
- `paidAt`: `timestamp("paid_at", { withTimezone: true }).notNull().defaultNow()`

---

### C. Existing Sberbank Status Polling & Insertion Logic
Location: `apps/api/src/routes/sberbank.ts` (lines 140–162)

```typescript
if (mappedStatus !== transaction.status) {
	await db
		.update(sberbankTransactions)
		.set({ status: mappedStatus, updatedAt: new Date() })
		.where(
			and(
				eq(sberbankTransactions.orderId, orderId),
				eq(sberbankTransactions.organizationId, orgId),
			),
		);

	if (
		transaction.status === "pending" &&
		mappedStatus === "success"
	) {
		await db.insert(payments).values({
			organizationId: orgId,
			patientId: transaction.patientId,
			method: "card",
			status: "paid",
			amountRub: transaction.amount / 100,
		});
	}
}
```

---

### D. Existing Row-Locking Pattern in Billing Engine
Location: `apps/api/src/db/billingQuery.ts` (lines 116–128)

```typescript
return await db.transaction(async (tx) => {
	// Pessimistic lock on the target patient to prevent concurrent balance race conditions
	const [lockedPatient] = await tx
		.select({ id: schema.patients.id })
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, input.patientId),
			),
		)
		.for("update")
		.limit(1);
```

---

## 2. Logic Chain

1. **Amount Representation Mapping**:
   - `sberbankTransactions.amount` stores transaction value as an **`integer` in kopecks** (e.g. `150000` kopecks).
   - `payments.amountRub` stores ledger balance in **decimal Rubles** as a `number` (`numeric(12,2)` with `mode: "number"`).
   - Therefore, inserting into `payments` requires converting kopecks to Rubles via `transaction.amount / 100` (e.g. `150000 / 100 = 1500.00`).

2. **State Machine Rule (R3)**:
   - Initial state of `sberbankTransactions` row upon order creation (`POST /api/sberbank/pay`) is `"pending"`.
   - The state transition to `"success"` MUST only happen when Sberbank confirms payment.
   - Insertion into `payments` table MUST occur **if and only if** `sberbankTransactions.status` transitions from `"pending"` to `"success"`.
   - If `sberbankTransactions.status` is ALREADY `"success"`, re-processing the webhook MUST NOT insert a duplicate row into `payments`.

3. **Concurrency & Race Condition Analysis**:
   - Webhooks sent by Sberbank or concurrent user requests (e.g. webhook callback + client status polling) may arrive simultaneously.
   - In a non-transactional or non-locked read-then-write flow:
     - Request A reads `sberbankTransactions` (`status = 'pending'`).
     - Request B reads `sberbankTransactions` (`status = 'pending'`).
     - Request A updates status to `'success'` and inserts row into `payments`.
     - Request B ALSO updates status to `'success'` and inserts ANOTHER row into `payments`.
     - Result: Double payment recording in the clinic ledger!

4. **Atomic Transaction Solutions**:
   - **Pattern A (Pessimistic Row Lock - Preferred & Idiomatic)**:
     Wrap the lookup and update inside `db.transaction(async (tx) => { ... })` and apply `.for("update")` on the `sberbankTransactions` query. PostgreSQL acquires an exclusive row lock on the transaction record. Any concurrent request blocks until the first transaction commits, ensuring the second request reads the updated status (`"success"`) and skips `payments` insertion.
   - **Pattern B (Atomic Conditional Update)**:
     Execute an atomic update with `WHERE order_id = $1 AND status = 'pending' RETURNING *`. Exactly one concurrent worker will update 1 row and receive the returning object; all others get 0 updated rows and do not insert into `payments`.

---

## 3. Caveats

1. **Foreign Key on `sberbankTransactions.patientId`**:
   - In `schema.ts` (line 3814), `patientId` is defined as `uuid("patient_id").notNull()` without explicit `.references(() => patients.id)`. However, it logically references `patients.id`.
2. **Missing Unique Constraint on `orderId` in `sberbankTransactions`**:
   - `orderId` is indexed only via `organizationIdIdx`. When querying by `orderId`, always filter by `and(eq(sberbankTransactions.orderId, orderId), eq(sberbankTransactions.organizationId, organizationId))`.
3. **Numeric Type Handling**:
   - `payments.amountRub` uses `mode: "number"`. Drizzle ORM converts JS numbers to SQL strings on write and SQL numeric strings to JS numbers on read. Never pass string amounts; always pass JS `number` (e.g. `transaction.amount / 100`).

---

## 4. Conclusion

### Required Ledger Insertion Payload for `payments` Table

When inserting a new payment row upon successful state transition (`pending` -> `success`), the inserted object MUST match:

```typescript
await tx.insert(payments).values({
	organizationId: transaction.organizationId,
	patientId: transaction.patientId,
	method: "card",          // Enum: "card"
	status: "paid",          // Enum: "paid"
	amountRub: transaction.amount / 100, // Converted from kopecks to Rubles
});
```

### Atomic Database Transaction Pattern for `POST /api/sberbank/webhook`

The route handler should execute the state machine transition inside an atomic Drizzle database transaction with row locking:

```typescript
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { payments, sberbankTransactions } from "../db/schema.js";

export async function processSberbankPaymentSuccess(
	organizationId: string,
	orderId: string,

): Promise<{ updated: boolean; alreadyProcessed: boolean }> {
	return await db.transaction(async (tx) => {
		// 1. Lock the sberbankTransactions row for update
		const [transaction] = await tx
			.select()
			.from(sberbankTransactions)
			.where(
				and(
					eq(sberbankTransactions.orderId, orderId),
					eq(sberbankTransactions.organizationId, organizationId),
				),
			)
			.for("update")
			.limit(1);

		if (!transaction) {
			return { updated: false, alreadyProcessed: false };
		}

		// 2. State transition condition: ONLY from 'pending' to 'success'
		if (transaction.status === "pending") {
			// Update status in sberbankTransactions
			await tx
				.update(sberbankTransactions)
				.set({
					status: "success",
					updatedAt: new Date(),
				})
				.where(eq(sberbankTransactions.id, transaction.id));

			// Atomically insert into payments ledger
			await tx.insert(payments).values({
				organizationId: transaction.organizationId,
				patientId: transaction.patientId,
				method: "card",
				status: "paid",
				amountRub: transaction.amount / 100,
			});

			return { updated: true, alreadyProcessed: false };
		}

		return { updated: false, alreadyProcessed: transaction.status === "success" };
	});
}
```

---

## 5. Verification Method

To independently verify the schema definitions, type safety, and transaction behavior:

1. **TypeScript Typecheck**:
   ```bash
   npm run typecheck -w @dental/api
   ```
2. **Existing Sberbank Route Tests**:
   ```bash
   node --import tsx --test src/tests/routes/sberbank.test.ts
   ```
3. **Invalidation Conditions**:
   - If `payments.amountRub` is passed an integer in kopecks (e.g. `150000`) instead of Rubles (`1500.00`).
   - If `sberbankTransactions.status` update and `payments` insert are performed outside of `db.transaction(...)` or without `.for("update")` / status condition check, causing race conditions under concurrent requests.
