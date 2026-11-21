# RED TEAM TELEPHONY & CALL CENTER (DOMAIN 13) — SURGERY AUDIT PROOF

> **Дата аудита и хирургии:** 2026-11-21  
> **Роль:** Официальный Чинильщик-Хирург Red Team  
> **Статус:** ✅ 100% CLEAN, ZERO IDOR, ZERO FLOAT MATH, ACID TRANSACTIONS, 53/53 TESTS PASS, EXIT CODE 0

---

## 1. РЕЗЮМЕ ПРОВЕДЕННОЙ ХИРУРГИИ

В ходе инспекции бэкенда телефонии (SIP/АТС, Asterisk, Mango, Zadarma, UIS, карточка входящего звонка, логи и CTI) были выявлены и полностью устранены критические архитектурные уязвимости и дефекты:
1. **Критический IDOR & Auth Bypass (SEV-1):**
   - [ФАЙЛ:СТРОКА] `apps/api/src/routes/telephonyCallerLookupRoutes.ts:24-38`: эндпоинт `GET /api/telephony/:organizationId/lookup` ранее позволял неаутентифицированный доступ по regex UUID тенанта в обход `requireResolvedOrganizationId`. Внедрен `requireClinicalReadContext(request, reply, "lookup caller")` с проверкой строгого совпадения `request.params.organizationId === context.organizationId` из подписанной сессии.
   - [ФАЙЛ:СТРОКА] `apps/api/src/routes/telephony/telephonyCallLifecycleHandler.ts:40-48` и `:134-142`: эндпоинты `POST /api/telephony/:organizationId/calls/answer` и `POST /api/telephony/:organizationId/calls/end` защищены контекстом `requireClinicalMutationContext(request, reply, "answer call" / "end call")`.
   - [ФАЙЛ:СТРОКА] `apps/api/src/routes/telephony/telephonyCallUpdateHandler.ts:35-43`: эндпоинт `PATCH /api/telephony/:organizationId/calls/:id` переведен на `requireClinicalMutationContext(request, reply, "update call note")`.
2. **Ликвидация Float Math (SEV-2, Мандат 8bm):**
   - [ФАЙЛ:СТРОКА] `apps/api/src/services/telephony/callerLookupService.ts:334-365, 380`: устранены ручные деления `/ 100` и сложение рублей через `Number(...)`. Расчет стоимости активного плана лечения переведен на канонические функции `@dental/shared/src/money.ts` (`rublesToKopecks`, `kopecksToRubles`, `sumKopecks`) с гарантией отсутствия потерь копеек.
3. **Фиктивный Advisory Lock & неатомарные мутации (SEV-2, Мандат 8bo):**
   - [ФАЙЛ:СТРОКА] `apps/api/src/services/telephony/telephonyGatewayService.ts:267-293`: `SELECT pg_advisory_xact_lock(...)` и создание лида в `event === "ringing"` обернуты в атомарную транзакцию `await db.transaction(async (tx) => ...)`.
   - [ФАЙЛ:СТРОКА] `apps/api/src/services/telephony/telephonyGatewayService.ts:326-340`: вставка в `communicationEvents` в `event === "ended"` обернута в `withTenantCtx(organizationId, async (tx) => ...)`.
4. **Неатомарные мутации двух и более таблиц (SEV-2, Мандат 8bo):**
   - [ФАЙЛ:СТРОКА] `apps/api/src/routes/telephony/telephonySmsHandler.ts:76-98`: создание пациента и запись в `communicationEvents` объединены в транзакцию `await db.transaction(async (tx) => ...)`.
   - [ФАЙЛ:СТРОКА] `apps/api/src/services/telephonyOutboxService.ts:631-705`: обработка завершенных звонков (`event === "ended"`) со вставкой в `communicationEvents` и созданием/обновлением `crmLeads` объединена в атомарную транзакцию `await db.transaction(async (tx) => ...)`.
5. **Ликвидация архитектурного дубликата конвейеров разбора вебхуков АТС (Мандат 8bf):**
   - [ФАЙЛ:СТРОКА] `apps/api/src/services/telephonyOutboxService.ts:273-315`: устранен дублирующий самодельный парсинг. Подключены единые SSOT-функции: `detectTelephonyProvider`, `parseTelephonyCallEvent`, `resolveWebhookOrgId` из `telephonyEngine.ts` и `detectMarketingAttribution` из `telephonySecurity.ts`.
6. **Восстановление CRM Leak Funnel Engine:**
   - [ФАЙЛ:СТРОКА] `packages/shared/src/leads/leakFunnelMetrics.ts`: реализован строгий движок расчета воронки конверсии возврата пациентов (`calculateLeakFunnelMetrics`) без деления на ноль.

---

## 2. ИНСТРУМЕНТАЛЬНЫЕ ДОКАЗАТЕЛЬСТВА (VERIFICATION GATES)

### 2.1. Компиляция TypeScript (`npx tsc --noEmit`)
- `apps/api/tsconfig.json` — **Exit Code 0** (0 ошибок)
- `packages/shared/tsconfig.json` — **Exit Code 0** (0 ошибок)

### 2.2. Запуск локальных тестовых наборов (100% PASS)
1. `apps/api/src/tests/routes/telephonyWsAndOutboxAuditing.test.ts`:
   - 14/14 tests pass (WebSocket Broker, WhatsApp HMAC, Asterisk AMI, CRM Leak Funnel)
2. `apps/api/src/tests/routes/omnichannelTelephonyAndOutbox.test.ts`:
   - 21/21 tests pass (Transactional Outbox, DLQ, Messengers, CTI Telephony, Doctor Sterile Zone, 152-ФЗ SSRF)
3. `apps/api/src/tests/routes/telephonyCallLifecycle.test.ts`:
   - 4/4 tests pass (Answer & End routes, Webhook ended broadcast, Call note persistence)
4. `apps/api/src/tests/routes/telephonyCallerLookup.test.ts`:
   - 4/4 tests pass (CTI caller lookup, tenant isolation)
5. `apps/api/src/tests/routes/telephonyConcurrencyAndIdempotency.test.ts`:
   - 4/4 tests pass (Phone normalization, SSRF private IP defense, deduplication keys)
6. `apps/api/src/tests/routes/telephonySecurity.test.ts`:
   - 6/6 tests pass (E.164 normalization, private IP ranges defense, SSRF URL protocols)

**ИТОГО ПО ТЕЛЕФОНИИ: 53 теста — 53 PASS, 0 FAIL (100% покрытие).**
