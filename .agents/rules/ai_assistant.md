---
description: "DENTE Chairside AI Copilot: single wise solo in-app assistant, clinical tools, code map, and doctor autonomy invariants"
trigger: always_on
---

# DENTE CLINICAL AI COPILOT — МУДРЫЙ СОЛО-АССИСТЕНТ КЛИНИКИ

> 🦷 **ЕДИНЫЙ ВНУТРЕННИЙ АССИСТЕНТ ПРОГРАММЫ (SOLO CHAIRSIDE COPILOT):**  
> Внутри Dental CRM работает **СТРОГО ОДИН МУДРЫЙ СОЛО-АГЕНТ**. Ноль внутренних роев внутри софта!  
> Умный, тактичный клинический советник за плечом врача у кресла.  
> Спецификации JIT: [`AI_ASSISTANT_RULES.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_RULES.md) и [`AI_ASSISTANT_ARCHITECTURE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_ARCHITECTURE.md).

---

## 1. ПОВЕДЕНИЕ И ФИЛОСОФИЯ МУДРОГО АГЕНТА

1. **Автономия врача абсолютна (Мандат 8e):** Софт для врача. Кнопки («Сохранить», «Печать», «Оплатить») **НИКОГДА** не disabled.
2. **Чистый клинический язык (Мандат 8x):** Запрет канцелярита в UI. Строго: **«Медицинская карта приёма»**, **«Дневник приёма»**, **«Прейскурант»**, **«Касса»**.
3. **Тактичность и лаконичность (T.A.R.S.):** Ноль сервильной шелухи. Сразу суть: готовый протокол SOAP, расчёт сметы или статус зуба.
4. **Пассивная безопасность (Мандат 8y):** Аллергии выводятся пассивной строкой `⚠️`, кнопка «Утвердить» ВСЕГДА доступна в 1 клик.
5. **Норма в 1 клик:** Здоровые состояния выставляются мгновенно, врач фиксирует только патологии. Debounced autosave на лету.

---

## 2. КЛИНИЧЕСКИЙ ИНСТРУМЕНТАРИЙ

- **Зубная формула**: `updateToothStatusTool` — разметка FDI (11–48 / 51–85) без затирания здоровых зубов.
- **Расписание**: `createAppointmentTool` — бронирование слотов без обязательного выбора ассистента (Мандат 8n).
- **Финансы / Касса**: `createInvoiceDraftTool` — сметы и чеки СТРОГО в копейках (`amountKopecks`, `BIGINT`).
- **Медицинская карта (ЭМК)**: `generateForm043Tool` (`clinicalProtocolTool`) — протоколы приёма по стандарту SOAP (Жалобы, Анамнез, Status Localis, МКБ-10, Лечение).
- **Печать**: `printDocumentTool` — протоколы ЭМК, согласия ИДС и договоры в 1 клик.
- **Голос**: распознавание речи для диктовки дневников приёма и поиска Ctrl+K.

---

## 3. КАРТА КОДА В РЕПОЗИТОРИИ

- **Промпты и поведение**: `apps/api/src/ai/harness/systemPromptBuilder.ts`
- **Диспетчеризация тулов**: `apps/api/src/ai/harness/toolDispatcher.ts`
- **Сессии и память**: `apps/api/src/ai/harness/sessionLifecycle.ts`
- **API эндпоинты**: `apps/api/src/routes/agentRoutes.ts`
- **Интерфейс студии / шторки**: `apps/web/src/components/copilot/CopilotStudioModal.tsx`
- **Стейт копайлота**: `apps/web/src/store/copilotStore.ts`

---

## 4. НЕПРИКОСНОВЕННЫЕ КЛИНИЧЕСКИЕ ИНВАРИАНТЫ

1. Аллергии пациента и соматические стоп-факторы неприкосновенны.
2. Номера зубов по формуле FDI (11–48 / 51–85) и коды МКБ-10.
3. Финансовые суммы строго в копейках (`amountKopecks`, BIGINT) — ноль float-ошибок.
4. Двухфазное подтверждение (`confirmation_required`) для любых мутаций базы данных и удаления.

---

## 5. БОЕВОЙ КАСКАД МОДЕЛЕЙ И РОТАЦИЯ КЛЮЧЕЙ

1. **Каскад моделей DENTE:**
   - **Smart Flash Tier (Основной интеллект)**: `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.8-flash` — КЛКТ, дифдиагноз, хирургия, протоколы.
   - **Lite Tier (<300 мс)**: `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite` — разметка формулы FDI, расписание, заметки (квота 500 RPD).
   - **Groq High-Throughput (Резерв)**: `qwen/qwen3.6-27b`, `llama-3.3-70b-versatile`.
   - **BYOK Frontier Models**: `claude-3-5-sonnet` (CoT Reasoner), `gpt-4o`, `deepseek-r1`.
2. **Пул ключей и ротация:** `GOOGLE_API_KEYS`, `GROQ_API_KEYS`, `OPENAI_API_KEYS` через `keyPool.ts` с кулдауном 429 и мгновенным локальным фолбеком.

---

## 6. ЗАПРЕТ СИМУЛЯЦИЙ И НАСТРОЙКИ ДОВЕРИЯ

- **Тотальный запрет симуляций:** Никаких захардкоженных ответов, фейковых `setTimeout` и псевдо-вызовов тулов. Ассистент работает реально: промпт -> тул -> Fastify API -> PostgreSQL 18 -> результат в UI.
- **Настройки копайлота:** Уровень доверия (`confirm_all` / `balanced` / `autonomous`), анимация мышления, сквозной голос, долговременная память сессий.
