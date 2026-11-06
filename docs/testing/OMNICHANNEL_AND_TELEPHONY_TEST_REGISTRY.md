# 📞 ОМНИКАНАЛЬНАЯ ТЕЛЕФОНИЯ, МЕССЕНДЖЕРЫ И ТРАНЗАКЦИОННЫЙ OUTBOX — РЕЕСТР ТЕСТОВ (SSOT)

> 🏛️ **СТАТУС И ВЫСШАЯ КОНСТИТУЦИЯ:**  
> Документ является каноническим реестром приёмочных тестов и доказательной базы коммуникационного контура клиники DENTE Dental CRM:
> 1. IP-телефония АТС (Mango Office, Zadarma, UIS / CoMagic)
> 2. Мессенджеры прямого диалога (Telegram Bot, WhatsApp Business WABA, MAX / VK Max)
> 3. Отказоустойчивый транзакционный Outbox Dispatcher (Transactional Outbox Pattern)
> 4. Иммунитет стерильной зоны врача у кресла (Мандат 8v: Zero-Distraction Law)
>
> 🎯 **СТРАТЕГИЧЕСКИЙ ПРИОРИТЕТ №1:**  
> Соло-врач (1–2 кресла, субаренда, ИП) и малая частная клиника (1–3 кресла). Экран врача стерилен от звонков и не прерывается во время препарирования зуба или операции. Регистратура получает компактную Ambient Capsule в шапке без блокирующих модальных оверлеев (`fixed inset-0 bg-black/60` запрещен).

---

## 🧭 1. СТРУКТУРА ТЕСТОВОГО КОМПЛЕКСА

| Файл сьюта | Назначение | Время выполнения | Покрытие |
| :--- | :--- | :--- | :--- |
| [`apps/api/src/tests/routes/omnichannelTelephonyAndOutbox.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/tests/routes/omnichannelTelephonyAndOutbox.test.ts) | Комплексный боевой сьют: Outbox, backoff, DLQ, CTI lookup, WebSocket, роли, 152-ФЗ | ~3.7 с | 20 тестов (100% PASS) |
| [`apps/api/src/services/telephony/__tests__/omnichannelOutboxAndTelephony.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/telephony/__tests__/omnichannelOutboxAndTelephony.test.ts) | Сервисный фасад-делегат в домене телефонии | ~5.9 с | 20 тестов (100% PASS) |
| [`apps/api/src/tests/routes/telephonyWsAndOutboxAuditing.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/tests/routes/telephonyWsAndOutboxAuditing.test.ts) | WebSocket брокер, чистка мертвых сокетов, HMAC-подписи WhatsApp | ~2.3 с | 14 тестов (100% PASS) |
| [`apps/api/src/tests/routes/telephonyCallerLookup.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/tests/routes/telephonyCallerLookup.test.ts) | CTI Screen Pop: поиск пациента в PostgreSQL 18 по 10-значному суффиксу | ~3.6 с | 4 теста (100% PASS) |
| [`apps/api/src/tests/routes/telephonyCallLifecycle.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/tests/routes/telephonyCallLifecycle.test.ts) | Жизненный цикл звонка: /calls/answer, /calls/end, броадкаст | ~2.8 с | 2 теста (100% PASS) |
| [`apps/api/src/tests/services/outboxResilience.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/tests/services/outboxResilience.test.ts) | In-memory FIFO, WAL journal на диске, DLQ replay, фискальная касса | ~4.1 с | 15 тестов (100% PASS) |

---

## 🛡️ 2. ПРОВЕРЯЕМЫЕ АРХИТЕКТУРНЫЕ ИНВАРИАНТЫ

### Инвариант 1: Транзакционный Outbox и суб-50мс задержка добавления
- Исходящие напоминания и сервисные уведомления сохраняются в очереди `communication_outbox` / `PersistentOutboxService` синхронно за $<50$мс со статусом `pending` / `queued` и `attempts = 0`.
- Клиентский `Idempotency-Key` (UUIDv7) предотвращает дублирующие сообщения при повторных кликах пользователя или ретраях сети: метод `enqueue` возвращает `{ isDuplicate: true }` со ссылкой на существующий элемент.
- Захват пачки сообщений воркером выполняется через `claimBatch` с блокировкой `FOR UPDATE SKIP LOCKED`, гарантируя, что две параллельные реплики бэкенда никогда не отправят одно и то же напоминание дважды.

### Инвариант 2: Сетевой хаос, экспоненциальный Backoff и Dead Letter Queue (DLQ)
- При сетевом сбое (HTTP 500, ECONNREFUSED, таймаут шлюза) статус переходит в `queued`, а счетчик `attempts` инкрементируется.
- Функция `computeRetryDelaySeconds` рассчитывает экспоненциальную задержку: $delay = base \times 2^{attempt - 1} \times jitter(0.8..1.2)$. Задержки монотонно растут (2с, 4с, 8с, 16с...), исключая давку шлюза (thundering herd).
- При достижении `maxAttempts` (по умолчанию 5) функция `decideAfterFailure` переводит сообщение в финальный статус `failed` / DLQ с фиксацией ошибки и вызовом аудиторского алерта. Бесконечные циклы заблокированы.
- При восстановлении шлюза (200 OK) сообщение переходит в статус `sent` / `delivered`, фиксируется `sentAt`, снимаются блокировки `lockedAt: null`.

### Инвариант 3: Изоляция от боевых ключей (Мандат 8af)
- В тестах категорически запрещено использовать реальные API-ключи из `.env`.
- Тесты используют строго синтетические токены: `mock-telegram-token-omnichannel`, `mock-whatsapp-token-omnichannel`, `mock-max-token-omnichannel`, `mock-telephony-secret-xyz`.

### Инвариант 4: Иммунитет стерильной зоны врача (Мандат 8v & The Hammer Master Prompt)
- На экране врача у кресла (`VisitView` / роль `doctor` / `isSterileClinicalScreen = true`) софтфон полностью беззвучен и невидим (`IncomingCallPopup` возвращает `null`). Врач в перчатках защищен от внезапных звонков, перехвата фокуса и сброса вводимого дневника SOAP.
- На экране регистратора (`admin` / `reception`) входящий звонок отображается в виде компактной **Top Ambient Capsule** в шапке экрана без блокирующего оверлея (`fixed inset-0 bg-black/60` отсутствует), давая возможность создать запись за 5 секунд без обязательного выбора ассистента (Мандат 8n).

### Инвариант 5: Защита персональных данных (152-ФЗ) и SSRF-защита
- Функция `maskPhoneDisplay` маскирует телефонные номера в журналах аудита и логах: `+79161112233` ➔ `+7 (916) ***-**-33`, предотвращая утечку ПДн пациентов.
- Функция `validateSsrfSafeRecordingUrl` блокирует попытки SSRF-атак на внутренние адреса (127.0.0.1, 10.0.0.1, 192.168.0.1, 169.254.169.254) и опасные схемы (`file://`).

---

## 🚀 3. БОЕВЫЕ КОМАНДЫ ЗАПУСКА

```bash
# 1. Основной боевой сьют (время прогона ~3.7 с):
npx tsx --test apps/api/src/tests/routes/omnichannelTelephonyAndOutbox.test.ts

# 2. Сервисный фасад телефонии (~5.9 с):
npx tsx --test apps/api/src/services/telephony/__tests__/omnichannelOutboxAndTelephony.test.ts

# 3. Аудит WebSocket брокера и HMAC-подписей WhatsApp (~2.3 с):
npx tsx --test apps/api/src/tests/routes/telephonyWsAndOutboxAuditing.test.ts

# 4. CTI Screen Pop Caller Lookup в PostgreSQL 18 (~3.6 с):
npx tsx --test apps/api/src/tests/routes/telephonyCallerLookup.test.ts
```

---

## 📸 4. 4-STATE VISUAL PROOF (ЛИЧНЫЙ ОСМОТР ЧЕРЕЗ READ_FILE)

| Состояние | Путь к артефакту | Размер | Статус инспекции |
| :--- | :--- | :--- | :--- |
| ☀️ **PC Light (1440×900)** | `docs/proofs/telephony/telephony_01_pc_light_1440x900.png` | 204 КБ | `[ПРОВЕРЕНО: ЧИСТО]` — Ambient Top Capsule, 1 Primary CTA, 0px скролла |
| 🌙 **PC Dark (1440×900)** | `docs/proofs/telephony/telephony_02_pc_dark_1440x900.png` | 189 КБ | `[ПРОВЕРЕНО: ЧИСТО]` — 100% тёмные токены `slate-950`, ноль белых пятен |
| 📱 **Mobile Light (390×844)** | `docs/proofs/telephony/telephony_03_mobile_light_390x844.png` | 169 КБ | `[ПРОВЕРЕНО: ЧИСТО]` — Apple HIG Top Capsule, тач $\ge 44\times 44$px |
| 🌙 **Mobile Dark (390×844)** | `docs/proofs/telephony/telephony_04_mobile_dark_390x844.png` | 163 КБ | `[ПРОВЕРЕНО: ЧИСТО]` — WCAG AAA контраст, Thumb Zone навигация |
| 💬 **Омниканальный чат Light** | `docs/proofs/telephony/05_omnichannel_chat_pc_light_1440.png` | 298 КБ | `[ПРОВЕРЕНО: ЧИСТО]` — Единый чат WA/TG/SMS, шаблоны 1-клик |
| 💬 **Омниканальный чат Dark** | `docs/proofs/telephony/06_omnichannel_chat_pc_dark_1440.png` | 306 КБ | `[ПРОВЕРЕНО: ЧИСТО]` — Тёмная тема чата, статус связи с кэшем |
