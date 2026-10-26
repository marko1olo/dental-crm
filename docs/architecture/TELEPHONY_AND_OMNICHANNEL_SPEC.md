# CTI Telephony & Omnichannel Messaging Architecture (DENTE CRM)

## 1. Архитектурная цель и клинические инварианты

Система телефонии и омниканальных коммуникаций (WhatsApp, Telegram, SMS) в DENTE CRM спроектирована по высшим клиническим стандартам доказательной медицины (EBM) и продуктовой конституции проекта:

1. **Мандат 8e (Автономия врача и стерильная зона кресла / Sterile Zone Immunity):**
   - На экранах приёма (`#visit`, `#odontogram`, `#periodontics`) и при активной роли врача (`selectedWorkspaceRole === 'doctor'`) всплывающие модальные окна входящих звонков **СТРОГО ПОДАВЛЯЮТСЯ** (`suppressCallModal: true`).
   - Врач во время операции или эндодонтического вмешательства никогда не прерывается звонками. Звонки маршрутизируются администратору на ресепшен.
   - В шапке рабочего стола врача отображается ненавязчивый индикатор телефонии без блокировки взаимодействия.

2. **Мандат 8n (Суверенитет соло-врача и малой клиники / Friction-Killer Law):**
   - Звонки и чаты не требуют обязательного выбора ассистента или сложной бюрократической маршрутизации.
   - 1-клик запись на приём: кнопка «Записать на приём» сразу подставляет данные звонящего пациента в черновик расписания.
   - Экстренная кнопка Cito: «Записать вне очереди (Острая боль / Cito)» для пациентов с острым болевым синдромом.

3. **Мандат 8x (Живой человеческий клинический язык без советского канцелярита):**
   - Запрещены советские регуляторные номера приказов («Форма 043/у», «Прейскурант 804н», «Касса 54-ФЗ»).
   - Используются термины: «Медицинская карта приёма», «Прейскурант услуг», «Касса и чеки».

4. **Мандат 8y (Ноль фармакологической паранойи):**
   - Аллергии и соматические стоп-факторы пациента («Аллергия на пенициллины») выводятся в карточке звонка пассивным предупреждающим бейджем `⚠️`, не блокируя кнопку записи или ответа.

5. **Apple HIG & Touch Ergonomics (Мандаты 8d, HIG):**
   - Сенсорный минимум: все интерактивные кнопки $\ge 44\times 44\text{px}$.
   - На смартфонах карточка звонка и чат открываются как нативный iOS Bottom Sheet с закруглением `rounded-t-[24px]`, тактильным свайп-хэндлом и защитой безопасной зоны (`env(safe-area-inset-bottom)`).
   - 0px паразитного горизонтального скролла (`overflow-x: clip; max-width: 100vw;`).

---

## 2. Канонические компоненты и фасады

| Компонент | Путь | Назначение |
|---|---|---|
| `IncomingCallModal` | `apps/web/src/components/telephony/IncomingCallModal.tsx` | Центральное модальное окно входящего звонка для администратора с авто-подавлением в стерильной зоне врача. |
| `TelephonyFloatingDialer` | `apps/web/src/components/telephony/TelephonyFloatingDialer.tsx` | Плавающий софтфон/диалер с авто-сворачиванием на экранах приёма. |
| `useTelephonyState` | `apps/web/src/components/telephony/useTelephonyState.ts` | Хук состояния телефонии, отслеживающий стерильную зону, активные линии L1/L2, DND и CTI статус. |
| `CallHistoryDrawer` | `apps/web/src/components/telephony/CallHistoryDrawer.tsx` | Выдвижная шторка журнала звонков с плеером аудиозаписей и таймлайном. |
| `WhatsAppChatView` | `apps/web/src/components/chat/WhatsAppChatView.tsx` | Полноэкранный омниканальный чат WhatsApp с диалогами пациентов и клиническими шаблонами. |
| `WhatsAppChatPanel` | `apps/web/src/components/chat/WhatsAppChatPanel.tsx` | Панель WhatsApp чата с быстрыми шаблонами, вложениями до 16 МБ и неблокирующей кнопкой отправки. |
| `OmnichannelOperatorDesk` | `apps/web/src/components/chat/OmnichannelOperatorDesk.tsx` | Единый пульт оператора ботов (Telegram, ВКонтакте, WhatsApp, MAX) с перехватом диалогов. |
| `PatientOmnichannelHubModal` | `apps/web/src/components/messaging/PatientOmnichannelHubModal.tsx` | Центральный омниканальный хаб сообщений, лояльности и динамических платежей СБП. |
| `SbpPaymentQrModal` | `apps/web/src/components/messaging/SbpPaymentQrModal.tsx` | Экспресс-генерация QR-кода СБП с фискальным чеком, покрытием семейным депозитом и копированием ссылки. |
| `TelegramBotIntegrationModal` | `apps/web/src/components/chat/TelegramBotIntegrationModal.tsx` | Модальное окно Telegram-бота с неблокирующим мягким фолбэком и шаблонами напоминаний. |
| `IncomingCallPopup` | `apps/web/src/components/telephony/IncomingCallPopup.tsx` | Верхняя амбиентная капсула вызова (Top Ambient Event Capsule) по центру вверху экрана без перекрытия рабочей зоны врача. |
| `OmnichannelChatView` | `apps/web/src/components/omnichannel_chat/OmnichannelChatView.tsx` | Единый канонический модуль омниканального чата (WhatsApp, Telegram, SMS, VK) с декомпозицией на модули <= 120 строк. |

---

## 3. Доказательства работоспособности телефонии (Red Team 4-State Verification)

Реальные скриншоты сняты в живом браузере Chromium (Playwright) на боевом инстансе `http://127.0.0.1:5173/?telephony=1`:

1. ☀️ **PC Light (1440×900)**: `docs/proofs/telephony/01_incoming_call_pc_light.png`
   - Верхняя амбиентная капсула по центру вверху экрана над живым расписанием на 2 кресла: ФИО звонящего «Смирнова Анна Сергеевна», статус «ПЕРВИЧНЫЙ», «Аванс: +15 000 ₽», бейдж «⚠️ Аллергия: На пенициллин», 1 Primary CTA «Записать», Secondary «Перезвонить», «Карта».
2. 🌙 **PC Dark (1440×900)**: `docs/proofs/telephony/02_incoming_call_pc_dark.png`
   - Глубокий темный глассморфизм капсулы, высокая контрастность текста, отсутствие слепящих белых пятен.
3. 📱 **Mobile Light (390×844)**: `docs/proofs/telephony/03_incoming_call_mobile_light.png`
   - Нативный iOS Top Sheet на экране смартфона: имя без срезаний, телефон крупно, сенсорный минимум кнопок $\ge 44\text{px}$, естественная зона большого пальца.
4. 📱 **Mobile Dark (390×844)**: `docs/proofs/telephony/04_incoming_call_mobile_dark.png`
   - Мобильная капсула входящего звонка в ночной теме с поддержкой Dynamic Island Safe Area.

---

## 4. Омниканальный чат и СБП платежи (Red Team 4-State Verification)

Реальные скриншоты сняты в живом браузере Chromium (Playwright) на боевом инстансе `http://127.0.0.1:5173/?omnichannel=1`:

1. ☀️ **PC Light (1440×900)**: `docs/proofs/chat/01_omnichannel_chat_pc_light.png`
   - Единый двухпанельный пульт диалогов: слева список переписок с бейджами (WhatsApp, Telegram, VK), чипы фильтрации, справа активный тред с историей сообщений, быстрыми шаблонами в 1 клик («Приём завтра в 14:00»), полем ввода и кнопкой отправки.
2. 🌙 **PC Dark (1440×900)**: `docs/proofs/chat/02_omnichannel_chat_pc_dark.png`
   - Темная тема рабочего места оператора `#0b1118`, четкие акцентные цвета каналов, читаемые баблы сообщений.
3. 📱 **Mobile Light (390×844)**: `docs/proofs/chat/03_omnichannel_chat_mobile_light.png`
   - Адаптивный мобильный мессенджер с Top Bar (кнопка «Назад», имя пациента, бейдж канала, 1 Primary CTA «Запись»), чистая лента чата, скроллируемые шаблоны и поле ввода.
4. 📱 **Mobile Dark (390×844)**: `docs/proofs/chat/04_omnichannel_chat_mobile_dark.png`
   - Мобильный интерфейс в темной теме Apple HIG с кнопками $\ge 44\times 44\text{px}$ и защитой области клавиатуры.

---

## 5. Декомпозиция SbpPaymentQrModal и omnichannelEngine (Мандат 8b)

В соответствии с Мандатом 8b (лимит $\le 120$ строк на модуль, $\le 80$ строк на фасад) проведена полная модульная декомпозиция монолитов:

1. **`omnichannelEngine.ts` (фасад 7 строк $\le 80$ строк):**
   - Декомпозирован в подпапку `apps/web/src/components/messaging/omnichannelEngineModules/`:
     * `npsCalculator.ts` (107 строк) — чистый расчет метрик лояльности NPS, скоринга и критических статусов;
     * `templateReplacer.ts` (63 строки) — шаблонные подстановки `{patient_name}`, `{doctor_name}`, `{time}`, `{date}`, `{clinic_phone}`;
     * `templateShareGenerators.ts` (30 строк) — генерация ссылок расшаривания (wa.me, t.me, sms:);
     * `phoneAndMessengerFormatters.ts` (41 строка) — форматирование телефонов РФ (+7) и нормализация мессенджеров;
     * `defaultTemplates.ts` (77 строк) & `defaultMarketingTemplates.ts` (54 строки) — клинические пресеты сообщений;
     * `defaultContacts.ts` (68 строк) & `defaultSecondaryContacts.ts` (69 строк) — список контактов пациентов;
     * `defaultMessages.ts` (85 строк) & `defaultSecondaryMessages.ts` (59 строк) — демонстрационные треды переписки;
     * `defaultReviews.ts` (94 строки) — отзывы и обратная связь;
     * `index.ts` (11 строк) — реэкспорт SSOT.

2. **`SbpPaymentQrModal.tsx` (фасад 71 строка $\le 80$ строк):**
   - Декомпозирован в подпапку `apps/web/src/components/messaging/sbpPaymentModal/`:
     * `types.ts` (28 строк) — типы пропсов и стейта;
     * `sbpGatewayClient.ts` (66 строк) — отказоустойчивый клиент генерации и сверки динамического QR СБП;
     * `useSbpPaymentModalState.ts` (117 строк) — хук обратного отсчета TTL (15 мин), авто-опроса статуса и контроля кассира;
     * `SbpModalHeader.tsx` (44 строки) — шапка с бейджем СБП Банка России и данными пациента;
     * `SbpSuccessBanner.tsx` (39 строк) & `SbpExpiredBanner.tsx` (23 строки) — баннеры успешного зачисления и истечения срока;
     * `SbpQrFrame.tsx` (59 строк) — оптический QR-фрейм с логотипом СБП и поддержкой сканирования;
     * `SbpTimerCard.tsx` (37 строк) — динамический индикатор и прогресс-бар оставшегося времени;
     * `SbpLiveStatusPill.tsx` (46 строк) — пульсирующий индикатор фаз оплаты;
     * `SbpInvoiceSummaryCard.tsx` (60 строк) — карточка суммы в рублях и копейках, ФИО и стандарта ГОСТ Р 56042;
     * `SbpShareActions.tsx` (112 строк) — 1-клик отправка в WhatsApp, Telegram, буфер обмена и печать чека;
     * `SbpCashierControl.tsx` (93 строки) — панель сверки кассира (ручное подтверждение по выписке/СМС);
     * `SbpModalFooter.tsx` (35 строк) — безопасный футер с подтверждением фискализации;
     * `SbpModalBody.tsx` (73 строки) — тело модалки;
     * `index.ts` (14 строк) — реэкспорт интерфейсов.

### Red Team 4-State Visual Proofs (СБП модалка в живом CRM-контуре):
- ☀️ `docs/proofs/messaging/01_messaging_sbp_modal_pc_light_1440.png` (116.0 KB)
- 🌙 `docs/proofs/messaging/02_messaging_sbp_modal_pc_dark_1440.png` (113.7 KB)
- 📱 `docs/proofs/messaging/03_messaging_sbp_modal_mobile_light_390.png` (45.1 KB)
- 📱 `docs/proofs/messaging/04_messaging_sbp_modal_mobile_dark_390.png` (46.3 KB)

