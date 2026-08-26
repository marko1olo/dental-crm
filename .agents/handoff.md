# Handoff Report — WhatsApp Kapso & Patient Communication Swarm Port

## Observation
Successfully reverse-engineered the entire communication stack from `C:\Users\Admin\.gemini\antigravity\scratch\dentalpin` (`backend/app/modules/whatsapp_kapso/`, `backend/app/modules/notifications/`, `backend/app/modules/recalls/`, `docs/adr/0016-channel-adapter-architecture.md`, `docs/adr/0017-inbound-conversation.md`) and built an industrial-grade TypeScript implementation for `@dental/api` and `@dental/web`.

## Logic Chain & Implementation Detail
1. **Core ChannelAdapter Architecture (`apps/api/src/services/messaging/types.ts` & `channelRegistry.ts`)**:
   - Standardized `ChannelAdapter` contract (`channel`, `adapterName`, `supports(orgId)`, `send(msg)`).
   - Dynamic `ChannelRegistry` managing multi-vendor adapters (`whatsapp_kapso`, `telegram`, `sms`, `email`).
2. **WhatsApp Meta Cloud API & Kapso Adapter (`apps/api/src/services/messaging/whatsappKapsoAdapter.ts`)**:
   - Formats Meta template payloads with named and positional parameters.
   - Interactive button message payloads for 1-click patient appointment confirmation and action selection.
   - Constant-time HMAC-SHA256 signature verification (`verifyWebhookSignature`) preventing timing attacks.
   - Webhook parser for inbound messages, interactive button replies, and delivery receipts (`delivered`, `read`, `failed`).
3. **Multi-Lingual Template Engine (`apps/api/src/services/messaging/templateEngine.ts`)**:
   - Variable interpolation (`{{patient_name}}`, `{{appointment_date}}`, `{{clinic_name}}`, `{{total_amount}}`, `{{payment_url}}`).
   - Catalog of standard clinical templates: `appointment_confirmation`, `appointment_reminder`, `appointment_cancelled`, `post_op_instructions`, `invoice_payment_link`, `recall_reminder`, `welcome`.
   - Locales: `ru`, `es`, `en` with fallback and kopeck-exact currency formatting.
4. **Notification Gateway & 24h Session Window Manager (`apps/api/src/services/messaging/notificationGateway.ts`)**:
   - Durable outbox enqueueing with dedupe key idempotency.
   - Strict 24h Meta session window gating (`isSessionWindowOpen`): free-form session messages are gated to active windows; template messages outside.
   - Outbox batch dispatch loop with exponential backoff (`calculateBackoffSeconds` 1m..1h).
   - Inbound webhook ingestion with patient phone resolution and WebSocket event broadcasting.
5. **Automated Recall State Machine (`apps/api/src/services/messaging/recallStateMachine.ts`)**:
   - State lifecycle: `pending` → `contacted_no_answer` → `contacted_scheduled` / `contacted_declined` / `needs_review` → `done`.
   - Inbound reply parsing (natural language "Да"/"Подтверждаю"/"Буду" / buttons `APPT_CONFIRM` → `contacted_scheduled`).
   - Post-treatment auto-suggestion of next recall interval (hygiene: 6 mo, surgery: 1 mo, ortho: 1 mo, checkup: 12 mo).
6. **Frontend Communication Widgets (`@dental/web`)**:
   - `WhatsAppKapsoSettingsDrawer.tsx`: Full settings drawer for WABA credentials, webhook URL copy, template sync, and test message sending.
   - `PatientWhatsAppConversationWidget.tsx`: 2-way patient WhatsApp chat thread, delivery status indicators, 24h session status, and quick action chips.
   - `RecallAutomationPipelineWidget.tsx`: Recall automation dashboard with conversion telemetry and 1-click reminders.

## Caveats & Edge Cases Handled
- WhatsApp 24h Window Rule: Free-form session replies outside 24h since last inbound message are rejected with `whatsapp_session_window_closed` to prevent Meta policy violations.
- Meta Webhook Signature: Constant-time comparison via `crypto.timingSafeEqual` prevents side-channel timing attacks.
- Frontend Route Parity: Verified 100% route contract alignment with `apps/api/src/routes/` (`src/tests/webCallsExistingRoutes.test.ts` passing 9/9).

## Verification Method & Results
- Unit Tests: `npm test -w @dental/api` ran 26 messaging tests (`src/services/messaging/__tests__/`) — **26/26 passed, 0 failures**.
- Route Parity Tests: `src/tests/webCallsExistingRoutes.test.ts` — **9/9 passed, 0 failures**.
- Static Typecheck: `npm run typecheck` across `@dental/shared`, `@dental/api`, and `@dental/web` — **Exit Code 0, 0 errors**.
