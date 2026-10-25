# Архитектурный аудит и декомпозиция: Закрытие смены и Z-отчет (54-ФЗ)

> **Статус:** Внедрено, протестировано (29/29 тестов passing), 4-state Visual Proof верифицирован.  
> **Мандаты:** 8b (модули $\le 120$ строк, фасады $\le 80$ строк), 8e & 8n (автономия кассира и врача, 0 disabled кнопок, мягкие расхождения), 8x (живой клинический язык), 8am (ровно 1 Primary CTA), 8ze & Apple HIG (сенсорные зоны $\ge 44\times 44\text{px}$).

---

## 1. Архитектурная цель и контекст (Why)

В рамках ликвидации монолитов кассового модуля и приведения интерфейса к высшим стандартам DENTE CRM проведена полная архитектурная декомпозиция компонентов закрытия смены и сверки кассового ящика:
1. **`ShiftCloseZReportModal.tsx`**: исходный монолит декомпозирован на изолированный доменный пакет `apps/web/src/components/finance/fiscal/shiftClose/` с тонким фасадом (47 строк).
2. **`CashShiftReconciliationComponents.tsx`**: декомпозирован на изолированный доменный пакет `apps/web/src/components/finance/fiscal/reconciliation/` с тонким фасадом (21 строка).
3. **Ликвидация «советского канцелярита» и птичьего языка**:
   - «Приход (Оплата)» $\to$ «1. Принято оплат (услуги клиники)».
   - «Возврат прихода (Возврат оплаты)» $\to$ «2. Возвраты оплат пациентам».
   - Устранены аббревиатуры «ФФД 1.2», капс-заголовки карточек приведены к чистому Sentence Case.
4. **Автономия кассира (Мандаты 8e, 8n)**:
   - Кнопки сверки и закрытия смены **НИКОГДА не блокируются** (`disabled={false}`).
   - При расхождении кассового ящика («Излишек» / «Недостача») кассиру предлагаются быстрые клинические пресеты объяснения («Разменная монета», «Округление сдачи», «Оплата по безналу по ошибке») либо свободный ввод причины без блокировки закрытия смены.
   - Ровно **ОДНА Primary CTA кнопка** на видимый контекст («Закрыть смену и отправить Z-отчет в ОФД»). Вторичные действия («Печать копии», «Ввод остатка») оформлены вспомогательными кнопками.

---

## 2. Структура декомпозированных пакетов ($\le 120$ строк)

### Пакет `apps/web/src/components/finance/fiscal/reconciliation/`
- `types.ts` (47 строк): контракты сверки, структуры расхождений, пропсы компонентов.
- `CashShiftKpiCards.tsx` (80 строк): 4 адаптивные карточки итогов с чистой типографикой без кричащего капса.
- `useCashDrawerMatcher.ts` (35 строк): чистый хук расчёта расхождения фактических и системных наличных.
- `CashDrawerOverviewBanner.tsx` (36 строк): информационный баннер ожидаемых наличных в кассе.
- `CashDrawerReconciliationPanel.tsx` (94 строки): панель ввода фактических средств, 1-click кнопки («Совпадает с кассой»), быстрые заметки, мягкий статус.
- `FiscalReceiptTapeViewer.tsx` (84 строки): просмотрщик чековой ленты с моноширинной стилизацией и вторичной кнопкой печати.
- `index.ts` (11 строк): экспорты пакета.
- **Фасад:** `CashShiftReconciliationComponents.tsx` (21 строка, лимит $\le 80$).

### Пакет `apps/web/src/components/finance/fiscal/shiftClose/`
- `types.ts` (36 строк): интерфейсы Z-отчета, типы вкладок (`ShiftCloseActiveTab`), пропсы модального окна.
- `shiftCloseReportCompiler.ts` (59 строк): чистый компилятор финансовых показателей смены (выручка, СБП, терминал, авансы, остаток в ящике).
- `useShiftCloseReport.ts` (102 строки): хук жизненного цикла отчета, отправки в ОФД, копирования реквизитов и печати.
- `ShiftCloseHeader.tsx` (78 строк): адаптивная шапка со сворачиваемыми реквизитами кассира/ККТ без обрезания текста многоточиями.
- `ShiftCloseTabs.tsx` (100 строк): раздельные десктопные и мобильные вкладки с сенсорными областями $\ge 44\times 44\text{px}$ («Сверка», «Ящик», «Лента», «Очередь»).
- `ShiftCloseReconciliationTab.tsx` (94 строки): вкладка детализации кассовых операций на живом языке без бюрократии.
- `ShiftCloseFooter.tsx` (56 строк): адаптивный подвал с защитой `safe-area-inset-bottom` и единственной Primary CTA кнопкой.
- `ShiftCloseModalView.tsx` (94 строки): презентационный шелл диалогового окна с модальной глубиной строго 1 (Anti-Matryoshka).
- `index.ts` (11 строк): экспорты пакета.
- **Фасад:** `ShiftCloseZReportModal.tsx` (47 строк, лимит $\le 80$).

---

## 3. Интеграция в живое UI-дерево приложения (Mandate 8aq)

Модальное окно смонтировано в корневой шлюз `apps/web/src/appModules/AppDirectModals.tsx` и управляется сквозным роутингом `useAppHashRouting` / `useAppRoutingEvents`.  
Поддерживается открытие через:
- URL-токен: `http://127.0.0.1:5173/?demo=true#z-report` или `?modal=zreport`
- Custom Event: `window.dispatchEvent(new CustomEvent("dente-open-zreport"))`

---

## 4. Визуальные доказательства (Red Team 4-State Visual Proof)

Все скриншоты сняты на живом браузере Chromium, проверены визуально через `read_file` и сохранены в `docs/proofs/cashbox/`:
1. **☀️ PC Light (1440×900)**: [`01_zreport_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/cashbox/01_zreport_pc_light.png) (498 556 байт)
2. **🌙 PC Dark (1440×900)**: [`02_zreport_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/cashbox/02_zreport_pc_dark.png) (503 429 байт)
3. **📱 Mobile Light (390×844)**: [`03_zreport_mobile_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/cashbox/03_zreport_mobile_light.png) (138 424 байта)
4. **📱 Mobile Dark (390×844)**: [`04_zreport_mobile_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/cashbox/04_zreport_mobile_dark.png) (140 699 байт)

**Проверенные визуальные критерии:**
- [x] Размер каждого файла $\ge 20\text{KB}$ (факт: 138–503 KB).
- [x] Отсутствие кричащего капса (`UPPERCASE`) в заголовках KPI.
- [x] Отсутствие паразитного горизонтального скролла (`0px`).
- [x] Отсутствие обрезанных слов и многоточий (`000...`).
- [x] Ровно одна Primary CTA кнопка на видимый экран.
- [x] Сенсорные области таб-переключателей на смартфоне $\ge 44\times 44\text{px}$.
- [x] Идеальный контраст в светлой и темной темах с учетом токенов `var(--paper)`, `var(--ink)`, `var(--line)`.

---

## 5. Результаты автоматизированных тестов

- `apps/web/src/components/finance/__tests__/cashboxShiftAndFiscalDecomposition.test.ts`: 19 passed
- `apps/web/src/components/schedule/__tests__/adminShiftFlowAndBatchRemindersAutonomy.test.ts`: 10 passed
- **Итого:** 29 passed, 0 failed.
