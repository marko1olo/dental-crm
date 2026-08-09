# 💰 Billing, Idempotency & Family Finance

This document details DENTE's billing routes, double-posting prevention checks, and shared family wallet mechanics.

---

## 🔒 Payment Idempotency Gating

To prevent duplicate charges (double-billing) during network lag or accidental double clicks, DENTE implements a strict idempotency validation layer.

*   **Ident ID:** Every billing transaction expects a client-generated UUID `clientMutationId`.
*   **Pipeline (`apps/api/src/routes/billing.ts`):**
    1.  On `POST /api/billing/payments`, the server checks for an existing record matching the `clientMutationId`:
        ```typescript
        const existingPayment = await findPaymentByClientMutationIdInDb(orgId, input.clientMutationId);
        ```
    2.  If an existing record is found, the server compares the new input fields (amount, visit, document, payment method, tax deduction details) against the saved record using `paymentRetryMatchesExisting()`:
        *   **Matches:** The server returns the existing payment record with status `200 OK` (safely resolving the request).
        *   **Mismatches:** The server returns `409 Conflict` (alerting the client that the transaction ID is already registered under different details).
    3.  If no record exists, a new payment is created with status `201 Created`.

---

## 👥 Family Finance & Shared Wallets

DENTE allows family members to pool resources and pay for treatments using a shared financial wallet.

### 1. Database Relations (`apps/api/src/db/schema.ts`)
*   **Table `family_groups`:**
    *   `id` — UUID primary key.
    *   `name` — Group name (e.g. "Ивановы").
    *   `walletBalanceRub` — Total funds available for all family members.
    *   `organizationId` — Org scope.
*   **Table `patients`:**
    *   `familyGroupId` — Nullable UUID reference to `family_groups.id`.

### 2. Family Operations (`apps/api/src/routes/finance_family.ts`)
*   `GET /api/finance/family/patient/:patientId` — Fetches the family wallet and all related members for a patient.
*   `POST /api/finance/family/payment` — Deducts money from the family wallet balance.
    *   Verifies the family group exists and belongs to the caller's organization.
    *   Deducts `amountRub` from `familyGroups.walletBalanceRub` inside a transaction.
    *   Creates a corresponding record in the `payments` table associated with the patient, indicating the family group source.
*   **Broadcast Alert:** Updates to family financial groups trigger a WebSocket notification via `wsBroker.broadcastToOrganization(organizationId, ...)` to sync admin interfaces immediately.
