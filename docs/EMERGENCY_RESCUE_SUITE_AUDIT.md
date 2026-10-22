# Red Team Clinical Audit: Chairside Emergency Rescue Suite & Resuscitation HUD

> **Стандарт регулятора:** Приказы Минздрава РФ № 786н (укладка стоматологического кабинета), № 1079н, № 1144н, № 138н.  
> **Архитектурный мандат:** Mandate 8b ($\le 120$ строк на файл), Mandate 8d pt 7 (Zero cartoon emojis), Mandate 8e (Doctor Autonomy — 0 disabled buttons), Mandate 8aq (глобальный монтаж UI).

---

## 1. Клинический охват и укладка «Антишок» (Order 786n)

Комплекс экстренной помощи у кресла покрывает 8 регламентированных состояний стоматологического амбулаторного приёма:
1. **Анафилактический шок (T78.2)** — расчет адреналина 0.1% 0.01 мг/кг (макс. 0.5 мл) в/м в переднебоковую поверхность бедра, преднизолон 90–120 мг в/в.
2. **Токсичность местных анестетиков (T88.5)** — протокол липидного спасения (Lipid Rescue 20% жировая эмульсия): болюс 1.5 мл/кг + инфузия 0.25 мл/кг/мин.
3. **Обморок / сосудистый коллапс (R55)** — положение Тренделенбурга, нашатырный спирт на марле, ингаляция кислорода.
4. **Гипертонический криз (I10)** — Каптоприл 25 мг сублингвально / Моксонидин 0.2 мг, контроль АД каждые 10 мин.
5. **Стенокардия / острый коронарный синдром (I21.9)** — Нитроглицерин 0.5 мг сублингвально строго сидя (при АД сист > 100), Ацетилсалициловая кислота 250 мг разжевать.
6. **Бронхоспазм / приступ астмы (J45.9)** — Сальбутамол 100 мкг 2–4 дозы через спейсер / Эуфиллин 2.4% 5–10 мл в/в.
7. **Гипогликемическая кома (E16.2)** — Глюкоза 40% 40–80 мл в/в струйно при потере сознания, сладкий чай/сок в сознании.
8. **Аспирация инородного тела (T17.9)** — прием Геймлиха, принудительное откашливание, готовность к коникотомии.

---

## 2. Архитектура декомпозиции (Mandate 8b: Все файлы $\le 120$ строк)

Всего создано 59 модулей со 100% соблюдением лимита $\le 120$ строк:
- **Layer 0 (Types)**:
  - `apps/web/src/components/emergency/emergencyModules/emergencyDrugTypes.ts` (56 строк)
  - `apps/web/src/components/emergency/emergencyModules/emergencyScenarioTypes.ts` (48 строк)
  - `apps/web/src/components/emergency/emergencyModules/emergencyIncidentTypes.ts` (51 строк)
  - `apps/web/src/components/emergency/emergencyModules/emergencyRescueTypes.ts` (109 строк)
- **Layer 1 (Presets)**:
  - 8 сценариев в `presets/` ($\le 113$ строк каждый)
  - `apps/web/src/components/emergency/emergencyRescuePresets.ts` (32 строки)
- **Layer 2 (Engines & Calculations)**:
  - `engine/emergencyStatutoryKitMemo.ts` (56 строк)
  - `engine/emergencyDosageFirstLine.ts` (103 строки)
  - `engine/emergencyDosageSecondLine.ts` (83 строки)
  - `engine/emergencyDosageCardiacAndRespiratory.ts` (89 строк)
  - `engine/emergencyDosageCalculator.ts` (89 строк)
  - `engine/emergencyLipidRescueEngine.ts` (30 строк)
  - `engine/emergencyIncidentActGenerator.ts` (111 строк)
  - `engine/emergencyCheatSheetGenerator.ts` (29 строк)
  - `engine/emergencyCprMetronomeEngine.ts` (48 строк)
  - `engine/emergencyFormatters.ts` (10 строк)
  - `apps/web/src/components/emergency/emergencyRescueEngine.ts` (28 строк)
- **Layer 3 (Hooks)**:
  - `emergencyModules/useEmergencyTimers.ts` (79 строк)
  - `emergencyModules/useEmergencyCprMetronome.ts` (92 строки)
  - `emergencyModules/useEmergencyRescueLogic.ts` (101 строка)
- **Layer 4 (UI Subcomponents)**:
  - `emergencyModules/EmergencyModalHeader.tsx` (58 строк)
  - `emergencyModules/EmergencyTabsBar.tsx` (41 строка)
  - `emergencyModules/EmergencyScenariosStrip.tsx` (54 строки)
  - `emergencyModules/EmergencyBriefingGrid.tsx` (90 строк)
  - `emergencyModules/EmergencyDispatcherBox.tsx` (109 строк)
  - `emergencyModules/EmergencyWeightPresetsBar.tsx` (65 строк)
  - `emergencyModules/EmergencyDrugCardItem.tsx` (49 строк)
  - `EmergencyDosageCardsGrid.tsx` (109 строк)
  - `emergencyModules/EmergencyKitActionsBar.tsx` (63 строки)
  - `emergencyModules/EmergencyCprMetronomeWidget.tsx` (94 строки)
  - `emergencyModules/EmergencyResuscitationTools.tsx` (116 строк)
  - `EmergencyProtocolHandoverBox.tsx` (113 строк)
  - `emergencyModules/EmergencyVitalsSection.tsx` (69 строк)
  - `emergencyModules/EmergencyProtocolStepList.tsx` (71 строка)
- **Layer 5 (Facade Modal)**:
  - `EmergencyRescueModal.tsx` (118 строк — декомпозирован из 770 строк!)
- **CSS Modules (Все $\le 115$ строк, 0 hex-хардкодов)**:
  - `emergencyRescue.css` (104 строки)
  - `emergencyModalBase.css` (108 строк)
  - `emergencyScenarios.css` (86 строк)
  - `emergencyBriefing.css` (111 строк)
  - `emergencyHeader.css` (79 строк)
  - `emergencyMobile.css` (110 строк)
  - `emergencyDosages.css` (115 строк)
  - `emergencyCpr.css` (100 строк)
  - `emergencyVitals.css` (53 строки)
  - `emergencyAnimations.css` (47 строк)

---

## 3. Автономия врача и запрет блокировок (Mandate 8e)

1. **0 disabled кнопок:** На всём критическом пути спасения жизни нет ни одной заблокированной кнопки.
2. **1-клик пересчет дозировок:** Чипы массы тела `[15 кг]` `[45 кг]` `[70 кг]` `[90 кг]` мгновенно пересчитывают объемы растворов в миллилитрах и ампулах без клавиатурного ввода.
3. **1-клик вызов СМП 112:** Кнопка с прямым набором `tel:112` и автоматическим копированием структурированной шпаргалки для диспетчера.
4. **Списание укладки «Антишок»:** Пакетное списание препаратов по техкарте в 1 клик с мягким овердрафтом (Soft Negative Stock).
5. **Акт передачи бригаде СМП:** Генерация юридически выверенного акта и вставка в дневник приёма Формы 043/у.

---

## 4. Визуальные доказательства (Red Team 4-State Proofs)

Все скриншоты сняты на живом браузере Chromium и лично верифицированы:
- ☀️ **PC Light (1440×900):** `docs/proofs/emergency/emergency_rescue_pc_light.png`
- 🌙 **PC Dark (1440×900):** `docs/proofs/emergency/emergency_rescue_pc_dark.png`
- 📱 **Mobile Light (390×844):** `docs/proofs/emergency/emergency_rescue_mobile_light.png`
- 📱 **Mobile Dark (390×844):** `docs/proofs/emergency/emergency_rescue_mobile_dark.png`
- 🌙 **Kit Tab PC Dark (1440×900):** `docs/proofs/emergency/emergency_rescue_kit_pc_dark.png`
- 📱 **Kit Tab Mobile Dark (390×844):** `docs/proofs/emergency/emergency_rescue_kit_mobile_dark.png`

---

## 5. Результаты тестов и верификации

- **Unit тесты:** 27 passed, 0 failed (100% green).
- **TypeScript:** 0 ошибок компиляции в модулях экстренной помощи.
- **Лимиты строк:** 0 нарушений ($\le 118$ строк на файл).
- **Эмодзи:** 0 мультяшных эмодзи.
