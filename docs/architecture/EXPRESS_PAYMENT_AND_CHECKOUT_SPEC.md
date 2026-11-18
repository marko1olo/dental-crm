# Архитектурная спецификация: Экспресс-оплата и касса DENTE CRM (Apple HIG Checkout)

> **Статус:** Внедрено в продакшн (Wave 311 / Mandate 8b / HIG Touch Ergonomics)  
> **Авторитет:** Мандаты 8b (лимит файлов $\le 120$ строк), 8d (WCAG AAA), 8e (Автономия врача и кассира), 8n (Суверенитет соло-практики и малой клиники).  
> **Скриншот-пруфы:** [`docs/proofs/checkout/`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/checkout)

---

## 1. Архитектурная декомпозиция монолита стилей

Монолит кассовых стилей `apps/web/src/components/finance/paymentModalStudio.css` (ранее 1 422 строки) полностью ликвидирован и преобразован в ультра-тонкий шлюз импортов (24 строки).
Вся стилизация разделена на изолированные микромодули в директории [`apps/web/src/components/finance/paymentModalStyles/`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/paymentModalStyles), где **каждый файл строго удовлетворяет лимиту $\le 120$ строк**:

| Модуль | Описание и ответственность | Строк | Статус |
| :--- | :--- | :---: | :---: |
| [`paymentModalBase.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/paymentModalStyles/paymentModalBase.css) | Базовый сброс кнопок, WCAG AAA заголовки, вкладки ящика кассы, кнопка закрытия `x` | 113 | ✓ $\le 120$ |
| [`paymentAmountDisplay.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/paymentModalStyles/paymentAmountDisplay.css) | Крупная доминирующая сумма (36px–38px bold ui-monospace), бейджи скидок | 77 | ✓ $\le 120$ |
| [`paymentMethodTiles.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/paymentModalStyles/paymentMethodTiles.css) | Apple POS плитки быстрого выбора (СБП, Терминал, Наличные, Депозит) | 113 | ✓ $\le 120$ |
| [`paymentSplitMethods.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/paymentModalStyles/paymentSplitMethods.css) | Комбинированная оплата (сплит) в 1 клик, чипы распределения остатка | 90 | ✓ $\le 120$ |
| [`paymentFiscalReceipt.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/paymentModalStyles/paymentFiscalReceipt.css) | Электронный кассовый чек без бюрократии, опциональный ИНН для физлиц, QR-блок | 78 | ✓ $\le 120$ |
| [`paymentFiscalSummary.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/paymentModalStyles/paymentFiscalSummary.css) | Live Change HUD сдачи, купюры быстрого ввода и кнопки «Ровно / Без сдачи» | 118 | ✓ $\le 120$ |
| [`paymentActionButtons.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/paymentModalStyles/paymentActionButtons.css) | Apple HIG Primary CTA кнопки подтверждения ($\ge 52\text{px}$), тактильные тени | 105 | ✓ $\le 120$ |
| [`paymentMobileBottomSheet.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/paymentModalStyles/paymentMobileBottomSheet.css) | Нативный Bottom Sheet ($\le 768\text{px}$), Drag Handle 36×5px, Thumb Zone, 0px drift | 115 | ✓ $\le 120$ |
| [`paymentDoctorDiscounts.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/paymentModalStyles/paymentDoctorDiscounts.css) | Пресеты скидок врача (Мандат 8e: 100% гарантия, комбо-сплит) | 107 | ✓ $\le 120$ |
| [`paymentReceiptControls.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/paymentModalStyles/paymentReceiptControls.css) | Переключатели формата чека, кнопки печати и копирования данных | 114 | ✓ $\le 120$ |
| [`paymentThermalTape.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/paymentModalStyles/paymentThermalTape.css) | Симуляция термоленты 80мм/А4 с перфорацией и защитой глаз от белизны в Dark Mode | 115 | ✓ $\le 120$ |
| [`paymentHardwareFallback.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/paymentModalStyles/paymentHardwareFallback.css) | Режим пониженного энергопотребления для Intel Celeron и слабых ПК | 36 | ✓ $\le 120$ |
| **`paymentModalStudio.css` (root)** | **Канонический шлюз импортов CSS** | **24** | **✓ $\le 30$** |

---

## 2. Клинические и эргономические инварианты

1. **Мандат 8e (Автономия врача и кассира):**
   - Кнопка «Принять оплату» **НИКОГДА** не блокируется (`disabled`) из-за незаполненных опциональных полей.
   - Врач свободно оформляет 100% гарантийный приём (0 ₽) в 1 клик с закрытием визита без ввода мастер-паролей.
2. **Мандат 8n (Суверенитет соло-практики и малой клиники):**
   - Запрещено требовать ввод ИНН у пациентов-физлиц. Поле ИНН для физлица строго пассивное/опциональное (для справки налогового вычета 13%).
   - Комбинированная оплата (нал + карта + остаток аванса) выставляется в 1 клик без округлений и потери копеек (`amountKopecks`, целочисленная арифметика).
3. **Apple HIG Touch Ergonomics на смартфонах ($\le 768\text{px}$):**
   - Нативный **Bottom Sheet**: плавный выезд снизу (`translate-y-0`), закругление `rounded-t-[24px]`.
   - Тактильный хэндл **Drag Handle 36×5px** по центру вверху шторки.
   - Primary CTA кнопка подтверждения высотой **$\ge 52\text{px}$** в **Natural Thumb Zone** (нижняя треть экрана) с учетом `env(safe-area-inset-bottom)`.
   - Шапка строго в 1 строчку (0 многоэтажных тулбаров).
   - **0px паразитного горизонтального скролла** (`max-width: 100vw; overflow-x: clip;`).
   - Крупная доминирующая итоговая сумма **36px–38px bold ui-monospace** по центру.

---

## 3. Доказательная база и Red Team Visual Proof

Визуальная верификация проведена в 4 канонических состояниях интерфейса через headless Chrome:
- ☀️ **PC Light (1440×900):** [`docs/proofs/checkout/01_checkout_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/checkout/01_checkout_pc_light.png) (197 KB)
- 🌙 **PC Dark (1440×900):** [`docs/proofs/checkout/02_checkout_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/checkout/02_checkout_pc_dark.png) (212 KB)
- 📱 **Mobile Light (390×844):** [`docs/proofs/checkout/03_checkout_mobile_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/checkout/03_checkout_mobile_light.png) (195 KB)
- 📱 **Mobile Dark (390×844):** [`docs/proofs/checkout/04_checkout_mobile_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/checkout/04_checkout_mobile_dark.png) (187 KB)

Все 4 снимка лично проинспектированы через `read_file` — отсутствие 7 смертных грехов дизайна подтверждено инструментально.
Компиляция, кодировка (`check:encoding`) и CSS-токены (`check:css-tokens`) пройдены с Exit Code 0.
