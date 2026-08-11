# Communications & Bots Engine - Deep Dive Documentation

This document outlines the technical implementation of the webhook processing pipeline, outbound message dispatchers, chat linking mechanics, and the `communication_tasks` queue within the DENTE CRM system.

## 1. Webhook Processing Pipeline

The API integrates with three distinct messenger platforms (Telegram, WhatsApp, and MAX), each with specialized webhook ingress strategies.

### Telegram (`routes/telegram.ts`)
- **Ingress Endpoints:** `POST /api/telegram/webhook` (and variants with `organizationId`/`botConfigId`).
- **Authentication:** Validates the `x-telegram-bot-api-secret-token` via constant-time comparison (`timingSafeSecretEqual`). By default, omitting the secret is strictly disallowed outside of explicit `development`/`test` environments to prevent spoofing.
- **Idempotency:** Uses `hasDenteTelegramWebhookUpdate` to drop duplicate `update_id` payloads.
- **Processing:** Payload bodies are safely parsed using `parseTelegramRouteBody` and schema validation. `detectUpdateKind` triages the message (text, photo, voice, command, callback query).
- **Synchronous Response:** Because Telegram requires immediate results or processes synchronous replies, the webhook generates interactive "suggested replies" (e.g., UI cards, safe keyboards via `safeCommandKeyboard`) and returns them as a `200 OK` JSON response.
- **PHI Constraints:** The pipeline operates strictly within a "No PHI" boundary. Text, photos, and voice attachments are rejected as medical records in favor of deep links to a secure web portal (`secure_portal_links`).

### WhatsApp (`routes/whatsapp.ts`)
- **Ingress Handshake:** Meta requires a `GET /api/whatsapp/webhook` handshake. The pipeline bypasses Row-Level Security (RLS) to look up the organization by `hub.verify_token`, then replies synchronously with `hub.challenge`.
- **Event Ingest:** `POST /api/whatsapp/webhook` runs on a custom content parser capturing raw bytes to validate the Meta `x-hub-signature-256` HMAC using `WHATSAPP_APP_SECRET`. 
- **Decoupled Execution:** To prevent Meta from retrying payloads, the route immediately acknowledges with `200 { received: true }` before processing the body.
- **Ingestion & DB Sync:** The handler extracts `messages` and `statuses` (read receipts, delivery reports). Receipts are delegated to `applyReceipts()`. Text events are mapped to `messengerInboundEvents`, and a background asynchronous task (`processInboundEvents()`) handles the actual inbox ingestion.

### MAX / VK Max (`routes/max.ts`)
- **Ingress Endpoints:** `POST /api/max/webhook`.
- **Authentication:** Bot ownership is resolved using the `x-max-bot-id` header or `botId` query parameter, cross-referenced against `MAX_WEBHOOK_SECRET`.
- **Decoupled Execution:** Like WhatsApp, it ACKs immediately with `200 { ok: true }` and defers processing.
- **Ingestion:** Uses `withSuperuserBypass` to locate the tenant by bot ID, stores the raw payload in `messengerInboundEvents`, and floats `processInboundEvents()`.

---

## 2. Outbound Message Dispatchers

### Telegram Outbox
- **Queue Engine:** Dispatching is driven by an asynchronous worker (`startDenteTelegramOutboxDueWorker`) tracking positions using `scheduledAt`. 
- **Chunked Delivery:** Handles compound messages (photo + long text). If a text payload fails after a photo has been sent, it tracks partial delivery states (`TelegramOutboxDeliveredParts`) to prevent patients from receiving duplicate images on the next retry.
- **Idempotency:** Generates a deterministic `clientMutationId` from the queue item ID and scheduled time to safely replay blocked/failed deliveries.

### WhatsApp Dispatcher
- **Implementation:** Handles `POST /api/whatsapp/send`.
- **Execution:** Validates phone numbers via `normalizeWhatsappRecipient` and uses `sendWhatsappTextMessage`.
- **Audit Trails:** Resolves the `patientId` strictly within the clinic's `organizationId`. Upon completion, writes a `sent` or `failed` log to `communicationEvents`.
- **Real-Time Sync:** Uses `wsBroker.broadcastToOrganization` to alert the frontend of successful transmissions.

### MAX Dispatcher
- **Implementation Status:** The endpoint `POST /api/max/send` is actively stubbed. It logs a warning and returns `501 MaxSendNotImplemented` because public contracts for the VK Max business API are not standardized. The UI gracefully degrades rather than faking a "sent" status.

---

## 3. Chat Linking (Telegram)

- **Mechanism:** Chat linking binds an anonymous Telegram user to a CRM Patient or Staff profile.
- **Validation:** When text containing a link code is received on the webhook, `extractDenteTelegramLinkCode` parses it. 
- **Security Gates:**
  - **Private Only:** Codes entered in public groups or channels are strictly rejected (`linkCodeRejectedByChatType`).
  - **Rate Limiting:** Protects against brute-force attacks via `telegramLinkCodeRateLimitExceeded`, blocking rapid repeated failures.
- **Persistence:** Successfully consumed codes call `persistTelegramChatLinkToDatabase` and `upsertDenteTelegramChatLink`, generating a stable `chatFingerprint` for future routing.

---

## 4. `communication_tasks` Queue

The `communicationTasks` schema tracks actionable items requiring clinic staff intervention (e.g., calling a patient back, follow-up resolutions). 

- **Completion Endpoint:** `POST /api/communications/tasks/complete` (`routes/communications.ts`).
- **Tenant Perimeter Validation:** The route guards against cross-tenant mutations by deriving the `organizationId` from the authenticated token (`requireResolvedOrganizationId`). This explicitly fixes a severe historical defect where a naive `LIMIT 1` query updated the task for the wrong clinic.
- **Defense-in-Depth:** The `UPDATE` query enforces `WHERE id = ? AND organizationId = ?`. If the task does not belong to the user's clinic, the query returns an empty `RETURNING` array and safely aborts with `404 Not Found`.
- **Audit Logging:** Completing a task automatically injects a durable audit row into `communicationEvents` (recording actor ID, original note, outbound channel, and the final state) within the same transactional boundary.
