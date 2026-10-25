# Аудит и архитектурная спецификация: Фискальная касса, закрытие смены и суточный Z-отчет (54-ФЗ)

> **Статус:** Внедрено в боевой UI, декомпозиция $\le 120$ строк выполнена, 29/29 тестов passing, 4-state Visual Proof верифицирован.  
> **Мандаты:** 8b (модули $\le 120$ строк, фасады $\le 80$ строк), 8e & 8n (автономия кассира и врача, 0 блокировок), 8x & 8ap (отсутствие советского канцелярита и дев-сленга), 8am (ровно 1 Primary CTA), 8ze & Apple HIG (touch targets $\ge 44\times 44\text{px}$).

---

## 1. Контекст и архитектурная цель (Why)
Ликвидированы монолиты закрытия смены и кассовой сверки:
- `ShiftCloseZReportModal.tsx` и `CashShiftReconciliationComponents.tsx` разбиты на 18 независимых модулей с сохранением 100% обратной совместимости через тонкие фасады.
- Полный отказ от птичьего языка советских ГОСТов («ФФД 1.2», «Приход (Оплата)», «Возврат прихода (Возврат оплаты)») в пользу понятной клинической терминологии («1. Принято оплат (услуги клиники)», «2. Возвраты оплат пациентам»).
- Обеспечена 100% автономия кассира (Мандат 8e): кнопка «Закрыть смену и отправить Z-отчет в ОФД» НИКОГДА не блокируется (`disabled`). Расхождения в денежном ящике сопровождаются быстрыми пресетами («Разменная монета», «Округление сдачи») без бюрократических тупиков.
- Вся математика ведется в целочисленных копейках (`BIGINT`, `amountKopecks`), раздельная сверка наличных, банковских карт, СБП и зачета авансов исключает погрешности с плавающей запятой.

---

## 2. Модульная декомпозиция (Мандат 8b: модули $\le 120$ строк, фасады $\le 80$ строк)

### Пакет `apps/web/src/components/finance/fiscal/reconciliation/`
- `types.ts` (47 строк): контракты кассового ящика и сверки.
- `CashShiftKpiCards.tsx` (80 строк): 4 метрические карточки в чистом Sentence Case.
- `useCashDrawerMatcher.ts` (35 строк): математический хук сверки ящика.
- `CashDrawerOverviewBanner.tsx` (36 строк): баннер расчетного остатка.
- `CashDrawerReconciliationPanel.tsx` (94 строки): панель сверки с кнопкой «✓ Совпадает с кассой» и мягкими статусами.
- `FiscalReceiptTapeViewer.tsx` (84 строки): моноширинная лента чеков с вторичной кнопкой печати.
- `index.ts` (11 строк): открытый интерфейс пакета.
- **Фасад:** `CashShiftReconciliationComponents.tsx` (21 строка).

### Пакет `apps/web/src/components/finance/fiscal/shiftClose/`
- `types.ts` (36 строк): типы Z-отчета и вкладок.
- `shiftCloseReportCompiler.ts` (59 строк): чистый компилятор финансовых показателей.
- `useShiftCloseReport.ts` (102 строки): хук жизненного цикла отчета и интеграции с ОФД.
- `ShiftCloseHeader.tsx` (78 строк): шапка с переносом строк реквизитов кассира и ККТ.
- `ShiftCloseTabs.tsx` (100 строк): раздельные десктопные и мобильные табы $\ge 44\text{px}$ («Сверка», «Ящик», «Лента», «Очередь»).
- `ShiftCloseReconciliationTab.tsx` (94 строки): клиническая вкладка кассовых операций.
- `ShiftCloseFooter.tsx` (56 строк): адаптивный подвал с защитой `safe-area-inset-bottom` и 1 Primary CTA.
- `ShiftCloseModalView.tsx` (94 строки): презентационный шелл модалки с глубиной ровно 1 (Anti-Matryoshka).
- `index.ts` (11 строк): открытый интерфейс пакета.
- **Фасад:** `ShiftCloseZReportModal.tsx` (47 строк).

---

## 3. Сквозная интеграция в живой UI (Mandate 8aq)
- `apps/web/src/appModules/AppDirectModals.tsx`: прямое монтирование модального окна Z-отчета в корневое дерево.
- `apps/web/src/appModules/useAppHashRouting.ts` и `useAppRoutingEvents.ts`: поддержка хеш-роутинга (`#z-report`, `?modal=zreport`) и событий `window.dispatchEvent(new CustomEvent("dente-open-zreport"))`.

---

## 4. Верификация Red Team (4-State Visual Proofs)
Все скриншоты сняты в браузере Chromium на живом сервере Vite и Fastify API, лично проверены агентом через `read_file` и сохранены в `docs/proofs/cashbox/`:
- `01_zreport_pc_light.png` (1440×900) — **498 556 байт** (☀️ PC Light)
- `02_zreport_pc_dark.png` (1440×900) — **503 429 байт** (🌙 PC Dark)
- `03_zreport_mobile_light.png` (390×844) — **138 424 байта** (📱 Mobile Light)
- `04_zreport_mobile_dark.png` (390×844) — **140 699 байт** (📱 Mobile Dark)

Все файлы $\gg 20\text{KB}$, отсутствует капс, паразитный скролл 0px, слова не обрезаются многоточиями, ровно 1 Primary CTA кнопка на видимый экран.

---

## 5. Автотесты
- `apps/web/src/components/finance/__tests__/cashboxShiftAndFiscalDecomposition.test.ts` (19 passing)
- `apps/web/src/components/schedule/__tests__/adminShiftFlowAndBatchRemindersAutonomy.test.ts` (10 passing)
- **Результат: 29 passed, 0 failed.**
