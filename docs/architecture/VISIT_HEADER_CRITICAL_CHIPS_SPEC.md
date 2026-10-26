# Архитектурная спецификация: Шапка приёма и разделение аллергических и соматических рисков (Visit View Header & Critical Chips Separation)

## 1. Введение и клиническая цель
Данный документ регламентирует архитектуру шапки приёма врача-стоматолога (`VisitViewHeader`, `PatientAvatarAndInfoSection`, `VisitHeaderFastPrintCluster`, `visitCriticalChipsBuilder`), строгое разграничение аллергологического статуса и соматических отягощений пациента по Мандатам 8e (Doctor Autonomy), 8x (Clean Clinical Language), 8y (Zero Pharma Paranoia) и 8b ($\le 120$ строк на микромодуль).

---

## 2. Ликвидация клинического дефекта смешивания аллергий и соматики

### Исходная патология:
В ранней реализации `useVisitFastPrintState.ts` все критические бейджи пациента склеивались в единую строку через префикс `Аллергия: ...`. В результате соматические заболевания (АГ, ССЗ, ЭКС, СД, бронхиальная астма, беременность) отображались врачу как аллергия:
> ❌ Было: `⚠️ Аллергия: Пенициллиновый ряд, АГ / ССЗ`

### Клинический EBM стандарт (СтАР, ITI):
Аллергия на медикаменты (IgE-опосредованный анафилактический риск) и соматические сопутствующие патологии (гемодинамика, кардиостимулятор, эндокринный статус) являются принципиально разными клиническими сущностями:
- **Аллергия (Аллергоанамнез)**: реальные аллергены (пенициллины, лидокаин, новокаин, латекс, НПВП). Маркируется янтарным цветом с иконкой предупреждения `AlertTriangle`.
- **Соматический статус / Риск**: хронические системные заболевания (артериальная гипертензия / ССЗ, электрокардиостимулятор, сахарный диабет, бронхиальная астма, беременность, приём антикоагулянтов/бисфосфонатов). Маркируется суверенным кардиологическим бейджем цвета rose с иконкой `HeartPulse`.

---

## 3. Модульная архитектура (`apps/web/src/components/visit/view/`)

Все модули шапки строго декомпозированы по Мандату 8b ($\le 120$ строк):

| Модуль | Строк | Зона ответственности |
| :--- | :---: | :--- |
| `viewStateModules/visitCriticalChipsBuilder.ts` | 93 | Чистая функция разделения аллергенов (`buildConsolidatedAllergyChip`) и соматических рисков (`buildConsolidatedSomaticChip`), списки `ALLERGY_BADGE_IDS` и `SOMATIC_BADGE_IDS`. |
| `viewStateModules/useVisitFastPrintState.ts` | 82 | Хук состояния быстрой печати и мемоизации чипсов `consolidatedAllergyChip` и `consolidatedSomaticChip`. |
| `types.ts` | 119 | Контракты интерфейсов `VisitViewHeaderProps`, включая `consolidatedSomaticChip?: string \| null`. |
| `VisitViewPanel.tsx` | 105 | Панель приёма, проброс пропсов в шапку. |
| `VisitViewHeader.tsx` | 36 | Компактный фасад шапки приёма. |
| `visitHeaderModules/PatientAvatarAndInfoSection.tsx` | 110 | Отрисовка двух суверенных бейджей: `data-testid="visit-focus-allergy-alert"` и `data-testid="visit-focus-somatic-alert"`. Иконки Lucide `AlertTriangle` и `HeartPulse`. Пассивная норма `✓ Норма`. |
| `visitHeaderModules/VisitHeaderFastPrintCluster.tsx` | 52 | Кнопки быстрой печати без советского канцелярита «Форма 043/у» -> «Медицинская карта приёма». |
| `visitHeader/PatientAlertBadgesBar.tsx` | 54 | Делегат обратной совместимости, использующий `visitCriticalChipsBuilder`. |

---

## 4. Дизайн-код шапки приёма и Мандат 8am
1. **Ровно одна Primary CTA кнопка**:
   - «Завершить приём» (изумрудный `var(--teal)`, высота 36px, `rounded-xl`).
   - Вспомогательные действия (сохранение черновика, печать карты, рецепты) оформлены нейтральными ghost/soft кнопками (`var(--paper-soft)`).
2. **0px паразитного дрифта**:
   - Шапка использует `overflow-hidden` и `truncate` для имени пациента и бейджей при сжатии до мобильных экранов.

---

## 5. Доказательная база и 4-State Visual Proofs
Визуальные подтверждения зафиксированы в `docs/proofs/visit/`:
1. `01_visit_header_pc_light_1440x900.png` — PC Light 1440×900 (839.6 KB)
2. `02_visit_header_zoomed_light.png` — Zoomed Light Visit Header
3. `03_visit_header_pc_dark_1440x900.png` — PC Dark 1440×900 (798.1 KB)
4. `04_visit_header_zoomed_dark.png` — Zoomed Dark Visit Header
5. `05_visit_header_mobile_light_390x844.png` — Mobile Light 390×844 (314.7 KB)
6. `06_visit_header_mobile_dark_390x844.png` — Mobile Dark 390×844 (318.0 KB)

### Инструментальная валидация:
- `npm run check:encoding`: 21 674 файла проверено, 0 ошибок.
- `npm run check:css-tokens`: 0 неразрешенных CSS-токенов.
- Vitest: `apps/web/src/components/visit/view/viewStateModules/__tests__/visitCriticalChipsSeparation.test.ts` (5/5 passed).
- Vitest: `apps/web/src/components/visit/view/visitHeader/__tests__/visitHeaderDecomposition.test.ts` (7/7 passed).
