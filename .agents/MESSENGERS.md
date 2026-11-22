# MESSENGERS — WhatsApp Business & MAX (VK Max)

> ⚠️ ВЫСШАЯ КОНСТИТУЦИЯ (THE SUPREME LAW): [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и [`.agents/AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md).
>
> 🎯 СТРАТЕГИЧЕСКИЙ ПРИОРИТЕТ №1 И ГЛАВНЫЙ АКЦЕНТ СИСТЕМЫ:
> Соло-врач (1–2 кресла, субаренда, ИП/самозанятый) и небольшая клиника (1–3 кресла).
> Мессенджеры служат инструментом моментальной связи с пациентом: шаблоны напоминаний, подтверждение визита в 1 клик, отсутствие блокировок диалога.
>
> 🛑 ЗАКОН ОТСУТСТВИЯ ТУПИКОВ (ZERO DEAD-ENDS — МАНДАТ 8n):
> Сбой доставки или отсутствие ответа в мессенджере никогда не блокируют расписание и не отменяют визит автоматически.

> 🧭 **Navigation:** [🗺️ Master Documentation Index (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Documentation Knowledge Hub (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)
> Status: IMPLEMENTED & VERIFIED (SEV-1/SEV-2 resolved, AES-256-GCM token encryption, dead duplicates purged, 4-state visual proofs verified).
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
- Tokens are encrypted at rest using AES-256-GCM (`OmnichannelTokenVault.encrypt(token, organizationId)`) with tenant-isolated AAD.
- Token resolution and decryption are enforced before outbound dispatches in `routes/max.ts` and `services/communications/channelRouter.ts`.
- WhatsApp `webhookVerifyToken` is stored plaintext (low-sensitivity — it's just used for handshake verification).
- Inbound webhook payloads logged to `messenger_inbound_events.rawPayload` (JSONB).

---

## API Routes

### WhatsApp
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/whatsapp/settings` | org user | Get bot config (masked token) |
| PUT | `/api/whatsapp/settings` | staff/admin | Create or update config (AES-256 encrypted) |
| GET | `/api/whatsapp/status` | org user | Connection status |
| GET | `/api/whatsapp/webhook` | public | Meta webhook verification |
| POST | `/api/whatsapp/webhook` | public | Receive inbound events (batch array loop) |
| POST | `/api/whatsapp/send` | staff/admin | Send outbound message via Meta Cloud API / Green API |
| POST | `/api/whatsapp/test-message` | staff/admin | Test message delivery |
| POST | `/api/whatsapp/media/upload` | staff/admin | Real multipart upload to disk & attachments table |

### MAX (VK Max)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/max/settings` | org user | Get bot config (masked token) |
| PUT | `/api/max/settings` | staff/admin | Create or update config (AES-256 encrypted, enabledFeatures, staffRouting) |
| GET | `/api/max/status` | org user | Connection status |
| POST | `/api/max/send` | staff/admin | Send outbound text message via decrypted token |
| POST | `/api/max/webhook` | public | Receive inbound events (batch array loop) |

### Единый диалог (Inbox)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/communications/inbox/:patientId` | org user | Чтение сквозной истории переписки с пациентом |
| POST | `/api/communications/inbox/:patientId/send` | staff/admin | Универсальная отправка в выбранный канал (WA, Telegram, MAX, SMS) |

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

> ⚠️ MAX requires business registration (ИП or ООО verified via Госуслуги or banking).

---

## Решенные архитектурные дефекты (Red Team Triage)

1. Реальная маршрутизация персонала (DEF-COMM-01): В `settingsPropsBuilder.ts` проброшен реальный список активных сотрудников клиники (`staffOptions`). В `WhatsappSettingsPanel`, `MaxSettingsPanel` и `MessengerRoutingRules` выпадающие списки наполняются живыми сотрудниками.
2. Вкладка MAX в панели табов (DEF-COMM-02): В `SettingsMessengersTab.tsx` возвращена таб-кнопка «MAX (VK Max)» в полосу `messenger-channel-tabs`.
3. Ликвидация чужого бренда (DEF-COMM-03): В `messengerChannelTypes.ts` искоренено «1C:MAX Интеграция» → переименовано в «MAX (VK Max) — Национальный мессенджер».
4. Управление фичами MAX (DEF-COMM-04): В `useMaxSettings.ts` и `MaxSettingsPanel.tsx` реализовано интерактивное управление `enabledFeatures` (чат, уведомления, напоминания) с сохранением в БД и расчетом dirty-стейта.
5. Надежная адресация MAX (DEF-COMM-05 & DEF-COMM-06): В `channelAdapters.ts` ликвидирован хрупкий regex в `notes` — адрес `chatId` извлекается напрямую из реляционной таблицы `messengerInboundEvents` с сохранением обратной совместимости.
6. Омниканальный выбор каналов у кресла (DEF-COMM-07 & DEF-COMM-08): В `WhatsAppChatPanel.tsx`, `WhatsAppQuickBar.tsx` и `PatientWhatsappSendPanel.tsx` добавлен селектор каналов (WhatsApp / Telegram / MAX / SMS) для врача у кресла.

---

## Pending

1. Real token storage: Production deployments should replace the SHA-256 mask approach with a proper secrets vault (e.g., KMS, Vault, or env-var based lookup).
2. VK Send API: ВКонтакте принимает сообщения через вебхук сообщества; прямая исходящая отправка по API сообществ VK запланирована в следующем релизе.
