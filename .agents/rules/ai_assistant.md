---
description: "DENTE Chairside AI Copilot: solo chairside assistant, clinical tools, code map, invariants"
trigger: always_on
---

# DENTE CLINICAL AI COPILOT — МУДРЫЙ СОЛО-АССИСТЕНТ КЛИНИКИ

> 🦷 **SOLO COPILOT:** В софте работает СТРОГО 1 СОЛО-АГЕНТ (ноль роев в UI!). Умный клинический советник у кресла.

## 1. ПОВЕДЕНИЕ И ФИЛОСОФИЯ
1. **Автономия врача (Мандат 8e):** Кнопки («Сохранить», «Печать», «Оплатить») НИКОГДА не disabled.
2. **Клинический язык (Мандат 8x):** «Медицинская карта приёма», «Дневник приёма», «Прейскурант», «Касса». Ноль канцелярита.
3. **T.A.R.S.:** Сразу суть: готовый SOAP, смета или статус зуба. Ноль сервильности.
4. **Пассивная безопасность (Мандат 8y):** Аллергии строкой `⚠️`, Primary CTA всегда доступен в 1 клик.
5. **Норма в 1 клик:** Здоровые состояния выставляются мгновенно; дебаунс-автосейв на лету.

## 2. КЛИНИЧЕСКИЙ ИНСТРУМЕНТАРИЙ
- Зубная формула: `updateToothStatusTool` — FDI (11–48 / 51–85) без затирания нормы.
- Расписание: `createAppointmentTool` — слоты без обязательного ассистента (Мандат 8n).
- Финансы: `createInvoiceDraftTool` — сметы/чеки СТРОГО в копейках (`amountKopecks`, `BIGINT`).
- ЭМК: `generateForm043Tool` (`clinicalProtocolTool`) — протоколы SOAP (Жалобы, Анамнез, Status Localis, МКБ-10, Лечение).
- Печать: `printDocumentTool` — протоколы, согласия ИДС и договоры в 1 клик.
- Голос: сквозное распознавание для дневников и Ctrl+K.

## 3. КАРТА КОДА
- Промпты/роли: `apps/api/src/ai/harness/systemPromptBuilder.ts`, `swarmRoles.ts` (`ClinicalCopilotSpecialization`).
- Диспетчер/сессии: `toolDispatcher.ts`, `sessionLifecycle.ts`, роуты: `apps/api/src/routes/agentRoutes.ts`.
- HUD кресла: `apps/web/src/components/copilot/ChairsideCopilotHUD.tsx`, шторка: `CopilotStudioModal.tsx`, стор: `copilotStore.ts`.

## 4. НЕПРИКОСНОВЕННЫЕ ИНВАРИАНТЫ
1. Аллергии и стоп-факторы неприкосновенны. Формула FDI и МКБ-10.
2. Суммы строго в копейках (`amountKopecks`, BIGINT) — 0 float-ошибок.
3. Двухфазное подтверждение (`confirmation_required`) для мутаций БД и удаления.
4. Запрет симуляций: ноль фейковых setTimeout(1500) и захардкоженных шагов. Работа реальна: промпт -> тул -> Fastify -> PG18 -> UI.
5. Desktop I/O в веб-режиме возвращает `DESKTOP_DENIED` с пояснением о доступности в DENTE Desktop. Токены Мандата 8am (`var(--danger)`).
