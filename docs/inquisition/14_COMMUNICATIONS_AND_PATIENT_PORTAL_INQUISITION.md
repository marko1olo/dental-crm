# 14. COMMUNICATIONS & PATIENT PORTAL AUDIT & RED TEAM INQUISITION

## 1. Обзор и архитектурный контекст (Mandates 8e, 8n, 8x, 8ap, 8wy)

Аудит коммуникационной подсистемы (Телефония CTI, Софтфон, WhatsApp, Telegram) и Пациентского портала (Онлайн-запись, Терминал самообслуживания / Self-checkin, Личный кабинет пациента, Telegram Mini App).

### Ключевые архитектурные инварианты:
1. **Нормализация номеров телефонов (E.164)**:
   - Все телефонные номера приводятся к единому формату `+7XXXXXXXXXX` через `normalizePhoneDigits`.
   - Защита от аварийных падений на скобках, дефисах, пробелах и спецсимволах.
2. **Мандат 8e (Doctor Sterile Zone Immunity)**:
   - Всплывающие модальные окна входящих звонков (`IncomingCallFloatingModal`) подавляются на клинических экранах (`#visit`, `#odontogram`, `#periodontics`) и при активной роли врача (`suppressCallModal: true`).
   - Приём пациента и ведение медицинской карты стерильны от навязчивых поп-апов; звонок фиксируется в пассивном индикаторе телефонии.
3. **Софтфон и плавающий виджет**:
   - Гарантированная передача пропсов: `callerId`, `patientName`, `patientId`, `durationSeconds`, `callStatus`.
   - Индикация активного вызова, таймер длительности звонка, переключение линий и удержание (Hold).
4. **Шаблонизатор мессенджеров (WhatsApp / Telegram)**:
   - Чистая интерполяция переменных (`appointmentDate`, `clinicName`, `doctorName`).
   - Отсутствие необработанных промисов, `undefined` и утечек внутренних ключей в сообщениях пациенту.
5. **Мандат 8wy (Боевой прод vs Демо-витрина) и Day 0 Purity**:
   - В боевом режиме (`isDemoShowcaseMode() === false`) онлайн-запись и личный кабинет отображают честные Day 0 пустые состояния: никаких фейковых врачей, слотов или демонстрационных данных.
   - Запрет на утечку внутренних заметок врача и служебных полей в клиентский интерфейс.

---

## 2. Результаты верификации тестов (100% Pass)

| Тестовый набор | Файл | Кол-во тестов | Статус |
|---|---|:---:|:---:|
| Telephony Inquisitor Facades | `apps/web/src/components/telephony/__tests__/telephonyInquisitorFacades.test.tsx` | 5 | ✅ PASS |
| Telephony Red Team Inquisition | `apps/web/src/tests/telephonyRedTeamInquisition.test.ts` | 12 | ✅ PASS |
| Telephony Floating Widget | `apps/web/src/components/telephony/__tests__/TelephonyFloatingWidget.test.ts` | 12 | ✅ PASS |
| Telephony Core Store & Call Actions | `apps/web/src/components/telephony/__tests__/telephony.test.ts` | 33 | ✅ PASS |
| Telephony Lead Capture Attribution | `apps/web/src/components/telephony/__tests__/telephonyLeadCaptureAttribution.test.ts` | 14 | ✅ PASS |
| Telephony Two Lines Concurrency | `apps/web/src/components/telephony/__tests__/telephonyTwoLinesConcurrency.test.ts` | 6 | ✅ PASS |
| Telephony Red Team Production Purity | `apps/web/src/components/telephony/__tests__/telephonyRedTeamProductionPurity.test.ts` | 7 | ✅ PASS |
| Telephony Inquisitor Ergonomics Proof | `apps/web/src/components/telephony/__tests__/telephonyInquisitorErgonomicsProof.test.ts` | 5 | ✅ PASS |
| Chat & Messaging Doctor Autonomy | `apps/web/src/components/chat/__tests__/chatMessagingAutonomy.test.tsx` | 9 | ✅ PASS |
| WhatsApp Chat Panel | `apps/web/src/components/chat/__tests__/WhatsAppChatPanel.test.ts` | 4 | ✅ PASS |
| Omnichannel Engine | `apps/web/src/components/messaging/__tests__/omnichannelEngine.test.ts` | 21 | ✅ PASS |
| Patient Omnichannel Hub Modal | `apps/web/src/components/messaging/__tests__/PatientOmnichannelHubModal.test.tsx` | 2 | ✅ PASS |
| SBP Payment QR Modal | `apps/web/src/components/messaging/__tests__/SbpPaymentQrModal.test.tsx` | 3 | ✅ PASS |
| Patient Personal Cabinet & Tax Deduction | `apps/web/src/tests/patientCabinet.test.ts` | 27 | ✅ PASS |
| Patient Portal Zero-Mock Production Purity | `apps/web/src/tests/patientPortalZeroMockPurity.test.ts` | 6 | ✅ PASS |
| Telegram Booking & Header Modules | `apps/web/src/components/portal/telegramMiniApp/__tests__/telegramBookingAndHeaderModules.test.tsx` | 13 | ✅ PASS |
| Telegram Mini App Components | `apps/web/src/components/portal/telegramMiniApp/__tests__/telegramMiniAppComponents.test.tsx` | 5 | ✅ PASS |
| Telegram Patient Portal Cabinet | `apps/web/src/components/portal/telegramMiniApp/__tests__/TelegramPatientPortalCabinet.test.tsx` | 7 | ✅ PASS |
| Mobile Self-Checkin Kiosk Modal | `apps/web/src/components/portal/selfCheckin/__tests__/MobileSelfCheckinModal.test.tsx` | 7 | ✅ PASS |
| Self-Checkin Autonomy Inquisition | `apps/web/src/components/portal/selfCheckin/__tests__/selfCheckinAutonomyInquisition.test.ts` | 6 | ✅ PASS |
| Patient Cabinet Autonomy Inquisition | `apps/web/src/components/portal/patientCabinet/__tests__/patientCabinetAutonomyInquisition.test.ts` | 16 | ✅ PASS |
| Patient Portal End-to-End Journey | `apps/web/src/components/portal/__tests__/patientPortalEndToEndJourney.test.ts` | 7 | ✅ PASS |
| Messaging Template Engine (API) | `apps/api/src/services/messaging/__tests__/templateEngine.test.ts` | 8 | ✅ PASS |
| Telephony Caller Lookup (API) | `apps/api/src/tests/routes/telephonyCallerLookup.test.ts` | 4 | ✅ PASS |
| Telephony Security & RBAC (API) | `apps/api/src/tests/routes/telephonySecurity.test.ts` | 6 | ✅ PASS |
| Portal Routes (API) | `apps/api/src/tests/routes/portalRoutes.test.ts` | 6 | ✅ PASS |
| Portal Security & 152-FZ Audit (API) | `apps/api/src/tests/routes/portalSecurityAnd152FzAudit.test.ts` | 10 | ✅ PASS |
| **ИТОГО** | **27 тестовых наборов** | **245** | **✅ 100% PASS** |

---

## 3. Визуальный 4-состояный Red Team Proof

Все скриншоты сняты на живом dev-сервере и физически проверены через `read_file`:

### 3.1. Телефония (Входящий вызов и Софтфон)
- ☀️ **PC Light (1440×900)**:
  - `docs/screenshots/telephony_incoming_call_pc_light.png`
  - `docs/screenshots/telephony_softphone_pc_light.png`
- 🌙 **PC Dark (1440×900)**:
  - `docs/screenshots/telephony_incoming_call_pc_dark.png`
  - `docs/screenshots/telephony_softphone_pc_dark.png`
- 📱 **Mobile Light (390×844)**:
  - `docs/screenshots/telephony_incoming_call_mobile_light.png`
  - `docs/screenshots/telephony_softphone_mobile_light.png`
- 📱 **Mobile Dark (390×844)**:
  - `docs/screenshots/telephony_incoming_call_mobile_dark.png`
  - `docs/screenshots/telephony_softphone_mobile_dark.png`

### 3.2. Telegram Mini App & Зубная формула пациента
- `docs/screenshots/portal_inquisition/01_telegram_miniapp_booking_light.png` — Экран онлайн-записи (Day 0 чистота).
- `docs/screenshots/portal_inquisition/02_telegram_miniapp_booking_dark.png` — Тёмная тема онлайн-записи.
- `docs/screenshots/portal_inquisition/03_telegram_tooth_picker_light.png` — Интерактивный выбор зуба (FDI 11–48 / 51–85, кнопка CITO острая боль).
- `docs/screenshots/portal_inquisition/04_telegram_tooth_picker_dark.png` — Интерактивный выбор зуба в тёмной теме.
- `docs/screenshots/portal_inquisition/05_telegram_tooth_picker_bottom_sheet_light.png` — Нативный Bottom Sheet жалоб и шкала боли 1–5.
- `docs/screenshots/portal_inquisition/06_telegram_tooth_picker_bottom_sheet_dark.png` — Нативный Bottom Sheet в тёмной теме (OLED contrast).
- `docs/screenshots/portal_inquisition/07_telegram_miniapp_booking_scrolled_cta_light.png` — Floating Bottom Bar CTA в нижней трети экрана (Natural Thumb Zone).
- `docs/screenshots/portal_inquisition/08_telegram_miniapp_booking_scrolled_cta_dark.png` — Floating Bottom Bar CTA в тёмной теме.

### 3.3. Терминал самообслуживания (Self-Checkin Kiosk) & Личный кабинет
- ☀️ **PC Light (1440×900)**:
  - `docs/proofs/portal/01_portal_kiosk_pc_light.png` — терминал самообслуживания в холле клиники, 64px сенсорные клавиши цифрового пин-пада, маскирование ПДн 152-ФЗ («Алексей С.»).
- 🌙 **PC Dark (1440×900)**:
  - `docs/proofs/portal/02_portal_kiosk_pc_dark.png` — терминал самообслуживания в глубокой темной теме.
- 📱 **Mobile Light (390×844)**:
  - `docs/proofs/portal/03_portal_kiosk_mobile_light.png` — мобильное сенсорное представление, 0px горизонтального скролла, тач-таргеты $\ge 44\times 44\text{px}$.
- 📱 **Mobile Dark (390×844)**:
  - `docs/proofs/portal/04_portal_kiosk_mobile_dark.png` — мобильный терминал в тёмной теме.

### 3.4. Омниканальный центр сообщений и лояльности (Omnichannel Hub & SBP)
- ☀️ **PC Light (1440×900)**:
  - `docs/proofs/omnichannel/01_omnichannel_hub_pc_light.png` — Десктопный хаб сообщений: лента диалогов, статусы каналов WhatsApp/Telegram/SMS, единая primary CTA кнопка «Отправить» (`.hub-btn-send`), вторичные действия (СБП, запись, перехват).
- 🌙 **PC Dark (1440×900)**:
  - `docs/proofs/omnichannel/02_omnichannel_hub_pc_dark.png` — OLED-контрастная тёмная тема, идеальная читаемость сообщений и бейджей.
- 📱 **Mobile Light (390×844)**:
  - `docs/proofs/omnichannel/03_omnichannel_hub_mobile_light.png` — Мобильное представление по Apple HIG: Master-Detail навигация (кнопка «< Назад»), скрытие сайдбара при открытом чате, полноэкранная шторка быстрой записи на приём в 1 клик, 0px горизонтального скролла.
- 📱 **Mobile Dark (390×844)**:
  - `docs/proofs/omnichannel/04_omnichannel_hub_mobile_dark.png` — Тёмная тема мобильного чата, сенсорные таргеты $\ge 44\times 44\text{px}$, адаптивная клавиатурная зона.

## 4. Архитектурная декомпозиция стилей (Мандат 8b)
- Монолит `apps/web/src/components/messaging/omnichannelHub.css` (1832 строки) распилен на 16 специализированных подмодулей в каталоге `apps/web/src/components/messaging/styles/`.
- Каждый подмодуль строго $\le 101$ строк (лимит мандата $\le 120$ строк).
- Корневой файл `omnichannelHub.css` преобразован в тонкий фасад импорта (16 строк).
- Проверено 100% покрытие классов (104/104 классов) через `verifyMessagingClasses.mjs`.

