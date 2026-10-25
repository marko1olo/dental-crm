# SanPiN 3.3686-21, Sterilization & Autoclave Shift Batch Visual Proofs

Этот каталог содержит доказательства инструментального аудита Red Team для домена автоклавирования, предстерилизационной очистки (ПСО) и санитарно-эпидемиологических журналов клиники DENTE (СанПиН 2.1.3678-20, СанПиН 3.3686-21, МКБ-10, требования Роспотребнадзора).

## 1. Канонические скриншоты (4-State Visual Proof)

1. **PC Light (1440×900)**: `pc_light_sanpin_sterilization_1440x900.png` (`sanpin_pc_light_1440x900.png`)
   - Полный журнал автоклавирования и стерилизации без советского канцелярита («Форма 257/у» вычищена в пользу «Журнал контроля автоклавирования», «Форма 366/у» -> «Контроль очистки инструментов (Азопирам)»).
   - Доминантная 1-клик Primary CTA кнопка в шапке: «✓ Пакетная запись автоклавирования за смену» (`.sanpin-btn-primary-cta`, `data-testid="sanpin-shift-close-primary-btn"`). Кнопки НИКОГДА не блокируются (`disabled`, Мандат 8e).
   - Вторичные быстрые действия: «Заполнить по нормам», «+ Новый цикл», «Оборудование ЦСО», «Печать журнала», «CSV».
   - Вкладки реестра: «Журнал контроля автоклавирования», «Контроль очистки инструментов (Азопирам)», «Обеззараживание воздуха и санитарный режим».
   - Таблица циклов с детальными параметрами (134.4°C, 2.15 бар, 5 мин), индикатором 5 класса (ИнтеТЕСТ) и автоматическим списанием крафт-пакетов.
   - Полное отсутствие картонных эмодзи (Мандат 8d п. 7) — строго Lucide SVG иконки.

2. **PC Dark (1440×900)**: `pc_dark_sanpin_sterilization_1440x900.png` (`sanpin_pc_dark_1440x900.png`)
   - Тёмная OLED-клиническая тема без паразитного свечения и визуальных артефактов.
   - Контрастные статусные плашки «Журналы за сегодня не заполнялись · Очистка 0 · АК 0 · T° Норма».
   - Чёткие границы строк и чипы параметров цикла автоклавирования.
   - Спокойный пастельный бейдж «Стерильно» без кислотного светофора.

3. **Mobile Light (390×844)**: `mobile_light_sanpin_sterilization_390x844.png` (`sanpin_mobile_light_390x844.png`)
   - Адаптация под Apple iOS HIG: группированные карточки (Grouped List Cards) вместо урезанных таблиц.
   - Сенсорный минимум $\ge 44\times 44$px для всех интерактивных элементов.
   - Natural Thumb Zone: доминантная кнопка «✓ Автоклавирование смены» на всю ширину (48px), чипы фильтров «Сегодня», «Неделя», «Месяц», «Все автоклавы».
   - Компактный бейдж «✓ Нет записей» в шапке мобильного экрана — 0px обрезания слов и клиппинга.
   - 0px паразитного горизонтального скролла (`overflow-x: clip`).

4. **Mobile Dark (390×844)**: `mobile_dark_sanpin_sterilization_390x844.png` (`sanpin_mobile_dark_390x844.png`)
   - Тёмный режим на мобильном устройстве (390×844).
   - Читаемость кодов партий и параметров автоклавирования при выключенном освещении кабинета.
   - Нативная нижняя панель навигации (Bottom Navigation Bar) с защитой Safe Area.

## 2. Архитектурная декомпозиция Fastify (Мандат 8b: Layer 0-5, <= 120 строк)
Монолит `regulatoryExportAndShiftCloseRoutes.ts` (631 строка) и смежные роуты декомпозированы на фасад и изолированные подмодули:
- `apps/api/src/routes/sanpin/regulatoryExportModules/`:
  * `regulatoryExportTypes.ts` (36 строк)
  * `autoclaveRegulatoryExportHandler.ts` (102 строки)
  * `shiftSummaryRegisterHandler.ts` (86 строк)
  * `shiftClosePsoSaver.ts` (48 строк)
  * `shiftCloseAutoclaveSaver.ts` (67 строк)
  * `shiftCloseWasteSaver.ts` (73 строки)
  * `shiftCloseMicroclimateSaver.ts` (68 строк)
  * `shiftCloseBatchHandler.ts` (72 строки)
- `apps/api/src/routes/sanpin/temperatureModules/` (все $\le 100$ строк)
- `apps/api/src/routes/sanpin/wasteModules/` (все $\le 90$ строк)
- `apps/api/src/routes/sanpin/cleaningModules/` (все $\le 115$ строк)
- `apps/api/src/routes/sanpin/psoModules/` (все $\le 115$ строк)
- `apps/api/src/routes/sanpin/summaryModules/sanpinSummaryCollector.ts` (89 строк)

## 3. Вырезание рудимента автоклава из первичного приема пациента (Мандат 8e & 8n)
- `PrimaryIntakePackageModal.tsx` и `PrimaryIntakeMoreDropdown.tsx`: полностью вырезан проп `onOpenAutoclaveLog257` и кнопка вызова журнала автоклава. Врач у кресла при оформлении первичной карты не должен вести журнал автоклавирования; автоклавирование ведется в ЦСО и фиксируется медперсоналом пакетом на смену.
- Тест `apps/web/src/tests/sterilizationAutoclaveBatchReporting.test.ts` переписан на строгую проверку отсутствия кнопки автоклава в первичной карте.

## 4. Итоги тестов
- `apps/web/src/components/sanpin/__tests__/*.test.ts*`: **22 тест-файла, 274 passed (100% green)**.
- `apps/web/src/tests/sterilizationAutoclaveBatchReporting.test.ts`: **6/6 passed (100% green)**.
- `apps/api/src/tests/routes/*sanpin*.test.ts`: **14/14 passed (100% green)**.
- `npm run typecheck -w @dental/api`: **Exit Code 0**.
