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

---

## 3. Доказательства работоспособности телефонии (Red Team 4-State Verification)

Реальные скриншоты сняты в живом браузере Chromium (Playwright) на боевом инстансе `http://127.0.0.1:5173/?demo=true`:

1. ☀️ **PC Light (1440×900)**: `docs/screenshots/telephony/telephony_incoming_call_pc_light.png`
   - Администраторский входящий звонок: карточка пациента Смирновой А.С., баланс счёта (+15 000 ₽), история визитов, пассивный алерт аллергии, ровно 1 Primary CTA «Записать на приём».
2. 🌙 **PC Dark (1440×900)**: `docs/screenshots/telephony/telephony_incoming_call_pc_dark.png`
   - Журнал вызовов и боковая шторка звонящего в тёмной теме, медицинские предупреждения, экстренная запись Cito.
3. 📱 **Mobile Light (390×844)**: `docs/screenshots/telephony/telephony_incoming_call_mobile_light.png`
   - Мобильная капсула входящего вызова: центрирование Dynamic Island, имя «Сми...», таймер 00:01, кнопка ответа, сброса и закрытия, отсутствие горизонтального среза.
4. 📱 **Mobile Dark (390×844)**: `docs/screenshots/telephony/telephony_incoming_call_mobile_dark.png`
   - Мобильная карточка звонящего в тёмной теме: нативный Bottom Sheet, крупный тач-таргет $\ge 44\text{px}$, защита Home Indicator.

---

## 4. Омниканальный чат и СБП платежи (Red Team 4-State Verification)

Реальные скриншоты сняты в живом браузере Chromium (Playwright) на боевом инстансе `http://127.0.0.1:5173/#communications`:

1. ☀️ **PC Light (1440×900)**:
   - `docs/proofs/omnichannel_chat/01_omnichannel_whatsapp_panel_pc_light_1440.png`: WhatsApp панель чата с пациентом Смирновым А.В., быстрыми шаблонами с клинической памяткой, вложением файлов до 16 МБ (Paperclip $\ge 44\times 44\text{px}$) и неблокирующей кнопкой отправки (Мандат 8e).
   - `docs/proofs/omnichannel_chat/02_omnichannel_operator_desk_pc_light_1440.png`: Пульт оператора ботов (Telegram, ВКонтакте, WhatsApp, MAX) с фильтрацией диалогов и перехватом управления.
   - `docs/proofs/omnichannel_chat/02b_omnichannel_hub_modal_pc_light_1440.png`: Омниканальный центр сообщений и лояльности, стрим сообщений, кнопка «Выставить счет СБП» и санированный футер медицинской тайны.
2. 🌙 **PC Dark (1440×900)**:
   - `docs/proofs/omnichannel_chat/03_omnichannel_whatsapp_panel_pc_dark_1440.png`: WhatsApp панель в темной теме `#0b1118` с высокими контрастами, статусами доставки (✓✓) и чипами каналов.
   - `docs/proofs/omnichannel_chat/04_omnichannel_operator_desk_pc_dark_1440.png`: Пульт оператора в темной теме с бейджами каналов и быстрыми ответами.
   - `docs/proofs/omnichannel_chat/04b_omnichannel_hub_modal_pc_dark_1440.png`: Омниканальный модальный хаб в глубокой ночной теме.
3. 📱 **Mobile Light (390×844)**:
   - `docs/proofs/omnichannel_chat/05_omnichannel_mobile_light_390.png`: Суверенный мобильный мессенджер Apple HIG (iPhone 14/15 390×844), сгруппированные карточки диалогов с бейджами WhatsApp/Telegram, чипы фильтрации каналов, $0\text{px}$ горизонтального дрифта, тач-таргеты $\ge 44\times 44\text{px}$.
4. 🌙 **Mobile Dark (390×844)**:
   - `docs/proofs/omnichannel_chat/06_omnichannel_mobile_dark_390.png`: Мобильный мессенджер в темной теме с нативным нижним таббаром Safe Area.
