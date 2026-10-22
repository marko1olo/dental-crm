# Клинический протокол эндодонтии и журнал корневых каналов DENTE (Wave 54)

> 🦷 **КЛИНИЧЕСКИЙ СТАНДАРТ DENTE ENDODONTICS (МАНДАТЫ 8b, 8e, 8n, 8ze, 8al, 8am):**  
> Документация архитектуры модуля эндодонтической обработки каналов (`apps/web/src/components/endo/`).

---

## 1. Архитектурная декомпозиция (Мандат 8b: $\le 120$ строк)
Все 57 исходных файлов модуля строго укладываются в лимит $\le 120$ строк:
- `ChairsideEndoQuickBar.tsx` (60 строк) + подпапка `quickbar/` (9 модулей, max 116 строк)
- `EndoCanalLogModal.tsx` (120 строк) + подпапка `modal/` (5 модулей, max 85 строк)
- `EndoCanalTable.tsx` (38 строк) + подпапка `table/` (13 модулей, max 93 строки)
- `EndoQuickToolbar.tsx` (70 строк) + подпапка `toolbar/` (4 модуля, max 81 строка)
- `useEndoCanalLogic.ts` (83 строки) + подпапка `logic/` (8 модулей, max 110 строк)
- `endoPersistenceBridge.ts` (3 строки) + подпапка `bridge/` (3 модуля, max 82 строки)
- `EndoTreatmentPlanModal.tsx` (8 строк) и `index.ts` (8 строк)

---

## 2. Клиническая эргономика и автономия врача (Мандат 8e, 8n)
1. **Анатомические нормы по группам зубов в 1 клик:**
   - Резцы и клыки (11–13, 21–23, 31–33, 41–43): 1 основной канал (Main).
   - Премоляры В/Ч (14, 24): 2 канала (B, P); Премоляры Н/Ч (34, 35, 44, 45): 1 канал.
   - Моляры В/Ч (16, 17, 26, 27): 3–4 канала (MB1, MB2, DB, P).
   - Моляры Н/Ч (36, 37, 46, 47): 3–4 канала (MB, ML, D или M, D).
2. **Экспресс-пресеты:**
   - *Пульпит в 1 визит:* 21.5 мм, MAF #25/.04, обтурация гуттаперча + AH Plus.
   - *Периодонтит / Биокерамика:* 21.0 мм, MAF #30/.04, BioRoot RCS.
   - *Временная обтурация:* Каласепт ($Ca(OH)_2$) на 14 дней.
3. **Запрет блокировок:** Кнопка «✓ Зафиксировать протокол каналов» (Primary CTA) ВСЕГДА доступна в 1 клик, не блокируется по `disabled`.

---

## 3. Apple HIG Touch Ergonomics (Мандат 8ze)
- **Десктоп ($\ge 768$px):** Полноразмерная модальная таблица с шагами $\pm 0.5$ мм, чипами быстрого выбора длин и MAF, выпадающими селектами силеров и обтурации.
- **Смартфон ($\le 768$px, 390×844):** Нативный Bottom Sheet (`rounded-t-[24px]`) с тактильным Drag Handle 36×5px, сгруппированные карточки (Grouped Cards) для каждого канала, сенсорный минимум $\ge 44\times 44$px, 0px горизонтального скролла, плавающая панель Natural Thumb Zone.

---

## 4. Визуальные доказательства (Red Team 4-State Proof)
- ☀️ **PC Light (1440×900):** `apps/web/public/screenshots/endo/endo_pc_light.png`
- 🌙 **PC Dark (1440×900):** `apps/web/public/screenshots/endo/endo_pc_dark.png`
- 📱 **Mobile Light (390×844):** `apps/web/public/screenshots/endo/endo_mobile_light.png`
- 📱 **Mobile Dark (390×844):** `apps/web/public/screenshots/endo/endo_mobile_dark.png`

---

## 5. Тестирование и верификация
- Модульные тесты `chairsideEndoQuickBar.test.tsx` (11 PASS)
- Клинический аудит `endoOutpatientChairsideAudit.test.tsx` (7 PASS)
- Памятка пациенту и печать А4 `endoCanalPatientMemoAutonomyWave54.test.tsx` (8 PASS)
- **Итого: 26 из 26 тестов PASS (0 FAIL, 0 SKIPPED).**
