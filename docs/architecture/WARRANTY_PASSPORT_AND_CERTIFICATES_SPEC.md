# DENTE CRM — WARRANTY PASSPORT & CLINICAL CERTIFICATES SPECIFICATION

> 🛡️ **CANONICAL ARCHITECTURE & CLINICAL FIDELITY SPECIFICATION**  
> **Status:** Canonical Production Baseline  
> **Mandates Compliance:** Mandate 8b (Micro-modules $\le 120$ lines), Mandate 8e (Doctor Autonomy & 0 ₽ Remediation), Mandate 8x (Human Clinical Language), Mandate 8ap (Anti-bureaucracy / Zero Raw Order Numbers), Apple HIG (Touch Targets $\ge 44\times 44\text{px}$, Natural Thumb Zone).

---

## 1. Архитектурный контекст и клиническая цель (Why)

Гарантийный паспорт и Сертификат качества DENTE — это ключевой документ доверия между клиникой, врачом и пациентом. 
Ранее стили студии гарантийного паспорта находились в гигантском монолите `warrantyPassport.css` (767 строк), что грубо нарушало Мандат 8b архитектурной конституции проекта.

### Ключевые клинические инварианты:
1. **Автономия врача (Мандат 8e):** Врач свободно определяет гарантийные сроки (1 год, 2 года, 5 лет, безусловная гарантия клиники). Кнопки сохранения и печати никогда не блокируются (`disabled`).
2. **Гарантийная переделка у кресла (0 ₽):** При гарантийном случае (выпадение пломбы, расцементировка коронки, скол керамики) врач оформляет переделку в 1 клик с автоматической 100% скидкой без ввода паролей администратора и с мягким автоматическим списанием материалов со склада.
3. **Чистый человеческий язык (Мандаты 8x и 8ap):** Запрет советских номеров приказов и канцелярита в интерфейсе. Вместо сырых формулировок — понятный клинический язык: «Медицинская карта», «Код услуги», «Выдать гарантийный паспорт».
4. **Сенсорная эргономика Apple HIG:** Сенсорный минимум тач-таргетов $\ge 44\times 44\text{px}$ для работы врача в перчатках у кресла, нативные Bottom Sheet шторки на мобильных устройствах ($\le 768\text{px}$) с тактильным хэндлом 36×5px и плавающей панелью действий в нижней трети экрана.

---

## 2. Декомпозиция монолита стилей (Мандат 8b: Micro-modules $\le 120$ строк)

Монолит `warrantyPassport.css` (767 строк) полностью ликвидирован и преобразован в ультратонкий шлюз импортов (14 строк), управляющий изолированными логическими микромодулями в директории `apps/web/src/components/warranty/warrantyStyles/`.

| Файл модуля | Назначение модуля | Объем (строк) | Статус Мандата 8b |
| :--- | :--- | :--- | :--- |
| `warrantyPassport.css` | Главный шлюз импортов (@import) | **14 строк** | ✅ PASS ($\le 20-30$) |
| `warrantyLayout.css` | Сетка, модальное окно, оверлей, вкладки | **99 строк** | ✅ PASS ($\le 120$) |
| `warrantyCardHeader.css` | Шапка, пациент, сертификат ID, ЭЦП | **86 строк** | ✅ PASS ($\le 120$) |
| `warrantyTeethGrid.css` | Зубная формула FDI 11–48, чипы зубов | **96 строк** | ✅ PASS ($\le 120$) |
| `warrantyItemsList.css` | Таблица позиций, пресеты, бейджи, поля | **104 строки** | ✅ PASS ($\le 120$) |
| `warrantyConditions.css` | Калькулятор OHI-S рисков, соматика, HUD | **69 строк** | ✅ PASS ($\le 120$) |
| `warrantyPrintStyles.css` | Бланк А4 / А5, превью и стили @media print | **77 строк** | ✅ PASS ($\le 120$) |
| `warrantyActionButtons.css` | Футер, кнопки действий, меню шеринга | **77 строк** | ✅ PASS ($\le 120$) |
| `warrantyMobileCards.css` | Apple HIG слой, Bottom Sheet, 44px тач | **86 строк** | ✅ PASS ($\le 120$) |
| `warrantyRemediation.css` | Гарантийная переделка 0 ₽, рекламации | **84 строки** | ✅ PASS ($\le 120$) |
| `warrantyPassportMobile.css` | Обратно-совместимый шим | **6 строк** | ✅ PASS ($\le 120$) |
| `warrantyPassportRemediation.css` | Обратно-совместимый шим | **6 строк** | ✅ PASS ($\le 120$) |

> **Максимальный объем любого файла:** 104 строки (запас более 16 строк до потолка в 120 строк).

---

## 3. Компонентная структура студии гарантийного паспорта

```
apps/web/src/components/warranty/
├── WarrantyPassportModal.tsx             # Канонический модальный контейнер студии
├── warrantyPassport/
│   ├── useWarrantyPassportState.ts      # Хук состояния, авторасчет рисков и хеша
│   ├── WarrantyItemsStep.tsx            # Редактор позиций и зубная формула
│   ├── WarrantyConditionsStep.tsx       # График чекапов и правила сохранения
│   ├── WarrantySignatureStep.tsx        # Гарантийная переделка 0 ₽ и акты дефектов
│   ├── WarrantyPreviewPrint.tsx         # Встраиваемый интерактивный предпросмотр
│   ├── WarrantyShareMenu.tsx            # Поповер отправки в WhatsApp / Telegram
│   ├── constants.ts                     # Квадранты FDI 11-48, маппинги
│   └── types.ts                         # Интерфейсы этапов и реквизитов
├── warrantyStyles/                      # 9 микромодулей стилей <= 120 строк
└── __tests__/                           # Автоматические тесты целостности
```

---

## 4. Доказательства работоспособности (Proof & Verification Gates)

1. **Gate 1: Encoding Check (UTF-8 No-BOM)**:
   - `npm run check:encoding` -> **Exit Code 0** (21 209 файлов проверено, замечаний нет).
2. **Gate 2: CSS Token Consistency**:
   - `npm run check:css-tokens` -> **Exit Code 0** (1 367 файлов проверено, 0 неразрешенных var(), 100% покрытие тем).
3. **Gate 3: Vitest Test Suite**:
   - `npx vitest run apps/web/src/components/warranty/` -> **Exit Code 0** (2 test files, 33 passed).
4. **Gate 4: Red Team Visual Proofs (4 скриншота высокого разрешения)**:
   - `docs/proofs/warranty/01_warranty_pc_light.png` (1440×900, 182.7 KB, Light Mode)
   - `docs/proofs/warranty/02_warranty_pc_dark.png` (1440×900, 166.7 KB, Dark Mode 0 ₽ Remediation)
   - `docs/proofs/warranty/03_warranty_mobile_light.png` (390×844, 127.5 KB, Apple HIG Light Bottom Sheet)
   - `docs/proofs/warranty/04_warranty_mobile_dark.png` (390×844, 125.8 KB, Apple HIG Dark Bottom Sheet)

Все скриншоты лично проинспектированы через визуальный анализ на отсутствие паразитных скроллов, обрезаний текста и слепящих плашек.
