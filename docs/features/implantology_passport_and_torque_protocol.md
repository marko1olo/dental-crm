# 🔩 Имплантология: Паспорт имплантата, Протокол фиксации и SSOT спецификации торка

> **Статус:** Внедрено в боевой UI (Мандаты 8b, 8e, 8n, 8am, 8aq)  
> **Дата:** 25 октября 2026  
> **Вьюпорты:** Desktop 1440×900, Mobile 390×844 (Apple HIG, 4-State Visual Proofs)

---

## 1. Контекст и Клиническая Цель (Doctor Autonomy & Zero-Friction)

В соответствии с верховным клиническим стандартом DENTE CRM:
1. **Мандат 8e (Автономия врача):** Кнопка «Зафиксировать протокол» никогда не блокируется. Экспресс-протокол выбирается в 1 клик:
   - Стандартный протокол (35 Н·см, ФДМ, Викрил 4-0)
   - Немедленная нагрузка (45 Н·см, Одномоментно)
   - Двухэтапная заглушка (35 Н·см, Заглушка наглухо)
   - Костная пластика / НКР (Bio-Oss + Bio-Gide + швы)
2. **Мандат 8n (Мягкий овердрафт склада):** При оперативной замене диаметра/длины у кресла (например, с Ø4.0 на Ø4.5) система фиксирует выбор хирурга с пассивным уведомлением Soft Negative Stock без остановки операции и блокировки кассы.
3. **Запрет псевдо-физических симуляций:** В DENTE нет кустарных калькуляторов диффузии кости, процедурной физики резьбы или искусственных задержек. Врач вводит реальные измеренные значения: Торк `[35] Н·см`, ISQ `[72]`, плотность кости по Misch в 1 клик (`[ D1 | D2 | ★ D3 | D4 ]`).
4. **Гарантийный паспорт изделия:** В 1 клик печатается или экспортируется паспорт с QR-кодом верификации партии, артикулом REF, номером партии LOT, серийным номером SN и контрольным сроком остеоинтеграции (3-4 месяца).

---

## 2. SSOT Спецификации Торка и Отвёрток (Torque Catalog SSOT)

Канонический реестр производителей и параметров фиксации вынесен в независимые модули `apps/web/src/components/implants/torqueCatalogModules/`:

| Бренд | Имплантат | Абатмент | Мульти-юнит | Винт / Отвёртка | Тип соединения |
|---|---|---|---|---|---|
| **Straumann** | 35 Н·см | 35 Н·см | 15 Н·см | SCS (Torx) | CrossFit / SynOcta |
| **Nobel Biocare** | 35 Н·см | 35 Н·см | 15 Н·см | Unigrip | Conical / Tri-Lobe |
| **Osstem** | 35 Н·см | 30 Н·см | 20 Н·см | Hex 1.2 мм | 11° Internal Morse |
| **Dentium** | 30 Н·см | 30 Н·см | 20 Н·см | Hex 1.27 мм | 11° Conical Hex |
| **Ankylos** | 15 Н·см | 15 Н·см | 15 Н·см | Hex 1.0 мм | Morse Taper 5.7° |
| **Astra Tech** | 25 Н·см | 20 Н·см | 15 Н·см | Hex 1.27 мм | Conical Seal Design |
| **MegaGen** | 35 Н·см | 30 Н·см | 20 Н·см | Hex 1.2 мм | KnifeThread / Internal |
| **MIS** | 30 Н·см | 30 Н·см | 15 Н·см | Hex 1.27 мм | Conical / Standard Hex |

---

## 3. Архитектурная Декомпозиция (Мандат 8b: подмодули $\le 120$ строк, фасады $\le 80$ строк)

### Модули спецификаций торка (`torqueCatalogModules/`):
- `implantTorqueTypes.ts` (61 строка $\le 120$): строго типизированные интерфейсы брендов, платформ и Ti-Base компонентов.
- `brandTorqueSpecs.ts` (72 строки $\le 120$): канонические константы моментов затяжки и типов отвёрток.
- `tiBaseCatalogData.ts` (56 строк $\le 120$): 8 титановых оснований популярных платформ.
- `implantScrewdriverHelper.ts` (71 строка $\le 120$): чистые функции поиска и валидации.
- `implantTorqueCatalog.ts` (24 строки $\le 80$): чистый реэкспортный фасад.

### Модули модального окна паспорта (`modal/`):
- `PassportHeader.tsx` (91 строка $\le 120$): эргономичная шапка с тактильным Drag Handle для мобильных шторок, кнопками печати и закрытия.
- `PassportModalBody.tsx` (115 строк $\le 120$): координатор табов и баннер мягкого овердрафта.
- `PassportPrintActions.tsx` (82 строки $\le 120$): нижняя панель с кнопкой вторичной печати и ровно одной Primary CTA «✓ Зафиксировать протокол».
- `PassportQrLotSection.tsx` (107 строк $\le 120$): секция паспорта с LOT/REF/SN, датой остеоинтеграции и QR-верификацией.
- `ImplantPassportModalNav.tsx` (56 строк $\le 120$): мобильная и десктопная полоса навигации табов.
- `ImplantPassportModal.tsx` (65 строк $\le 80$): чистый фасад модального диалога.

### Модули протокола операции (`protocol/`):
- `ProtocolExpressPresetsBanner.tsx` (86 строк $\le 120$): 4 экспресс-протокола в 1 клик.
- `ProtocolImplantSelector.tsx` (46 строк $\le 120$): селектор зуба FDI и параметров диаметра/длины.
- `ProtocolBoneTorqueInputs.tsx` (93 строки $\le 120$): плотность Misch D1..D4 и тактильные кнопки торка (15–50 Н·см).
- `ProtocolIsqStabilityCard.tsx` (94 строки $\le 120$): бейдж первичной стабильности ISQ 72 без фейковой физики.
- `ProtocolPackagingInputs.tsx` (97 строк $\le 120$): упаковка стерильного изделия.
- `protocolTabTypes.ts` (52 строки $\le 120$): строгие типы пропсов протокола.
- `ImplantStabilitySelector.tsx` (47 строк $\le 120$): композитный контейнер стабильности.
- `ImplantProtocolTab.tsx` (33 строки $\le 80$): фасад вкладки хирургического протокола.

---

## 4. Монтирование в Живой UI (Мандат 8aq)

Компонент паспорта смонтирован в живое дерево приложения:
- `DirectImplantPassportLauncher.tsx` (71 строка $\le 80$) вмонтирован в корневой `apps/web/src/AppShell.tsx`.
- Слушает навигационные триггеры: `#implant-passport`, `#implants`, `dente:open-implant-passport`.
- В `StandaloneImplantologyHosts.tsx` добавлен безопасный фоллбэк `isDemoShowcaseMode()` для мгновенного доступа в демо-режиме без блокировки авторизации.

---

## 5. Доказательства Работоспособности (Proof & Verification)

### Тесты:
- `apps/web/src/components/implants/__tests__/implantPassport.test.tsx`: 37 passing (37 total) in 1.26s.
- `apps/web/src/components/dicom/__tests__/wave224DiagnosticCtImplantInquisition.test.ts`: 5 passing (5 total) in 1.1s.
- TypeScript: 0 ошибок в модуле `implants`.

### 4-State Visual Proofs (`docs/proofs/implants/`):
1. `01_implant_protocol_pc_light.png` (100.5 KB): PC Light (1440×900) — хирургический протокол, 1 Primary CTA, плотность D1..D4 в 1 клик.
2. `02_implant_protocol_pc_dark.png` (101.5 KB): PC Dark (1440×900) — хирургический протокол в темной теме, 0% белого ослепления.
3. `03_implant_passport_qr_pc_dark.png` (193.0 KB): PC Dark (1440×900) — гарантийный паспорт, зубная дуга FDI, QR-код, гарантия.
4. `04_implant_passport_qr_pc_light.png` (157.1 KB): PC Light (1440×900) — гарантийный паспорт в светлой теме.
5. `05_implant_protocol_mobile_light.png` (138.7 KB): Mobile Light (390×844) — Bottom Sheet протокола, тактильные чипы $\ge 44$px.
6. `06_implant_protocol_mobile_dark.png` (147.2 KB): Mobile Dark (390×844) — Bottom Sheet протокола в темной теме.
7. `07_implant_passport_qr_mobile_dark.png` (255.9 KB): Mobile Dark (390×844) — паспорт с дугой FDI и QR-кодом в темной теме.
8. `08_implant_passport_qr_mobile_light.png` (204.2 KB): Mobile Light (390×844) — паспорт с дугой FDI и QR-кодом в светлой теме.
