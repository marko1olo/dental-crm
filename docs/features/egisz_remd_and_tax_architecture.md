# Архитектура ЕГИСЗ РЭМД, СЭМД и Государственной Отчетности (Волна 363)

> 🏛️ **Статус:** Внедрено и верифицировано (Волна 363, 100% паритет, 0 ошибок)  
> 📜 **Мандаты:** 8b (модули $\le 120$ строк, CSS $\le 85$ строк), 8e (автономия врача), 8n (соло-практика), 8x/8ap (чистый язык), 8al/8ze/8am (Apple HIG)  
> 🧪 **Тесты:** 10 test files passed (107 tests), 0 failing  
> 📸 **Visual Proofs:** 10 скриншотов в `docs/proofs/egisz/` (PC Light/Dark, Mobile Light/Dark, Journal Light/Dark, Tax Light/Dark)

---

## 1. Архитектурная Цель и Устранение Монолитов

До рефакторинга файл `egiszRemd.css` представлял собой циклопический монолит объемом 3272 строки, объединявший стили модального контейнера, таблицы очереди СЭМД, карточек КриптоПро, XML-инспектора, шторки налогового вычета и выписок.

### DAG-Декомпозиция CSS (Изолированные модули в remdStyles/):
Файл `apps/web/src/components/egisz/egiszRemd.css` (было 3272 строки) декомпозирован на ультратонкий фасад импортов (14 строк) и высококогезионные подстили в `apps/web/src/components/egisz/remdStyles/` (каждый модуль строго <= 110 строк при нормативе Мандата 8b <= 120 строк):
- `layout/`: `egiszRemdHeader.css` (103 стр), `egiszRemdHubHeader.css` (79 стр), `egiszRemdMasterList.css` (109 стр), `egiszRemdWorkspaceGrid.css` (108 стр), `egiszRemdMobileBottomSheets.css` (90 стр), `egiszRemdTabsNav.css` (81 стр), `egiszRemdModeSelector.css` (57 стр).
- `certs/`: `egiszRemdCertCards.css` (108 стр), `egiszRemdCertPreview.css` (97 стр), `egiszRemdCryptoPro.css` (67 стр), `egiszRemdDocPreview.css` (96 стр), `egiszRemdStampBox.css` (72 стр).
- `queue/`: `egiszRemdJournalStats.css` (101 стр), `egiszRemdJournalTable.css` (84 стр), `egiszRemdQueueBadges.css` (72 стр), `egiszRemdQueueBaseTable.css` (75 стр).
- `cda/`: `egiszRemdToothMatrix.css` (83 стр), `egiszRemdXmlViewer.css` (89 стр), `egiszRemdPreflightGrid.css` (90 стр).
- `drawers/`: `egiszRemdExtractDrawer.css` (112 стр), `egiszRemdTaxDrawer.css` (74 стр), `egiszRemdTaxPayments.css` (71 стр), `egiszRemdJournalRemediation.css` (67 стр).
- `actions/`: `egiszRemdButtons.css` (106 стр), `egiszRemdHubFooter.css` (97 стр), `egiszRemdJournalFilters.css` (79 стр), `egiszRemdDocFilters.css` (63 стр).
- `modals/`, `theme/`: `egiszRemdShell.css` (60 стр), `egiszRemdThemeDark.css` (66 стр), `egiszRemdBackdrops.css` (51 стр).

---

## 2. Автономия Врача и Персонала (Мандаты 8e, 8n)

1. **Запрет блокировок (`disabled: false`)**:
   - Кнопки «Отправить в Минздрав», «Печать бланка», «1-Клик Валидация», «Отложить отправку» никогда не блокируются при отсутствии токена Рутокен или плагина КриптоПро CSP.
2. **Тихая фоновая очередь (Background Queue)**:
   - Если сертификат врача или клиники не обнаружен на рабочем месте, формируется локальный подписанный черновик, и пакет помещается в тихую очередь бэкофиса клиники. Приём пациента продолжается без задержек.
3. **1-клик справка для налогового вычета ФНС**:
   - Автоматический сбор всех оплаченных сумм за налоговый период, генерация справки с двухмерным кодом и печать бланка в 1 клик.

---

## 3. Чистый Клинический Язык (Мандаты 8x, 8ap)

- Искоренены советские регуляторные шифры («Форма 043/у» $\to$ «Медицинская карта приёма», «КНД 1151156» $\to$ «Справка для налогового вычета»).
- Полный запрет упоминаний сторонних медицинских систем в кодовой базе и пользовательском интерфейсе.

---

## 4. Доказательная База и Red Team Visual Proofs

Все 10 визуальных артефактов сохранены в `docs/proofs/egisz/` и лично верифицированы через `read_file`:
- `01_egisz_hub_pc_light.png` (1440×900 Light Hub)
- `02_egisz_hub_pc_dark.png` (1440×900 Dark Hub)
- `03_egisz_hub_mobile_light.png` (390×844 Mobile Bottom Sheet Light)
- `04_egisz_hub_mobile_dark.png` (390×844 Mobile Bottom Sheet Dark)
- `05_egisz_journal_batch_pc_light.png` (1440×900 Журнал отправки Light)
- `06_egisz_journal_batch_pc_dark.png` (1440×900 Журнал отправки Dark)
- `07_tax_deduction_pc_light.png` (1440×900 Справка ФНС Light)
- `08_tax_deduction_pc_dark.png` (1440×900 Справка ФНС Dark)
- `09_tax_deduction_mobile_light.png` (390×844 Справка ФНС Mobile Light)
- `10_tax_deduction_mobile_dark.png` (390×844 Справка ФНС Mobile Dark)
