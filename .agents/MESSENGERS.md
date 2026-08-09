# MESSENGERS — WhatsApp Business & MAX (VK Max)

> Status: IMPLEMENTED (schema + routes + UI). DB migration pending.
> Telegram remains in its own `telegram` settings tab — NOT touched here.

---

## Architecture

### Channels
| Channel | Status | API |
|---------|--------|-----|
| Telegram | ✅ Existing | `apps/api/src/routes/telegram.ts` |
| WhatsApp | ✅ Implemented | `apps/api/src/routes/whatsapp.ts` |
| MAX | ✅ Implemented | `apps/api/src/routes/max.ts` |

### DB Tables (need migration)
```sql
dente_whatsapp_bot_configs  -- 1 row per org, unique on organization_id
dente_max_bot_configs        -- 1 row per org, unique on organization_id
messenger_inbound_events     -- unified inbound log for all channels
```

### Security Model
- Raw tokens are NEVER stored. All tokens are SHA-256 hashed to `tokenSecretRef`.
- WhatsApp `webhookVerifyToken` is stored plaintext (low-sensitivity — it's just used for handshake verification).
- Inbound webhook payloads logged to `messenger_inbound_events.rawPayload` (JSONB).

---

## API Routes

### WhatsApp
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/whatsapp/settings` | org user | Get bot config (no raw token) |
| PUT | `/api/whatsapp/settings` | staff/admin | Create or update config |
| GET | `/api/whatsapp/status` | org user | Connection status |
| GET | `/api/whatsapp/webhook` | public | Meta webhook verification |
| POST | `/api/whatsapp/webhook` | public | Receive inbound events |

### MAX
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/max/settings` | org user | Get bot config (no raw token) |
| PUT | `/api/max/settings` | staff/admin | Create or update config |
| GET | `/api/max/status` | org user | Connection status |
| POST | `/api/max/webhook` | public | Receive inbound events |

---

## Frontend

### New tab
- `settingsTabs`: `{ id: "messengers", title: "Мессенджеры" }` added after `telegram` tab in `AppHelpers.tsx`.
- `SettingsTabId` type updated in: `SettingsView.tsx`, `SettingsAuditTab.tsx`, `SettingsImportsTab.tsx`.

### Components
```
apps/web/src/
  hooks/
    useWhatsappSettings.ts          # isolated WA hook (no god context)
    useMaxSettings.ts               # isolated MAX hook (no god context)
  components/settings/
    MessengerRoutingRules.tsx       # shared routing rules UI
    WhatsappSettingsPanel.tsx       # WhatsApp panel (uses useWhatsappSettings)
    MaxSettingsPanel.tsx            # MAX panel (uses useMaxSettings)
    SettingsMessengersTab.tsx       # container with WA/MAX sub-tabs
```

### Staff Routing Rules
Each messenger config has `staffRoutingJson` (TEXT):
```json
{
  "defaultUserId": "uuid | null",
  "rules": [
    { "intent": "appointment_booking", "assignToUserId": "uuid | null" },
    { "intent": "document_request", "assignToUserId": "uuid | null" }
  ]
}
```

Available intents: `appointment_booking`, `appointment_status`, `document_request`, `payment_question`, `recall_request`, `general_question`.

---

## Setup Instructions for Operators

### WhatsApp Business
1. Meta Business Console → WhatsApp → API Setup
2. Get Phone Number ID + System User Token
3. Set Webhook URL: `https://your-domain.com/api/whatsapp/webhook`
4. Set Verify Token — any string, must match what you enter in DENTE settings
5. Enable Events: `messages`

### MAX (VK Max)
1. Login to [business.max.ru](https://business.max.ru) with verified business account
2. Чат-боты → Create bot → Get Bot ID + API Token
3. Set Webhook URL: `https://your-domain.com/api/max/webhook`
4. Add header `x-max-bot-id: <your-bot-id>` in MAX webhook settings

> ⚠️ **MAX requires business registration** (ИП or ООО verified via Госуслуги or banking).

---

## Pending

1. **DB Migration**: Tables exist in schema but need a migration file or `drizzle-kit push` to apply to the actual database.
2. **Feature toggles**: UI shows features as read-only. Editing `enabledFeatures` for WA/MAX not yet wired — POST to `staffRouting` works, feature array save is a future ticket.
3. **Real token storage**: Production deployments should replace the SHA-256 mask approach with a proper secrets vault (e.g., KMS, Vault, or env-var based lookup).
4. **Outbox/send**: `POST /api/whatsapp/send` and `POST /api/max/send` not yet implemented — needed for outbound messages.
5. **staffOptions prop**: `SettingsMessengersTab` receives `props.staffOptions` — the parent `SettingsView.tsx` currently passes `props={{}}`. Wire in real staff list from context when integrating fully.
