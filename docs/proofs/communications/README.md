# Red Team Communications & Omnichannel Messaging Inquisition (Domain 31)

## Canonical 4-State Visual Proofs (Mandate 8d / 8al / 8am)
Captured on live application running with real PostgreSQL 18 and Fastify backend (`http://127.0.0.1:5173/`):
- `01_communications_pc_light_1440x900.png` (146 KB) — PC Light 1440x900: Communications center, active tasks queue, quick response templates, zero-clipping tabs.
- `02_communications_pc_dark_1440x900.png` (148 KB) — PC Dark 1440x900: 100% dark semantic tokens (`var(--paper)`, `var(--ink)`, `var(--line)`), zero blinding white patches.
- `03_communications_mobile_light_390x844.png` (49 KB) — Mobile Light 390x844: iOS Apple HIG presentation, channel chips (`Все каналы`, `WhatsApp`, `Telegram`, `SMS`), grouped patient cards, >= 44px touch targets.
- `04_communications_mobile_dark_390x844.png` (49 KB) — Mobile Dark 390x844: High contrast dark theme on mobile, zero horizontal scroll drift (`0px`).
- `05_omnichannel_chat_pc_light_1440x900.png` (148 KB) — Omnichannel Chat Desk PC Light: Multi-channel bot operator desk (`TG, VK, WA, MAX`), live chat feed, doctor/operator takeover (`👤 Перехватить`), quick templates.

## Architecture & Mandates Compliance
1. **Mandate 8bd (Scout -> Verbatim -> Fixer)**:
   - Eradicated 16 in-memory mock files and duplicate catalogs (`git rm`).
   - Removed fake organization ID `4a3420d1-6ffb-4459-bd8f-7f7087f5e191`.
2. **PostgreSQL 18 Outbox Integration**:
   - `telegramOutboxDelivery.ts` stores delivery receipts in Postgres 18 (`recordDenteTelegramOutboxDeliveryDb`, `findDenteTelegramOutboxDeliveryReceiptDb`, `claimDenteTelegramOutboxDeliveryReceiptDb`).
   - `telegramOutboxWorker.ts` hydrates domain state from Postgres 18 (`hydrateDomainStateFromDb`).
3. **Template Engine Consolidation**:
   - `MessageTemplateEngine.ts` and `templateRenderer.ts` unified to single canonical SSOT table `communicationTemplates`.
   - Dynamic portal and SBP payment links via environment configuration.
4. **Mandate 8am / 8zg (Button Purity & Clean Clinical Language)**:
   - Exactly 1 Primary CTA teal (`#0d9488`).
   - Zero "1 клик" dev-slang in UI.
5. **Quality Verification**:
   - Exit code 0 on all 12 machine gates (`check:encoding`, `check:buttons`, `check:css-tokens`, `check:react-hooks`, `check:migration-drift`, `check:stub-overrides`, `check:fetch-response`, `check:dynamic-imports`).
   - All 47 API unit/integration tests and web decomposition tests passing cleanly.
